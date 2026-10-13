import { WEEK_INDEX, weekSummary } from "./week-index";
import { WEEK_01_BLOCKS, WEEK_01_SCENES, WEEK_01_SOURCE_FILE } from "./content/week-01";
import { EMPTY_BLOCKS, type WeekContent, type WeekScene, type WeekSummary } from "./week-types";

/**
 * 주차 콘텐츠 읽기 계층 — B단계.
 *
 * ── 왜 이 계층이 따로 있는가 ──────────────────────────────────────
 *
 * UI 를 먼저 완성해야 하는데 원격 DB 는 아직 바꾸지 않는다. 그래서 화면은
 * 이 함수들만 부르고, E단계에서 같은 함수의 **안쪽만** 실제 테이블 조회로
 * 바꾼다. 화면 코드는 그때 손대지 않는다.
 *
 * ── 가상 데이터임을 숨기지 않는다 ────────────────────────────────
 *
 * ★ 모든 반환값이 `origin` 을 들고 다닌다. `"fixture"` 는 저장소 안의 전사
 *   데이터이고 `"database"` 는 실제 조회 결과다. 화면은 fixture 일 때
 *   개발 환경에서 그 사실을 눈에 보이게 표시한다.
 *
 * ★ fixture 라고 해서 "가짜 수업 내용"이 아니다. 1주차 블록은 공식 가이드
 *   원문 전사다. 다만 **저장소에 있고 DB 에 없다**는 뜻이다. 그 둘은 다른
 *   문제이므로 `origin`(어디서 왔나)과 `reviewState`(검수했나)를 따로 둔다.
 *
 * ── 없는 것을 있다고 하지 않는다 ─────────────────────────────────
 *
 * 전사하지 않은 주차는 빈 블록과 `pending_transcription` 을 돌려준다.
 * 화면이 그 상태를 그대로 보여 주고, 임의로 문장을 만들지 않는다.
 */

export type ContentOrigin = "fixture" | "database";

export interface WeekContentResult {
  origin: ContentOrigin;
  content: WeekContent;
}

export interface WeekListResult {
  origin: ContentOrigin;
  weeks: WeekSummary[];
}

/** 저장소에 전사된 주차의 블록·장면 */
const FIXTURES: Record<
  number,
  { blocks: typeof WEEK_01_BLOCKS; scenes: WeekScene[]; sourceFile: string }
> = {
  1: { blocks: WEEK_01_BLOCKS, scenes: WEEK_01_SCENES, sourceFile: WEEK_01_SOURCE_FILE },
};

/**
 * 개발 환경에서 가상 데이터 표시를 켤지.
 *
 * ★ 운영 빌드에서는 배너를 그리지 않는다. 다만 데이터 자체는 그대로이므로
 *   `origin` 값은 어느 환경에서나 정확하다.
 */
export function shouldMarkFixture(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** 24주 지도. 현재는 저장소 index 를 쓴다 */
export function listWeeks(): WeekListResult {
  return { origin: "fixture", weeks: WEEK_INDEX };
}

/**
 * 한 주차의 전체 콘텐츠.
 *
 * 없는 주차 번호는 null 이다 (1~24 밖).
 */
export function getWeekContent(weekNo: number): WeekContentResult | null {
  const summary = weekSummary(weekNo);
  if (!summary) return null;

  const fixture = FIXTURES[weekNo];

  return {
    origin: "fixture",
    content: {
      summary,
      blocks: fixture?.blocks ?? EMPTY_BLOCKS,
      scenes: fixture?.scenes ?? [],
      sourceFile: fixture?.sourceFile ?? null,
    },
  };
}

/** 전사된 블록이 하나라도 있는가 */
export function hasAnyBlock(content: WeekContent): boolean {
  return Object.values(content.blocks).some((v) => v !== null);
}

/**
 * 교사에게 수업 내용을 보여 줘도 되는가.
 *
 * ★ 전사만 된 주차도 보여 준다. 다만 화면이 "검수 대기"를 함께 적는다.
 *   감추면 교사가 인쇄본만 쓰게 되어 화면을 만든 뜻이 없어진다.
 * ★ 전사조차 없으면 보여 줄 내용이 없다.
 */
export function canShowLessonBody(content: WeekContent): boolean {
  return content.summary.reviewState !== "pending_transcription" && hasAnyBlock(content);
}
