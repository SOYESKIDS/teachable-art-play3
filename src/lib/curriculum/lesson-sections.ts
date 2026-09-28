/**
 * 차시 원본 15섹션 (product-definition §7-2 · DEC-096).
 * DB check(private.is_known_lesson_section)와 같은 코드 집합이다.
 */

export const LESSON_SECTION_CODES = [
  "s1",
  "s2",
  "s3",
  "s4a",
  "s4b",
  "s4c",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "s10",
  "s11",
  "s12",
  "s13",
  "s14",
  "s15",
] as const;

export type LessonSectionCode = (typeof LESSON_SECTION_CODES)[number];

/** Required Content Set (DEC-096) — private.required_lesson_sections() 와 같아야 한다 */
export const REQUIRED_LESSON_SECTIONS: readonly LessonSectionCode[] = [
  "s1",
  "s2",
  "s3",
  "s4a",
  "s4c",
  "s5",
  "s6",
  "s11",
  "s12",
  "s13",
  "s15",
];

export const LESSON_SECTION_LABELS: Record<LessonSectionCode, string> = {
  s1: "§1 수업을 시작하기 전에",
  s2: "§2 수업 한눈에 보기",
  s3: "§3 교육목표 및 누리과정 연계",
  s4a: "§4-A 준비물",
  s4b: "§4-B 공간 세팅",
  s4c: "§4-C 안전 및 개인정보 확인",
  s5: "§5 권장 시간표",
  s6: "§6 실제 수업 진행안",
  s7: "§7 핵심활동",
  s8: "§8 미술·창작활동",
  s9: "§9 워크북·교구",
  s10: "§10 EBOOK·음원·MV 활용",
  s11: "§11 마무리 대화",
  s12: "§12 관찰 및 기록",
  s13: "§13 가정연계",
  s14: "§14 수업 중 이런 상황이 생기면",
  s15: "§15 교사용 1페이지 퀵 가이드",
};

export function isLessonSectionCode(value: string): value is LessonSectionCode {
  return (LESSON_SECTION_CODES as readonly string[]).includes(value);
}
