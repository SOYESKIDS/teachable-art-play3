"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "@/components/ui/cx";
import { characterImage } from "@/data/experience/characters";
import type { ClassStage, ExperienceWeek, StageKey } from "@/data/experience/types";
import { ContentStatusBadge, DemoNotice } from "../Badges";
import { ArrowRight, PlayIcon, popButtonClass } from "../PopButton";
import { Sticker } from "../Stickers";
import { WeekArt } from "../WeekArt";

/**
 * INTERACTIVE CLASSROOM PLAYER — 공개 체험용 수업 진행 화면.
 *
 * ★ 이 화면은 서버에 아무것도 쓰지 않는다. 진행 단계 · 화면 모드는 이 브라우저 탭의
 *   sessionStorage 에만 남는다 (새로고침해도 이어지고, 탭을 닫으면 사라진다).
 *   실제 기관의 수업 이력 · 출결 · 관찰 기록과 연결되지 않는다.
 *   로그인 기반 실제 수업 진행(/class · /teacher/sessions)은 그대로 따로 있다.
 *
 * ★ 교실 화면 = 큰 그림 + 한 줄 + 큰 버튼 (프로젝터 · 전자칠판).
 *   교사 화면 = 활동 안내 · 발문 · 시간 · 준비물 · 관찰 포인트 · 안전 안내 (태블릿).
 *   넓은 화면에서는 나란히 볼 수 있다.
 *
 * ★ 키보드: → / Space 다음 · ← 이전 · F 전체 화면 · Esc 닫기.
 */
type Phase = { kind: "intro" } | { kind: "stage"; index: number } | { kind: "done" };
type View = "classroom" | "teacher" | "split";
type Sheet = null | "stages" | "materials" | "questions" | "end";

const STORAGE_PREFIX = "tap3-demo-classroom:";
const noopSubscribe = () => () => {};
const WIDE_QUERY = "(min-width: 1024px)";
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const STAGE_TONE: Record<StageKey, { soft: string; solid: string; text: string; color: string }> = {
  story: { soft: "bg-pop-sky-soft", solid: "bg-pop-sky", text: "text-pop-sky-deep", color: "#4da3ff" },
  move: { soft: "bg-pop-pink-soft", solid: "bg-pop-pink", text: "text-pop-pink-deep", color: "#ff4f8b" },
  explore: { soft: "bg-pop-mint-soft", solid: "bg-pop-mint", text: "text-pop-mint-deep", color: "#22c3b5" },
  make: { soft: "bg-pop-yellow-soft", solid: "bg-pop-yellow", text: "text-pop-ink", color: "#ffc928" },
  share: { soft: "bg-pop-lilac-soft", solid: "bg-pop-lilac", text: "text-pop-lilac-deep", color: "#9b7bff" },
};

function StageIcon({ stage, className = "h-12 w-12" }: { stage: StageKey; className?: string }) {
  const s = { fill: "none", stroke: "#1b2547", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle cx="32" cy="32" r="29" fill={STAGE_TONE[stage].color} />
      {stage === "story" && <g {...s}><path d="M14 20c6-2 12-2 18 2v24c-6-4-12-4-18-2z" fill="#fff" /><path d="M50 20c-6-2-12-2-18 2v24c6-4 12-4 18-2z" fill="#fff" /></g>}
      {stage === "move" && <g {...s}><circle cx="32" cy="15" r="5" fill="#fff" /><path d="M32 21v14M19 25l13 5 13-5M24 50l8-15 8 15" /></g>}
      {stage === "explore" && <g {...s}><circle cx="28" cy="28" r="11" fill="#fff" /><path d="M36 36l12 12" strokeWidth="5" /></g>}
      {stage === "make" && <g {...s}><path d="M18 46l20-26 8 6-20 26-10 2z" fill="#fff" /><path d="M42 16l8 6" /></g>}
      {stage === "share" && <g {...s}><path d="M32 48S14 38 14 26a8 8 0 0 1 18-4 8 8 0 0 1 18 4c0 12-18 22-18 22z" fill="#fff" /></g>}
    </svg>
  );
}

function readSaved(weekNo: number): { phase: Phase; view: View } | null {
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${weekNo}`);
    if (!raw) return null;
    const v = JSON.parse(raw) as { phase?: Phase; view?: View };
    const view: View = v.view === "teacher" || v.view === "split" ? v.view : "classroom";
    const p = v.phase;
    if (p?.kind === "stage" && Number.isInteger(p.index) && p.index >= 0 && p.index < 5) return { phase: p, view };
    if (p?.kind === "done") return { phase: p, view };
    return { phase: { kind: "intro" }, view };
  } catch {
    return null;
  }
}

function save(weekNo: number, phase: Phase, view: View) {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${weekNo}`, JSON.stringify({ phase, view }));
  } catch {
    /* 저장이 막힌 브라우저에서도 수업은 그대로 진행된다 */
  }
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ClassroomPlayer({ week, nextWeekNo }: { week: ExperienceWeek; nextWeekNo: number | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [view, setView] = useState<View>("classroom");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 서버 · 첫 렌더는 false — 브라우저에서만 실제 지원 여부를 읽는다 (hydration 불일치 없음)
  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    () => !!document.fullscreenEnabled,
    () => false,
  );
  // 나란히 보기는 넓은 화면(1024px~)에서만 — 좁은 화면에서는 교실 화면으로 대신한다
  const isWide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
  const [elapsed, setElapsed] = useState(0);
  const [announce, setAnnounce] = useState("");

  const stages = week.stages;
  const character = characterImage(week.body.character);
  const stageIndex = phase.kind === "stage" ? phase.index : phase.kind === "done" ? stages.length : -1;
  const current: ClassStage | null = phase.kind === "stage" ? stages[phase.index] : null;
  const progress = phase.kind === "done" ? 100 : phase.kind === "stage" ? Math.round((phase.index / stages.length) * 100) : 0;

  // 복원 — 이 탭에서 하던 단계로 돌아온다.
  // ★ 정적 HTML 은 언제나 시작 화면이다. 저장값은 hydration 이 끝난 다음 프레임에 읽는다
  //   (렌더 중에 sessionStorage 를 읽으면 서버 HTML 과 어긋난다).
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const saved = readSaved(week.weekNo);
      if (saved) {
        setPhase(saved.phase);
        setView(saved.view);
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [week.weekNo]);

  useEffect(() => {
    if (hydrated) save(week.weekNo, phase, view);
  }, [hydrated, phase, view, week.weekNo]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // 진행 시간 — 수업 중에만 흐른다 (기록하지 않는다)
  useEffect(() => {
    if (phase.kind !== "stage") return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase.kind]);

  const goTo = useCallback(
    (next: Phase) => {
      setPhase(next);
      setSheet(null);
      // 단계가 바뀌면 플레이어 머리로 — 모바일에서 아래로 내려간 채 다음 장면이 시작되지 않게
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || top > window.innerHeight * 0.4) {
        rootRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
      if (next.kind === "stage") setAnnounce(`${next.index + 1}단계 ${stages[next.index].title}`);
      else if (next.kind === "done") setAnnounce("수업을 마쳤습니다");
      else setAnnounce("수업 시작 화면");
    },
    [stages],
  );

  const next = useCallback(() => {
    if (phase.kind === "intro") goTo({ kind: "stage", index: 0 });
    else if (phase.kind === "stage") goTo(phase.index < stages.length - 1 ? { kind: "stage", index: phase.index + 1 } : { kind: "done" });
  }, [goTo, phase, stages.length]);

  const prev = useCallback(() => {
    if (phase.kind === "stage") goTo(phase.index > 0 ? { kind: "stage", index: phase.index - 1 } : { kind: "intro" });
    else if (phase.kind === "done") goTo({ kind: "stage", index: stages.length - 1 });
  }, [goTo, phase, stages.length]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      /* 전체 화면을 허용하지 않는 환경 — 화면은 그대로 쓴다 */
    }
  }, []);

  const restart = () => {
    setElapsed(0);
    goTo({ kind: "intro" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "Escape" && sheet) {
        setSheet(null);
        return;
      }
      if (sheet) return;
      if (e.key === "ArrowRight" || (e.key === " " && target?.tagName !== "BUTTON" && target?.tagName !== "A")) {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if ((e.key === "f" || e.key === "F") && canFullscreen) {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canFullscreen, next, prev, sheet, toggleFullscreen]);

  const effectiveView: View = view === "split" && !isWide ? "classroom" : view;
  const showClassroom = effectiveView !== "teacher";
  const showTeacher = effectiveView !== "classroom";

  return (
    <div ref={rootRef} className={cx("classroom-player relative scroll-mt-[84px]", isFullscreen && "p-4 sm:p-6")}>
      <p className="sr-only" aria-live="polite">{announce}</p>

      {/* ── 상단 도구 막대 ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-11 items-center rounded-full px-4 font-display text-[18px] text-white" style={{ backgroundColor: week.themeColor }}>
            {week.weekNo}주차
          </span>
          <span className="font-display text-[20px] text-pop-ink sm:text-[22px]">{week.title}</span>
          <DemoNotice compact />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="수업 도구">
          <div role="radiogroup" aria-label="화면 구성" className="inline-flex rounded-full bg-white p-1 shadow-pop">
            {(
              [
                ["classroom", "교실 화면"],
                ["teacher", "교사 화면"],
                ["split", "나란히"],
              ] as [View, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={effectiveView === v}
                onClick={() => setView(v)}
                className={cx(
                  "min-h-11 rounded-full px-4 text-[14px] font-bold transition-colors",
                  v === "split" && "max-lg:hidden",
                  effectiveView === v ? "bg-pop-ink text-white" : "text-pop-ink-muted hover:text-pop-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {canFullscreen ? (
            <button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen} className={popButtonClass("white", "md")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
                {isFullscreen ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
              {isFullscreen ? "전체 화면 끄기" : "전체 화면"}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── 진행률 ────────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[14px] font-bold text-pop-ink-muted">
          <span>
            {phase.kind === "intro" ? "수업 준비" : phase.kind === "done" ? "수업 완료" : `${stageIndex + 1} / ${stages.length} 단계 · ${current?.title}`}
          </span>
          <span className="tabular">
            {phase.kind === "stage" ? `진행 ${formatClock(elapsed)} · 계획 약 ${current?.minutes}분` : `전체 약 ${week.totalMinutes}분`}
          </span>
        </div>
        <div className="mt-2 flex gap-1.5" role="progressbar" aria-label="수업 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          {stages.map((s, i) => (
            <span key={s.key} className="h-3 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-pop-ink/5">
              <span
                className={cx("block h-full rounded-full transition-[width] duration-500", STAGE_TONE[s.key].solid)}
                style={{ width: i < stageIndex || phase.kind === "done" ? "100%" : i === stageIndex ? "55%" : "0%" }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* ── 본 화면 ───────────────────────────────────────────── */}
      <div className="mt-5">
        {phase.kind === "intro" ? (
          <IntroScreen week={week} onStart={next} />
        ) : phase.kind === "done" ? (
          <DoneScreen week={week} elapsed={elapsed} nextWeekNo={nextWeekNo} onRestart={restart} />
        ) : current ? (
          <div className={cx("grid gap-5", effectiveView === "split" && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
            {showClassroom ? (
              <section
                key={`c-${phase.index}`}
                aria-label="교실 화면"
                className={cx("relative isolate flex min-h-[420px] animate-stage-in flex-col overflow-hidden rounded-[36px] shadow-pop-lg sm:min-h-[520px]", STAGE_TONE[current.key].soft, isFullscreen && "min-h-[70vh]")}
              >
                <div aria-hidden="true" className="dots absolute inset-0 -z-10 opacity-50" />
                <div className="flex items-center gap-3 p-6 sm:p-8">
                  <StageIcon stage={current.key} className="h-14 w-14 sm:h-16 sm:w-16" />
                  <p className={cx("font-display text-[22px] sm:text-[26px]", STAGE_TONE[current.key].text)}>
                    {phase.index + 1}. {current.title}
                  </p>
                </div>
                <div className="flex flex-1 items-center justify-center px-6 pb-28 text-center sm:px-10">
                  <p className={cx("max-w-[18ch] font-display leading-[1.15] text-pop-ink", effectiveView === "split" ? "text-[40px] sm:text-[52px]" : "text-[44px] sm:text-[64px] lg:text-[76px]")}>
                    {current.childLine}
                  </p>
                </div>
                {character ? (
                  <Image src={character.src} alt="" width={character.width} height={character.height} sizes="200px" className="absolute bottom-0 left-4 w-[24%] max-w-[190px] animate-float-slow sm:left-8" />
                ) : null}
                <Sticker kind="star" color={STAGE_TONE[current.key].color} float className="absolute right-8 top-8 h-12 w-12 sm:h-16 sm:w-16" />
                <Sticker kind="sparkle" color="#ffc928" float delay={700} className="absolute bottom-10 right-10 h-10 w-10" />
              </section>
            ) : null}

            {showTeacher ? <TeacherPane key={`t-${phase.index}`} week={week} stage={current} /> : null}
          </div>
        ) : null}
      </div>

      {/* ── 하단 조작 ─────────────────────────────────────────── */}
      {phase.kind === "stage" ? (
        <div className="sticky bottom-3 z-20 mt-5 rounded-[28px] bg-white/95 p-2.5 shadow-pop-lg ring-1 ring-pop-ink/5 backdrop-blur sm:p-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={prev} className={popButtonClass("ghost", "lg", "px-5")}>
              ← 이전
            </button>
            <button type="button" onClick={next} className={popButtonClass("pink", "lg", "sm:order-last sm:ml-auto")}>
              {phase.index < stages.length - 1 ? "다음 단계" : "수업 마치기"}
              <ArrowRight />
            </button>
            <div className="col-span-2 grid grid-cols-4 gap-1.5 sm:flex sm:flex-1 sm:justify-center sm:gap-2">
              {(
                [
                  ["stages", "전체 단계"],
                  ["materials", "준비물"],
                  ["questions", "발문"],
                  ["end", "수업 종료"],
                ] as [Exclude<Sheet, null>, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSheet(key)}
                  className={cx(
                    "min-h-11 rounded-full bg-pop-cream px-2 text-[13px] font-bold ring-1 ring-pop-ink/10 transition-colors hover:bg-white sm:min-h-12 sm:px-5 sm:text-[15px]",
                    key === "end" ? "text-pop-pink-deep" : "text-pop-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {sheet ? (
        <SheetDialog
          title={sheet === "stages" ? "전체 단계" : sheet === "materials" ? "준비물 · 안전" : sheet === "questions" ? "교사 발문" : "수업을 마칠까요?"}
          onClose={() => setSheet(null)}
        >
          {sheet === "stages" ? (
            <ol className="grid gap-2">
              {stages.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => goTo({ kind: "stage", index: i })}
                    aria-current={i === stageIndex ? "step" : undefined}
                    className={cx("flex w-full items-center gap-4 rounded-3xl p-4 text-left transition-colors", i === stageIndex ? STAGE_TONE[s.key].soft : "bg-pop-cream hover:bg-white")}
                  >
                    <StageIcon stage={s.key} className="h-11 w-11 shrink-0" />
                    <span className="flex-1">
                      <span className="block text-[16px] font-bold text-pop-ink">{i + 1}. {s.title}</span>
                      <span className="block text-[14px] text-pop-ink-muted">{s.childLine}</span>
                    </span>
                    <span className="text-[13px] font-bold text-pop-ink-muted">약 {s.minutes}분</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : sheet === "materials" ? (
            <div className="grid gap-5">
              <ul className="grid gap-2">
                {week.body.materials.map((m) => (
                  <li key={m} className="flex items-center gap-3 rounded-2xl bg-pop-yellow-soft px-4 py-3 text-[16px] font-semibold text-pop-ink">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-pop-orange" />
                    {m}
                  </li>
                ))}
              </ul>
              <div>
                <p className="text-[14px] font-bold text-pop-pink-deep">안전 안내</p>
                <ul className="mt-2 grid gap-1.5 text-[15px] leading-relaxed text-pop-ink">
                  {week.body.safety.map((s) => <li key={s}>· {s}</li>)}
                </ul>
              </div>
            </div>
          ) : sheet === "questions" ? (
            <ul className="grid gap-3">
              {[...week.body.teacherQuestions, week.body.closingQuestion].map((q) => (
                <li key={q} className="rounded-3xl bg-pop-sky-soft p-4 text-[17px] font-semibold leading-relaxed text-pop-ink">“{q}”</li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-4">
              <p className="text-[16px] leading-relaxed text-pop-ink-muted">체험용 화면이라 기록은 남지 않습니다. 마무리 화면으로 이동합니다.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => goTo({ kind: "done" })} className={popButtonClass("pink", "lg", "flex-1")}>수업 마치기</button>
                <button type="button" onClick={() => setSheet(null)} className={popButtonClass("ghost", "lg", "flex-1")}>계속 진행</button>
              </div>
            </div>
          )}
        </SheetDialog>
      ) : null}
    </div>
  );
}

function IntroScreen({ week, onStart }: { week: ExperienceWeek; onStart: () => void }) {
  return (
    <section aria-label="수업 시작" className="grid animate-stage-in gap-6 overflow-hidden rounded-[36px] bg-white p-4 shadow-pop-lg sm:p-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:p-8">
      <WeekArt week={week} size="hero" priority className="aspect-[4/3] w-full rounded-[28px]" />
      <div className="flex flex-col justify-center gap-5 p-2">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-pop-yellow-soft px-3 py-1 text-[14px] font-bold text-pop-ink">#{week.growthKeyword}</span>
          <span className="rounded-full bg-pop-sky-soft px-3 py-1 text-[14px] font-bold text-pop-sky-deep">{week.durationLabel}</span>
        </div>
        <h2 className="font-display text-[40px] leading-tight text-pop-ink sm:text-[52px]">《{week.title}》</h2>
        <p className="text-[19px] font-medium leading-relaxed text-pop-ink">{week.coreMessage}</p>
        <div>
          <p className="text-[14px] font-bold text-pop-ink-muted">오늘의 준비물</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {week.body.materials.map((m) => (
              <li key={m} className="rounded-full bg-pop-cream px-3 py-1.5 text-[14px] font-semibold text-pop-ink ring-1 ring-pop-ink/5">{m}</li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onStart} className={popButtonClass("pink", "xl", "w-full sm:w-fit")} autoFocus>
          <PlayIcon />
          수업 시작
        </button>
        <ContentStatusBadge status={week.body.status} className="w-fit" />
      </div>
    </section>
  );
}

function TeacherPane({ week, stage }: { week: ExperienceWeek; stage: ClassStage }) {
  const extra: Record<StageKey, { label: string; text: string }[]> = {
    story: [{ label: "그림책 활동", text: week.body.story }],
    move: [{ label: "신체표현", text: week.body.movement }, { label: "음악 · 리듬", text: week.body.music }],
    explore: [{ label: "탐색", text: week.body.explore }],
    make: [{ label: "미술 활동", text: week.body.art }, { label: "결과물", text: week.outcome ?? `${week.activitySummary} (공식 결과물 정리 중)` }],
    share: [{ label: "가정연계", text: week.body.homeConnection }],
  };
  return (
    <section aria-label="교사 화면" className="animate-stage-in rounded-[36px] bg-white p-6 shadow-pop-lg sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className={cx("font-display text-[22px]", STAGE_TONE[stage.key].text)}>{stage.title}</p>
        <span className="rounded-full bg-pop-cream px-3 py-1 text-[14px] font-bold text-pop-ink">약 {stage.minutes}분</span>
      </div>
      <p className="mt-4 text-[18px] font-semibold leading-relaxed text-pop-ink">{stage.guide}</p>
      <div className="mt-5 rounded-3xl bg-pop-sky-soft p-5">
        <p className="text-[13px] font-bold text-pop-sky-deep">교사 발문</p>
        <p className="mt-1 text-[19px] font-bold leading-relaxed text-pop-ink">“{stage.teacherQuestion}”</p>
      </div>
      <dl className="mt-5 grid gap-4">
        {extra[stage.key].filter((x) => x.text !== stage.guide).map((x) => (
          <div key={x.label}>
            <dt className="text-[13px] font-bold text-pop-ink-muted">{x.label}</dt>
            <dd className="mt-1 text-[16px] leading-relaxed text-pop-ink">{x.text}</dd>
          </div>
        ))}
        {stage.key === "make" || stage.key === "share" ? (
          <div>
            <dt className="text-[13px] font-bold text-pop-ink-muted">관찰 포인트</dt>
            <dd>
              <ul className="mt-1 grid gap-1 text-[15px] leading-relaxed text-pop-ink">
                {week.body.observationPoints.map((o) => <li key={o}>· {o}</li>)}
              </ul>
            </dd>
          </div>
        ) : null}
        <div className="rounded-2xl bg-pop-pink-soft p-4">
          <dt className="text-[13px] font-bold text-pop-pink-deep">안전 안내</dt>
          <dd>
            <ul className="mt-1 grid gap-1 text-[14px] leading-relaxed text-pop-ink">
              {week.body.safety.map((s) => <li key={s}>· {s}</li>)}
            </ul>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function DoneScreen({ week, elapsed, nextWeekNo, onRestart }: { week: ExperienceWeek; elapsed: number; nextWeekNo: number | null; onRestart: () => void }) {
  const confetti = ["#ff4f8b", "#ffc928", "#22c3b5", "#4da3ff", "#9b7bff", "#ff8a3d"];
  return (
    <section aria-label="수업 완료" className="relative isolate animate-stage-in overflow-hidden rounded-[36px] bg-pop-yellow p-8 text-center shadow-pop-lg sm:p-14">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-3 w-3 animate-confetti rounded-[3px]"
            style={{
              backgroundColor: confetti[i % confetti.length],
              ["--dx" as string]: `${Math.cos((i / 18) * Math.PI * 2) * (160 + (i % 3) * 60)}px`,
              ["--dy" as string]: `${Math.sin((i / 18) * Math.PI * 2) * (120 + (i % 4) * 40)}px`,
              ["--rot" as string]: `${120 + i * 30}deg`,
              animationDelay: `${(i % 6) * 60}ms`,
            }}
          />
        ))}
      </div>
      <Sticker kind="star" color="#ff4f8b" className="mx-auto h-20 w-20 animate-pop-in" />
      <h2 className="mt-4 font-display text-[40px] leading-tight text-pop-ink sm:text-[56px]">오늘 수업 완료!</h2>
      <p className="mx-auto mt-3 max-w-[36ch] text-[19px] font-medium leading-relaxed text-pop-ink">
        《{week.title}》 다섯 단계를 모두 마쳤어요. {elapsed > 0 ? `진행 시간 ${formatClock(elapsed)}.` : ""}
      </p>
      <p className="mx-auto mt-4 max-w-[40ch] rounded-2xl bg-white/80 px-4 py-3 text-[16px] font-semibold text-pop-ink">마무리 질문 · “{week.body.closingQuestion}”</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={onRestart} className={popButtonClass("white", "lg")}>처음부터 다시</button>
        <Link href="/experience/report" className={popButtonClass("ink", "lg")}>성장 리포트 예시 보기</Link>
        {nextWeekNo ? (
          <Link href={`/experience/classroom/${nextWeekNo}`} className={popButtonClass("pink", "lg")}>
            {nextWeekNo}주차 체험하기 <ArrowRight />
          </Link>
        ) : null}
      </div>
      <p className="mt-6 text-[14px] font-semibold text-pop-ink-muted">체험용 화면이라 수업 기록 · 관찰 · 출결은 저장되지 않았습니다.</p>
    </section>
  );
}

function SheetDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(560px,calc(100vw-24px))] max-h-[85dvh] rounded-[32px] bg-white p-0 shadow-pop-lg backdrop:bg-pop-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-pop-ink/5 px-6 py-4">
        <h2 className="font-display text-[22px] text-pop-ink">{title}</h2>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-pop-cream text-pop-ink" aria-label="닫기">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="overflow-y-auto p-6">{children}</div>
    </dialog>
  );
}
