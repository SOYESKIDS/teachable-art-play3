import Image from "next/image";
import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { homeImages } from "@/data/home-images";
import { growthNarrative as copy } from "@/data/home-narrative";

/**
 * 07 GROWTH RECORD — 관찰과 성장기록.
 *
 * ★ 예전 AI 원칙 · 성장 비교(BEFORE/AFTER) · 학부모 리포트 세 섹션을 하나로 합쳤다.
 * ★ 지금 제공하는 관찰 기록(관찰 영역 · 아이의 말 · 교사 관찰)과
 *   출시 준비 중인 성장 지표 · 관찰 단계를 나눠 그린다 — 없는 기능을 제공 중처럼 보이지 않게.
 * ★ 미확정 관찰 영역과 도움 단계를 공개 사이트에서 발달 척도처럼 소개하지 않는다.
 *   입력 데이터와 과거 기록은 그대로 두고, 교육 정책은 본사 검수 후 별도로 전환한다.
 * ★ 기록 가이드 예시는 canonical 1주차 §12 의 실제 문장이다.
 */
export function GrowthRecordSection() {
  return (
    <HomeSection id="growth-record" tone="ivory" labelledBy="growth-title">
      <HomeHeading id="growth-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          {/* 지금 제공 — 공개 후보 앱의 실제 관찰 입력 항목 */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title-sm font-bold text-navy">{copy.current.title}</h3>
            <AvailabilityTag value={copy.current.availability} />
          </div>
          <p className="mt-3 text-body leading-relaxed text-ink">{copy.current.note}</p>
          <p className="mt-4 text-caption font-semibold text-ink-muted">교사가 남기는 것</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {copy.current.fields.map((field) => (
              <li key={field} className="flex items-center gap-2 text-label text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {field}
              </li>
            ))}
          </ul>

          {/* 출시 준비 중 — 공개 후보 앱에 아직 없는 기능. 지금 제공처럼 보이지 않게 따로 묶는다 */}
          <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title-sm font-bold text-navy">{copy.upcoming.title}</h3>
              <AvailabilityTag value={copy.upcoming.availability} />
            </div>
            <p className="mt-2 text-label text-ink">{copy.upcoming.body}</p>
          </div>

          <ul className="mt-6 flex flex-col gap-2 border-t border-line-soft pt-5">
            {copy.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-label text-ink">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5">
          <figure className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <p className="eyebrow-ko text-ink-muted">STARTER {copy.guideExample.week}주차 수업안 · 관찰 및 기록 가이드</p>
            <p className="mt-3 inline-flex rounded-full bg-secondary-soft px-3 py-1 text-label font-bold text-secondary-strong">
              {copy.guideExample.focus}
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption font-semibold text-ink-muted">관찰할 행동</dt>
                <dd className="mt-1 text-body font-semibold text-navy">{copy.guideExample.look}</dd>
              </div>
              <div>
                <dt className="text-caption font-semibold text-ink-muted">기록 문장에 담을 것</dt>
                <dd className="mt-1 text-body font-semibold text-navy">{copy.guideExample.write}</dd>
              </div>
            </dl>
            <figcaption className="mt-5 border-t border-line-soft pt-4 text-caption text-ink-muted">
              교사는 무엇을 볼지 알고 수업에 들어가고, 본 것을 짧게 남깁니다.
            </figcaption>
          </figure>

          <div className="rounded-3xl border border-info-border bg-info-soft p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title-sm font-bold text-navy">{copy.ai.title}</h3>
              <AvailabilityTag value={copy.ai.availability} />
            </div>
            <p className="mt-3 text-label text-ink">{copy.ai.body}</p>
          </div>
        </div>
      </div>

      {/*
        기록이 보호자에게 어떤 모습으로 가는지 한 장으로 보여 준다.
        ★ 세로로 긴 화면이고 안에 글자가 많다. 잘라내지 않고 실제 비율로 두고,
          작게 보이는 글자는 원본을 새 탭으로 열어 읽게 한다.
        ★ 제공 상태 · 계약 범위는 여기서 말하지 않는다 — 위 영역의 기존
          AvailabilityTag 가 단일 출처다.
      */}
      <div className="mt-12 grid items-start gap-6 rounded-3xl border border-line bg-white p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h3 className="text-title-sm font-bold text-navy">기록은 이런 모습으로 전해집니다</h3>
          <p className="mt-3 text-label leading-relaxed text-ink">
            한 주의 관찰이 주제 · 아이의 말 · 활동 결과물 · 선생님 관찰 기록으로 묶입니다.
            점수나 등급으로 줄 세우지 않습니다.
          </p>
          <p className="mt-3 text-caption leading-relaxed text-ink-muted">
            콘텐츠 구성 예시입니다. 주차별 주제 · 제목은 공식 수업가이드와 계약 구성을 기준으로 안내합니다.
          </p>
        </div>
        <figure className="mx-auto w-full max-w-[320px]">
          <a
            href={homeImages.growthReport.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="주간 성장 이야기 화면 예시 크게 보기 (새 탭)"
            className="relative block overflow-hidden rounded-2xl border border-line bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong"
            style={{ aspectRatio: `${homeImages.growthReport.width} / ${homeImages.growthReport.height}` }}
          >
            <Image
              src={homeImages.growthReport.src}
              alt={homeImages.growthReport.alt}
              fill
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
              className="object-contain"
            />
          </a>
          <figcaption className="mt-2 text-caption font-semibold text-secondary-strong">
            이미지를 눌러 크게 보기 ↗
          </figcaption>
        </figure>
      </div>
    </HomeSection>
  );
}
