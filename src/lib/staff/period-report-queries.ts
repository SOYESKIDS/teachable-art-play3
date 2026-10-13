import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 월간 · 학기 리포트 조회 — 실행 묶음 C2.
 *
 * ── 기존 모델을 그대로 쓴다 ──────────────────────────────────────────
 *
 * `public.reports` 는 이미 `report_type in ('weekly','monthly','semester')` 를 갖고,
 * 월간은 `block_no`, 학기는 `reporting_term_key` 로 기간을 구분한다
 * (20261001093000_m1_report_portal_foundation.sql). 새 테이블을 만들지 않는다.
 *
 * ── 이 모듈이 하는 것 ───────────────────────────────────────────────
 *
 * 월간 · 학기 리포트는 **같은 원아의 승인된 주간 기록을 모아** 구성한다.
 * 그래서 이 모듈은 두 가지를 읽는다.
 *
 *   1. 그 기간의 완료된 주간 revision (= 모을 재료)
 *   2. 이미 만들어진 월간 · 학기 리포트 (= 모은 결과)
 *
 * ── 하지 않는 것 ───────────────────────────────────────────────────
 *
 * ★ 없는 관찰·발화·사진을 만들지 않는다.
 *   재료가 없으면 빈 상태를 돌려준다. 화면이 그것을 안내한다.
 *
 * ★ 평균·성장률·서열을 계산하지 않는다.
 *   주간 기록을 모으는 것은 "이어 붙이기"이고 "점수화"가 아니다.
 *
 * ★ 원문이 바뀌면 조용히 교체하지 않는다.
 *   모은 뒤에 주간 기록이 정정되면 `staleWeeks` 로 알린다. 월간·학기 본문을
 *   자동으로 다시 쓰지 않는다 — 교사가 보고 결정한다.
 *
 * ★ 읽기 실패를 빈 결과 성공으로 감추지 않는다.
 */

export type PeriodReportKind = "monthly" | "semester";

/** 월간은 4주 블록, 학기는 term key 로 기간을 가리킨다 */
export type PeriodKey =
  | { kind: "monthly"; blockNo: number }
  | { kind: "semester"; termKey: string };

export interface WeeklySourceRevision {
  reportId: string;
  revisionId: string;
  weekNo: number;
  revisionNo: number;
  completedAt: string | null;
  /** 리포트가 숨김 상태인가 (숨김은 모으지 않는다) */
  hidden: boolean;
  /** 모은 뒤에 새 정정 revision 이 생겼는가 */
  supersededAfterCollect: boolean;
}

export interface PeriodReportSummary {
  reportId: string | null;
  kind: PeriodReportKind;
  /** 이미 완료된 본문이 있는가 */
  hasCompletedRevision: boolean;
  completedAt: string | null;
  hidden: boolean;
}

export interface PeriodReportData {
  ok: boolean;
  /** 모델이 없다 (migration 미적용) */
  notInstalled: boolean;
  summary: PeriodReportSummary;
  /** 이 기간에 모을 수 있는 완료된 주간 기록 */
  sources: WeeklySourceRevision[];
  /** 모은 뒤에 원문이 바뀐 주차. 비어 있지 않으면 재검토가 필요하다 */
  staleWeeks: number[];
  /** 재료가 하나도 없다 */
  empty: boolean;
}

const UNDEFINED_TABLE = "42P01";

const EMPTY_SUMMARY = (kind: PeriodReportKind): PeriodReportSummary => ({
  reportId: null,
  kind,
  hasCompletedRevision: false,
  completedAt: null,
  hidden: false,
});

/**
 * 월간 블록이 덮는 주차.
 *
 * 월간은 4주 단위다 (`block_no` 1 → 1~4주). 계약 주차 시작점은 반마다 다를 수
 * 있지만, `reports.week_no` 는 프로그램 주차이므로 블록 계산도 프로그램 주차로 한다.
 */
export function weeksInBlock(blockNo: number): number[] {
  const first = (blockNo - 1) * 4 + 1;
  return [first, first + 1, first + 2, first + 3];
}

function periodFilter(key: PeriodKey): { column: string; value: number | string } {
  return key.kind === "monthly"
    ? { column: "block_no", value: key.blockNo }
    : { column: "reporting_term_key", value: key.termKey };
}

/**
 * 한 원아의 월간 · 학기 리포트와 그 재료를 읽는다.
 *
 * @param childId          대상 원아
 * @param assignmentId     반-프로그램 배정. 주차 번호의 기준이다
 * @param key              월간 블록 또는 학기 term
 * @param semesterWeekRange 학기일 때 모을 주차 범위. 월간은 블록에서 파생한다
 */
export async function fetchPeriodReport(
  supabase: SupabaseClient,
  childId: string,
  assignmentId: string,
  key: PeriodKey,
  semesterWeekRange?: { from: number; to: number },
): Promise<PeriodReportData> {
  const kind = key.kind;
  const filter = periodFilter(key);

  // 1) 이미 만들어진 기간 리포트
  const existing = await supabase
    .from("reports")
    .select("id, hidden_at, latest_completed_revision_id")
    .eq("child_id", childId)
    .eq("class_program_assignment_id", assignmentId)
    .eq("report_type", kind)
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    const notInstalled = existing.error.code === UNDEFINED_TABLE;
    console.error("[reports/period] existing read failed:", {
      code: existing.error.code ?? null,
    });
    return {
      ok: false,
      notInstalled,
      summary: EMPTY_SUMMARY(kind),
      sources: [],
      staleWeeks: [],
      empty: true,
    };
  }

  // 2) 모을 재료 — 그 기간의 완료된 주간 revision
  const weeks =
    kind === "monthly"
      ? weeksInBlock(key.blockNo)
      : semesterWeekRange
        ? Array.from(
            { length: Math.max(0, semesterWeekRange.to - semesterWeekRange.from + 1) },
            (_, i) => semesterWeekRange.from + i,
          )
        : [];

  if (weeks.length === 0) {
    return {
      ok: true,
      notInstalled: false,
      summary: toSummary(kind, existing.data),
      sources: [],
      staleWeeks: [],
      empty: true,
    };
  }

  const weekly = await supabase
    .from("reports")
    // ★ 한 줄 문자열 리터럴로 둔다.
    //   `"a, " + "b"` 로 쓰면 타입이 string 으로 넓어져 PostgREST 의 select 파서가
    //   열을 읽지 못하고 GenericStringError 를 돌려준다. 그러면 아래 행 접근이
    //   전부 타입 오류가 된다.
    .select("id, week_no, hidden_at, latest_completed_revision_id, report_revisions!report_revisions_report_fk(id, revision_no, status, completed_at)")
    .eq("child_id", childId)
    .eq("class_program_assignment_id", assignmentId)
    .eq("report_type", "weekly")
    .in("week_no", weeks);

  if (weekly.error) {
    console.error("[reports/period] weekly read failed:", {
      code: weekly.error.code ?? null,
    });
    return {
      ok: false,
      notInstalled: weekly.error.code === UNDEFINED_TABLE,
      summary: toSummary(kind, existing.data),
      sources: [],
      staleWeeks: [],
      empty: true,
    };
  }

  const sources: WeeklySourceRevision[] = [];
  const stale: number[] = [];

  for (const row of weekly.data ?? []) {
    const weekNo = typeof row.week_no === "number" ? row.week_no : null;
    if (weekNo === null) continue;

    const hidden = row.hidden_at !== null;
    const latestCompleted =
      typeof row.latest_completed_revision_id === "string"
        ? row.latest_completed_revision_id
        : null;

    // 숨김 리포트는 모으지 않는다.
    if (hidden || latestCompleted === null) continue;

    const revisions = Array.isArray(row.report_revisions) ? row.report_revisions : [];
    const completed = revisions
      .filter((r) => r.status === "complete")
      .sort((a, b) => Number(b.revision_no) - Number(a.revision_no));

    const newest = completed[0];
    if (!newest) continue;

    // 포인터가 가리키는 revision 보다 더 새 완료본이 있으면 원문이 바뀐 것이다.
    const superseded = String(newest.id) !== latestCompleted;
    if (superseded) stale.push(weekNo);

    sources.push({
      reportId: String(row.id),
      revisionId: latestCompleted,
      weekNo,
      revisionNo: Number(newest.revision_no),
      completedAt:
        typeof newest.completed_at === "string" ? newest.completed_at : null,
      hidden: false,
      supersededAfterCollect: superseded,
    });
  }

  sources.sort((a, b) => a.weekNo - b.weekNo);

  return {
    ok: true,
    notInstalled: false,
    summary: toSummary(kind, existing.data),
    sources,
    staleWeeks: [...new Set(stale)].sort((a, b) => a - b),
    empty: sources.length === 0,
  };
}

function toSummary(
  kind: PeriodReportKind,
  row: { id?: unknown; hidden_at?: unknown; latest_completed_revision_id?: unknown } | null,
): PeriodReportSummary {
  if (!row || typeof row.id !== "string") return EMPTY_SUMMARY(kind);

  return {
    reportId: row.id,
    kind,
    hasCompletedRevision:
      typeof row.latest_completed_revision_id === "string" &&
      row.latest_completed_revision_id !== "",
    completedAt: null,
    hidden: row.hidden_at !== null && row.hidden_at !== undefined,
  };
}

/* ══════════════════════════════════════════════════ 화면 문구 */

export const PERIOD_REPORT_LABEL: Record<PeriodReportKind, string> = {
  monthly: "월간 요약",
  semester: "학기 포트폴리오",
};

export const PERIOD_EMPTY_NOTICE: Record<PeriodReportKind, string> = {
  monthly:
    "이 기간에 완료된 주간 기록이 없습니다. 주간 기록이 쌓이면 월간 요약을 만들 수 있습니다.",
  semester:
    "이 학기에 완료된 주간 기록이 없습니다. 주간 기록이 쌓이면 학기 포트폴리오를 만들 수 있습니다.",
};

export const PERIOD_STALE_NOTICE =
  "모은 뒤에 주차 기록이 정정되었습니다. 내용을 확인하고 다시 구성해 주세요. 기존 본문은 자동으로 바뀌지 않습니다.";
