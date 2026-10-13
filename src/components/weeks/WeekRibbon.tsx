import type { ContentStatus } from "@/lib/weeks/content-state";

/**
 * 24주 책갈피 — 디자인 기획안의 유일한 시그니처 장치.
 *
 * ── 뜻이 하나다 ───────────────────────────────────────────────────
 *
 * ★ 책갈피는 **항상 「주차」만** 뜻한다. 버튼·경고·일반 카드 장식으로 쓰지
 *   않는다. 의미가 하나여야 사용자가 배운다.
 *
 * ── 색만으로 상태를 말하지 않는다 ────────────────────────────────
 *
 * 상태는 길이·채움·테두리로도 구분되고, 화면 읽기용 이름(「17주차, 이번 주」)이
 * 항상 붙는다.
 *
 * ── 모양 ──────────────────────────────────────────────────────────
 *
 * 위 테두리에 매달려 아래로 늘어지고, 끝이 V자로 접힌다 (아래 18% 지점).
 * 비율 2.4:1, 최소 너비 18px.
 */

/**
 * 책갈피 상태.
 *
 * ★ `current`(이번 주)와 `selected`(선택한 주차)는 다르다.
 *   「이번 주」는 **반의 실제 진행 상태**다 — 회차와 일정이 있어야 말할 수
 *   있다. 주차 페이지를 열었다는 것은 그냥 그 주차를 **보고 있다**는 뜻이다.
 *   둘을 같은 표시로 쓰면 교사가 반의 진도를 잘못 읽는다.
 */
export type RibbonState = "done" | "current" | "selected" | "next" | "locked";

const STATE_LABEL: Record<RibbonState, string> = {
  done: "완료",
  current: "이번 주",
  selected: "선택한 주차",
  next: "다음",
  locked: "이용권 밖",
};

const SIZE = {
  s: { w: 18, text: "text-[9px]" },
  m: { w: 28, text: "text-[12px]" },
  l: { w: 56, text: "text-[20px]" },
} as const;

export function WeekRibbon({
  weekNo,
  themeColor,
  state = "next",
  size = "m",
  status,
}: {
  weekNo: number;
  themeColor: string;
  state?: RibbonState;
  size?: keyof typeof SIZE;
  /** 전사·발행 상태. 전달하면 화면 읽기 이름에 덧붙는다 */
  status?: ContentStatus;
}) {
  const { w, text } = SIZE[size];
  // 이번 주는 길게 — 색이 아니라 길이로도 구분된다.
  // 선택한 주차는 길이를 늘리지 않는다. 진도가 아니라 보기 위치이기 때문이다.
  const height = Math.round(w * 2.4 * (state === "current" ? 1.25 : 1));

  const filled = state === "done" || state === "current" || state === "selected";
  const background = filled ? themeColor : "transparent";
  const border = state === "locked" ? "#d7e0d8" : filled ? themeColor : "#bfccc3";
  const color = filled ? "#ffffff" : state === "locked" ? "#bfccc3" : "#51605a";

  const label = [
    `${weekNo}주차`,
    STATE_LABEL[state],
    status && status.transcription !== "done" ? "원문 미전사" : null,
    status && status.publication !== "published" ? "검수 전" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-start justify-center font-serif tabular-nums leading-none ${text}`}
      style={{
        width: w,
        height,
        background,
        color,
        border: `1px solid ${border}`,
        // 끝이 접힌 책갈피 모양
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
        paddingTop: Math.max(3, Math.round(w * 0.18)),
      }}
    >
      {size === "s" ? "" : weekNo}
    </span>
  );
}

/**
 * 진행 띠 — 교사 홈·원장 화면에서 같은 그림을 쓴다.
 *
 * ★ 숫자를 글자로도 적는다 (「16/24」). 그림만으로 말하지 않는다.
 */
export function WeekRibbonTrack({
  weeks,
  currentWeek,
  completedThrough,
  entitledTo,
}: {
  weeks: { weekNo: number; themeColor: string; status: ContentStatus }[];
  currentWeek: number | null;
  /** 이 주차까지 완료 */
  completedThrough: number;
  /** 이용권이 여는 마지막 주차 */
  entitledTo: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-start gap-[3px]">
        {weeks.map((w) => {
          const state: RibbonState =
            w.weekNo > entitledTo
              ? "locked"
              : w.weekNo === currentWeek
                ? "current"
                : w.weekNo <= completedThrough
                  ? "done"
                  : "next";
          return (
            <WeekRibbon
              key={w.weekNo}
              weekNo={w.weekNo}
              themeColor={w.themeColor}
              state={state}
              size="s"
              status={w.status}
            />
          );
        })}
      </div>
      <p className="text-[13px] tabular-nums text-muted-ink">
        {completedThrough}/{weeks.length}
        {entitledTo < weeks.length ? ` · 이용권 ${entitledTo}주까지` : ""}
      </p>
    </div>
  );
}
