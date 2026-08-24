"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import type { ClassChildFormState } from "./class-child-state";

/**
 * 담당 교사 배정 Server Action.
 *
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 상태 타입은 ./class-child-state.ts의 ClassChildFormState를 그대로 재사용한다
 * (형태가 같은데 타입을 새로 만들 이유가 없다).
 *
 * class_teachers에는 UPDATE 권한이 없다(GRANT · Policy 모두 없음).
 * 따라서 배정 변경은 항상 "새로 생긴 것 INSERT + 빠진 것 DELETE"로 처리한다.
 * 순서가 INSERT 먼저인 이유는 아래 7~8번 주석 참조(중간 실패 시 배정 손실 방지).
 *
 * 보안 원칙 (class-child-actions.ts와 동일)
 *   1. requireAdmin()으로 시작한다.
 *   2. Client가 보낸 id는 전부 UUID 형식부터 확인한다.
 *   3. ★ 교사 membership과 반이 정말 이 기관 소속인지 서버에서 다시 조회해 확인한다.
 *      RLS는 SOYES 운영자에게 모든 기관을 열어주므로 "다른 기관 id 조작"을 막지 못한다.
 *   4. Data API 호출은 전부 관리자 세션 Client + RLS로 한다. Secret Key를 쓰지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 한 번에 배정할 수 있는 반 수 상한 — 조작된 대량 요청을 막는 안전장치 */
const MAX_SELECTED_CLASSES = 100;

const MESSAGES = {
  invalidOrganization: "기관 정보를 확인할 수 없습니다.",
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  tooManyClasses: "한 번에 배정할 수 있는 반 수를 초과했습니다.",
  teacherNotFound: "교사 정보를 찾을 수 없습니다.",
  teacherNotInOrganization: "이 기관에 속한 교사가 아닙니다.",
  notTeacherRole: "교사 역할의 구성원만 반에 배정할 수 있습니다.",
  teacherNotActive:
    "활성 상태인 교사만 반에 배정할 수 있습니다. 초대 대기·비활성 교사는 배정할 수 없습니다.",
  classNotFound: "반 정보를 찾을 수 없습니다.",
  classNotInOrganization: "이 기관에 속한 반이 아닙니다.",
  archivedClassAssign: "보관된 반에는 새로 담당교사를 배정할 수 없습니다.",
  loadFailure: "현재 배정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
  removeFailure: "담당 해제에 실패했습니다. 잠시 후 다시 시도해주세요.",
  addFailure: "담당 반 배정에 실패했습니다. 잠시 후 다시 시도해주세요.",
  saved: "담당 반을 저장했습니다.",
  unchanged: "변경된 내용이 없습니다.",
} as const;

function error(message: string): ClassChildFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[admin/class-teacher] ${scope} failed: ${message}`);
}

/**
 * 담당 반 저장.
 *
 * 폼은 체크된 반만 `class_id`로 보낸다. 하나도 체크하지 않으면 빈 배열이 되고,
 * 그 결과 기존 배정이 전부 해제되어 교사는 "미배정" 상태가 된다(요구된 동작).
 */
export async function saveTeacherAssignmentsAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const membershipId = String(formData.get("organizationMemberId") ?? "");

  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(membershipId)) {
    return error(MESSAGES.invalidOrganization);
  }

  const rawClassIds = formData
    .getAll("class_id")
    .map((value) => String(value).trim())
    .filter((value) => value !== "");

  if (rawClassIds.length > MAX_SELECTED_CLASSES) {
    return error(MESSAGES.tooManyClasses);
  }

  if (rawClassIds.some((classId) => !UUID_PATTERN.test(classId))) {
    return error(MESSAGES.invalidRequest);
  }

  // 같은 반이 중복 전송되어도 한 번만 처리한다(unique 위반 방지).
  const selectedClassIds = [...new Set(rawClassIds)];

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

  // 2~4. membership이 이 기관 소속인지 / role=teacher / status=active 확인.
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id, organization_id, role, status")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipError) {
    logFailure("membership lookup", membershipError.message);
    return error(MESSAGES.teacherNotFound);
  }

  if (!membership) {
    return error(MESSAGES.teacherNotFound);
  }

  const membershipRow = membership as unknown as {
    organization_id: string;
    role: string;
    status: string;
  };

  if (membershipRow.organization_id !== organizationId) {
    return error(MESSAGES.teacherNotInOrganization);
  }

  if (membershipRow.role !== "teacher") {
    return error(MESSAGES.notTeacherRole);
  }

  if (membershipRow.status !== "active") {
    return error(MESSAGES.teacherNotActive);
  }

  // 5. 현재 배정 조회 — 이 교사의 행만 본다.
  const { data: currentRows, error: currentError } = await supabase
    .from("class_teachers")
    .select("id, class_id")
    .eq("organization_id", organizationId)
    .eq("organization_member_id", membershipId);

  if (currentError) {
    logFailure("current assignments", currentError.message);
    return error(MESSAGES.loadFailure);
  }

  const currentClassIds = ((currentRows ?? []) as unknown as {
    class_id: string;
  }[]).map((row) => row.class_id);

  const currentSet = new Set(currentClassIds);
  const selectedSet = new Set(selectedClassIds);

  // 변경분만 처리한다. 그대로 유지되는 배정은 건드리지 않는다(불필요한 delete/reinsert 없음).
  const toAdd = selectedClassIds.filter((classId) => !currentSet.has(classId));
  const toRemove = currentClassIds.filter(
    (classId) => !selectedSet.has(classId),
  );

  if (toAdd.length === 0 && toRemove.length === 0) {
    return { phase: "success", message: MESSAGES.unchanged };
  }

  // 6. 새로 배정할 반만 검증한다. 반 하나씩 조회하지 않고 한 번에 가져온다(N+1 방지).
  //    기존 배정(archived 포함)은 그대로 두거나 해제만 하므로 여기서 검사하지 않는다.
  if (toAdd.length > 0) {
    const { data: classRows, error: classError } = await supabase
      .from("classes")
      .select("id, organization_id, status")
      .in("id", toAdd);

    if (classError) {
      logFailure("class lookup", classError.message);
      return error(MESSAGES.classNotFound);
    }

    const found = (classRows ?? []) as unknown as {
      id: string;
      organization_id: string;
      status: string;
    }[];

    if (found.length !== toAdd.length) {
      return error(MESSAGES.classNotFound);
    }

    for (const classRow of found) {
      if (classRow.organization_id !== organizationId) {
        return error(MESSAGES.classNotInOrganization);
      }

      // 보관된 반에는 새로 배정할 수 없다(기존 배정 유지·해제는 위에서 이미 제외됨).
      if (classRow.status !== "active") {
        return error(MESSAGES.archivedClassAssign);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // 7~8. 신규 배정(INSERT) → 해제(DELETE) 순서로 실행한다.
  //
  // 두 문장을 한 트랜잭션으로 묶을 수단이 없다(RPC/DB function을 추가하지 않는 범위).
  // 그래서 중간에 실패했을 때 "어느 쪽으로 깨지는가"를 선택해야 하고,
  // 배정이 남는 쪽(초과)이 배정이 사라지는 쪽(손실)보다 안전하다.
  //
  //   DELETE 먼저: DELETE 성공 후 INSERT 실패 → 기존 배정을 잃는다(복구하려면 다시 배정해야 함).
  //   INSERT 먼저: INSERT 실패 시 아직 아무것도 지우지 않았으므로 기존 배정이 그대로 남는다.
  //                INSERT 성공 후 DELETE 실패해도 "새 반이 추가되고 옛 반이 남은" 상태라
  //                화면에 그대로 보이고, 다시 저장하면 남은 해제분만 재시도된다.
  //
  // 두 집합은 diff 결과라 서로 겹치지 않는다(toAdd = selected − current, toRemove = current − selected).
  // 따라서 INSERT를 먼저 해도 unique(class_id, organization_member_id)와 충돌하지 않는다.
  // toAdd의 어떤 반도 현재 배정에 존재하지 않기 때문이다.
  // ─────────────────────────────────────────────────────────

  // 7. 신규 배정. organization_id는 검증된 URL 기관 id를 그대로 쓴다.
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("class_teachers").insert(
      toAdd.map((classId) => ({
        organization_id: organizationId,
        class_id: classId,
        organization_member_id: membershipId,
      })),
    );

    if (insertError) {
      // 아직 DELETE를 실행하지 않았으므로 기존 배정은 하나도 사라지지 않았다.
      logFailure("assignment insert", insertError.message);
      return error(MESSAGES.addFailure);
    }
  }

  // 8. 해제. INSERT가 성공한 뒤에만 실행한다.
  //    organization_id / organization_member_id를 함께 걸어
  //    검증 이후 경합이 생겨도 다른 교사·기관의 배정이 지워지지 않게 한다.
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("class_teachers")
      .delete()
      .eq("organization_id", organizationId)
      .eq("organization_member_id", membershipId)
      .in("class_id", toRemove);

    if (deleteError) {
      logFailure("assignment delete", deleteError.message);
      return error(MESSAGES.removeFailure);
    }
  }

  refresh();

  return { phase: "success", message: MESSAGES.saved };
}
