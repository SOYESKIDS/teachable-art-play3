import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchPeriodComposer } from "@/lib/staff/period-report-composer-queries";
import { PERIOD_REPORT_LABEL } from "@/lib/staff/period-report-queries";
import { fetchClassEntitlements } from "@/lib/entitlement/queries";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { PeriodComposer } from "@/components/staff/PeriodComposer";
import { ReportPrintActions } from "@/components/staff/ReportPrintActions";
import { TEACHER_NAV } from "../../../nav";

export const metadata: Metadata = {
  title: "기간 리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface PeriodReportPageProps {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 월간 · 학기 리포트 작성 화면 — 사용자 지시 항목 1.
 *
 * ★ 작성 가능 여부는 `monthlyReportWrite` · `semesterReportWrite` 로 본다.
 *   둘 다 **계약 ∧ 출시**다. 화면 값만으로 권한을 판단하지 않고, DB 가 다시
 *   판정한다.
 */
export default async function TeacherPeriodReportPage({
  params,
  searchParams,
}: PeriodReportPageProps) {
  const { supabase, email, memberships } = await requireTeacher();
  const { reportId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/growth-reports/period/${reportId}`}
        roleLabel="교사"
      />
    );
  }

  const result = await fetchPeriodComposer(supabase, reportId);

  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("period composer load failed");
    if (result.reason === "not_installed") {
      return (
        <StaffShell
          email={email}
          roleLabel="교사"
          organizationName={membership.organizationName}
          navItems={TEACHER_NAV}
          currentHref="/teacher/growth-reports"
        >
          <h1 className="text-[24px] font-bold text-ink">기간 리포트</h1>
          <p className="mt-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-6 text-[15px] text-warning-text">
            기간 리포트 경로가 아직 적용되지 않았습니다. 적용 후 사용할 수 있습니다.
          </p>
        </StaffShell>
      );
    }
    notFound();
  }

  const { data } = result;
  const entitlements = await fetchClassEntitlements(supabase, data.report.classId);
  const canWrite =
    data.report.kind === "monthly"
      ? entitlements.monthlyReportWrite
      : entitlements.semesterReportWrite;

  const label = PERIOD_REPORT_LABEL[data.report.kind];
  const periodName =
    data.report.kind === "monthly"
      ? `${data.report.blockNo ?? "?"}번째 4주`
      : (data.report.termKey ?? "학기");

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
    >
      <h1 className="text-[24px] font-bold text-ink">
        {label} · {data.report.childName ?? "이름 없음"}
      </h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        {data.report.className ?? ""} · {periodName}
      </p>

      {!canWrite ? (
        <p className="mt-3 rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-[14px] leading-relaxed text-warning-text print:hidden">
          현재 이용 상품에 포함되지 않았거나 이 기능이 아직 출시되지 않아 새로 작성할 수 없습니다.
          이미 완료된 내용은 그대로 볼 수 있습니다.
        </p>
      ) : null}

      {/* 완료되고 숨김이 아닐 때만 인쇄를 제안한다 (DEC-102) */}
      {data.latestCompleted && !data.report.hidden ? (
        <div className="mt-3 print:hidden">
          <ReportPrintActions />
        </div>
      ) : null}

      <div className="mt-5">
        <PeriodComposer key={data.draft?.id ?? "no-draft"} data={data} canWrite={canWrite} />
      </div>
    </StaffShell>
  );
}
