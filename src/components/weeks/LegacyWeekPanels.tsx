import Link from "next/link";
import type { PublishedLegacyLesson } from "@/lib/weeks/week-db-source";
import type { WeekSessionResult } from "@/lib/weeks/week-session-queries";
import { LESSON_SECTION_CODES } from "@/lib/curriculum/lesson-sections";
import { learningOperations } from "@/lib/learning/program-entry";
import { WeekTabs, type WeekTabKey } from "./WeekTabs";

/** Read the entitled, published legacy version; do not invent structured content or scenes. */
export function LegacyWeekPanels({ lesson, sessions, role, organizationId, weekPath, backPath, active }: {
  lesson: PublishedLegacyLesson; sessions: WeekSessionResult; role: "teacher" | "director";
  organizationId: string; weekPath: string; backPath: string; active: WeekTabKey;
}) {
  const orgQuery = `org=${encodeURIComponent(organizationId)}`;
  const operation = learningOperations(role, organizationId);
  const codes: Partial<Record<WeekTabKey, readonly string[]>> = {
    prep: ["s1", "s2", "s3", "s4a", "s4b", "s4c", "s15"],
    class: ["s5", "s6", "s7", "s8", "s9", "s10", "s11"],
    observe: ["s12", "s14"], report: ["s12", "s13"],
  };
  const rows = [...lesson.sections].sort((a, b) =>
    LESSON_SECTION_CODES.findIndex((code) => code === a.code) - LESSON_SECTION_CODES.findIndex((code) => code === b.code));
  const visible = active === "guide" ? rows : rows.filter((row) => codes[active]?.includes(row.code));
  const button = "inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-white px-4 text-[14px] font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2";
  return <>
    <Link href={`${backPath}?${orgQuery}`} className="inline-flex min-h-11 items-center font-semibold text-secondary-strong underline">← 프로그램 수업 지도</Link>
    <p className="mt-3 text-[13px] text-ink-muted">기존 발행 교안 · STARTER 2026.1</p>
    <h1 className="mt-2 text-[28px] font-bold text-navy">{lesson.version.weekNo}주차 · {lesson.title}</h1>
    <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">이용권에 연결된 발행 교안을 원문 그대로 제공합니다. 반과 날짜가 정해진 수업 회차를 선택해 준비·수업·관찰을 이어가세요.</p>
    <section className="mt-6 rounded-xl border border-line bg-white p-5" aria-labelledby="legacy-sessions">
      <h2 id="legacy-sessions" className="font-bold text-navy">이 주차의 수업 회차</h2>
      {!sessions.ok ? <p className="mt-3 text-danger">수업 회차를 불러오지 못했습니다. 다시 시도해 주세요.</p>
        : sessions.sessions.length === 0 ? <p className="mt-3 text-ink-muted">아직 배정된 수업 회차가 없습니다. 기관 관리자가 일정을 등록하면 여기에 표시됩니다.</p>
        : <ul className="mt-3 divide-y divide-line-soft">{sessions.sessions.map((session) => <li key={session.sessionId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-semibold text-navy">{session.className ?? "반 이름 없음"}</p><p className="text-[13px] text-ink-muted">{session.scheduledDate ?? "날짜 미정"} · {{ scheduled: "예정", in_progress: "진행 중", completed: "완료", cancelled: "취소" }[session.status]}</p></div>
          <div className="flex flex-wrap gap-2">
            {role === "teacher" && (session.status === "scheduled" || session.status === "in_progress") ? <Link className={button} href={`/teacher/sessions/${session.sessionId}/${session.status === "scheduled" ? "before" : "during"}?${orgQuery}`}>{session.status === "scheduled" ? "수업 준비" : "수업 이어하기"}</Link> : null}
            {session.status === "completed" ? <Link className={button} href={`/${role}/sessions/${session.sessionId}/observations?${orgQuery}`}>관찰 기록</Link> : null}
          </div>
        </li>)}</ul>}
      <div className="mt-3 flex flex-wrap gap-2"><Link className={button} href={operation.href}>{operation.label}</Link><Link className={button} href={operation.reportHref}>결과보고 보기</Link></div>
    </section>
    <WeekTabs weekNo={lesson.version.weekNo} active={active} orgQuery={orgQuery} pageHref={weekPath} />
    <div className="mt-5 space-y-4">{visible.map((row) => <section key={row.code} className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-bold text-navy">원문 {row.code.slice(1).replace("a", "-A").replace("b", "-B").replace("c", "-C")}번 항목</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-8 text-navy">{row.body || "이 항목에는 등록된 본문이 없습니다."}</p>
    </section>)}</div>
  </>;
}
