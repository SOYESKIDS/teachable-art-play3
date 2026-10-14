import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { queryOrganizationEntitlements } from "@/lib/entitlement/queries";
import { contractWeekAccess, learningProgram, learningNav } from "@/lib/learning/program-entry";
import { WEEK_INDEX } from "@/lib/weeks/week-index";
import { PARTS } from "@/lib/weeks/week-types";
import { contentSourceMode } from "@/lib/weeks/week-content-source";
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
  const source = contentSourceMode();
  return <StaffShell email={session.email} roleLabel={membership.role === "director" ? "기관 관리자" : "교사"}
    organizationName={membership.organizationName} navItems={learningNav(membership.role, membership.organizationId)} currentHref={`/learning?${orgQuery}`}>
    <Link href={`/learning?${orgQuery}`} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-secondary-strong underline">← 프로그램 다시 선택</Link>
    <p className="mt-4 text-[13px] font-bold text-secondary-strong">{program.name} · 1~{program.durationWeeks}주</p>
    <h1 className="mt-2 text-[30px] font-bold text-navy">{program.durationWeeks}주 수업 프로그램</h1>
    <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{program.definition}</p>
    {!access.allowed ? <LearningAccessNotice label={access.label} detail={access.detail} /> : null}
    <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">주차 선택은 구성 확인입니다. 수업 본문은 이용권·발행 상태를 확인한 뒤 열리고, 교실 화면과 기록은 실제 반별 회차에 연결됩니다.</p>
    {PARTS.filter(part => part.weekFrom <= program.durationWeeks).map(part => <section key={part.partNo} className="mt-8" aria-labelledby={`part-${part.partNo}`}>
      <h2 id={`part-${part.partNo}`} className="text-[20px] font-bold text-navy">PART {part.partNo} · {part.weekFrom}~{part.weekTo}주</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {WEEK_INDEX.filter(week => week.partNo === part.partNo && week.weekNo <= program.durationWeeks).map(week => {
          const weekAccess = contractWeekAccess(entitlement, week.weekNo);
          return <li key={week.weekNo}><Link href={`/learning/${program.id}/weeks/${week.weekNo}?${orgQuery}`}
            className="flex h-full gap-4 rounded-xl border border-line bg-white p-5 transition-colors hover:border-secondary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-soft text-[18px] font-bold text-secondary-strong">{week.weekNo}</span>
            <span className="min-w-0"><span className="block text-[17px] font-bold text-navy">{week.title}</span>
              <span className="mt-1 block text-[13px] text-ink-muted">성장키워드 · {week.growthKeyword}</span>
              <span className="mt-2 block text-[14px] leading-relaxed text-ink-muted">{week.activitySummary}</span>
              <span className="mt-3 block text-[12px] font-semibold text-secondary-strong">{weekAccess.label} · {source === "fixture" ? (week.status.publication === "published" ? "발행됨" : "본문 검수 대기") : "발행 상태는 진입 시 확인"}</span>
            </span>
          </Link></li>;
        })}
      </ul>
    </section>)}
  </StaffShell>;
}
