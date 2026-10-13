import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { WeekRibbon } from "@/components/weeks/WeekRibbon";
import {
  ContentOriginBadge,
  ContentStatusBadges,
} from "@/components/weeks/ContentOriginNotice";
import { listWeeks } from "@/lib/weeks/week-source";
import { showsDevelopmentMarkers } from "@/lib/weeks/content-state";
import { PARTS } from "@/lib/weeks/week-types";
import { isIntegrationWeek } from "@/lib/weeks/week-index";
import { TEACHER_NAV } from "../nav";

export const metadata: Metadata = {
  title: "수업 지도 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface WeeksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 교사 수업 지도 — 24주를 세 권으로 펼친다.
 *
 * ── 이 화면이 하는 일 ─────────────────────────────────────────────
 *
 * 교사가 "이번 주 말고 그 다음엔 뭐가 오지"를 볼 수 있어야 한다. 그래서 24주
 * 전체를 책갈피로 펼치고, 각 주차의 수업명·성장키워드·결과물을 한 줄로 적는다.
 *
 * ── 이용권은 아직 연결하지 않았다 ────────────────────────────────
 *
 * ★ 지금은 24주를 모두 목록으로 보여 준다. 상품별 이용 범위(STARTER 8주 등)에
 *   따른 잠금은 E단계에서 실제 계약·이용권을 읽어 적용한다. 그때까지 이 화면은
 *   "열람 가능 범위"를 단정하지 않는다 — 잠긴 것처럼 꾸며 두면 나중에 실제
 *   잠금과 구분되지 않는다.
 *
 * ── 검수 상태를 숨기지 않는다 ────────────────────────────────────
 *
 * 원문을 아직 옮기지 않은 주차는 그 사실을 배지로 적는다.
 */
export default async function TeacherWeeksPage({ searchParams }: WeeksPageProps) {
  const { email, memberships } = await requireTeacher();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/teacher/weeks"
        roleLabel="교사"
      />
    );
  }

  const { origin, weeks } = listWeeks();
  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/weeks"
    >
      <h1 className="font-serif text-[28px] font-bold text-forest">24주, 세 권의 이야기</h1>
      <p className="mt-2 max-w-[680px] text-[15px] leading-relaxed text-muted-ink">
        8주마다 한 권의 이야기가 끝나고, 마지막 주에 그동안 만든 것들이 모여 하나의 작품이
        됩니다. 주차를 누르면 준비부터 결과 보고까지 한 페이지에서 이어집니다.
      </p>

      <div className="mt-3">
        <ContentOriginBadge origin={origin} show={showsDevelopmentMarkers()} />
      </div>

      {PARTS.map((part) => {
        const partWeeks = weeks.filter((w) => w.partNo === part.partNo);
        return (
          <section key={part.partNo} className="mt-9" aria-labelledby={`part-${part.partNo}`}>
            <h2
              id={`part-${part.partNo}`}
              className="font-serif text-[20px] font-bold text-forest"
            >
              {part.partNo}권 · {part.title}{" "}
              <span className="font-sans text-[14px] font-normal text-muted-ink">
                {part.weekFrom}~{part.weekTo}주
              </span>
            </h2>
            {part.nameProvisional ? (
              <p className="mt-1 text-[13px] text-muted-ink">
                이 권의 이름은 공식 가이드에 없어 임시로 적었습니다. 확정 후 바뀝니다.
              </p>
            ) : null}

            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {partWeeks.map((week) => (
                <li key={week.weekNo}>
                  <Link
                    href={`/teacher/weeks/${week.weekNo}${orgQuery}`}
                    className="flex gap-4 rounded-[10px] border border-rule bg-white px-4 pb-4 pt-0 transition-colors hover:border-leaf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
                  >
                    <WeekRibbon
                      weekNo={week.weekNo}
                      themeColor={week.themeColor}
                      state="next"
                      size="m"
                      status={week.status}
                    />
                    <span className="min-w-0 pt-4">
                      <span className="block font-serif text-[18px] font-bold text-forest">
                        {week.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted-ink">
                        성장키워드 {week.growthKeyword} · {week.durationLabel}
                      </span>
                      <span className="mt-1.5 block text-[14px] leading-relaxed text-forest/85">
                        {week.activitySummary}
                      </span>
                      {week.outcome ? (
                        <span className="mt-1 block text-[13px] text-muted-ink">
                          결과물 {week.outcome}
                        </span>
                      ) : null}

                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {isIntegrationWeek(week.weekNo) ? (
                          <span className="rounded-[4px] bg-sprout px-2 py-0.5 text-[12px] font-semibold text-leaf">
                            앞선 주차 결과물을 모으는 주
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1.5 block">
                        <ContentStatusBadges status={week.status} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-10 max-w-[680px] text-[13px] leading-relaxed text-muted-ink">
        수업 내용은 공식 교사용 수업가이드 원문을 그대로 옮긴 것입니다. 화면은 원문을 나누어
        보여 줄 뿐 문장을 새로 만들지 않습니다. 반별로 열리는 주차 범위는 이용 상품에 따라
        달라지며, 아직 이 화면에 반영되지 않았습니다.
      </p>
    </StaffShell>
  );
}
