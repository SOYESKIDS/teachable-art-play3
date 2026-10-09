import { pricingPackages } from "./packages";
import type { PricingPackage } from "@/types/content";

/**
 * 상품 상세 콘텐츠.
 *
 * ★ 가격 · 기간 · 콘텐츠 수량 · 포함 항목 상태를 여기에 다시 적지 않는다.
 *   그 값들은 data/packages.ts 의 pricingPackages 가 갖고 있고,
 *   홈페이지 가격 카드와 비교표가 그것을 쓴다. 상세는 pkg 로 그 객체를 그대로 물고 간다.
 *
 * ★ STARTER 8주의 원본은 content/starter/2026.1/manifest.json 하나다.
 *   서버 컴포넌트는 src/lib/content/starter-journey.ts (STARTER_WEEKS) 를 직접 읽는다.
 *   이 파일은 홈페이지 카드 · 오버레이 같은 클라이언트 화면도 쓰므로 manifest 를
 *   import 하지 않고, 목록 카드에 필요한 문자열만 원본 그대로 옮겨 둔다
 *   (주차 · 그림책 제목 · 주제 · 성장키워드 · 핵심 메시지 · 8주 숲 연결 · 묶음).
 *   /programs/[slug] 페이지가 빌드 시점에 이 사본을 STARTER_WEEKS 와 대조하고,
 *   어긋나면 빌드를 멈춘다 (assertStarterCopyMatchesManifest).
 *
 * ★ 확정되지 않은 것은 만들지 않는다.
 *   STANDARD 9~16주 (BC-1 미승인) · PREMIUM 17~24주 (BC-2 DRAFT) 의 주차별 구성은
 *   보여 주지 않는다. curriculum 은 undefined 이고, 대신 curriculumNote 가
 *   "주차별 구성은 상담 시 안내 · 콘텐츠 준비 중"이라고 사실대로 말한다.
 *
 * ★ 진단 · 발달 보장 표현을 쓰지 않는다.
 *
 * ─────────────────────────────────────────────── SOURCE CONFLICTS (유지 중)
 *  SC-1 STARTER 가격 99,000원/월 · 198,000원은 코드에만 있다 (상품소개서 v4 미확인).
 *       값은 packages.ts 에 그대로 두었다 — 운영자 확인 필요.
 *  SC-2 대상 연령 (만 4~6세 / 4~7세) 근거 없음 (BC-4 · DB age_group NULL)
 *       → 추천 문구 · SEO 에서 삭제, 카드에는 "상담 시 안내".
 *  SC-3 8주 묶음 이름(시작 · 경험 · 표현 / 함께 자람 / 하나의 숲)은 원본에 없다.
 *       묶는 기준(cross_week)은 원본 근거를 따른다 — starter-journey.ts 참고. 운영자 승인 필요.
 *  SC-4 STARTER 2026.1 콘텐츠 상태: APPROVED FOR STAGING EMPLOYEE UAT ·
 *       NOT APPROVED FOR PRODUCTION. 공개 배포 전 운영자 콘텐츠 승인이 필요하다.
 *  SC-5 W4 성장키워드: 원본 표기 '시작'(W1 과 중복)을 유지. 마케팅 문서의 '발견'은 쓰지 않는다.
 *  SC-6 수업 시간은 운영자 확정 표준 "CORE 50분(워크북 포함) + 선택 연계활동 10~15분"(2026-10-09) 하나로 쓴다.
 *       단계별 분 배분은 회차마다 달라 공개 화면에 적지 않는다 (아래 STANDARD_LESSON_BLOCKS 의 분은 내부 참고값).
 *       canonical manifest 의 주차별 "가이드 권장 시간"(약 50~70분 · 이전 가이드)은 공개 화면에 표시하지 않는다.
 *  해소한 drift: W1~3 성장 지점(적응 · 도전 · 친구) → 원본 키워드(시작 · 끈기 · 표현) ·
 *  W7 제목 "서두르지 않아도 돼" → 《나비야 놀자!》 · "나비·별" → "나비·벌" ·
 *  W7~8 "준비 중" 삭제 (원본 가이드 존재) · "주 1회 40~50분" → DEC-023 ·
 *  활동음원 24/48/72개 · "일 년 / 연간" (PREMIUM 은 24주) 삭제.
 */

export type ProgramSlug = "starter" | "standard" | "premium";

export const PROGRAM_SLUGS: readonly ProgramSlug[] = [
  "starter",
  "standard",
  "premium",
] as const;

export function isProgramSlug(value: string): value is ProgramSlug {
  return (PROGRAM_SLUGS as readonly string[]).includes(value);
}

/** 상품별 강조색. 페이지 전체를 칠하지 않고 선 · 배지 · 번호에만 쓴다. */
export interface ProgramTheme {
  /** 상단 얇은 강조선 */
  rule: string;
  /** eyebrow · 번호 글자색 */
  accentText: string;
  /** 배지 배경 + 글자 */
  badge: string;
  /** 단락 왼쪽 선 */
  markerBorder: string;
  /** 아주 옅은 표면. 본문 가독성을 해치지 않는 선까지만. */
  softSurface: string;
}

/** 주차 안의 활동 한 갈래. */
export interface ProgramWeekActivity {
  title: string;
  summary?: string;
  items?: string[];
}

/**
 * 한 주차 — 목록 카드에 필요한 값.
 *
 * ★ 값은 manifest 원본 문자열 그대로다 (위 머리말 참고).
 *   주차 상세(목표 · 활동 · 준비물 · 관찰 포인트 …)는 이 사본에 없다.
 *   상세 페이지가 서버에서 STARTER_WEEKS 를 읽어 StarterWeekDetail 로 넘긴다.
 */
export interface ProgramCurriculumWeek {
  week: number;
  /** 원본 theme */
  topic: string;
  /**
   * 그 주에 자라는 지점. 홈페이지 STARTER 쇼케이스가 읽는다.
   * 원본 growth_keyword 와 같은 값이다 (예전 적응 · 도전 · 친구는 원본과 달랐다).
   */
  growthPoint: string;
  /** 원본 growth_keyword */
  growthKeyword?: string;
  /** 원본 title (그림책 제목, 《》 없이) */
  storyTitle?: string;
  /** 원본 core_message */
  coreMessage?: string;
  /** 이 주의 결과물이 8주 숲 현수막으로 이어지는가 (원본 cross_week 에 W8 언급) */
  feedsForest?: boolean;

  /* 아래는 하위 호환용 (예전 화면이 읽던 필드). 지금 사본에는 takeHome 만 채운다. */
  experienceSummary?: string;
  experienceFlow?: string[];
  coreExperiences?: string[];
  movement?: ProgramWeekActivity;
  workbook?: ProgramWeekActivity;
  creative?: ProgramWeekActivity;
  /** 그 주의 대표 결과물 — 원본 art_activity 의 결과물 이름 */
  takeHome?: ProgramWeekActivity;
  homeConnection?: ProgramWeekActivity;

  /** 마지막 주차처럼 시각적으로 강조할 회차 */
  finale?: boolean;
}

/** 8주를 세 묶음으로 읽게 하는 표시용 그룹 (STARTER_JOURNEY_GROUPS 사본) */
export interface ProgramJourneyGroup {
  key: string;
  label: string;
  weeks: readonly number[];
  summary: string;
}

/**
 * 주차 상세 — 서버에서 STARTER_WEEKS 로부터 만들어 넘기는 값.
 * 클라이언트 번들에 manifest 를 싣지 않기 위해 타입만 여기에 둔다.
 */
export interface StarterWeekDetail {
  week: number;
  storybook: string;
  /** 원본 cover_core_message — 없는 주가 많다 */
  coverMessage: string | null;
  /** 가이드 권장 운영 시간 (워크북 포함) */
  duration: string;
  /** "하지 않는 것 X · 하려는 것 O" 형식 */
  objective: string;
  physicalActivity: string;
  artActivity: string;
  kit: string;
  workbook: string;
  materials: string;
  nuriAreas: string[];
  observationFocus: string[];
  familyConnection: string;
  crossWeek: string[];
}

/** 대표 수업 한 회차의 진행 구성. 분 단위 합이 실제 수업 시간과 같아야 한다. */
export interface ProgramLessonBlock {
  code: string;
  label: string;
  minutes: number;
}

export interface ProgramFeaturedLesson {
  week: number;
  storyTitle: string;
  blocks: ProgramLessonBlock[];
  coreExperiences: string[];
  /** (사용 안 함) 예전 "워크북 별도 N분" — 2026-10-09 표준에서 워크북은 CORE 50분 안에 포함 */
  workbookMinutes?: number;
  /** 골격에 대한 짧은 보충 */
  notes?: string[];
}

export interface ProgramContentArea {
  code: string;
  label: string;
  detail: string;
}

export interface ProgramExperienceStep {
  order: string;
  title: string;
  description: string;
}

export interface ProgramProduct {
  slug: ProgramSlug;
  /** 가격 · 기간 · 포함 항목의 단일 출처 */
  pkg: PricingPackage;

  hero: {
    eyebrow: string;
    headline: string;
    subCopy: string;
  };

  story?: {
    eyebrow: string;
    headline: string;
    subCopy: string;
    beats?: string[];
  };

  /** 주차별 구성. 원본이 승인된 상품에만 둔다. */
  curriculum?: {
    eyebrow: string;
    headline: string;
    subCopy: string;
    weeks: ProgramCurriculumWeek[];
    /** 여정 묶음 (STARTER) */
    groups?: readonly ProgramJourneyGroup[];
  };

  /** 주차별 구성이 없는 상품에서 그 이유를 사실대로 말하는 단락 */
  curriculumNote?: {
    eyebrow: string;
    headline: string;
    body: string[];
  };

  /** 수업 한 회차 골격 (DEC-023) */
  featuredLesson?: ProgramFeaturedLesson;

  nuriAreas?: { area: string; emphasis: "primary" | "secondary" }[];

  contentAreas?: ProgramContentArea[];

  experience: ProgramExperienceStep[];
  recommendations: string[];
  theme: ProgramTheme;

  seo: {
    title: string;
    description: string;
  };
}

const THEMES: Record<ProgramSlug, ProgramTheme> = {
  starter: {
    rule: "bg-trust-blue/60",
    accentText: "text-trust-blue",
    badge: "bg-trust-blue/10 text-trust-blue",
    markerBorder: "border-l-trust-blue/50",
    softSurface: "bg-white",
  },
  standard: {
    rule: "bg-accent",
    accentText: "text-navy/70",
    badge: "bg-accent-soft text-accent-strong",
    markerBorder: "border-l-accent",
    softSurface: "bg-ivory",
  },
  premium: {
    rule: "bg-accent",
    accentText: "text-navy",
    badge: "bg-navy text-accent-on-dark",
    markerBorder: "border-l-navy",
    softSurface: "bg-surface-soft",
  },
};

/**
 * 수업에서 기록까지.
 *
 * 세 상품이 같은 흐름을 쓴다. 지금 구현되어 있는 범위 안에서만 쓴다 —
 * 교사가 관찰을 남기고, 그것이 주간 리포트로 이어지는 흐름까지가 사실이다.
 * EBOOK · VOD · 음원은 수업 자료로 제공된다 (플랫폼 안 재생은 준비 중).
 */
const EXPERIENCE: ProgramExperienceStep[] = [
  {
    order: "01",
    title: "만나기",
    description: "그림책과 영상 자료로 그 주의 이야기를 함께 만납니다.",
  },
  {
    order: "02",
    title: "움직이기",
    description: "활동 음원에 맞춰 몸으로 먼저 이야기를 겪어 봅니다.",
  },
  {
    order: "03",
    title: "표현하기",
    description: "미술·창작 활동과 워크북으로 아이가 자기 방식대로 표현합니다.",
  },
  {
    order: "04",
    title: "기록하기",
    description: "교사가 수업 중 관찰한 모습을 플랫폼에 남깁니다.",
  },
  {
    order: "05",
    title: "주간 리포트",
    description: "쌓인 관찰을 교사가 검토해 주간 성장 리포트로 정리합니다. (출시 준비 중)",
  },
];

/**
 * 기록이 학부모에게 닿기까지.
 *
 * ★ AI 기록 보조는 아직 열려 있지 않다 (AR-8). 보조 기능이 있는 것처럼 쓰지 않는다.
 */
export const GROWTH_FLOW = {
  eyebrow: "GROWTH RECORD",
  headline: "수업이 그대로\n성장 기록이 됩니다.",
  philosophy: "결과보다 과정을 기록합니다.",
  steps: [
    "수업",
    "교사 관찰",
    "관찰 기록",
    "교사 검토",
    "주간 성장 리포트 (출시 준비 중)",
  ],
  aiNote:
    "기록은 교사가 직접 남기고 검토합니다. AI 기록 정리 보조와 학부모 포털은 준비 중입니다.",
} as const;

function pkgOf(slug: ProgramSlug): PricingPackage {
  const found = pricingPackages.find((p) => p.id === slug);
  if (!found) {
    throw new Error(`pricingPackages에 "${slug}" 상품이 없습니다.`);
  }
  return found;
}

/**
 * 한 회차의 흐름 (STARTER 표준화 규격 v1.0 §2 의 6단계 순서).
 * ★ 공개 화면에는 순서만 쓴다 — 분 값은 이전 DEC-023 배분(워크북 제외)이라 2026-10-09 표준(워크북 포함)과 맞지 않는다.
 */
const CLASS_BLOCKS: ProgramLessonBlock[] = [
  { code: "OPEN", label: "도입", minutes: 5 },
  { code: "STORY", label: "그림책", minutes: 8 },
  { code: "PROMISE", label: "활동 약속", minutes: 2 },
  { code: "CORE PLAY", label: "핵심활동", minutes: 20 },
  { code: "ART", label: "미술·창작", minutes: 10 },
  { code: "CLOSING", label: "마무리", minutes: 5 },
];

/**
 * STARTER 8주 — 목록 카드용 사본.
 * 출처: content/starter/2026.1/manifest.json weeks[] (title · theme · growth_keyword ·
 * core_message · cross_week). 결과물(takeHome)은 art_activity 의 결과물 이름이다.
 * page.tsx 가 빌드 시점에 STARTER_WEEKS 와 대조한다.
 */
const STARTER_WEEK_COPY: ProgramCurriculumWeek[] = [
  {
    week: 1,
    topic: "유치원 가는 날",
    growthPoint: "시작",
    growthKeyword: "시작",
    storyTitle: "유치원 가는 날",
    coreMessage: "새로운 공간을 친구들과 탐색하며 편안함과 소속감을 만들어가요.",
    takeHome: { title: "나만의 이름표" },
  },
  {
    week: 2,
    topic: "끝까지 해보자",
    growthPoint: "끈기",
    growthKeyword: "끈기",
    storyTitle: "끝까지 해보자",
    coreMessage: "포기하지 않으면 할 수 있어!",
    takeHome: { title: "용기 메달" },
  },
  {
    week: 3,
    topic: "마음을 말해줘",
    growthPoint: "표현",
    growthKeyword: "표현",
    storyTitle: "마음을 말해줘",
    coreMessage: "내 마음을 표현하면 친구와 서로를 더 잘 이해할 수 있어!",
    takeHome: { title: "마음을 전하는 팔찌" },
  },
  {
    week: 4,
    topic: "씨앗과 새싹",
    growthPoint: "시작",
    growthKeyword: "시작",
    storyTitle: "소예의 씨앗",
    coreMessage: "작은 씨앗도 정성과 기다림으로 자라나요!",
    feedsForest: true,
    takeHome: { title: "씨앗 소리 마라카스" },
  },
  {
    week: 5,
    topic: "우리 모두 특별해",
    growthPoint: "자존감",
    growthKeyword: "자존감",
    storyTitle: "우린 모두 특별해",
    coreMessage:
      "꽃마다 모양이 다르듯 우리도 모두 특별해요. 나는 소중하고, 친구도 소중한 존재예요.",
    feedsForest: true,
    takeHome: { title: "나만의 꽃" },
  },
  {
    week: 6,
    topic: "우리들의 비밀기지",
    growthPoint: "협력",
    growthKeyword: "협력",
    storyTitle: "우리들의 비밀기지",
    coreMessage: "혼자 하기 어려운 일도 친구와 힘을 합치면 함께 해낼 수 있어요.",
    feedsForest: true,
    takeHome: { title: "우리들의 비밀기지", summary: "대형 공동 제작" },
  },
  {
    week: 7,
    topic: "나비·벌",
    growthPoint: "기다림",
    growthKeyword: "기다림",
    storyTitle: "나비야 놀자!",
    coreMessage: "기다리면 좋은 순간을 만날 수 있어요.",
    feedsForest: true,
    takeHome: { title: "데칼코마니 나비" },
  },
  {
    week: 8,
    topic: "숲",
    growthPoint: "공동체",
    growthKeyword: "공동체",
    storyTitle: "모이면 숲이 되는 우리",
    coreMessage: "하나씩 모이면 우리 모두의 멋진 숲이 돼요.",
    takeHome: { title: "대형 숲 현수막", summary: "공동작품" },
    finale: true,
  },
];

/** STARTER_JOURNEY_GROUPS 사본 (src/lib/content/starter-journey.ts). 묶음 이름은 SC-3. */
const STARTER_GROUP_COPY: readonly ProgramJourneyGroup[] = [
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
];

export const PROGRAM_PRODUCTS: Record<ProgramSlug, ProgramProduct> = {
  /* ═════════════════════════════════════════════════════ STARTER */
  starter: {
    slug: "starter",
    pkg: pkgOf("starter"),
    theme: THEMES.starter,

    hero: {
      eyebrow: "STARTER · 8주 프로그램",
      headline: "여덟 번의 수업으로\n한 아이의 이야기가 남습니다.",
      subCopy:
        "예술·놀이 수업을 처음 도입하는 기관을 위한 8주 구성입니다. 한 반부터 시작해 수업과 기록이 어떻게 이어지는지 직접 확인할 수 있습니다.",
    },

    story: {
      eyebrow: "STORY",
      headline: "씨앗에서 숲까지",
      subCopy:
        "씨앗처럼 시작하고 숲처럼 함께 자라는 우리. 몸으로 놀고, 손으로 만들고, 마음으로 자라는 8주 성장 여정입니다.",
    },

    curriculum: {
      eyebrow: "8 WEEKS JOURNEY",
      headline: "8주 여정",
      subCopy:
        "마음을 열고, 자라나고, 하나의 숲으로 모입니다. 주차를 열면 그 주의 목표와 활동을 볼 수 있습니다.",
      weeks: STARTER_WEEK_COPY,
      groups: STARTER_GROUP_COPY,
    },

    featuredLesson: {
      week: 1,
      storyTitle: "유치원 가는 날",
      blocks: CLASS_BLOCKS,
      coreExperiences: [],
      notes: [
        "수업 시간은 CORE 50분(워크북 포함) + 선택 연계활동 10~15분입니다.",
        "단계별 시간 배분은 회차마다 다르며 교사용 수업가이드에 회차별로 안내합니다.",
        "기관 일정에 따라 두 번으로 나누어 운영할 수 있습니다.",
      ],
    },

    nuriAreas: [
      { area: "사회관계", emphasis: "primary" },
      { area: "의사소통", emphasis: "primary" },
      { area: "예술경험", emphasis: "primary" },
      { area: "자연탐구", emphasis: "secondary" },
      { area: "신체운동·건강", emphasis: "secondary" },
    ],

    contentAreas: [
      { code: "E-BOOK", label: "마음동화 · EBOOK", detail: "주차별 1권 · 수업 자료로 제공" },
      { code: "MUSIC & MOVEMENT", label: "활동 음원 · 뮤직비디오", detail: "주차별 제공 · 수업 자료" },
      { code: "WORKBOOK", label: "워크북", detail: "주차별 · CORE 50분 수업 안에서" },
      { code: "ART", label: "미술·창작", detail: "매 회차 수업 안에서" },
      { code: "PLAY KIT", label: "창의활동 키트", detail: "2회 · 계약 범위에 따라 제공" },
      { code: "HOME CONNECTION", label: "가정연계", detail: "주차마다 가정에서 이어 하는 활동 1가지" },
    ],

    experience: EXPERIENCE,

    recommendations: [
      "예술·놀이 수업을 처음 도입하는 기관",
      "한 반부터 작게 시작해 보려는 기관",
      "8주 동안 운영 방식을 먼저 확인하고 싶은 기관",
    ],

    seo: {
      title: "STARTER 8주 프로그램 | TeachAble Art Play",
      description:
        "TeachAble Art Play STARTER 스타터 밸런스 팩. 8주 · 주 1회 CORE 50분(워크북 포함) + 선택 연계활동 10~15분 · 1개 반 15명 기준, 월 99,000원. 「씨앗에서 숲까지」 8주 여정 — 마음동화 EBOOK 8권, 뮤직비디오 8편, 주차별 활동 음원, 워크북 8권, 교사용 수업가이드, 주간 성장 리포트(출시 준비 중). 창의활동 키트 2회는 계약 범위에 따라 제공됩니다.",
    },
  },

  /* ════════════════════════════════════════════════════ STANDARD */
  standard: {
    slug: "standard",
    pkg: pkgOf("standard"),
    theme: THEMES.standard,

    hero: {
      eyebrow: "STANDARD · 16주 프로그램",
      headline: "한 학기를 하나의\n성장 기록으로 남깁니다.",
      subCopy:
        "한 학기 단위로 운영하는 16주 구성입니다. 교사 관찰 기록과 원장 대시보드를 함께 씁니다. 주간 리포트는 출시 준비 중이고, 월간 요약과 학기 포트폴리오도 준비 중입니다.",
    },

    // 9~16주 콘텐츠 미승인 (BC-1). 주차 목록을 만들어 넣지 않는다.
    curriculum: undefined,
    curriculumNote: {
      eyebrow: "CURRICULUM",
      headline: "16주 구성",
      body: [
        "9~16주 콘텐츠는 준비 중이며, 주차별 구성은 도입 상담 시 안내드립니다.",
      ],
    },


    experience: EXPERIENCE,

    recommendations: [
      "한 학기 단위로 수업을 운영하는 기관",
      "반을 정기 편성해 주 1회 수업을 이어 가려는 기관",
      "원장이 반별 운영 현황을 함께 확인하고 싶은 기관",
    ],

    seo: {
      title: "STANDARD 16주 프로그램 | TeachAble Art Play",
      description:
        "TeachAble Art Play STANDARD 플레이 팩. 16주 · 주 1회 CORE 50분(워크북 포함) + 선택 연계활동 10~15분 · 1개 반 15명 기준, 월 150,000원. 교사 관찰 기록, 원장 대시보드 포함, 주간 성장 리포트 출시 준비 중. 9~16주 콘텐츠 · 월간 요약 · 학기 포트폴리오는 준비 중이며 주차별 구성은 상담 시 안내합니다.",
    },
  },

  /* ═════════════════════════════════════════════════════ PREMIUM */
  premium: {
    slug: "premium",
    pkg: pkgOf("premium"),
    theme: THEMES.premium,

    hero: {
      eyebrow: "PREMIUM · 24주 프로그램",
      headline: "24주의 수업이\n원의 교육 자산이 됩니다.",
      subCopy:
        "24주 동안 수업과 기록을 함께 운영하는 구성입니다. STANDARD 기록 · 대시보드 구성에 도입원 현판 · 상담자료 팩 같은 원 맞춤 납품물이 더해집니다.",
    },

    // 17~24주 DRAFT (BC-2), 9~16주 미승인 (BC-1). 주차 목록을 만들어 넣지 않는다.
    curriculum: undefined,
    curriculumNote: {
      eyebrow: "CURRICULUM",
      headline: "24주 구성",
      body: [
        "9~24주 콘텐츠는 준비 중이며, 주차별 구성은 도입 상담 시 안내드립니다.",
        "원 브랜딩 범위는 상담에서 정합니다.",
      ],
    },


    experience: EXPERIENCE,

    recommendations: [
      "24주 이상 길게 예술·놀이 수업을 운영하려는 기관",
      "여러 반의 수업 기록을 한곳에서 보려는 기관",
      "도입원 현판 · 상담자료 팩까지 함께 준비하려는 기관",
    ],

    seo: {
      title: "PREMIUM 24주 프로그램 | TeachAble Art Play",
      description:
        "TeachAble Art Play PREMIUM 스마트 아트 & 플레이. 24주 · 주 1회 CORE 50분(워크북 포함) + 선택 연계활동 10~15분 · 1개 반 15명 기준, 월 250,000원. STANDARD 기록 · 대시보드 구성, 창의활동 키트 6회 · 도입원 현판 · 상담자료 팩(계약 범위). 9~24주 콘텐츠는 준비 중이며 주차별 구성은 상담 시 안내합니다.",
    },
  },
};

/** 상품 상세 경로. 카드 · 오버레이 · 직접 주소가 모두 이 함수를 쓴다. */
export function programPath(slug: ProgramSlug): string {
  return `/programs/${slug}`;
}

/** 상품별 상담 CTA 문구. 결제가 아니라 상담이라는 것을 문구로 분명히 한다. */
export function consultLabel(product: ProgramProduct): string {
  return `${product.pkg.durationWeeks}주 프로그램 도입 상담`;
}

/** 홈페이지 가격 카드의 상세 보기 문구. */
export function detailLinkLabel(pkg: PricingPackage): string {
  return `${pkg.durationWeeks}주 프로그램 자세히 보기`;
}
