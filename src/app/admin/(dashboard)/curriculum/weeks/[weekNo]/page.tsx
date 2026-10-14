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
  ASSET_ACCESS_NOTE,
  REVIEWED_ASSET_LABEL,
  REVIEWED_ASSET_TYPES,
  fetchWeekAssetStatus,
  findGuideMentions,
  registrationOf,
  type AssetRegistration,
} from "@/lib/weeks/week-asset-queries";
import {
  NOTE_CATEGORY_LABEL,
  SCENE_TYPE_LABEL,
  hqDecisionNotes,
  partOf,
  unresolvedNotes,
} from "@/lib/weeks/week-types";
import { affectedByOtherDecisions, hqDecisionsOf } from "@/lib/weeks/hq-decisions";
import { getWeekContentFromDb, resolveProgramForProductVersion } from "@/lib/weeks/week-db-source";
import { TAP24_PROGRAM_CODE } from "@/lib/weeks/week-program";
import { guideSourceOf, shortHash } from "@/lib/weeks/guide-sources";

export const metadata: Metadata = {
  title: "주차 원문 대조 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface WeekReviewPageProps {
  params: Promise<{ weekNo: string }>;
}

/**
 * 자료 종류별 건수 한 줄.
 *
 * ★ 「경로 N건」과 「재생 가능 N건」은 다르다. 경로가 적혔는지만 셌다는 사실을
 *   말로 적는다.
 */
function RegistrationLine({ registration }: { registration: AssetRegistration }) {
  if (registration.rowCount === 0) {
    return <span className="text-navy/50">미등록</span>;
  }

  return (
    <span className="tabular-nums text-navy/70">
      등록 {registration.rowCount}건 · 경로 {registration.withPathCount}건 · 발행{" "}
      {registration.publishedCount}건 · 권리확인 {registration.rightsClearedCount}건 ·
      다운로드 허용 {registration.downloadAllowedCount}건
    </span>
  );
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
  // ★ 미해결 대조 주의가 남아 있으면 발행을 막는다. 해결된 기록은 세지 않는다.
  const pending = unresolvedNotes(content.transcriptionNotes);
  // ★ 본사가 정해야 풀리는 것들. 전사자가 고칠 수 없다.
  const decisions = hqDecisionNotes(content.transcriptionNotes);
  // ★ 주의 기록은 「무엇이 모호했나」만 적는다. 결정하려면 권장안과 영향 주차가
  //   필요해서 별도 목록(hq-decisions)이 그 둘을 들고 간다.
  const decisionDetails = hqDecisionsOf(weekNo);
  const affectedHere = affectedByOtherDecisions(weekNo);
  const blockers = publishBlockers(summary.status, pending.length);
  const assets = await fetchWeekAssetStatus(supabase, weekNo);
  const guideSource = guideSourceOf(weekNo);

  const transcribed = summary.status.transcription === "done";

  // ── 적재 상태 ────────────────────────────────────────────────────
  //
  // ★ DB 조회가 실패해도 **fixture 로 조용히 넘어가지 않는다.** 화면이 정상으로
  //   보이면 아무도 적재가 안 된 것을 모르고, 그 상태로 발행하면 교사는 DB 에
  //   없는 내용을 보게 된다. 아래 배너가 「지금 보는 것이 무엇인지」를 밝힌다.
  const dbState = await loadDbState(supabase, weekNo);

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
          기능은 데이터베이스 연결 단계에서 만듭니다. 그때 서버는 저장된 데이터에서 상태와
          미해결 건수를 직접 읽어 같은 판정을 다시 합니다.
        </p>
      </section>

      {/* ── 적재 상태 (지금 보는 것이 무엇인가) ── */}
      <section
        className={
          dbState.kind === "loaded"
            ? "mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4"
            : "mt-5 rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4"
        }
      >
        <h2 className="text-[15px] font-bold text-navy">
          {dbState.kind === "loaded" ? "데이터베이스 적재본" : "데이터베이스에서 읽지 못했습니다"}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-navy/80">{dbState.detail}</p>
        {dbState.kind !== "loaded" ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-navy/80">
            <strong className="font-bold">아래 본문은 저장소 전사본(fixture)입니다.</strong> 대조
            기준으로는 쓸 수 있지만 <strong className="font-bold">발행 근거가 아닙니다.</strong>{" "}
            발행은 데이터베이스에 적재된 내용으로만 판정합니다.
          </p>
        ) : null}
      </section>

      {/*
        ── 본사 결정 목록 ─────────────────────────────────────────────
        ★ 전사자가 풀 수 없는 것들만 모은다. 원문이 스스로 어긋나 있거나 상품
          기준을 정해야 한다. 코드가 한쪽을 고르면 그것이 공식 콘텐츠가 된다.
      */}
      {decisions.length > 0 ? (
        <section className="mt-5 rounded-xl border-2 border-rose-300 bg-rose-50 px-5 py-4">
          <h2 className="text-[15px] font-bold text-rose-900">
            본사 결정 필요{" "}
            <span className="text-[13px] font-normal tabular-nums">{decisions.length}건</span>
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-rose-900/80">
            원문 자체가 어긋나 있거나 상품 기준을 정해야 하는 항목입니다. 전사로는 풀 수 없고
            임의로 고치지 않았습니다. 정하신 뒤에 발행할 수 있습니다.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {decisions.map((note, index) => (
              <li
                key={`decision-${index}`}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2"
              >
                <p className="text-[13px] font-semibold text-rose-900">
                  {note.section}
                  <span className="ml-2 text-[12px] font-normal tabular-nums">
                    원문 p.{note.page}
                  </span>
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-rose-900/90">
                  {note.issue}
                </p>
              </li>
            ))}
          </ul>

          {/* ★ 권장안과 영향 주차. 결정을 내리려면 이 둘이 있어야 한다. */}
          {decisionDetails.map((d) => (
            <div key={d.id} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2">
              <p className="text-[13px] font-semibold text-rose-900">{d.sourceLocation}</p>
              <dl className="mt-1.5 flex flex-col gap-1.5 text-[12px] leading-relaxed">
                <div>
                  <dt className="font-semibold text-rose-900/70">지금 들어 있는 값</dt>
                  <dd className="text-rose-900/90">{d.currentValue}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-rose-900/70">전사자 권장안 (적용본 아님)</dt>
                  <dd className="text-rose-900/90">{d.recommendation}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-rose-900/70">영향 주차</dt>
                  <dd className="tabular-nums text-rose-900/90">
                    {d.affectedWeeks.map((w) => `${w}주`).join(" · ")}
                    {d.needsSourceFix ? " — 결정 후 원문 PDF 수정이 선행되어야 합니다" : " — 화면 표현 결정 (원문 수정 불필요)"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </section>
      ) : null}

      {/* ★ 다른 주차의 결정이 이 주차에도 걸리는 경우 (5주 음원 → 4주). */}
      {affectedHere.length > 0 ? (
        <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <h2 className="text-[15px] font-bold text-amber-900">
            다른 주차의 본사 결정에 영향을 받습니다{" "}
            <span className="text-[13px] font-normal tabular-nums">{affectedHere.length}건</span>
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {affectedHere.map((d) => (
              <li key={d.id} className="text-[12px] leading-relaxed text-amber-900/90">
                <strong className="font-semibold">{d.weekNo}주차 결정</strong> · {d.conflict}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 1. 원문 ── */}
      <section className="mt-5 rounded-xl border border-navy/10 bg-white px-5 py-4">
        <h2 className="text-[15px] font-bold text-navy">1. 원문</h2>
        <dl className="mt-2 grid gap-2 text-[13px] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-navy/55">원문 파일 (출처 기록)</dt>
            <dd className="font-semibold break-all text-navy">
              {guideSource ? guideSource.file : "출처 기록 없음"}
            </dd>
          </div>
          {guideSource ? (
            <>
              <div>
                <dt className="text-navy/55">SHA-256 (앞 12자)</dt>
                <dd className="font-mono text-[12px] text-navy">
                  {shortHash(guideSource.sha256)}
                </dd>
              </div>
              <div>
                <dt className="text-navy/55">분량</dt>
                <dd className="tabular-nums text-navy">
                  {guideSource.pages}쪽 · {guideSource.bytes.toLocaleString("ko-KR")}바이트
                </dd>
              </div>
            </>
          ) : null}
          <div>
            <dt className="text-navy/55">전사본이 적은 출처 파일</dt>
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

        {/*
          ★ 전사본이 적어 둔 파일명과 출처 기록이 어긋나면 **다른 파일을 보고
            옮겼을 수 있다.** 조용히 넘기지 않고 화면에 띄운다.
        */}
        {transcribed && guideSource && coverage.sourceFile !== guideSource.file ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] leading-relaxed text-rose-800">
            전사본이 적은 파일명이 출처 기록과 다릅니다. 다른 판본을 보고 옮겼을 수 있으니
            대조가 필요합니다.
          </p>
        ) : null}

        <p className="mt-3 text-[12px] leading-relaxed text-navy/50">
          원문 PDF 는 저장소에 넣지 않습니다. 해시는 검수자가 손에 든 파일이 전사할 때 본 그
          파일인지 확인하는 용도이고, 교사·원장 화면에는 나오지 않습니다. 문장 대조는 검수자가
          가진 원문으로 합니다.
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

        {/*
          ★ 전사하면서 분명하지 않았던 곳을 그대로 보여 준다.
            PDF 에서 표를 글자로 뽑으면 어느 칸이 어느 행인지 흐려지는 자리가
            생긴다. 가장 그럴듯한 해석으로 채우되 **그 사실을 숨기지 않는다.**
            이 목록이 검수자가 먼저 펴 봐야 하는 쪽이다.
        */}
        <div className="mt-4 border-t border-navy/10 pt-3">
          <h3 className="text-[14px] font-bold text-navy">
            전사 중 분명하지 않았던 곳{" "}
            <span className="text-[12px] font-normal tabular-nums text-navy/55">
              미해결 {pending.length}건 · 해결 {content.transcriptionNotes.length - pending.length}
              건
            </span>
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-navy/55">
            미해결이 하나라도 있으면 발행할 수 없습니다. 해결된 기록은 지우지 않고 남겨
            둡니다 — 무엇을 어떻게 확인했는지가 사라지면 다음 판본에서 같은 자리를 다시
            의심해야 합니다.
          </p>
          {content.transcriptionNotes.length === 0 ? (
            <p className="mt-1 text-[12px] leading-relaxed text-navy/55">
              {transcribed
                ? "적어 둔 것이 없습니다. 「주의할 것이 없다」는 뜻이 아니라 「아직 정리하지 않았다」일 수도 있으니 원문과 대조해 주십시오."
                : "전사 전이라 기록이 없습니다."}
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {/* ★ 미해결을 먼저 보여 준다. 해결된 것은 이력으로 아래에 남는다. */}
              {[...content.transcriptionNotes]
                .sort((a, b) =>
                  a.status === b.status ? 0 : a.status === "unresolved" ? -1 : 1,
                )
                .map((note, index) => {
                  const open = note.status === "unresolved";
                  return (
                    <li
                      key={`${note.section}-${index}`}
                      className={`rounded-lg border px-3 py-2 ${
                        open
                          ? "border-amber-300 bg-amber-50"
                          : "border-navy/10 bg-navy/[0.02]"
                      }`}
                    >
                      <p
                        className={`flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold ${
                          open ? "text-amber-900" : "text-navy/70"
                        }`}
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            open
                              ? "bg-amber-200 text-amber-900"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {open ? "미해결" : "해결"}
                        </span>
                        <span className="rounded border border-navy/20 px-1.5 py-0.5 text-[11px] font-normal text-navy/60">
                          {NOTE_CATEGORY_LABEL[note.category]}
                        </span>
                        {note.section}
                        <span className="text-[12px] font-normal tabular-nums">
                          원문 p.{note.page}
                        </span>
                      </p>
                      <p
                        className={`mt-0.5 text-[12px] leading-relaxed ${
                          open ? "text-amber-900" : "text-navy/60"
                        }`}
                      >
                        {note.issue}
                      </p>
                      {note.evidence ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-emerald-800">
                          확인 근거 — {note.evidence}
                        </p>
                      ) : (
                        <p className="mt-1 text-[12px] leading-relaxed text-amber-900/70">
                          확인 근거 없음. 전사본의 이 자리는 잠정 해석입니다.
                        </p>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
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
          <>
            {/* ── 원문이 요구하는 자료 (주차 단위) ── */}
            <ul className="mt-2 flex flex-col gap-2">
              {REVIEWED_ASSET_TYPES.map((assetType) => {
                const mentions = transcribed ? findGuideMentions(content, assetType) : [];
                const totalRegistration = registrationOf(assets.total, assetType);

                // ★ 합계가 가리는 누락을 찾는다 — 프로그램별로 따로 본다.
                const programsWithoutPath = assets.programs.filter(
                  (p) => registrationOf(p.subtotal, assetType).withPathCount === 0,
                );

                return (
                  <li
                    key={assetType}
                    className="rounded-lg border border-navy/10 bg-navy/[0.02] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[14px] font-bold text-navy">
                        {REVIEWED_ASSET_LABEL[assetType]}
                      </h3>
                      <span className="text-[12px]">
                        <span className="text-navy/45">주차 합계 </span>
                        <RegistrationLine registration={totalRegistration} />
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

                    {/*
                      ★ 원문에는 있는데 경로가 없다 — 누락이다.
                        합계가 아니라 **프로그램별로** 판정한다. A 프로그램에 파일이
                        있어도 B 프로그램으로 수업하는 기관은 자료 없이 수업한다.
                    */}
                    {mentions.length > 0 && programsWithoutPath.length > 0 ? (
                      <p className="mt-1.5 text-[12px] leading-relaxed font-semibold text-amber-800">
                        누락 — 원문은 이 자료를 쓰라고 하는데 경로가 등록된 파일이 없는
                        프로그램이 있습니다:{" "}
                        {programsWithoutPath
                          .map((p) => p.programTitle ?? "이름 없는 프로그램")
                          .join(", ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {/* ── 프로그램 · 차시별 내역 ── */}
            <h3 className="mt-5 text-[14px] font-bold text-navy">프로그램 · 차시별 내역</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-navy/55">
              위 합계를 나눈 것입니다. 한 프로그램의 파일이 다른 프로그램의 누락을 가리지
              않도록 차시까지 내려가 적습니다.
            </p>

            <div className="mt-2 flex flex-col gap-3">
              {assets.programs.map((program) => (
                <section
                  key={program.programId}
                  className="rounded-lg border border-navy/10 px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-[13px] font-bold text-navy">
                      {program.programTitle ?? "이름 없는 프로그램"}
                      <span className="ml-2 text-[12px] font-normal tabular-nums text-navy/50">
                        차시 {program.lessons.length}개
                      </span>
                    </h4>
                  </div>

                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {REVIEWED_ASSET_TYPES.map((assetType) => {
                      const sub = registrationOf(program.subtotal, assetType);
                      return (
                        <li
                          key={assetType}
                          className={`rounded border px-2 py-0.5 text-[12px] tabular-nums ${
                            sub.withPathCount > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : sub.rowCount > 0
                                ? "border-amber-300 bg-amber-50 text-amber-900"
                                : "border-navy/15 text-navy/50"
                          }`}
                        >
                          {REVIEWED_ASSET_LABEL[assetType]} ·{" "}
                          {sub.rowCount === 0
                            ? "미등록"
                            : `경로 ${sub.withPathCount}/${sub.rowCount}`}
                        </li>
                      );
                    })}
                  </ul>

                  <ul className="mt-2 flex flex-col gap-1.5 border-t border-navy/8 pt-2">
                    {program.lessons.map((status) => (
                      <li key={status.lesson.lessonId}>
                        <p className="text-[13px] text-navy/70">
                          <span className="tabular-nums">{status.lesson.sessionNo}차시</span>{" "}
                          <Link
                            href={`/admin/curriculum/${status.lesson.programId}/lessons/${status.lesson.lessonId}`}
                            className="font-semibold text-navy underline"
                          >
                            {status.lesson.title}
                          </Link>
                        </p>
                        <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {REVIEWED_ASSET_TYPES.map((assetType) => {
                            const reg = registrationOf(status.registrations, assetType);
                            return (
                              <li
                                key={assetType}
                                className="text-[12px] tabular-nums text-navy/55"
                              >
                                {REVIEWED_ASSET_LABEL[assetType]}{" "}
                                {reg.rowCount === 0
                                  ? "미등록"
                                  : `${reg.withPathCount}/${reg.rowCount}`}
                              </li>
                            );
                          })}
                        </ul>
                        {status.otherTypes.length > 0 ? (
                          <p className="mt-0.5 text-[12px] text-navy/45">
                            그 밖 —{" "}
                            {status.otherTypes
                              .map((t) => `${t.assetType} ${t.rowCount}건`)
                              .join(", ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}

        {assets.totalOtherTypes.length > 0 ? (
          <p className="mt-2 text-[12px] text-navy/55">
            다섯 종 밖의 자산도 등록돼 있습니다 —{" "}
            {assets.totalOtherTypes.map((t) => `${t.assetType} ${t.rowCount}건`).join(", ")}
          </p>
        ) : null}

        <p className="mt-3 text-[12px] leading-relaxed text-navy/50">
          「원문 언급」은 전사된 섹션에서 자료 이름을 찾은 결과이고, 찾은 문구를 그대로
          보여 줍니다. 키워드로 찾으므로 빠진 것이 있을 수 있어 원문과 함께 확인해 주십시오.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed font-semibold text-navy/60">
          {ASSET_ACCESS_NOTE}
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

/* ───────────────────────────── 적재 상태 */

type DbState =
  | { kind: "loaded"; detail: string }
  | { kind: "not_loaded"; detail: string }
  | { kind: "failed"; detail: string };

/**
 * DB 에 이 주차가 적재돼 있는지 확인한다.
 *
 * ★ 실패를 성공처럼 돌려주지 않는다. 「아직 적재 전」과 「조회가 실패했다」도
 *   구분한다 — 전자는 기다리면 되고 후자는 사람이 봐야 한다.
 */
async function loadDbState(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  weekNo: number,
): Promise<DbState> {
  const program = await supabase
    .from("curriculum_programs")
    .select("id")
    .eq("code", TAP24_PROGRAM_CODE)
    .maybeSingle();

  if (program.error) {
    return { kind: "failed", detail: `프로그램 조회 실패: ${program.error.message}` };
  }
  if (!program.data) {
    return {
      kind: "not_loaded",
      detail: `교안 프로그램 ${TAP24_PROGRAM_CODE} 이 아직 적재되지 않았습니다 (supabase/content/tap24_2026_1_load.sql).`,
    };
  }

  const loaded = await getWeekContentFromDb(supabase, {
    programId: program.data.id as string,
    weekNo,
    audience: "internal_review",
  });

  if (loaded.ok) {
    const blocks = Object.values(loaded.result.content.blocks).filter((v) => v !== null).length;
    return {
      kind: "loaded",
      detail: `섹션 ${blocks}/15 · 장면 ${loaded.result.content.scenes.length} · 검수 기록 ${loaded.result.content.transcriptionNotes.length}건이 데이터베이스에 있습니다.`,
    };
  }

  if (loaded.reason === "lesson_not_found") {
    return { kind: "not_loaded", detail: `${weekNo}주차가 아직 적재되지 않았습니다.` };
  }
  return { kind: "failed", detail: `${loaded.reason}: ${loaded.detail}` };
}

// resolveProgramForProductVersion 은 계약 경로에서 쓴다. 여기서는 본사 검수라
// 상품 버전을 거치지 않고 프로그램 코드로 직접 찾는다.
void resolveProgramForProductVersion;
