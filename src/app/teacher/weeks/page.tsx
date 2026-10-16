import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { queryOrganizationEntitlements } from "@/lib/entitlement/queries";
import { learningNav } from "@/lib/learning/program-entry";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { LearningWeekMap } from "@/components/learning/LearningWeekMap";

export const metadata: Metadata = {
  title: "수업 지도 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/** Same entitlement-aware topic map as the program pages. Publication belongs to the loaded version. */
export default async function TeacherWeeksPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, email, memberships } = await requireTeacher();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);
  if (!membership) return <OrganizationPicker memberships={memberships} basePath="/teacher/weeks" roleLabel="교사" />;
  const entitlement = await queryOrganizationEntitlements(supabase, membership.organizationId);
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;

  return <StaffShell email={email} roleLabel="교사" organizationName={membership.organizationName}
    navItems={learningNav("teacher", membership.organizationId)} currentHref={`/teacher/weeks?${orgQuery}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold text-navy">수업 지도</h1>
        <p className="mt-2 max-w-[680px] text-[16px] leading-relaxed text-ink-muted">
          1~24주 수업 구성을 살펴보고 우리 기관의 이용 범위를 확인하세요.
          준비·수업·기록은 배정된 반의 실제 수업에서 이어집니다.
        </p>
      </div>
      <Link href={`/teacher?${orgQuery}`} className="inline-flex min-h-11 items-center rounded-xl bg-navy px-5 text-[15px] font-semibold text-white">오늘의 수업 바로가기</Link>
    </div>
    <LearningWeekMap entitlement={entitlement} organizationId={membership.organizationId} />
  </StaffShell>;
}
