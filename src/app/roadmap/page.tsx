import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell, InfoSection } from "@/components/public/InfoPageShell";
import {
  ROADMAP_STATUS_LABEL,
  roadmapDisclaimer,
  roadmapGroups,
  roadmapIntro,
  type RoadmapStatus,
} from "@/data/public-info";

/**
 * 제공 현황 — 실행 묶음 D1.
 *
 * ★ 출시월·분기·완료 체크를 만들지 않는다.
 *   상태는 제공 / 개발 중 / 검토·승인 대기 / 일정 미정 네 가지뿐이다.
 *   진행률 숫자나 "○월 제공" 같은 표현을 쓰지 않는다.
 *
 * ★ 코드가 준비된 것과 제공하는 것을 구분한다.
 *   검토·승인 대기는 구현이 있어도 교육 검수·운영 정책 확정 전이라는 뜻이다.
 */
export const metadata: Metadata = {
  title: "제공 현황 | TeachAble Art Play",
  description:
    "TeachAble Art Play가 현재 제공하는 기능과 아직 제공하지 않는 기능을 구분해 안내합니다. 제공 시점을 약속하지 않습니다.",
  alternates: { canonical: "/roadmap" },
};

const STATUS_STYLE: Record<RoadmapStatus, string> = {
  available: "border-success-border bg-success-soft text-success-text",
  in_development: "border-info-border bg-info-soft text-info-text",
  awaiting_approval: "border-warning-border bg-warning-soft text-warning-text",
  unscheduled: "border-line bg-white text-ink-muted",
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-micro font-bold ${STATUS_STYLE[status]}`}
    >
      {ROADMAP_STATUS_LABEL[status]}
    </span>
  );
}

export default function RoadmapPage() {
  return (
    <PublicShell>
      <InfoPageShell
        eyebrow={roadmapIntro.eyebrow}
        headline={roadmapIntro.headline}
        subCopy={roadmapIntro.subCopy}
      >
        <section className="mt-10 rounded-2xl border border-line bg-white px-6 py-5">
          <h2 className="text-label font-bold text-ink">상태 표기</h2>
          <dl className="mt-3 flex flex-col gap-2">
            {(
              Object.keys(ROADMAP_STATUS_LABEL) as RoadmapStatus[]
            ).map((status) => (
              <div key={status} className="flex flex-wrap items-baseline gap-2">
                <dt>
                  <StatusBadge status={status} />
                </dt>
                <dd className="text-caption text-ink-muted">
                  {status === "available" && "지금 쓰실 수 있습니다."}
                  {status === "in_development" && "만들고 있습니다."}
                  {status === "awaiting_approval" &&
                    "구현은 되어 있고 검토·승인을 기다립니다."}
                  {status === "unscheduled" && "제공 시점이 정해지지 않았습니다."}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {roadmapGroups.map((group) => (
          <InfoSection key={group.id} id={group.id} title={group.title}>
            <ul className="flex flex-col gap-3">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-line bg-white px-5 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-body-sm font-bold text-navy">{item.title}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1.5 text-caption leading-relaxed text-navy/70">
                    {item.note}
                  </p>
                </li>
              ))}
            </ul>
          </InfoSection>
        ))}

        <div className="mt-12 border-t border-line pt-6">
          {roadmapDisclaimer.map((line) => (
            <p
              key={line}
              className="mt-1.5 text-caption leading-relaxed text-ink-muted"
            >
              {line}
            </p>
          ))}
        </div>
      </InfoPageShell>
    </PublicShell>
  );
}
