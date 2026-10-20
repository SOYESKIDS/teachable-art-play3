import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClassroomPlayer } from "@/components/play/classroom/ClassroomPlayer";
import { EXPERIENCE_WEEKS, experienceWeek } from "@/data/experience/weeks";

/**
 * 공개 체험 · 교실 플레이어 (1~24주, 빌드 때 모두 생성).
 *
 * ★ 실제 수업 진행(/class/[sessionId] · /teacher/sessions/*)과 다른 화면이다.
 *   회차 · 출결 · 관찰 · 메모를 만들지도 읽지도 않는다. 진행 상태는 브라우저 탭 안에만 있다.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return EXPERIENCE_WEEKS.map((w) => ({ weekNo: String(w.weekNo) }));
}

export async function generateMetadata({ params }: PageProps<"/experience/classroom/[weekNo]">): Promise<Metadata> {
  const { weekNo } = await params;
  const week = experienceWeek(Number(weekNo));
  if (!week) return {};
  return {
    title: `${week.weekNo}주차 교실 플레이어 체험 | TeachAble Art Play`,
    description: `《${week.title}》 수업을 다섯 단계로 직접 진행해 보세요. 체험 화면은 저장되지 않습니다.`,
    alternates: { canonical: `/experience/classroom/${week.weekNo}` },
  };
}

export default async function ExperienceClassroomPage({ params }: PageProps<"/experience/classroom/[weekNo]">) {
  const { weekNo } = await params;
  const week = experienceWeek(Number(weekNo));
  if (!week) notFound();
  const nextWeekNo = experienceWeek(week.weekNo + 1)?.weekNo ?? null;

  return (
    <main id="main" tabIndex={-1} className="flex-1 bg-pop-cream focus:outline-none">
      <div className="mx-auto max-w-[1320px] 2xl:max-w-[1520px] px-4 pb-10 pt-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[14px] font-semibold text-pop-ink-muted">
          <Link href={`/experience/weeks/${week.weekNo}`} className="inline-flex min-h-11 items-center gap-1 hover:text-pop-ink">
            ← {week.weekNo}주차 수업 안내
          </Link>
          <span className="hidden md:inline">키보드 → 다음 · ← 이전 · F 전체 화면</span>
        </div>
        <h1 className="sr-only">{week.weekNo}주차 「{week.title}」 교실 플레이어 체험</h1>
        <ClassroomPlayer week={week} nextWeekNo={nextWeekNo} />
      </div>
    </main>
  );
}
