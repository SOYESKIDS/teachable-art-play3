import Link from "next/link";
import { formatSessionDate } from "@/lib/admin/class-session";
import { teacherPrioritySession, teacherSessionLinks } from "@/lib/staff/session-navigation";
import type { TodaySessionBoard } from "@/types/staff-session";

export function TeacherNextSession({ board }: { board: TodaySessionBoard }) {
  const session = teacherPrioritySession(board);
  if (!session) return null;
  const action = teacherSessionLinks(session).preparation;
  if (!action) return null;
  const ongoing = session.status === "in_progress";
  const past = session.scheduled_date !== null && session.scheduled_date < board.today;

  return <section aria-labelledby="next-session-heading" className="mb-5 rounded-2xl border border-secondary-strong/30 bg-secondary-soft p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-secondary-strong">{ongoing ? "마무리하지 않은 수업이 있습니다" : past ? "지난 일정의 수업을 준비할 수 있습니다" : "우리 반 수업을 준비하세요"}</p>
        <h2 id="next-session-heading" className="mt-2 text-[20px] font-bold text-navy">
          {session.weekNo ? `${session.weekNo}주차 · ` : ""}{session.lessonTitle ?? "배정된 수업"}
        </h2>
        <p className="mt-1 text-[15px] text-ink-muted">{session.className ?? "담당 반"} · 예정일 {formatSessionDate(session.scheduled_date)}</p>
      </div>
      <Link href={action.href} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-navy px-6 text-[16px] font-bold text-white sm:w-auto">
        {action.label} 열기 →
      </Link>
    </div>
    <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
      {past ? "예정일은 그대로 표시합니다. " : ""}{ongoing ? "진행 중인 수업 화면으로 돌아갑니다." : "준비 화면에서 확인한 뒤 수업을 시작합니다. 이 버튼만으로 수업이 시작되지는 않습니다."}
    </p>
  </section>;
}
