import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchGrowthReports } from "@/lib/staff/growth-report-queries";
import { fetchTeacherWeeklyQueue } from "@/lib/staff/weekly-report-queries";
import { fetchClassEntitlements } from "@/lib/entitlement/queries";
import { resolveMembership } from "@/lib/staff/membership";
import { GrowthReportList } from "@/components/staff/GrowthReportList";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { WeeklyQueue } from "@/components/staff/WeeklyQueue";
import { TEACHER_NAV } from "../nav";

export const metadata: Metadata = {
  title: "리포트 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface TeacherReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 교사 리포트 (TC-07 · DEC-101 · DEC-104).
 *
 * · 주간 리포트 대기열 (반 × 주차) — AI 없이 작성 · 완료
 * · 이전 형식 리포트 (기간형) — 읽기 전용 목록 (새로 만들지 않는다 · DEC-091)
 */
export default async function TeacherReportsPage({ searchParams }: TeacherReportsPageProps) {
  const { supabase, email, memberships, userId } = await requireTeacher();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return <OrganizationPicker memberships={memberships} basePath="/teacher/growth-reports" roleLabel="교사" />;
  }

  const requestedWeek = Number(first(params.week));
  const [queueResult, legacyResult] = await Promise.all([
    fetchTeacherWeeklyQueue(supabase, membership.organizationId, userId, {
      classId: first(params.class),
      weekNo: Number.isInteger(requestedWeek) ? requestedWeek : undefined,
    }),
    fetchGrowthReports(supabase, membership.organizationId),
  ]);

  const queue = queueResult.ok ? queueResult.queue : null;
  const selected = queue?.selected ?? null;
  const selectedOption = queue && selected ? queue.classes.find((item) => item.assignmentId === selected.assignmentId) : null;
  const entitlements = selected ? await fetchClassEntitlements(supabase, selected.classId) : null;
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
    >
      <h1 className="text-headline font-bold text-navy">리포트</h1>

      <section aria-labelledby="weekly-heading" className="mt-6">
        <h2 id="weekly-heading" className="text-title-sm font-bold text-ink">
          주간 리포트
        </h2>

        {!queue ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-body-sm text-ink">
            주간 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : queue.classes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-body-sm text-ink">
            담당 반의 진행 중인 프로그램이 없습니다. 원장님께 문의해 주세요.
          </p>
        ) : !selected || !selectedOption ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-10 text-center text-body-sm text-ink">
            아직 진행한 수업이 없습니다. 수업을 마치면 이곳에서 주간 리포트를 작성합니다.
          </p>
        ) : (
          <>
            <nav aria-label="반 · 주차 선택" className="mt-3 flex flex-wrap gap-2">
              {queue.classes
                .filter((option) => option.weeks.length > 0)
                .map((option) => (
                  <Link
                    key={option.assignmentId}
                    href={`/teacher/growth-reports?${orgQuery}&class=${option.classId}`}
                    aria-current={option.assignmentId === selected.assignmentId ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-label font-semibold ${
                      option.assignmentId === selected.assignmentId
                        ? "border-brand-navy bg-brand-sky text-ink"
                        : "border-hairline bg-white text-ink"
                    }`}
                  >
                    {option.className}
                  </Link>
                ))}
            </nav>
            <nav aria-label="주차 선택" className="mt-2 flex flex-wrap gap-2">
              {selectedOption.weeks.map((week) => (
                <Link
                  key={week}
                  href={`/teacher/growth-reports?${orgQuery}&class=${selected.classId}&week=${week}`}
                  aria-current={week === selected.weekNo ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-label ${
                    week === selected.weekNo ? "border-brand-navy bg-brand-sky font-bold text-ink" : "border-hairline bg-white text-ink"
                  }`}
                >
                  {week}주
                </Link>
              ))}
            </nav>
            {entitlements && !entitlements.weeklyReportWrite ? (
              <p className="mt-3 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-label text-warning-text">
                현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 리포트를 작성할 수 없습니다. 원장님께 문의해 주세요.
              </p>
            ) : null}
            <div className="mt-4">
              <WeeklyQueue
                organizationId={membership.organizationId}
                assignmentId={selected.assignmentId}
                weekNo={selected.weekNo}
                rows={queue.rows}
                canWrite={Boolean(entitlements?.weeklyReportWrite)}
              />
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="legacy-heading" className="mt-10">
        <h2 id="legacy-heading" className="text-title-sm font-bold text-ink">
          이전 형식 리포트 (기간형)
        </h2>
        <p className="mt-1 text-label text-ink-muted">이전 방식으로 만든 리포트입니다. 새 리포트는 주간 리포트로 작성합니다.</p>
        {!legacyResult.ok ? (
          <p className="mt-3 rounded-xl border border-hairline bg-white px-4 py-8 text-center text-body-sm text-ink">
            이전 리포트를 불러오지 못했습니다.
          </p>
        ) : (
          <GrowthReportList
            reports={legacyResult.reports}
            basePath="/teacher/growth-reports"
            organizationId={membership.organizationId}
            emptyText="이전 형식 리포트가 없습니다."
          />
        )}
      </section>
    </StaffShell>
  );
}
