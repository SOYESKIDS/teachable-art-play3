"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { WeekRibbon } from "@/components/weeks/WeekRibbon";
import { SCENE_TYPE_LABEL, type WeekScene } from "@/lib/weeks/week-types";

/**
 * 교실 화면 (Class Mode) — 아이들이 3m 거리에서 보는 화면.
 *
 * ── 이 화면에 없는 것 ─────────────────────────────────────────────
 *
 * ★ 원아 이름 · 사진 · 관찰 기록 · 알림 · 관리 메뉴가 없다.
 *   props 자체에 들어오지 않는다 (`stage-queries.ts`). 화면에서 숨기는 것이
 *   아니라 받지 않는다.
 *
 * ★ 교사 노트도 같은 TV 에 열리므로 **공통 진행 안내만** 담는다. 원아별
 *   내용은 업무 화면에서 다룬다.
 *
 * ── 한 장면에 한 문장 ────────────────────────────────────────────
 *
 * 화면은 오래 보게 만드는 곳이 아니라 놀이로 넘어가는 문이다. 그래서 문장
 * 하나와 단계 이름만 크게 두고, 활동 중에는 「화면 쉬기」로 비운다.
 *
 * ── 진행 상태를 저장했다고 말하지 않는다 ─────────────────────────
 *
 * ★ 장면 이동은 지금 **이 브라우저 안에서만** 기록된다. 서버에 보내지 않는다.
 *   저장 경로가 붙기 전까지 "저장됨"이라고 쓰지 않는다. 화면 아래에 그 사실을
 *   적어 둔다.
 *
 * ── 조작 ─────────────────────────────────────────────────────────
 *
 * ← → 장면 이동 · F 전체화면 · B 화면 쉬기 · T 타이머 · N 교사 노트
 * 버튼은 화면 아래 양쪽 끝에 둔다 (전자칠판 앞 교사의 손이 닿는 자리).
 */

function fullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  return (
    typeof document.documentElement.requestFullscreen === "function" &&
    document.fullscreenEnabled !== false
  );
}

function subscribeFullscreen(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function subscribeNothing(): () => void {
  return () => {};
}

function readFullscreenActive(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

function readFalse(): boolean {
  return false;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STAGE_ID = "class-stage-root";

const controlButton =
  "inline-flex min-h-[64px] min-w-[120px] items-center justify-center rounded-[18px] border-2 border-forest px-6 text-[22px] font-bold text-forest disabled:opacity-35";

export function ClassStage({
  scenes,
  weekNo,
  themeColor,
  lessonTitle,
  exitHref,
  /** 내부 미리보기에서 열렸는가 — 화면에 그 사실을 적는다 */
  previewMode = false,
}: {
  scenes: WeekScene[];
  weekNo: number;
  themeColor: string;
  lessonTitle: string;
  exitHref: string;
  previewMode?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  // 타이머 — 기준 시각으로 계산한다. 렌더에서 Date.now() 를 읽지 않는다.
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const supported = useSyncExternalStore(subscribeNothing, fullscreenSupported, readFalse);
  const fullscreen = useSyncExternalStore(subscribeFullscreen, readFullscreenActive, readFalse);

  const scene = scenes[index] ?? null;
  const total = scenes.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => Math.min(total - 1, Math.max(0, prev + delta)));
      setResting(false);
      setNoteOpen(false);
      setTimerStartedAt(null);
    },
    [total],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const target = document.getElementById(STAGE_ID) ?? document.documentElement;
      await target.requestFullscreen();
    } catch {
      // 브라우저가 거부하면 그대로 둔다. 상태는 fullscreenchange 가 맞춘다.
    }
  }, []);

  const toggleTimer = useCallback(() => {
    setTimerStartedAt((prev) => {
      if (prev !== null) return null;
      const at = Date.now();
      setNow(at);
      return at;
    });
  }, []);

  useEffect(() => {
    if (timerStartedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timerStartedAt]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // 입력 중에는 단축키를 가로채지 않는다.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          go(1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          go(-1);
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;
        case "b":
        case "B":
          event.preventDefault();
          setResting((v) => !v);
          break;
        case "t":
        case "T":
          event.preventDefault();
          toggleTimer();
          break;
        case "n":
        case "N":
          event.preventDefault();
          setNoteOpen((v) => !v);
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, toggleTimer]);

  if (!scene) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stage p-16 text-center">
        <p className="text-[28px] leading-relaxed text-forest">
          이 주차의 교실 화면 장면이 아직 등록되지 않았습니다.
        </p>
      </div>
    );
  }

  const elapsed = timerStartedAt === null ? 0 : Math.max(0, now - timerStartedAt);
  const overBase =
    scene.baseSeconds !== null && timerStartedAt !== null && elapsed > scene.baseSeconds * 1000;

  return (
    <div
      id={STAGE_ID}
      className="flex min-h-screen flex-col bg-stage text-forest"
      style={{ padding: "clamp(24px, 5vw, 96px)" }}
    >
      {/* ── 머리: 책갈피 · 단계 이름 · 타이머 ── */}
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <WeekRibbon weekNo={weekNo} themeColor={themeColor} state="selected" size="l" />
          <div className="pt-2">
            <p className="text-[clamp(18px,2vw,28px)] font-semibold text-muted-ink">
              {scene.stageLabel ?? SCENE_TYPE_LABEL[scene.sceneType]}
            </p>
            {previewMode ? (
              <p className="mt-1 text-[16px] font-bold text-sky-deep">
                내부 미리보기 — 수업 회차에 연결되지 않았습니다
              </p>
            ) : null}
          </div>
        </div>

        {timerStartedAt !== null ? (
          <p
            aria-live="off"
            className={`text-[clamp(28px,4vw,56px)] font-bold tabular-nums leading-none ${
              overBase ? "text-[color:var(--color-crayon)]" : "text-forest"
            }`}
          >
            {clock(elapsed)}
          </p>
        ) : null}
      </header>

      {/* ── 본문 ── */}
      <main className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        {resting ? (
          <>
            <p className="text-[clamp(32px,5vw,72px)] font-bold leading-tight">
              {scene.stageLabel ?? SCENE_TYPE_LABEL[scene.sceneType]}
            </p>
            <p className="mt-6 text-[clamp(18px,2vw,28px)] text-muted-ink">
              준비되면 아래 ‘화면 돌아오기’를 눌러 주세요.
            </p>
          </>
        ) : (
          <>
            <p className="max-w-[18ch] font-serif text-[clamp(36px,6.5vw,96px)] font-bold leading-[1.15]">
              {scene.kidText}
            </p>

          </>
        )}
      </main>

      {/* ── 교사 노트 (공통 진행 안내만) ── */}
      {noteOpen ? (
        <section
          aria-label="교사 노트"
          className="mb-6 rounded-[18px] border-2 border-rule bg-white px-8 py-6"
        >
          <p className="mb-3 text-[16px] font-bold text-forest">교사 안내 · 연결된 TV에도 보입니다</p>
          {scene.teacherNote ? <p className="text-[clamp(16px,1.6vw,22px)] leading-relaxed text-forest">{scene.teacherNote}</p> : null}
          {scene.sceneType === "story" || scene.sceneType === "workbook" ? <p className="mt-3 text-[16px] leading-relaxed text-muted-ink">이 화면에는 그림책·워크북 파일이 연결되어 있지 않습니다. 별도로 준비한 자료로 진행하고, 아이들이 활동할 때는 화면 쉬기를 사용하세요.</p> : null}
          <p className="mt-3 text-[14px] text-muted-ink">아이들에게 보여주기 전에 안내를 닫아 주세요. 원아별 내용은 업무 화면에서 다룹니다.</p>
        </section>
      ) : null}

      {/* ── 조작 ── */}
      <footer className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className={controlButton}>
            이전
          </button>

          <p className="text-[clamp(16px,1.6vw,22px)] tabular-nums text-muted-ink">
            {index + 1} / {total}
          </p>

          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === total - 1}
            className={`${controlButton} bg-forest text-white`}
          >
            다음
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {supported ? (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-pressed={fullscreen}
              className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-4 text-[16px] font-semibold"
            >
              {fullscreen ? "전체화면 끝내기" : "전체화면 (F)"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setResting((v) => !v)}
            aria-pressed={resting}
            className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-4 text-[16px] font-semibold"
          >
            {resting ? "화면 돌아오기 (B)" : "화면 쉬기 (B)"}
          </button>
          <button
            type="button"
            onClick={toggleTimer}
            aria-pressed={timerStartedAt !== null}
            className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-4 text-[16px] font-semibold"
          >
            {timerStartedAt !== null ? "타이머 멈춤 (T)" : "타이머 (T)"}
          </button>
          {scene.teacherNote || scene.sceneType === "story" || scene.sceneType === "workbook" ? (
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              aria-pressed={noteOpen}
              className="inline-flex min-h-12 items-center rounded-[10px] border border-rule px-4 text-[16px] font-semibold"
            >
              {noteOpen ? "교사 안내 닫기 (N)" : "교사 안내 · TV에도 표시 (N)"}
            </button>
          ) : null}
          <a
            href={exitHref}
            className="inline-flex min-h-12 items-center rounded-[10px] px-4 text-[16px] text-muted-ink underline"
          >
            나가기
          </a>
        </div>

        <p className="text-center text-[14px] text-muted-ink">
          {lessonTitle} · {weekNo}주차 · 장면 이동은 이 브라우저 안에서만 남습니다. 서버에
          저장되지 않습니다.
        </p>
      </footer>
    </div>
  );
}
