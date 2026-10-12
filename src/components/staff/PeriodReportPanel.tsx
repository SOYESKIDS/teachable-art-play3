import {
  PERIOD_EMPTY_NOTICE,
  PERIOD_REPORT_LABEL,
  PERIOD_STALE_NOTICE,
  type PeriodReportData,
} from "@/lib/staff/period-report-queries";

/**
 * 월간 · 학기 리포트 패널 — 실행 묶음 C2.
 *
 * ★ 템플릿 완성과 실제 리포트 제공을 구분한다 (지침 §7 C2).
 *   재료(완료된 주간 기록)가 없으면 빈 상태를 안내하고, 구성 버튼을 두지 않는다.
 *   빈 화면에 "월간 요약 제공"이라고 쓰지 않는다.
 *
 * ★ 원문이 바뀌면 조용히 교체하지 않는다.
 *   정정된 주차가 있으면 재검토 안내를 띄운다. 본문은 그대로 둔다.
 *
 * ★ 읽기 전용 패널이다. 구성·확정은 별도 경로에서 한다.
 */
export function PeriodReportPanel({ data }: { data: PeriodReportData }) {
  const label = PERIOD_REPORT_LABEL[data.summary.kind];

  if (data.notInstalled) {
    return (
      <section className="rounded-xl border border-warning-border bg-warning-soft px-5 py-4">
        <h3 className="text-label font-bold text-warning-text">{label}</h3>
        <p className="mt-1.5 text-caption text-warning-text">
          리포트 모델이 아직 적용되지 않았습니다.
        </p>
      </section>
    );
  }

  if (!data.ok) {
    return (
      <section className="rounded-xl border border-danger-border bg-danger-soft px-5 py-4">
        <h3 className="text-label font-bold text-danger">{label}</h3>
        <p className="mt-1.5 text-caption text-danger">
          불러오지 못했습니다. 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-label font-bold text-ink">{label}</h3>
        {data.summary.hidden && (
          <span className="rounded-full border border-warning-border bg-warning-soft px-2.5 py-0.5 text-micro font-bold text-warning-text">
            숨김
          </span>
        )}
      </div>

      {data.empty ? (
        <p className="mt-2 text-caption leading-relaxed text-ink-muted">
          {PERIOD_EMPTY_NOTICE[data.summary.kind]}
        </p>
      ) : (
        <>
          <p className="mt-2 text-caption text-ink-muted">
            모을 수 있는 주차 기록 {data.sources.length}건
            {data.summary.hasCompletedRevision ? " · 확정된 본문 있음" : " · 본문 미작성"}
          </p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {data.sources.map((source) => (
              <li
                key={source.revisionId}
                className={`rounded-full border px-2.5 py-0.5 text-micro font-semibold tabular-nums ${
                  source.supersededAfterCollect
                    ? "border-warning-border bg-warning-soft text-warning-text"
                    : "border-line text-ink-muted"
                }`}
              >
                {source.weekNo}주차
                {source.revisionNo > 1 ? ` (정정 ${source.revisionNo})` : ""}
              </li>
            ))}
          </ul>

          {data.staleWeeks.length > 0 && (
            <div className="mt-3 rounded-lg border border-warning-border bg-warning-soft px-4 py-3">
              <p className="text-caption font-semibold text-warning-text">
                재검토 필요 — {data.staleWeeks.join(" · ")}주차
              </p>
              <p className="mt-1 text-caption leading-relaxed text-warning-text">
                {PERIOD_STALE_NOTICE}
              </p>
            </div>
          )}
        </>
      )}

      <p className="mt-3 text-caption text-ink-muted">
        {data.summary.kind === "monthly"
          ? "월간 요약은 같은 원아의 승인된 주간 기록을 모아 구성합니다."
          : "학기 포트폴리오는 같은 원아의 승인된 주간 기록을 모아 구성합니다."}{" "}
        기록에 없는 관찰·발화·사진을 만들지 않습니다.
      </p>
    </section>
  );
}
