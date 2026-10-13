import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell } from "@/components/public/InfoPageShell";
import { WeekRibbon } from "@/components/weeks/WeekRibbon";
import {
  INTEGRATION_WEEKS,
  curriculumCopy,
  publicParts,
} from "@/data/public-curriculum";

export const metadata: Metadata = {
  title: "24주 수업 소개 | TeachAble Art Play",
  description:
    "그림책에서 시작해 몸으로 느끼고 표현하는 24주 통합예술 수업. 8주씩 세 권으로 이어지는 과정을 소개합니다.",
};

/**
 * 공개 24주 수업 소개.
 *
 * ── 교안을 공개하지 않는다 ───────────────────────────────────────
 *
 * ★ 이 페이지는 `getWeekContent()` 를 부르지 않는다. 공개용으로 좁힌
 *   `public-curriculum.ts` 만 읽는다. 발문 · 교사 대응 · 관찰 기준 같은
 *   교사용 원문은 이 페이지의 HTML 에 들어가지 않는다.
 *
 * ── 제공 상태를 분명히 한다 ──────────────────────────────────────
 *
 * ★ 지금 제공되는 주차와 준비 중인 주차를 나눠 표시한다. 24주 전체를 지금
 *   쓸 수 있는 것처럼 보이게 하지 않는다.
 */
export default function CurriculumPage() {
  return (
    <PublicShell>
      <InfoPageShell
        eyebrow={curriculumCopy.eyebrow}
        headline={curriculumCopy.headline}
        subCopy={curriculumCopy.subCopy}
      >
        <div className="rounded-xl border border-line bg-surface-soft px-5 py-4">
          <p className="text-body-sm leading-relaxed text-ink-muted">
            {curriculumCopy.availabilityNote}
          </p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">
            {curriculumCopy.detailNote}
          </p>
        </div>

        {publicParts.map((part) => (
          <section key={part.partNo} className="mt-12" aria-labelledby={`part-${part.partNo}`}>
            <h2 id={`part-${part.partNo}`} className="text-h3 font-bold text-navy">
              {part.partNo}권 · {part.title}{" "}
              <span className="text-body-sm font-normal text-ink-muted">
                {part.weekFrom}~{part.weekTo}주
              </span>
            </h2>
            {part.nameProvisional ? (
              <p className="mt-1 text-caption text-ink-muted">{curriculumCopy.partNote}</p>
            ) : null}

            <ul className="mt-5 flex flex-col gap-3">
              {part.weeks.map((week) => (
                <li
                  key={week.weekNo}
                  className="flex gap-4 rounded-xl border border-line bg-white px-5 pb-5 pt-0"
                >
                  <WeekRibbon weekNo={week.weekNo} themeColor={week.themeColor} state="next" size="m" />
                  <div className="min-w-0 pt-5">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="text-body font-bold text-navy">{week.title}</h3>
                      <span className="text-caption text-ink-muted">
                        성장키워드 {week.growthKeyword}
                      </span>
                      {!week.available ? (
                        <span className="rounded-md bg-surface-soft px-2 py-0.5 text-micro font-semibold text-ink-muted">
                          준비 중
                        </span>
                      ) : null}
                      {INTEGRATION_WEEKS.includes(week.weekNo) ? (
                        <span className="rounded-md bg-brand-mint px-2 py-0.5 text-micro font-semibold text-success-text">
                          앞선 주차 결과물을 모으는 주
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-ink">
                      {week.coreMessage}
                    </p>
                    <p className="mt-1 text-caption text-ink-muted">{week.activitySummary}</p>
                    {week.outcome ? (
                      <p className="mt-0.5 text-caption text-ink-muted">결과물 · {week.outcome}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link
            href="/sample"
            className="inline-flex min-h-12 items-center rounded-lg border border-navy/20 px-5 text-label font-semibold text-navy"
          >
            샘플 수업 체험하기
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-12 items-center rounded-lg border border-navy/20 px-5 text-label font-semibold text-navy"
          >
            상품 비교 보기
          </Link>
        </div>
      </InfoPageShell>
    </PublicShell>
  );
}
