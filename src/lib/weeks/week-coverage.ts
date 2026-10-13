import type { WeekBlocks, WeekContent } from "./week-types";

/**
 * 전사 범위 — 15개 섹션 중 어디까지 옮겼나 (본사 검수 화면).
 *
 * ── 왜 필요한가 ───────────────────────────────────────────────────
 *
 * 전사 상태는 주차 단위로 `pending` / `done` 둘뿐이다. 그런데 검수하는 사람은
 * 「14번 섹션이 비어 있다」를 알아야 한다. 그래서 블록을 하나씩 세어 준다.
 *
 * ★ 여기 숫자는 **옮긴 칸을 센 것**이다. 옮긴 내용이 원문과 같은지는 사람이
 *   대조한다. 코드가 판정하지 않는다.
 *
 * ★ 원문에 없어서 빈 칸과, 옮기지 않아서 빈 칸은 코드로 구분되지 않는다.
 *   화면이 그 사실을 적고, 검수자가 원문을 보고 판단한다.
 */

export interface SectionCoverage {
  /** 원문 섹션 번호 (1~15) */
  no: number;
  /** 원문 섹션 이름 */
  label: string;
  /** 블록이 채워졌나 */
  filled: boolean;
  /** 채워진 경우 안에 몇 항목이 들어왔나. 셀 수 없는 블록은 null */
  itemCount: number | null;
}

type BlockKey = keyof WeekBlocks;

interface SectionDef {
  no: number;
  label: string;
  key: BlockKey;
}

/**
 * 15개 섹션 ↔ 블록 키.
 *
 * ★ 8·9번은 주차에 따라 워크북/미술 순서가 바뀐다. 원문 번호를 「8 또는 9」로
 *   두지 않고 둘 다 적되 이름으로 구분한다.
 */
const SECTIONS: SectionDef[] = [
  { no: 1, label: "수업을 시작하기 전에", key: "beforeStart" },
  { no: 2, label: "수업 한눈에 보기", key: "atAGlance" },
  { no: 3, label: "교육목표 및 누리과정 연계", key: "objectives" },
  { no: 4, label: "수업 전 준비", key: "preparation" },
  { no: 5, label: "권장 시간표 · 관찰 시간표", key: "timetable" },
  { no: 6, label: "실제 수업 진행안", key: "lessonSteps" },
  { no: 7, label: "핵심활동", key: "coreActivity" },
  { no: 8, label: "워크북", key: "workbook" },
  { no: 9, label: "미술활동", key: "art" },
  { no: 10, label: "음원 · 뮤직비디오 활용 · 관찰 포인트", key: "mediaOrWatch" },
  { no: 11, label: "마무리 대화", key: "closing" },
  { no: 12, label: "관찰 및 기록 가이드", key: "observationGuide" },
  { no: 13, label: "가정연계", key: "homeConnection" },
  { no: 14, label: "수업 중 이런 상황이 생기면", key: "situations" },
  { no: 15, label: "교사용 1페이지 퀵 가이드", key: "quickGuide" },
];

export const SECTION_TOTAL = SECTIONS.length;

/** 블록 안에 들어온 항목 수. 셀 수 없으면 null */
function countItems(key: BlockKey, blocks: WeekBlocks): number | null {
  const value = blocks[key];
  if (value === null) return null;
  if (Array.isArray(value)) return value.length;

  switch (key) {
    case "preparation":
      return blocks.preparation
        ? blocks.preparation.materials.length +
            blocks.preparation.spaceSetup.length +
            blocks.preparation.safety.length
        : null;
    case "timetable":
      return blocks.timetable?.rows.length ?? null;
    case "coreActivity":
      return blocks.coreActivity
        ? blocks.coreActivity.plays.length + blocks.coreActivity.situations.length
        : null;
    case "workbook":
      return blocks.workbook?.pages.length ?? null;
    case "art":
      return blocks.art?.steps.length ?? null;
    case "mediaOrWatch":
      return blocks.mediaOrWatch?.items.length ?? null;
    case "closing":
      return blocks.closing?.questions.length ?? null;
    case "observationGuide":
      return blocks.observationGuide?.areas.length ?? null;
    case "homeConnection":
      return blocks.homeConnection?.steps.length ?? null;
    case "quickGuide":
      return blocks.quickGuide?.rows.length ?? null;
    case "beforeStart":
      return blocks.beforeStart
        ? blocks.beforeStart.experienceFlow.length + blocks.beforeStart.teacherRoles.length
        : null;
    case "atAGlance":
      return blocks.atAGlance
        ? blocks.atAGlance.coreActivities.length + blocks.atAGlance.linkedContents.length
        : null;
    default:
      return null;
  }
}

export interface WeekCoverage {
  sections: SectionCoverage[];
  filledCount: number;
  /** 교실 화면 장면 수 */
  sceneCount: number;
  /** 원문 파일명. 없으면 전사 전이다 */
  sourceFile: string | null;
  /** 가정연계 원문이 「미정」인 주차 (19주 등) */
  homeConnectionUndecided: boolean;
}

export function weekCoverage(content: WeekContent): WeekCoverage {
  const sections = SECTIONS.map<SectionCoverage>((def) => {
    const value = content.blocks[def.key];
    const filled = Array.isArray(value) ? value.length > 0 : value !== null;
    return {
      no: def.no,
      label: def.label,
      filled,
      itemCount: filled ? countItems(def.key, content.blocks) : null,
    };
  });

  return {
    sections,
    filledCount: sections.filter((s) => s.filled).length,
    sceneCount: content.scenes.length,
    sourceFile: content.sourceFile,
    homeConnectionUndecided: content.blocks.homeConnection?.status === "undecided",
  };
}
