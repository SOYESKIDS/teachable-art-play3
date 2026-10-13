"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 전체화면 전환 — 사용자 지시 항목 1.
 *
 * ★ 지원하지 않는 브라우저에서는 버튼을 그리지 않는다.
 *   iOS Safari 의 iPhone 에는 Element.requestFullscreen 이 없다. 눌러도 안 되는
 *   버튼을 두면 선생님이 수업 중에 그 버튼을 다시 누른다.
 *
 * ★ 밖에서 빠져나간 경우(ESC · 시스템 제스처)를 따라간다.
 *   상태를 직접 들고 있지 않고 `fullscreenchange` 로 실제 상태를 읽는다.
 *
 * ★ 전체화면 요청은 사용자 동작 안에서만 가능하다. 자동으로 들어가지 않는다.
 *
 * ★ 브라우저 상태를 `useState` + `useEffect` 로 복사하지 않는다.
 *   effect 안에서 곧바로 setState 하면 렌더가 한 번 더 돌고, 그 사이 한 프레임
 *   동안 잘못된 상태가 보인다. `useSyncExternalStore` 는 서버 렌더에서는
 *   `false`, 하이드레이션 뒤에는 실제 값을 쓰므로 그 중간 상태가 없다.
 */

function fullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  return (
    typeof document.documentElement.requestFullscreen === "function" &&
    document.fullscreenEnabled !== false
  );
}

/** `fullscreenchange` 구독. 모듈 스코프에 둬서 참조가 매 렌더마다 바뀌지 않게 한다 */
function subscribeFullscreen(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** 지원 여부는 바뀌지 않는다. 구독할 외부 변화가 없다 */
function subscribeNothing(): () => void {
  return () => {};
}

function readFullscreenActive(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

/** 서버 렌더에서는 둘 다 false 다 (document 가 없다) */
function readFalse(): boolean {
  return false;
}

export function FullscreenToggle({ targetId }: { targetId?: string }) {
  const supported = useSyncExternalStore(
    subscribeNothing,
    fullscreenSupported,
    readFalse,
  );
  const active = useSyncExternalStore(
    subscribeFullscreen,
    readFullscreenActive,
    readFalse,
  );

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const target =
        (targetId ? document.getElementById(targetId) : null) ??
        document.documentElement;
      await target.requestFullscreen();
    } catch {
      // 브라우저가 거부하면 그대로 둔다. 상태는 fullscreenchange 가 맞춘다.
    }
  }, [targetId]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={active}
      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-control-border bg-white px-4 text-[16px] font-semibold text-ink hover:bg-brand-ivory"
    >
      {active ? "전체화면 끝내기" : "전체화면"}
    </button>
  );
}
