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
  /** 누리과정 공식 5영역만 (원본 nuri_areas 에서 걸러낸 값) */
  nuriAreas: string[];
  /** 원본 nuri_areas 중 누리과정 영역이 아닌 값 — SOYE KIDS 핵심경험으로 분리 표기한다 */
  soyeCoreExperiences: string[];
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

/**
 * 2019 개정 누리과정의 공식 5영역.
 *
 * ★ 원본 교사용 가이드의 §3 표에는 이 다섯 개 밖의 값이 섞여 있는 주차가 있다
 *   (W2 "정서·자기조절"). STARTER 표준화 규격 v1.0 §5 가 그 표기를 금지하고
 *   "SOYE KIDS 핵심경험으로 분리"하도록 지정했다.
 *
 * ★ 원본과 정본 적재본(manifest)은 바꾸지 않는다 — 원본에 그렇게 적혀 있는 것이 사실이다.
 *   공개 화면에서 "누리과정"이라는 라벨 아래 비공식 영역이 나가지 않도록
 *   표시 계층에서만 갈라 놓는다.
 */
export const NURI_AREAS: readonly string[] = [
  "신체운동·건강",
  "의사소통",
  "사회관계",
  "예술경험",
  "자연탐구",
] as const;

function splitNuriAreas(raw: string[]): { nuri: string[]; soye: string[] } {
  const nuri: string[] = [];
  const soye: string[] = [];
  for (const area of raw) {
    (NURI_AREAS.includes(area) ? nuri : soye).push(area);
  }
  return { nuri, soye };
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
    nuriAreas: splitNuriAreas(w.nuri_areas).nuri,
    soyeCoreExperiences: splitNuriAreas(w.nuri_areas).soye,
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
    label: "시작 · 경험 · 표현",
    weeks: [1, 2, 3],
    summary: "유치원에서 시작하고, 끝까지 해 보고, 마음을 말로 표현해 봅니다.",
  },
  {
    key: "grow",
    label: "함께 자람",
    weeks: [4, 5, 6, 7],
    summary: "씨앗 · 꽃 · 비와 햇살 · 나비와 벌 — 매주 만든 작품이 8주의 숲으로 이어집니다.",
  },
  {
    key: "forest",
    label: "하나의 숲",
    weeks: [8],
    summary: "1~7주 동안 만든 것들이 하나의 숲 현수막으로 모입니다.",
  },
] as const;

/** 1~7주 중 8주 숲 현수막으로 이어지는 주 (원본 cross_week 에 W8 언급이 있는 주) */
export function feedsFinalForest(week: StarterWeek): boolean {
  return week.crossWeek.some((line) => line.includes("W8"));
}
