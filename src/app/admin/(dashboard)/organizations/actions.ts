"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { parseInstitutionType } from "@/lib/admin/organization-filters";
import { findAuthUserIdByEmail } from "@/lib/admin/director-invite";
import { createAuthAdminClient } from "@/lib/supabase/admin";
import { buildAppUrl } from "@/lib/env/app-url";
import type { OrganizationFormState } from "./form-state";
import type { DirectorInviteState } from "./invite-state";

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

// =========================================================
// 원장 초대
// =========================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INVITE_MESSAGES = {
  invalidName: "원장 이름을 1~50자로 입력해주세요.",
  invalidEmail: "이메일 형식을 확인해주세요.",
  organizationNotFound: "기관 정보를 확인할 수 없습니다.",
  alreadyMember: "이미 이 기관에 등록된 원장입니다.",
  alreadyOtherRole: "이미 이 기관에 다른 역할로 등록된 계정입니다.",
  inviteFailed: "초대 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
  linkFailed: "기관 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
  invited: "초대 메일을 보냈습니다.",
  linkedExisting:
    "이미 등록된 계정이라 초대 메일 없이 이 기관의 원장으로 연결했습니다.",
} as const;

/**
 * 원장 초대.
 *
 * 흐름
 *   1. requireAdmin()  — SOYES 운영자만 실행 가능
 *   2. 기관 존재 확인   — Client가 보낸 organization_id를 그대로 믿지 않는다
 *   3. Auth Admin으로 초대 메일 발송 (Secret Key를 쓰는 유일한 지점)
 *      실패 시 "이미 가입된 계정"인지 확인하고 그렇다면 연결만 진행한다
 *   4. organization_members 연결은 **관리자 세션 Client + RLS**로 수행 (Secret Key 미사용)
 *
 * 재시도 안전성(원자성)
 *   - Auth User는 만들어졌는데 membership 연결이 실패한 경우, 같은 폼을 다시 제출하면
 *     3번이 "이미 가입됨"으로 빠지고 4번만 다시 시도되어 정상 복구된다.
 *   - 이미 연결된 경우에는 unique(organization_id, user_id)를 존중해 중복 행을 만들지 않고
 *     안내 메시지만 돌려준다.
 */
export async function inviteDirectorAction(
  _prevState: DirectorInviteState,
  formData: FormData,
): Promise<DirectorInviteState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!UUID_PATTERN.test(organizationId)) {
    return { phase: "error", message: INVITE_MESSAGES.organizationNotFound };
  }

  if (displayName.length < 1 || displayName.length > 50) {
    return { phase: "error", message: INVITE_MESSAGES.invalidName };
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    return { phase: "error", message: INVITE_MESSAGES.invalidEmail };
  }

  const { supabase } = await requireAdmin();

  // 기관이 실제로 존재하는지(그리고 관리자가 볼 수 있는지) RLS로 확인한다.
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    if (organizationError) {
      console.error(
        "[admin/organizations] invite: organization lookup failed:",
        organizationError.message,
      );
    }
    return { phase: "error", message: INVITE_MESSAGES.organizationNotFound };
  }

  // --- Auth Admin (Secret Key) 사용 구간 ---
  let userId: string | null = null;
  let didSendInvite = false;

  try {
    const authAdmin = createAuthAdminClient();

    const { data: invited, error: inviteError } =
      await authAdmin.auth.admin.inviteUserByEmail(email, {
        // 민감정보는 metadata에 넣지 않는다. display_name만 최소로 전달한다.
        // 20260815의 auth.users 트리거가 이 값을 public.profiles.display_name으로 옮긴다.
        data: { display_name: displayName },
        redirectTo: buildAppUrl("/auth/confirm"),
      });

    if (!inviteError && invited?.user) {
      userId = invited.user.id;
      didSendInvite = true;
    } else {
      if (inviteError) {
        console.error(
          "[admin/organizations] inviteUserByEmail failed:",
          inviteError.message,
        );
      }
      // 이미 가입된 이메일이면 초대는 실패하지만 연결은 계속 진행할 수 있다.
      userId = await findAuthUserIdByEmail(email);
    }
  } catch (error) {
    console.error("[admin/organizations] auth admin call threw:", error);
    return { phase: "error", message: INVITE_MESSAGES.inviteFailed };
  }
  // --- Auth Admin 사용 구간 끝. 이후는 관리자 세션 Client + RLS ---

  if (!userId) {
    return { phase: "error", message: INVITE_MESSAGES.inviteFailed };
  }

  const { data: existingMember, error: existingError } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error(
      "[admin/organizations] membership lookup failed:",
      existingError.message,
    );
    return { phase: "error", message: INVITE_MESSAGES.linkFailed };
  }

  if (existingMember) {
    const role = (existingMember as { role: string }).role;
    return {
      phase: "error",
      message:
        role === "director"
          ? INVITE_MESSAGES.alreadyMember
          : INVITE_MESSAGES.alreadyOtherRole,
    };
  }

  // status는 'active'로 둔다.
  // 초대를 수락하기 전에는 Auth 세션 자체가 없어 Data API에 접근할 수 없으므로
  // 이 시점의 active membership만으로는 어떤 권한도 발생하지 않는다.
  // (invited → active 전환용 별도 RPC 없이 현재 Foundation으로 안전하게 동작한다.)
  const { error: insertError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role: "director",
      status: "active",
    });

  if (insertError) {
    // 23505 = unique 위반. 동시 제출 경합이면 이미 연결된 것으로 본다.
    if ((insertError as { code?: string }).code === "23505") {
      return { phase: "error", message: INVITE_MESSAGES.alreadyMember };
    }

    console.error(
      "[admin/organizations] membership insert failed:",
      insertError.message,
    );
    return { phase: "error", message: INVITE_MESSAGES.linkFailed };
  }

  refresh();

  return {
    phase: "success",
    message: didSendInvite
      ? INVITE_MESSAGES.invited
      : INVITE_MESSAGES.linkedExisting,
  };
}
