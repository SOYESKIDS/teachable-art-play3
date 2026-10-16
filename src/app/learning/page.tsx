import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganizationRole } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { queryOrganizationEntitlements } from "@/lib/entitlement/queries";
import { contractWeekAccess, learningNav, learningOperations, programAccessSummary } from "@/lib/learning/program-entry";
import { pricingPackages, CLASS_TIME_STANDARD } from "@/data/packages";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { LearningAccessNotice } from "@/components/learning/LearningAccessNotice";

export const metadata: Metadata = { title: "수업하기 · 프로그램 선택 | TeachAble Art Play", robots: { index: false, follow: false } };

export default async function LearningPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOrganizationRole(["director", "teacher"], "learning");
  const params = await searchParams;
  const membership = resolveMembership(session.memberships, params.org);
  if (!membership) return <OrganizationPicker memberships={session.memberships} basePath="/learning" roleLabel="교직원" />;
  const entitlement = await queryOrganizationEntitlements(session.supabase, membership.organizationId);
  const access = contractWeekAccess(entitlement, entitlement.ok ? entitlement.entitlements.weekFrom ?? 1 : 1);
  const operation = learningOperations(membership.role, membership.organizationId);
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;
  return (
    <StaffShell email={session.email} roleLabel={membership.role === "director" ? "기관 관리자" : "교사"}
      organizationName={membership.organizationName} navItems={learningNav(membership.role, membership.organizationId)} currentHref={`/learning?${orgQuery}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-secondary-strong">TEACHABLE ART PLAY</p>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-navy sm:text-[32px]">우리 반 수업 찾기</h1>
          <p className="mt-3 max-w-[640px] text-[16px] leading-relaxed text-ink-muted">예정된 수업은 {operation.label}에서 바로 시작하세요. 여기서는 전체 과정과 다른 주차의 교안을 찾을 수 있습니다.</p>
        </div>
        <Link href={operation.href} className="inline-flex min-h-12 items-center rounded-full bg-secondary-strong px-5 text-[16px] font-bold text-white">{operation.label} 바로가기</Link>
      </div>
      {entitlement.ok && access.allowed ? <p className="mt-5 rounded-xl border border-line bg-white p-4 text-[16px] leading-relaxed text-navy">
        우리 기관은 {entitlement.entitlements.weekFrom}~{entitlement.entitlements.weekTo}주 과정을 {entitlement.entitlements.serviceMode === "read_only" ? "기록 열람으로 이용하고 있습니다." : "이용하고 있습니다."}
      </p> : null}
      {!access.allowed ? <LearningAccessNotice label={access.label} detail={access.detail} /> : null}
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {pricingPackages.map((program) => {
          const summary = programAccessSummary(entitlement, program.durationWeeks);
          const included = summary.state === "included";
          return <section key={program.id} className={`flex flex-col rounded-2xl border bg-white p-6 ${included ? "border-secondary-strong" : "border-line"}`}>
          <p className="text-[13px] font-bold tracking-wide text-secondary-strong">{program.name}</p>
          <h2 className="mt-3 text-[27px] font-bold text-navy">{program.durationWeeks}주 수업 프로그램</h2>
          <p className="mt-2 text-[15px] font-semibold text-navy">{program.tagline}</p>
          <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-muted">{program.definition}</p>
          <p className="mt-5 rounded-lg bg-secondary-soft px-3 py-2 text-[14px] text-secondary-strong">1~{program.durationWeeks}주 · {program.durationWeeks / 8}개 파트</p>
          <p className="mt-4 text-[16px] font-bold text-secondary-strong">{summary.label}</p>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-muted">{summary.detail}</p>
          <Link href={`/learning/${program.id}?${orgQuery}`} className={`mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-secondary-strong px-5 text-[16px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong ${included ? "bg-secondary-strong text-white" : "bg-white text-secondary-strong"}`}>{summary.action}</Link>
        </section>;
        })}
      </div>
      <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">{CLASS_TIME_STANDARD} · 16주와 24주는 앞선 주차를 포함한 누적 과정입니다. 프로그램을 선택해도 기관 이용권이나 계정 권한이 바뀌지 않습니다.</p>
    </StaffShell>
  );
}
