import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { queryOrganizationEntitlements } from "@/lib/entitlement/queries";
import { contractWeekAccess, learningProgram, learningNav } from "@/lib/learning/program-entry";
import { LearningWeekMap } from "@/components/learning/LearningWeekMap";
import { StaffShell } from "@/components/staff/StaffShell";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { LearningAccessNotice } from "@/components/learning/LearningAccessNotice";

export const metadata: Metadata = { title: "프로그램 수업 지도 | TeachAble Art Play", robots: { index: false, follow: false } };

export default async function ProgramLearningPage({ params, searchParams }: {
  params: Promise<{ program: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { program: slug } = await params;
  const program = learningProgram(slug);
  if (!program) notFound();
  const session = await requireOrganizationRole(["director", "teacher"], "learning");
  const query = await searchParams;
  const membership = resolveMembership(session.memberships, query.org);
  if (!membership) return <OrganizationPicker memberships={session.memberships} basePath={`/learning/${program.id}`} roleLabel="교직원" />;
  const entitlement = await queryOrganizationEntitlements(session.supabase, membership.organizationId);
  const access = contractWeekAccess(entitlement, 1);
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;
  return <StaffShell email={session.email} roleLabel={membership.role === "director" ? "기관 관리자" : "교사"}
    organizationName={membership.organizationName} navItems={learningNav(membership.role, membership.organizationId)} currentHref={`/learning?${orgQuery}`}>
    <Link href={`/learning?${orgQuery}`} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-secondary-strong underline">← 프로그램 다시 선택</Link>
    <p className="mt-4 text-[13px] font-bold text-secondary-strong">{program.name} · 1~{program.durationWeeks}주</p>
    <h1 className="mt-2 text-[30px] font-bold text-navy">{program.durationWeeks}주 수업 프로그램</h1>
    <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{program.definition}</p>
    {!access.allowed ? <LearningAccessNotice label={access.label} detail={access.detail} /> : null}
    <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">주차를 눌러 교안과 준비물을 확인하세요. 수업 시작과 기록은 배정된 반의 일정에서 이어집니다. 이용 범위 밖의 주차는 구성만 볼 수 있습니다.</p>
    <LearningWeekMap entitlement={entitlement} organizationId={membership.organizationId}
      durationWeeks={program.durationWeeks} program={program.id} />
  </StaffShell>;
}
