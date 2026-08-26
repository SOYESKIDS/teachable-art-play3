"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/auth/organization";
import {
  parseSessionTransitionStatus,
  requiresActiveParents,
} from "@/lib/admin/class-session";
import type { ClassSessionStatus } from "@/types/class-session";
import type { StaffSessionFormState } from "./session-state";

/**
 * 원장/교사 수업 상태 변경 Server Action (SERVICE-06C-B).
 *
 * Admin(06B)의 Action을 재사용하지 않는 이유
 *   그쪽은 requireAdmin()으로 시작한다. 운영자 세션이 아니면 로그아웃으로 튕긴다.
 *   반대로 이 Action은 requireStaff()로 시작하고, SOYES 운영자 권한으로는 들어올 수 없다.
 *   상태 전이 규칙 자체는 @/lib/admin/class-session의 순수 helper를 그대로 공유한다
 *   (Supabase/auth 의존이 없는 파일이라 역할과 무관하게 재사용 가능하다).
 *
 * ★ Client에서 organization_id / class_id / program_id를 받지 않는다.
 *   받는 값은 sessionId와 목표 status 둘뿐이다.
 *   "이 수업을 만질 수 있는가"는 전적으로 RLS가 판정한다
 *   (20260826 class_sessions SELECT/UPDATE Policy).
 *   따라서 다른 반·다른 기관의 sessionId를 넣어도 조회 자체가 0건이 된다.
 *
 * ★ DB가 최종 방어선이다.
 *   enforce_class_session_update trigger가 여기 검증을 그대로 다시 수행한다.
 *   이 파일의 역할은 그 규칙을 사용자가 읽을 수 있는 문구로 미리 알려 주는 것이다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres check_violation — enforce_class_session_update trigger가 던지는 코드 */
const CHECK_VIOLATION = "23514";

const MESSAGES = {
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  invalidStatus: "변경할 수업 상태를 선택해주세요.",
  notFound: "수업을 찾을 수 없거나 접근 권한이 없습니다.",
  terminal:
    "완료 또는 취소된 수업은 다시 변경할 수 없습니다. 다시 진행하려면 관리자에게 새 수업 등록을 요청해주세요.",
  invalidTransition: "지금 상태에서는 할 수 없는 변경입니다.",
  parentsInactive:
    "이 수업은 더 이상 운영 상태가 아닙니다(반 보관, 프로그램 배정 종료 등). 완료 또는 취소로만 정리할 수 있습니다.",
  stale:
    "수업 상태가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  failure: "수업 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.",
  started: "수업을 시작했습니다.",
  completed: "수업을 완료 처리했습니다.",
  cancelled: "수업을 취소 처리했습니다.",
} as const;

function error(message: string): StaffSessionFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[staff/session] ${scope} failed: ${message}`);
}

interface SessionContextRow {
  id: string;
  class_program_assignment_id: string;
  class_id: string;
  program_id: string;
  lesson_id: string;
  status: ClassSessionStatus;
}

/**
 * 수업을 시작 / 완료 / 취소한다.
 *
 *   scheduled   → in_progress / completed / cancelled
 *   in_progress → completed / cancelled
 *   terminal    → 금지
 *
 * in_progress로 올릴 때만 부모(배정·반·프로그램·차시)가 지금도 유효해야 한다.
 * 완료·취소는 부모가 종료된 뒤에도 항상 가능해야 한다 —
 * 그러지 않으면 반이 보관된 순간 열린 수업이 영구 미결로 남는다.
 */
export async function transitionStaffSessionAction(
  _prevState: StaffSessionFormState,
  formData: FormData,
): Promise<StaffSessionFormState> {
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!UUID_PATTERN.test(sessionId)) return error(MESSAGES.invalidRequest);

  const nextStatus = parseSessionTransitionStatus(
    String(formData.get("status") ?? ""),
  );

  if (nextStatus === null) return error(MESSAGES.invalidStatus);

  // 로그인 + 활성 membership(director|teacher) + 활성 기관까지 DB가 판정한다.
  const { supabase } = await requireStaff();

  // RLS가 접근 범위를 결정한다.
  // 다른 반·다른 기관 수업이면 여기서 0건이 되어 아래에서 notFound로 끝난다.
  const { data, error: lookupError } = await supabase
    .from("class_sessions")
    .select(
      "id, class_program_assignment_id, class_id, program_id, lesson_id, status",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (lookupError) {
    logFailure("session lookup", lookupError.message);
    return error(MESSAGES.notFound);
  }

  if (!data) return error(MESSAGES.notFound);

  const session = data as unknown as SessionContextRow;

  if (session.status === "completed" || session.status === "cancelled") {
    return error(MESSAGES.terminal);
  }

  const allowed =
    session.status === "scheduled"
      ? ["in_progress", "completed", "cancelled"]
      : ["completed", "cancelled"];

  if (!allowed.includes(nextStatus)) return error(MESSAGES.invalidTransition);

  // 수업을 "진행"시키는 경로에서만 부모를 다시 본다.
  if (requiresActiveParents(nextStatus)) {
    const valid = await parentsStillValid(supabase, session);

    if (!valid) return error(MESSAGES.parentsInactive);
  }

  // ★ .select().maybeSingle()이 반드시 필요하다.
  //   PostgREST의 PATCH는 return=representation이 없으면 204를 돌려주고,
  //   조건에 맞는 행이 0개여도 { data: null, error: null }이 온다.
  //   아래 status 가드는 경합을 제대로 막아 주지만, error만 확인하면
  //   "다른 사람이 먼저 처리해서 아무것도 안 바뀐 경우"를 성공으로 착각한다.
  const { data: updated, error: updateError } = await supabase
    .from("class_sessions")
    .update({ status: nextStatus })
    .eq("id", sessionId)
    .in("status", ["scheduled", "in_progress"])
    .select("id")
    .maybeSingle();

  if (updateError) {
    // trigger가 막은 경우다. 어떤 규칙인지는 서버 로그로만 남긴다.
    if ((updateError as { code?: string }).code === CHECK_VIOLATION) {
      logFailure("db rule", updateError.message);
      return error(MESSAGES.parentsInactive);
    }

    logFailure("transition", updateError.message);
    return error(MESSAGES.failure);
  }

  if (!updated) return error(MESSAGES.stale);

  refresh();

  return {
    phase: "success",
    message:
      nextStatus === "in_progress"
        ? MESSAGES.started
        : nextStatus === "completed"
          ? MESSAGES.completed
          : MESSAGES.cancelled,
  };
}

/**
 * 부모가 지금도 유효한가 — 20260826의 enforce_class_session_update와 같은 기준.
 *
 * 06B의 동명 함수와 규칙은 같지만 그쪽은 Admin Action 내부 함수라 가져올 수 없다.
 * 판정 기준은 저장된 행(session.*)이다. Client가 보낸 값은 쓰지 않는다.
 */
async function parentsStillValid(
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"],
  session: SessionContextRow,
): Promise<boolean> {
  const [assignment, classRow, program, lesson] = await Promise.all([
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
    statusOf(assignment) === "active" &&
    statusOf(classRow) === "active" &&
    statusOf(program) === "published" &&
    statusOf(lesson) === "published"
  );
}
