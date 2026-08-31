import type { ChildStatus, ClassStatus } from "./class-child";
import type { ClassSessionStatus } from "./class-session";

/**
 * SERVICE-08B — 교사 관찰기록 화면 타입.
 *
 * 08A migration 4개와 1:1로 맞춘다.
 *   20260831093000 observation_domains
 *   20260831094000 class_session_observations / class_session_observation_domains
 *   20260831095000 children SELECT Policy 확장 (historical 이름 조회)
 *   20260831100000 save_class_session_observation_atomic RPC
 *
 * ★ 이 시스템은 아동을 평가·진단하지 않는다.
 *   score / grade / level / risk / development_stage 같은 필드를 두지 않는다.
 *   DB에 그런 컬럼이 없고, 화면 타입에도 만들지 않는다.
 *   교사가 남기는 값은 서술 텍스트 둘(child_voice / teacher_note)과
 *   관찰영역 태그뿐이다.
 */

/**
 * public.class_session_observations.record_status
 *
 * complete는 "잠금"이 아니다. completed 수업의 기록도 나중에 정정할 수 있다
 * (20260831094000 — 전이 규칙 trigger를 만들지 않은 이유).
 */
export type ObservationRecordStatus = "draft" | "complete";

/**
 * public.observation_domains 대응 타입.
 *
 * code   : 불변 업무 키. 연결 테이블 FK 대상이다.
 * label  : 화면 표기명. 상품안이 바뀌면 이것만 바뀐다.
 *
 * isActive=false는 "신규 선택 목록에서 빠진 영역"이다.
 * 과거 기록이 참조하고 있을 수 있으므로 목록에서 제거하지 않는다
 * (SELECT Policy도 is_active를 요구하지 않는다).
 */
export interface ObservationDomain {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/**
 * 관찰 화면 상단의 수업 정보.
 *
 * StaffAttendanceSession(07B)과 같은 구조다. 두 화면이 같은 수업 헤더를 쓰고,
 * 같은 helper(formatLessonOrder / formatSessionDate)로 표시한다.
 */
export interface StaffObservationSession {
  id: string;
  organizationId: string;
  classId: string;

  className: string | null;
  classStatus: ClassStatus | null;

  scheduledDate: string | null;
  status: ClassSessionStatus;

  programTitle: string | null;
  programCode: string | null;

  weekNo: number | null;
  sessionNo: number | null;
  lessonTitle: string | null;
}

/**
 * 관찰 화면의 원아 한 명.
 *
 * currentClassId가 session.classId와 다르면서 기존 관찰기록이 있다면
 * 원아가 이후 다른 반으로 이동한 historical row다.
 *
 * childName을 nullable로 둔 이유는 07B와 같다:
 * RLS/데이터 이상으로 children row를 읽지 못하더라도
 * 이미 존재하는 관찰기록 자체를 화면에서 조용히 누락시키지 않기 위해서다.
 *
 * ★ updatedAt은 DB가 돌려준 문자열 그대로다.
 *   이 값이 곧 낙관적 동시성 토큰(p_expected_updated_at)이라
 *   Date로 파싱했다가 다시 문자열로 만들면 마이크로초가 잘려
 *   저장이 영원히 OB004(stale)로 실패한다.
 *   20260831100000의 "Client 주의사항" 그대로다.
 */
export interface StaffObservationChild {
  childId: string;
  childName: string | null;
  childStatus: ChildStatus | null;
  currentClassId: string | null;

  observationId: string | null;
  childVoice: string | null;
  teacherNote: string | null;
  recordStatus: ObservationRecordStatus | null;
  /** timestamptz 원본 문자열. 가공하지 않는다. */
  updatedAt: string | null;
  /** observation_domains.sort_order 순으로 정렬된 code 목록 */
  domainCodes: string[];

  hasExistingObservation: boolean;
  isCurrentClassMember: boolean;
}

/**
 * 관찰 상세 페이지 전체 데이터.
 *
 * domains는 화면에서 code → label을 풀기 위해 항상 함께 내려간다.
 * 은퇴한(is_active=false) 영역도 포함한다 — 과거 기록의 이름을 읽어야 하기 때문이다.
 */
export interface StaffObservationPageData {
  session: StaffObservationSession;
  domains: ObservationDomain[];
  children: StaffObservationChild[];
}

export type StaffObservationLoadResult =
  | {
      ok: true;
      data: StaffObservationPageData;
    }
  | {
      ok: false;
      reason: "invalid_id" | "not_found" | "load_failed";
    };

/**
 * 한 수업 관찰 화면이 다루는 원아 수 상한.
 *
 * 07B 출결(MAX_ATTENDANCE_ROSTER)과 같은 값을 쓴다.
 * 같은 수업의 같은 명단을 다루므로 두 화면의 상한이 달라질 이유가 없다.
 */
export const MAX_OBSERVATION_ROSTER = 200;

/**
 * 아래 세 상한은 DB/RPC의 실제 제한과 반드시 같아야 한다.
 *
 *   MAX_CHILD_VOICE   20260831094000 child_voice CHECK  (char_length <= 1000)
 *                     20260831100000 c_max_child_voice  = 1000
 *   MAX_TEACHER_NOTE  20260831094000 teacher_note CHECK (char_length <= 2000)
 *                     20260831100000 c_max_teacher_note = 2000
 *   MAX_DOMAIN_CODES  20260831100000 c_max_domains      = 20
 *
 * 한쪽만 바뀌면 화면은 통과시키는데 DB가 거부하는 상태가 된다.
 */
export const MAX_CHILD_VOICE = 1000;
export const MAX_TEACHER_NOTE = 2000;
export const MAX_DOMAIN_CODES = 20;

/** 화면 표기명. record_status는 값이 둘뿐이라 상수로 고정한다. */
export const OBSERVATION_RECORD_STATUS_LABELS: Record<
  ObservationRecordStatus,
  string
> = {
  draft: "작성 중",
  complete: "작성 완료",
};
