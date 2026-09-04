import { pricingPackages } from "./packages";
import type { PricingPackage } from "@/types/content";

/**
 * 상품 상세 콘텐츠.
 *
 * ★ 가격 · 기간 · 콘텐츠 수량을 여기에 다시 적지 않는다.
 *   그 값들은 이미 data/packages.ts 의 pricingPackages 가 갖고 있고,
 *   홈페이지 가격 카드와 비교표가 그것을 쓴다. 상세 페이지가 같은 숫자를
 *   따로 적어 두면 언젠가 한쪽만 고쳐진다 — 그때 손님에게 잘못된 가격이
 *   보이는 쪽은 항상 덜 보는 화면이다.
 *   그래서 상세는 pkg 로 그 객체를 그대로 물고 간다.
 *
 * ★ 확정되지 않은 것은 만들지 않는다.
 *   STARTER 8주 주제는 확정본이 있어 그대로 싣는다.
 *   STANDARD 16주 · PREMIUM 24주의 주차별 커리큘럼은 아직 없다.
 *   그래서 curriculum 을 undefined 로 두고, 화면은 데이터가 있을 때만
 *   그 단락을 그린다. "준비 중입니다" 같은 빈 껍데기를 크게 띄우지 않는다 —
 *   없는 것을 없다고 말하는 가장 좋은 방법은 그 자리를 만들지 않는 것이다.
 *
 * ★ 진단 · 발달 보장 표현을 쓰지 않는다.
 *   이 서비스는 아이를 평가하지 않는다. 상품 소개에서도 마찬가지다.
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

/**
 * 한 주차.
 *
 * ★ week · topic · growthPoint 만 모든 주차가 갖는다.
 *   나머지는 확정된 주차에만 있다. 지금은 1주차뿐이다.
 *   화면은 있는 것만 그리고, 없는 자리를 지어내지 않는다.
 *
 * ★ movement · workbook · art 에 활동 내용을 적지 않는다.
 *   확정된 것은 그 블록이 몇 분짜리인가까지다. 그래서 값도 거기까지만 적는다.
 *   "나비처럼 날아보기" 같은 문장을 여기에 넣는 순간, 그것은 확인된 적 없는
 *   수업 내용이 상품 소개에 사실처럼 실리는 일이 된다.
 */
export interface ProgramCurriculumWeek {
  week: number;
  /** 그 주의 주제어 */
  topic: string;
  /** 그 주에 자라는 지점 */
  growthPoint: string;

  /** 그 주의 영상 스토리 제목 */
  storyTitle?: string;
  /** 그 주가 아이에게 남기려는 한 문장 */
  coreMessage?: string;
  coreExperiences?: string[];

  /** 몸으로 놀기 */
  movement?: string;
  /** 워크북 */
  workbook?: string;
  /** 미술활동 */
  art?: string;
  /** 완성작품 · 가정으로 가져가는 것 */
  takeHome?: string;

  /** 마지막 주차처럼 시각적으로 강조할 회차 */
  finale?: boolean;
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
}

/** 콘텐츠를 경험하는 갈래. 확정된 수량이 있는 것만 count 를 채운다. */
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
  /** 가격 · 기간 · 콘텐츠 수량의 단일 출처 */
  pkg: PricingPackage;

  hero: {
    eyebrow: string;
    headline: string;
    subCopy: string;
  };

  /** 프로그램이 그리는 흐름. 확정된 주제가 있을 때만 둔다. */
  story?: {
    eyebrow: string;
    headline: string;
    subCopy: string;
    /** 짧은 흐름 표시. 주차 목록이 따로 있는 상품에서는 생략한다. */
    beats?: string[];
  };

  /** 주차별 구성. 확정본이 있을 때만 둔다. 없으면 화면에 단락 자체가 없다. */
  curriculum?: {
    eyebrow: string;
    headline: string;
    subCopy: string;
    weeks: ProgramCurriculumWeek[];
  };

  /** 대표 수업 한 회차. 확정된 상품에만 있다. */
  featuredLesson?: ProgramFeaturedLesson;

  /** 누리과정 연계 영역. 사이트 전체가 쓰는 확정 값에서 가져온다. */
  nuriAreas?: { area: string; emphasis: "primary" | "secondary" }[];

  /** 콘텐츠 경험 영역 */
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
    rule: "bg-yellow",
    accentText: "text-navy/70",
    badge: "bg-yellow/20 text-navy",
    markerBorder: "border-l-yellow",
    softSurface: "bg-ivory",
  },
  premium: {
    rule: "bg-yellow",
    accentText: "text-navy",
    badge: "bg-navy text-yellow",
    markerBorder: "border-l-navy",
    softSurface: "bg-surface-soft",
  },
};

/**
 * 수업 한 회차가 흘러가는 방식.
 *
 * 세 상품이 같은 수업 구조를 쓰므로 한 곳에 둔다.
 * 각 단계의 설명은 실제로 화면에 있는 기능 범위 안에서만 쓴다 —
 * 교사가 관찰을 남기고, 그것이 성장 기록으로 이어지는 흐름까지가 사실이다.
 */
const EXPERIENCE: ProgramExperienceStep[] = [
  {
    order: "01",
    title: "만나기",
    description: "마음동화와 영상으로 그 주의 이야기를 함께 만납니다.",
  },
  {
    order: "02",
    title: "움직이기",
    description: "활동음원에 맞춰 몸으로 먼저 이야기를 겪어 봅니다.",
  },
  {
    order: "03",
    title: "표현하기",
    description: "워크북과 활동 키트로 아이가 자기 방식대로 표현합니다.",
  },
  {
    order: "04",
    title: "기록하기",
    description: "교사가 수업 중 관찰한 모습을 그 자리에서 남깁니다.",
  },
  {
    order: "05",
    title: "성장으로 연결하기",
    description: "쌓인 관찰이 성장 리포트가 되어 학부모에게 전해집니다.",
  },
];

/**
 * 기록이 학부모에게 닿기까지.
 *
 * ★ AI 문장을 여기서 넘기지 않는다.
 *   보조라고만 적고, 최종 책임이 교사에게 있다는 것을 함께 적는다.
 *   실제 구현도 그렇다 — 교사가 검토하고 작성 완료해야 학부모에게 나간다.
 */
export const GROWTH_FLOW = {
  eyebrow: "GROWTH RECORD",
  headline: "수업이 그대로\n성장 기록이 됩니다.",

  /**
   * ★ 이 철학이 이 기능의 설계 이유다.
   *   잘 그렸는가가 아니라 무엇을 하려 했는가를 남긴다.
   *   그래서 이 서비스에는 점수도 등급도 발달단계도 없다.
   */
  philosophy: "결과보다 과정을 기록합니다.",

  /**
   * 실제로 화면에 구현되어 돌아가는 다섯 단계다.
   * 교사가 수업 중 관찰을 남기고(observations), 그것이 성장 리포트가 되고
   * (growth reports), 원장이 만든 링크로 학부모에게 전달된다(parent share).
   */
  steps: [
    "수업",
    "교사 관찰",
    "관찰 기록",
    "성장 변화 정리",
    "학부모 성장 리포트",
  ],
  aiNote: "AI는 기록 정리를 보조하며 최종 내용은 교사가 검토합니다.",
} as const;

function pkgOf(slug: ProgramSlug): PricingPackage {
  const found = pricingPackages.find((p) => p.id === slug);
  if (!found) {
    // 데이터가 어긋난 채 배포되지 않도록 빌드 시점에 멈춘다.
    throw new Error(`pricingPackages에 "${slug}" 상품이 없습니다.`);
  }
  return found;
}

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

    /*
      실제 프로그램 문서(「씨앗에서 숲까지」)의 문구를 그대로 쓴다.
      주차의 나열은 아래 GROWTH JOURNEY 와 8주 아코디언이 맡으므로
      여기서 같은 목록을 한 번 더 늘어놓지 않는다.
    */
    story: {
      eyebrow: "STORY",
      headline: "씨앗에서 숲까지",
      subCopy:
        "씨앗처럼 시작하고 숲처럼 함께 자라는 우리. 몸으로 놀고, 손으로 만들고, 마음으로 자라는 8주 성장 여정입니다.",
    },

    curriculum: {
      eyebrow: "8 WEEKS",
      headline: "8주 구성",
      subCopy:
        "주 1회, 여덟 개의 주제가 순서대로 이어집니다. 주차를 눌러 그 주에 무엇을 하는지 볼 수 있습니다.",
      /*
        ★ 여덟 주 전부 확정 프로그램 문서에서 온 값이다.
          주제 · 영상 스토리 · 핵심 메시지 · 신체활동 · 워크북 · 미술활동 ·
          완성작품까지가 그 문서에 있는 범위이고, 여기에는 딱 그만큼만 담는다.

        ★ 교사용 자료는 담지 않는다.
          발문 · 교사 언어 · 개별 지원 지침 · 관찰지표 · 준비물 목록 ·
          안전 운영 방법은 도입한 기관의 교사에게 가는 자료이지
          공개 상품 소개가 아니다.
      */
      weeks: [
        {
          week: 1,
          topic: "시작",
          growthPoint: "적응",
          storyTitle: "유치원 가는 날",
          coreMessage: "유치원은 즐겁고 재밌는 곳",
          coreExperiences: ["새로운 환경 적응", "자기표현", "관계형성"],
          movement: "교실 탐험 · 친구 찾기",
          workbook: "자리 찾아주기 스티커",
          art: "나만의 이름표 만들기",
          takeHome: "이름표",
        },
        {
          week: 2,
          topic: "끈기",
          growthPoint: "도전",
          storyTitle: "끝까지 해보자",
          coreMessage: "포기하지 않으면 할 수 있어",
          movement: "간식 따서먹기",
          workbook: "미로찾기 · 점선 따라 그림 완성",
          art: "성공 메달 만들기",
          takeHome: "메달",
        },
        {
          week: 3,
          topic: "표현",
          growthPoint: "친구",
          storyTitle: "마음을 말해줘",
          coreMessage: "마음을 말로 표현하면 더 행복해져",
          movement: "짝꿍 협동게임",
          workbook: "친구 표정 알아보기",
          art: "우리반 우정 팔찌",
          takeHome: "우정 팔찌",
        },
        {
          week: 4,
          topic: "씨앗과 새싹",
          growthPoint: "시작",
          storyTitle: "고민고민하지마",
          coreMessage: "좋은 일은 고민하지 말고 시작!",
          movement: "씨앗 굴리기 · 새싹 놀이",
          workbook: "씨앗 색칠하고 꾸미기",
          art: "씨앗 헬리콥터 만들기",
          takeHome: "씨앗 헬리콥터",
        },
        {
          week: 5,
          topic: "꽃과 열매",
          growthPoint: "자존감",
          storyTitle: "우린 모두 특별해",
          coreMessage: "내게도 특별함이 있어",
          movement: "꽃 놀이",
          workbook: "꽃 패턴 찾기",
          art: "나만의 과일꼬치 만들기",
          takeHome: "과일 꼬치",
        },
        {
          week: 6,
          topic: "비·바람·햇살",
          growthPoint: "협력",
          storyTitle: "혼자는 어려워",
          coreMessage: "친구들은 나를 더 멋지게 해줘",
          movement: "비놀이 · 햇살놀이 · 바람놀이",
          workbook: "날아다니는 것 꾸미기",
          art: "빙글빙글 바람 친구 만들기",
          takeHome: "빙글빙글 바람 친구",
        },
        {
          week: 7,
          topic: "나비·별",
          growthPoint: "기다림",
          storyTitle: "서두르지 않아도 돼",
          coreMessage: "기다림은 좋은 결과를 가져와",
          movement: "나비 놀이 · 벌 놀이",
          workbook: "나비 꾸미기",
          art: "데칼코마니 나비",
          takeHome: "데칼코마니 나비",
        },
        {
          week: 8,
          topic: "숲",
          growthPoint: "공동체",
          storyTitle: "모이면 숲이 되는 우리",
          coreMessage: "우리 모두가 있어서 멋진 우리반",
          movement: "협동 놀이",
          workbook: "나무 꾸미기",
          art: "우리들의 숲 공동작품",
          takeHome: "공동작품 액자",
          finale: true,
        },
      ],
    },

    /*
      1주차 대표 수업.
      여섯 블록의 합이 50분으로, 상품의 운영 시간(주 1회 40~50분)과 맞는다.
      블록 이름과 분 배분까지가 확정된 정보이고, 그 안에서 무엇을 하는지는
      여기에 적지 않는다 — 교사 발문 · 관찰지표 · 준비 지침은 공개 대상이 아니다.
    */
    featuredLesson: {
      week: 1,
      storyTitle: "유치원 가는 날",
      blocks: [
        { code: "START", label: "시작", minutes: 5 },
        { code: "STORY", label: "이야기", minutes: 8 },
        { code: "MOVE & EXPLORE", label: "몸으로 놀기", minutes: 12 },
        { code: "WORKBOOK", label: "워크북", minutes: 8 },
        { code: "ART", label: "미술활동", minutes: 12 },
        { code: "CLOSING", label: "마무리", minutes: 5 },
      ],
      coreExperiences: ["새로운 환경 적응", "자기표현", "관계형성"],
    },

    // 사이트 전체가 쓰는 확정 값(site-copy 의 nuriCurriculum)과 같은 구분이다.
    nuriAreas: [
      { area: "사회관계", emphasis: "primary" },
      { area: "의사소통", emphasis: "primary" },
      { area: "예술경험", emphasis: "primary" },
      { area: "자연탐구", emphasis: "secondary" },
      { area: "신체운동·건강", emphasis: "secondary" },
    ],

    /*
      각 갈래의 설명은 이 상품에서 확정된 수량 그대로다.
      새 수량이나 새 구성품을 만들어 붙이지 않았다.
    */
    contentAreas: [
      { code: "E-BOOK", label: "마음동화 · 이북", detail: "8회" },
      { code: "MUSIC & MOVEMENT", label: "활동음원", detail: "24곡" },
      { code: "WORKBOOK", label: "워크북", detail: "8회" },
      { code: "ART", label: "미술활동", detail: "매 회차 수업 안에서" },
      { code: "PLAY KIT", label: "창의활동 키트", detail: "2회" },
      { code: "HOME CONNECTION", label: "가정연계", detail: "1주차 입학 기념 액자 만들기" },
    ],

    experience: EXPERIENCE,

    recommendations: [
      "예술·놀이 수업을 처음 도입하는 기관",
      "만 4~6세 한 반부터 시작해 보려는 기관",
      "8주 동안 운영 방식을 먼저 확인하고 싶은 기관",
    ],

    seo: {
      title: "STARTER 8주 프로그램 | TeachAble Art Play",
      description:
        "TeachAble Art Play STARTER 스타터 밸런스 팩. 8주 · 주 1회 40~50분 · 만 4~6세 · 1개 반 15명 기준, 월 99,000원. 마음동화와 EBOOK 8회, VOD 8회, 워크북 8회, 활동음원 24개, 창의활동 키트 2회, 교사용 가이드, 주간 미니 리포트를 제공합니다.",
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
        "한 학기 단위로 운영하는 16주 구성입니다. 월간 성장 리포트와 학기 성장 포트폴리오, 원장 대시보드가 함께 제공됩니다.",
    },

    // 16주 주차별 구성은 아직 확정되지 않았다. 만들어 넣지 않는다.
    curriculum: undefined,

    experience: EXPERIENCE,

    recommendations: [
      "한 학기 단위로 수업을 운영하는 기관",
      "만 4~7세 반을 정기 편성해 운영하는 기관",
      "월간·학기 단위로 학부모에게 기록을 전하고 싶은 기관",
    ],

    seo: {
      title: "STANDARD 16주 프로그램 | TeachAble Art Play",
      description:
        "TeachAble Art Play STANDARD 플레이 팩. 16주 · 주 1회 50분 · 만 4~7세 · 1개 반 15명 기준, 월 150,000원. 마음동화와 EBOOK 16회, VOD 16회, 워크북 16회, 활동음원 48개, 미술·창의키트 4회, 월간 성장 리포트, 학기 성장 포트폴리오, 대시보드를 제공합니다.",
    },
  },

  /* ═════════════════════════════════════════════════════ PREMIUM */
  premium: {
    slug: "premium",
    pkg: pkgOf("premium"),
    theme: THEMES.premium,

    hero: {
      eyebrow: "PREMIUM · 24주 프로그램",
      headline: "일 년의 수업이\n원의 교육 자산이 됩니다.",
      subCopy:
        "24주 동안 수업과 기록을 함께 운영하는 구성입니다. 교사 운영 플랫폼과 원장 대시보드, 주간·월간·학기 성장 리포트, 원 브랜딩 지원이 포함됩니다.",
    },

    // 24주 주차별 구성은 아직 확정되지 않았다. 만들어 넣지 않는다.
    curriculum: undefined,

    experience: EXPERIENCE,

    recommendations: [
      "연간 단위로 예술·놀이 수업을 운영하는 기관",
      "여러 반의 수업 기록을 한곳에서 관리하려는 기관",
      "성장 기록을 원의 교육 자산으로 남기려는 기관",
    ],

    seo: {
      title: "PREMIUM 24주 프로그램 | TeachAble Art Play",
      description:
        "TeachAble Art Play PREMIUM 스마트 아트 & 플레이. 24주 · 주 1회 50분 · 만 4~7세 · 1개 반 15명 기준, 월 250,000원. 마음동화와 EBOOK 24회, VOD 24회, 워크북 24회, 활동음원 72개, 프리미엄 활동키트 6회, 교사 운영 플랫폼, 주간·월간·학기 성장리포트, 원장 대시보드, 원 브랜딩 지원을 제공합니다.",
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
