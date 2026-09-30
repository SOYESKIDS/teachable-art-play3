/**
 * "8주 기록 모아보기" 순수 계산 (DEC-069 · DEC-104) — import 없음 · DB · 네트워크 없음.
 * program-summary-queries.ts 가 쓰고, supabase/validation/phase10d 수락 테스트가 직접 검사한다.
 *
 * 8주 구간 (PHASE 10D):
 * · 기준 Weekly 가 현재 계약 week 범위 안이면: 계약 시작 주부터 8주 단위로 나눈 구간 · 끝은 계약 끝 주를 넘지 않는다
 *   (STARTER 1~8 = 항상 W1~W8)
 * · 계약 정보가 없거나 기준 Weekly 가 계약 범위 밖이면: 1주차부터 8주 단위로 나눈 구간 중 기준 주가 속한 구간을 보여 주되
 *   inContract = false 로 알린다 (화면이 "현재 계약 주차 범위 밖" 안내를 표시 · 조용히 섞지 않는다)
 * · 기준 주는 언제나 구간 안에 있다
 *
 * 주 행: 구간의 모든 주를 한 행씩 만든다. 완료 Weekly 가 없는 주는 report = null (내용을 만들지 않는다 · 사유 구분 없음).
 * 표시 값은 교사가 완료한 Weekly 의 topic · quote_choice 뿐이다 (Growth5 · 점수 · 순위 · 진단 값 없음).
 */

export const SUMMARY_WEEKS = 8;

export interface SummaryWindow {
  from: number;
  to: number;
  inContract: boolean;
}

export interface ProgramSummaryWeek {
  weekNo: number;
  dateFrom: string | null;
  dateTo: string | null;
  report: {
    id: string;
    topic: string | null;
    quoteChoice: string | null;
    hidden: boolean;
    revised: boolean;
    photoUrl: string | null;
  } | null;
}

const isWeek = (value: number | null): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1;

export function summaryWindow(anchorWeek: number, contractFrom: number | null, contractTo: number | null): SummaryWindow {
  const anchor = isWeek(anchorWeek) ? anchorWeek : 1;
  if (isWeek(contractFrom) && isWeek(contractTo) && contractFrom <= contractTo && anchor >= contractFrom && anchor <= contractTo) {
    const from = contractFrom + Math.floor((anchor - contractFrom) / SUMMARY_WEEKS) * SUMMARY_WEEKS;
    return { from, to: Math.min(from + SUMMARY_WEEKS - 1, contractTo), inContract: true };
  }
  const from = 1 + Math.floor((anchor - 1) / SUMMARY_WEEKS) * SUMMARY_WEEKS;
  return { from, to: from + SUMMARY_WEEKS - 1, inContract: false };
}

export function pickText(content: unknown, key: string): string | null {
  const row = (content ?? {}) as Record<string, unknown>;
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export interface SummaryReportRow {
  id: string;
  week_no: number;
  hidden_at: string | null;
  latest_completed_revision_id: string;
}

export interface SummarySessionRow {
  week_no: number | null;
  scheduled_date: string | null;
}

/** 구간의 주 행을 만든다. 구간 밖 · 완료본 없는 행은 쓰지 않는다. */
export function buildSummaryWeeks(input: {
  window: Pick<SummaryWindow, "from" | "to">;
  reports: SummaryReportRow[];
  revisions: Map<string, { content: unknown; revision_no: number }>;
  photos: Map<string, string>;
  sessions: SummarySessionRow[];
}): ProgramSummaryWeek[] {
  const { from, to } = input.window;
  const inWindow = (week: number | null): week is number => week !== null && week >= from && week <= to;

  const dates = new Map<number, { from: string; to: string }>();
  for (const row of input.sessions) {
    if (!inWindow(row.week_no) || !row.scheduled_date) continue;
    const current = dates.get(row.week_no);
    if (!current) dates.set(row.week_no, { from: row.scheduled_date, to: row.scheduled_date });
    else {
      if (row.scheduled_date < current.from) current.from = row.scheduled_date;
      if (row.scheduled_date > current.to) current.to = row.scheduled_date;
    }
  }

  const reportByWeek = new Map(input.reports.filter((row) => inWindow(row.week_no)).map((row) => [row.week_no, row]));
  const weeks: ProgramSummaryWeek[] = [];
  for (let week = from; week <= to; week += 1) {
    const row = reportByWeek.get(week);
    const revision = row ? input.revisions.get(row.latest_completed_revision_id) : undefined;
    weeks.push({
      weekNo: week,
      dateFrom: dates.get(week)?.from ?? null,
      dateTo: dates.get(week)?.to ?? null,
      report:
        row && revision
          ? {
              id: row.id,
              topic: pickText(revision.content, "topic"),
              quoteChoice: pickText(revision.content, "quote_choice"),
              hidden: row.hidden_at !== null,
              revised: revision.revision_no > 1,
              photoUrl: input.photos.get(row.latest_completed_revision_id) ?? null,
            }
          : null,
    });
  }
  return weeks;
}
