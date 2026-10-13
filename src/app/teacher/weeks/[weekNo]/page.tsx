import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { WeekRibbon } from "@/components/weeks/WeekRibbon";
import {
  ContentOriginBadge,
  ContentStatusBadges,
  HiddenBodyNotice,
  PublicationNotice,
} from "@/components/weeks/ContentOriginNotice";
import { WeekTabs, isWeekTab, type WeekTabKey } from "@/components/weeks/WeekTabs";
import {
  ClassPanel,
  GuidePanel,
  ObservePanel,
  PrepPanel,
  ReportPanel,
} from "@/components/weeks/WeekTabPanels";
import { getWeekContent } from "@/lib/weeks/week-source";
import { showsDevelopmentMarkers } from "@/lib/weeks/content-state";
import { partOf } from "@/lib/weeks/week-types";
import { isIntegrationWeek } from "@/lib/weeks/week-index";
import { TEACHER_NAV } from "../../nav";

export const metadata: Metadata = {
  title: "주차 수업 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface WeekPageProps {
  params: Promise<{ weekNo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 주차 수업 페이지 — 한 주의 일이 이 한 페이지에서 끝난다.
 *
 * ── 탭은 교사가 하는 일의 순서다 ─────────────────────────────────
 *
 * 준비 → 수업 가이드 → 수업하기 → 관찰 → 결과 보고. PDF 를 넘기는 대신 이
 * 순서대로 배치한다.
 *
 * ── 지금 되는 것과 안 되는 것을 구분해 적는다 ────────────────────
 *
 * ★ 준비 · 가이드 · 수업하기(장면 구성)는 콘텐츠만으로 완성된다.
 * ★ 체크 저장 · 관찰 입력 · 결과 보고 제출은 **수업 회차**가 있어야 한다.
 *   회차는 반과 날짜에 묶인 실제 레코드이므로 주차 번호만으로 만들 수 없다.
 *   그래서 해당 탭은 무엇이 필요한지 적고, 지금 동작하는 화면으로 보낸다.
 *   "곧 됩니다"라고 쓰지 않는다.
 *
 * ── 이용권 ───────────────────────────────────────────────────────
 *
 * 주차 잠금은 E단계에서 계약·이용권을 읽어 서버에서 막는다. 지금 화면을
 * 잠긴 것처럼 꾸며 두지 않는다.
 */
export default async function TeacherWeekPage({ params, searchParams }: WeekPageProps) {
  const { email, memberships } = await requireTeacher();
  const { weekNo: weekNoRaw } = await params;
  const query = await searchParams;

  const weekNo = Number(weekNoRaw);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) notFound();

  const membership = resolveMembership(memberships, query.org);
  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/weeks/${weekNo}`}
        roleLabel="교사"
      />
    );
  }

  // ★ 정식 서비스 경로다. 발행된 주차의 본문만 내려온다.
  const result = getWeekContent(weekNo, "service");
  if (!result) notFound();

  const { origin, content, bodyVisible, hidden } = result;
  const { summary } = content;
  const part = partOf(weekNo);
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;

  const tabParam = first(query.tab);
  const tab: WeekTabKey = isWeekTab(tabParam) ? tabParam : "prep";

  return (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/weeks"
    >
      <Link
        href={`/teacher/weeks?${orgQuery}`}
        className="inline-flex min-h-11 items-center text-[14px] font-semibold text-sky-deep underline"
      >
        ← 수업 지도
      </Link>

      <header className="mt-2 flex gap-5">
        <WeekRibbon
          weekNo={weekNo}
          themeColor={summary.themeColor}
          state="selected"
          size="l"
          status={summary.status}
        />
        <div className="min-w-0 pt-2">
          <p className="text-[13px] text-muted-ink">
            {part.partNo}권 · {part.title}
            {part.nameProvisional ? " (임시 이름)" : ""}
          </p>
          <h1 className="mt-0.5 font-serif text-[28px] font-bold leading-tight text-forest">
            {summary.title}
          </h1>
          <p className="mt-1 text-[15px] text-forest/85">
            성장키워드 {summary.growthKeyword} · 「{summary.coreMessage}」
          </p>
          <p className="mt-0.5 text-[14px] text-muted-ink">
            권장 {summary.durationLabel} · 그림책 《{summary.storybook}》
          </p>
          {isIntegrationWeek(weekNo) ? (
            <p className="mt-2 inline-block rounded-[4px] bg-sprout px-2 py-0.5 text-[13px] font-semibold text-leaf">
              앞선 주차의 결과물을 모으는 주입니다
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-2">
        <ContentStatusBadges status={summary.status} />
        <PublicationNotice status={summary.status} />
        <ContentOriginBadge origin={origin} show={showsDevelopmentMarkers()} />
        {content.sourceFile ? (
          <p className="text-[12px] text-muted-ink">원문 파일: {content.sourceFile}</p>
        ) : null}
      </div>

      {bodyVisible ? (
        <>
          <WeekTabs weekNo={weekNo} active={tab} orgQuery={orgQuery} />

          {tab === "prep" ? <PrepPanel content={content} /> : null}
          {tab === "guide" ? <GuidePanel content={content} /> : null}
          {tab === "class" ? <ClassPanel content={content} /> : null}
          {tab === "observe" ? <ObservePanel content={content} orgQuery={orgQuery} /> : null}
          {tab === "report" ? <ReportPanel content={content} orgQuery={orgQuery} /> : null}
        </>
      ) : (
        <div className="mt-6">
          <HiddenBodyNotice reason={hidden ?? "not_transcribed"} />
        </div>
      )}
    </StaffShell>
  );
}
