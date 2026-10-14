import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContentAudience } from "./content-state";
import type { WeekScene } from "./week-types";
import { getWeekContent, type WeekContentResult } from "./week-source";
import {
  getProgramWeeksFromDb,
  getWeekContentFromDb,
  resolveProgramByCode,
  resolveProgramForProductVersion,
  type ProgramWeekRow,
  type WeekDbFailure,
  type WeekVersionRef,
} from "./week-db-source";
import { TAP24_PROGRAM_CODE } from "./week-program";
import { WEEK_INDEX } from "./week-index";

/**
 * 주차 콘텐츠를 어디서 읽을지 정하는 한 곳.
 *
 * ── 왜 게이트가 필요한가 ────────────────────────────────────────
 *
 * E1~E3 migration 이 **아직 원격에 적용되지 않았다.** 지금 DB 를 읽게 하면
 * 모든 주차 화면이 깨진다. 그렇다고 「DB 를 읽어보고 안 되면 fixture」로
 * 두면, 적용한 뒤에도 조회가 조용히 실패하는 것을 아무도 모른다.
 *
 * ★ 그래서 **명시적으로 고른다.** `CONTENT_SOURCE=database` 일 때만 DB 를
 *   읽고, 그때는 실패를 숨기지 않는다. 기본값은 fixture 다 — 부르는 쪽이
 *   깜빡하면 지금 동작하는 쪽으로 떨어진다.
 * ★ 이 값은 서버에서만 읽는다. 클라이언트가 바꿀 수 없다.
 *
 * ── 적용 순서 ───────────────────────────────────────────────────
 *
 *   1) E1·E2·E3 migration 적용        (선행 M1 계열이 먼저 필요하다)
 *   2) tap24_2026_1_load.sql 적재
 *   3) Preview 에서 CONTENT_SOURCE=database 로 확인
 *   4) 운영에 반영
 */

export type ContentSourceMode = "fixture" | "database";

export function contentSourceMode(): ContentSourceMode {
  return process.env.CONTENT_SOURCE === "database" ? "database" : "fixture";
}

export type WeekContentLoad =
  | {
      ok: true;
      result: WeekContentResult;
      /**
       * 무엇을 읽었는가. fixture 모드에서는 null 이다 — 저장소 fixture 에는
       * 교안 버전이라는 개념이 없다.
       *
       * ★ 교사 화면·인쇄물·교실 화면이 **같은 버전**을 쓰는지는 이 값으로
       *   확인한다. 세 화면이 각자 「24주차」를 읽었다는 것만으로는 같은
       *   내용을 봤다고 말할 수 없다.
       */
      version: WeekVersionRef | null;
    }
  | {
      ok: false;
      /** 화면이 「왜 안 보이는지」를 적는 데 쓴다 */
      reason: WeekDbFailure | "no_contract";
      detail: string;
    };

export interface WeekContentQuery {
  weekNo: number;
  audience: ContentAudience;
  /** 기관 — 계약에서 교안 버전을 찾는다 */
  organizationId?: string;
  /** 본사 검수처럼 계약을 거치지 않는 경로는 프로그램을 직접 지정한다 */
  programId?: string;
  /** 프로그램 id 를 모르는 본사 경로는 **코드로 명시**한다 (주차 번호로 찾지 않는다) */
  programCode?: string;
  sessionNo?: number;
}

/**
 * 한 주차의 콘텐츠.
 *
 * ★ `database` 모드에서 조회가 실패하면 **fixture 로 넘어가지 않는다.**
 *   실패를 그대로 돌려준다 — 화면이 정상처럼 보이면 아무도 모른다.
 */
export async function loadWeekContent(
  client: SupabaseClient,
  query: WeekContentQuery,
): Promise<WeekContentLoad> {
  const { weekNo, audience, organizationId, programId, sessionNo } = query;

  if (contentSourceMode() === "fixture") {
    const result = getWeekContent(weekNo, audience);
    if (!result) {
      return { ok: false, reason: "lesson_not_found", detail: `${weekNo}주차가 없습니다.` };
    }
    return { ok: true, result, version: null };
  }

  // ── database ──
  let resolvedProgramId = programId ?? null;

  // 본사 경로는 프로그램 코드를 명시한다. 계약을 거치지 않으므로 코드가 없으면
  // 무엇을 보는지 알 수 없다 — 추측하지 않는다.
  if (!resolvedProgramId && query.programCode) {
    const byCode = await resolveProgramByCode(client, query.programCode);
    if (!byCode.ok) {
      return { ok: false, reason: byCode.reason, detail: byCode.detail };
    }
    resolvedProgramId = byCode.programId;
  }

  if (!resolvedProgramId) {
    if (!organizationId) {
      return {
        ok: false,
        reason: "no_contract",
        detail: "기관을 알 수 없어 교안 버전을 찾을 수 없습니다.",
      };
    }

    // ★ 주차 번호로 찾지 않는다. 계약 → 상품 버전 → 프로그램 순으로 찾는다.
    const contract = await client
      .from("contracts")
      .select("product_version_id, status, start_date, end_date")
      .eq("organization_id", organizationId)
      .in("status", ["active", "suspended"])
      .lte("start_date", new Date().toISOString().slice(0, 10))
      .gte("end_date", new Date().toISOString().slice(0, 10))
      .limit(1)
      .maybeSingle();

    if (contract.error) {
      return { ok: false, reason: "query_failed", detail: contract.error.message };
    }
    if (!contract.data) {
      return {
        ok: false,
        reason: "no_contract",
        detail: "유효한 계약이 없어 교안을 열 수 없습니다.",
      };
    }

    const program = await resolveProgramForProductVersion(
      client,
      contract.data.product_version_id as string,
    );
    if (!program.ok) {
      return { ok: false, reason: program.reason, detail: program.detail };
    }
    resolvedProgramId = program.programId;
  }

  const loaded = await getWeekContentFromDb(client, {
    programId: resolvedProgramId,
    weekNo,
    sessionNo,
    audience,
  });

  if (!loaded.ok) {
    return { ok: false, reason: loaded.reason, detail: loaded.detail };
  }
  return { ok: true, result: loaded.result, version: loaded.version };
}


/**
 * 본사 검수 경로 — **어느 프로그램·차시인지 명시한다.**
 *
 * ★ 검수·미리보기·인쇄 검수본은 계약을 거치지 않는다. 그래서 프로그램을
 *   코드로 못 박는다. 「주차 번호로 찾다가 다른 버전을 승인」하는 길을 두지
 *   않기 위해서다.
 * ★ 감사용으로 어느 차시를 열었는지 서버 로그에 남는다 (version).
 */
export async function loadWeekContentForReview(
  client: SupabaseClient,
  weekNo: number,
  sessionNo = 1,
): Promise<WeekContentLoad> {
  return loadWeekContent(client, {
    weekNo,
    sessionNo,
    audience: "internal_review",
    programCode: TAP24_PROGRAM_CODE,
  });
}


export type WeekRollupLoad =
  | {
      ok: true;
      mode: ContentSourceMode;
      weeks: { weekNo: number; result: WeekContentResult; version: WeekVersionRef | null }[];
      /** 디코드가 깨진 주차. 숨기지 않고 화면에 적는다 */
      broken: { weekNo: number; detail: string }[];
    }
  | { ok: false; reason: WeekDbFailure | "no_contract"; detail: string };

/**
 * 24주 목록 — 본사 검수 화면.
 *
 * ★ `database` 모드에서 주차마다 따로 조회하지 않는다. 목록 하나에 백 번
 *   가까이 왕복하는 화면은 사람이 기다리지 않고 건너뛴다.
 * ★ 실패를 fixture 로 메우지 않는다. 목록이 정상처럼 보이면 적재가 안 된
 *   것을 아무도 모른다.
 */
export async function loadWeekRollupForReview(client: SupabaseClient): Promise<WeekRollupLoad> {
  const mode = contentSourceMode();

  if (mode === "fixture") {
    const weeks = WEEK_INDEX.flatMap((summary) => {
      const result = getWeekContent(summary.weekNo, "internal_review");
      return result ? [{ weekNo: summary.weekNo, result, version: null }] : [];
    });
    return { ok: true, mode, weeks, broken: [] };
  }

  const program = await resolveProgramByCode(client, TAP24_PROGRAM_CODE);
  if (!program.ok) {
    return { ok: false, reason: program.reason, detail: program.detail };
  }

  const loaded = await getProgramWeeksFromDb(client, program.programId, "internal_review");
  if (!loaded.ok) {
    return { ok: false, reason: loaded.reason, detail: loaded.detail };
  }

  return {
    ok: true,
    mode,
    weeks: loaded.weeks.map((w: ProgramWeekRow) => ({
      weekNo: w.weekNo,
      result: w.result,
      version: w.version,
    })),
    broken: loaded.broken,
  };
}

/**
 * 교실 화면 장면 — 반을 함께 넘긴다.
 *
 * ★ 장면 표는 본사만 직접 읽는다. 교직원은 이 RPC 로만 읽고, DB 가 담당 반·
 *   기관·계약 주차 범위를 모두 판정한다. 화면에서 거르지 않는다.
 * ★ RPC 는 교실 화면에 필요한 것만 돌려준다 — 원문 출처는 들어오지 않는다.
 *   그래서 `sourceRef` 는 null 이다. 지어내지 않는다.
 */
export async function loadClassScenes(
  client: SupabaseClient,
  classId: string,
  lessonId: string,
): Promise<{ ok: true; scenes: WeekScene[] } | { ok: false; detail: string }> {
  const { data, error } = await client.rpc("list_lesson_scenes_for_class", {
    p_class_id: classId,
    p_lesson_id: lessonId,
  });

  if (error) {
    return { ok: false, detail: error.message };
  }

  return {
    ok: true,
    scenes: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      sceneNo: Number(r.scene_no),
      sceneType: String(r.scene_type) as WeekScene["sceneType"],
      kidText: String(r.kid_text),
      stageLabel: (r.stage_label as string | null) ?? null,
      teacherNote: (r.teacher_note as string | null) ?? null,
      sourceRef: null,
      baseSeconds: r.base_seconds === null || r.base_seconds === undefined ? null : Number(r.base_seconds),
    })),
  };
}


export type StaffScenesLoad =
  | {
      ok: true;
      /** null 이면 fixture 모드다 — 부르는 쪽이 content.scenes 를 그대로 쓴다 */
      scenes: WeekScene[] | null;
      /** 어느 반의 권한으로 읽었나 (감사·표시용) */
      classId: string | null;
    }
  | { ok: false; reason: "no_assigned_class" | "rpc_failed"; detail: string };

/**
 * 교직원이 보는 장면 목록.
 *
 * ── 왜 반이 필요한가 ───────────────────────────────────────────────
 *
 * E3 이후 `lesson_scenes` 직접 조회는 본사만 된다. 교직원은 반 단위 RPC 로
 * 읽고, DB 가 「담당 반인가 · 계약 주차 범위인가 · 발행됐는가」를 판정한다.
 *
 * ★ 주차 화면은 반을 받지 않으므로 **담당 반을 찾아서** 묻는다. 담당 반이
 *   없으면 장면을 열지 않는다 — 그것이 맞는 동작이다. 「담당이 아닌데 보인다」가
 *   사고다.
 * ★ 조회가 **되지만 0행**인 것과 **실패**한 것을 구분한다. 0행은 계약 범위
 *   밖이거나 미발행이라는 뜻이고, 실패는 알려야 한다.
 */
export async function loadStaffScenes(
  client: SupabaseClient,
  args: { organizationId: string; programId: string; lessonId: string },
): Promise<StaffScenesLoad> {
  if (contentSourceMode() === "fixture") {
    return { ok: true, scenes: null, classId: null };
  }

  const classes = await client
    .from("class_program_assignments")
    .select("class_id")
    .eq("organization_id", args.organizationId)
    .eq("program_id", args.programId)
    .eq("status", "active");

  if (classes.error) {
    return { ok: false, reason: "rpc_failed", detail: classes.error.message };
  }
  const classIds = (classes.data ?? []).map((r) => r.class_id as string);
  if (classIds.length === 0) {
    return {
      ok: false,
      reason: "no_assigned_class",
      detail: "이 교안을 배정받은 담당 반이 없어 교실 화면 장면을 열 수 없습니다.",
    };
  }

  let lastDetail = "";
  for (const classId of classIds) {
    const loaded = await loadClassScenes(client, classId, args.lessonId);
    if (loaded.ok) {
      // 0행도 답이다 — 계약 범위 밖이거나 아직 발행되지 않았다는 뜻이다.
      return { ok: true, scenes: loaded.scenes, classId };
    }
    lastDetail = loaded.detail;
  }

  return { ok: false, reason: "rpc_failed", detail: lastDetail };
}
