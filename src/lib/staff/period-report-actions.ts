"use server";

import { guardWrite } from "@/lib/env/write-guard";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireTeacher } from "@/lib/auth/organization";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";
import type { PeriodContent } from "./period-report-composer-queries";

/**
 * 월간 · 학기 리포트 쓰기 행동 — 사용자 지시 항목 1.
 *
 * ── 서버가 판정한다 ────────────────────────────────────────────────
 *
 * 이 파일은 입력을 다듬어 RPC 를 부를 뿐이다. 담당 교사인지, 계약에 기능이
 * 있는지, 기능이 출시되었는지, 모을 주차가 조건을 만족하는지는 전부 DB 의
 * trigger 와 RPC 가 다시 판정한다 (20261012095000_c2b_...).
 *
 * ── 성공을 흉내내지 않는다 ────────────────────────────────────────
 *
 * ★ RPC 가 실패하면 실패로 돌려준다. 화면에만 "저장됨"을 띄우지 않는다.
 * ★ 동시 수정(RP009)은 충돌로 구분해 돌려준다. 조용히 덮어쓰지 않는다.
 *
 * ── 본문을 만들지 않는다 ──────────────────────────────────────────
 *
 * 기간 요약을 자동 생성하지 않는다. 교사가 쓴 문장만 저장한다.
 */

export interface PeriodSaveResult {
  ok: boolean;
  message: string | null;
  conflict: boolean;
  updatedAt: string | null;
}

export interface PeriodSourcesResult extends PeriodSaveResult {
  /** 실제로 모은 주차 (서버가 센 값) */
  weeks: number[];
  collected: number;
}

const FALLBACK = "처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.";

const TERM_KEY_PATTERN = /^[a-z0-9_-]{1,40}$/;

function normalizePeriodContent(content: PeriodContent): PeriodContent {
  const clean = (value: string | null, limit: number) => {
    const trimmed = (value ?? "").trim();
    return trimmed ? trimmed.slice(0, limit) : null;
  };
  return {
    overview: clean(content.overview, 3000),
    family_message: clean(content.family_message, 2000),
    next_period_focus: clean(content.next_period_focus, 500),
  };
}

/**
 * 기간 리포트 초안 만들기.
 *
 * ★ 본문은 비어 있다. 자동으로 채우지 않는다.
 * ★ 이미 초안이 있으면 그 초안으로 보낸다 (RPC 가 `created: false` 로 알린다).
 */
export async function createPeriodDraftAction(formData: FormData): Promise<void> {
  guardWrite("lib/staff/period-report-actions:createPeriodDraftAction");

  const childId = String(formData.get("childId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const blockRaw = formData.get("blockNo");
  const termKeyRaw = String(formData.get("termKey") ?? "").trim();

  if (
    !UUID_PATTERN.test(childId) ||
    !UUID_PATTERN.test(assignmentId) ||
    !UUID_PATTERN.test(organizationId)
  ) {
    return;
  }
  if (kind !== "monthly" && kind !== "semester") return;

  let blockNo: number | null = null;
  let termKey: string | null = null;

  if (kind === "monthly") {
    blockNo = Number(blockRaw);
    if (!Number.isInteger(blockNo) || blockNo < 1 || blockNo > 13) return;
  } else {
    if (!TERM_KEY_PATTERN.test(termKeyRaw)) return;
    termKey = termKeyRaw;
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("create_period_report_draft", {
    p_child_id: childId,
    p_assignment_id: assignmentId,
    p_kind: kind,
    p_block_no: blockNo,
    p_term_key: termKey,
  });

  const org = encodeURIComponent(organizationId);

  if (error) {
    logRpcFailure("period create", error);
    redirect(
      `/teacher/growth-reports?org=${org}&error=${encodeURIComponent(error.code ?? "")}`,
    );
  }

  const reportId = (data as { report_id?: string } | null)?.report_id;
  if (!reportId) redirect(`/teacher/growth-reports?org=${org}`);

  redirect(`/teacher/growth-reports/period/${reportId}?org=${org}`);
}

/**
 * 모을 주차 선택.
 *
 * ★ 주차 번호가 아니라 **주간 리포트 id** 를 보낸다. 서버가 그 리포트가 같은
 *   원아 · 같은 배정 · 완료 · 비숨김인지 다시 확인한다.
 * ★ 돌려받은 `weeks` 는 서버가 센 값이다. 화면이 보낸 값을 그대로 다시
 *   표시하지 않는다.
 */
export async function setPeriodSourcesAction(input: {
  revisionId: string;
  sourceReportIds: string[];
  expectedUpdatedAt: string;
}): Promise<PeriodSourcesResult> {
  guardWrite("lib/staff/period-report-actions:setPeriodSourcesAction");

  const fail = (message: string, conflict = false): PeriodSourcesResult => ({
    ok: false,
    message,
    conflict,
    updatedAt: null,
    weeks: [],
    collected: 0,
  });

  if (!UUID_PATTERN.test(input.revisionId) || !Array.isArray(input.sourceReportIds)) {
    return fail("요청 값을 확인할 수 없습니다.");
  }
  if (
    input.sourceReportIds.length > 26 ||
    input.sourceReportIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    return fail("모을 주차를 다시 선택해 주세요.");
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("set_period_report_sources", {
    p_revision_id: input.revisionId,
    p_source_report_ids: input.sourceReportIds,
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("period sources", error);
    const mapped = toUserFacingError(error, FALLBACK);
    return fail(mapped.message, mapped.kind === "conflict");
  }

  const row = (data ?? {}) as {
    updated_at?: string;
    collected?: number;
    weeks?: unknown;
  };
  const weeks = Array.isArray(row.weeks)
    ? row.weeks.filter((value): value is number => typeof value === "number")
    : [];

  refresh();
  return {
    ok: true,
    message:
      weeks.length === 0
        ? "모은 주차를 모두 해제했습니다."
        : `${weeks.join(" · ")}주차를 모았습니다.`,
    conflict: false,
    updatedAt: row.updated_at ?? null,
    weeks,
    collected: typeof row.collected === "number" ? row.collected : weeks.length,
  };
}

/** 본문 임시저장. 사진은 붙이지 않는다 (기간 리포트는 주차 근거를 쓴다). */
export async function savePeriodDraftAction(input: {
  revisionId: string;
  content: PeriodContent;
  expectedUpdatedAt: string;
}): Promise<PeriodSaveResult> {
  guardWrite("lib/staff/period-report-actions:savePeriodDraftAction");

  if (!UUID_PATTERN.test(input.revisionId)) {
    return { ok: false, message: "요청 값을 확인할 수 없습니다.", conflict: false, updatedAt: null };
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("save_report_draft", {
    p_revision_id: input.revisionId,
    p_content: normalizePeriodContent(input.content),
    p_media_ids: [],
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("period save", error);
    const mapped = toUserFacingError(error, FALLBACK);
    return {
      ok: false,
      message: mapped.message,
      conflict: mapped.kind === "conflict",
      updatedAt: null,
    };
  }

  return {
    ok: true,
    message: "임시저장했습니다.",
    conflict: false,
    updatedAt: (data as { updated_at?: string }).updated_at ?? null,
  };
}

/**
 * 완료.
 *
 * ★ 완료 조건은 DB 가 판정한다 — 모은 주차 ≥ 1 · 기간 요약 · 가정에 전하는 말.
 *   재료가 없는 템플릿은 완료되지 않는다 (RP006).
 */
export async function completePeriodAction(input: {
  revisionId: string;
  expectedUpdatedAt: string;
}): Promise<PeriodSaveResult> {
  guardWrite("lib/staff/period-report-actions:completePeriodAction");

  if (!UUID_PATTERN.test(input.revisionId)) {
    return { ok: false, message: "요청 값을 확인할 수 없습니다.", conflict: false, updatedAt: null };
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("complete_report_revision", {
    p_revision_id: input.revisionId,
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("period complete", error);
    const mapped = toUserFacingError(error, FALLBACK);
    return {
      ok: false,
      message: mapped.message,
      conflict: mapped.kind === "conflict",
      updatedAt: null,
    };
  }

  refresh();
  return {
    ok: true,
    message: "리포트를 완료했습니다.",
    conflict: false,
    updatedAt: (data as { updated_at?: string }).updated_at ?? null,
  };
}
