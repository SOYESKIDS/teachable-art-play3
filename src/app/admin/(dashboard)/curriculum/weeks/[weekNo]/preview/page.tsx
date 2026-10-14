import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { TAP24_PROGRAM_CODE } from "@/lib/weeks/week-program";
import { loadWeekContentForReview } from "@/lib/weeks/week-content-source";
import { ClassStage } from "@/components/class/ClassStage";

export const metadata: Metadata = {
  title: "교실 화면 미리보기 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface PreviewPageProps {
  params: Promise<{ weekNo: string }>;
}

/**
 * 교실 화면 내부 미리보기 — 본사 전용.
 *
 * ── 왜 따로 두는가 ───────────────────────────────────────────────
 *
 * 장면 검수는 수업 회차가 생기기 전에 해야 한다. 그렇다고 `/class` 에서
 * 주차 번호를 받게 하면, 아이들 앞에 띄우는 화면이 회차 없이도 열리는 길이
 * 생긴다. 그래서 **검수용 경로를 분리**한다.
 *
 * ★ 본사(HQ Admin)만 들어온다. `requireAdmin()` 이 막는다.
 * ★ `internal_review` 경로이므로 **검수 전 원문도** 보인다 — 검수하려면
 *   봐야 하기 때문이다.
 * ★ 화면에 "내부 미리보기"라고 적는다. 실제 수업 화면과 혼동하지 않도록.
 *
 * ── 공개 샘플과도 다르다 ─────────────────────────────────────────
 *
 * 공개 `/sample` 은 명시적으로 허용한 샘플 콘텐츠만 쓴다. 이 경로는 로그인한
 * 본사 직원만 들어오는 내부 화면이고, 공개 샘플의 재료가 아니다.
 */
export default async function WeekStagePreviewPage({ params }: PreviewPageProps) {
  const { supabase } = await requireAdmin();
  const { weekNo: raw } = await params;

  const weekNo = Number(raw);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) notFound();

  const backHref = "/admin/curriculum";

  // ★ 내부 검수 경로 — 전사된 장면까지 본다.
  // ★ 어느 교안 버전을 검수하는지 **명시**한다. 주차 번호로 찾다가 다른
  //   버전을 승인하는 길을 두지 않는다.
  const loaded = await loadWeekContentForReview(supabase, weekNo);

  if (!loaded.ok) {
    // ★ fixture 로 대체하지 않는다. 검수자가 저장된 것과 다른 것을 승인하면
    //   발행된 내용과 검수한 내용이 어긋난다.
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stage p-12 text-center">
        <h1 className="font-serif text-[28px] font-bold text-forest">
          {weekNo}주차 장면을 열지 못했습니다
        </h1>
        <p className="max-w-[52ch] text-[16px] leading-relaxed text-muted-ink">{loaded.detail}</p>
        <p className="max-w-[52ch] text-[14px] leading-relaxed text-muted-ink">
          검수 대상 교안: {TAP24_PROGRAM_CODE} · {weekNo}주차
        </p>
        <Link
          href={backHref}
          className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-5 text-[16px] font-semibold text-forest"
        >
          교육과정으로 돌아가기
        </Link>
      </main>
    );
  }

  const { content, bodyVisible } = loaded.result;

  if (!bodyVisible || content.scenes.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stage p-12 text-center">
        <h1 className="font-serif text-[28px] font-bold text-forest">
          {weekNo}주차 장면이 아직 없습니다
        </h1>
        <p className="max-w-[46ch] text-[17px] leading-relaxed text-muted-ink">
          공식 가이드 원문을 아직 옮기지 않았습니다. 전사 후 이 화면에서 장면을 검수할 수
          있습니다.
        </p>
        <Link
          href={backHref}
          className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-5 text-[16px] font-semibold text-forest"
        >
          교육과정으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <ClassStage
      scenes={content.scenes}
      weekNo={weekNo}
      themeColor={content.summary.themeColor}
      lessonTitle={content.summary.title}
      exitHref={backHref}
      previewMode
    />
  );
}
