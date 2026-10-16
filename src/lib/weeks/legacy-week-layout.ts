import { LESSON_SECTION_CODES, LESSON_SECTION_LABELS, isLessonSectionCode } from "@/lib/curriculum/lesson-sections";

export type LegacyPanel = "prep" | "guide" | "class" | "observe" | "report";
const PANEL_CODES: Record<Exclude<LegacyPanel, "guide">, readonly string[]> = {
  prep: ["s15", "s4a", "s4c", "s1", "s2", "s3", "s4b"],
  class: ["s5", "s6", "s7", "s8", "s9", "s10", "s11"],
  observe: ["s12", "s14"],
  report: ["s12", "s13"],
};

/** STARTER section codes are semantic app keys: s8 is art, even when its PDF section is §9. */
export function legacySectionTitle(code: string): string {
  return isLessonSectionCode(code) ? LESSON_SECTION_LABELS[code].replace(/^§\d+(?:-[A-C])?\s+/, "") : "교안 항목";
}

export function legacyPanelRows<T extends { code: string }>(rows: readonly T[], panel: LegacyPanel): T[] {
  const order: readonly string[] = panel === "guide" ? LESSON_SECTION_CODES : PANEL_CODES[panel];
  const known = order.flatMap(code => rows.filter(row => row.code === code));
  return panel === "guide" ? [...known, ...rows.filter(row => !isLessonSectionCode(row.code))] : known;
}

export function legacySectionInitiallyOpen(panel: LegacyPanel, code: string): boolean {
  return panel !== "prep" && panel !== "class" ||
    (panel === "prep" && ["s15", "s4a", "s4c"].includes(code)) ||
    (panel === "class" && ["s5", "s6"].includes(code));
}
