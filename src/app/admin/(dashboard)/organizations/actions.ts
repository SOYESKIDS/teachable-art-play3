"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { parseInstitutionType } from "@/lib/admin/organization-filters";
import type { OrganizationFormState } from "./form-state";

/**
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./form-state.ts에 있다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES = {
  invalidName: "기관명을 1~100자로 입력해주세요.",
  createFailure: "기관을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updateFailure: "기관 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

/** DB check constraint와 동일하게 1~100자로 검증한다 */
function parseName(raw: FormDataEntryValue | null): string | null {
  const name = String(raw ?? "").trim();
  return name.length >= 1 && name.length <= 100 ? name : null;
}

export async function createOrganizationAction(
  _prevState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const name = parseName(formData.get("name"));

  if (!name) {
    return { phase: "error", message: MESSAGES.invalidName };
  }

  // 화이트리스트를 통과하지 못한 값은 전부 null(미지정)로 떨어진다.
  const institutionType = parseInstitutionType(
    String(formData.get("institution_type") ?? ""),
  );

  // Server Action은 Proxy 게이트와 무관하게 독립적으로 권한을 재확인한다.
  const { supabase } = await requireAdmin();

  // status는 Client에서 받지 않는다. DB default('active')를 그대로 쓴다.
  // GRANT도 (name, institution_type)만 열려 있어 다른 컬럼은 애초에 쓸 수 없다.
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, institution_type: institutionType })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "[admin/organizations] create failed:",
      error?.message ?? "no row returned",
    );
    return { phase: "error", message: MESSAGES.createFailure };
  }

  // redirect()는 내부적으로 예외를 던지므로 에러 처리 이후에 호출한다.
  redirect(`/admin/organizations/${data.id}`);
}

export async function updateOrganizationAction(
  _prevState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const name = parseName(formData.get("name"));

  if (!UUID_PATTERN.test(organizationId)) {
    return { phase: "error", message: MESSAGES.updateFailure };
  }

  if (!name) {
    return { phase: "error", message: MESSAGES.invalidName };
  }

  const institutionType = parseInstitutionType(
    String(formData.get("institution_type") ?? ""),
  );

  const { supabase } = await requireAdmin();

  // name / institution_type 두 컬럼만 UPDATE한다.
  // status는 컬럼 GRANT에서 제외되어 있어 여기서 다루지 않는다.
  const { error } = await supabase
    .from("organizations")
    .update({ name, institution_type: institutionType })
    .eq("id", organizationId);

  if (error) {
    console.error("[admin/organizations] update failed:", error.message);
    return { phase: "error", message: MESSAGES.updateFailure };
  }

  refresh();

  return { phase: "success", message: "기관 정보를 저장했습니다." };
}
