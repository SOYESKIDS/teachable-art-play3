"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import {
  parseAssignmentCloseStatus,
  parseAssignmentStartDate,
} from "@/lib/admin/class-program";
import type { AssignmentStatus } from "@/types/class-program";
import type { ClassChildFormState } from "./class-child-state";

/**
 * 반-프로그램 배정 Server Action.
 *
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 상태 타입은 ./class-child-state.ts의 ClassChildFormState를 재사용한다
 * (형태가 같은데 타입을 새로 만들 이유가 없다 — teacher-assignment-actions.ts와 동일한 판단).
 *
 * 보안 원칙 (기존 Admin Action과 동일)
 *   1. requireAdmin()으로 시작한다.
 *   2. Client가 보낸 id는 전부 UUID 형식부터 확인한다.
 *   3. ★ 반과 프로그램이 정말 조건을 만족하는지 서버에서 다시 조회해 확인한다.
 *      RLS는 SOYES 운영자에게 모든 기관·모든 프로그램을 열어주므로
 *      "다른 기관 반 id" 또는 "draft 프로그램 id" 조작을 RLS가 막아주지 않는다.
 *   4. Data API 호출은 전부 관리자 세션 Client + RLS로 한다. Secret Key를 쓰지 않는다.
 *
 * ★ 배정은 생성 이후 "종료"만 가능하다.
 *   start_date를 포함해 어떤 값도 수정하지 않는다. UPDATE로 나가는 컬럼은 status 하나뿐이다.
 *   (DB GRANT는 update(start_date, status)까지 열려 있지만, 이번 단계에서는
 *    application layer에서 start_date를 건드리지 않는 정책으로 좁힌다.
 *    DB 쪽 조이기는 별도 migration에서 다룬다.)
 *   잘못 배정했다면 취소 처리 후 새로 배정한다(이력 보존).
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation — class_program_assignments_active_class_program_key 충돌 */
const UNIQUE_VIOLATION = "23505";

const MESSAGES = {
  invalidOrganization: "기관 정보를 확인할 수 없습니다.",
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  invalidStartDate: "시작일을 올바른 날짜로 입력하거나 비워두세요.",
  invalidStatus: "완료 또는 취소 중에서 선택해주세요.",
  classNotFound: "반 정보를 찾을 수 없습니다.",
  classNotInOrganization: "이 기관에 속한 반이 아닙니다.",
  classNotActive:
    "보관된 반에는 새로 프로그램을 배정할 수 없습니다. 운영 중인 반을 선택해주세요.",
  programNotFound: "프로그램 정보를 찾을 수 없습니다.",
  programNotPublished: "게시된 프로그램만 반에 배정할 수 있습니다.",
  duplicateActive: "이 반에는 해당 프로그램이 이미 운영 중입니다.",
  assignmentNotFound: "운영 정보를 찾을 수 없습니다.",
  assignmentNotInOrganization: "이 기관의 운영 정보가 아닙니다.",
  notActive:
    "운영 중인 배정만 종료할 수 있습니다. 이미 완료·취소된 이력은 다시 변경할 수 없습니다.",
  createFailure: "프로그램을 배정하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updateFailure: "운영 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.",
  created: "프로그램을 배정했습니다.",
  closed: "운영 상태를 변경했습니다.",
} as const;

function error(message: string): ClassChildFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[admin/class-program] ${scope} failed: ${message}`);
}

/**
 * 반에 프로그램을 새로 배정한다.
 *
 * 신규 배정의 status는 사용자가 고르지 않는다. 항상 'active'다.
 * 완료/취소 상태로 시작하는 배정은 의미가 없기 때문이다.
 */
export async function createClassProgramAssignmentAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  const programId = String(formData.get("programId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return error(MESSAGES.invalidOrganization);
  }

  if (!UUID_PATTERN.test(classId) || !UUID_PATTERN.test(programId)) {
    return error(MESSAGES.invalidRequest);
  }

  const startDate = parseAssignmentStartDate(
    String(formData.get("start_date") ?? ""),
  );

  if (!startDate.ok) return error(MESSAGES.invalidStartDate);

  const { supabase } = await requireAdmin();

  // 1. 기관 존재 확인 — Client가 보낸 organization_id를 그대로 믿지 않는다.
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    if (organizationError) {
      logFailure("organization lookup", organizationError.message);
    }
    return error(MESSAGES.invalidOrganization);
  }

  // 2~4. 반이 이 기관 소속이고 운영 중인지 확인한다.
  //      다른 기관의 반 id를 보내도 여기서 차단된다.
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, organization_id, status")
    .eq("id", classId)
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
    return error(MESSAGES.classNotInOrganization);
  }

  if (classInfo.status !== "active") return error(MESSAGES.classNotActive);

  // 5~6. 프로그램이 존재하고 게시 상태인지 확인한다.
  //      draft / archived id를 보내도 여기서 차단된다.
  const { data: programRow, error: programError } = await supabase
    .from("curriculum_programs")
    .select("id, status")
    .eq("id", programId)
    .maybeSingle();

  if (programError) {
    logFailure("program lookup", programError.message);
    return error(MESSAGES.programNotFound);
  }

  if (!programRow) return error(MESSAGES.programNotFound);

  if ((programRow as unknown as { status: string }).status !== "published") {
    return error(MESSAGES.programNotPublished);
  }

  // 7. 같은 반 + 같은 프로그램이 이미 운영 중인지 사전 확인한다.
  //    최종 방어선은 partial unique index지만, 그 오류 문구는 사용자에게 보여줄 수 없다.
  const { data: existing, error: existingError } = await supabase
    .from("class_program_assignments")
    .select("id")
    .eq("class_id", classId)
    .eq("program_id", programId)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) {
    logFailure("duplicate lookup", existingError.message);
    return error(MESSAGES.createFailure);
  }

  if (existing) return error(MESSAGES.duplicateActive);

  // 8. INSERT. organization_id는 검증된 URL 기관 id를 그대로 쓴다.
  const { error: insertError } = await supabase
    .from("class_program_assignments")
    .insert({
      organization_id: organizationId,
      class_id: classId,
      program_id: programId,
      start_date: startDate.value,
      status: "active",
    });

  if (insertError) {
    // 사전 확인과 INSERT 사이 경합으로 중복이 생길 수 있어 unique 위반도 같은 문구로 돌려준다.
    if ((insertError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicateActive);
    }

    logFailure("assignment insert", insertError.message);
    return error(MESSAGES.createFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.created };
}

/**
 * 운영 중인 배정을 종료한다(완료 / 취소).
 *
 * 이 Action이 하는 일은 status 하나를 바꾸는 것뿐이다.
 *   active → completed  : 정상 종료
 *   active → cancelled  : 중도 취소
 *   그 외 전부 금지 (active 재지정, terminal에서의 모든 변경)
 *
 * ★ 반이나 프로그램이 나중에 보관되어도 이 종료는 막지 않는다.
 *   과거 운영을 마무리하는 일은 언제나 가능해야 하므로
 *   classes / curriculum_programs를 다시 조회하지 않는다.
 *   (DB의 UPDATE Policy도 같은 이유로 active class / published program을 요구하지 않는다.)
 */
export async function closeClassProgramAssignmentAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");

  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(assignmentId)) {
    return error(MESSAGES.invalidRequest);
  }

  // completed / cancelled만 통과한다. 'active'는 여기서 걸러진다.
  const status = parseAssignmentCloseStatus(String(formData.get("status") ?? ""));

  if (status === null) return error(MESSAGES.invalidStatus);

  const { supabase } = await requireAdmin();

  // ★ 이 배정이 정말 이 기관의 것인지 확인한다.
  //   다른 기관의 배정 id를 보내도 여기서 차단된다.
  const { data: current, error: currentError } = await supabase
    .from("class_program_assignments")
    .select("id, organization_id, status")
    .eq("id", assignmentId)
    .maybeSingle();

  if (currentError) {
    logFailure("assignment lookup", currentError.message);
    return error(MESSAGES.assignmentNotFound);
  }

  if (!current) return error(MESSAGES.assignmentNotFound);

  const currentRow = current as unknown as {
    organization_id: string;
    status: AssignmentStatus;
  };

  if (currentRow.organization_id !== organizationId) {
    return error(MESSAGES.assignmentNotInOrganization);
  }

  // 종료할 수 있는 것은 운영 중인 배정뿐이다.
  // 완료·취소된 이력은 어떤 방향으로도 다시 바꾸지 않는다.
  if (currentRow.status !== "active") return error(MESSAGES.notActive);

  // payload는 status 하나뿐이다.
  // start_date / organization_id / class_id / program_id는 여기 들어가지 않는다.
  const { error: updateError } = await supabase
    .from("class_program_assignments")
    .update({ status })
    .eq("id", assignmentId)
    .eq("organization_id", organizationId)
    // 조회와 UPDATE 사이에 다른 관리자가 먼저 종료했을 수 있어 조건을 한 번 더 건다.
    .eq("status", "active");

  if (updateError) {
    logFailure("assignment close", updateError.message);
    return error(MESSAGES.updateFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.closed };
}
