import type { ClassSessionStatus } from "@/types/class-session";

/**
 * 운영 화면이 공유하는 "기록 확인 대상" 규칙.
 *
 * SERVICE-12(원장 운영 대시보드)와 SERVICE-14(본사 운영 콘솔)가 같은 숫자를
 * 말해야 하므로 판정 규칙을 여기 한 곳에만 둔다. 두 화면이 각자 조건을 들고
 * 있으면 언젠가 한쪽만 바뀌고, 같은 수업이 화면에 따라 다르게 보인다.
 *
 * ★ 이것은 평가가 아니다.
 *   "기록이 있는가 없는가"라는 사실만 본다. 점수 · 등급 · 위험도를 만들지 않고,
 *   기록이 없는 것을 "누락"이나 "문제"라고 단정하지도 않는다.
 *   화면 문구도 "출결 기록 없음" · "관찰 기록 없음"까지만 쓴다.
 */

/**
 * 판정에 필요한 최소 모양.
 *
 * 두 화면이 다루는 행 타입이 다르므로(StaffSessionItem / 관리자 집계용 원본 행)
 * 공통 규칙은 필요한 두 컬럼만 요구한다.
 */
export interface SessionRecordTarget {
  /** date 컬럼. "YYYY-MM-DD" 문자열 그대로 비교한다(시간대 변환 없음). */
  scheduled_date: string | null;
  status: ClassSessionStatus;
}

/**
 * 출결 기록을 확인할 대상 수업인가.
 *
 *   scheduled_date is not null : 언제 있었는지 알 수 없는 수업은 세지 않는다
 *   scheduled_date <= today    : ★ 아직 오지 않은 수업을 "기록 없음"으로 잡지 않는다
 *   status <> 'cancelled'      : 취소된 수업에는 기록을 요구하지 않는다
 *
 * 예정 · 진행 중 · 완료를 모두 포함한다 — 출결은 수업 전후로 남기는 기록이라
 * 완료 처리 여부와 무관하게 확인할 수 있어야 한다.
 */
export function isAttendanceRecordTarget(
  session: SessionRecordTarget,
  today: string,
): boolean {
  if (session.scheduled_date === null) return false;
  if (session.scheduled_date > today) return false;

  return session.status !== "cancelled";
}

/**
 * 관찰 기록을 확인할 대상 수업인가.
 *
 * 출결 조건에 더해 **완료된 수업만** 본다.
 * 예정일이 지났어도 status 가 'scheduled' 인 수업은 "아직 완료 처리되지 않은
 * 수업"이지 "관찰을 안 쓴 수업"이 아니다. 그런 수업까지 넣으면 수업이 실제로
 * 열렸는지도 모르면서 기록을 요구하는 셈이 된다.
 *
 * ★ 관찰기록은 이 서비스에서 의무가 아니다.
 *   완료 수업에 반드시 있어야 한다는 규칙이 어디에도 없으므로,
 *   여기서 고르는 것은 "확인해 볼 수업"이지 "잘못된 수업"이 아니다.
 */
export function isObservationRecordTarget(
  session: SessionRecordTarget,
  today: string,
): boolean {
  return (
    isAttendanceRecordTarget(session, today) && session.status === "completed"
  );
}
