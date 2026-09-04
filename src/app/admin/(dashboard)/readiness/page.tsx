import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchServiceReadiness } from "@/lib/admin/readiness-queries";
import { todayInSeoul } from "@/lib/staff/class-session-queries";
import { AdminReadinessView } from "@/components/admin/AdminReadinessView";

export const metadata: Metadata = {
  title: "서비스 오픈 준비 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

/**
 * SERVICE-16 — 서비스 오픈 준비 (/admin/readiness).
 *
 * ★ 읽기 전용이다.
 *   Server Action 을 import 하지 않고, 삭제·수정 컴포넌트도 렌더하지 않는다.
 *   테스트 데이터 정리는 문서(SERVICE16_PILOT)와 별도 승인 절차로 다룬다.
 *
 * ★ 권한
 *   Layout 에서도 검사하지만 데이터를 다루는 페이지에서 독립적으로 다시 확인한다.
 */
export default async function AdminReadinessPage() {
  const { supabase } = await requireAdmin();

  const data = await fetchServiceReadiness(supabase, todayInSeoul());

  return <AdminReadinessView data={data} />;
}
