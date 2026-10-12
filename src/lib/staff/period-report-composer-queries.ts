import type { SupabaseClient } from "@supabase/supabase-js";
import { weeksInBlock, type PeriodReportKind } from "./period-report-queries";

/**
 * 월간 · 학기 리포트 작성 화면 조회 — 사용자 지시 항목 1.
 *
 * ── 읽기 전용 모듈이다 ─────────────────────────────────────────────
 *
 * 쓰기는 `period-report-actions.ts` 가 RPC 로 한다. 이 파일은 화면이 필요한
 * 값만 모은다.
 *
 * ── 무엇을 보여 줘야 하는가 ────────────────────────────────────────
 *
 *   1. 이 기간 리포트의 상태 (작성 중 초안 · 최근 완료본)
 *   2. 모을 수 있는 주차 — **완료되고 숨김이 아닌** 같은 원아의 주간 리포트
 *   3. 이미 모은 주차와, 모은 뒤에 원문이 바뀐 주차
 *
 * ── 하지 않는 것 ───────────────────────────────────────────────────
 *
 * ★ 본문을 자동으로 만들지 않는다. 주차 문장을 이어 붙여 "요약"이라고 쓰지
 *   않는다. 교사가 쓴다.
 *
 * ★ 평균 · 성장률 · 서열을 계산하지 않는다.
 *
 * ★ 모은 뒤에 주간이 정정되어도 모은 내용을 조용히 바꾸지 않는다.
 *   `staleWeeks` 로 알리고, 다시 모으는 것은 교사가 결정한다.
 *
 * ★ 읽기 실패를 빈 결과 성공으로 감추지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNDEFINED_TABLE = "42P01";

function log(scope: string, code: string | undefined) {
  // 본문 · 원아 이름을 로그에 남기지 않는다. 코드만 남긴다.
  console.error(`[reports/period-composer] ${scope} failed:`, { code: code ?? null });
}

/** 월간 · 학기 본문 템플릿 (DB `private.normalize_period_content` 와 같은 모양) */
export interface PeriodContent {
  overview: string | null;
  family_message: string | null;
  next_period_focus: string | null;
}

export interface PeriodRevision {
  id: string;
  revisionNo: number;
  status: "draft" | "complete";
  content: PeriodContent;
  updatedAt: string;
  completedAt: string | null;
  correctionReason: string | null;
}

/** 모을 수 있는 주차 하나 */
export interface PeriodCandidateWeek {
  /** 주간 리포트 id — 모을 때 이 값을 보낸다 */
  reportId: string;
  weekNo: number;
  /** 지금 주간 리포트가 가리키는 완료 revision */
  completedRevisionId: string;
  /** 지금 초안이 이 주차를 모았는가 */
  collected: boolean;
  /** 모았다면, 모은 시점의 revision */
  collectedRevisionId: string | null;
  /** 모은 뒤에 주간이 정정되었는가 */
  stale: boolean;
}

export interface PeriodComposerData {
  report: {
    id: string;
    organizationId: string;
    classId: string;
    childId: string;
    childName: string | null;
    className: string | null;
    assignmentId: string;
    kind: PeriodReportKind;
    blockNo: number | null;
    termKey: string | null;
    hidden: boolean;
    hiddenReason: string | null;
    latestCompletedRevisionId: string | null;
  };
  draft: PeriodRevision | null;
  latestCompleted: PeriodRevision | null;
  /** 완료본이 모은 주차 (읽기 표시용) */
  completedWeeks: number[];
  /** 작성 중 초안이 모을 수 있는 주차 */
  candidates: PeriodCandidateWeek[];
  /** 모은 뒤 원문이 바뀐 주차 */
  staleWeeks: number[];
  /** 모을 재료가 하나도 없다 */
  empty: boolean;
}

export type PeriodComposerResult =
  | { ok: true; data: PeriodComposerData }
  | { ok: false; reason: "not_found" | "load_failed" | "not_installed" };

function toPeriodContent(value: unknown): PeriodContent {
  const row = (value ?? {}) as Record<string, unknown>;
  const pick = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : null);
  return {
    overview: pick("overview"),
    family_message: pick("family_message"),
    next_period_focus: pick("next_period_focus"),
  };
}

export async function fetchPeriodComposer(
  supabase: SupabaseClient,
  reportId: string,
): Promise<PeriodComposerResult> {
  if (!UUID_PATTERN.test(reportId)) return { ok: false, reason: "not_found" };

  const { data: reportRow, error: reportError } = await supabase
    .from("reports")
    .select(
      "id, organization_id, class_id, child_id, class_program_assignment_id, " +
        "report_type, block_no, reporting_term_key, hidden_at, hidden_reason, " +
        "latest_completed_revision_id",
    )
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    log("report", reportError.code);
    return {
      ok: false,
      reason: reportError.code === UNDEFINED_TABLE ? "not_installed" : "load_failed",
    };
  }

  const kindValue = (reportRow as { report_type?: unknown } | null)?.report_type;
  if (!reportRow || (kindValue !== "monthly" && kindValue !== "semester")) {
    return { ok: false, reason: "not_found" };
  }

  const report = reportRow as {
    id: string;
    organization_id: string;
    class_id: string;
    child_id: string;
    class_program_assignment_id: string;
    block_no: number | null;
    reporting_term_key: string | null;
    hidden_at: string | null;
    hidden_reason: string | null;
    latest_completed_revision_id: string | null;
  };
  const kind: PeriodReportKind = kindValue;

  const [revisionResult, childResult, classResult] = await Promise.all([
    supabase
      .from("report_revisions")
      .select("id, revision_no, status, content, updated_at, completed_at, correction_reason")
      .eq("report_id", report.id)
      .order("revision_no", { ascending: false })
      .limit(50),
    supabase.from("children").select("name").eq("id", report.child_id).maybeSingle(),
    supabase.from("classes").select("name").eq("id", report.class_id).maybeSingle(),
  ]);

  const firstError = [revisionResult, childResult, classResult].find((r) => r.error);
  if (firstError?.error) {
    log("context", firstError.error.code);
    return { ok: false, reason: "load_failed" };
  }

  const revisions = (
    (revisionResult.data ?? []) as {
      id: string;
      revision_no: number;
      status: "draft" | "complete";
      content: unknown;
      updated_at: string;
      completed_at: string | null;
      correction_reason: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    revisionNo: row.revision_no,
    status: row.status,
    content: toPeriodContent(row.content),
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    correctionReason: row.correction_reason,
  }));

  const draft = revisions.find((r) => r.status === "draft") ?? null;
  const latestCompleted =
    revisions.find((r) => r.id === report.latest_completed_revision_id) ?? null;

  // 모을 수 있는 주차 — 같은 원아 · 같은 배정의 완료 · 비숨김 주간 리포트.
  // 월간은 블록이 덮는 4주로 좁힌다. 학기는 배정 전체 주차를 후보로 둔다.
  let weeklyQuery = supabase
    .from("reports")
    .select("id, week_no, latest_completed_revision_id, hidden_at")
    .eq("child_id", report.child_id)
    .eq("class_program_assignment_id", report.class_program_assignment_id)
    .eq("report_type", "weekly")
    .is("hidden_at", null)
    .not("latest_completed_revision_id", "is", null)
    .order("week_no", { ascending: true })
    .limit(60);

  if (kind === "monthly" && report.block_no !== null) {
    weeklyQuery = weeklyQuery.in("week_no", weeksInBlock(report.block_no));
  }

  const weeklyResult = await weeklyQuery;
  if (weeklyResult.error) {
    log("weekly candidates", weeklyResult.error.code);
    return { ok: false, reason: "load_failed" };
  }

  // 이미 모은 주차 — 초안과 완료본 각각
  const revisionIds = [draft?.id, latestCompleted?.id].filter(
    (id): id is string => typeof id === "string",
  );

  let collectedRows: {
    revision_id: string;
    source_report_id: string;
    source_revision_id: string;
    week_no: number;
  }[] = [];

  if (revisionIds.length > 0) {
    const sourcesResult = await supabase
      .from("report_period_sources")
      .select("revision_id, source_report_id, source_revision_id, week_no")
      .in("revision_id", revisionIds);

    if (sourcesResult.error) {
      // ★ 모은 목록을 읽지 못한 것을 "아직 안 모았음"으로 보여 주지 않는다.
      //   그대로 보여 주면 교사가 다시 모아 기존 선택을 덮어쓴다.
      log("collected sources", sourcesResult.error.code);
      return {
        ok: false,
        reason: sourcesResult.error.code === UNDEFINED_TABLE ? "not_installed" : "load_failed",
      };
    }
    collectedRows = (sourcesResult.data ?? []) as typeof collectedRows;
  }

  const draftCollected = new Map(
    collectedRows
      .filter((row) => row.revision_id === draft?.id)
      .map((row) => [row.source_report_id, row]),
  );

  const candidates: PeriodCandidateWeek[] = (
    (weeklyResult.data ?? []) as {
      id: string;
      week_no: number | null;
      latest_completed_revision_id: string | null;
    }[]
  )
    .filter(
      (row): row is { id: string; week_no: number; latest_completed_revision_id: string } =>
        typeof row.week_no === "number" &&
        typeof row.latest_completed_revision_id === "string",
    )
    .map((row) => {
      const collected = draftCollected.get(row.id) ?? null;
      return {
        reportId: row.id,
        weekNo: row.week_no,
        completedRevisionId: row.latest_completed_revision_id,
        collected: collected !== null,
        collectedRevisionId: collected?.source_revision_id ?? null,
        stale:
          collected !== null &&
          collected.source_revision_id !== row.latest_completed_revision_id,
      };
    });

  const completedWeeks = collectedRows
    .filter((row) => row.revision_id === latestCompleted?.id)
    .map((row) => row.week_no)
    .sort((a, b) => a - b);

  return {
    ok: true,
    data: {
      report: {
        id: report.id,
        organizationId: report.organization_id,
        classId: report.class_id,
        childId: report.child_id,
        childName: (childResult.data as { name?: string } | null)?.name ?? null,
        className: (classResult.data as { name?: string } | null)?.name ?? null,
        assignmentId: report.class_program_assignment_id,
        kind,
        blockNo: report.block_no,
        termKey: report.reporting_term_key,
        hidden: report.hidden_at !== null,
        hiddenReason: report.hidden_reason,
        latestCompletedRevisionId: report.latest_completed_revision_id,
      },
      draft,
      latestCompleted,
      completedWeeks,
      candidates,
      staleWeeks: candidates
        .filter((c) => c.stale)
        .map((c) => c.weekNo)
        .sort((a, b) => a - b),
      empty: candidates.length === 0,
    },
  };
}

/* ══════════════════════════════════════════════════ 화면 문구 */

export const PERIOD_SECTIONS: {
  key: keyof PeriodContent;
  label: string;
  hint: string;
  required: boolean;
  rows: number;
  limit: number;
}[] = [
  {
    key: "overview",
    label: "기간 요약",
    hint: "모은 주차 기록을 보고 직접 씁니다. 기록에 없는 내용을 넣지 않습니다.",
    required: true,
    rows: 8,
    limit: 3000,
  },
  {
    key: "family_message",
    label: "가정에 전하는 말",
    hint: "이 기간 동안 가정에서 함께 보면 좋은 점을 적습니다.",
    required: true,
    rows: 5,
    limit: 2000,
  },
  {
    key: "next_period_focus",
    label: "다음 기간에 함께 볼 점",
    hint: "선택 사항입니다. 비워 둘 수 있습니다.",
    required: false,
    rows: 3,
    limit: 500,
  },
];

/* ══════════════════════════════════════════════════ 기간 리포트 대기열 */

export type PeriodQueueStatus =
  | "none"
  | "drafting"
  | "complete"
  | "correcting"
  | "hidden";

export const PERIOD_QUEUE_STATUS_LABELS: Record<PeriodQueueStatus, string> = {
  none: "아직 없음",
  drafting: "작성 중",
  complete: "완료",
  correcting: "완료 · 수정본 작성 중",
  hidden: "숨김",
};

export interface PeriodQueueRow {
  childId: string;
  reportId: string | null;
  status: PeriodQueueStatus;
}

/**
 * 한 반 · 한 기간의 기간 리포트 상태.
 *
 * ★ 원아 목록은 호출하는 화면이 이미 갖고 있다 (주간 대기열). 이 함수는
 *   "그 원아에게 이 기간 리포트가 있는가"만 돌려준다. 이름을 다시 읽지 않는다.
 * ★ 모델이 없으면 `notInstalled` 로 알린다. 빈 목록 성공으로 감추지 않는다.
 */
export async function fetchPeriodQueue(
  supabase: SupabaseClient,
  assignmentId: string,
  kind: PeriodReportKind,
  key: { blockNo?: number; termKey?: string },
): Promise<{ ok: boolean; notInstalled: boolean; rows: PeriodQueueRow[] }> {
  if (!UUID_PATTERN.test(assignmentId)) {
    return { ok: false, notInstalled: false, rows: [] };
  }

  let query = supabase
    .from("reports")
    .select(
      "id, child_id, hidden_at, latest_completed_revision_id, " +
        "report_revisions!report_revisions_report_fk(id, status)",
    )
    .eq("class_program_assignment_id", assignmentId)
    .eq("report_type", kind)
    .limit(120);

  if (kind === "monthly") {
    if (typeof key.blockNo !== "number") return { ok: false, notInstalled: false, rows: [] };
    query = query.eq("block_no", key.blockNo);
  } else {
    if (typeof key.termKey !== "string") return { ok: false, notInstalled: false, rows: [] };
    query = query.eq("reporting_term_key", key.termKey);
  }

  const { data, error } = await query;

  if (error) {
    log("queue", error.code);
    return { ok: false, notInstalled: error.code === UNDEFINED_TABLE, rows: [] };
  }

  const rows: PeriodQueueRow[] = [];

  for (const row of (data ?? []) as {
    id: string;
    child_id: string;
    hidden_at: string | null;
    latest_completed_revision_id: string | null;
    report_revisions?: unknown;
  }[]) {
    const revisions = Array.isArray(row.report_revisions)
      ? (row.report_revisions as { id: string; status: string }[])
      : [];
    const hasDraft = revisions.some((r) => r.status === "draft");
    const hasCompleted = typeof row.latest_completed_revision_id === "string";

    const status: PeriodQueueStatus =
      row.hidden_at !== null
        ? "hidden"
        : hasCompleted && hasDraft
          ? "correcting"
          : hasCompleted
            ? "complete"
            : hasDraft
              ? "drafting"
              : "none";

    rows.push({ childId: row.child_id, reportId: row.id, status });
  }

  return { ok: true, notInstalled: false, rows };
}

/** 월간 블록 번호 목록 — 수업이 있는 주차에서 파생한다 (없는 블록을 만들지 않는다) */
export function blocksFromWeeks(weeks: readonly number[]): number[] {
  const blocks = new Set<number>();
  for (const week of weeks) {
    if (!Number.isInteger(week) || week < 1 || week > 52) continue;
    blocks.add(Math.floor((week - 1) / 4) + 1);
  }
  return [...blocks].sort((a, b) => a - b);
}
