/**
 * 수업 목표 표기 "A X · B O" 를 화면용으로 나눈다 (PHASE UAT-STABILIZATION).
 *
 * 원본(canonical 수업안)은 "‘빨리 적응시키기’ X · 새로운 공간을 … 첫 시작 O" 처럼 쓴다.
 * 원본 문장은 바꾸지 않고, 화면에서만 "이렇게 해요 / 이렇게 하지 않아요"로 보여 준다.
 * 형식이 아니면 null — 호출하는 쪽은 원문을 그대로 보여 준다.
 */
export interface GoalNotation {
  /** O 쪽 — 이렇게 해요 */
  goal: string;
  /** X 쪽 — 이렇게 하지 않아요 */
  avoid: string;
}

const PATTERN = /^\s*(.+?)\s+X\s*·\s*(.+?)\s+O\s*$/;

export function parseGoalNotation(text: string | null | undefined): GoalNotation | null {
  if (!text) return null;
  const match = text.match(PATTERN);
  if (!match) return null;
  const strip = (value: string) => value.trim().replace(/^[‘'"“]+|[’'"”]+$/g, "").trim();
  return { avoid: strip(match[1]), goal: strip(match[2]) };
}
