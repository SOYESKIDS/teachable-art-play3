import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import {
  PUBLICATION_LABEL,
  PUBLISH_BLOCKER_NOTE,
  TRANSCRIPTION_LABEL,
  canStartReview,
  publishBlockers,
} from "@/lib/weeks/content-state";
import { getWeekContent } from "@/lib/weeks/week-source";
import { SECTION_TOTAL, weekCoverage } from "@/lib/weeks/week-coverage";
import {
  REVIEWED_ASSET_LABEL,
  REVIEWED_ASSET_TYPES,
  fetchWeekAssetStatus,
  findGuideMentions,
} from "@/lib/weeks/week-asset-queries";
import { SCENE_TYPE_LABEL, partOf } from "@/lib/weeks/week-types";

export const metadata: Metadata = {
  title: "주차 원문 대조 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface WeekReviewPageProps {
  params: Promise<{ weekNo: string }>;
}

/**
 * 본사 주차 원문 대조 — 한 주차.
 *
 * ── 네 가지를 나란히 놓는다 ──────────────────────────────────────
 *
 *   1. **원문**   — 어느 파일을 보고 옮겼나. 파일명과 섹션 틀.
 *   2. **전사본** — 15개 섹션 중 어디가 채워졌나, 안에 몇 항목이 들어왔나.
 *   3. **장면**   — 교실 화면 장면과 각 장면의 원문 출처.
 *   4. **자료**   — 교안·그림책·음원·영상·워크북. 원문 언급과 파일 등록을 따로.
 *
 * ── 원문 본문은 여기 싣지 않는다 ─────────────────────────────────
 *
 * ★ 교안 원문 PDF 는 저장소에 넣지 않는다. 그래서 이 화면은 **원문 파일명과
 *   섹션 구조**만 적고, 실제 대조는 검수자가 손에 든 원문으로 한다. 화면이
 *   원문을 가진 척하지 않는다.
 *
 * ── 전사와 검수를 섞지 않는다 ────────────────────────────────────
 *
 * ★ 섹션이 다 채워져도 「검수 완료」가 아니다. 채워진 내용이 원문과 같은지는
 *   사람이 본다. 발행은 사람이 올린다.
 * ★ 전사 전 주차는 `publishBlockers()` 가 막는다. 이 화면은 그 이유를 적는다.
 */
export default async function AdminWeekDetailPage({ params }: WeekReviewPageProps) {
  const { supabase } = await requireAdmin();
  const { weekNo: raw } = await params;

  const weekNo = Number(raw);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) notFound();

  // ★ 내부 검수 경로 — 검수하려면 전사된 본문을 봐야 한다.
  const result = getWeekContent(weekNo, "internal_review");
  if (!result) notFound();

  const { content } = result;
  const summary = content.summary;
  const coverage = weekCoverage(content);
  const part = partOf(weekNo);
  const blockers = publishBlockers(summary.status);
  const assets = await fetchWeekAssetStatus(supabase, weekNo);

  const transcribed = summary.status.transcription === "done";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
      <Link
        href="/admin/curriculum/weeks"
        className="inline-flex min-h-11 items-center text-[13px] font-semibold text-navy/60"
      >
        ← 24주 검수 현황
      </Link>

      <div className="mt-2 flex flex-col gap-1">
        <h1 className="text-[22px] font-bold text-navy">
          <span className="tabular-nums">{weekNo}주차</span> {summary.title}
        </h1>
        <p className="text-[14px] text-navy/55">
          {part.partNo}권 {part.title}
          {part.nameProvisional ? " (파트명 임시)" : ""} · 성장키워드 {summary.growthKeyword} ·{" "}
          {summary.durationLabel}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
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
      </div>

      {/* ── 발행 판정 ── */}
      <section className="mt-5 rounded-xl border border-navy/10 bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-navy">발행 판정</h2>
        {blockers.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {blockers.map((b) => (
              <li key={b} className="text-[13px] leading-relaxed text-navy/70">
                막힘 — {PUBLISH_BLOCKER_NOTE[b]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-emerald-700">
            전사가 끝나 발행 조건을 만족합니다. 아래 대조를 마친 뒤 사람이 발행합니다.
          </p>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-navy/50">
          {canStartReview(summary.status)
            ? "검수 시작 가능 — 원문과 대조할 전사본이 들어와 있습니다."
            : "검수 상태는 코드가 자동으로 올리지 않습니다."}{" "}
          발행 상태는 지금 저장소 값(<code>week-index.ts</code>)에 적혀 있고, 화면에서 바꾸는
          기능은 데이터베이스 연결 단계에서 만듭니다.
        </p>
      </section>

      {/* ── 1. 원문 ── */}
      <section className="mt-5 rounded-xl border border-navy/10 bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-navy">1. 원문</h2>
        <dl className="mt-2 grid gap-2 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-navy/55">원문 파일</dt>
            <dd className="font-semibold break-all text-navy">
              {coverage.sourceFile ?? "기록 없음 — 전사 전"}
            </dd>
          </div>
          <div>
            <dt className="text-navy/55">그림책</dt>
            <dd className="font-semibold text-navy">{summary.storybook}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-navy/55">핵심 메시지</dt>
            <dd className="leading-relaxed text-navy">{summary.coreMessage}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-navy/50">
          원문 PDF 는 저장소에 넣지 않습니다. 이 화면은 파일명과 섹션 구조만 적고, 문장 대조는
          검수자가 가진 원문으로 합니다.
        </p>
      </section>

      {/* ── 2. 전사본 ── */}
      <section className="mt-5 rounded-xl border border-navy/10 bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-navy">
          2. 전사본{" "}
          <span className="text-[13px] font-normal tabular-nums text-navy/55">
            {coverage.filledCount} / {SECTION_TOTAL} 섹션
          </span>
        </h2>
        <ul className="mt-2 flex flex-col divide-y divide-navy/8">
          {coverage.sections.map((section) => (
            <li
              key={section.no}
              className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 text-[13px]"
            >
              <span className="text-navy">
                <span className="tabular-nums text-navy/50">{section.no}.</span> {section.label}
              </span>
              <span
                className={
                  section.filled ? "font-semibold text-emerald-700" : "text-navy/45"
                }
              >
                {section.filled
                  ? section.itemCount !== null
                    ? `들어옴 · ${section.itemCount}항목`
                    : "들어옴"
                  : transcribed
                    ? "비어 있음 — 원문 확인 필요"
                    : "전사 전"}
              </span>
            </li>
          ))}
        </ul>
        {coverage.homeConnectionUndecided ? (
          <p className="mt-2 text-[12px] text-amber-800">
            13. 가정연계가 원문에서 「미정」입니다. 빈 칸이 아니라 원문 자체가 정해지지 않은
            상태입니다.
          </p>
        ) : null}
        <p className="mt-2 text-[12px] leading-relaxed text-navy/50">
          「비어 있음」은 옮기지 않은 칸과 원문에 없는 칸을 구분하지 못합니다. 원문을 보고
          판단해 주십시오.
        </p>
      </section>

      {/* ── 3. 장면 ── */}
      <section className="mt-5 rounded-xl border border-navy/10 bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-navy">
          3. 교실 화면 장면{" "}
          <span className="text-[13px] font-normal tabular-nums text-navy/55">
            {coverage.sceneCount}개
          </span>
        </h2>
        {content.scenes.length === 0 ? (
          <p className="mt-2 text-[13px] text-navy/55">
            장면이 아직 없습니다. 전사 후 장면을 구성합니다.
          </p>
        ) : (
          <ol className="mt-2 flex flex-col divide-y divide-navy/8">
            {content.scenes.map((scene) => (
              <li key={scene.sceneNo} className="py-2">
                <div className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                  <span className="tabular-nums font-semibold text-navy">{scene.sceneNo}</span>
                  <span className="rounded border border-navy/15 px-1.5 py-0.5 text-[11px] text-navy/60">
                    {SCENE_TYPE_LABEL[scene.sceneType]}
                  </span>
                  {scene.stageLabel ? (
                    <span className="text-navy/70">{scene.stageLabel}</span>
                  ) : null}
                  <span className="text-[12px] text-navy/45">출처 {scene.sourceRef}</span>
                  {scene.baseSeconds !== null ? (
                    <span className="text-[12px] tabular-nums text-navy/45">
                      권장 {Math.round(scene.baseSeconds / 60)}분
                    </span>
                  ) : (
                    <span className="text-[12px] text-navy/45">권장 시간 미표기</span>
                  )}
                </div>
                <p className="mt-1 text-[14px] leading-relaxed text-navy">{scene.kidText}</p>
                {scene.teacherNote ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-navy/55">
                    교사 노트 — {scene.teacherNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {content.scenes.length > 0 ? (
          <Link
            href={`/admin/curriculum/weeks/${weekNo}/preview`}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-navy/15 px-4 text-[13px] font-semibold text-navy"
          >
            교실 화면으로 미리보기
          </Link>
        ) : null}
      </section>

      {/* ── 4. 자료 ── */}
      <section className="mt-5 rounded-xl border border-navy/10 bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-navy">4. 자료 등록</h2>

        {!assets.ok ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
            자료 등록 현황을 불러오지 못했습니다. 미등록이 아니라 확인하지 못한 상태입니다.
          </p>
        ) : !assets.lessonLinked ? (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
            이 주차에 연결된 수업 차시가 없어 자료 건수를 셀 수 없습니다. 0건이 아닙니다. 수업
            프로그램에 {weekNo}주차 차시를 만들면 그 차시에 자료를 등록할 수 있습니다.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-[13px]">
            {assets.lessons.map((lesson) => (
              <li key={lesson.lessonId} className="text-navy/70">
                {lesson.programTitle ?? "프로그램 이름 없음"} · {lesson.sessionNo}차시{" "}
                <Link
                  href={`/admin/curriculum/${lesson.programId}/lessons/${lesson.lessonId}`}
                  className="font-semibold text-navy underline"
                >
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-3 flex flex-col gap-2">
          {REVIEWED_ASSET_TYPES.map((assetType) => {
            const registration = assets.registrations.find((r) => r.assetType === assetType);
            const mentions = transcribed ? findGuideMentions(content, assetType) : [];

            return (
              <li
                key={assetType}
                className="rounded-lg border border-navy/10 bg-navy/[0.02] px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[14px] font-bold text-navy">
                    {REVIEWED_ASSET_LABEL[assetType]}
                  </h3>
                  <span className="text-[12px] tabular-nums text-navy/60">
                    {!assets.ok
                      ? "등록 확인 불가"
                      : !assets.lessonLinked
                        ? "차시 미연결 — 셀 수 없음"
                        : !registration || registration.rowCount === 0
                          ? "미등록"
                          : `등록 ${registration.rowCount}건 · 파일 ${registration.withSourceCount}건 · 발행 ${registration.publishedCount}건 · 권리확인 ${registration.rightsClearedCount}건`}
                  </span>
                </div>

                <p className="mt-1 text-[12px] text-navy/55">
                  {!transcribed
                    ? "원문 언급 — 전사 전이라 확인할 수 없습니다."
                    : mentions.length === 0
                      ? "원문 언급 — 전사된 섹션에서 찾지 못했습니다."
                      : `원문 언급 ${mentions.length}곳`}
                </p>

                {mentions.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {mentions.slice(0, 4).map((mention, index) => (
                      <li
                        key={`${mention.section}-${index}`}
                        className="text-[12px] leading-relaxed text-navy/70"
                      >
                        <span className="text-navy/45">{mention.section} —</span>{" "}
                        {mention.quote}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* ★ 원문에는 있는데 파일이 없다 — 이것이 누락 자료다. */}
                {assets.ok &&
                assets.lessonLinked &&
                mentions.length > 0 &&
                (!registration || registration.withSourceCount === 0) ? (
                  <p className="mt-1.5 text-[12px] font-semibold text-amber-800">
                    누락 — 원문은 이 자료를 쓰라고 하는데 등록된 파일이 없습니다.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        {assets.otherTypes.length > 0 ? (
          <p className="mt-2 text-[12px] text-navy/55">
            다섯 종 밖의 자산도 등록돼 있습니다 —{" "}
            {assets.otherTypes.map((t) => `${t.assetType} ${t.rowCount}건`).join(", ")}
          </p>
        ) : null}

        <p className="mt-3 text-[12px] leading-relaxed text-navy/50">
          「원문 언급」은 전사된 섹션에서 자료 이름을 찾은 결과이고, 찾은 문구를 그대로
          보여 줍니다. 키워드로 찾으므로 빠진 것이 있을 수 있어 원문과 함께 확인해 주십시오.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-navy/10 pt-6">
        <Link
          href={`/admin/curriculum/weeks/${weekNo}/quick-guide`}
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/15 px-4 text-[14px] font-semibold text-navy"
        >
          퀵 가이드 인쇄본
        </Link>
        <Link
          href="/admin/curriculum/weeks"
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/15 px-4 text-[14px] font-semibold text-navy"
        >
          24주 현황
        </Link>
      </div>
    </div>
  );
}
