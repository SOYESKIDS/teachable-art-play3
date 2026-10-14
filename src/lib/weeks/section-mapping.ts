import type { WeekBlocks } from "./week-types";

/**
 * 15개 블록 ↔ 17개 `lesson_sections.section_code` 매핑.
 *
 * ── 왜 공유 모듈인가 ────────────────────────────────────────────
 *
 * 적재(build-sql.mjs)와 조회(week-db-source.ts)가 **같은 매핑**을 써야 한다.
 * 한쪽만 고치면 적재한 것과 읽는 것이 어긋나고, 그 어긋남은 화면에서야
 * 드러난다. 그래서 한 곳에 두고 양쪽이 가져다 쓴다.
 *
 * ── 섹션 번호는 주차마다 다르다 ────────────────────────────────
 *
 *   1·3~8주 : 8 = 워크북 · 9 = 미술활동
 *   2주     : 8 = 미술활동 · 9 = 워크북   ← 1권 안의 예외
 *   9~24주  : 8 = 미술활동 · 9 = 워크북
 *
 * 2026-10-14 원문 쪽 텍스트에서 「N. 워크북 운영 가이드」·「N. 미술활동」을
 * 직접 찾아 확인한 값이다. 추측이 아니다 (8주차 9번 제목은
 * 「미술·교구 통합활동」이다).
 *
 * ★ 원문 4번은 A(준비물)·B(공간 세팅)·C(안전 확인) 세 항이고, DB 도
 *   s4a·s4b·s4c 로 나눠 받는다. C항 **제목**이 주차마다 달라서
 *   (16주 「안전·개인정보 확인」) 안전 조각에 함께 싣는다.
 */

export type PreparationPart = "materials" | "spaceSetup" | "safety";

export interface SectionSlot {
  code: string;
  key: keyof WeekBlocks;
  part?: PreparationPart;
}

/** 2주차와 9주차 이후는 미술활동이 8번이다 */
export function artIsSectionEight(weekNo: number): boolean {
  return weekNo === 2 || weekNo >= 9;
}

export function sectionPlan(weekNo: number): SectionSlot[] {
  const artCode = artIsSectionEight(weekNo) ? "s8" : "s9";
  const workbookCode = artIsSectionEight(weekNo) ? "s9" : "s8";
  return [
    { code: "s1", key: "beforeStart" },
    { code: "s2", key: "atAGlance" },
    { code: "s3", key: "objectives" },
    { code: "s4a", key: "preparation", part: "materials" },
    { code: "s4b", key: "preparation", part: "spaceSetup" },
    { code: "s4c", key: "preparation", part: "safety" },
    { code: "s5", key: "timetable" },
    { code: "s6", key: "lessonSteps" },
    { code: "s7", key: "coreActivity" },
    { code: workbookCode, key: "workbook" },
    { code: artCode, key: "art" },
    { code: "s10", key: "mediaOrWatch" },
    { code: "s11", key: "closing" },
    { code: "s12", key: "observationGuide" },
    { code: "s13", key: "homeConnection" },
    { code: "s14", key: "situations" },
    { code: "s15", key: "quickGuide" },
  ];
}

/**
 * `lesson_sections.body_json` 에 들어가는 봉투.
 *
 * 블록 키를 **값과 함께** 싣는다. section_code 만으로는 어느 블록인지
 * 정해지지 않기 때문이다 (8·9번이 주차마다 뒤바뀐다).
 */
export interface SectionEnvelope {
  blockKey: keyof WeekBlocks;
  part?: PreparationPart;
  value: unknown;
  /** 안전 조각에만. 원문 C항 제목 */
  safetyLabel?: string;
}

/** 블록 → 봉투. 해당 블록이 null 이면 null (원문에 없다) */
export function encodeSection(blocks: WeekBlocks, slot: SectionSlot): SectionEnvelope | null {
  const block = blocks[slot.key];
  if (block === null || block === undefined) return null;

  if (slot.part) {
    const preparation = block as NonNullable<WeekBlocks["preparation"]>;
    const envelope: SectionEnvelope = {
      blockKey: slot.key,
      part: slot.part,
      value: preparation[slot.part],
    };
    if (slot.part === "safety") envelope.safetyLabel = preparation.safetyLabel;
    return envelope;
  }

  return { blockKey: slot.key, value: block };
}
