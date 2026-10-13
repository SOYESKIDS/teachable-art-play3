import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getWeekContent } from "@/lib/weeks/week-source";
import { QuickGuideSheet } from "@/components/weeks/QuickGuideSheet";
import { PrintButton } from "@/components/weeks/PrintButton";

export const metadata: Metadata = {
  title: "퀵 가이드 검수본 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface AdminQuickGuidePageProps {
  params: Promise<{ weekNo: string }>;
}

/**
 * 본사 퀵 가이드 검수본.
 *
 * ★ `internal_review` 경로이므로 **검수 전 전사본도** 보인다. 검수하려면 봐야
 *   한다.
 * ★ 종이에 「본사 내부 검수본」을 찍는다. 검수 중 출력물이 기관으로 흘러가면
 *   어느 장이 검수 전인지 구분할 수 없다.
 * ★ 교사용 인쇄 경로(`/teacher/weeks/N/quick-guide`)는 발행된 주차만 내보낸다.
 *   그 제한을 여기서 우회하는 것이 아니라, 받는 사람이 달라 다른 경로다.
 */
export default async function AdminQuickGuidePage({ params }: AdminQuickGuidePageProps) {
  await requireAdmin();
  const { weekNo: raw } = await params;

  const weekNo = Number(raw);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) notFound();

  const result = getWeekContent(weekNo, "internal_review");
  if (!result) notFound();

  return (
    <main className="min-h-screen bg-navy/5 py-6 print:bg-white print:py-0">
      <div className="print:hidden mx-auto mb-4 flex w-full max-w-[186mm] flex-wrap items-center justify-between gap-3 px-6">
        <Link
          href={`/admin/curriculum/weeks/${weekNo}`}
          className="inline-flex min-h-11 items-center text-[14px] font-semibold text-navy"
        >
          ← {weekNo}주차 원문 대조
        </Link>
        {result.bodyVisible ? <PrintButton label="A4 한 장 인쇄" /> : null}
      </div>

      {!result.bodyVisible ? (
        <section className="mx-auto w-full max-w-[186mm] rounded-xl border border-amber-300 bg-amber-50 px-6 py-8">
          <h1 className="text-[18px] font-bold text-amber-900">
            {weekNo}주차 퀵 가이드를 아직 옮기지 않았습니다
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-amber-900">
            원문 15번 섹션을 전사하면 이 화면에서 인쇄본을 검수할 수 있습니다.
          </p>
        </section>
      ) : (
        <QuickGuideSheet content={result.content} internalReview />
      )}
    </main>
  );
}
