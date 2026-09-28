import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";

/**
 * Weekly Report 조회 (DEC-066 · DEC-089 · DEC-101 · DEC-102).
 *
 * 범위는 RLS 가 정한다 (담당 교사 · 원장). 목록은 반 × 주차 단위로 bounded 조회한다
 * (15명 × 24주 = 360건을 한 번에 잘라 읽지 않는다 · §95).
 */

export type WeeklyQueueStatus =
  | "needs_observation"
  | "ready"
  | "drafting"
  | "complete"
  | "correcting"
  | "hidden"
  | "absent";

export const WEEKLY_QUEUE_STATUS_LABELS: Record<WeeklyQueueStatus, string> = {
  needs_observation: "관찰 필요",
  ready: "작성 가능",
  drafting: "작성 중",
  complete: "완료",
  correcting: "완료 · 수정본 작성 중",
  hidden: "숨김",
  absent: "결석 · 작성 대상 아님",
};

export interface TeacherClassOption {
  classId: string;
  className: string;
  assignmentId: string;
  programTitle: string | null;
  weeks: number[];
}

export interface WeeklyQueueRow {
  childId: string;
  childName: string;
  status: WeeklyQueueStatus;
  reportId: string | null;
}

export interface WeeklyQueue {
  classes: TeacherClassOption[];
  selected: { classId: string; assignmentId: string; weekNo: number } | null;
  rows: WeeklyQueueRow[];
}

function log(scope: string, code: string | undefined) {
  console.error(`[weekly] ${scope} failed: code=${code ?? "unknown"}`);
}

/** 교사 본인이 담당하는 반 (class_teachers 자기 행 · RLS) */
async function assignedClassIds(supabase: SupabaseClient, organizationId: string, userId: string): Promise<string[]> {
  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("role", "teacher")
    .eq("status", "active");

  if (memberError || !members || members.length === 0) {
    if (memberError) log("members", memberError.code);
    return [];
  }

  const { data, error } = await supabase
    .from("class_teachers")
    .select("class_id")
    .in(
      "organization_member_id",
      (members as { id: string }[]).map((row) => row.id),
    );

  if (error) {
    log("class teachers", error.code);
    return [];
  }

  return [...new Set((data ?? []).map((row) => (row as { class_id: string }).class_id))];
}

export async function fetchTeacherWeeklyQueue(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  requested: { classId?: string; weekNo?: number },
): Promise<{ ok: true; queue: WeeklyQueue } | { ok: false }> {
  const classIds = await assignedClassIds(supabase, organizationId, userId);
  if (classIds.length === 0) return { ok: true, queue: { classes: [], selected: null, rows: [] } };

  const [classResult, assignmentResult, sessionResult] = await Promise.all([
    supabase.from("classes").select("id, name, status").in("id", classIds).eq("status", "active"),
    supabase
      .from("class_program_assignments")
      .select("id, class_id, program_id, status")
      .in("class_id", classIds)
      .eq("status", "active"),
    supabase
      .from("class_sessions")
      .select("class_id, class_program_assignment_id, week_no, status")
      .in("class_id", classIds)
      .in("status", ["in_progress", "completed"])
      .not("week_no", "is", null)
      .limit(2000),
  ]);

  if (classResult.error || assignmentResult.error || sessionResult.error) {
    log("queue context", (classResult.error ?? assignmentResult.error ?? sessionResult.error)?.code);
    return { ok: false };
  }

  const assignments = (assignmentResult.data ?? []) as { id: string; class_id: string; program_id: string }[];
  const programIds = [...new Set(assignments.map((row) => row.program_id))];
  const programTitles = new Map<string, string>();

  if (programIds.length > 0) {
    const { data } = await supabase.from("curriculum_programs").select("id, title").in("id", programIds);
    for (const row of (data ?? []) as { id: string; title: string }[]) programTitles.set(row.id, row.title);
  }

  const sessions = (sessionResult.data ?? []) as { class_id: string; class_program_assignment_id: string; week_no: number }[];

  const classes: TeacherClassOption[] = ((classResult.data ?? []) as { id: string; name: string }[])
    .flatMap((cls) =>
      assignments
        .filter((assignment) => assignment.class_id === cls.id)
        .map((assignment) => ({
          classId: cls.id,
          className: cls.name,
          assignmentId: assignment.id,
          programTitle: programTitles.get(assignment.program_id) ?? null,
          weeks: [
            ...new Set(
              sessions
                .filter((session) => session.class_program_assignment_id === assignment.id)
                .map((session) => session.week_no),
            ),
          ].sort((a, b) => a - b),
        })),
    )
    .sort((a, b) => a.className.localeCompare(b.className, "ko"));

  const option =
    classes.find((item) => item.classId === requested.classId && item.weeks.length > 0) ??
    classes.find((item) => item.weeks.length > 0) ??
    null;

  if (!option) return { ok: true, queue: { classes, selected: null, rows: [] } };

  const weekNo =
    requested.weekNo && option.weeks.includes(requested.weekNo) ? requested.weekNo : option.weeks[option.weeks.length - 1];

  const [childResult, weekSessionResult, reportResult] = await Promise.all([
    supabase
      .from("children")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("class_id", option.classId)
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(200),
    supabase
      .from("class_sessions")
      .select("id")
      .eq("class_program_assignment_id", option.assignmentId)
      .eq("week_no", weekNo)
      .in("status", ["in_progress", "completed"])
      .limit(20),
    supabase
      .from("reports")
      .select("id, child_id, latest_completed_revision_id, hidden_at")
      .eq("class_program_assignment_id", option.assignmentId)
      .eq("report_type", "weekly")
      .eq("week_no", weekNo)
      .limit(200),
  ]);

  if (childResult.error || weekSessionResult.error || reportResult.error) {
    log("queue rows", (childResult.error ?? weekSessionResult.error ?? reportResult.error)?.code);
    return { ok: false };
  }

  const sessionIds = ((weekSessionResult.data ?? []) as { id: string }[]).map((row) => row.id);
  const reports = (reportResult.data ?? []) as {
    id: string;
    child_id: string;
    latest_completed_revision_id: string | null;
    hidden_at: string | null;
  }[];

  const completedByChild = new Set<string>();
  const absentOnlyByChild = new Map<string, boolean>();
  const draftReportIds = new Set<string>();

  if (sessionIds.length > 0) {
    const [obsResult, attendanceResult] = await Promise.all([
      supabase
        .from("class_session_observations")
        .select("child_id")
        .in("class_session_id", sessionIds)
        .eq("record_status", "complete")
        .limit(1000),
      supabase
        .from("class_session_attendance")
        .select("child_id, attendance_status")
        .in("class_session_id", sessionIds)
        .limit(1000),
    ]);

    if (obsResult.error || attendanceResult.error) {
      log("queue evidence", (obsResult.error ?? attendanceResult.error)?.code);
      return { ok: false };
    }

    for (const row of (obsResult.data ?? []) as { child_id: string }[]) completedByChild.add(row.child_id);
    for (const row of (attendanceResult.data ?? []) as { child_id: string; attendance_status: string }[]) {
      const absent = row.attendance_status === "absent";
      absentOnlyByChild.set(row.child_id, (absentOnlyByChild.get(row.child_id) ?? true) && absent);
    }
  }

  if (reports.length > 0) {
    const { data, error } = await supabase
      .from("report_revisions")
      .select("report_id")
      .in(
        "report_id",
        reports.map((report) => report.id),
      )
      .eq("status", "draft");

    if (error) {
      log("queue drafts", error.code);
      return { ok: false };
    }

    for (const row of (data ?? []) as { report_id: string }[]) draftReportIds.add(row.report_id);
  }

  const reportByChild = new Map(reports.map((report) => [report.child_id, report]));

  const rows: WeeklyQueueRow[] = ((childResult.data ?? []) as { id: string; name: string }[]).map((child) => {
    const report = reportByChild.get(child.id) ?? null;
    let status: WeeklyQueueStatus;

    if (report?.hidden_at) status = "hidden";
    else if (report?.latest_completed_revision_id) status = draftReportIds.has(report.id) ? "correcting" : "complete";
    else if (report && draftReportIds.has(report.id)) status = "drafting";
    else if (completedByChild.has(child.id)) status = "ready";
    else if (absentOnlyByChild.get(child.id)) status = "absent";
    else status = "needs_observation";

    return { childId: child.id, childName: child.name, status, reportId: report?.id ?? null };
  });

  return {
    ok: true,
    queue: { classes, selected: { classId: option.classId, assignmentId: option.assignmentId, weekNo }, rows },
  };
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

export interface WeeklyContent {
  topic: string | null;
  quote_choice: string | null;
  teacher_observation: string | null;
  family_conversation: string | null;
  next_week_preview: string | null;
}

export interface WeeklyRevision {
  id: string;
  revisionNo: number;
  status: "draft" | "complete";
  content: WeeklyContent;
  updatedAt: string;
  completedAt: string | null;
  correctionReason: string | null;
}

export interface WeeklyEvidence {
  observationId: string;
  sessionDate: string | null;
  teacherNote: string | null;
  childVoice: string | null;
  growthLabels: string[];
}

export interface WeeklyMediaOption {
  id: string;
  signedUrl: string | null;
}

export interface WeeklyComposerData {
  report: {
    id: string;
    organizationId: string;
    classId: string;
    childId: string;
    childName: string | null;
    className: string | null;
    weekNo: number;
    hidden: boolean;
    hiddenReason: string | null;
    latestCompletedRevisionId: string | null;
  };
  latestCompleted: WeeklyRevision | null;
  draft: WeeklyRevision | null;
  selectedMediaIds: string[];
  evidence: WeeklyEvidence[];
  mediaOptions: WeeklyMediaOption[];
}

function toContent(value: unknown): WeeklyContent {
  const row = (value ?? {}) as Record<string, unknown>;
  const pick = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : null);
  return {
    topic: pick("topic"),
    quote_choice: pick("quote_choice"),
    teacher_observation: pick("teacher_observation"),
    family_conversation: pick("family_conversation"),
    next_week_preview: pick("next_week_preview"),
  };
}

export async function fetchWeeklyComposer(
  supabase: SupabaseClient,
  reportId: string,
  options: { includeDraft: boolean },
): Promise<{ ok: true; data: WeeklyComposerData } | { ok: false; reason: "not_found" | "load_failed" }> {
  if (!UUID_PATTERN.test(reportId)) return { ok: false, reason: "not_found" };

  const { data: reportRow, error: reportError } = await supabase
    .from("reports")
    .select("id, organization_id, class_id, child_id, class_program_assignment_id, week_no, hidden_at, hidden_reason, latest_completed_revision_id, report_type")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    log("composer report", reportError.code);
    return { ok: false, reason: "load_failed" };
  }
  if (!reportRow || (reportRow as { report_type: string }).report_type !== "weekly") return { ok: false, reason: "not_found" };

  const report = reportRow as {
    id: string;
    organization_id: string;
    class_id: string;
    child_id: string;
    class_program_assignment_id: string;
    week_no: number;
    hidden_at: string | null;
    hidden_reason: string | null;
    latest_completed_revision_id: string | null;
  };

  const [revisionResult, childResult, classResult, sessionResult, metricResult] = await Promise.all([
    supabase
      .from("report_revisions")
      .select("id, revision_no, status, content, updated_at, completed_at, correction_reason")
      .eq("report_id", report.id)
      .order("revision_no", { ascending: false })
      .limit(50),
    supabase.from("children").select("name").eq("id", report.child_id).maybeSingle(),
    supabase.from("classes").select("name").eq("id", report.class_id).maybeSingle(),
    supabase
      .from("class_sessions")
      .select("id, scheduled_date")
      .eq("class_program_assignment_id", report.class_program_assignment_id)
      .eq("week_no", report.week_no)
      .in("status", ["in_progress", "completed"])
      .limit(20),
    supabase.from("growth_metrics").select("code, label, sort_order"),
  ]);

  const firstError = [revisionResult, childResult, classResult, sessionResult, metricResult].find((result) => result.error);
  if (firstError?.error) {
    log("composer context", firstError.error.code);
    return { ok: false, reason: "load_failed" };
  }

  const revisions = ((revisionResult.data ?? []) as {
    id: string;
    revision_no: number;
    status: "draft" | "complete";
    content: unknown;
    updated_at: string;
    completed_at: string | null;
    correction_reason: string | null;
  }[]).map((row) => ({
    id: row.id,
    revisionNo: row.revision_no,
    status: row.status,
    content: toContent(row.content),
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    correctionReason: row.correction_reason,
  }));

  const latestCompleted = revisions.find((revision) => revision.id === report.latest_completed_revision_id) ?? null;
  const draft = options.includeDraft ? (revisions.find((revision) => revision.status === "draft") ?? null) : null;

  const sessions = (sessionResult.data ?? []) as { id: string; scheduled_date: string | null }[];
  const sessionDate = new Map(sessions.map((session) => [session.id, session.scheduled_date]));
  const metricLabel = new Map(
    ((metricResult.data ?? []) as { code: string; label: string }[]).map((row) => [row.code, row.label]),
  );

  let evidence: WeeklyEvidence[] = [];
  let mediaOptions: WeeklyMediaOption[] = [];
  let selectedMediaIds: string[] = [];

  if (sessions.length > 0 && draft) {
    const sessionIds = sessions.map((session) => session.id);
    const [obsResult, mediaResult, selectedResult] = await Promise.all([
      supabase
        .from("class_session_observations")
        .select("id, class_session_id, teacher_note, child_voice")
        .in("class_session_id", sessionIds)
        .eq("child_id", report.child_id)
        .eq("record_status", "complete"),
      supabase
        .from("class_session_observation_media")
        .select("id, storage_path, created_at")
        .in("class_session_id", sessionIds)
        .eq("child_id", report.child_id)
        .is("hidden_at", null)
        .order("created_at", { ascending: true })
        .limit(30),
      supabase.from("report_revision_media").select("media_id, sort_order").eq("revision_id", draft.id).order("sort_order"),
    ]);

    if (obsResult.error || mediaResult.error || selectedResult.error) {
      log("composer evidence", (obsResult.error ?? mediaResult.error ?? selectedResult.error)?.code);
      return { ok: false, reason: "load_failed" };
    }

    const observations = (obsResult.data ?? []) as {
      id: string;
      class_session_id: string;
      teacher_note: string | null;
      child_voice: string | null;
    }[];

    const growthByObservation = new Map<string, string[]>();
    if (observations.length > 0) {
      const { data } = await supabase
        .from("observation_growth_selections")
        .select("observation_id, metric_code")
        .in(
          "observation_id",
          observations.map((row) => row.id),
        );
      for (const row of (data ?? []) as { observation_id: string; metric_code: string }[]) {
        const list = growthByObservation.get(row.observation_id) ?? [];
        list.push(metricLabel.get(row.metric_code) ?? row.metric_code);
        growthByObservation.set(row.observation_id, list);
      }
    }

    evidence = observations.map((row) => ({
      observationId: row.id,
      sessionDate: sessionDate.get(row.class_session_id) ?? null,
      teacherNote: row.teacher_note,
      childVoice: row.child_voice,
      growthLabels: growthByObservation.get(row.id) ?? [],
    }));

    const mediaRows = (mediaResult.data ?? []) as { id: string; storage_path: string }[];
    if (mediaRows.length > 0) {
      const { data: signed } = await supabase.storage
        .from("observation-media")
        .createSignedUrls(
          mediaRows.map((row) => row.storage_path),
          60 * 10,
        );
      const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
      mediaOptions = mediaRows.map((row) => ({ id: row.id, signedUrl: urlByPath.get(row.storage_path) ?? null }));
    }

    selectedMediaIds = ((selectedResult.data ?? []) as { media_id: string }[]).map((row) => row.media_id);
  }

  return {
    ok: true,
    data: {
      report: {
        id: report.id,
        organizationId: report.organization_id,
        classId: report.class_id,
        childId: report.child_id,
        childName: (childResult.data as { name: string } | null)?.name ?? null,
        className: (classResult.data as { name: string } | null)?.name ?? null,
        weekNo: report.week_no,
        hidden: report.hidden_at !== null,
        hiddenReason: report.hidden_reason,
        latestCompletedRevisionId: report.latest_completed_revision_id,
      },
      latestCompleted,
      draft,
      selectedMediaIds,
      evidence,
      mediaOptions,
    },
  };
}
