import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import {
  fetchTodayBoard,
  todayInSeoul,
} from "@/lib/staff/class-session-queries";
import { fetchClassModeData } from "@/lib/staff/class-mode-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { isTerminalSessionStatus } from "@/lib/admin/class-session";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { TodaySessionBoardView } from "@/components/staff/TodaySessionBoard";
import {
  TodayFocusPanel,
  buildTodayFocusPreview,
  type TodayFocusPreview,
} from "@/components/staff/TodayFocusPanel";
import { EmptyState } from "@/components/ui/surface";
import { appButtonSecondary } from "@/components/ui/app-button";
import type { StaffSessionItem, TodaySessionBoard } from "@/types/staff-session";
import { TEACHER_NAV } from "./nav";

export const metadata: Metadata = {
  title: "오늘의 수업 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatToday(today: string): string {
  const [year, month, day] = today.split("-");
  return `${year}.${month}.${day}`;
}

/**
 * 오늘 먼저 볼 수업 한 건.
 *
 * 오늘 수업 중 아직 끝나지 않은 첫 수업 → 다른 날 진행 중 → 지난 예정 → 오늘 첫 수업 순.
 * 보드가 이미 정한 순서를 그대로 따른다 (새 정렬 기준을 만들지 않는다).
 */
function pickFocusSession(
  board: TodaySessionBoard,
): { session: StaffSessionItem; isToday: boolean } | null {
  const openToday = board.todaySessions.find(
    (session) => !isTerminalSessionStatus(session.status),
  );
  if (openToday) return { session: openToday, isToday: true };

  const earlier = board.ongoingFromOtherDays[0] ?? board.overdueSessions[0];
  if (earlier) return { session: earlier, isToday: false };

  const firstToday = board.todaySessions[0];
  return firstToday ? { session: firstToday, isToday: true } : null;
}

/**
 * 교사 — 오늘의 수업.
 *
 * 로그인 후 첫 화면이다. "지금 무엇을 해야 하는가"만 보이게 한다.
 * 읽는 순서: 오늘 먼저 할 수업(상태 · 다음 행동) → 오늘 숫자(진행) → 수업 카드 · 이전 날짜 수업.
 * Admin의 관리 표와 달리 카드 + 큰 버튼 중심이다 — 교실에서 태블릿으로 쓴다.
 *
 * 볼 수 있는 범위는 코드가 아니라 RLS가 정한다.
 * organization_id로만 좁혀 질의하면 교사에게는 자기가 배정된 반의 수업만 돌아온다.
 */
export default async function TeacherTodayPage({
  searchParams,
}: TeacherPageProps) {
  // 로그인 + 활성 teacher membership + 활성 기관까지 DB가 판정한다.
  const { supabase, email, memberships, userId } = await requireTeacher();

  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/teacher"
        roleLabel="교사"
      />
    );
  }

  const today = todayInSeoul();
  const result = await fetchTodayBoard(
    supabase,
    membership.organizationId,
    today,
  );

  const board: TodaySessionBoard = result.ok
    ? result.board
    : {
        today,
        summary: {
          scheduledToday: 0,
          inProgress: 0,
          completedToday: 0,
          cancelledToday: 0,
        },
        todaySessions: [],
        ongoingFromOtherDays: [],
        overdueSessions: [],
        undatedSessions: [],
      };

  // 담당 반이 아예 없으면 "수업이 없다"가 아니라 "담당 반이 없다"고 알려야 한다.
  const hasNoSession =
    result.ok &&
    board.todaySessions.length === 0 &&
    board.ongoingFromOtherDays.length === 0 &&
    board.overdueSessions.length === 0 &&
    board.undatedSessions.length === 0;

  const focus = result.ok ? pickFocusSession(board) : null;

  // ★ 미리보기는 실패해도 화면을 막지 않는다 — 패널은 미리보기 없이 그린다.
  //   원아 이름 · 사진 공유 정보는 받더라도 여기서 쓰지 않는다.
  let preview: TodayFocusPreview | null = null;
  if (focus) {
    try {
      const classMode = await fetchClassModeData(
        supabase,
        membership.organizationId,
        focus.session.id,
        userId,
      );
      if (classMode.ok) {
        preview = buildTodayFocusPreview(classMode.data.sections);
      }
    } catch {
      preview = null;
    }
  }

  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-headline font-bold text-navy">
          오늘의 수업
        </h1>
        <p className="text-label font-medium tabular-nums text-ink-muted">
          {formatToday(today)}
        </p>
      </div>

      {focus ? (
        <div className="mt-5">
          <TodayFocusPanel
            session={focus.session}
            preview={preview}
            isToday={focus.isToday}
          />
        </div>
      ) : null}

      <div id="today-sessions" className="mt-6 scroll-mt-24">
        {hasNoSession ? (
          <EmptyState
            text="담당 반에 등록된 수업이 아직 없습니다."
            hint="반 배정과 수업 일정은 기관 관리자가 등록합니다. 일정이 등록되면 이 화면에 오늘 할 수업이 바로 나타납니다. 지난 수업은 수업 이력에서 볼 수 있습니다."
            action={
              <Link
                href={`/teacher/history${orgQuery}`}
                className={appButtonSecondary}
              >
                수업 이력 보기
              </Link>
            }
          />
        ) : (
          <TodaySessionBoardView
            board={board}
            showClassName
            hasError={!result.ok}
            attendanceBasePath="/teacher/sessions"
            observationBasePath="/teacher/sessions"
            actorRole="teacher"
            classModeBasePath="/teacher/sessions"
          />
        )}
      </div>
    </StaffShell>
  );
}
