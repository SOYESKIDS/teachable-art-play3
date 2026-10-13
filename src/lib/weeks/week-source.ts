import { WEEK_INDEX, weekSummary } from "./week-index";
import { WEEK_01_BLOCKS, WEEK_01_SCENES, WEEK_01_SOURCE_FILE } from "./content/week-01";
import {
  hiddenReason,
  isVisibleTo,
  type ContentAudience,
  type ContentOrigin,
  type HiddenReason,
} from "./content-state";
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
 * ── 경로가 본문 공개를 정한다 ────────────────────────────────────
 *
 * ★ `audience: "service"` — 교사·원장·보호자가 쓰는 정식 경로.
 *   **발행된 주차의 본문만** 돌려준다. 검수 전 원문은 블록을 비우고 이유를
 *   함께 돌려준다. 화면이 실수로 내보낼 수 없도록 **데이터 계층에서** 막는다.
 *
 * ★ `audience: "internal_review"` — 본사 검수 화면.
 *   전사된 주차의 본문을 돌려준다. 검수하려면 봐야 하기 때문이다.
 *
 * ── 세 가지를 따로 돌려준다 ──────────────────────────────────────
 *
 * origin(어디서 왔나) · transcription(옮겼나) · publication(검수했나)은
 * 서로 다른 질문이다. `content-state.ts` 참고.
 */

export type { ContentOrigin } from "./content-state";

export interface WeekContentResult {
  origin: ContentOrigin;
  content: WeekContent;
  /** 이 경로에서 본문을 보여 줘도 되는가 */
  bodyVisible: boolean;
  /** 감췄다면 그 이유 */
  hidden: HiddenReason | null;
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

/** 24주 지도. 메타는 경로와 무관하게 모두 보여 준다 (본문이 아니다) */
export function listWeeks(): WeekListResult {
  return { origin: "fixture", weeks: WEEK_INDEX };
}

/**
 * 한 주차의 콘텐츠.
 *
 * @param audience 정식 서비스인지 내부 검수인지. **기본값은 service** 다 —
 *   부르는 쪽이 깜빡하면 더 좁은 쪽으로 열린다.
 */
export function getWeekContent(
  weekNo: number,
  audience: ContentAudience = "service",
): WeekContentResult | null {
  const summary = weekSummary(weekNo);
  if (!summary) return null;

  const fixture = FIXTURES[weekNo];
  const visible = isVisibleTo(summary.status, audience);

  return {
    origin: "fixture",
    bodyVisible: visible,
    hidden: visible ? null : hiddenReason(summary.status),
    content: {
      summary,
      // ★ 열람이 허용되지 않으면 블록·장면을 애초에 담지 않는다.
      //   화면에서 숨기는 것으로 끝내면 HTML 에는 그대로 실려 나간다.
      blocks: visible ? (fixture?.blocks ?? EMPTY_BLOCKS) : EMPTY_BLOCKS,
      scenes: visible ? (fixture?.scenes ?? []) : [],
      sourceFile: fixture?.sourceFile ?? null,
    },
  };
}

/** 전사된 블록이 하나라도 있는가 */
export function hasAnyBlock(content: WeekContent): boolean {
  return Object.values(content.blocks).some((v) => v !== null);
}
