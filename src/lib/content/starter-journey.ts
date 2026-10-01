import manifest from "../../../content/starter/2026.1/manifest.json";

/**
 * STARTER 2026.1 8주 여정 — 화면 표시용 읽기 전용 데이터.
 *
 * ★ 원본은 content/starter/2026.1/manifest.json 하나다 (PHASE 10E canonical).
 *   예전에는 program-products.ts 가 주차 제목 · 키워드를 손으로 옮겨 적고 있었고,
 *   W1~3 키워드(적응 · 도전 · 친구)와 W7~8 내용이 원본과 어긋나 있었다.
 *   이제 마케팅 · 상품 상세 · 교사 화면이 같은 원본을 읽는다.
 *
 * ★ 상태: APPROVED FOR STAGING EMPLOYEE UAT · NOT APPROVED FOR PRODUCTION
 *   (docs/11-production-readiness/phase-10e-starter-content-approval.md).
 *   공개 페이지에 싣기 전 운영자 콘텐츠 승인이 필요하다 — content-experience-v1.md §9.
 *
 * ★ 서버 컴포넌트에서만 import 한다.
 *   manifest 전체(출처 · 추출 정보 포함)가 브라우저 번들에 들어가지 않게,
 *   필요한 필드만 골라 직렬화 가능한 값으로 넘긴다.
 */

export interface StarterWeek {
  week: number;
  title: string;
  storybook: string;
  theme: string;
  growthKeyword: string;
  coreMessage: string;
  coverMessage: string;
  duration: string;
  objective: string;
  physicalActivity: string;
  artActivity: string;
  workbook: string;
  materials: string;
  nuriAreas: string[];
  observationFocus: string[];
  familyConnection: string;
  media: string[];
  kit: string;
  /** 다른 주차와의 연결 (원본 cross_week) */
  crossWeek: string[];
}

interface ManifestWeek {
  week: number;
  title: string;
  storybook: string;
  theme: string;
  growth_keyword: string;
  core_message: string;
  cover_core_message: string;
  recommended_duration: string;
  objective: string;
  physical_activity: string;
  art_activity: string;
  workbook: string;
  materials: string;
  nuri_areas: string[];
  observation_focus: string[];
  family_connection: string;
  media: string[];
  kit: string;
  cross_week: string[];
}

export const STARTER_PROGRAM_CODE: string = manifest.program.code;

export const STARTER_WEEKS: StarterWeek[] = (manifest.weeks as ManifestWeek[]).map(
  (w) => ({
    week: w.week,
    title: w.title,
    storybook: w.storybook,
    theme: w.theme,
    growthKeyword: w.growth_keyword,
    coreMessage: w.core_message,
    coverMessage: w.cover_core_message,
    duration: w.recommended_duration,
    objective: w.objective,
    physicalActivity: w.physical_activity,
    artActivity: w.art_activity,
    workbook: w.workbook,
    materials: w.materials,
    nuriAreas: w.nuri_areas,
    observationFocus: w.observation_focus,
    familyConnection: w.family_connection,
    media: w.media,
    kit: w.kit,
    crossWeek: w.cross_week,
  }),
);

/**
 * 8주를 세 묶음으로 읽게 하는 표시용 그룹.
 *
 * ★ 묶음 이름은 원본에 없다 (SOURCE CONFLICT · 운영자 승인 필요).
 *   묶는 기준은 원본 근거를 따른다:
 *     · 1~3주: 다른 주차와의 연결(cross_week)이 없는, 나와 우리 반을 여는 주
 *     · 4~7주: 각 주의 결과물이 8주 현수막의 한 요소가 된다
 *       (씨앗·새싹 → 꽃 → 비·바람·햇살 → 나비·벌 · week-08 §9)
 *     · 8주: "1~7주 동안 경험하고 만든 것들이 하나의 숲으로 모이는 마지막 주" (week-08 §1)
 */
export const STARTER_JOURNEY_GROUPS = [
  {
    key: "open",
    label: "마음 열기",
    weeks: [1, 2, 3],
    summary: "새 공간과 친구를 알아가고, 다시 해 보고, 마음을 말로 꺼내 봅니다.",
  },
  {
    key: "grow",
    label: "자라나기",
    weeks: [4, 5, 6, 7],
    summary: "씨앗 · 꽃 · 비와 햇살 · 나비와 벌 — 매주 만든 작품이 8주의 숲으로 이어집니다.",
  },
  {
    key: "forest",
    label: "우리의 숲",
    weeks: [8],
    summary: "1~7주 동안 만든 것들이 하나의 숲 현수막으로 모입니다.",
  },
] as const;

/** 1~7주 중 8주 숲 현수막으로 이어지는 주 (원본 cross_week 에 W8 언급이 있는 주) */
export function feedsFinalForest(week: StarterWeek): boolean {
  return week.crossWeek.some((line) => line.includes("W8"));
}
