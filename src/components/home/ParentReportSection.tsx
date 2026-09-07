import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  parentReportCopy,
  parentReportInfoItems,
  reportCadence,
} from "@/data/site-copy";

/**
 * 학부모 성장 리포트 소개.
 *
 * ★ CSS 로 그린 폰 목업을 실제 화면으로 바꿨다.
 *   예전에는 스마트폰 테두리를 그리고 그 안에 예시 문구를 채워 넣은
 *   목업이었다. 잘 만들어져 있었지만 결국 "이렇게 생겼을 것이다"였다.
 *   실제 서비스에서 뽑은 화면이 있으면 그것이 언제나 더 설득력 있다.
 *
 * ★ 기기 테두리를 씌우지 않는다.
 *   이 리포트는 A4 로도 인쇄되는 문서다. 폰 프레임에 넣으면 문서가 아니라
 *   앱 화면처럼 보이고, 세로 비율(974x1310)도 억지로 바뀐다.
 *   문서는 문서로 둔다.
 *
 * ★ 테스트 기관 데이터다.
 *   아이 이름은 "테스트원아", 기관은 "테스트 유치원 · 햇살반"이고
 *   주소창은 담기지 않았다 — 공유 링크의 비밀값이 노출될 자리가 없다.
 */

export function ParentReportSection() {
  return (
    <section
      id="parent-report"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-white py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          headline={parentReportCopy.headline}
          subCopy={parentReportCopy.subCopy}
        />

        <div className="mt-16 grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* 실제 학부모 성장 기록 화면 — 이 섹션의 주인공 */}
          <figure>
            <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-elevated)] lg:mx-0">
              <Image
                src="/images/site/platform/parent-growth-report-preview.webp"
                alt="학부모가 링크로 받아 보는 성장 기록 화면 — 표지, 이번 기간의 성장 변화, 관찰된 모습, 다음 활동에서 도와줄 부분, 함께한 활동이 차례로 담겨 있다"
                width={974}
                height={1310}
                sizes="(min-width: 1024px) 460px, (min-width: 640px) 460px, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mx-auto mt-3 max-w-[460px] text-[12px] font-medium text-navy/45 lg:mx-0">
              실제 서비스 화면 예시 · 테스트 기관 데이터
            </figcaption>
          </figure>

          {/* 보조 Content */}
          <div className="flex flex-col gap-10">
            <ol className="flex flex-col gap-5">
              {parentReportInfoItems.map((item) => (
                <li key={item.order} className="flex items-baseline gap-4">
                  <span className="text-xl font-bold text-navy/20 sm:text-2xl">
                    {`0${item.order}`}
                  </span>
                  <span className="text-lg font-bold text-navy sm:text-xl">
                    {item.label}
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-3 border-t border-navy/10 pt-8">
              {reportCadence.map((cadence) => (
                <div
                  key={cadence.id}
                  className="rounded-xl border border-navy/10 bg-ivory px-4 py-3"
                >
                  <p className="text-[10px] font-bold tracking-wide text-trust-blue">
                    {cadence.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-navy">{cadence.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
