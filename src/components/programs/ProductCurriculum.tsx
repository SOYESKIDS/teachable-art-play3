"use client";

import { useState } from "react";
import type {
  ProgramCurriculumWeek,
  ProgramProduct,
} from "@/data/program-products";

/**
 * 주차별 구성 — 아코디언.
 *
 * ★ 이 컴포넌트는 데이터가 있을 때만 불린다.
 *   16주 · 24주는 아직 확정본이 없어 product.curriculum 이 undefined 이고,
 *   그러면 상세 화면에 이 단락 자체가 생기지 않는다.
 *
 * ★ 기본은 전부 닫힘, 한 번에 하나만 열린다.
 *   여덟 개를 모두 펼쳐 두면 8주가 한눈에 들어오지 않는다.
 *   이 단락의 목적은 "8주가 어떻게 이어지는가"를 보여 주는 것이고,
 *   한 주의 내용은 그다음 관심사다.
 *
 * ★ 확정된 주차만 안을 채운다.
 *   지금 안이 있는 것은 1주차뿐이다. 나머지 주차는 주제와 성장 지점까지가
 *   확정된 전부이므로, 그 아래에 활동을 지어 넣지 않고 상담 안내로 잇는다.
 *   빈 자리를 그럴듯한 문장으로 메우면 그것은 상품 설명이 아니라 창작이 된다.
 *
 * ★ 교사용 자료는 여기에 오지 않는다.
 *   발문 · 교사 언어 · 개별 지원 지침 · 관찰지표 · 준비물 · 안전 운영 방법은
 *   공개 화면에 담지 않는다. 여기 있는 것은 학부모와 원장이 보아도 되는
 *   범위, 즉 무엇을 하는가까지다.
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

  const activities = [
    { label: "몸으로 놀기", value: entry.movement },
    { label: "워크북", value: entry.workbook },
    { label: "미술활동", value: entry.art },
    { label: "완성작품", value: entry.takeHome },
  ].filter((row): row is { label: string; value: string } =>
    Boolean(row.value),
  );

  const hasDetail =
    activities.length > 0 ||
    Boolean(entry.storyTitle) ||
    Boolean(entry.coreMessage) ||
    Boolean(entry.coreExperiences?.length);

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
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-navy/[0.03] sm:px-5"
        >
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums tracking-[0.1em] ${
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
            </span>
            {/*
              마지막 주차를 색으로만 구분하지 않는다.
              색을 보지 못해도 "마무리"라는 글자가 그 사실을 말한다.
            */}
            {entry.finale ? (
              <span className="mt-0.5 block text-[12px] font-semibold text-navy/50">
                마무리 — 여덟 주가 하나로 모입니다
              </span>
            ) : null}
          </span>

          <span className="shrink-0 break-keep rounded-full border border-navy/12 bg-surface-soft px-2.5 py-1 text-[12px] font-semibold text-navy/65">
            {entry.growthPoint}
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
            className={`shrink-0 text-navy/35 transition-transform duration-200 ${
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
        className="border-t border-navy/10 px-4 py-4 sm:px-5"
      >
        {hasDetail ? (
          <div className="flex flex-col gap-4">
            {entry.storyTitle ? (
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-navy/40">
                  영상 스토리
                </p>
                <p className="mt-1 break-keep text-[16px] font-bold text-navy">
                  「{entry.storyTitle}」
                </p>
              </div>
            ) : null}

            {/*
              그 주가 아이에게 남기려는 한 문장.
              평가하는 말이 아니라 아이가 가져가는 말이므로 크게 둔다.
            */}
            {entry.coreMessage ? (
              <p className="border-l-[3px] border-l-navy/20 pl-3.5 text-[15px] font-semibold leading-relaxed text-navy/85">
                {entry.coreMessage}
              </p>
            ) : null}

            {entry.coreExperiences?.length ? (
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-navy/40">
                  핵심경험
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {entry.coreExperiences.map((item) => (
                    <li
                      key={item}
                      className="break-keep rounded-md border border-navy/12 bg-white px-2.5 py-1 text-[12px] text-navy/70"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {activities.length > 0 ? (
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activities.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-navy/10 bg-surface-soft px-3 py-2.5"
                  >
                    <dt className="text-[11px] font-bold text-navy/45">
                      {row.label}
                    </dt>
                    <dd className="mt-1 break-keep text-[13px] font-semibold text-navy/80">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : (
          /*
            아직 확정본이 없는 주차다.
            "준비 중"이라고 사과하는 대신, 실제로 답을 받을 수 있는 곳을 알려 준다.
            수업 세부 구성은 원래도 공개 화면이 아니라 상담에서 안내하는 범위다.
          */
          <p className="text-[13px] leading-relaxed text-navy/55">
            {entry.growthPoint} 주차의 세부 구성은 도입 상담에서 안내드립니다.
          </p>
        )}
      </div>
    </div>
  );
}
