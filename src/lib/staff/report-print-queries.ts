import type { SupabaseClient } from "@supabase/supabase-js";
import { weeksInBlock } from "./period-report-queries";

/**
 * 인쇄용 리포트 묶음 조회 — 사용자 지시 항목 1 (리포트 인쇄 · PDF 출력).
 *
 * ── 무엇을 인쇄하는가 ──────────────────────────────────────────────
 *
 * ★ **완료된 본문만** 인쇄한다. 작성 중 초안은 담지 않는다.
 *   초안을 종이에 내보내면 되돌릴 수 없다.
 *
 * ★ **숨긴 리포트는 담지 않는다.** 숨김은 학부모 노출 차단이고, 인쇄물은
 *   학부모에게 간다. 숨긴 것을 인쇄에서 빼지 않으면 숨김이 의미를 잃는다.
 *
 * ★ 사진은 담지 않는다.
 *   사진 공유 기준(CO-9 · CO-10)이 확정되지 않았고, 인쇄물은 회수할 수 없다.
 *   사진을 뺀 것은 누락이 아니라 결정이다 — 화면에 그대로 적는다.
 *
 * ── PDF ────────────────────────────────────────────────────────────
 *
 * ★ 서버에서 PDF 파일을 만들지 않는다. 그런 경로는 없다.
 *   브라우저 인쇄 대화상자의 "PDF로 저장"을 쓴다. 화면이 그렇게 안내한다.
 *   "PDF 내려받기" 버튼을 두고 실제로는 인쇄 창을 띄우는 일을 하지 않는다.
 *
 * ── 읽기 실패 ──────────────────────────────────────────────────────
 *
 * ★ 일부를 읽지 못하면 실패로 돌려준다. 빠진 아이를 조용히 지운 묶음을
 *   "반 전체"라고 인쇄하지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNDEFINED_TABLE = "42P01";

function log(scope: string, code: string | undefined) {
  console.error(`[reports/print] ${scope} failed:`, { code: code ?? null });
}

export type PrintSelector =
  | { kind: "weekly"; weekNo: number }
  | { kind: "monthly"; blockNo: number }
  | { kind: "semester"; termKey: string };

export interface PrintEvidenceLine {
  sessionDate: string | null;
  weekNo: number | null;
  lessonTitle: string | null;
  teacherNote: string | null;
  childVoice: string | null;
}

export interface PrintReportItem {
  reportId: string;
  revisionId: string;
  childId: string;
  childName: string | null;
  kind: "weekly" | "monthly" | "semester";
  /** 주간 주차 · 월간 블록 · 학기 키 중 하나 */
  weekNo: number | null;
  blockNo: number | null;
  termKey: string | null;
  completedAt: string | null;
  /** 템플릿 항목 → 본문. 비어 있는 항목은 담지 않는다 */
  sections: { label: string; body: string }[];
  evidence: PrintEvidenceLine[];
}

export interface PrintBundle {
  ok: boolean;
  notInstalled: boolean;
  className: string | null;
  items: PrintReportItem[];
  /** 완료된 리포트가 하나도 없다 */
  empty: boolean;
  /** 숨겨서 뺀 건수 — 숫자만 알린다 (사유 · 내용은 알리지 않는다) */
  hiddenExcluded: number;
}

const WEEKLY_LABELS: { key: string; label: string }[] = [
  { key: "topic", label: "이번 주 활동 주제" },
  { key: "quote_choice", label: "아이의 말과 선택" },
  { key: "teacher_observation", label: "교사 관찰 기록" },
  { key: "family_conversation", label: "가정에서 나눌 이야기" },
  { key: "next_week_preview", label: "다음 주 예고" },
];

const PERIOD_LABELS: { key: string; label: string }[] = [
  { key: "overview", label: "기간 요약" },
  { key: "family_message", label: "가정에 전하는 말" },
  { key: "next_period_focus", label: "다음 기간에 함께 볼 점" },
];

function toSections(
  kind: "weekly" | "monthly" | "semester",
  content: unknown,
): { label: string; body: string }[] {
  const row = (content ?? {}) as Record<string, unknown>;
  const labels = kind === "weekly" ? WEEKLY_LABELS : PERIOD_LABELS;
  const out: { label: string; body: string }[] = [];
  for (const { key, label } of labels) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") {
      out.push({ label, body: value });
    }
  }
  return out;
}

export const PRINT_PHOTO_NOTICE =
  "인쇄물에는 사진을 담지 않습니다. 사진은 기관 운영 기준에 따라 별도로 전달해 주세요.";

export const PRINT_PDF_NOTICE =
  "PDF로 저장하려면 인쇄 창에서 대상을 'PDF로 저장'으로 바꿔 주세요. 시스템이 PDF 파일을 따로 만들지는 않습니다.";

/**
 * 한 반 · 한 기간의 완료된 리포트를 모은다.
 *
 * @param assignmentId 반-프로그램 배정
 * @param selector     주간 주차 · 월간 블록 · 학기 키
 * @param classId      반 이름 표시용 (권한은 RLS 가 판정한다)
 */
export async function fetchClassPrintBundle(
  supabase: SupabaseClient,
  assignmentId: string,
  classId: string,
  selector: PrintSelector,
): Promise<PrintBundle> {
  const closed: PrintBundle = {
    ok: false,
    notInstalled: false,
    className: null,
    items: [],
    empty: true,
    hiddenExcluded: 0,
  };

  if (!UUID_PATTERN.test(assignmentId) || !UUID_PATTERN.test(classId)) return closed;

  let query = supabase
    .from("reports")
    .select(
      "id, child_id, report_type, week_no, block_no, reporting_term_key, " +
        "hidden_at, latest_completed_revision_id",
    )
    .eq("class_program_assignment_id", assignmentId)
    .eq("report_type", selector.kind)
    .limit(120);

  if (selector.kind === "weekly") query = query.eq("week_no", selector.weekNo);
  else if (selector.kind === "monthly") query = query.eq("block_no", selector.blockNo);
  else query = query.eq("reporting_term_key", selector.termKey);

  const [reportResult, classResult] = await Promise.all([
    query,
    supabase.from("classes").select("name").eq("id", classId).maybeSingle(),
  ]);

  if (reportResult.error) {
    log("reports", reportResult.error.code);
    return { ...closed, notInstalled: reportResult.error.code === UNDEFINED_TABLE };
  }
  if (classResult.error) {
    log("class", classResult.error.code);
    return closed;
  }

  const className = (classResult.data as { name?: string } | null)?.name ?? null;

  const rows = (reportResult.data ?? []) as {
    id: string;
    child_id: string;
    report_type: "weekly" | "monthly" | "semester";
    week_no: number | null;
    block_no: number | null;
    reporting_term_key: string | null;
    hidden_at: string | null;
    latest_completed_revision_id: string | null;
  }[];

  const hiddenExcluded = rows.filter((row) => row.hidden_at !== null).length;

  // ★ 숨김 제외 · 완료본만.
  const printable = rows.filter(
    (row) => row.hidden_at === null && typeof row.latest_completed_revision_id === "string",
  );

  if (printable.length === 0) {
    return {
      ok: true,
      notInstalled: false,
      className,
      items: [],
      empty: true,
      hiddenExcluded,
    };
  }

  const revisionIds = printable.map((row) => row.latest_completed_revision_id as string);
  const childIds = [...new Set(printable.map((row) => row.child_id))];

  const [revisionResult, childResult, evidenceResult] = await Promise.all([
    supabase
      .from("report_revisions")
      .select("id, content, completed_at")
      .in("id", revisionIds),
    supabase.from("children").select("id, name").in("id", childIds),
    supabase
      .from("report_revision_evidence")
      .select("revision_id, session_date, week_no, lesson_title, teacher_note_snapshot, child_voice_snapshot")
      .in("revision_id", revisionIds)
      .order("week_no", { ascending: true })
      .limit(600),
  ]);

  const firstError = [revisionResult, childResult, evidenceResult].find((r) => r.error);
  if (firstError?.error) {
    log("bundle", firstError.error.code);
    return { ...closed, className };
  }

  const revisionById = new Map(
    ((revisionResult.data ?? []) as { id: string; content: unknown; completed_at: string | null }[]).map(
      (row) => [row.id, row],
    ),
  );
  const childName = new Map(
    ((childResult.data ?? []) as { id: string; name: string | null }[]).map((row) => [
      row.id,
      row.name,
    ]),
  );

  const evidenceByRevision = new Map<string, PrintEvidenceLine[]>();
  for (const row of (evidenceResult.data ?? []) as {
    revision_id: string;
    session_date: string | null;
    week_no: number | null;
    lesson_title: string | null;
    teacher_note_snapshot: string | null;
    child_voice_snapshot: string | null;
  }[]) {
    const list = evidenceByRevision.get(row.revision_id) ?? [];
    list.push({
      sessionDate: row.session_date,
      weekNo: row.week_no,
      lessonTitle: row.lesson_title,
      teacherNote: row.teacher_note_snapshot,
      childVoice: row.child_voice_snapshot,
    });
    evidenceByRevision.set(row.revision_id, list);
  }

  const items: PrintReportItem[] = [];

  for (const row of printable) {
    const revisionId = row.latest_completed_revision_id as string;
    const revision = revisionById.get(revisionId);
    if (!revision) {
      // ★ 가리키는 완료본을 읽지 못했다. 그 아이를 빼고 "반 전체"라고 하지 않는다.
      log("revision missing", undefined);
      return { ...closed, className };
    }

    items.push({
      reportId: row.id,
      revisionId,
      childId: row.child_id,
      childName: childName.get(row.child_id) ?? null,
      kind: row.report_type,
      weekNo: row.week_no,
      blockNo: row.block_no,
      termKey: row.reporting_term_key,
      completedAt: revision.completed_at,
      sections: toSections(row.report_type, revision.content),
      evidence: evidenceByRevision.get(revisionId) ?? [],
    });
  }

  items.sort((a, b) => (a.childName ?? "").localeCompare(b.childName ?? "", "ko"));

  return {
    ok: true,
    notInstalled: false,
    className,
    items,
    empty: items.length === 0,
    hiddenExcluded,
  };
}

/** 인쇄 묶음 제목 */
export function printBundleTitle(selector: PrintSelector): string {
  if (selector.kind === "weekly") return `${selector.weekNo}주 주간 리포트`;
  if (selector.kind === "monthly") {
    const weeks = weeksInBlock(selector.blockNo);
    return `${selector.blockNo}번째 4주 월간 요약 (${weeks[0]}~${weeks[weeks.length - 1]}주)`;
  }
  return `${selector.termKey} 학기 리포트`;
}
