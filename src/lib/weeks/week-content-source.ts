import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContentAudience } from "./content-state";
import { getWeekContent, type WeekContentResult } from "./week-source";
import {
  getWeekContentFromDb,
  resolveProgramForProductVersion,
  type WeekDbFailure,
} from "./week-db-source";

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
  | { ok: true; result: WeekContentResult }
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
    return { ok: true, result };
  }

  // ── database ──
  let resolvedProgramId = programId ?? null;

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
  return { ok: true, result: loaded.result };
}

/**
 * 교실 화면 장면 — 반을 함께 넘긴다.
 *
 * ★ 장면 표는 본사만 직접 읽는다. 교직원은 이 RPC 로만 읽고, DB 가 담당 반·
 *   기관·계약 주차 범위를 모두 판정한다. 화면에서 거르지 않는다.
 */
export async function loadClassScenes(
  client: SupabaseClient,
  classId: string,
  lessonId: string,
): Promise<
  | { ok: true; scenes: { sceneNo: number; sceneType: string; kidText: string }[] }
  | { ok: false; detail: string }
> {
  const { data, error } = await client.rpc("list_lesson_scenes_for_class", {
    p_class_id: classId,
    p_lesson_id: lessonId,
  });

  if (error) {
    return { ok: false, detail: error.message };
  }

  return {
    ok: true,
    scenes: (data ?? []).map((r: Record<string, unknown>) => ({
      sceneNo: Number(r.scene_no),
      sceneType: String(r.scene_type),
      kidText: String(r.kid_text),
    })),
  };
}
