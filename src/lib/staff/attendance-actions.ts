"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/auth/organization";
import type { ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_ATTENDANCE_ROSTER,
  type AttendanceEntryInput,
  type AttendanceFormState,
  type AttendanceStatus,
} from "@/types/staff-attendance";

/**
 * SERVICE-07B — 원장/교사 출결 저장 Server Action.
 *
 * Client가 보내는 값:
 *   sessionId
 *   entries[{ childId, attendanceStatus }]
 *
 * 보내지 않는 값:
 *   organization_id
 *   class_id
 *   teacher_id
 *
 * organization_id / class_id는 반드시 class_sessions에서 서버가 다시 읽는다.
 *
 * ★ 권한 최종 판정은 RLS가 한다.
 * ★ service_role을 사용하지 않는다.
 * ★ DELETE는 하지 않는다.
 * ★ 출결 저장이 수업 상태를 자동 변경하지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "left_early",
];

/** 조회와 저장이 같은 상한을 쓴다 (types/staff-attendance.ts) */
const MAX_ENTRIES = MAX_ATTENDANCE_ROSTER;

/** unique(class_session_id, child_id) */
const UNIQUE_VIOLATION = "23505";

/** DB trigger/check가 업무 규칙을 막은 경우 */
const CHECK_VIOLATION = "23514";

/** RLS Policy 위반 (insufficient_privilege) */
const RLS_VIOLATION = "42501";

/** 20260830 save_class_session_attendance_atomic이 직접 던지는 코드 */
const RPC_INVALID_INPUT = "AT001";
const RPC_SESSION_NOT_FOUND = "AT002";
const RPC_SESSION_CANCELLED = "AT003";

const MESSAGES = {
  invalidRequest: "출결 요청 값을 확인할 수 없습니다.",
  invalidEntries: "저장할 출결 정보를 확인해주세요.",
  tooManyEntries: `한 번에 최대 ${MAX_ATTENDANCE_ROSTER}명까지 저장할 수 있습니다. 나눠서 저장해주세요.`,
  noChange: "변경된 출결이 없습니다.",
  notFound: "수업을 찾을 수 없거나 접근 권한이 없습니다.",
  cancelled: "취소된 수업은 출결을 수정할 수 없습니다.",
  invalidRoster:
    "현재 수업의 원아 명단에 없는 원아가 포함되어 있습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  archivedTeacherInsert:
    "보관된 반에서는 새 출결 기록을 추가할 수 없습니다. 기존 출결만 정정할 수 있습니다.",
  stale:
    "출결 정보가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  notAllowed:
    "이 수업의 출결을 저장할 권한이 없거나, 저장할 수 없는 원아가 포함되어 있습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  failure: "출결을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

function error(message: string): AttendanceFormState {
  return {
    phase: "error",
    message,
  };
}

function logFailure(scope: string, message: string) {
  console.error(`[staff/attendance] ${scope} failed: ${message}`);
}

/**
 * RPC가 돌려준 오류를 사용자 문구로 바꾼다.
 *
 * DB 메시지(제약 이름·SQL 조각)를 그대로 화면에 내보내지 않는다.
 * 원문은 호출부에서 이미 서버 로그로만 남긴다.
 *
 * AT001/AT002/AT003은 20260830 함수가 직접 던지는 코드다.
 * 42501(RLS 위반) · 23514(trigger) · 23505(unique)는 preflight 이후
 * 상황이 바뀐 경우다 — 트랜잭션이 통째로 rollback되었으므로
 * 부분 저장은 남지 않는다.
 */
function mapRpcError(rpcError: { code?: string }): string {
  switch (rpcError.code) {
    case RPC_INVALID_INPUT:
      return MESSAGES.invalidEntries;
    case RPC_SESSION_NOT_FOUND:
      return MESSAGES.notFound;
    case RPC_SESSION_CANCELLED:
      return MESSAGES.cancelled;
    case RLS_VIOLATION:
    case CHECK_VIOLATION:
      return MESSAGES.notAllowed;
    case UNIQUE_VIOLATION:
      return MESSAGES.stale;
    default:
      return MESSAGES.failure;
  }
}

/** 함수는 jsonb 객체 하나를 돌려준다. 형태가 어긋나면 0으로 본다. */
function readChangedCount(value: unknown): number {
  if (!value || typeof value !== "object") return 0;

  const changed = (value as { changed_count?: unknown }).changed_count;

  return typeof changed === "number" && Number.isFinite(changed) ? changed : 0;
}

interface SessionContextRow {
  id: string;
  organization_id: string;
  class_id: string;
  status: ClassSessionStatus;
}

interface ExistingAttendanceRow {
  id: string;
  child_id: string;
  attendance_status: AttendanceStatus;
}

interface ChildValidationRow {
  id: string;
  class_id: string | null;
}

interface ClassValidationRow {
  id: string;
  status: ClassStatus;
}

function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return (
    typeof value === "string" &&
    ATTENDANCE_STATUSES.includes(value as AttendanceStatus)
  );
}

/**
 * JSON 문자열을 안전한 entry 배열로 바꾼다.
 *
 * 같은 childId가 두 번 들어오면 거부한다.
 * 한 요청의 최대 원아 수도 제한한다.
 */
type ParseResult =
  | { ok: true; entries: AttendanceEntryInput[] }
  | { ok: false; reason: "invalid" | "too_many" };

function parseEntries(raw: string): ParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!Array.isArray(parsed)) return { ok: false, reason: "invalid" };
  if (parsed.length === 0) return { ok: false, reason: "invalid" };

  // 상한 초과는 "값이 이상하다"가 아니라 "너무 많다"로 구분해 안내한다.
  if (parsed.length > MAX_ENTRIES) return { ok: false, reason: "too_many" };

  const seen = new Set<string>();
  const entries: AttendanceEntryInput[] = [];

  for (const value of parsed) {
    if (!value || typeof value !== "object") {
      return { ok: false, reason: "invalid" };
    }

    const candidate = value as {
      childId?: unknown;
      attendanceStatus?: unknown;
    };

    if (
      typeof candidate.childId !== "string" ||
      !UUID_PATTERN.test(candidate.childId) ||
      !isAttendanceStatus(candidate.attendanceStatus)
    ) {
      return { ok: false, reason: "invalid" };
    }

    if (seen.has(candidate.childId)) {
      return { ok: false, reason: "invalid" };
    }

    seen.add(candidate.childId);

    entries.push({
      childId: candidate.childId,
      attendanceStatus: candidate.attendanceStatus,
    });
  }

  return { ok: true, entries };
}

/**
 * 여러 원아의 출결을 한 번에 저장한다.
 *
 * 저장 방식:
 *   save_class_session_attendance_atomic RPC 1회 (20260830)
 *   → 함수 안에서 UPDATE 1회 + INSERT 1회를 같은 트랜잭션으로 처리한다.
 *
 * 원아 20명이라고 요청을 20번 보내지 않고, 부분 저장도 남지 않는다.
 */
export async function saveAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const rawEntries = String(formData.get("entries") ?? "");

  if (!UUID_PATTERN.test(sessionId)) {
    return error(MESSAGES.invalidRequest);
  }

  const parsedEntries = parseEntries(rawEntries);

  if (!parsedEntries.ok) {
    return error(
      parsedEntries.reason === "too_many"
        ? MESSAGES.tooManyEntries
        : MESSAGES.invalidEntries,
    );
  }

  const entries = parsedEntries.entries;

  // 로그인 + 활성 기관의 director|teacher membership까지 확인한다.
  const { supabase, memberships } = await requireStaff();

  /**
   * sessionId를 서버에서 다시 조회한다.
   *
   * 다른 기관/다른 반 수업이면 RLS가 여기서 0건으로 만든다.
   * Client가 organization_id나 class_id를 결정할 수 없다.
   */
  const { data: sessionData, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id, organization_id, class_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    logFailure("session lookup", sessionError.message);
    return error(MESSAGES.notFound);
  }

  if (!sessionData) {
    return error(MESSAGES.notFound);
  }

  const session = sessionData as unknown as SessionContextRow;

  // cancelled는 07A DB 정책과 동일하게 read-only.
  if (session.status === "cancelled") {
    return error(MESSAGES.cancelled);
  }

  const childIds = entries.map((entry) => entry.childId);

  /**
   * 현재 로그인 사용자의 이 기관 역할.
   *
   * RLS가 최종 권한을 판정하지만,
   * "보관된 반에서 교사는 신규 INSERT 불가"를 사용자에게
   * 이해하기 쉬운 문구로 미리 알려 주기 위해 역할을 확인한다.
   */
  const organizationMemberships = memberships.filter(
    (membership) =>
      membership.organizationId === session.organization_id,
  );

  const isDirector = organizationMemberships.some(
    (membership) => membership.role === "director",
  );

  const isTeacher = organizationMemberships.some(
    (membership) => membership.role === "teacher",
  );

  if (!isDirector && !isTeacher) {
    return error(MESSAGES.notFound);
  }

  /**
   * 기존 attendance + 요청 child + 반 상태를 일괄 조회한다.
   *
   * children은 07A-1 policy 덕분에
   *   - 현재 담당 반 원아
   *   - 실제 historical attendance로 연결된 원아
   * 를 필요한 범위에서 읽을 수 있다.
   */
  const [attendanceResult, childrenResult, classResult] = await Promise.all([
    supabase
      .from("class_session_attendance")
      .select("id, child_id, attendance_status")
      .eq("organization_id", session.organization_id)
      .eq("class_session_id", session.id)
      .in("child_id", childIds)
      .limit(MAX_ENTRIES),

    supabase
      .from("children")
      .select("id, class_id")
      .eq("organization_id", session.organization_id)
      .in("id", childIds)
      .limit(MAX_ENTRIES),

    supabase
      .from("classes")
      .select("id, status")
      .eq("id", session.class_id)
      .maybeSingle(),
  ]);

  if (attendanceResult.error) {
    logFailure("attendance lookup", attendanceResult.error.message);
    return error(MESSAGES.failure);
  }

  if (childrenResult.error) {
    logFailure("children validation", childrenResult.error.message);
    return error(MESSAGES.failure);
  }

  if (classResult.error) {
    logFailure("class validation", classResult.error.message);
    return error(MESSAGES.failure);
  }

  const existingRows =
    (attendanceResult.data ?? []) as unknown as ExistingAttendanceRow[];

  const visibleChildren =
    (childrenResult.data ?? []) as unknown as ChildValidationRow[];

  const classRow =
    (classResult.data as unknown as ClassValidationRow | null) ?? null;

  const existingByChildId = new Map(
    existingRows.map((row) => [row.child_id, row]),
  );

  const childById = new Map(
    visibleChildren.map((child) => [child.id, child]),
  );

  /**
   * 신규 INSERT 대상과 기존 UPDATE 대상을 분리한다.
   *
   * 기존 attendance가 있는 historical child:
   *   현재 다른 반으로 이동했어도 UPDATE 가능.
   *
   * attendance가 없는 child:
   *   반드시 현재 session.class_id 소속이어야 새 row를 만들 수 있다.
   */
  /**
   * ★ 교사의 archived class 규칙을 roster 검사보다 먼저 판정한다.
   *
   * 보관된 반에서는 07A-1 children Policy상 "출결이 없는 원아"가 아예 보이지 않아,
   * roster 검사를 먼저 돌리면 원인과 무관한 "명단에 없는 원아" 문구가 나간다.
   * 신규 INSERT가 될 항목이 하나라도 있으면 여기서 정확한 이유를 알려준다.
   *
   * Director는 이 애플리케이션 가드의 대상이 아니다(정책 변경 없음).
   * DB RLS가 최종 방어선이므로 이 검사는 UX용 사전 안내다.
   */
  const wouldInsertCount = entries.filter(
    (entry) => !existingByChildId.has(entry.childId),
  ).length;

  if (
    wouldInsertCount > 0 &&
    isTeacher &&
    !isDirector &&
    classRow?.status !== "active"
  ) {
    return error(MESSAGES.archivedTeacherInsert);
  }

  /**
   * 신규 INSERT 후보만 사전 확인한다.
   *
   * 실제 저장은 아래 RPC가 한 트랜잭션에서 처리하므로
   * 여기서 상태별 grouping을 만들 필요가 없다.
   * 이 루프는 "명단에 없는 원아" 를 사용자에게 미리 알려 주기 위한 것이다.
   */
  for (const entry of entries) {
    if (existingByChildId.has(entry.childId)) continue;

    const child = childById.get(entry.childId);

    /**
     * 신규 attendance는 현재 session 반의 원아만 허용.
     *
     * "수업 당시 같은 반이었지만 출결 기록 전에 다른 반으로 이동한 원아"는
     * 현재 schema에 반 이동 snapshot이 없어 복원 근거가 없다.
     */
    if (!child || child.class_id !== session.class_id) {
      return error(MESSAGES.invalidRoster);
    }
  }

  /**
   * ★ 저장은 RPC 한 번으로 끝낸다 (H-1).
   *
   * 예전에는 bulk INSERT 1회 + 상태별 UPDATE 최대 4회를 각각 보냈다.
   * 요청마다 트랜잭션이 달라서 중간 UPDATE가 실패하면 앞선 쓰기가 그대로 남았다.
   *
   * save_class_session_attendance_atomic은 SECURITY INVOKER라
   * 지금까지와 똑같은 RLS/Policy/trigger/컬럼 GRANT가 적용된다.
   * 권한은 넓어지지 않고 원자성만 생긴다 — 하나라도 실패하면 전부 rollback된다.
   *
   * organization_id / class_id는 함수가 p_session_id로 조회한 수업 행에서
   * 직접 만든다. 여기서도, Client에서도 넘기지 않는다.
   */
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_class_session_attendance_atomic",
    {
      p_session_id: session.id,
      p_entries: entries.map((entry) => ({
        child_id: entry.childId,
        attendance_status: entry.attendanceStatus,
      })),
    },
  );

  if (rpcError) {
    logFailure("atomic save", rpcError.message);

    return error(mapRpcError(rpcError));
  }

  const changedCount = readChangedCount(rpcData);

  // 출결 저장은 session status를 바꾸지 않는다.
  refresh();

  return {
    phase: "success",
    message:
      changedCount === 0
        ? MESSAGES.noChange
        : `${changedCount.toLocaleString("ko-KR")}명의 출결을 저장했습니다.`,
  };
}
