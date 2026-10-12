"use client";

/**
 * 단축 운영 모드 — 실행 묶음 B1.
 *
 * ★ 승인된 단축 시간표가 있을 때만 활성화한다 (지침 §6 B1).
 *   24주 강의교안 데이터구조에는 "SHORT CLASS 30분" 체계가 있지만, 운영자 확정
 *   표준은 CORE 50분 + 선택 연계활동 10~15분이고, 단축안은 승인되지 않았다.
 *
 * ★ 원문 시간표를 자동으로 압축하지 않는다.
 *   50분 단계를 비율로 줄여 30분짜리처럼 보여 주면, 승인되지 않은 교안을
 *   승인된 것처럼 게시하는 일이 된다. 그래서 버튼을 비활성으로 두고
 *   무엇이 필요한지만 적는다.
 *
 * ★ 입력 구조는 열어 둔다.
 *   `shortSteps` 가 들어오면 그때 버튼이 켜진다. 모듈 전체를 막지 않는다.
 */

export interface ShortModeStep {
  title: string;
  minutes: number;
}

export function ShortModeNotice({
  shortSteps,
  active,
  onToggle,
}: {
  /** 승인된 단축 시간표. 없으면 null */
  shortSteps: ShortModeStep[] | null;
  active: boolean;
  onToggle: (next: boolean) => void;
}) {
  const available = shortSteps !== null && shortSteps.length > 0;

  return (
    <div className="rounded-xl border border-hairline bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label font-bold text-ink">단축 운영</p>
          <p className="mt-0.5 text-caption text-ink-muted">
            {available
              ? "승인된 단축 시간표로 진행합니다."
              : "승인된 단축 시간표가 없습니다."}
          </p>
        </div>

        <button
          type="button"
          disabled={!available}
          aria-pressed={available ? active : undefined}
          onClick={() => onToggle(!active)}
          className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          {active ? "기본 운영으로" : "단축 운영으로"}
        </button>
      </div>

      {!available && (
        <p className="mt-3 text-caption leading-relaxed text-ink-muted">
          기준 운영 시간은 CORE 50분(워크북 포함) + 선택 연계활동 10~15분입니다. 단축
          시간표는 교육 검수와 승인을 거친 뒤에 열립니다. 승인 전에는 단계 시간을 임의로
          줄여 진행하지 않습니다.
        </p>
      )}

      {available && active && (
        <ol className="mt-3 flex flex-col gap-1">
          {shortSteps.map((step, index) => (
            <li
              key={`${step.title}-${index}`}
              className="flex items-baseline justify-between gap-3 text-caption text-navy/80"
            >
              <span>
                {index + 1}. {step.title}
              </span>
              <span className="tabular-nums text-ink-muted">{step.minutes}분</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
