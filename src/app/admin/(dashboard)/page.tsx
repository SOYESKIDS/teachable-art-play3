import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchAdminDashboard } from "@/lib/admin/admin-dashboard-queries";
import { todayInSeoul } from "@/lib/staff/class-session-queries";
import { AdminOperationsDashboard } from "@/components/admin/AdminOperationsDashboard";

export const metadata: Metadata = {
  title: "운영 대시보드 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

/**
 * SERVICE-14 — 본사 운영 콘솔 홈 (/admin).
 *
 * ★ 권한
 *   Layout 에서도 검사하지만 데이터를 다루는 페이지에서 독립적으로 다시 확인한다.
 *   requireAdmin() 은 JWT 검증 → public.has_soyes_admin_access() → private.admin_users
 *   순으로 DB 가 판정한다. 교사 · 원장 계정은 이 게이트를 통과하지 못하고
 *   /admin/logout?reason=forbidden 으로 되돌아간다. 최종 방어선은 RLS 다.
 *
 * ★ service_role / Secret Key 를 쓰지 않는다.
 *   requireAdmin() 이 돌려주는 로그인 관리자 세션 client 만 쓴다.
 *   RLS 의 private.is_soyes_admin() 분기가 전 기관 조회를 허용한다.
 *
 * ★ 오늘 날짜
 *   todayInSeoul() 로 서버에서 한 번만 정한다(SERVICE-12 와 같은 helper).
 *   UTC 날짜를 잘라 쓰지 않으므로 한국 자정 직후 하루가 밀리지 않는다.
 *
 * ★ 이 페이지에는 쓰기 경로가 없다.
 *   Server Action 을 import 하지 않고 상태 변경 컴포넌트도 렌더하지 않는다.
 */
export default async function AdminOperationsPage() {
  const { supabase } = await requireAdmin();

  const today = todayInSeoul();
  const data = await fetchAdminDashboard(supabase, today);

  return <AdminOperationsDashboard data={data} />;
}
