import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { fetchStageData } from "@/lib/class/stage-queries";
import { ClassStage } from "@/components/class/ClassStage";

interface ClassPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 교실 화면 — 실제 수업 회차로만 연다.
 *
 * ── 회차가 기준이다 ──────────────────────────────────────────────
 *
 * ★ `sessionId` 는 반·날짜에 묶인 실제 `class_sessions` 행이다. 주차 번호로
 *   대신하지 않고, 주차 번호만으로 회차를 만들지도 않는다. 회차가 주차를
 *   알려 주는 방향만 있다.
 *
 * ★ 권한은 RLS 가 판정한다. 담당이 아니면 행이 돌아오지 않고 404 가 된다.
 *   화면에서 버튼을 숨기는 것으로 끝내지 않는다.
 *
 * ── 장면이 없을 수 있다 ──────────────────────────────────────────
 *
 * 교실 화면은 정식 서비스 경로이므로 **발행된 주차**의 장면만 내려온다.
 * 검수 전 원문을 아이들 앞에 띄우지 않는다. 그 경우 무엇이 필요한지 적는다.
 */
export default async function ClassStagePage({ params, searchParams }: ClassPageProps) {
  const { supabase, memberships } = await requireTeacher();
  const { sessionId } = await params;
  const query = await searchParams;

  const membership = resolveMembership(memberships, query.org);
  if (!membership) notFound();

  const result = await fetchStageData(supabase, membership.organizationId, sessionId);

  if (!result.ok) {
    if (result.reason === "load_failed") throw new Error("class stage load failed");
    notFound();
  }

  const { data } = result;
  const exitHref = `/teacher/sessions/${sessionId}/during?org=${encodeURIComponent(
    membership.organizationId,
  )}`;

  if (data.contentUnavailable) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stage p-12 text-center">
        <h1 className="font-serif text-[32px] font-bold text-forest">
          {data.weekNo}주차 교실 화면이 아직 열리지 않았습니다
        </h1>
        <p className="max-w-[46ch] text-[18px] leading-relaxed text-muted-ink">
          이 주차의 수업 내용이 본사 검수를 마치지 않았거나 장면이 등록되지 않았습니다. 검수 전
          원문을 아이들 화면에 띄우지 않습니다. 수업은 인쇄된 가이드로 진행해 주세요.
        </p>
        <Link
          href={exitHref}
          className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-5 text-[16px] font-semibold text-forest"
        >
          수업 화면으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <ClassStage
      scenes={data.scenes}
      weekNo={data.weekNo}
      themeColor={data.themeColor}
      lessonTitle={data.lessonTitle}
      exitHref={exitHref}
    />
  );
}
