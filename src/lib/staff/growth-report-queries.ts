import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChildStatus, ClassStatus } from "@/types/class-child";
import type { GrowthReportAiDraft } from "@/types/staff-growth-report-ai";
import {
  MAX_GROWTH_REPORT_LIST,
  MAX_GROWTH_REPORT_SOURCES,
  type GrowthReportClassOption,
  type GrowthReportDetailResult,
  type GrowthReportListItem,
  type GrowthReportListResult,
  type GrowthReportSource,
  type GrowthReportStatus,
} from "@/types/staff-growth-report";

/**
 * SERVICE-11A — 성장 리포트 조회.
 *
 * ★ 권한 범위는 RLS가 최종 결정한다.
 *   교사는 배정된 반의 리포트를, 원장은 자기 기관의 **완료된** 리포트만 본다.
 *   원장에게 draft를 감추는 것은 화면이 아니라 SELECT Policy가 한다 —
 *   화면 조건으로만 막으면 언젠가 어긋난다.
 *
 * ★ N+1 금지.
 *   목록은 리포트 1회 + 반 1회 + 원아 1회 + 근거 수 1회로 고정이다.
 *   상세는 리포트 1회 + 근거 1회 + 반/원아 조회로 고정이다.
 *
 * ★ 사진은 이 화면에 오지 않는다. media 테이블을 읽지 않는다.
 * ★ AI 원문(generated_text)도 오지 않는다. 근거는 스냅샷된 검토 문장뿐이다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logQueryFailure(scope: string, message: string) {
  console.error(`[staff/growth-report] ${scope} query failed: ${message}`);
}

interface AiDraftRow {
  id: string;
  source_revision: number;
  generated_growth_changes: string;
  generated_observation_summary: string;
  generated_next_support: string;
  applied_at: string | null;
  generated_at: string;
}

interface ReportRow {
  id: string;
  source_revision: number;
  organization_id: string;
  class_id: string;
  child_id: string;
  period_start: string;
  period_end: string;
  title: string;
  status: GrowthReportStatus;
  growth_changes: string | null;
  observation_summary: string | null;
  next_support: string | null;
  attendance_present_count: number;
  attendance_absent_count: number;
  attendance_late_count: number;
  attendance_left_early_count: number;
  session_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SourceRow {
  id: string;
  report_id: string;
  observation_id: string;
  session_id: string;
  observed_on: string | null;
  lesson_title_snapshot: string | null;
  lesson_order_snapshot: string | null;
  domain_labels_snapshot: string[] | null;
  reviewed_text_snapshot: string;
  child_voice_snapshot: string | null;
  teacher_note_snapshot: string | null;
  source_observation_updated_at: string;
  source_ai_updated_at: string;
}

interface ClassRow {
  id: string;
  name: string;
  status: ClassStatus;
}

interface ChildRow {
  id: string;
  name: string;
  status: ChildStatus;
  class_id: string | null;
}

const REPORT_COLUMNS =
  "id, organization_id, class_id, child_id, period_start, period_end, title, status, growth_changes, observation_summary, next_support, attendance_present_count, attendance_absent_count, attendance_late_count, attendance_left_early_count, session_count, completed_at, created_at, updated_at, source_revision";

const SOURCE_COLUMNS =
  "id, report_id, observation_id, session_id, observed_on, lesson_title_snapshot, lesson_order_snapshot, domain_labels_snapshot, reviewed_text_snapshot, child_voice_snapshot, teacher_note_snapshot, source_observation_updated_at, source_ai_updated_at";

function toSource(row: SourceRow): GrowthReportSource {
  return {
    id: row.id,
    observationId: row.observation_id,
    sessionId: row.session_id,
    observedOn: row.observed_on,
    lessonTitle: row.lesson_title_snapshot,
    lessonOrder: row.lesson_order_snapshot,
    domainLabels: row.domain_labels_snapshot ?? [],
    reviewedText: row.reviewed_text_snapshot,
    childVoice: row.child_voice_snapshot,
    teacherNote: row.teacher_note_snapshot,
    sourceObservationUpdatedAt: row.source_observation_updated_at,
    sourceAiUpdatedAt: row.source_ai_updated_at,
  };
}

/**
 * 성장 리포트 목록.
 *
 * ★ 교사/원장이 같은 함수를 쓴다.
 *   무엇이 보이는지는 RLS가 정한다 — 원장에게는 완료된 것만 돌아온다.
 *   `completedOnly`는 화면 문구를 맞추기 위한 표시용 필터일 뿐,
 *   보안 경계가 아니다(그 경계는 SELECT Policy에 있다).
 */
export async function fetchGrowthReports(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GrowthReportListResult> {
  if (!UUID_PATTERN.test(organizationId)) {
    return { ok: false, reason: "load_failed" };
  }

  const { data, error } = await supabase
    .from("child_growth_reports")
    .select(REPORT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("period_end", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(MAX_GROWTH_REPORT_LIST);

  if (error) {
    logQueryFailure("report list", error.message);
    return { ok: false, reason: "load_failed" };
  }

  const rows = (data ?? []) as unknown as ReportRow[];

  if (rows.length === 0) {
    return { ok: true, reports: [] };
  }

  const classIds = [...new Set(rows.map((row) => row.class_id))];
  const childIds = [...new Set(rows.map((row) => row.child_id))];
  const reportIds = rows.map((row) => row.id);

  // 반 이름 · 원아 이름 · 근거 수를 각각 1회씩만 읽는다 (원아별 N+1 금지).
  const [classResult, childResult, sourceResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, status")
      .in("id", classIds),

    supabase
      .from("children")
      .select("id, name, status, class_id")
      .eq("organization_id", organizationId)
      .in("id", childIds),

    supabase
      .from("child_growth_report_sources")
      .select("id, report_id")
      .in("report_id", reportIds)
      .limit(MAX_GROWTH_REPORT_LIST * MAX_GROWTH_REPORT_SOURCES),
  ]);

  if (classResult.error) {
    logQueryFailure("class lookup", classResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (childResult.error) {
    logQueryFailure("child lookup", childResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (sourceResult.error) {
    logQueryFailure("source count", sourceResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  const classById = new Map(
    ((classResult.data ?? []) as unknown as ClassRow[]).map((row) => [
      row.id,
      row,
    ]),
  );

  const childById = new Map(
    ((childResult.data ?? []) as unknown as ChildRow[]).map((row) => [
      row.id,
      row,
    ]),
  );

  const sourceCountByReportId = new Map<string, number>();

  for (const row of (sourceResult.data ?? []) as unknown as {
    report_id: string;
  }[]) {
    sourceCountByReportId.set(
      row.report_id,
      (sourceCountByReportId.get(row.report_id) ?? 0) + 1,
    );
  }

  const reports: GrowthReportListItem[] = rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    classId: row.class_id,
    childId: row.child_id,

    className: classById.get(row.class_id)?.name ?? null,
    classStatus: classById.get(row.class_id)?.status ?? null,
    // ★ 이름을 읽지 못해도 리포트를 목록에서 감추지 않는다(08B/09A와 같은 규칙).
    childName: childById.get(row.child_id)?.name ?? null,

    periodStart: row.period_start,
    periodEnd: row.period_end,
    title: row.title,
    status: row.status,

    sourceCount: sourceCountByReportId.get(row.id) ?? 0,

    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }));

  return { ok: true, reports };
}

/**
 * 성장 리포트 상세.
 *
 * 다른 기관/권한 밖 reportId를 넣어도 RLS 때문에 0건이므로 not_found로만 응답한다.
 * 존재 여부와 권한 여부를 구분해 노출하지 않는다.
 */
export async function fetchGrowthReportDetail(
  supabase: SupabaseClient,
  organizationId: string,
  reportId: string,
): Promise<GrowthReportDetailResult> {
  if (
    !UUID_PATTERN.test(organizationId) ||
    !UUID_PATTERN.test(reportId)
  ) {
    return { ok: false, reason: "invalid_id" };
  }

  const { data: reportData, error: reportError } = await supabase
    .from("child_growth_reports")
    .select(REPORT_COLUMNS)
    .eq("id", reportId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (reportError) {
    logQueryFailure("report detail", reportError.message);
    return { ok: false, reason: "load_failed" };
  }

  if (!reportData) {
    return { ok: false, reason: "not_found" };
  }

  const report = reportData as unknown as ReportRow;

  const [sourceResult, classResult, childResult, aiDraftResult] = await Promise.all([
    supabase
      .from("child_growth_report_sources")
      .select(SOURCE_COLUMNS)
      .eq("report_id", report.id)
      .order("observed_on", { ascending: true })
      .limit(MAX_GROWTH_REPORT_SOURCES),

    supabase
      .from("classes")
      .select("id, name, status")
      .eq("id", report.class_id)
      .maybeSingle(),

    supabase
      .from("children")
      .select("id, name, status, class_id")
      .eq("id", report.child_id)
      .eq("organization_id", organizationId)
      .maybeSingle(),

    /**
     * SERVICE-11B — 이 리포트의 AI 초안.
     *
     * ★ 원장에게는 0건이 돌아온다. SELECT Policy 에 원장 분기가 없기 때문이다.
     *   화면에서 감추는 것이 아니라 DB 가 애초에 주지 않는다.
     * ★ 조회 실패를 화면 실패로 만들지 않는다 — AI 는 보조 기능이라
     *   초안을 못 읽어도 리포트 자체는 정상적으로 보여야 한다.
     */
    supabase
      .from("child_growth_report_ai_drafts")
      .select(
        "id, source_revision, generated_growth_changes, generated_observation_summary, generated_next_support, applied_at, generated_at",
      )
      .eq("report_id", report.id)
      .maybeSingle(),
  ]);

  if (sourceResult.error) {
    logQueryFailure("report sources", sourceResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (classResult.error) {
    logQueryFailure("class detail", classResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (childResult.error) {
    logQueryFailure("child detail", childResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  /**
   * ★ AI 초안 조회 실패는 로그만 남기고 null 로 진행한다.
   *   원장은 Policy 때문에 항상 0건이고, 그것은 오류가 아니라 설계다.
   */
  if (aiDraftResult.error) {
    logQueryFailure("ai draft", aiDraftResult.error.message);
  }

  const aiRow =
    (aiDraftResult.data as unknown as AiDraftRow | null) ?? null;

  /**
   * ★ stale 판정은 여기서 계산한다.
   *   생성 당시의 근거 세대와 리포트의 현재 세대를 비교한다.
   *   교사가 본문을 저장해도 세대는 그대로이므로 초안이 살아 있고,
   *   "근거 다시 모으기"를 누르면 세대가 올라가 stale 이 된다.
   */
  const aiDraft: GrowthReportAiDraft | null = aiRow
    ? {
        id: aiRow.id,
        growthChanges: aiRow.generated_growth_changes,
        observationSummary: aiRow.generated_observation_summary,
        nextSupport: aiRow.generated_next_support,
        isSourceStale: aiRow.source_revision !== report.source_revision,
        appliedAt: aiRow.applied_at,
        generatedAt: aiRow.generated_at,
      }
    : null;

  const classRow =
    (classResult.data as unknown as ClassRow | null) ?? null;
  const childRow =
    (childResult.data as unknown as ChildRow | null) ?? null;

  return {
    ok: true,
    report: {
      id: report.id,
      organizationId: report.organization_id,
      classId: report.class_id,
      childId: report.child_id,

      className: classRow?.name ?? null,
      classStatus: classRow?.status ?? null,
      childName: childRow?.name ?? null,

      periodStart: report.period_start,
      periodEnd: report.period_end,
      title: report.title,
      status: report.status,

      growthChanges: report.growth_changes,
      observationSummary: report.observation_summary,
      nextSupport: report.next_support,

      attendance: {
        presentCount: report.attendance_present_count,
        absentCount: report.attendance_absent_count,
        lateCount: report.attendance_late_count,
        leftEarlyCount: report.attendance_left_early_count,
        sessionCount: report.session_count,
      },

      sources: (
        (sourceResult.data ?? []) as unknown as SourceRow[]
      ).map(toSource),

      completedAt: report.completed_at,
      createdAt: report.created_at,
      // ★ DB 문자열 그대로. 저장의 동시성 토큰이다.
      updatedAt: report.updated_at,

      aiDraft,
    },
  };
}

/**
 * 교사가 리포트를 만들 때 고를 수 있는 반과 원아.
 *
 * ★ 여기서 반환되는 목록이 권한의 근거는 아니다.
 *   RLS가 담당 반만 돌려주고, 저장 시점에 RPC와 trigger가 다시 판정한다.
 *   이 함수는 "교사가 화면에서 무엇을 고를 수 있는가"만 만든다.
 */
export async function fetchGrowthReportClassOptions(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GrowthReportClassOption[]> {
  if (!UUID_PATTERN.test(organizationId)) return [];

  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("id, name, status")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (classError) {
    logQueryFailure("class options", classError.message);
    return [];
  }

  const classes = (classData ?? []) as unknown as ClassRow[];

  if (classes.length === 0) return [];

  const { data: childData, error: childError } = await supabase
    .from("children")
    .select("id, name, status, class_id")
    .eq("organization_id", organizationId)
    .in(
      "class_id",
      classes.map((row) => row.id),
    )
    .order("name", { ascending: true });

  if (childError) {
    logQueryFailure("child options", childError.message);
    return [];
  }

  const children = (childData ?? []) as unknown as ChildRow[];

  return classes.map((row) => ({
    classId: row.id,
    className: row.name,
    classStatus: row.status,
    children: children
      .filter((child) => child.class_id === row.id)
      .map((child) => ({
        childId: child.id,
        childName: child.name,
      })),
  }));
}
