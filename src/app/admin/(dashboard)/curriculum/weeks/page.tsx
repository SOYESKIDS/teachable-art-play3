import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import {
  PUBLICATION_LABEL,
  TRANSCRIPTION_LABEL,
  canPublish,
  publishBlockers,
  PUBLISH_BLOCKER_NOTE,
} from "@/lib/weeks/content-state";
import { getWeekContent } from "@/lib/weeks/week-source";
import { SECTION_TOTAL, weekCoverage } from "@/lib/weeks/week-coverage";
import {
  ASSET_ACCESS_NOTE,
  REVIEWED_ASSET_LABEL,
  REVIEWED_ASSET_TYPES,
  fetchWeekAssetRollup,
} from "@/lib/weeks/week-asset-queries";
import { WEEK_INDEX } from "@/lib/weeks/week-index";
import { PARTS, unresolvedNotes } from "@/lib/weeks/week-types";

export const metadata: Metadata = {
  title: "주차 콘텐츠 검수 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

/**
 * 본사 주차 콘텐츠 검수 — 24주 현황.
 *
 * ── 세 가지를 한 줄에 나란히 놓는다 ──────────────────────────────
 *
 * ★ **전사** — 15개 섹션 중 몇 칸을 옮겼나.
 * ★ **검수·발행** — 본사가 대조를 끝냈나. 전사와 다른 축이다.
 * ★ **자료** — 교안·그림책·음원·영상·워크북이 각각 등록됐나.
 *
 * 하나로 합친 「완료율」을 만들지 않는다. 전사가 끝나도 검수는 남아 있고,
 * 검수가 끝나도 자료가 없으면 수업이 안 된다. 합치면 그 차이가 사라진다.
 *
 * ── 발행 순서를 코드가 지킨다 ────────────────────────────────────
 *
 * ★ 전사하지 않은 주차는 `canPublish()` 가 거부한다. 이 화면은 그 판정을
 *   그대로 보여 주고, 막힌 이유를 적는다. 화면에서 버튼만 숨기지 않는다.
 */
export default async function AdminWeekReviewPage() {
  const { supabase } = await requireAdmin();

  const assetRollup = await fetchWeekAssetRollup(supabase);

  const rows = WEEK_INDEX.map((summary) => {
    // ★ 내부 검수 경로 — 전사된 본문까지 읽는다.
    const result = getWeekContent(summary.weekNo, "internal_review");
    const coverage = result ? weekCoverage(result.content) : null;
    const notes = result?.content.transcriptionNotes ?? [];
    return { summary, coverage, openNotes: unresolvedNotes(notes).length };
  });

  const transcribedCount = rows.filter(
    (r) => r.summary.status.transcription === "done",
  ).length;
  const publishedCount = rows.filter((r) => r.summary.status.publication === "published").length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold text-navy">주차 콘텐츠 검수</h1>
        <p className="text-[14px] text-navy/55">
          공식 교사용 수업가이드 원문과 서비스에 들어온 전사본을 주차별로 대조합니다.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-navy/10 bg-white px-5 py-4">
          <p className="text-[13px] text-navy/55">원문 전사</p>
          <p className="mt-0.5 text-[20px] font-bold tabular-nums text-navy">
            {transcribedCount} / 24주
          </p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white px-5 py-4">
          <p className="text-[13px] text-navy/55">검수 · 발행</p>
          <p className="mt-0.5 text-[20px] font-bold tabular-nums text-navy">
            {publishedCount} / 24주
          </p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white px-5 py-4">
          <p className="text-[13px] text-navy/55">자료 연결</p>
          <p className="mt-0.5 text-[15px] font-semibold text-navy">
            {assetRollup.ok
              ? `차시 연결 ${assetRollup.byWeek.size}주차`
              : "불러오지 못함"}
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-[13px] leading-relaxed text-amber-900">
        전사와 검수·발행은 다른 일입니다. 원문을 옮겼다고 교사에게 열리는 것이 아니고, 아직
        옮기지 않은 주차는 <strong>발행할 수 없도록 코드가 막습니다</strong>. 자료 등록 건수는
        수업 차시(<code>curriculum_lessons</code>)가 연결된 주차에서만 셉니다.
      </p>

      <p className="mt-2 text-[12px] leading-relaxed text-navy/55">
        아래 자료 칸은 그 주차에 걸린 <strong>여러 프로그램을 더한 합계</strong>입니다. 합계가
        0이 아니어도 그 자료가 아예 없는 프로그램이 있을 수 있어, 그런 경우 「없는 프로그램 N개」를
        함께 적습니다. 프로그램·차시별 내역은 주차를 눌러 확인하십시오. {ASSET_ACCESS_NOTE}
      </p>

      {!assetRollup.ok ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-[13px] text-rose-800">
          자료 등록 현황을 불러오지 못했습니다. 아래 자료 칸은 0건이 아니라 &ldquo;확인 불가&rdquo;
          입니다.
        </p>
      ) : null}

      {PARTS.map((part) => (
        <section key={part.partNo} className="mt-7">
          <h2 className="text-[16px] font-bold text-navy">
            {part.partNo}권 {part.title}
            <span className="ml-2 text-[13px] font-normal text-navy/50">
              {part.weekFrom}~{part.weekTo}주
            </span>
            {part.nameProvisional ? (
              <span className="ml-2 rounded border border-navy/15 px-1.5 py-0.5 text-[11px] font-normal text-navy/50">
                파트명 임시 — 원문 미기재
              </span>
            ) : null}
          </h2>

          <ul className="mt-3 flex flex-col gap-2">
            {rows
              .filter(
                (r) =>
                  r.summary.weekNo >= part.weekFrom && r.summary.weekNo <= part.weekTo,
              )
              .map(({ summary, coverage, openNotes }) => {
                const blockers = publishBlockers(summary.status, openNotes);
                const weekRollup = assetRollup.byWeek.get(summary.weekNo);
                const lessonCount = weekRollup?.lessonCount ?? 0;
                const programCount = weekRollup?.programCount ?? 0;

                return (
                  <li
                    key={summary.weekNo}
                    className="rounded-xl border border-navy/10 bg-white px-5 py-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/admin/curriculum/weeks/${summary.weekNo}`}
                        className="text-[16px] font-bold text-navy underline-offset-2 hover:underline"
                      >
                        <span className="tabular-nums">{summary.weekNo}주차</span>{" "}
                        {summary.title}
                      </Link>
                      <span className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <span className="rounded border border-navy/15 px-2 py-0.5 text-navy/60">
                          전사 · {TRANSCRIPTION_LABEL[summary.status.transcription]}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 ${
                            summary.status.publication === "published"
                              ? "bg-emerald-100 font-semibold text-emerald-800"
                              : "border border-navy/15 text-navy/60"
                          }`}
                        >
                          검수 · {PUBLICATION_LABEL[summary.status.publication]}
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-navy/60">
                      <span className="tabular-nums">
                        섹션 {coverage?.filledCount ?? 0} / {SECTION_TOTAL}
                      </span>
                      <span className="tabular-nums">장면 {coverage?.sceneCount ?? 0}개</span>
                      {openNotes > 0 ? (
                        <span className="tabular-nums font-semibold text-amber-800">
                          미해결 대조 {openNotes}건
                        </span>
                      ) : null}
                      <span>성장키워드 {summary.growthKeyword}</span>
                      <span className="tabular-nums">
                        {lessonCount > 0
                          ? `차시 ${lessonCount}개 · 프로그램 ${programCount}개`
                          : "차시 미연결"}
                      </span>
                    </div>

                    {/* ── 자료 5종 ── */}
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {REVIEWED_ASSET_TYPES.map((assetType) => {
                        const cell = weekRollup?.byType.get(assetType);
                        const label = REVIEWED_ASSET_LABEL[assetType];

                        // ★ 네 가지를 구분한다:
                        //   확인 불가 / 차시 미연결 / 미등록 / 등록(경로 유무)
                        const text = !assetRollup.ok
                          ? "확인 불가"
                          : lessonCount === 0
                            ? "차시 미연결"
                            : !cell || cell.rowCount === 0
                              ? "미등록"
                              : cell.withPathCount === 0
                                ? `${cell.rowCount}건 · 경로 없음`
                                : `경로 ${cell.withPathCount}/${cell.rowCount}건`;

                        // ★ 합계가 가리는 누락을 드러낸다.
                        const missingNote =
                          assetRollup.ok && cell && cell.programsWithout > 0
                            ? ` · 없는 프로그램 ${cell.programsWithout}개`
                            : "";

                        const tone =
                          assetRollup.ok && cell && cell.programsWithout > 0
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : assetRollup.ok && cell && cell.withPathCount > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-navy/15 bg-navy/5 text-navy/55";

                        return (
                          <li
                            key={assetType}
                            className={`rounded border px-2 py-0.5 text-[12px] ${tone}`}
                          >
                            {label} · {text}
                            {missingNote}
                          </li>
                        );
                      })}
                    </ul>

                    {blockers.length > 0 ? (
                      <p className="mt-2 text-[12px] text-navy/50">
                        발행 불가 — {blockers.map((b) => PUBLISH_BLOCKER_NOTE[b]).join(" ")}
                      </p>
                    ) : canPublish(summary.status, openNotes) ? (
                      <p className="mt-2 text-[12px] font-semibold text-emerald-700">
                        전사 완료 — 본사 대조 검수 후 발행할 수 있습니다.
                      </p>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <div className="mt-8 flex flex-wrap gap-3 border-t border-navy/10 pt-6">
        <Link
          href="/admin/curriculum"
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/15 px-4 text-[14px] font-semibold text-navy"
        >
          수업 프로그램 관리
        </Link>
      </div>
    </div>
  );
}
