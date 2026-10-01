import { DemoBadge } from "@/components/ui/DemoBadge";
import { STATUS_TONE_CLASSES, type StatusTone } from "@/components/ui/surface";
import { cx } from "@/components/ui/cx";
import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { dashboardNarrative as copy } from "@/data/home-narrative";

const STATUS_TONE: Record<string, StatusTone> = { 완료: "done", "진행 중": "active", 예정: "scheduled" };

/**
 * 09 DIRECTOR DASHBOARD — 예시 화면.
 *
 * ★ 실제 원장 대시보드(DirectorDashboard.tsx)에 있는 항목만 그린다:
 *   오늘 수업 요약 · 반별 오늘 수업 · 확인이 필요한 기록(출결 · 관찰).
 *   예전 예시의 "콘텐츠 이용률 %" · 주간 막대 그래프 · 업로드 현황은 실제 화면에 없어 걷었다.
 * ★ 값은 예시다 — DEMO 배지와 설명으로 분명히 한다.
 */
export function DirectorDashboardSection() {
  return (
    <HomeSection id="dashboard" tone="sand" labelledBy="dashboard-title">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <div>
          <HomeHeading id="dashboard-title" eyebrow={copy.eyebrow} headline={copy.headline} subCopy={copy.subCopy} />
          <p className="mt-6 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
            <AvailabilityTag value={copy.availability} />
            {copy.note}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-elevated)]">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft bg-surface-warm px-5 py-3.5">
            <p className="text-label font-bold text-navy">오늘의 우리 원</p>
            <DemoBadge />
          </div>

          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <dl className="grid grid-cols-3 gap-2.5">
              {copy.sample.today.map((item) => (
                <div key={item.label} className="rounded-2xl border border-line px-4 py-3">
                  <dt className="text-caption font-semibold text-ink-muted">{item.label}</dt>
                  <dd className="mt-1 text-headline font-bold text-navy tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="text-label font-bold text-navy">반별 오늘 수업</p>
              <ul className="mt-2.5 divide-y divide-line-soft rounded-2xl border border-line">
                {copy.sample.classes.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-label font-bold text-navy">{row.name}</p>
                      <p className="truncate text-caption text-ink-muted">
                        {row.week} · {row.title}
                      </p>
                    </div>
                    <span
                      className={cx(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-semibold",
                        STATUS_TONE_CLASSES[STATUS_TONE[row.status] ?? "neutral"],
                      )}
                    >
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-warning-border bg-warning-soft px-4 py-3.5">
              <p className="text-label font-bold text-warning-text">확인이 필요한 기록</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {copy.sample.followUps.map((item) => (
                  <li key={item.label} className="text-caption text-ink">
                    <span className="font-semibold">{item.label}</span> · {item.detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
