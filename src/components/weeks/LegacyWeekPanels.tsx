import Link from "next/link";
import type { PublishedLegacyLesson } from "@/lib/weeks/week-db-source";
import type { WeekSessionResult } from "@/lib/weeks/week-session-queries";
import { learningOperations } from "@/lib/learning/program-entry";
import { legacyPanelRows, legacySectionInitiallyOpen, legacySectionTitle } from "@/lib/weeks/legacy-week-layout";
import { WeekTabs, type WeekTabKey } from "./WeekTabs";

/** Read the entitled, published legacy version; do not invent structured content or scenes. */
export function LegacyWeekPanels({ lesson, sessions, role, organizationId, weekPath, backPath, active }: {
  lesson: PublishedLegacyLesson; sessions: WeekSessionResult; role: "teacher" | "director";
  organizationId: string; weekPath: string; backPath: string; active: WeekTabKey;
}) {
  const orgQuery = `org=${encodeURIComponent(organizationId)}`;
  const operation = learningOperations(role, organizationId);
  const visible = legacyPanelRows(lesson.sections, active);
  const button = "inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-white px-4 text-[14px] font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2";
  return <>
    <Link href={`${backPath}?${orgQuery}`} className="inline-flex min-h-11 items-center font-semibold text-secondary-strong underline">← 프로그램 수업 지도</Link>
    <p className="mt-3 text-[13px] text-ink-muted">기존 발행 교안 · STARTER 2026.1</p>
    <h1 className="mt-2 text-[28px] font-bold text-navy">{lesson.version.weekNo}주차 · {lesson.title}</h1>
    <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">먼저 퀵 가이드와 준비물을 확인하세요. 아래에서 우리 반 수업을 선택하면 준비·수업·관찰을 이어갈 수 있습니다.</p>
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
    <nav aria-label="이 탭의 교안 목차" className="mt-5 rounded-xl border border-line bg-white p-5">
      <h2 className="text-[16px] font-bold text-navy">필요한 내용 바로 찾기</h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{visible.map(row => <li key={row.code}>
        <a href={`#legacy-${row.code}`} className="inline-flex min-h-11 items-center text-[16px] font-semibold text-secondary-strong underline">{legacySectionTitle(row.code)}</a>
      </li>)}</ul>
      <p className="mt-2 text-[14px] text-ink-muted">제목을 누르면 본문을 펼치거나 접을 수 있습니다. 전체 내용은 수업 가이드 탭에서 볼 수 있습니다.</p>
    </nav>
    <div className="mt-5 space-y-4">{visible.map((row) => <details key={`${active}-${row.code}`} id={`legacy-${row.code}`}
      open={legacySectionInitiallyOpen(active, row.code)} className="scroll-mt-40 rounded-xl border border-line bg-white p-5 sm:p-6">
      <summary className="min-h-11 cursor-pointer text-[18px] font-bold text-navy focus-visible:outline-2 focus-visible:outline-offset-2">{legacySectionTitle(row.code)}</summary>
      <p className="mt-3 whitespace-pre-wrap break-words text-[16px] leading-8 text-navy">{row.body || "이 항목에는 등록된 본문이 없습니다."}</p>
    </details>)}</div>
  </>;
}
