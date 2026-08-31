"use server";

import { refresh } from "next/cache";
import { requireTeacher } from "@/lib/auth/organization";
import type { ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_CHILD_VOICE,
  MAX_DOMAIN_CODES,
  MAX_TEACHER_NOTE,
  type ObservationFormState,
  type ObservationRecordStatus,
} from "@/types/staff-observation";

/**
 * SERVICE-08B-2 — 교사 관찰기록 저장 Server Action.
 *
 * 저장 단위: 원아 1명 = form 1개 = RPC 1회.
 * 여러 원아를 한 버튼으로 일괄 저장하지 않는다 —
 * 관찰기록은 서술 텍스트라 낙관적 동시성 토큰이 원아마다 따로 필요하다.
 *
 * Client가 보내는 값:
 *   sessionId / childId / childVoice / teacherNote /
 *   recordStatus / domainCodes[] / expectedUpdatedAt
 *
 * Client가 보내지 않는 값 (보내와도 읽지 않는다):
 *   organization_id / class_id / created_by / updated_by /
 *   hasExistingObservation / classStatus
 *
 *   organization_id · class_id : class_sessions를 서버가 다시 읽어 파생한다.
 *   created_by · updated_by    : 20260831094000의 trigger가 auth.uid()로 채운다.
 *   기존 기록 존재 여부 · 반 상태 : 아래에서 DB로 다시 확인한다.
 *
 * ★ 쓰기 경로는 save_class_session_observation_atomic RPC 하나뿐이다.
 *   class_session_observations / class_session_observation_domains에
 *   애플리케이션이 직접 INSERT·UPDATE·DELETE 하지 않는다.
 * ★ service_role을 사용하지 않는다. 사용자 세션 client만 쓴다.
 * ★ 최종 권한 판정은 RLS + trigger + RPC다. 여기 검사는 UX용 사전 안내다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgREST가 돌려주는 timestamptz 문자열의 모양만 확인한다.
 *
 * ★ 여기서 하는 일은 "형식 확인"뿐이다. 값을 다시 만들지 않는다.
 *   new Date(v).toISOString()을 거치면 마이크로초가 밀리초로 잘려
 *   ("...123456+00:00" → "...123Z") 서버 값과 영원히 달라지고
 *   모든 저장이 OB004로 실패한다 (20260831100000 "Client 주의사항").
 *   그래서 파싱하지 않고, 통과한 문자열을 그대로 RPC에 넘긴다.
 */
const TIMESTAMPTZ_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?$/;

const RECORD_STATUSES: readonly ObservationRecordStatus[] = [
  "draft",
  "complete",
];

/** 20260831100000이 직접 던지는 코드 */
const RPC_INVALID_INPUT = "OB001";
const RPC_NOT_FOUND = "OB002";
const RPC_SESSION_CANCELLED = "OB003";
const RPC_STALE = "OB004";
const RPC_DOMAIN_UNAVAILABLE = "OB005";

/** unique(class_session_id, child_id) — 신규 저장이 동시에 두 번 들어온 경우 */
const UNIQUE_VIOLATION = "23505";

/** trigger / CHECK 제약 */
const CHECK_VIOLATION = "23514";

/** RLS Policy 위반 (insufficient_privilege) */
const RLS_VIOLATION = "42501";

const MESSAGES = {
  invalidRequest: "관찰기록 요청 값을 확인할 수 없습니다.",
  invalidStatus: "작성 상태 값이 올바르지 않습니다.",
  voiceTooLong: `아이의 말은 ${MAX_CHILD_VOICE.toLocaleString("ko-KR")}자 이내로 입력해주세요.`,
  noteTooLong: `교사 관찰 메모는 ${MAX_TEACHER_NOTE.toLocaleString("ko-KR")}자 이내로 입력해주세요.`,
  completeNeedsContent:
    "작성 완료로 저장하려면 아이의 말 또는 교사 관찰 메모 중 하나는 입력해야 합니다.",
  invalidDomains: "선택한 관찰영역을 확인할 수 없습니다.",
  tooManyDomains: `관찰영역은 최대 ${MAX_DOMAIN_CODES}개까지 선택할 수 있습니다.`,
  domainUnavailable:
    "현재 사용할 수 없는 관찰영역이 포함되어 있습니다. 화면을 새로고침한 뒤 다시 선택해주세요.",
  notFound: "수업을 찾을 수 없거나 접근 권한이 없습니다.",
  cancelled: "취소된 수업의 관찰기록은 저장할 수 없습니다.",
  archivedTeacherInsert:
    "보관된 반에서는 새 관찰기록을 작성할 수 없습니다. 기존 기록만 정정할 수 있습니다.",
  notAllowed:
    "이 관찰기록을 저장할 권한이 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  stale:
    "다른 사용자가 먼저 이 기록을 수정했습니다. 최신 기록을 다시 확인한 후 작성해주세요.",
  failure: "관찰기록을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

function error(
  message: string,
  childId: string | null,
): ObservationFormState {
  return {
    phase: "error",
    message,
    childId,
    saved: null,
  };
}

function stale(childId: string | null): ObservationFormState {
  return {
    phase: "stale",
    message: MESSAGES.stale,
    childId,
    saved: null,
  };
}

/**
 * 서버 로그에만 남긴다.
 *
 * DB 메시지에는 제약 이름·SQL 조각이 들어 있어 화면에 그대로 내보내지 않는다.
 * 사용자에게는 위 MESSAGES의 문구만 나간다.
 */
function logFailure(scope: string, message: string) {
  console.error(`[staff/observation] ${scope} failed: ${message}`);
}

/**
 * PostgreSQL char_length와 같은 기준으로 센다.
 *
 * JS의 String.length는 UTF-16 code unit 수라 이모지 하나를 2로 센다.
 * 스프레드는 code point 단위라 DB 쪽 char_length와 어긋나지 않는다.
 */
function characterCount(value: string): number {
  return [...value].length;
}

/** 공백만 남은 값은 "내용 없음"으로 본다 (RPC의 nullif(btrim(...), '')와 같은 규칙). */
function normalizeText(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function isRecordStatus(
  value: string,
): value is ObservationRecordStatus {
  return RECORD_STATUSES.includes(
    value as ObservationRecordStatus,
  );
}

interface SessionContextRow {
  id: string;
  organization_id: string;
  class_id: string;
  status: ClassSessionStatus;
}

interface ExistingObservationRow {
  id: string;
  updated_at: string;
}

interface DomainRow {
  code: string;
  is_active: boolean;
}

interface DomainLinkRow {
  domain_code: string;
}

interface ClassValidationRow {
  id: string;
  status: ClassStatus;
}

/**
 * RPC 오류를 사용자 문구로 바꾼다.
 *
 * OB004(stale)와 23505(동시 신규 생성)는 error가 아니라 stale로 돌려준다.
 * 둘 다 "내 입력이 잘못됐다"가 아니라 "그 사이 남이 먼저 저장했다"는 뜻이라,
 * 화면이 재시도가 아니라 "최신 기록 확인"을 권해야 한다.
 */
function mapRpcError(
  rpcError: { code?: string },
  childId: string,
): ObservationFormState {
  switch (rpcError.code) {
    case RPC_STALE:
    case UNIQUE_VIOLATION:
      return stale(childId);
    case RPC_INVALID_INPUT:
      return error(MESSAGES.invalidRequest, childId);
    case RPC_NOT_FOUND:
      return error(MESSAGES.notFound, childId);
    case RPC_SESSION_CANCELLED:
      return error(MESSAGES.cancelled, childId);
    case RPC_DOMAIN_UNAVAILABLE:
      return error(MESSAGES.domainUnavailable, childId);
    case RLS_VIOLATION:
    case CHECK_VIOLATION:
      return error(MESSAGES.notAllowed, childId);
    default:
      return error(MESSAGES.failure, childId);
  }
}

/** RPC는 jsonb 객체 하나를 돌려준다. 형태가 어긋나면 저장 자체를 실패로 본다. */
interface RpcResult {
  observationId: string;
  created: boolean;
  recordStatus: ObservationRecordStatus;
  updatedAt: string;
  domainCodes: string[];
}

function readRpcResult(value: unknown): RpcResult | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;

  const observationId = row.observation_id;
  const recordStatus = row.record_status;
  const updatedAt = row.updated_at;
  const domainCodes = row.domain_codes;

  if (
    typeof observationId !== "string" ||
    typeof updatedAt !== "string" ||
    typeof recordStatus !== "string" ||
    !isRecordStatus(recordStatus) ||
    !Array.isArray(domainCodes)
  ) {
    return null;
  }

  return {
    observationId,
    created: row.created === true,
    recordStatus,
    // ★ RPC가 준 문자열 그대로. 다음 저장의 토큰이다.
    updatedAt,
    domainCodes: domainCodes.filter(
      (code): code is string => typeof code === "string",
    ),
  };
}

/**
 * 원아 한 명의 관찰기록을 저장한다.
 *
 * 저장 경로는 RPC 하나다 —
 * 본문 INSERT/UPDATE와 관찰영역 replace-all이 한 트랜잭션에서 끝나
 * "본문은 저장됐는데 영역은 실패" 같은 중간 상태가 남지 않는다.
 */
export async function saveObservationAction(
  _prevState: ObservationFormState,
  formData: FormData,
): Promise<ObservationFormState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const childId = String(formData.get("childId") ?? "");

  if (
    !UUID_PATTERN.test(sessionId) ||
    !UUID_PATTERN.test(childId)
  ) {
    return error(MESSAGES.invalidRequest, null);
  }

  /**
   * recordStatus는 submit 버튼(name="recordStatus")의 값으로 온다.
   * "임시저장"이면 draft, "작성완료"면 complete다.
   */
  const recordStatusRaw = String(
    formData.get("recordStatus") ?? "",
  );

  if (!isRecordStatus(recordStatusRaw)) {
    return error(MESSAGES.invalidStatus, childId);
  }

  const recordStatus = recordStatusRaw;

  const childVoice = normalizeText(
    String(formData.get("childVoice") ?? ""),
  );

  const teacherNote = normalizeText(
    String(formData.get("teacherNote") ?? ""),
  );

  if (
    childVoice !== null &&
    characterCount(childVoice) > MAX_CHILD_VOICE
  ) {
    return error(MESSAGES.voiceTooLong, childId);
  }

  if (
    teacherNote !== null &&
    characterCount(teacherNote) > MAX_TEACHER_NOTE
  ) {
    return error(MESSAGES.noteTooLong, childId);
  }

  // RPC도 같은 검사를 하지만, 여기서 끝내야 사용자가 바로 이해할 문구가 나간다.
  if (
    recordStatus === "complete" &&
    childVoice === null &&
    teacherNote === null
  ) {
    return error(MESSAGES.completeNeedsContent, childId);
  }

  /**
   * 관찰영역은 checkbox 여러 개(name="domainCodes")로 온다.
   *
   * JSON 문자열 하나로 받지 않는다 — 파싱 실패·타입 혼동 표면을 만들 이유가 없고,
   * 브라우저가 보내는 그대로 getAll()로 읽는 편이 검증도 단순하다.
   */
  const rawCodes = formData
    .getAll("domainCodes")
    .map((value) => (typeof value === "string" ? value.trim() : ""));

  if (rawCodes.some((code) => code === "")) {
    return error(MESSAGES.invalidDomains, childId);
  }

  const requestedCodes = [...new Set(rawCodes)];

  if (requestedCodes.length !== rawCodes.length) {
    // 중복은 조용히 고치지 않는다. Client 상태 관리 버그를 덮어 버리게 된다.
    return error(MESSAGES.invalidDomains, childId);
  }

  if (requestedCodes.length > MAX_DOMAIN_CODES) {
    return error(MESSAGES.tooManyDomains, childId);
  }

  /**
   * expectedUpdatedAt은 화면이 받은 문자열 그대로 들어온다.
   *
   * 빈 문자열 = "신규 작성" (RPC에 null을 넘긴다).
   * 값이 있으면 형식만 확인하고 **그대로** 넘긴다.
   */
  const expectedRaw = String(
    formData.get("expectedUpdatedAt") ?? "",
  ).trim();

  if (
    expectedRaw !== "" &&
    !TIMESTAMPTZ_PATTERN.test(expectedRaw)
  ) {
    return error(MESSAGES.invalidRequest, childId);
  }

  const expectedUpdatedAt =
    expectedRaw === "" ? null : expectedRaw;

  /**
   * ★ 애플리케이션 레벨에서도 교사만 통과시킨다.
   *
   *   20260831094000의 INSERT/UPDATE Policy에는 director 분기가 없다 —
   *   관찰 원문은 그 자리에 있었던 교사만 쓴다. RLS가 최종 방어선이지만,
   *   "Teacher 페이지에서 호출됐으니 교사겠지"라고 믿고 넘기면
   *   Server Action endpoint를 직접 호출하는 원장이 42501을 받고
   *   원인을 알 수 없는 오류 화면을 보게 된다.
   *   requireTeacher()는 role='teacher' + membership active + 기관 active를
   *   DB에서 확인한다(원장 전용 계정은 여기서 /login으로 되돌아간다).
   */
  const { supabase, memberships } = await requireTeacher();

  /**
   * sessionId를 서버에서 다시 조회한다.
   *
   * 다른 기관 · 담당하지 않는 반의 수업이면 RLS가 여기서 0건으로 만든다.
   * organization_id / class_id는 이 행에서만 나온다 — Client가 정할 수 없다.
   */
  const { data: sessionData, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id, organization_id, class_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    logFailure("session lookup", sessionError.message);
    return error(MESSAGES.notFound, childId);
  }

  if (!sessionData) {
    return error(MESSAGES.notFound, childId);
  }

  const session = sessionData as unknown as SessionContextRow;

  /**
   * 이 기관의 교사 소속인지 다시 확인한다.
   *
   * requireTeacher()는 "어딘가의 교사"까지만 보장한다.
   * A원 교사가 B원 sessionId를 넣는 경우는 RLS가 이미 0건으로 막지만,
   * 기관 대조를 생략하면 그 사실이 코드에 남지 않는다.
   */
  const isTeacherOfOrg = memberships.some(
    (membership) =>
      membership.organizationId === session.organization_id &&
      membership.role === "teacher",
  );

  if (!isTeacherOfOrg) {
    return error(MESSAGES.notFound, childId);
  }

  // 취소된 수업은 조회 전용이다. RPC OB003와 Policy가 최종 방어선이다.
  if (session.status === "cancelled") {
    return error(MESSAGES.cancelled, childId);
  }

  /**
   * 기존 기록 · 관찰영역 목록 · 반 상태를 한 번에 확인한다.
   *
   * ★ Client가 보낸 hasExistingObservation / classStatus를 쓰지 않는다.
   *   보관된 반에서 신규 작성을 막는 판정이 여기에 걸려 있으므로
   *   Client가 뒤집을 수 있는 값으로 판단하면 안 된다.
   */
  const [observationResult, domainResult, classResult] =
    await Promise.all([
      supabase
        .from("class_session_observations")
        .select("id, updated_at")
        .eq("class_session_id", session.id)
        .eq("child_id", childId)
        .maybeSingle(),

      supabase
        .from("observation_domains")
        .select("code, is_active"),

      supabase
        .from("classes")
        .select("id, status")
        .eq("id", session.class_id)
        .maybeSingle(),
    ]);

  if (observationResult.error) {
    logFailure(
      "observation lookup",
      observationResult.error.message,
    );
    return error(MESSAGES.failure, childId);
  }

  if (domainResult.error) {
    logFailure("domain lookup", domainResult.error.message);
    return error(MESSAGES.failure, childId);
  }

  if (classResult.error) {
    logFailure("class validation", classResult.error.message);
    return error(MESSAGES.failure, childId);
  }

  const existing =
    (observationResult.data as unknown as ExistingObservationRow | null) ??
    null;

  const domainRows =
    (domainResult.data ?? []) as unknown as DomainRow[];

  const classRow =
    (classResult.data as unknown as ClassValidationRow | null) ?? null;

  const activeCodes = new Set(
    domainRows
      .filter((row) => row.is_active)
      .map((row) => row.code),
  );

  /**
   * ★ 보관된 반: 기존 기록 정정은 허용, 신규 작성은 차단.
   *
   *   20260831094000의 INSERT Policy가 is_class_teacher()(반 active 요구)를,
   *   UPDATE Policy가 is_assigned_class_teacher()(보관된 반도 허용)를 쓴다.
   *   여기 검사는 그 규칙을 사용자에게 미리 설명하기 위한 것이고,
   *   판정 근거는 방금 DB에서 읽은 existing / classRow다.
   */
  if (existing === null && classRow?.status !== "active") {
    return error(MESSAGES.archivedTeacherInsert, childId);
  }

  /**
   * ★ 기존 연결을 DB에서 먼저 읽는다 — 관찰영역 판정의 기준선이다.
   *
   *   Client가 보낸 hidden input이나 화면 상태로 보존하지 않는다.
   *   보존 여부도, 허용 여부도 아래 linkedCodeSet 하나로 결정한다.
   *   신규 기록(existing === null)이면 연결이 하나도 없으므로 빈 집합이다.
   */
  let linkedCodes: string[] = [];

  if (existing !== null) {
    const { data: linkData, error: linkError } = await supabase
      .from("class_session_observation_domains")
      .select("domain_code")
      .eq("observation_id", existing.id);

    if (linkError) {
      logFailure("domain link lookup", linkError.message);
      return error(MESSAGES.failure, childId);
    }

    linkedCodes = (
      (linkData ?? []) as unknown as DomainLinkRow[]
    ).map((row) => row.domain_code);
  }

  const linkedCodeSet = new Set(linkedCodes);

  /**
   * ★ 요청된 code 판정 — active 여부만 보면 안 된다.
   *
   *   화면을 연 뒤 저장하기 전까지 사이에 운영자가 영역을 사용 중지로 바꿀 수 있다.
   *   그 영역이 이 기록에 **이미 연결돼 있던** 것이라면, 교사는 그저
   *   체크된 상태 그대로 본문 오타를 고쳐 저장한 것뿐이다.
   *   여기서 active만 보고 거부하면 그 기록은 영역을 지우지 않는 한 영영 못 고치고,
   *   요청에서 빼 버리면 기존 연결이 조용히 삭제된다. 둘 다 안 된다.
   *
   *   그래서 code마다 다음과 같이 판정한다.
   *     A. 지금 active                        → 허용
   *     B. 지금 inactive지만 이미 연결돼 있던 것 → 기존 기록 보존 목적으로 허용
   *     C. 지금 inactive이고 연결된 적도 없음   → 신규 추가 시도이므로 거부
   *
   *   C에는 observation_domains에 없는 알 수 없는 code도 함께 걸린다.
   *   신규 기록은 linkedCodeSet이 비어 있으므로 B가 성립할 수 없다 —
   *   즉 새 기록에 사용 중지 영역을 붙이는 경로는 어디에도 없다.
   *
   *   이 규칙은 20260831100000의 OB005 판정과 같다(그쪽도 "이미 연결된 것"만 통과시킨다).
   *   RPC는 같은 트랜잭션 안에서 다시 검사하므로 최종 방어선은 그대로 OB005다.
   */
  const rejectedCodes = requestedCodes.filter(
    (code) =>
      !activeCodes.has(code) && !linkedCodeSet.has(code),
  );

  if (rejectedCodes.length > 0) {
    return error(MESSAGES.domainUnavailable, childId);
  }

  /**
   * ★ inactive 연결은 요청에 없어도 항상 되살린다.
   *
   *   RPC는 replace-all이라 "최종 영역 집합 전체"를 받는다.
   *   화면은 active 영역만 체크박스로 보여주므로, 기존 기록에 붙어 있던
   *   사용 중지 영역은 요청에서 빠진다 → 그대로 넘기면 저장하는 순간 삭제된다.
   *   교사가 본문 오타만 고쳤는데 과거 관찰영역이 조용히 사라지는 것이다.
   *
   *   제거 UX가 아직 없으므로 이번 단계의 기본 동작은 "보존"이다.
   *   보존 주체가 Client가 아니라 서버라, 화면이 무엇을 보내든 결과가 같다.
   */
  const preservedInactiveCodes = linkedCodes.filter(
    (code) => !activeCodes.has(code),
  );

  const finalCodes = [
    ...new Set([
      ...requestedCodes,
      ...preservedInactiveCodes,
    ]),
  ];

  if (finalCodes.length > MAX_DOMAIN_CODES) {
    return error(MESSAGES.tooManyDomains, childId);
  }

  /**
   * ★ p_expected_updated_at은 Client가 준 문자열 그대로 넘긴다.
   *
   *   방금 조회한 existing.updated_at으로 바꿔치기하면 낙관적 동시성이
   *   통째로 무력화된다 — 그 사이 남이 저장했어도 항상 최신 토큰으로
   *   덮어쓰게 되어, 막으려던 lost update가 바로 여기서 발생한다.
   *   "기존 기록이 있는데 Client가 null을 보냈다" 같은 불일치는
   *   RPC가 OB004로 판정한다. 판정자를 하나로 둔다.
   */
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_class_session_observation_atomic",
    {
      p_session_id: session.id,
      p_child_id: childId,
      p_child_voice: childVoice,
      p_teacher_note: teacherNote,
      p_record_status: recordStatus,
      p_domain_codes: finalCodes,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );

  if (rpcError) {
    logFailure("atomic save", rpcError.message);

    return mapRpcError(rpcError, childId);
  }

  const result = readRpcResult(rpcData);

  if (!result) {
    logFailure("atomic save", "unexpected rpc payload");
    return error(MESSAGES.failure, childId);
  }

  /**
   * 화면을 다시 그린다.
   *
   * 요약 집계(작성 완료/작성 중/미작성)와 다른 사람이 저장한 내용이 반영된다.
   * form은 원아별 client component라 refresh 후에도 언마운트되지 않고,
   * "저장하지 않은 편집이 있으면 서버 값으로 되돌리지 않는다"는 규칙을
   * ObservationChildForm이 지킨다 — 옆 원아의 작성 중 내용이 날아가지 않는다.
   *
   * ★ 연속 저장은 refresh 결과를 기다리지 않는다.
   *   아래 saved.updatedAt(=RPC가 방금 발급한 토큰)만으로 바로 다시 저장할 수 있다.
   */
  refresh();

  return {
    phase: "success",
    message:
      result.recordStatus === "complete"
        ? "관찰기록을 작성 완료로 저장했습니다."
        : "관찰기록을 임시저장했습니다.",
    childId,
    saved: {
      observationId: result.observationId,
      created: result.created,
      recordStatus: result.recordStatus,
      updatedAt: result.updatedAt,
      // RPC에 넘긴 정규화 값 = 실제 저장된 값
      childVoice,
      teacherNote,
      domainCodes: result.domainCodes,
    },
  };
}
