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

/** 좁은 화면에서 카드로 바뀔 때만 보이는 칸 이름 (넓은 화면은 표 머리칸이 대신한다) */
const MOBILE_LABEL = "mb-0.5 block text-caption font-semibold text-ink-muted md:hidden";

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
      <h1 className="text-headline font-bold text-navy">리포트</h1>
      <p className="mt-1 max-w-[68ch] text-label leading-relaxed text-ink-muted">
        교사가 완료한 주간 리포트입니다. 원아 이름을 누르면 내용을 볼 수 있고, 필요하면 학부모 화면에서 숨길 수 있습니다.
      </p>

      <section aria-labelledby="weekly-heading" className="mt-6">
        <h2 id="weekly-heading" className="text-title-sm font-bold text-ink">
          주간 리포트 (완료)
        </h2>
        {!weekly.ok ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-body-sm text-ink">
            리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : weekly.rows.length === 0 ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-body-sm text-ink">
            완료된 주간 리포트가 아직 없습니다.
          </p>
        ) : (
          <>
            <div className="mt-3 md:overflow-x-auto md:rounded-xl md:border md:border-hairline md:bg-white">
              <table className="block w-full border-collapse text-left text-body-sm text-ink md:table md:min-w-[760px]">
                <caption className="sr-only">완료된 주간 리포트</caption>
                <thead className="hidden bg-brand-ivory text-label text-ink-muted md:table-header-group">
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
                <tbody className="flex flex-col gap-3 md:table-row-group">
                  {weekly.rows.map((row) => (
                    <tr
                      key={row.reportId}
                      className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-hairline bg-white p-4 align-top md:table-row md:rounded-none md:border-0 md:border-t md:p-0"
                    >
                      <th scope="row" className="col-span-2 text-body font-bold md:px-4 md:py-3 md:text-body-sm md:font-semibold">
                        <Link className="inline-flex min-h-11 items-center underline-offset-2 hover:underline md:min-h-0" href={`/director/growth-reports/weekly/${row.reportId}?${orgQuery}`}>
                          {row.childName}
                        </Link>
                      </th>
                      <td className="md:px-4 md:py-3">
                        <span className={MOBILE_LABEL}>반</span>
                        {row.className ?? "—"}
                      </td>
                      <td className="tabular-nums md:px-4 md:py-3">
                        <span className={MOBILE_LABEL}>주차</span>
                        {row.weekNo}주
                      </td>
                      <td className="tabular-nums md:px-4 md:py-3">
                        <span className={MOBILE_LABEL}>최근 완료본</span>
                        {formatDotDate(row.completedAt)} 완료{row.updated ? " · 수정본" : ""}
                      </td>
                      <td className="md:px-4 md:py-3">
                        <span className={MOBILE_LABEL}>학부모 화면</span>
                        {row.hidden ? "숨김" : row.visibleToParent ? "학부모 화면에 표시 중" : "—"}
                      </td>
                      <td className="col-span-2 border-t border-hairline pt-3 md:border-t-0 md:px-4 md:py-3">
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
        <h2 id="legacy-heading" className="text-title-sm font-bold text-ink">
          이전 형식 리포트 (기간형)
        </h2>
        {!legacy.ok ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-8 text-center text-body-sm text-ink">
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
