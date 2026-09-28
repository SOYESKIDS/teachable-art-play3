import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import { fetchDirectorPortalRows } from "@/lib/staff/director-report-queries";
import { fetchOrganizationEntitlements, hasFeature } from "@/lib/entitlement/queries";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { PortalManager } from "@/components/staff/PortalManager";
import { StaffShell } from "@/components/staff/StaffShell";
import { noticeInfo } from "@/components/ui/app-button";
import { directorNavFor } from "../nav";

export const metadata: Metadata = {
  title: "학부모 공유 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorPortalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** DR-08 학부모 공유 (DEC-040 · DEC-092 · DEC-107 · DEC-112) */
export default async function DirectorPortalPage({ searchParams }: DirectorPortalPageProps) {
  const { supabase, email, memberships } = await requireDirector();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return <OrganizationPicker memberships={memberships} basePath="/director/portal" roleLabel="원장" />;
  }

  const [rows, entitlements] = await Promise.all([
    fetchDirectorPortalRows(supabase, membership.organizationId),
    fetchOrganizationEntitlements(supabase, membership.organizationId),
  ]);

  const portalAvailable = hasFeature(entitlements, "parent_portal") && entitlements.serviceMode === "active";

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={await directorNavFor(supabase, membership.organizationId)}
      currentHref="/director/portal"
    >
      <h1 className="text-[24px] font-bold text-ink">학부모 공유</h1>
      <p className={`mt-3 ${noticeInfo}`}>
        이제 아동별 공유 링크 하나에서 공개된 기록을 함께 확인할 수 있습니다. 기존 리포트별 공유 링크는 사용이 끝날 때까지
        별도로 유지됩니다.
      </p>
      <p className="mt-2 text-[14px] text-ink-muted">
        사진 공유 기록은 기관 운영 기록입니다. 학부모 화면의 사진 표시는 관련 운영 기준이 확정된 뒤 제공됩니다.
      </p>

      <div className="mt-5">
        {!rows.ok ? (
          <p className="rounded-xl border border-hairline bg-white px-4 py-10 text-center text-[15px] text-ink">
            학부모 공유 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : rows.rows.length === 0 ? (
          <p className="rounded-xl border border-hairline bg-white px-4 py-10 text-center text-[15px] text-ink">
            재원 중인 원아가 없습니다.
          </p>
        ) : (
          <PortalManager rows={rows.rows} portalAvailable={portalAvailable} />
        )}
      </div>
    </StaffShell>
  );
}
