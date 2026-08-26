"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import {
  parseSessionScheduledDate,
  parseSessionTransitionStatus,
  requiresActiveParents,
} from "@/lib/admin/class-session";
import type { ClassSessionStatus } from "@/types/class-session";
import type { ClassSessionFormState } from "./class-session-state";

/**
 * 수업 실행(class_sessions) Server Action.
 *
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 *
 * 보안 원칙 (기존 Admin Action과 동일)
 *   1. requireAdmin()으로 시작한다.
 *   2. Client가 보낸 id는 전부 UUID 형식부터 확인한다.
 *   3. ★ 구조 값(organization_id / class_id / program_id)을 Client에서 받지 않는다.
 *      배정 행을 서버에서 읽어 거기서 도출한다. Client가 보내는 건 배정 id와 차시 id뿐이다.
 *   4. Data API 호출은 전부 관리자 세션 Client + RLS로 한다. Secret Key를 쓰지 않는다.
 *
 * DB(20260826)가 최종 방어선이다 — 복합 FK · partial unique ·
 * enforce_class_session_insert / enforce_class_session_update trigger가
 * 여기 검증을 그대로 다시 수행한다. 이 파일의 역할은 그 규칙을
 * 사용자가 읽을 수 있는 문구로 미리 알려 주는 것이다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation — class_sessions_open_assignment_lesson_key 충돌 */
const UNIQUE_VIOLATION = "23505";
/** Postgres check_violation — enforce_class_session_* trigger가 던지는 코드 */
const CHECK_VIOLATION = "23514";

const MESSAGES = {
  invalidOrganization: "기관 정보를 확인할 수 없습니다.",
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  invalidScheduledDate: "예정일을 올바른 날짜로 입력하거나 비워두세요.",
  invalidStatus: "변경할 수업 상태를 선택해주세요.",
  assignmentNotFound: "프로그램 배정 정보를 찾을 수 없습니다.",
  assignmentNotInOrganization: "이 기관의 배정 정보가 아닙니다.",
  assignmentNotActive:
    "종료된 배정에는 새 수업을 등록할 수 없습니다. 기존 수업 이력만 정리할 수 있습니다.",
  classNotFound: "반 정보를 찾을 수 없습니다.",
  classNotActive:
    "보관된 반에는 새 수업을 등록할 수 없습니다. 운영 중인 반을 선택해주세요.",
  programNotFound: "프로그램 정보를 찾을 수 없습니다.",
  programNotPublished: "게시된 프로그램의 차시만 수업으로 실행할 수 있습니다.",
  lessonNotFound: "차시 정보를 찾을 수 없습니다.",
  lessonNotInProgram: "이 프로그램의 차시가 아닙니다.",
  lessonNotPublished: "게시된 차시만 수업으로 실행할 수 있습니다.",
  duplicateOpen: "이 차시는 이미 예정 또는 진행 중인 수업이 있습니다.",
  sessionNotFound: "수업 정보를 찾을 수 없습니다.",
  sessionNotInAssignment: "이 배정의 수업이 아닙니다.",
  sessionTerminal:
    "완료 또는 취소된 수업은 다시 변경할 수 없습니다. 다시 진행하려면 새 수업을 등록해주세요.",
  sessionNotScheduled: "예정 상태의 수업만 일정을 변경할 수 있습니다.",
  invalidTransition: "허용되지 않는 수업 상태 변경입니다.",
  staleSession:
    "수업 상태가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  parentsInactive:
    "배정·반·프로그램·차시 중 하나가 더 이상 운영 상태가 아닙니다. 이 수업은 완료 또는 취소로만 정리할 수 있습니다.",
  createFailure: "수업 일정을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updateFailure: "수업 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
  created: "수업 일정을 등록했습니다.",
  transitioned: "수업 상태를 변경했습니다.",
  rescheduled: "수업 예정일을 변경했습니다.",
} as const;

function error(message: string): ClassSessionFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[admin/class-session] ${scope} failed: ${message}`);
}

interface AssignmentContextRow {
  id: string;
  organization_id: string;
  class_id: string;
  program_id: string;
  status: string;
}

/**
 * 배정을 읽어 이 기관의 것인지 확인한다.
 *
 * SOYES 운영자는 RLS상 모든 기관의 배정을 볼 수 있으므로
 * "다른 기관 배정 id" 조작은 RLS가 막아 주지 않는다. 여기서 막는다.
 */
async function loadAssignment(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  assignmentId: string,
  organizationId: string,
): Promise<
  { ok: true; assignment: AssignmentContextRow } | { ok: false; message: string }
> {
  const { data, error: queryError } = await supabase
    .from("class_program_assignments")
    .select("id, organization_id, class_id, program_id, status")
    .eq("id", assignmentId)
    .maybeSingle();

  if (queryError) {
    logFailure("assignment lookup", queryError.message);
    return { ok: false, message: MESSAGES.assignmentNotFound };
  }

  if (!data) return { ok: false, message: MESSAGES.assignmentNotFound };

  const assignment = data as unknown as AssignmentContextRow;

  if (assignment.organization_id !== organizationId) {
    return { ok: false, message: MESSAGES.assignmentNotInOrganization };
  }

  return { ok: true, assignment };
}

/**
 * DB가 돌려준 오류를 사용자 문구로 바꾼다.
 * raw SQL/제약 이름을 화면에 노출하지 않는다.
 */
function mapWriteError(
  writeError: { code?: string; message: string },
  fallback: string,
): ClassSessionFormState {
  if (writeError.code === UNIQUE_VIOLATION) {
    return error(MESSAGES.duplicateOpen);
  }

  // trigger가 막은 경우다. 어떤 규칙인지는 서버 로그로만 남긴다.
  if (writeError.code === CHECK_VIOLATION) {
    logFailure("db rule", writeError.message);
    return error(MESSAGES.parentsInactive);
  }

  logFailure("write", writeError.message);
  return error(fallback);
}

// =========================================================
// 1. 수업 일정 등록 (신규 session)
// =========================================================

/**
 * 배정에 새 수업 일정을 만든다.
 *
 * status는 사용자가 고르지 않는다. 항상 'scheduled'다
 * (DB trigger도 신규 행이 scheduled가 아니면 거부한다).
 */
export async function createClassSessionAction(
  _prevState: ClassSessionFormState,
  formData: FormData,
): Promise<ClassSessionFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return error(MESSAGES.invalidOrganization);
  }

  if (!UUID_PATTERN.test(assignmentId) || !UUID_PATTERN.test(lessonId)) {
    return error(MESSAGES.invalidRequest);
  }

  const scheduledDate = parseSessionScheduledDate(
    String(formData.get("scheduled_date") ?? ""),
  );

  if (!scheduledDate.ok) return error(MESSAGES.invalidScheduledDate);

  const { supabase } = await requireAdmin();

  // A~C. 배정이 존재하고 이 기관의 것인지.
  const loaded = await loadAssignment(supabase, assignmentId, organizationId);

  if (!loaded.ok) return error(loaded.message);

  const { assignment } = loaded;

  // D. 배정이 운영 중이어야 새 수업을 연다.
  if (assignment.status !== "active") {
    return error(MESSAGES.assignmentNotActive);
  }

  // E~H. 반이 존재하고 운영 중인지.
  //      기관/반 일치는 배정 행에서 도출한 값을 쓰므로 구조적으로 어긋날 수 없다.
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, organization_id, status")
    .eq("id", assignment.class_id)
    .maybeSingle();

  if (classError) {
    logFailure("class lookup", classError.message);
    return error(MESSAGES.classNotFound);
  }

  if (!classRow) return error(MESSAGES.classNotFound);

  const classInfo = classRow as unknown as {
    organization_id: string;
    status: string;
  };

  if (classInfo.organization_id !== organizationId) {
    return error(MESSAGES.assignmentNotInOrganization);
  }

  if (classInfo.status !== "active") return error(MESSAGES.classNotActive);

  // I~K. 프로그램이 존재하고 게시 상태인지.
  const { data: programRow, error: programError } = await supabase
    .from("curriculum_programs")
    .select("id, status")
    .eq("id", assignment.program_id)
    .maybeSingle();

  if (programError) {
    logFailure("program lookup", programError.message);
    return error(MESSAGES.programNotFound);
  }

  if (!programRow) return error(MESSAGES.programNotFound);

  if ((programRow as unknown as { status: string }).status !== "published") {
    return error(MESSAGES.programNotPublished);
  }

  // L~N. 차시가 존재하고, 이 배정의 프로그램 소속이며, 게시 상태인지.
  const { data: lessonRow, error: lessonError } = await supabase
    .from("curriculum_lessons")
    .select("id, program_id, status")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    logFailure("lesson lookup", lessonError.message);
    return error(MESSAGES.lessonNotFound);
  }

  if (!lessonRow) return error(MESSAGES.lessonNotFound);

  const lessonInfo = lessonRow as unknown as {
    program_id: string;
    status: string;
  };

  if (lessonInfo.program_id !== assignment.program_id) {
    return error(MESSAGES.lessonNotInProgram);
  }

  if (lessonInfo.status !== "published") {
    return error(MESSAGES.lessonNotPublished);
  }

  // O. 같은 배정 + 같은 차시에 이미 열린 수업이 있는지 사전 확인한다.
  //    최종 방어선은 partial unique index지만, 그 오류 문구는 사용자에게 보여줄 수 없다.
  const { data: openSession, error: openError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("class_program_assignment_id", assignmentId)
    .eq("lesson_id", lessonId)
    .in("status", ["scheduled", "in_progress"])
    .maybeSingle();

  if (openError) {
    logFailure("open session lookup", openError.message);
    return error(MESSAGES.createFailure);
  }

  if (openSession) return error(MESSAGES.duplicateOpen);

  // INSERT — 구조 값은 전부 서버가 읽은 배정 행에서 가져온다.
  const { error: insertError } = await supabase.from("class_sessions").insert({
    organization_id: assignment.organization_id,
    class_id: assignment.class_id,
    class_program_assignment_id: assignment.id,
    program_id: assignment.program_id,
    lesson_id: lessonId,
    scheduled_date: scheduledDate.value,
    status: "scheduled",
  });

  if (insertError) {
    return mapWriteError(insertError, MESSAGES.createFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.created };
}

// =========================================================
// 2. 수업 상태 변경 (진행 / 완료 / 취소)
// =========================================================

interface SessionContextRow {
  id: string;
  class_program_assignment_id: string;
  class_id: string;
  program_id: string;
  lesson_id: string;
  status: ClassSessionStatus;
}

/** 이 수업이 이 배정의 것인지 확인하고 현재 상태를 읽어 온다. */
async function loadSession(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  sessionId: string,
  assignmentId: string,
): Promise<
  { ok: true; session: SessionContextRow } | { ok: false; message: string }
> {
  const { data, error: queryError } = await supabase
    .from("class_sessions")
    .select(
      "id, class_program_assignment_id, class_id, program_id, lesson_id, status",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (queryError) {
    logFailure("session lookup", queryError.message);
    return { ok: false, message: MESSAGES.sessionNotFound };
  }

  if (!data) return { ok: false, message: MESSAGES.sessionNotFound };

  const session = data as unknown as SessionContextRow;

  if (session.class_program_assignment_id !== assignmentId) {
    return { ok: false, message: MESSAGES.sessionNotInAssignment };
  }

  return { ok: true, session };
}

/**
 * "재개" 경로에서만 부모가 지금도 유효한지 확인한다.
 *
 * 20260826의 enforce_class_session_update()와 같은 규칙이다.
 * 완료/취소로 정리하는 경로는 이 검사를 하지 않는다 —
 * 부모가 먼저 종료되어도 열린 수업은 반드시 마무리할 수 있어야 한다.
 */
async function parentsStillValid(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  session: SessionContextRow,
): Promise<boolean> {
  const [assignmentResult, classResult, programResult, lessonResult] =
    await Promise.all([
      supabase
        .from("class_program_assignments")
        .select("status")
        .eq("id", session.class_program_assignment_id)
        .maybeSingle(),
      supabase
        .from("classes")
        .select("status")
        .eq("id", session.class_id)
        .maybeSingle(),
      supabase
        .from("curriculum_programs")
        .select("status")
        .eq("id", session.program_id)
        .maybeSingle(),
      supabase
        .from("curriculum_lessons")
        .select("status")
        .eq("id", session.lesson_id)
        .maybeSingle(),
    ]);

  const statusOf = (result: { data: unknown }) =>
    (result.data as { status?: string } | null)?.status ?? null;

  return (
    statusOf(assignmentResult) === "active" &&
    statusOf(classResult) === "active" &&
    statusOf(programResult) === "published" &&
    statusOf(lessonResult) === "published"
  );
}

/**
 * 수업 상태를 바꾼다.
 *
 *   scheduled   → in_progress / completed / cancelled
 *   in_progress → completed / cancelled
 *   terminal    → 금지
 *
 * in_progress로 올리는 것만 부모 유효성을 요구한다.
 */
export async function transitionClassSessionAction(
  _prevState: ClassSessionFormState,
  formData: FormData,
): Promise<ClassSessionFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return error(MESSAGES.invalidOrganization);
  }

  if (!UUID_PATTERN.test(assignmentId) || !UUID_PATTERN.test(sessionId)) {
    return error(MESSAGES.invalidRequest);
  }

  const nextStatus = parseSessionTransitionStatus(
    String(formData.get("status") ?? ""),
  );

  if (nextStatus === null) return error(MESSAGES.invalidStatus);

  const { supabase } = await requireAdmin();

  const loadedAssignment = await loadAssignment(
    supabase,
    assignmentId,
    organizationId,
  );

  if (!loadedAssignment.ok) return error(loadedAssignment.message);

  const loadedSession = await loadSession(supabase, sessionId, assignmentId);

  if (!loadedSession.ok) return error(loadedSession.message);

  const { session } = loadedSession;

  // 완료·취소된 수업은 어떤 방향으로도 다시 바꾸지 않는다.
  if (session.status === "completed" || session.status === "cancelled") {
    return error(MESSAGES.sessionTerminal);
  }

  // in_progress → in_progress 같은 무의미한 전이와
  // in_progress → 되돌리기를 여기서 막는다.
  const allowed =
    session.status === "scheduled"
      ? ["in_progress", "completed", "cancelled"]
      : ["completed", "cancelled"];

  if (!allowed.includes(nextStatus)) {
    return error(MESSAGES.invalidTransition);
  }

  // 진행 상태로 올릴 때만 부모를 다시 본다.
  if (requiresActiveParents(nextStatus)) {
    const valid = await parentsStillValid(supabase, session);

    if (!valid) return error(MESSAGES.parentsInactive);
  }

  // payload는 status 하나뿐이다.
  // 구조 컬럼과 scheduled_date는 여기 들어가지 않는다.
  //
  // ★ .select().maybeSingle()이 반드시 필요하다.
  //   PostgREST의 PATCH는 return=representation이 없으면 204를 돌려주고,
  //   postgrest-js는 조건에 맞는 행이 0개여도 { data: null, error: null }을 준다.
  //   즉 error만 보면 "다른 관리자가 먼저 정리해서 아무것도 안 바뀐 경우"를
  //   성공으로 착각한다. 실제로 바뀐 행을 돌려받아 확인한다.
  const { data: updated, error: updateError } = await supabase
    .from("class_sessions")
    .update({ status: nextStatus })
    .eq("id", sessionId)
    .eq("class_program_assignment_id", assignmentId)
    // 조회~UPDATE 사이에 다른 관리자가 먼저 정리했을 수 있어 조건을 한 번 더 건다.
    .in("status", ["scheduled", "in_progress"])
    .select("id")
    .maybeSingle();

  if (updateError) {
    return mapWriteError(updateError, MESSAGES.updateFailure);
  }

  // 0행 = 그 사이에 누군가 이 수업을 이미 완료/취소했다.
  if (!updated) return error(MESSAGES.staleSession);

  refresh();

  return { phase: "success", message: MESSAGES.transitioned };
}

// =========================================================
// 3. 예정일 변경 (예정 상태에서만)
// =========================================================

/**
 * 아직 시작하지 않은 수업의 예정일을 고친다.
 *
 * 수업이 시작된 뒤(in_progress)나 끝난 뒤에는 바꿀 수 없다 —
 * "언제 하기로 했었는가"가 사라지기 때문이다. DB trigger도 같은 규칙을 강제한다.
 * 일정을 다시 잡는 것은 "재개" 경로라 부모가 지금도 유효해야 한다.
 */
export async function rescheduleClassSessionAction(
  _prevState: ClassSessionFormState,
  formData: FormData,
): Promise<ClassSessionFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return error(MESSAGES.invalidOrganization);
  }

  if (!UUID_PATTERN.test(assignmentId) || !UUID_PATTERN.test(sessionId)) {
    return error(MESSAGES.invalidRequest);
  }

  const scheduledDate = parseSessionScheduledDate(
    String(formData.get("scheduled_date") ?? ""),
  );

  if (!scheduledDate.ok) return error(MESSAGES.invalidScheduledDate);

  const { supabase } = await requireAdmin();

  const loadedAssignment = await loadAssignment(
    supabase,
    assignmentId,
    organizationId,
  );

  if (!loadedAssignment.ok) return error(loadedAssignment.message);

  const loadedSession = await loadSession(supabase, sessionId, assignmentId);

  if (!loadedSession.ok) return error(loadedSession.message);

  const { session } = loadedSession;

  if (session.status !== "scheduled") {
    return error(
      session.status === "in_progress"
        ? MESSAGES.sessionNotScheduled
        : MESSAGES.sessionTerminal,
    );
  }

  const valid = await parentsStillValid(supabase, session);

  if (!valid) return error(MESSAGES.parentsInactive);

  // status='scheduled' 조건이 0행을 만들 수 있다(그 사이 수업이 시작·종료된 경우).
  // transition Action과 같은 이유로 실제 변경된 행을 돌려받아 확인한다.
  const { data: updated, error: updateError } = await supabase
    .from("class_sessions")
    .update({ scheduled_date: scheduledDate.value })
    .eq("id", sessionId)
    .eq("class_program_assignment_id", assignmentId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return mapWriteError(updateError, MESSAGES.updateFailure);
  }

  if (!updated) return error(MESSAGES.staleSession);

  refresh();

  return { phase: "success", message: MESSAGES.rescheduled };
}
