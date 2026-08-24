"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import {
  parseAgeGroup,
  parseBirthYear,
  parseChildStatus,
  parseClassStatus,
  parseEntityName,
  parseSchoolYear,
  SCHOOL_YEAR_MAX,
  SCHOOL_YEAR_MIN,
} from "@/lib/admin/class-child";
import type { ClassChildFormState } from "./class-child-state";

/**
 * 반 / 원아 관리 Server Action.
 *
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./class-child-state.ts에 있다.
 *
 * 보안 원칙 (organizations/actions.ts와 동일)
 *   1. 모든 Action은 requireAdmin()으로 시작한다. Proxy 게이트와 무관하게 독립 검증한다.
 *   2. Client가 보낸 id는 전부 UUID 형식부터 확인한다.
 *   3. ★ 대상 행이 정말 이 기관 소속인지 서버에서 다시 조회해 확인한다.
 *      RLS는 SOYES 운영자에게 모든 기관을 열어주므로, "다른 기관 id 조작"은
 *      RLS가 막아주지 않는다. 이 검증이 유일한 방어선이다.
 *   4. Data API 호출은 전부 **관리자 세션 Client + RLS**로 한다. Secret Key를 쓰지 않는다.
 *   5. organization_id는 UPDATE payload에 절대 넣지 않는다(DB GRANT에서도 제외되어 있다).
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation — classes의 partial unique index 충돌 */
const UNIQUE_VIOLATION = "23505";

const MESSAGES = {
  invalidOrganization: "기관 정보를 확인할 수 없습니다.",
  invalidName: "이름을 1~50자로 입력해주세요.",
  invalidSchoolYear: `학년도를 ${SCHOOL_YEAR_MIN}~${SCHOOL_YEAR_MAX} 사이로 입력해주세요.`,
  invalidBirthYear: "출생연도를 2000~2100 사이로 입력하거나 비워두세요.",
  invalidStatus: "상태 값을 확인해주세요.",
  duplicateClass: "같은 학년도에 동일한 이름의 운영 중인 반이 이미 있습니다.",
  classNotFound: "반 정보를 찾을 수 없습니다.",
  classNotInOrganization: "이 기관에 속한 반이 아닙니다.",
  archivedClassAssign:
    "보관된 반에는 새로 배정할 수 없습니다. 운영 중인 반을 선택해주세요.",
  childNotFound: "원아 정보를 찾을 수 없습니다.",
  childNotInOrganization: "이 기관에 속한 원아가 아닙니다.",
  classCreateFailure: "반을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  classUpdateFailure: "반 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
  childCreateFailure: "원아를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  childUpdateFailure:
    "원아 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
  classCreated: "반을 등록했습니다.",
  classUpdated: "반 정보를 저장했습니다.",
  childCreated: "원아를 등록했습니다.",
  childUpdated: "원아 정보를 저장했습니다.",
} as const;

function error(message: string): ClassChildFormState {
  return { phase: "error", message };
}

function success(message: string): ClassChildFormState {
  return { phase: "success", message };
}

/** DB raw error는 서버 로그에만 남기고 화면에는 정제된 문구만 보낸다 */
function logFailure(scope: string, message: string) {
  console.error(`[admin/class-child] ${scope} failed: ${message}`);
}

/**
 * 이 기관에 속한 반인지 확인하고 반 정보를 돌려준다.
 * 다른 기관 id를 조작해 보내도 여기서 걸린다.
 */
async function loadClassInOrganization(
  supabase: SupabaseClient,
  classId: string,
  organizationId: string,
): Promise<
  | { ok: true; status: "active" | "archived" }
  | { ok: false; state: ClassChildFormState }
> {
  const { data, error: queryError } = await supabase
    .from("classes")
    .select("id, organization_id, status")
    .eq("id", classId)
    .maybeSingle();

  if (queryError) {
    logFailure("class lookup", queryError.message);
    return { ok: false, state: error(MESSAGES.classNotFound) };
  }

  if (!data) {
    return { ok: false, state: error(MESSAGES.classNotFound) };
  }

  const row = data as unknown as {
    organization_id: string;
    status: "active" | "archived";
  };

  if (row.organization_id !== organizationId) {
    return { ok: false, state: error(MESSAGES.classNotInOrganization) };
  }

  return { ok: true, status: row.status };
}

/**
 * 폼에서 온 class_id를 검증한다.
 *   - "" (미배정) → null
 *   - 값이 있으면 이 기관 소속인지 확인
 *   - `requireActive`가 true면 보관된 반으로의 신규 배정을 막는다
 *
 * DB의 복합 FK (class_id, organization_id) → classes(id, organization_id)가
 * 최종 방어선이지만, 그 에러 문구는 사용자에게 보여줄 수 없어 여기서 먼저 안내한다.
 */
async function resolveClassId(
  supabase: SupabaseClient,
  raw: string,
  organizationId: string,
  options: { requireActive: boolean },
): Promise<
  { ok: true; classId: string | null } | { ok: false; state: ClassChildFormState }
> {
  const value = raw.trim();

  if (value === "") {
    return { ok: true, classId: null };
  }

  if (!UUID_PATTERN.test(value)) {
    return { ok: false, state: error(MESSAGES.classNotFound) };
  }

  const found = await loadClassInOrganization(supabase, value, organizationId);

  if (!found.ok) {
    return found;
  }

  if (options.requireActive && found.status !== "active") {
    return { ok: false, state: error(MESSAGES.archivedClassAssign) };
  }

  return { ok: true, classId: value };
}

// =========================================================
// 반
// =========================================================

export async function createClassAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return error(MESSAGES.invalidOrganization);
  }

  const name = parseEntityName(formData.get("name"));

  if (!name) {
    return error(MESSAGES.invalidName);
  }

  const schoolYear = parseSchoolYear(String(formData.get("school_year") ?? ""));

  if (schoolYear === null) {
    return error(MESSAGES.invalidSchoolYear);
  }

  const status = parseClassStatus(String(formData.get("status") ?? ""));

  if (status === null) {
    return error(MESSAGES.invalidStatus);
  }

  // 화이트리스트를 통과하지 못한 값은 전부 null(미설정)로 떨어진다.
  const ageGroup = parseAgeGroup(String(formData.get("age_group") ?? ""));

  const { supabase } = await requireAdmin();

  // 기관이 실제로 존재하는지(그리고 관리자가 볼 수 있는지) RLS로 확인한다.
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    if (organizationError) logFailure("organization lookup", organizationError.message);
    return error(MESSAGES.invalidOrganization);
  }

  // organization_id는 Client 입력이 아니라 검증된 URL 기관 id를 그대로 쓴다.
  const { error: insertError } = await supabase.from("classes").insert({
    organization_id: organizationId,
    name,
    age_group: ageGroup,
    school_year: schoolYear,
    status,
  });

  if (insertError) {
    if ((insertError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicateClass);
    }

    logFailure("class insert", insertError.message);
    return error(MESSAGES.classCreateFailure);
  }

  refresh();

  return success(MESSAGES.classCreated);
}

export async function updateClassAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const classId = String(formData.get("classId") ?? "");

  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(classId)) {
    return error(MESSAGES.invalidOrganization);
  }

  const name = parseEntityName(formData.get("name"));

  if (!name) {
    return error(MESSAGES.invalidName);
  }

  const schoolYear = parseSchoolYear(String(formData.get("school_year") ?? ""));

  if (schoolYear === null) {
    return error(MESSAGES.invalidSchoolYear);
  }

  const status = parseClassStatus(String(formData.get("status") ?? ""));

  if (status === null) {
    return error(MESSAGES.invalidStatus);
  }

  const ageGroup = parseAgeGroup(String(formData.get("age_group") ?? ""));

  const { supabase } = await requireAdmin();

  // ★ 다른 기관의 반 id를 보내도 여기서 차단된다.
  const owned = await loadClassInOrganization(supabase, classId, organizationId);

  if (!owned.ok) {
    return owned.state;
  }

  // organization_id는 payload에 넣지 않는다. DB UPDATE GRANT에서도 제외되어 있다.
  const { error: updateError } = await supabase
    .from("classes")
    .update({ name, age_group: ageGroup, school_year: schoolYear, status })
    .eq("id", classId)
    .eq("organization_id", organizationId);

  if (updateError) {
    if ((updateError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicateClass);
    }

    logFailure("class update", updateError.message);
    return error(MESSAGES.classUpdateFailure);
  }

  refresh();

  return success(MESSAGES.classUpdated);
}

// =========================================================
// 원아
// =========================================================

export async function createChildAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return error(MESSAGES.invalidOrganization);
  }

  const name = parseEntityName(formData.get("name"));

  if (!name) {
    return error(MESSAGES.invalidName);
  }

  const birthYear = parseBirthYear(String(formData.get("birth_year") ?? ""));

  if (!birthYear.ok) {
    return error(MESSAGES.invalidBirthYear);
  }

  const status = parseChildStatus(String(formData.get("status") ?? ""));

  if (status === null) {
    return error(MESSAGES.invalidStatus);
  }

  const { supabase } = await requireAdmin();

  // 신규 등록은 운영 중인 반에만 배정할 수 있다.
  const classId = await resolveClassId(
    supabase,
    String(formData.get("class_id") ?? ""),
    organizationId,
    { requireActive: true },
  );

  if (!classId.ok) {
    return classId.state;
  }

  const { error: insertError } = await supabase.from("children").insert({
    organization_id: organizationId,
    class_id: classId.classId,
    name,
    birth_year: birthYear.value,
    status,
  });

  if (insertError) {
    logFailure("child insert", insertError.message);
    return error(MESSAGES.childCreateFailure);
  }

  refresh();

  return success(MESSAGES.childCreated);
}

export async function updateChildAction(
  _prevState: ClassChildFormState,
  formData: FormData,
): Promise<ClassChildFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const childId = String(formData.get("childId") ?? "");

  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(childId)) {
    return error(MESSAGES.invalidOrganization);
  }

  const name = parseEntityName(formData.get("name"));

  if (!name) {
    return error(MESSAGES.invalidName);
  }

  const birthYear = parseBirthYear(String(formData.get("birth_year") ?? ""));

  if (!birthYear.ok) {
    return error(MESSAGES.invalidBirthYear);
  }

  const status = parseChildStatus(String(formData.get("status") ?? ""));

  if (status === null) {
    return error(MESSAGES.invalidStatus);
  }

  const { supabase } = await requireAdmin();

  // ★ 다른 기관의 원아 id를 보내도 여기서 차단된다.
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, organization_id, class_id")
    .eq("id", childId)
    .maybeSingle();

  if (childError) {
    logFailure("child lookup", childError.message);
    return error(MESSAGES.childNotFound);
  }

  if (!child) {
    return error(MESSAGES.childNotFound);
  }

  const childRow = child as unknown as {
    organization_id: string;
    class_id: string | null;
  };

  if (childRow.organization_id !== organizationId) {
    return error(MESSAGES.childNotInOrganization);
  }

  const rawClassId = String(formData.get("class_id") ?? "").trim();

  // 이미 보관된 반에 속한 원아가 그 반을 그대로 유지하는 것은 막지 않는다.
  // 반을 실제로 "옮기는" 경우에만 운영 중인 반이어야 한다.
  const keepsCurrentClass =
    rawClassId !== "" && rawClassId === (childRow.class_id ?? "");

  const classId = await resolveClassId(supabase, rawClassId, organizationId, {
    requireActive: !keepsCurrentClass,
  });

  if (!classId.ok) {
    return classId.state;
  }

  // organization_id는 payload에 넣지 않는다.
  const { error: updateError } = await supabase
    .from("children")
    .update({
      name,
      birth_year: birthYear.value,
      class_id: classId.classId,
      status,
    })
    .eq("id", childId)
    .eq("organization_id", organizationId);

  if (updateError) {
    logFailure("child update", updateError.message);
    return error(MESSAGES.childUpdateFailure);
  }

  refresh();

  return success(MESSAGES.childUpdated);
}
