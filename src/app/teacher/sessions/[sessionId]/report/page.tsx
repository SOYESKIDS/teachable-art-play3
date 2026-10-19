import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { fetchSessionReport } from "@/lib/staff/session-report-queries";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { SessionReportWizard } from "@/components/staff/SessionReportWizard";
import { learningNav } from "@/lib/learning/program-entry";
import { SessionPrivateMemo } from "@/components/staff/SessionPrivateMemo";

export const metadata: Metadata = {
  title: "결과 보고 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface ReportPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 회차 결과 보고 — 4단계.
 *
 * ★ 회차 단위다. 주차 번호로 열지 않는다. 출결·관찰이 회차와 원아에 묶여
 *   있으므로 회차가 있어야 모을 값이 생긴다.
 * ★ 권한은 RLS 가 판정한다. 담당이 아니면 회차 조회가 비어 404 가 된다.
 */
export default async function SessionReportPage({ params, searchParams }: ReportPageProps) {
  const { supabase, email, memberships, userId } = await requireTeacher();
  const { sessionId } = await params;
  const query = await searchParams;

  const membership = resolveMembership(memberships, query.org);
  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/sessions/${sessionId}/report`}
        roleLabel="교사"
      />
    );
  }

  const result = await fetchSessionReport(supabase, membership.organizationId, sessionId);

  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("session report load failed");
    notFound();
  }

  const { data } = result;
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={learningNav("teacher", membership.organizationId)}
      currentHref={`/teacher?${orgQuery}`}
    >
      <h1 className="text-[24px] font-bold text-forest">결과 보고</h1>
      <p className="mt-1 text-[15px] text-muted-ink">
        {data.className ?? "반 이름 없음"}
        {data.weekNo ? ` · ${data.weekNo}주차` : ""}
        {data.weekTitle ? ` ${data.weekTitle}` : ""}
      </p>

      {data.weekNo ? (
        <Link
          href={`/teacher/weeks/${data.weekNo}?${orgQuery}&class=${data.classId}`}
          className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-sky-deep underline"
        >
          이 주차 수업 내용 보기
        </Link>
      ) : null}

      <div className="mt-5">
        <SessionReportWizard data={data} orgQuery={orgQuery} privateMemo={
          <SessionPrivateMemo supabase={supabase} sessionId={data.sessionId} classId={data.classId}
            organizationId={membership.organizationId} userId={userId} status={data.status} />
        } />
      </div>
    </StaffShell>
  );
}
