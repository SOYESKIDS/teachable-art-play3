"use client";

import { GROWTH_STAGE_OPTIONS, type GrowthMetric, type GrowthSelection, type GrowthStage } from "@/types/staff-observation";

interface GrowthMetricSelectorProps {
  metrics: GrowthMetric[];
  value: GrowthSelection[];
  /** stage 미선택 상태도 화면 상태로 들고 있다 (저장 시 서버가 거부) */
  pendingMetrics: string[];
  onChange: (next: { selections: GrowthSelection[]; pending: string[] }) => void;
  disabled?: boolean;
  idPrefix: string;
}

/**
 * 관찰 포인트 입력 (DEC-038 · DEC-086 · DEC-100).
 *
 * · 기본 = 미선택 = 기록 없음. "기록 없음" 버튼은 없다.
 * · 지표를 고른 뒤에만 방식 3개 (함께 · 보고 나서 · 스스로).
 * · 3개는 같은 크기 · 같은 중립색 · 번호 · 화살표 · 점수 색 없음.
 * · 방식 미선택이면 저장 불가 안내.
 * · 저장 코드는 화면에 노출하지 않는다.
 */
export function GrowthMetricSelector({
  metrics,
  value,
  pendingMetrics,
  onChange,
  disabled = false,
  idPrefix,
}: GrowthMetricSelectorProps) {
  const activeMetrics = metrics.filter((metric) => metric.isActive);
  const stageByMetric = new Map(value.map((item) => [item.metricCode, item.stage]));

  function toggleMetric(code: string) {
    if (stageByMetric.has(code) || pendingMetrics.includes(code)) {
      onChange({
        selections: value.filter((item) => item.metricCode !== code),
        pending: pendingMetrics.filter((item) => item !== code),
      });
    } else {
      onChange({ selections: value, pending: [...pendingMetrics, code] });
    }
  }

  function chooseStage(code: string, stage: GrowthStage) {
    onChange({
      selections: [...value.filter((item) => item.metricCode !== code), { metricCode: code, stage }],
      pending: pendingMetrics.filter((item) => item !== code),
    });
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="text-body-lg font-bold text-ink">관찰 포인트</legend>
      <div className="rounded-lg border border-info-border bg-info-soft px-3.5 py-3 text-label leading-relaxed text-info-text">
        <p className="font-semibold">
          얼마나 잘했는지가 아니라, 그 활동에서 어떤 도움이 필요했는지를 남기는 기록입니다. 단계는 오르내릴 수 있고
          다른 아이와 비교하지 않습니다.
        </p>
        <p className="mt-1">
          함께 · 보고 나서 · 스스로 중 이번 활동에서 본 모습 하나를 고릅니다. 기록 없음은 못했다는 의미가 아닙니다.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {activeMetrics.map((metric) => {
          const selected = stageByMetric.has(metric.code) || pendingMetrics.includes(metric.code);
          const stage = stageByMetric.get(metric.code) ?? null;
          const missingStage = pendingMetrics.includes(metric.code);
          const helpId = `${idPrefix}-${metric.code}-help`;

          return (
            <li key={metric.code} className="rounded-xl border border-hairline bg-white p-4">
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleMetric(metric.code)}
                  aria-describedby={helpId}
                  className="mt-1 h-6 w-6 shrink-0"
                />
                <span>
                  <span className="block text-body font-bold text-ink">{metric.label}</span>
                  <span id={helpId} className="block text-label text-ink-muted">
                    {metric.guide}
                  </span>
                </span>
              </label>

              {selected ? (
                <div className="mt-3" role="radiogroup" aria-label={`${metric.label} 참여 방식`}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {GROWTH_STAGE_OPTIONS.map((option) => {
                      const checked = stage === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-lg border px-3 py-2 text-body-sm ${
                            checked ? "border-brand-navy bg-brand-sky font-bold text-ink" : "border-control-border bg-white text-ink"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`${idPrefix}-${metric.code}-stage`}
                              checked={checked}
                              onChange={() => chooseStage(metric.code, option.value)}
                            />
                            {option.label}
                          </span>
                          <span className="mt-0.5 text-caption font-normal text-ink-muted">{option.help}</span>
                        </label>
                      );
                    })}
                  </div>
                  {missingStage ? (
                    <p role="alert" className="mt-2 text-label text-warning-text">
                      방식을 선택하거나 이 관찰 포인트 선택을 해제해 주세요.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
