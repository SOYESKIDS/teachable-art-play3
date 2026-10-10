/**
 * 공개 홈 성장기록 섹션 전용 — Growth5 단계 이름 · 설명.
 *
 * ★ release/public-site: 업무 화면이 쓰는 types/staff-observation.ts 를 바꾸지 않으려고 따로 둔다.
 *   값은 design-final-polish 의 types/staff-observation.ts GROWTH_STAGE_OPTIONS 와 같다 (교사 화면과 같은 문구).
 */
export type GrowthStage = "together" | "after_modeling" | "independent";

export const GROWTH_STAGE_OPTIONS: { value: GrowthStage; label: string; help: string }[] = [
  { value: "together", label: "함께", help: "교사나 친구와 함께, 또는 도움 속에서 나타난 모습" },
  { value: "after_modeling", label: "보고 나서", help: "예시나 다른 사람의 모습을 본 뒤 이어 해 본 모습" },
  {
    value: "independent",
    label: "스스로",
    help: "추가적인 도움이나 예시 없이 아이가 스스로 시도하거나 이어간 모습",
  },
];
