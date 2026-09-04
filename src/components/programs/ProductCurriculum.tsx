"use client";

import { useState } from "react";
import type {
  ProgramCurriculumWeek,
  ProgramProduct,
  ProgramWeekActivity,
} from "@/data/program-products";

/**
 * 주차별 구성 — 아코디언.
 *
 * ★ 이 컴포넌트는 데이터가 있을 때만 불린다.
 *   16주 · 24주는 아직 확정본이 없어 product.curriculum 이 undefined 이고,
 *   그러면 상세 화면에 이 단락 자체가 생기지 않는다.
 *
 * ★ 기본은 전부 닫힘, 한 번에 하나만 열린다.
 *   여덟 개를 모두 펼쳐 두면 8주가 한눈에 들어오지 않고 페이지만 길어진다.
 *   닫힌 줄에서 이미 그 주가 어떤 주인지(주제 · 성장 지점 · 그림책 ·
 *   한 줄 메시지) 읽히므로, 펼치는 것은 더 알고 싶을 때의 선택이다.
 *
 * ★ 있는 것만 그린다.
 *   1~6주차는 교사용 수업가이드가 확정본이라 활동 네 갈래가 모두 들어 있고,
 *   7~8주차는 별도로 준비 중이라 활동명까지만 있다.
 *   없는 칸을 그럴듯한 문장으로 메우지 않는다.
 *
 * ★ 교사용 자료는 여기에 오지 않는다.
 *   교사 발문 · 교사 역할 · 아이 반응별 대응 · 난이도 조절 · 개별 지원 ·
 *   준비물 · 공간 세팅 · 안전 지침 · 관찰지표 · 기록 예문은 공개 화면에
 *   담지 않는다. 여기 있는 것은 학부모와 원장이 보아도 되는 범위,
 *   즉 "아이가 무엇을 경험하는가"까지다.
 */
export function ProductCurriculum({ product }: { product: ProgramProduct }) {
  const { curriculum, theme } = product;

  // 훅은 조건부로 부를 수 없으므로 이른 return 보다 위에 둔다.
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  if (!curriculum) return null;

  return (
    <section className="border-t border-navy/10 pt-10 sm:pt-12">
      <p
        className={`text-[11px] font-bold tracking-[0.18em] ${theme.accentText}`}
      >
        {curriculum.eyebrow}
      </p>
      <h2 className="mt-2 text-[24px] font-bold leading-snug text-navy sm:text-[28px]">
        {curriculum.headline}
      </h2>
      <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-navy/60">
        {curriculum.subCopy}
      </p>

      <ol className="mt-7 flex flex-col gap-2">
        {curriculum.weeks.map((entry) => (
          <li key={entry.week}>
            <WeekRow
              entry={entry}
              accentText={theme.accentText}
              isOpen={openWeek === entry.week}
              // 열려 있던 것을 다시 누르면 닫히고, 다른 것을 누르면 그것만 열린다.
              onToggle={() =>
                setOpenWeek((current) =>
                  current === entry.week ? null : entry.week,
                )
              }
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function WeekRow({
  entry,
  accentText,
  isOpen,
  onToggle,
}: {
  entry: ProgramCurriculumWeek;
  accentText: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = `week-panel-${entry.week}`;
  const buttonId = `week-button-${entry.week}`;

  const cards = [
    { code: "MOVE & PLAY", activity: entry.movement },
    { code: "WORKBOOK", activity: entry.workbook },
    { code: "CREATE", activity: entry.creative },
    { code: "HOME", activity: entry.homeConnection },
  ].filter(
    (card): card is { code: string; activity: ProgramWeekActivity } =>
      Boolean(card.activity),
  );

  const hasBody =
    cards.length > 0 ||
    Boolean(entry.experienceSummary) ||
    Boolean(entry.experienceFlow?.length) ||
    Boolean(entry.takeHome);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white ${
        entry.finale ? "border-navy" : "border-navy/12"
      }`}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-navy/[0.03] sm:px-5"
        >
          <span
            className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums tracking-[0.1em] ${
              entry.finale
                ? "bg-navy text-yellow"
                : `bg-navy/[0.05] ${accentText}`
            }`}
          >
            {`W${String(entry.week).padStart(2, "0")}`}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block break-keep text-[15px] font-bold leading-snug text-navy sm:text-[16px]">
              {entry.topic}
              <span className="ml-1.5 font-semibold text-navy/45">
                · {entry.growthPoint}
              </span>
            </span>

            {entry.storyTitle ? (
              <span className="mt-1 block break-keep text-[13px] font-semibold text-navy/70">
                《{entry.storyTitle}》
              </span>
            ) : null}

            {/* 닫힌 채로도 그 주가 무엇을 남기려는 주인지 한 줄로 읽힌다. */}
            {entry.coreMessage ? (
              <span className="mt-1 block break-keep text-[13px] leading-relaxed text-navy/50">
                {entry.coreMessage}
              </span>
            ) : null}

            {/*
              마지막 주차를 색으로만 구분하지 않는다.
              색을 보지 못해도 "마무리"라는 글자가 그 사실을 말한다.
            */}
            {entry.finale ? (
              <span className="mt-1.5 block text-[12px] font-semibold text-navy/50">
                마무리 — 여덟 주가 하나로 모입니다
              </span>
            ) : null}
          </span>

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`mt-1.5 shrink-0 text-navy/35 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className="border-t border-navy/10 px-4 py-5 sm:px-5"
      >
        {hasBody ? (
          <div className="flex flex-col gap-5">
            {/* ── 이번 주 경험 ─────────────────────────────────── */}
            {entry.growthKeyword ||
            entry.experienceSummary ||
            entry.experienceFlow?.length ? (
              <div>
                {entry.growthKeyword ? (
                  <span
                    className={`inline-block rounded-full bg-navy/[0.05] px-3 py-1 text-[12px] font-bold ${accentText}`}
                  >
                    성장키워드 · {entry.growthKeyword}
                  </span>
                ) : null}

                {entry.experienceSummary ? (
                  <p className="mt-3 break-keep text-[15px] leading-relaxed text-navy/80">
                    {entry.experienceSummary}
                  </p>
                ) : null}

                {entry.experienceFlow?.length ? (
                  <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                    {entry.experienceFlow.map((step, index) => (
                      <li key={step} className="flex items-center gap-1.5">
                        <span className="break-keep rounded-md border border-navy/10 bg-surface-soft px-2.5 py-1 text-[12px] font-semibold text-navy/70">
                          {step}
                        </span>
                        {index < (entry.experienceFlow?.length ?? 0) - 1 ? (
                          <span aria-hidden="true" className="text-navy/25">
                            →
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}

            {/* ── 활동 네 갈래 ─────────────────────────────────── */}
            {cards.length > 0 ? (
              <dl className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {cards.map((card) => (
                  <div
                    key={card.code}
                    className="h-full rounded-lg border border-navy/10 bg-surface-soft px-4 py-3"
                  >
                    <p
                      className={`text-[10px] font-bold tracking-[0.12em] ${accentText}`}
                    >
                      {card.code}
                    </p>
                    <dt className="mt-1 break-keep text-[14px] font-bold text-navy">
                      {card.activity.title}
                    </dt>

                    {card.activity.summary ? (
                      <dd className="mt-1 break-keep text-[13px] leading-relaxed text-navy/60">
                        {card.activity.summary}
                      </dd>
                    ) : null}

                    {card.activity.items?.length ? (
                      <dd className="mt-2 flex flex-wrap gap-1">
                        {card.activity.items.map((item) => (
                          <span
                            key={item}
                            className="break-keep rounded border border-navy/12 bg-white px-1.5 py-0.5 text-[11px] leading-[1.6] text-navy/60"
                          >
                            {item}
                          </span>
                        ))}
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            ) : null}

            {/* ── 완성 작품 ────────────────────────────────────── */}
            {entry.takeHome ? (
              <p className="break-keep text-[13px] text-navy/60">
                <span className="font-bold text-navy/45">완성 작품</span>
                <span className="mx-2 text-navy/20">|</span>
                <span className="font-semibold text-navy">
                  {entry.takeHome.title}
                </span>
                {entry.takeHome.summary ? (
                  <span className="text-navy/50">
                    {` · ${entry.takeHome.summary}`}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : (
          /*
            아직 상세가 준비되지 않은 주차다.
            "준비 중"이라고 사과하는 대신, 실제로 답을 받을 수 있는 곳을 알려 준다.
            수업 세부 구성은 원래도 공개 화면이 아니라 상담에서 안내하는 범위다.
          */
          <p className="text-[13px] leading-relaxed text-navy/55">
            이 주차의 세부 구성은 도입 상담에서 안내드립니다.
          </p>
        )}
      </div>
    </div>
  );
}
