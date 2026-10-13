import type { Metadata } from "next";
import Link from "next/link";
import { requireDirector } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { fetchClassWeekProgress } from "@/lib/staff/class-week-progress-queries";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { WeekRibbon } from "@/components/weeks/WeekRibbon";
import { WEEK_INDEX } from "@/lib/weeks/week-index";
import { SESSION_STATUS_LABEL, formatSessionDate } from "@/lib/weeks/week-session-queries";
import { directorNavFor } from "../nav";

export const metadata: Metadata = {
  title: "수업 결과보고 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 원장 — 반별 주차 진행 현황.
 *
 * ── 두 가지를 구분한다 ───────────────────────────────────────────
 *
 * ★ **수업 결과보고는 반 단위**다. 어느 반이 몇 주차를 언제 했는가.
 * ★ **성장 이야기는 원아 단위**다. 아이 한 명의 기록이고 보호자에게 간다.
 *   둘은 받는 사람도 담는 내용도 다르므로 화면을 섞지 않는다. 성장 이야기는
 *   기존 리포트 화면으로 보낸다.
 *
 * ── 없는 집계를 만들지 않는다 ────────────────────────────────────
 *
 * ★ 진행률(%)을 쓰지 않는다. 분모가 되는 이용권 주차 범위가 아직 연결되지
 *   않았다. 대신 완료·진행 중·예정 **건수**를 센다 — 전부 실제 회차 행이다.
 * ★ 회차별 결과보고서 제출 여부는 저장되는 곳이 없어 세지 않는다. 그 사실을
 *   화면에 적는다.
 */
export default async function DirectorReportsPage({ searchParams }: ReportsPageProps) {
  const { supabase, email, memberships } = await requireDirector();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/director/reports"
        roleLabel="원장"
      />
    );
  }

  const [nav, progress] = await Promise.all([
    directorNavFor(supabase, membership.organizationId),
    fetchClassWeekProgress(supabase, membership.organizationId),
  ]);

  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;
  const themeOf = (weekNo: number) =>
    WEEK_INDEX.find((w) => w.weekNo === weekNo)?.themeColor ?? "#2B7F5E";
  const statusOf = (weekNo: number) =>
    WEEK_INDEX.find((w) => w.weekNo === weekNo)?.status;

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={membership.organizationName}
      navItems={nav}
      currentHref="/director/reports"
    >
      <h1 className="text-[24px] font-bold text-forest">수업 결과보고</h1>
      <p className="mt-1 max-w-[640px] text-[15px] leading-relaxed text-muted-ink">
        반별로 어느 주차를 언제 진행했는지 봅니다. 아이 한 명의 성장 이야기는 리포트 화면에서
        따로 확인하십니다.
      </p>

      <p
        role="note"
        className="mt-4 rounded-[10px] border border-warning-border bg-warning-soft px-4 py-3 text-[14px] leading-relaxed text-warning-text"
      >
        교사가 제출하는 <strong>회차별 결과보고서는 아직 저장 경로가 없습니다</strong>. 아래
        표는 수업 회차 자체의 상태를 센 것이고, 제출 여부·수업 메모·대표 사진은 포함되어 있지
        않습니다.
      </p>

      {!progress.ok ? (
        <p className="mt-6 rounded-[10px] border border-danger-border bg-danger-soft px-4 py-6 text-center text-[15px] text-danger">
          반별 진행 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : progress.classes.length === 0 ? (
        <p className="mt-6 rounded-[10px] border border-rule bg-white px-4 py-10 text-center text-[15px] leading-relaxed text-ink">
          아직 잡힌 수업 회차가 없습니다. 반에 프로그램을 배정하고 일정을 잡으면 여기에
          나타납니다.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {progress.classes.map((row) => (
            <section
              key={row.classId}
              aria-labelledby={`class-${row.classId}`}
              className="rounded-[10px] border border-rule bg-white px-5 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`class-${row.classId}`} className="text-[17px] font-bold text-forest">
                  {row.className ?? "반 이름 없음"}
                </h2>
                <p className="text-[14px] tabular-nums text-muted-ink">
                  완료 {row.completedCount} · 진행 중 {row.inProgressCount} · 예정{" "}
                  {row.scheduledCount}
                  {row.cancelledCount > 0 ? ` · 취소 ${row.cancelledCount}` : ""}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-start gap-[3px]">
                {row.weeks.map((cell) => (
                  <WeekRibbon
                    key={cell.sessionId}
                    weekNo={cell.weekNo}
                    themeColor={themeOf(cell.weekNo)}
                    state={
                      cell.status === "completed"
                        ? "done"
                        : cell.status === "in_progress"
                          ? "current"
                          : cell.status === "cancelled"
                            ? "locked"
                            : "next"
                    }
                    size="s"
                    status={statusOf(cell.weekNo)}
                  />
                ))}
              </div>

              <ul className="mt-3 flex flex-col gap-1">
                {row.weeks.slice(-4).map((cell) => (
                  <li
                    key={cell.sessionId}
                    className="flex flex-wrap items-baseline gap-x-2 text-[14px] text-forest/90"
                  >
                    <span className="tabular-nums font-semibold">{cell.weekNo}주차</span>
                    <span className="text-muted-ink">
                      {formatSessionDate(cell.scheduledDate)} ·{" "}
                      {SESSION_STATUS_LABEL[cell.status]}
                    </span>
                    <Link
                      href={`/director/sessions/${cell.sessionId}/observations?${orgQuery}`}
                      className="text-[13px] font-semibold text-sky-deep underline"
                    >
                      관찰 보기
                    </Link>
                  </li>
                ))}
              </ul>
              {row.weeks.length > 4 ? (
                <p className="mt-1 text-[13px] text-muted-ink">
                  최근 4개 회차만 적었습니다. 전체는 수업 이력에서 봅니다.
                </p>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {progress.withoutWeek > 0 ? (
        <p className="mt-4 text-[13px] text-muted-ink">
          주차가 지정되지 않은 회차 {progress.withoutWeek}건은 위 표에 넣지 않았습니다.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3 border-t border-rule pt-6">
        <Link
          href={`/director/growth-reports?${orgQuery}`}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
        >
          원아별 성장 이야기 보기
        </Link>
        <Link
          href={`/director/sessions/history?${orgQuery}`}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
        >
          수업 이력 전체
        </Link>
        <Link
          href={`/director/portal?${orgQuery}`}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
        >
          학부모 공유 관리
        </Link>
      </div>
    </StaffShell>
  );
}
