import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 현재 로그인 사용자가 SOYES 관리자(role = admin, is_active = true)인지 DB에 직접 묻는다.
 *
 * 판정 주체는 항상 DB다.
 * - public.has_soyes_admin_access() → private.is_soyes_admin() → private.admin_users
 * - 이메일 하드코딩 비교 / user_metadata 기반 판정은 절대 하지 않는다.
 *
 * 세션이 없거나 함수 호출이 거부되면 false를 반환한다(실패 시 차단).
 */
export async function hasSoyesAdminAccess(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_soyes_admin_access");

  if (error) {
    // 내부 에러 내용은 화면에 노출하지 않고 서버 로그로만 남긴다.
    console.error("[admin] has_soyes_admin_access failed:", error.message);
    return false;
  }

  return data === true;
}

export interface AdminSession {
  supabase: SupabaseClient;
  email: string | null;
}

/**
 * Admin 영역 진입 게이트. Layout / Page / Server Action 각각에서 독립적으로 호출한다.
 *
 * 1. getClaims()로 JWT를 실제 검증해 로그인 사용자 확인
 * 2. DB에 관리자 여부 확인
 *
 * Proxy의 리다이렉트는 UX용 1차 게이트일 뿐이므로, 데이터를 만지는 지점마다
 * 이 검사를 다시 수행한다. 최종 방어선은 DB RLS다.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/admin/login");
  }

  const isAdmin = await hasSoyesAdminAccess(supabase);

  if (!isAdmin) {
    // G-2 cutover 후 Sales 는 is_soyes_admin 을 통과하지 않는다 → Sales Shell 로 안내 (권한 변화 없음)
    if ((await getHqRole(supabase)) === "sales") redirect("/sales");
    // Server Component 렌더 중에는 쿠키를 지울 수 없어 로그아웃 엔드포인트를 경유한다.
    redirect("/admin/logout?reason=forbidden");
  }

  return {
    supabase,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}

/** HQ 전역 역할 (DEC-079). admin ≠ sales. */
export type HqRole = "admin" | "sales";

/**
 * 현재 사용자의 HQ 역할을 DB 에 묻는다 (public.current_hq_role → private.admin_users).
 * 역할이 없거나 호출이 실패하면 null (차단).
 */
export async function getHqRole(supabase: SupabaseClient): Promise<HqRole | null> {
  const { data, error } = await supabase.rpc("current_hq_role");

  if (error) {
    console.error("[hq] current_hq_role failed:", error.message);
    return null;
  }

  return data === "admin" || data === "sales" ? data : null;
}

export interface HqSession extends AdminSession {
  role: HqRole;
}

/**
 * HQ Sales 전용 영역 게이트 (Sales Shell · DEC-097 · DEC-108).
 * Admin 이 들어오면 Admin 화면으로 보낸다 (역할을 섞지 않는다).
 */
export async function requireHqSales(): Promise<HqSession> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) redirect("/admin/login");

  const role = await getHqRole(supabase);

  if (role === "admin") redirect("/admin");
  if (role !== "sales") redirect("/admin/logout?reason=forbidden");

  return {
    supabase,
    email: typeof claims.email === "string" ? claims.email : null,
    role,
  };
}

/**
 * Admin · Sales 공통 업무(문의 관리) 게이트.
 * 데이터 범위는 DB RLS 가 역할별로 다시 판정한다.
 */
export async function requireHqStaff(): Promise<HqSession> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) redirect("/admin/login");

  const role = await getHqRole(supabase);

  if (role === null) redirect("/admin/logout?reason=forbidden");

  return {
    supabase,
    email: typeof claims.email === "string" ? claims.email : null,
    role,
  };
}
