"use server";

import { PARENT_SHARING_LOCK_MESSAGE, PARENT_SHARING_RELEASED } from "@/lib/staff/release-locks";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { randomBytes, createHash } from "node:crypto";
import { requireDirector, requireTeacher } from "@/lib/auth/organization";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";
import type { WeeklyContent } from "./weekly-report-queries";

/**
 * Weekly Report · Revision · Hide · Portal 서버 행동 (DEC-066 · DEC-073 · DEC-074 ·
 * DEC-092 · DEC-101 · DEC-102 · DEC-103).
 *
 * · Generative AI 없음 · AI 는 완료 조건이 아니다
 * · 완료본은 직접 수정하지 않는다 → [수정본 만들기] (사유 필수)
 * · 숨김 · 다시 공개는 원장 (사유 필수 · audit) · 새 완료로 자동 공개 없음
 * · 본문 · token 을 로그에 남기지 않는다
 */

export interface WeeklySaveResult {
  ok: boolean;
  message: string | null;
  conflict: boolean;
  updatedAt: string | null;
}

const FALLBACK = "처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.";

export async function createWeeklyDraftAction(formData: FormData): Promise<void> {
  const childId = String(formData.get("childId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const weekNo = Number(formData.get("weekNo"));

  if (!UUID_PATTERN.test(childId) || !UUID_PATTERN.test(assignmentId) || !UUID_PATTERN.test(organizationId)) return;
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 52) return;

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("create_weekly_report_draft", {
    p_child_id: childId,
    p_assignment_id: assignmentId,
    p_week_no: weekNo,
  });

  if (error) {
    logRpcFailure("weekly create", error);
    redirect(`/teacher/growth-reports?org=${encodeURIComponent(organizationId)}&week=${weekNo}&error=${encodeURIComponent(error.code ?? "")}`);
  }

  const reportId = (data as { report_id?: string } | null)?.report_id;
  redirect(`/teacher/growth-reports/weekly/${reportId}?org=${encodeURIComponent(organizationId)}`);
}

export async function createWeeklyDraftsBulkAction(
  _prev: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const weekNo = Number(formData.get("weekNo"));
  const childIds = formData.getAll("childId").map(String).filter((id) => UUID_PATTERN.test(id));

  if (!UUID_PATTERN.test(assignmentId) || !Number.isInteger(weekNo) || childIds.length === 0 || childIds.length > 60) {
    return { message: "만들 리포트가 없습니다." };
  }

  const { supabase } = await requireTeacher();
  let created = 0;
  let failed = 0;

  for (const childId of childIds) {
    const { error } = await supabase.rpc("create_weekly_report_draft", {
      p_child_id: childId,
      p_assignment_id: assignmentId,
      p_week_no: weekNo,
    });
    if (error) {
      failed += 1;
      logRpcFailure("weekly bulk create", error);
    } else {
      created += 1;
    }
  }

  refresh();
  return {
    message:
      failed === 0
        ? `${created}명의 주간 리포트를 만들었습니다.`
        : `${created}명의 리포트를 만들었습니다. ${failed}명은 만들지 못했습니다. 각 아이 화면에서 다시 시도해 주세요.`,
  };
}

function normalizeContent(content: WeeklyContent): WeeklyContent {
  const clean = (value: string | null, limit: number) => {
    const trimmed = (value ?? "").trim();
    return trimmed ? trimmed.slice(0, limit) : null;
  };
  return {
    topic: clean(content.topic, 200),
    quote_choice: clean(content.quote_choice, 1000),
    teacher_observation: clean(content.teacher_observation, 2000),
    family_conversation: clean(content.family_conversation, 2000),
    next_week_preview: clean(content.next_week_preview, 300),
  };
}

export async function saveWeeklyDraftAction(input: {
  revisionId: string;
  content: WeeklyContent;
  mediaIds: string[];
  expectedUpdatedAt: string;
}): Promise<WeeklySaveResult> {
  if (!UUID_PATTERN.test(input.revisionId) || !Array.isArray(input.mediaIds)) {
    return { ok: false, message: "요청 값을 확인할 수 없습니다.", conflict: false, updatedAt: null };
  }
  if (input.mediaIds.length > 3 || input.mediaIds.some((id) => !UUID_PATTERN.test(id))) {
    return { ok: false, message: "사진은 3장까지 선택할 수 있습니다.", conflict: false, updatedAt: null };
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("save_report_draft", {
    p_revision_id: input.revisionId,
    p_content: normalizeContent(input.content),
    p_media_ids: input.mediaIds,
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("weekly save", error);
    const mapped = toUserFacingError(error, FALLBACK);
    return { ok: false, message: mapped.message, conflict: mapped.kind === "conflict", updatedAt: null };
  }

  return { ok: true, message: "임시저장했습니다.", conflict: false, updatedAt: (data as { updated_at?: string }).updated_at ?? null };
}

export async function completeWeeklyAction(input: {
  revisionId: string;
  expectedUpdatedAt: string;
}): Promise<WeeklySaveResult> {
  if (!UUID_PATTERN.test(input.revisionId)) {
    return { ok: false, message: "요청 값을 확인할 수 없습니다.", conflict: false, updatedAt: null };
  }

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("complete_report_revision", {
    p_revision_id: input.revisionId,
    p_expected_updated_at: input.expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("weekly complete", error);
    const mapped = toUserFacingError(error, FALLBACK);
    return { ok: false, message: mapped.message, conflict: mapped.kind === "conflict", updatedAt: null };
  }

  refresh();
  return { ok: true, message: "리포트를 완료했습니다.", conflict: false, updatedAt: (data as { updated_at?: string }).updated_at ?? null };
}

export async function startCorrectionAction(
  _prev: { phase: "idle" | "error"; message: string | null },
  formData: FormData,
): Promise<{ phase: "idle" | "error"; message: string | null }> {
  const reportId = String(formData.get("reportId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!UUID_PATTERN.test(reportId)) return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  if (!reason) return { phase: "error", message: "수정 사유를 입력해 주세요." };
  if (reason.length > 500) return { phase: "error", message: "수정 사유는 500자 이내로 입력해 주세요." };

  const { supabase } = await requireTeacher();
  const { error } = await supabase.rpc("start_report_correction", { p_report_id: reportId, p_reason: reason });

  if (error) {
    logRpcFailure("weekly correction", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return { phase: "idle", message: null };
}

export async function setReportVisibilityAction(
  _prev: { phase: "idle" | "success" | "error"; message: string | null },
  formData: FormData,
): Promise<{ phase: "idle" | "success" | "error"; message: string | null }> {
  const reportId = String(formData.get("reportId") ?? "");
  const action = String(formData.get("action") ?? "");
  const memo = String(formData.get("reasonMemo") ?? "").trim();
  const kind = String(formData.get("reasonKind") ?? "");
  const allowedKinds = ["사진 오류", "개인정보", "내용 오류", "기타"];
  // 숨김 사유 = 선택지 + 메모 (report-portal-flow · DEC-102) · 다시 공개 = 메모
  const reason = memo && action === "hide" && allowedKinds.includes(kind) ? `${kind} · ${memo}` : memo;

  if (!UUID_PATTERN.test(reportId) || (action !== "hide" && action !== "unhide")) {
    return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  }
  if (!reason) return { phase: "error", message: "사유를 입력해 주세요." };
  if (reason.length > 500) return { phase: "error", message: "사유는 500자 이내로 입력해 주세요." };

  const { supabase } = await requireDirector();
  const { error } = await supabase.rpc(action === "hide" ? "hide_report" : "unhide_report", {
    p_report_id: reportId,
    p_reason: reason,
  });

  if (error) {
    logRpcFailure("report visibility", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return {
    phase: "success",
    message: action === "hide" ? "학부모 화면에서 숨겼습니다." : "학부모 화면에 다시 공개했습니다.",
  };
}

// ---------------------------------------------------------------------------
// Child Portal (DEC-092) — raw token 은 발급 응답으로 1회만 · DB 에는 hash 만
// ---------------------------------------------------------------------------

export interface IssuePortalResult {
  ok: boolean;
  message: string | null;
  /** 공유 URL 경로 (token 은 fragment). 화면에 1회만 보여 주고 저장 · 로그하지 않는다. */
  sharePath: string | null;
}

export async function issueChildPortalAction(input: { childId: string }): Promise<IssuePortalResult> {
  // 출시 잠금 — 화면 버튼이 비활성이어도 서버에서 다시 막는다 (UAT-STABILIZATION · CO-12)
  if (!PARENT_SHARING_RELEASED) return { ok: false, message: PARENT_SHARING_LOCK_MESSAGE, sharePath: null };

  if (!UUID_PATTERN.test(input.childId)) return { ok: false, message: "요청 값을 확인할 수 없습니다.", sharePath: null };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  const { supabase } = await requireDirector();
  const { data, error } = await supabase.rpc("issue_child_portal", {
    p_child_id: input.childId,
    p_token_hash: tokenHash,
  });

  if (error) {
    logRpcFailure("portal issue", error);
    return { ok: false, message: toUserFacingError(error, FALLBACK).message, sharePath: null };
  }

  refresh();
  const publicId = (data as { public_id?: string }).public_id;
  return { ok: true, message: "새 공유 링크를 만들었습니다.", sharePath: `/share/portal/${publicId}#${token}` };
}

export async function revokeChildPortalAction(input: { portalId: string }): Promise<{ ok: boolean; message: string }> {
  if (!UUID_PATTERN.test(input.portalId)) return { ok: false, message: "요청 값을 확인할 수 없습니다." };

  const { supabase } = await requireDirector();
  const { error } = await supabase.rpc("revoke_child_portal", { p_portal_id: input.portalId });

  if (error) {
    logRpcFailure("portal revoke", error);
    return { ok: false, message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return { ok: true, message: "공유 링크를 중지했습니다." };
}

export async function recordMediaConsentAction(input: {
  childId: string;
  status: "unknown" | "consented" | "declined";
}): Promise<{ ok: boolean; message: string }> {
  if (!UUID_PATTERN.test(input.childId) || !["unknown", "consented", "declined"].includes(input.status)) {
    return { ok: false, message: "요청 값을 확인할 수 없습니다." };
  }

  const { supabase } = await requireDirector();
  const { error } = await supabase.rpc("record_media_consent", {
    p_child_id: input.childId,
    p_status: input.status,
    p_evidence_ref: null,
  });

  if (error) {
    logRpcFailure("consent record", error);
    return { ok: false, message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return { ok: true, message: "사진 공유 기록을 저장했습니다." };
}
