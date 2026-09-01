import type { ChildStatus, ClassStatus } from "./class-child";
import type { ClassSessionStatus } from "./class-session";
import type { ObservationAiDraft } from "./staff-observation-ai";
import type { ObservationMediaItem } from "./staff-observation-media";

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

  /**
   * SERVICE-09A — 이 수업에서 이 원아에 대해 올린 활동사진.
   *
   * ★ 관찰 텍스트가 없어도 사진만 있을 수 있다.
   *   수업 중에는 사진을 먼저 찍고 서술은 나중에 쓴다.
   *   그래서 media는 observationId가 아니라 (수업 · 원아)에 매달린다.
   *   hasExistingObservation이 false여도 이 배열이 비어 있지 않을 수 있다.
   *
   * ★ 각 항목의 signedUrl은 요청마다 새로 발급되는 임시 값이다(DB 값이 아니다).
   */
  media: ObservationMediaItem[];

  /**
   * SERVICE-10A — 이 관찰기록의 AI 정리.
   *
   * ★ 관찰기록이 없으면 반드시 null이다 (AI 정리는 observation에 매달린다).
   * ★ isSourceStale은 DB 값이 아니라 조회 시점에 계산한 view model 값이다.
   * ★ SERVICE-11이 쓸 수 있는 공식 텍스트는
   *   officialObservationSummary()를 통과한 것뿐이다.
   */
  aiDraft: ObservationAiDraft | null;
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

/**
 * SERVICE-08B-2 — 저장 성공 직후 서버가 확정한 값.
 *
 * RPC(20260831100000)가 돌려주는 jsonb에서 읽는다:
 *   observation_id / created / record_status / updated_at / domain_codes
 *
 * childVoice / teacherNote는 RPC 반환에 없다.
 * 대신 Server Action이 RPC에 넘긴 정규화 값(trim → 빈 문자열이면 null)을 그대로 돌려준다.
 * RPC는 우리가 보낸 값에 btrim/nullif를 한 번 더 적용하는데,
 * 이미 trim된 문자열이라 결과가 같다. 즉 이 값이 DB에 저장된 값이다.
 *
 * ★ updatedAt은 RPC가 돌려준 문자열 그대로다.
 *   이것이 다음 저장의 p_expected_updated_at이다. 재가공하면 안 된다.
 */
export interface ObservationSavedSnapshot {
  observationId: string;
  created: boolean;
  recordStatus: ObservationRecordStatus;
  /** timestamptz 원본 문자열. 다음 저장의 동시성 토큰. */
  updatedAt: string;
  childVoice: string | null;
  teacherNote: string | null;
  /** RPC가 sort_order 순으로 돌려준 최종 영역 집합(보존된 inactive 포함) */
  domainCodes: string[];
}

/**
 * 원아 1명 form의 상태.
 *
 * ★ stale을 error와 분리한 이유.
 *   OB004는 "잘못 입력했다"가 아니라 "다른 사람이 먼저 저장했다"는 뜻이다.
 *   같은 error로 뭉뚱그리면 화면이 "다시 시도"를 권하게 되고,
 *   교사는 남의 기록을 덮어쓰려고 반복 저장하게 된다.
 *   별도 상태로 두어야 "먼저 최신 기록을 확인하라"는 다른 안내를 낼 수 있다.
 *
 * childId를 함께 담는 이유:
 * 한 화면에 여러 원아 form이 있으므로, 어느 form의 결과인지 확인할 수 있어야 한다.
 */
export interface ObservationFormState {
  phase: "idle" | "success" | "error" | "stale";
  message: string | null;
  childId: string | null;
  saved: ObservationSavedSnapshot | null;
}

export const OBSERVATION_FORM_INITIAL_STATE: ObservationFormState = {
  phase: "idle",
  message: null,
  childId: null,
  saved: null,
};
