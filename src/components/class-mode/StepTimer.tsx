"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 단계 타이머 — 실행 묶음 B1.
 *
 * ★ 기준 시각으로 계산한다 (지침 §6 B1).
 *   1초마다 숫자를 더하는 방식은 탭이 비활성이면 timer 가 느려지거나 멈춰
 *   실제 경과 시간과 어긋난다. 그래서 상태에는 "언제 시작했는가"와
 *   "그때까지 쌓인 시간"만 두고, 표시값은 항상 `Date.now()` 에서 다시 계산한다.
 *   interval 은 화면을 다시 그리게 하는 역할만 한다.
 *
 * ★ 단계를 옮기면 초기화한다.
 *   호출부가 `key` 를 단계마다 다르게 주어 React 가 이 컴포넌트를 다시 만든다.
 *   effect 로 상태를 되돌리지 않는다 — 그러면 단계를 옮긴 직후 한 프레임 동안
 *   이전 단계의 시간이 보인다.
 *
 * ★ 렌더 중에 `Date.now()` 를 읽지 않는다.
 *   렌더는 같은 입력에 같은 결과여야 한다. 현재 시각은 interval 콜백과 버튼
 *   핸들러에서만 읽어 상태에 넣고, 렌더는 그 값만 쓴다.
 *
 * ★ 권장 시간을 넘겨도 멈추지 않는다.
 *   현장에서 늘려 쓰는 경우가 정상이다. 넘긴 사실만 표시하고 경고하지 않는다.
 *
 * ★ 측정값을 저장하지 않는다.
 *   이 컴포넌트는 서버에 아무것도 보내지 않는다. 실제 소요 시간 기록은
 *   별도 결정 사항이다 — "처리시간 30초" 같은 성과 주장을 만들지 않는다.
 */

type TimerStatus = "idle" | "running" | "paused";

interface TimerState {
  status: TimerStatus;
  /** running 으로 바뀐 시각 (epoch ms). paused · idle 이면 null */
  startedAt: number | null;
  /** 이전 구간들에서 쌓인 시간 */
  accumulatedMs: number;
}

const INITIAL: TimerState = { status: "idle", startedAt: null, accumulatedMs: 0 };

function elapsedMs(state: TimerState, now: number): number {
  if (state.status === "running" && state.startedAt !== null) {
    return state.accumulatedMs + Math.max(0, now - state.startedAt);
  }
  return state.accumulatedMs;
}

function clockLabel(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StepTimer({
  recommendedMinutes,
}: {
  /** 권장 시간. 없는 단계도 있다 */
  recommendedMinutes: number | null;
}) {
  const [state, setState] = useState<TimerState>(INITIAL);
  /**
   * 표시용 현재 시각.
   *
   * ★ 렌더에서 `Date.now()` 를 부르지 않기 위해 둔다. 멈춰 있을 때는 쓰이지
   *   않으므로(경과 시간이 누적값으로 고정된다) 초기값은 0 이어도 된다.
   */
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (state.status !== "running") return;
    // interval 콜백 안에서만 시각을 읽는다. effect 본문에서 setState 하지 않는다.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  const start = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setState((prev) =>
      prev.status === "running"
        ? prev
        : { status: "running", startedAt: at, accumulatedMs: prev.accumulatedMs },
    );
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "running" || prev.startedAt === null) return prev;
      return {
        status: "paused",
        startedAt: null,
        accumulatedMs: prev.accumulatedMs + Math.max(0, Date.now() - prev.startedAt),
      };
    });
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const elapsed = elapsedMs(state, now);
  const recommendedMs =
    recommendedMinutes !== null ? recommendedMinutes * 60_000 : null;
  const over = recommendedMs !== null && elapsed > recommendedMs;

  const progress =
    recommendedMs !== null && recommendedMs > 0
      ? Math.min(1, elapsed / recommendedMs)
      : null;

  return (
    <div className="rounded-xl border border-hairline bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[32px] font-bold tabular-nums leading-none text-navy"
            aria-live="off"
          >
            {clockLabel(elapsed)}
          </span>
          {recommendedMinutes !== null && (
            <span className="text-caption tabular-nums text-ink-muted">
              / 권장 {recommendedMinutes}분
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {state.status === "running" ? (
            <button
              type="button"
              onClick={pause}
              className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy"
            >
              일시정지
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy"
            >
              {state.status === "paused" ? "재개" : "시작"}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={state.status === "idle" && state.accumulatedMs === 0}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-label text-ink-muted disabled:opacity-40"
          >
            초기화
          </button>
        </div>
      </div>

      {progress !== null && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hairline"
          role="presentation"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              over ? "bg-accent" : "bg-primary"
            }`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <p className="mt-2 text-caption text-ink-muted">
        {over
          ? "권장 시간을 넘겼습니다. 반 상황에 맞게 이어가셔도 됩니다."
          : "탭을 벗어나도 시간은 그대로 흐릅니다. 기록되지는 않습니다."}
      </p>
    </div>
  );
}
