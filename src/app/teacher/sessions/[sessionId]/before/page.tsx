import type { Metadata } from "next";
import { GoalStatement } from "@/components/staff/GoalStatement";
import { notFound, redirect } from "next/navigation";
import { FutureSessionNotice } from "@/components/staff/FutureSessionNotice";
import { isFutureSessionDate } from "@/lib/staff/session-dates";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { fetchClassModeData } from "@/lib/staff/class-mode-queries";
import { ClassModeShell } from "@/components/class-mode/ClassModeShell";
import { BeforeChecklist } from "@/components/class-mode/BeforeChecklist";
import { LessonGuide } from "@/components/class-mode/LessonGuide";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { ContentNotReadyState } from "@/components/staff/StateScreens";

export const metadata: Metadata = {
  title: "수업 준비 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface BeforePageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * TC-02 BEFORE (DEC-036 · DEC-037 · DEC-046 · DEC-098).
 *
 * scheduled 수업의 유일한 시작 경로다. 필수 수업 섹션이 없으면 진입을 막는다.
 * 권한 · 상태 · entitlement 최종 판정은 서버 RPC 가 한다.
 */
export default async function TeacherBeforePage({ params, searchParams }: BeforePageProps) {
  const { supabase, memberships, userId } = await requireTeacher();
  const { sessionId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/sessions/${sessionId}/before`}
        roleLabel="교사"
      />
    );
  }

  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;
  const result = await fetchClassModeData(supabase, membership.organizationId, sessionId, userId);

  if (!result.ok) {
    if (result.reason === "load_failed") {
      throw new Error("class mode load failed");
    }
    notFound();
  }

  const { data } = result;

  if (data.session.status === "in_progress") {
    redirect(`/teacher/sessions/${sessionId}/during${orgQuery}`);
  }

  const exitHref = `/teacher${orgQuery}`;

  if (data.session.status !== "scheduled") {
    redirect(exitHref);
  }

  if (data.missingRequiredSections.length > 0) {
    return (
      <ClassModeShell
        phaseLabel="수업 준비"
        className={data.className}
        lessonTitle={data.lesson.title}
        weekNo={data.session.weekNo}
        sessionNo={data.lesson.sessionNo}
        exitHref={exitHref}
      >
        <ContentNotReadyState backHref={exitHref} />
      </ClassModeShell>
    );
  }

  const stepMaterials = data.steps
    .map((step) => step.materials)
    .filter((value): value is string => Boolean(value && value.trim()))
    .flatMap((value) => value.split(/[\n,·]/).map((item) => item.trim()))
    .filter(Boolean);

  // 활동 단계에 준비물이 없으면(STARTER 등) §4-A 준비물의 글머리 줄을 확인 목록으로 쓴다.
  const materials =
    stepMaterials.length > 0
      ? stepMaterials
      : (data.sections.s4a ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("•"))
          .map((line) => line.replace(/^•\s*/, "").trim())
          .filter(Boolean);

  const blockedReason = !data.entitlements.classModeWrite
    ? data.entitlements.serviceMode === "active"
      ? "현재 이용 상품 또는 계약 범위에서 이 반의 수업을 진행할 수 없습니다. 원장님께 문의해 주세요."
      : "현재 읽기 전용 상태이거나 이용 기간이 아니어서 수업을 시작할 수 없습니다. 원장님께 문의해 주세요."
    : null;

  return (
    <ClassModeShell
      phaseLabel="수업 준비"
      className={data.className}
      lessonTitle={data.lesson.title}
      weekNo={data.session.weekNo}
      sessionNo={data.lesson.sessionNo}
      exitHref={exitHref}
    >
      <section aria-labelledby="today-topic" className="mb-6 rounded-2xl border border-hairline bg-white p-5">
        <h1 id="today-topic" className="text-title-lg font-bold">
          오늘 수업
        </h1>
        {data.lesson.objective ? (
          <div className="mt-3 rounded-xl border-l-4 border-secondary bg-secondary-soft px-4 py-3 text-body-lg leading-relaxed text-ink">
            <p className="mb-1 text-label font-bold text-secondary-strong">수업 목표</p>
            {/* 원본 "A X · B O" 표기를 화면에서만 "이렇게 해요 / 이렇게 하지 않아요"로 (UAT-STABILIZATION) */}
            <GoalStatement text={data.lesson.objective} />
          </div>
        ) : null}
        {data.sections.s1 ? (
          <p className="mt-4 max-w-[72ch] whitespace-pre-line break-keep text-body-lg leading-relaxed">{data.sections.s1}</p>
        ) : null}
        {data.steps.length > 0 ? (
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.steps.map((step) => (
              <li key={step.sequenceNo} className="rounded-xl bg-brand-ivory px-4 py-3 text-body">
                <span className="font-bold">{step.sequenceNo}. </span>
                {step.title}
                {step.durationMinutes ? <span className="text-ink-muted"> · {step.durationMinutes}분</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <LessonGuide sections={data.sections} />

      {isFutureSessionDate(data.session.scheduledDate) ? (
        // 미래 수업: 안내는 미리 보되 시작은 수업일에 (서버도 guardSessionWrite 로 거절)
        <FutureSessionNotice scheduledDate={data.session.scheduledDate} actionLabel="수업 시작" />
      ) : (
      <BeforeChecklist
        sessionId={data.session.id}
        organizationId={data.session.organizationId}
        materials={materials}
        photoNotSharedNames={data.photoNotSharedNames}
        alreadyConfirmed={Boolean(data.beforeConfirmedAt)}
        canStart={data.entitlements.classModeWrite}
        blockedReason={blockedReason}
      />
      )}
    </ClassModeShell>
  );
}
