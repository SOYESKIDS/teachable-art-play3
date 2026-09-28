import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { fetchClassModeData } from "@/lib/staff/class-mode-queries";
import { ClassModeShell } from "@/components/class-mode/ClassModeShell";
import { DuringView } from "@/components/class-mode/DuringView";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";

export const metadata: Metadata = {
  title: "수업 중 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DuringPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** TC-03 DURING (DEC-098 · 재생 UI 없음 DEC-029) */
export default async function TeacherDuringPage({ params, searchParams }: DuringPageProps) {
  const { supabase, memberships, userId } = await requireTeacher();
  const { sessionId } = await params;
  const query = await searchParams;
  const membership = resolveMembership(memberships, query.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/sessions/${sessionId}/during`}
        roleLabel="교사"
      />
    );
  }

  const orgQuery = `?org=${encodeURIComponent(membership.organizationId)}`;
  const result = await fetchClassModeData(supabase, membership.organizationId, sessionId, userId);

  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("class mode load failed");
    notFound();
  }

  const { data } = result;

  if (data.session.status === "scheduled") {
    redirect(`/teacher/sessions/${sessionId}/before${orgQuery}`);
  }

  if (data.session.status !== "in_progress") {
    redirect(`/teacher/sessions/${sessionId}/observations${orgQuery}`);
  }

  return (
    <ClassModeShell
      phaseLabel="수업 중"
      className={data.className}
      lessonTitle={data.lesson.title}
      weekNo={data.session.weekNo}
      sessionNo={data.lesson.sessionNo}
      exitHref={`/teacher${orgQuery}`}
    >
      <DuringView
        sessionId={data.session.id}
        organizationId={data.session.organizationId}
        steps={data.steps}
        fallbackObjective={data.lesson.objective}
        memo={data.memo}
        writeBlockedReason={
          data.entitlements.classModeWrite
            ? null
            : data.entitlements.serviceMode === "active"
              ? "현재 이용 상품 또는 계약 범위에서 이 반의 새 기록을 남길 수 없습니다. 수업 마치기는 할 수 있습니다. 원장님께 문의해 주세요."
              : "현재 읽기 전용 상태이거나 이용 기간이 아니어서 새 기록을 남길 수 없습니다. 수업 마치기는 할 수 있습니다. 원장님께 문의해 주세요."
        }
      />
    </ClassModeShell>
  );
}
