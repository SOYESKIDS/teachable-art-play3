import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell, InfoSection } from "@/components/public/InfoPageShell";
import {
  teacherGuideIntro,
  teacherGuidePrinciples,
  teacherGuideSteps,
} from "@/data/public-info";

/**
 * 교사용 안내 — 실행 묶음 D1.
 *
 * ★ 교안 원문을 싣지 않는다.
 *   주차별 수업안·발문·관찰지표·기록 예문은 도입한 기관의 선생님에게 가는 자료다.
 *   이 페이지는 "한 회차를 어떤 순서로 쓰는가"까지만 공개한다.
 *
 * ★ 평가 표현을 쓰지 않는다. 기록 원칙을 그대로 적는다.
 */
export const metadata: Metadata = {
  title: "교사용 안내 | TeachAble Art Play",
  description:
    "담임 선생님이 한 회차를 어떤 순서로 운영하고 기록하는지 안내합니다. 수업 전·수업 중·수업 후 흐름과 기록 원칙을 담았습니다.",
  alternates: { canonical: "/guide/teacher" },
};

export default function TeacherGuidePage() {
  return (
    <PublicShell>
      <InfoPageShell
        eyebrow={teacherGuideIntro.eyebrow}
        headline={teacherGuideIntro.headline}
        subCopy={teacherGuideIntro.subCopy}
      >
        <InfoSection id="flow" title="한 회차의 흐름">
          <ol className="flex flex-col gap-6">
            {teacherGuideSteps.map((step) => (
              <li
                key={step.order}
                className="rounded-2xl border border-line bg-white p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-title-sm font-bold tabular-nums text-trust-blue">
                    {String(step.order).padStart(2, "0")}
                  </span>
                  <h3 className="text-body font-bold text-navy">{step.title}</h3>
                </div>
                <p className="mt-2 text-body-sm leading-relaxed text-navy/70">
                  {step.description}
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  {step.actions.map((action) => (
                    <li
                      key={action}
                      className="text-body-sm leading-relaxed text-navy/80"
                    >
                      {action}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </InfoSection>

        <InfoSection id="principles" title="기록 원칙">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {teacherGuidePrinciples.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-line bg-white px-5 py-4"
              >
                <dt className="text-label font-bold text-ink">{item.title}</dt>
                <dd className="mt-1.5 text-caption leading-relaxed text-navy/75">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </InfoSection>

        <InfoSection id="materials" title="제공되는 교사 자료">
          <p className="text-body-sm leading-[1.9] text-navy/80">
            회차마다 같은 구성으로 제공됩니다 — 회차별 수업안, 진행 순서, 발문 예시,
            준비물·키트 사용 안내, 관찰 포인트, 기록 문장 예시, 가정연계 안내.
          </p>
          <p className="mt-3 text-body-sm leading-[1.9] text-navy/80">
            수업안 원문과 발문·기록 예문은 도입한 기관의 선생님에게 제공되며 공개
            화면에는 싣지 않습니다.
          </p>
          <p className="mt-3 text-caption leading-relaxed text-ink-muted">
            기본 온보딩은 20~30분이며, 담임 선생님이 별도 준비 없이 첫 회차를 시작하실 수
            있도록 안내합니다.
          </p>
        </InfoSection>

        <p className="mt-12 border-t border-line pt-6 text-caption leading-relaxed text-ink-muted">
          화면에서 제공되는 기능의 현재 상태는 제공 현황 페이지에서 확인하실 수 있습니다.
        </p>
      </InfoPageShell>
    </PublicShell>
  );
}
