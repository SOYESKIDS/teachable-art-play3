import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher, type OrganizationSession } from "@/lib/auth/organization";
import { queryOrganizationEntitlements } from "@/lib/entitlement/queries";
import { contractWeekAccess, learningNav } from "@/lib/learning/program-entry";
import { LearningAccessNotice } from "@/components/learning/LearningAccessNotice";
import { fetchWeekSessions } from "@/lib/weeks/week-session-queries";
import { WeekSessionBand } from "@/components/weeks/WeekSessionBand";
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
import { loadStaffScenes, loadWeekContent } from "@/lib/weeks/week-content-source";
import { showsDevelopmentMarkers } from "@/lib/weeks/content-state";
import { partOf } from "@/lib/weeks/week-types";
import { isIntegrationWeek } from "@/lib/weeks/week-index";
import { TEACHER_NAV } from "@/app/teacher/nav";
import { LegacyWeekPanels } from "@/components/weeks/LegacyWeekPanels";

interface WeekPageProps {
  context?: { session: OrganizationSession; program: string; maxWeek: number };
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
 * 주차 본문을 읽기 전에 서버에서 기관 계약 범위를 검사한다. 조회 실패와
 * 계약 없음은 서로 다른 안내를 보이며, 기존 교사 URL도 같은 검사를 거친다.
 */
export async function StaffWeekPage({ params, searchParams, context }: WeekPageProps) {
  const { supabase, email, memberships } = context?.session ?? await requireTeacher();
  const { weekNo: weekNoRaw } = await params;
  const query = await searchParams;

  const weekNo = Number(weekNoRaw);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) notFound();

  if (context && weekNo > context.maxWeek) notFound();
  const weekPath = context ? `/learning/${context.program}/weeks/${weekNo}` : `/teacher/weeks/${weekNo}`;
  const backPath = context ? `/learning/${context.program}` : "/teacher/weeks";
  const membership = resolveMembership(memberships, query.org);
  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={weekPath}
        roleLabel={context ? "교직원" : "교사"}
      />
    );
  }

  const roleLabel = membership.role === "director" ? "기관 관리자" : "교사";
  const navItems = context ? learningNav(membership.role, membership.organizationId) : TEACHER_NAV;
  const navCurrent = context ? `/learning?org=${encodeURIComponent(membership.organizationId)}` : "/teacher/weeks";
  const entitlement = await queryOrganizationEntitlements(supabase, membership.organizationId);
  const access = contractWeekAccess(entitlement, weekNo);
  if (!access.allowed) return (
    <StaffShell email={email} roleLabel={roleLabel} organizationName={membership.organizationName} navItems={navItems} currentHref={navCurrent}>
      <Link href={`${backPath}?org=${encodeURIComponent(membership.organizationId)}`} className="inline-flex min-h-11 items-center font-semibold text-secondary-strong underline">← 프로그램 수업 지도</Link>
      <h1 className="mt-4 text-[26px] font-bold text-navy">{weekNo}주차 수업</h1>
      <LearningAccessNotice label={access.label} detail={access.detail} />
    </StaffShell>
  );

  // ★ 정식 서비스 경로다. 발행된 주차의 본문만 내려온다.
  // ★ 콘텐츠 출처는 CONTENT_SOURCE 가 정한다 (기본 fixture · E1~E3 적용 뒤
  //   database). database 모드에서 조회가 실패하면 **fixture 로 넘어가지
  //   않는다** — 조용히 대체하면 교사가 DB 에 없는 내용을 보게 된다.
  const loaded = await loadWeekContent(supabase, {
    weekNo,
    audience: "service",
    organizationId: membership.organizationId,
  });

  if (!loaded.ok) {
    if (loaded.legacy) {
      const legacy = loaded.legacy;
      const sessions = await fetchWeekSessions(supabase, membership.organizationId, weekNo, legacy.version.lessonId);
      return (
        <StaffShell email={email} roleLabel={roleLabel} organizationName={membership.organizationName}
          navItems={navItems} currentHref={navCurrent}>
          <LegacyWeekPanels lesson={legacy} sessions={sessions} role={membership.role}
            organizationId={membership.organizationId} weekPath={weekPath} backPath={backPath}
            active={isWeekTab(first(query.tab)) ? first(query.tab) as WeekTabKey : "prep"} />
        </StaffShell>
      );
    }
    return (
      <StaffShell
        email={email}
        roleLabel={roleLabel}
        organizationName={membership.organizationName}
        navItems={navItems}
        currentHref={navCurrent}
      >
        <div className="mx-auto w-full max-w-[900px] px-5 py-10">
          <h1 className="text-[20px] font-bold text-forest">수업 내용을 열지 못했습니다</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-forest/85">
            {loaded.detail}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-ink">
            이전 내용을 대신 보여드리지 않습니다. 저장된 내용과 다를 수 있기 때문입니다.
            기관 담당자에게 문의해 주세요.
          </p>
        </div>
      </StaffShell>
    );
  }

  const result = loaded.result;
  if (!result) notFound();

  // ★ 교실 화면 장면은 **권한 RPC** 로 읽는다. E3 이후 `lesson_scenes` 직접
  //   조회는 본사만 된다 — 교사 경로에서 직접 읽으면 0행이 돌아오고, 화면은
  //   그것을 「아직 안 옮겼다」로 잘못 적는다. 못 읽는 것과 없는 것은 다르다.
  const staffScenes =
    loaded.version === null
      ? null
      : await loadStaffScenes(supabase, {
          organizationId: membership.organizationId,
          programId: loaded.version.programId,
          lessonId: loaded.version.lessonId,
        });

  const { origin, bodyVisible, hidden } = result;
  const content =
    staffScenes && staffScenes.ok && staffScenes.scenes !== null
      ? { ...result.content, scenes: staffScenes.scenes }
      : result.content;
  const sceneLoadFailure = staffScenes && !staffScenes.ok ? staffScenes : null;
  const { summary } = content;
  const part = partOf(weekNo);
  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;

  const tabParam = first(query.tab);
  const tab: WeekTabKey = isWeekTab(tabParam) ? tabParam : "prep";

  // ★ 회차는 반·날짜마다 따로다. 하나로 합친 진행률을 만들지 않는다.
  const selectedClassId = first(query.class);
  const weekSessions = await fetchWeekSessions(
    supabase,
    membership.organizationId,
    weekNo,
    loaded.version?.lessonId,
  );

  // 반을 고른 상태는 탭 이동에도 유지한다.
  const tabQuery = selectedClassId
    ? `${orgQuery}&class=${encodeURIComponent(selectedClassId)}`
    : orgQuery;

  return (
    <StaffShell
      email={email}
      roleLabel={roleLabel}
      organizationName={membership.organizationName}
      navItems={navItems}
      currentHref={navCurrent}
    >
      <Link
        href={`${backPath}?${orgQuery}`}
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

      {/*
        ★ 교사용 인쇄 경로는 교사 권한으로만 연결한다.
          가이드 탭 여러 장을 빼지 않고, 원문 15번 섹션만 담은 A4
          한 장을 인쇄하는 전용 경로로 보낸다. 발행된 주차만 열린다.
      */}
      {bodyVisible && membership.role === "teacher" ? (
        <Link
          href={`/teacher/weeks/${weekNo}/quick-guide?${orgQuery}`}
          className="mt-4 inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
        >
          퀵 가이드 A4 인쇄
        </Link>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <ContentStatusBadges status={summary.status} />
        <PublicationNotice status={summary.status} />
        <ContentOriginBadge origin={origin} show={showsDevelopmentMarkers()} />
        {content.sourceFile ? (
          <p className="text-[12px] text-muted-ink">원문 파일: {content.sourceFile}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <WeekSessionBand
          sessions={weekSessions.sessions}
          ok={weekSessions.ok}
          orgQuery={orgQuery}
          weekNo={weekNo}
          selectedClassId={selectedClassId}
          actorRole={membership.role}
          weekPath={weekPath}
        />
      </div>

      {bodyVisible ? (
        <>
          <WeekTabs weekNo={weekNo} active={tab} orgQuery={tabQuery} pageHref={weekPath} />

          {tab === "prep" ? <PrepPanel content={content} /> : null}
          {tab === "guide" ? <GuidePanel content={content} /> : null}
          {tab === "class" ? (
            sceneLoadFailure ? (
              /*
                ★ 장면을 못 읽은 것을 「장면이 없다」로 적지 않는다. 교사는
                  둘을 구분할 수 없고, 담당 반 배정 문제를 전사 문제로 오해한다.
              */
              <div
                role="note"
                className="my-6 rounded-[10px] border border-warning-border bg-warning-soft px-5 py-4"
              >
                <h3 className="text-[16px] font-bold text-warning-text">
                  교실 화면 장면을 열지 못했습니다
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-warning-text">
                  {sceneLoadFailure.detail}
                </p>
              </div>
            ) : (
              <ClassPanel content={content} />
            )
          ) : null}
          {tab === "observe" ? (
            <ObservePanel content={content} orgQuery={orgQuery} sessions={weekSessions.sessions} actorRole={membership.role} />
          ) : null}
          {tab === "report" ? (
            <ReportPanel content={content} orgQuery={orgQuery} sessions={weekSessions.sessions} actorRole={membership.role} />
          ) : null}
        </>
      ) : (
        <div className="mt-6">
          <HiddenBodyNotice reason={hidden ?? "not_transcribed"} />
        </div>
      )}
    </StaffShell>
  );
}
