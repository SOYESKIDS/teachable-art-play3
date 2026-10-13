"use client";

import { useCallback, useState } from "react";
import { SCENE_TYPE_LABEL, type WeekScene } from "@/lib/weeks/week-types";

/**
 * 공개 샘플용 교실 화면 — 페이지 안에 끼워 넣는 작은 무대.
 *
 * ── 왜 ClassStage 를 그대로 쓰지 않는가 ──────────────────────────
 *
 * `ClassStage` 는 **전체 화면 한 장**을 차지하고 전역 키보드 단축키를 잡는다
 * (←/→/F/B/T/N). 공개 페이지에 그대로 넣으면 페이지 스크롤·링크 이동과
 * 단축키가 부딪히고, 방문자가 빠져나올 길이 모호해진다. 그래서 공개용은
 * **상자 안에 든 축소판**으로 따로 만든다.
 *
 * ★ 같은 장면 데이터 모양(`WeekScene`)을 쓰므로, 공개 허락을 받은 실제 샘플이
 *   생기면 데이터만 바꿔 끼우면 된다.
 *
 * ── 키보드 ───────────────────────────────────────────────────────
 *
 * 화살표는 **이 무대에 초점이 있을 때만** 듣는다. 페이지 전체를 가로채지
 * 않는다.
 */
export function SampleStage({
  scenes,
  themeColor,
  weekLabel,
}: {
  scenes: WeekScene[];
  themeColor: string;
  weekLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [resting, setResting] = useState(false);

  const total = scenes.length;
  const scene = scenes[index] ?? null;

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => Math.min(total - 1, Math.max(0, prev + delta)));
      setResting(false);
    },
    [total],
  );

  // 무대 안에서만 듣는 키보드. document 전역을 잡지 않는다.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    },
    [go],
  );

  // ★ scenes 가 바뀌면 호출부가 `key` 로 다시 만들게 한다.
  //   effect 로 상태를 되돌리면 한 프레임 동안 이전 장면이 보인다.
  if (!scene) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div
        role="group"
        aria-label="교실 화면 샘플"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex min-h-[320px] flex-col bg-stage p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-deep sm:min-h-[400px] sm:p-10"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-block h-10 w-4 shrink-0"
            style={{
              background: themeColor,
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
            }}
          />
          <p className="text-caption font-semibold text-muted-ink">
            {weekLabel} · {scene.stageLabel ?? SCENE_TYPE_LABEL[scene.sceneType]}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 text-center">
          {resting ? (
            <p className="text-[20px] font-bold leading-snug text-muted-ink sm:text-[24px]">
              화면을 쉬는 중입니다 — 아이들이 놀이에 집중합니다
            </p>
          ) : (
            <p className="max-w-[18ch] font-serif text-[26px] font-bold leading-[1.2] text-forest sm:text-[40px]">
              {scene.kidText}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="inline-flex min-h-11 items-center rounded-lg border border-rule-strong px-4 text-label font-semibold text-forest disabled:opacity-35"
          >
            이전
          </button>
          <p className="text-caption tabular-nums text-muted-ink">
            {index + 1} / {total}
          </p>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === total - 1}
            className="inline-flex min-h-11 items-center rounded-lg bg-forest px-4 text-label font-semibold text-white disabled:opacity-35"
          >
            다음
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setResting((v) => !v)}
          aria-pressed={resting}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-label font-semibold text-navy"
        >
          {resting ? "화면 돌아오기" : "화면 쉬기"}
        </button>
        {scene.teacherNote ? (
          <p className="max-w-[46ch] text-caption leading-relaxed text-ink-muted">
            교사 노트 · {scene.teacherNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
