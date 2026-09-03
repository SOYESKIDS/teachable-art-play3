"use server";

import { refresh } from "next/cache";
import { requireTeacher } from "@/lib/auth/organization";
import {
  generateGrowthReportDraft,
  isGrowthReportAiConfigured,
} from "@/lib/ai/growth-report-draft-provider";
import type {
  GrowthReportAiApplyState,
  GrowthReportAiGenerateState,
} from "@/types/staff-growth-report-ai";

/**
 * SERVICE-11B — 성장 리포트 AI 초안 Server Action.
 *
 * ★ 교사만 도달할 수 있다. 두 함수 모두 requireTeacher()로 시작한다.
 *   20260901190000의 Policy에는 director 분기가 아예 없다(조회조차 불가).
 *
 * ★ AI는 리포트를 완성하지 않는다.
 *   적용 RPC는 status를 건드리지 않는다. 확정은 11A의 "작성완료"뿐이다.
 *
 * ★ Client가 보내는 값 중 권한 근거로 쓰는 것은 없다.
 *   organization_id · class_id · child_id · source_revision · generated_by ·
 *   applied_by는 전부 DB trigger가 리포트 행에서 파생한다.
 *   화면은 reportId와 (적용 시) 리포트 토큰만 보낸다.
 *
 * ★ AI에게 보내는 것은 11A가 얼려 둔 근거 스냅샷뿐이다.
 *   살아 있는 관찰기록을 다시 읽지 않는다.
 *
 * ★ service_role을 쓰지 않는다. 사용자 세션 client + RLS만 사용한다.
 * ★ 사진·storage path·signed URL은 어느 경로로도 provider에 가지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIMESTAMPTZ_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?$/;

/** 20260901190000이 직접 던지는 코드 */
const GA_INVALID_INPUT = "GA001";
const GA_NOT_FOUND = "GA002";
const GA_NOT_DRAFT = "GA003";
const GA_REPORT_STALE = "GA004";
const GA_DRAFT_STALE = "GA005";
const GA_NO_DRAFT = "GA006";

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const RLS_VIOLATION = "42501";

const MESSAGES = {
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  notConfigured: "AI 기능 설정이 필요합니다. 기관 관리자에게 문의해주세요.",
  notFound: "리포트를 찾을 수 없거나 접근 권한이 없습니다.",
  notDraft: "작성 완료된 리포트에는 AI 초안을 사용할 수 없습니다.",
  noSource:
    "근거 관찰기록이 없어 AI 초안을 만들 수 없습니다. 근거를 먼저 모아주세요.",
  providerFailed: "AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
  invalidOutput:
    "AI 초안 결과를 사용할 수 없습니다. 다시 시도해주세요.",
  reportStale:
    "리포트가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  draftStale:
    "리포트 근거가 변경되었습니다. AI 초안을 다시 생성한 뒤 사용해주세요.",
  noDraft: "적용할 AI 초안이 없습니다.",
  notAllowed:
    "이 리포트의 AI 초안을 저장할 권한이 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  failure: "AI 초안을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

/**
 * 서버 로그에만 남긴다.
 *
 * ★ API key · 프롬프트 · 아이의 말 · 교사 관찰 · 검토 문장 · 생성된 AI 문장 ·
 *   아이 식별자를 남기지 않는다. 작업 이름과 오류 코드만 남긴다.
 */
function logFailure(scope: string, code: string) {
  console.error(`[staff/growth-report-ai] ${scope} failed: ${code}`);
}

interface ReportRow {
  id: string;
  organization_id: string;
  class_id: string;
  status: string;
  period_start: string;
  period_end: string;
  source_revision: number;
  attendance_present_count: number;
  attendance_absent_count: number;
  attendance_late_count: number;
  attendance_left_early_count: number;
  session_count: number;
}

interface SourceRow {
  observed_on: string | null;
  lesson_title_snapshot: string | null;
  lesson_order_snapshot: string | null;
  domain_labels_snapshot: string[] | null;
  child_voice_snapshot: string | null;
  teacher_note_snapshot: string | null;
  reviewed_text_snapshot: string;
}

/**
 * AI 초안을 만들고 저장한다 (신규 · 재생성 공용).
 *
 * ★ 다시 만들면 이전 "적용" 표시가 사라진다 — DB trigger가 강제한다.
 *   교사가 읽지 않은 새 문장이 "이미 적용됨"으로 보이면 안 되기 때문이다.
 */
export async function generateGrowthReportAiDraftAction(input: {
  reportId: string;
}): Promise<GrowthReportAiGenerateState> {
  const reportId = String(input?.reportId ?? "");

  if (!UUID_PATTERN.test(reportId)) {
    return { ok: false, message: MESSAGES.invalidRequest };
  }

  // 환경변수가 없으면 provider를 부르지 않고 여기서 끝낸다.
  if (!isGrowthReportAiConfigured()) {
    return { ok: false, message: MESSAGES.notConfigured };
  }

  // 로그인 + role='teacher' + membership active + 기관 active를 DB가 판정한다.
  const { supabase } = await requireTeacher();

  /**
   * ★ 리포트를 서버가 직접 다시 읽는다.
   *   담당하지 않는 반이면 11A의 SELECT Policy 때문에 0건이 되어 not_found로 끝난다.
   */
  const { data: reportData, error: reportError } = await supabase
    .from("child_growth_reports")
    .select(
      "id, organization_id, class_id, status, period_start, period_end, source_revision, attendance_present_count, attendance_absent_count, attendance_late_count, attendance_left_early_count, session_count",
    )
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logFailure("report lookup", reportError.code ?? "unknown");
    return { ok: false, message: MESSAGES.notFound };
  }

  if (!reportData) {
    return { ok: false, message: MESSAGES.notFound };
  }

  const report = reportData as unknown as ReportRow;

  if (report.status !== "draft") {
    return { ok: false, message: MESSAGES.notDraft };
  }

  /**
   * ★ 근거는 11A가 얼려 둔 스냅샷에서만 읽는다.
   *   살아 있는 class_session_observations를 읽지 않는다 —
   *   리포트가 근거로 삼은 것과 AI가 본 것이 달라지면 안 된다.
   */
  const { data: sourceData, error: sourceError } = await supabase
    .from("child_growth_report_sources")
    .select(
      "observed_on, lesson_title_snapshot, lesson_order_snapshot, domain_labels_snapshot, child_voice_snapshot, teacher_note_snapshot, reviewed_text_snapshot",
    )
    .eq("report_id", report.id)
    .order("observed_on", { ascending: true });

  if (sourceError) {
    logFailure("source lookup", sourceError.code ?? "unknown");
    return { ok: false, message: MESSAGES.failure };
  }

  const sources = (sourceData ?? []) as unknown as SourceRow[];

  if (sources.length === 0) {
    return { ok: false, message: MESSAGES.noSource };
  }

  /**
   * ★ provider로 나가는 값은 여기서 만드는 이 객체가 전부다.
   *   아이 이름 · child_id · 기관 · 반 · report_id · observation_id ·
   *   교사 정보 · 사진 · storage path 어느 것도 포함하지 않는다.
   *
   *   ※ 다만 childVoice / teacherNote / reviewedText는 교사가 자유롭게 쓴 문장이라
   *     그 안에 사람 이름이 적혀 있을 수 있다. 이 코드가 보장하는 것은
   *     "명시적 식별 필드를 보내지 않는다"까지다.
   */
  const generated = await generateGrowthReportDraft({
    periodStart: report.period_start,
    periodEnd: report.period_end,
    attendance: {
      presentCount: report.attendance_present_count,
      lateCount: report.attendance_late_count,
      leftEarlyCount: report.attendance_left_early_count,
      absentCount: report.attendance_absent_count,
      sessionCount: report.session_count,
    },
    evidence: sources.map((row) => ({
      observedOn: row.observed_on,
      lessonTitle: row.lesson_title_snapshot,
      lessonOrder: row.lesson_order_snapshot,
      domainLabels: row.domain_labels_snapshot ?? [],
      childVoice: row.child_voice_snapshot,
      teacherNote: row.teacher_note_snapshot,
      reviewedText: row.reviewed_text_snapshot,
    })),
  });

  if (!generated.ok) {
    switch (generated.reason) {
      case "not_configured":
        return { ok: false, message: MESSAGES.notConfigured };
      case "no_source":
        return { ok: false, message: MESSAGES.noSource };
      case "invalid_output":
        return { ok: false, message: MESSAGES.invalidOutput };
      default:
        return { ok: false, message: MESSAGES.providerFailed };
    }
  }

  /**
   * ★ 저장은 RPC 한 번. source_revision·구조값·생성자는 전부 trigger가 채운다.
   *   UNIQUE(report_id) + on conflict라 더블클릭·재시도로 행이 늘지 않는다.
   */
  const { error: rpcError } = await supabase.rpc(
    "save_child_growth_report_ai_draft",
    {
      p_report_id: report.id,
      p_growth_changes: generated.growthChanges,
      p_observation_summary: generated.observationSummary,
      p_next_support: generated.nextSupport,
      p_provider: generated.provider,
      p_model: generated.model,
      p_prompt_version: generated.promptVersion,
    },
  );

  if (rpcError) {
    logFailure("ai draft save", rpcError.code ?? "unknown");

    switch (rpcError.code) {
      case GA_INVALID_INPUT:
        return { ok: false, message: MESSAGES.invalidOutput };
      case GA_NOT_FOUND:
        return { ok: false, message: MESSAGES.notFound };
      case GA_NOT_DRAFT:
        return { ok: false, message: MESSAGES.notDraft };
      case UNIQUE_VIOLATION:
      case GA_DRAFT_STALE:
        return { ok: false, message: MESSAGES.draftStale };
      case RLS_VIOLATION:
      case CHECK_VIOLATION:
        return { ok: false, message: MESSAGES.notAllowed };
      default:
        return { ok: false, message: MESSAGES.failure };
    }
  }

  refresh();

  return { ok: true };
}

/**
 * AI 초안을 리포트 본문에 적용한다.
 *
 * ★ 리포트를 완성하지 않는다. status는 draft 그대로 남고,
 *   교사가 내용을 확인한 뒤 11A의 "작성완료"를 눌러야 확정된다.
 *
 * ★ expectedUpdatedAt은 화면이 받은 문자열 그대로 넘긴다.
 *   서버가 방금 읽은 값으로 바꿔치기하면 낙관적 동시성이 무력화된다.
 */
export async function applyGrowthReportAiDraftAction(input: {
  reportId: string;
  expectedUpdatedAt: string;
}): Promise<GrowthReportAiApplyState> {
  const reportId = String(input?.reportId ?? "");
  const expectedUpdatedAt = String(input?.expectedUpdatedAt ?? "").trim();

  if (!UUID_PATTERN.test(reportId)) {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  if (!TIMESTAMPTZ_PATTERN.test(expectedUpdatedAt)) {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  const { supabase } = await requireTeacher();

  const { error } = await supabase.rpc(
    "apply_child_growth_report_ai_draft",
    {
      p_report_id: reportId,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );

  if (error) {
    logFailure("ai draft apply", error.code ?? "unknown");

    switch (error.code) {
      case GA_DRAFT_STALE:
        return { ok: false, kind: "stale", message: MESSAGES.draftStale };
      case GA_REPORT_STALE:
        return {
          ok: false,
          kind: "report_stale",
          message: MESSAGES.reportStale,
        };
      case GA_NO_DRAFT:
        return { ok: false, kind: "error", message: MESSAGES.noDraft };
      case GA_NOT_DRAFT:
        return { ok: false, kind: "error", message: MESSAGES.notDraft };
      case GA_NOT_FOUND:
        return { ok: false, kind: "error", message: MESSAGES.notFound };
      case GA_INVALID_INPUT:
        return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
      case RLS_VIOLATION:
      case CHECK_VIOLATION:
        return { ok: false, kind: "error", message: MESSAGES.notAllowed };
      default:
        return { ok: false, kind: "error", message: MESSAGES.failure };
    }
  }

  refresh();

  return { ok: true };
}
