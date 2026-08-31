import Link from "next/link";
import {
  CLASS_SESSION_STATUS_BADGE_CLASSES,
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
  isTerminalSessionStatus,
} from "@/lib/admin/class-session";
import type { StaffSessionItem } from "@/types/staff-session";
import { SessionActions } from "./SessionActions";

interface SessionCardProps {
  session: StaffSessionItem;
  /** 교사 화면은 자기 반만 보므로 반 이름을 줄일 수 있다 */
  showClassName?: boolean;
  /** 이력 화면에서는 상태 변경 버튼을 감춘다 */
  readOnly?: boolean;
  /** 출결 상세 route. 없으면 출결 버튼을 표시하지 않는다. */
  attendanceHref?: string;
  /**
   * 관찰기록 상세 route. 없으면 관찰기록 버튼을 표시하지 않는다.
   *
   * ★ 출결과 같은 규칙이다 — 링크를 만들어 주는 화면에서만 버튼이 생긴다.
   *   08B 기준으로 이 값을 넘기는 곳은 교사 화면 둘뿐이고,
   *   원장 화면은 넘기지 않으므로 버튼이 나타나지 않는다(08C 범위).
   */
  observationHref?: string;
}

/**
 * 스크린리더가 "관찰기록 링크"만 읽으면 어느 수업인지 알 수 없다.
 * 목록에 카드가 여러 개 있으므로 반·차시를 접근성 이름에 함께 넣는다.
 */
function sessionAriaName(session: StaffSessionItem): string {
  const parts = [session.className, session.lessonTitle].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(" · ") : "이 수업";
}

/**
 * 출결은 수업 상태와 별개 기능이라 상태별로 문구만 바꾼다.
 * completed는 SessionActions가 사라져도 출결 정정은 가능하고,
 * cancelled는 조회만 가능하다.
 */
function attendanceButtonLabel(status: StaffSessionItem["status"]): string {
  if (status === "completed") return "출결 확인·정정";
  if (status === "cancelled") return "출결 확인";

  return "출결 체크";
}

export function SessionStatusBadge({
  status,
}: {
  status: StaffSessionItem["status"];
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-bold ${CLASS_SESSION_STATUS_BADGE_CLASSES[status]}`}
    >
      {CLASS_SESSION_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 수업 한 건 카드.
 *
 * Admin 표(06B)와 달리 카드 형태인 이유
 *   교사는 태블릿·휴대폰을 들고 교실에서 쓴다. 표는 좁은 화면에서 읽기 어렵고
 *   터치 목표도 작다. 카드는 한 건씩 크게 보여 주고 CTA를 44px 이상으로 잡을 수 있다.
 *
 * 상태는 색만으로 구분하지 않는다 — 배지에 항상 한국어 텍스트를 함께 넣는다.
 */
export function SessionCard({
  session,
  showClassName = true,
  readOnly = false,
  attendanceHref,
  observationHref,
}: SessionCardProps) {
  const isTerminal = isTerminalSessionStatus(session.status);
  const showActions = !readOnly && !isTerminal;
  const hasDetailLinks = Boolean(attendanceHref || observationHref);

  return (
    <li className="rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showClassName ? (
            <p className="truncate text-[13px] font-bold text-navy">
              {session.className ?? "반 정보 없음"}
              {session.classStatus === "archived" ? (
                <span className="ml-1 text-[12px] font-normal text-navy/40">
                  (보관)
                </span>
              ) : null}
            </p>
          ) : null}

          <p className="mt-0.5 text-[12px] text-navy/50">
            {formatLessonOrder(session.weekNo, session.sessionNo)}
            {session.programTitle ? ` · ${session.programTitle}` : ""}
          </p>

          <p className="mt-1 break-words text-[16px] font-bold leading-snug text-navy">
            {session.lessonTitle ?? "차시 정보 없음"}
          </p>

          <p className="mt-1 text-[12px] text-navy/50">
            예정일 {formatSessionDate(session.scheduled_date)}
            {session.programCode ? ` · ${session.programCode}` : ""}
          </p>
        </div>

        <SessionStatusBadge status={session.status} />
      </div>

      {/*
        두 버튼은 각자 폭을 유지한 채 좁은 화면에서 줄바꿈된다(flex-wrap).
        나란히 늘려 반씩 나누지 않는 이유: 문구 길이가 달라
        좁은 화면에서 "출결 확인·정정"이 두 줄로 깨지기 때문이다.
      */}
      {hasDetailLinks ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-4">
          {attendanceHref ? (
            <Link
              href={attendanceHref}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-trust-blue/30 bg-white px-4 text-[14px] font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5"
            >
              {attendanceButtonLabel(session.status)}
            </Link>
          ) : null}

          {/*
            ★ 수업 상태와 무관하게 항상 같은 문구·같은 링크다.
              취소된 수업에도 그때 남긴 관찰기록이 있을 수 있어 조회 경로를 막지 않는다.
              쓰기 가능 여부는 관찰기록 화면·Server Action·RLS가 판정한다.
          */}
          {observationHref ? (
            <Link
              href={observationHref}
              aria-label={`${sessionAriaName(session)} 관찰기록`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
            >
              관찰기록
            </Link>
          ) : null}
        </div>
      ) : null}

      {showActions ? (
        <div
          className={
            hasDetailLinks ? "mt-3" : "mt-4 border-t border-navy/8 pt-4"
          }
        >
          <SessionActions session={session} />
        </div>
      ) : null}

      {readOnly && !isTerminal ? (
        <p className="mt-3 border-t border-navy/8 pt-3 text-[12px] text-navy/45">
          상태 변경은 오늘의 수업 화면에서 할 수 있습니다.
        </p>
      ) : null}
    </li>
  );
}
