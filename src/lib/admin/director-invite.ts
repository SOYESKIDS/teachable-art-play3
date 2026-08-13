import { createAuthAdminClient } from "@/lib/supabase/admin";

/**
 * Auth Admin API를 쓰는 좁은 유틸.
 *
 * ⚠️ 서버에서만 호출한다. 반환값에 이메일 외의 사용자 정보를 담지 않고,
 * 사용자 목록 자체를 절대 밖으로 내보내거나 로그로 남기지 않는다.
 */

/** listUsers 스캔 상한 — 무한 페이지 순회를 막는다 */
const MAX_PAGES = 20;
const PER_PAGE = 200;

/**
 * 이미 가입된 이메일의 user_id를 찾는다.
 *
 * 설치된 @supabase/auth-js의 admin API에는 email 필터가 없어
 * listUsers를 페이지 단위로 훑고 **일치하는 순간 즉시 중단**한다.
 * 목록은 이 함수 밖으로 나가지 않으며 user_id만 돌려준다.
 *
 * (초대가 "이미 가입됨"으로 실패한 경우에만 호출되므로 일반 경로에서는 실행되지 않는다.)
 */
export async function findAuthUserIdByEmail(
  email: string,
): Promise<string | null> {
  const authAdmin = createAuthAdminClient();
  const target = email.trim().toLowerCase();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await authAdmin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });

    if (error) {
      console.error("[admin/invite] listUsers failed:", error.message);
      return null;
    }

    const users = data?.users ?? [];

    const found = users.find(
      (user) => (user.email ?? "").trim().toLowerCase() === target,
    );

    if (found) return found.id;

    if (users.length < PER_PAGE) return null;
  }

  console.error("[admin/invite] listUsers scan exceeded page limit");
  return null;
}

/** 관리 화면 표시용 이메일 조회. 실패해도 화면을 막지 않도록 null을 돌려준다. */
export async function fetchAuthEmailById(
  userId: string,
): Promise<string | null> {
  try {
    const authAdmin = createAuthAdminClient();
    const { data, error } = await authAdmin.auth.admin.getUserById(userId);

    if (error) {
      console.error("[admin/invite] getUserById failed:", error.message);
      return null;
    }

    return data?.user?.email ?? null;
  } catch (error) {
    console.error("[admin/invite] getUserById threw:", error);
    return null;
  }
}
