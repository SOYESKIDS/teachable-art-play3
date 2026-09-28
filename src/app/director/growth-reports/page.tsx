import type { Metadata } from "next";
import Link from "next/link";
import { requireDirector } from "@/lib/auth/organization";
import { fetchGrowthReports } from "@/lib/staff/growth-report-queries";
import { fetchDirectorWeeklyReports } from "@/lib/staff/director-report-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { formatDotDate } from "@/lib/entitlement/labels";
import { GrowthReportList } from "@/components/staff/GrowthReportList";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { ReportVisibilityControl } from "@/components/staff/ReportVisibilityControl";
import { StaffShell } from "@/components/staff/StaffShell";
import { appButtonSecondary } from "@/components/ui/app-button";
import { directorNavFor } from "../nav";

export const metadata: Metadata = {
  title: "리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * DR-06 원장 리포트 (DEC-074 · DEC-102 · DEC-104).
 *
 * · 완료된 주간 리포트만 (교사 초안 · AI 초안 없음)
 * · 학부모 화면에서 숨기기 · 다시 공개 (사유 필수)
 * · "학부모 화면에 표시 중"은 계산값일 때만 표시
 * · 이전 형식 리포트 (기간형)는 읽기 전용
 * · STARTER 에도 제공 (운영 기능). 누락 탐지 · 집계는 없다.
 */
export default async function DirectorReportsPage({ searchParams }: DirectorReportsPageProps) {
  const { supabase, email, memberships } = await requireDirector();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return <OrganizationPicker memberships={memberships} basePath="/director/growth-reports" roleLabel="원장" />;
  }

  const pageParam = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;

  const [weekly, legacy] = await Promise.all([
    fetchDirectorWeeklyReports(supabase, membership.organizationId, page),
    fetchGrowthReports(supabase, membership.organizationId),
  ]);

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={await directorNavFor(supabase, membership.organizationId)}
      currentHref="/director/growth-reports"
    >
      <h1 className="text-[24px] font-bold text-ink">리포트</h1>

      <section aria-labelledby="weekly-heading" className="mt-6">
        <h2 id="weekly-heading" className="text-[19px] font-bold text-ink">
          주간 리포트 (완료)
        </h2>
        {!weekly.ok ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-[15px] text-ink">
            리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : weekly.rows.length === 0 ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-[15px] text-ink">
            완료된 주간 리포트가 아직 없습니다.
          </p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-white">
              <table className="w-full min-w-[760px] border-collapse text-left text-[15px] text-ink">
                <caption className="sr-only">완료된 주간 리포트</caption>
                <thead className="bg-brand-ivory text-[14px] text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">원아</th>
                    <th scope="col" className="px-4 py-3 font-semibold">반</th>
                    <th scope="col" className="px-4 py-3 font-semibold">주차</th>
                    <th scope="col" className="px-4 py-3 font-semibold">최근 완료본</th>
                    <th scope="col" className="px-4 py-3 font-semibold">학부모 화면</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="sr-only">행동</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.rows.map((row) => (
                    <tr key={row.reportId} className="border-t border-hairline align-top">
                      <th scope="row" className="px-4 py-3 font-semibold">
                        <Link className="underline-offset-2 hover:underline" href={`/director/growth-reports/weekly/${row.reportId}?${orgQuery}`}>
                          {row.childName}
                        </Link>
                      </th>
                      <td className="px-4 py-3">{row.className ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{row.weekNo}주</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatDotDate(row.completedAt)} 완료{row.updated ? " · 수정본" : ""}
                      </td>
                      <td className="px-4 py-3">
                        {row.hidden ? "숨김" : row.visibleToParent ? "학부모 화면에 표시 중" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ReportVisibilityControl
                          reportId={row.reportId}
                          hidden={row.hidden}
                          label={`${row.childName} · ${row.weekNo}주`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="리포트 페이지" className="mt-3 flex justify-end gap-2">
              {page > 1 ? (
                <Link href={`/director/growth-reports?${orgQuery}&page=${page - 1}`} className={appButtonSecondary}>
                  이전
                </Link>
              ) : null}
              {weekly.hasMore ? (
                <Link href={`/director/growth-reports?${orgQuery}&page=${page + 1}`} className={appButtonSecondary}>
                  다음
                </Link>
              ) : null}
            </nav>
          </>
        )}
      </section>

      <section aria-labelledby="legacy-heading" className="mt-10">
        <h2 id="legacy-heading" className="text-[19px] font-bold text-ink">
          이전 형식 리포트 (기간형)
        </h2>
        {!legacy.ok ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-8 text-center text-[15px] text-ink">
            이전 리포트를 불러오지 못했습니다.
          </p>
        ) : (
          <GrowthReportList
            reports={legacy.reports}
            basePath="/director/growth-reports"
            organizationId={membership.organizationId}
            emptyText="이전 형식 리포트가 없습니다."
            showStatus={false}
          />
        )}
      </section>
    </StaffShell>
  );
}
