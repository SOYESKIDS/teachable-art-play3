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
 * 주차 안의 활동 한 갈래.
 *
 * title 은 활동 이름, summary 는 그 활동에서 아이가 무엇을 하는지 한두 줄,
 * items 는 워크북처럼 여러 장으로 나뉜 경우의 대표 활동명이다.
 * 교사용 자료의 문장을 그대로 옮기지 않고 공개용으로 짧게 다시 쓴다.
 */
export interface ProgramWeekActivity {
  title: string;
  summary?: string;
  items?: string[];
}

/**
 * 한 주차.
 *
 * ★ week · topic · growthPoint 만 모든 주차가 갖는다.
 *   나머지는 확정된 주차에만 있다. 지금 상세가 있는 것은 1~6주차이고,
 *   7~8주차는 별도로 준비 중이라 주제·스토리·핵심 메시지까지만 있다.
 *   화면은 있는 것만 그리고, 없는 자리를 지어내지 않는다.
 *
 * ★ 교사용 자료를 통째로 담지 않는다.
 *   교사 발문 · 교사 역할 · 아이 반응별 대응 · 난이도 조절 · 개별 지원 ·
 *   준비물 · 공간 세팅 · 안전 지침 · 관찰지표 · 기록 예문은 여기에 없다.
 *   그것들은 도입한 기관의 교사에게 가는 자료이지 공개 상품 소개가 아니다.
 *   여기 있는 것은 학부모와 원장이 보아도 되는 범위, 즉 "무엇을 하는가"까지다.
 *
 * ★ 교사용 가이드의 운영시간을 상품 시간으로 올리지 않는다.
 *   가이드에는 55~65분처럼 현장에서 늘려 쓰는 시간이 적혀 있지만,
 *   공개 상품 정보는 확정값(주 1회 40~50분)을 그대로 유지한다.
 */
export interface ProgramCurriculumWeek {
  week: number;
  /** 그 주의 주제어 */
  topic: string;
  /** 그 주에 자라는 지점 (8주 성장 로드맵) */
  growthPoint: string;
  /** 교사용 가이드가 정한 그 주의 성장키워드 */
  growthKeyword?: string;

  /** 그 주의 그림책 제목 */
  storyTitle?: string;
  /** 그 주가 아이에게 남기려는 한 문장 */
  coreMessage?: string;

  /** "이번 주에는 이런 경험을 합니다" 한두 문장 */
  experienceSummary?: string;
  /** 경험이 이어지는 순서 */
  experienceFlow?: string[];
  /** 낱개로 꼽는 핵심 경험 (대표 수업 단락에서도 쓴다) */
  coreExperiences?: string[];

  /** 몸으로 놀기 */
  movement?: ProgramWeekActivity;
  /** 워크북 */
  workbook?: ProgramWeekActivity;
  /** 미술·창작 활동 */
  creative?: ProgramWeekActivity;
  /** 완성 작품 */
  takeHome?: ProgramWeekActivity;
  /** 가정연계 */
  homeConnection?: ProgramWeekActivity;

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
        ★ 1~6주차는 교사용 수업가이드가 최신 확정본이다.
          그 이전 전체 구성표와 다른 곳은 가이드를 따랐다.
          (4주차 씨앗 헬리콥터 → 씨앗 소리 마라카스,
           5주차 과일꼬치 → 나만의 꽃, 6주차 바람 친구 → 우리들의 비밀기지 등)

        ★ 7~8주차는 별도로 준비 중이다.
          주제 · 그림책 · 핵심 메시지 · 활동명까지 이전 구성표의 값을 그대로 두고,
          이번에 아무것도 새로 만들지 않았다.

        ★ 상품 정보와 충돌시키지 않는다.
          가이드에는 55~65분 같은 현장 운영시간이 적혀 있지만,
          공개 상품의 운영시간은 확정값(주 1회 40~50분)을 그대로 둔다.
      */
      weeks: [
        {
          week: 1,
          topic: "시작",
          growthPoint: "적응",
          growthKeyword: "시작",
          storyTitle: "유치원 가는 날",
          coreMessage: "새로운 공간을 친구들과 탐색하며 편안함과 소속감을 만들어가요.",
          experienceSummary:
            "처음 만나는 유치원을 자기 속도로 둘러보며 내 이름과 내 자리를 발견하는 한 주입니다.",
          experienceFlow: [
            "새로운 환경 탐색",
            "내 이름과 자리 발견",
            "친구와 교사를 만나며 소속감 형성",
          ],
          coreExperiences: ["새로운 환경 적응", "자기표현", "관계형성"],
          movement: {
            title: "유치원 탐험",
            summary:
              "교실과 유치원의 여러 공간을 직접 둘러보며 내 자리와 좋아하는 공간을 발견합니다.",
          },
          workbook: {
            title: "탐험한 공간 다시 떠올리기",
            items: [
              "같은 그림 찾기",
              "길 찾기",
              "내 물건 찾기",
              "내 마음 색칠하기",
            ],
          },
          creative: {
            title: "나만의 이름표 만들기",
            summary:
              "내 이름을 찾아보고 좋아하는 색과 장식으로 꾸며 내 자리에 붙여봅니다.",
          },
          takeHome: { title: "이름표" },
          homeConnection: {
            title: "입학 기념 액자 만들기",
            summary: "첫 등원 날의 사진을 가족과 함께 액자에 담아 꾸밉니다.",
          },
        },
        {
          week: 2,
          topic: "끈기",
          growthPoint: "도전",
          growthKeyword: "끈기",
          storyTitle: "끝까지 해보자",
          coreMessage: "포기하지 않으면 할 수 있어!",
          experienceSummary:
            "잘 되지 않는 순간을 만나고, 방법을 바꿔 다시 해보며 작은 변화를 스스로 발견합니다.",
          experienceFlow: ["잘 안 됨", "다시 시도", "방법 바꾸기", "작은 변화 발견"],
          movement: {
            title: "마루의 도전 미션",
            summary:
              "젓가락·집게 등 다양한 방법을 사용해 목표물을 옮겨보며 다시 시도하는 경험을 합니다.",
            items: ["젓가락으로 옮기기", "집게로 옮기기", "함께 도전하기"],
          },
          workbook: {
            title: "다른 길도 찾아보기",
            items: ["미로 찾기", "선 따라 그리기", "다른 그림 찾기", "마루 꾸미기"],
          },
          creative: {
            title: "끝까지 해본 용기 메달",
            summary:
              "결과에 대한 상이 아니라, 오늘 다시 시도한 경험을 기억하는 작품입니다.",
          },
          takeHome: { title: "용기 메달" },
          homeConnection: {
            title: "우리 가족 도전 미션",
            summary: "가정에서 해볼 작은 도전을 하나 정하고 시도한 날을 함께 기록합니다.",
          },
        },
        {
          week: 3,
          topic: "표현",
          growthPoint: "친구",
          growthKeyword: "표현",
          storyTitle: "마음을 말해줘",
          coreMessage: "내 마음을 표현하면 친구와 서로를 더 잘 이해할 수 있어!",
          experienceSummary:
            "여러 가지 마음을 알아차리고 말과 표정으로 전해보며, 친구의 마음도 함께 들어봅니다.",
          experienceFlow: [
            "마음 알아차리기",
            "말·표정으로 표현",
            "친구의 마음 듣기",
            "따뜻한 마음 전하기",
          ],
          movement: {
            title: "마음배달",
            summary:
              "마음다리를 건너 친구에게 다가가 고마움·미안함·같이 놀고 싶은 마음을 자기 방식으로 표현해봅니다.",
          },
          workbook: {
            title: "친구의 마음을 찾아주세요",
            items: ["표정 살펴보기", "표정과 상황 연결하기", "해결방법 생각하기"],
          },
          creative: {
            title: "마음을 전하는 팔찌 만들기",
            summary:
              "전하고 싶은 마음을 떠올려 팔찌를 만들고, 건네면서 그 말을 직접 전합니다.",
          },
          takeHome: { title: "마음을 전하는 팔찌" },
          homeConnection: {
            title: "우리 가족 마음배달 우체통",
            summary: "가족에게 전하고 싶은 마음을 카드에 담아 우체통에 넣고 함께 읽습니다.",
          },
        },
        {
          week: 4,
          topic: "씨앗과 새싹",
          growthPoint: "시작",
          growthKeyword: "시작",
          storyTitle: "소예의 씨앗",
          coreMessage: "작은 씨앗도 정성과 기다림으로 자라나요!",
          experienceSummary:
            "서로 다른 씨앗을 눈과 손과 귀로 살펴보고, 씨앗이 내는 소리를 몸과 음악으로 표현합니다.",
          experienceFlow: [
            "씨앗 만나기",
            "오감 탐색",
            "성장 변화 발견",
            "소리·움직임으로 표현",
          ],
          movement: {
            title: "씨앗 탐험 & 씨앗 마라카스 연주회",
            summary:
              "서로 다른 씨앗의 크기·모양·색·소리를 살펴보고, 씨앗이 만드는 소리를 몸과 음악으로 경험합니다.",
          },
          workbook: {
            title: "씨앗에서 새싹까지",
            items: [
              "씨앗 관찰하기",
              "성장 순서 맞추기",
              "새싹 그리기",
              "자라는 데 필요한 것 찾기",
            ],
          },
          creative: {
            title: "씨앗 소리 마라카스 만들기",
            summary:
              "넣고 싶은 씨앗을 골라 소리를 비교해보고 나만의 소리 악기를 완성합니다.",
          },
          takeHome: { title: "씨앗 소리 마라카스" },
          homeConnection: {
            title: "우리 가족 씨앗 성장 이야기",
            summary:
              "가족이 고른 '시작의 사진'과 지금의 사진을 나란히 두고 그동안의 변화를 이야기합니다.",
          },
        },
        {
          week: 5,
          topic: "꽃과 열매",
          growthPoint: "자존감",
          growthKeyword: "자존감",
          storyTitle: "우린 모두 특별해",
          coreMessage:
            "꽃마다 모양이 다르듯 우리도 모두 특별해요. 나도 소중하고 친구도 소중해요.",
          experienceSummary:
            "서로 다른 꽃을 살펴보며 나의 모습과 좋아하는 것을 찾아보고, 친구의 다른 점도 함께 바라봅니다.",
          experienceFlow: [
            "다른 꽃 발견",
            "다양한 꽃 움직임",
            "나의 모습과 장점 발견",
            "친구의 특별함 존중",
          ],
          movement: {
            title: "동글게 동글게 꽃놀이",
            summary:
              "여러 색과 모양의 꽃을 보고 음악과 몸으로 서로 다른 표현을 즐기는 활동입니다.",
          },
          workbook: {
            title: "나를 닮은 꽃 찾기",
            items: [
              "같은 꽃 찾기",
              "다른 꽃 찾기",
              "꽃잎 색칠하기",
              "나를 닮은 꽃 꾸미기",
            ],
          },
          creative: {
            title: "나만의 꽃 만들기",
            summary:
              "원하는 색과 재료를 스스로 골라 나를 닮은 꽃을 완성하고 우리 반 꽃밭에 함께 둡니다.",
          },
          takeHome: { title: "나만의 꽃" },
          homeConnection: {
            title: "우리 가족 꽃 이야기",
            summary:
              "가족과 함께 꽃을 꾸미며 서로의 좋은 점을 한 가지씩 이야기합니다.",
          },
        },
        {
          week: 6,
          topic: "비·바람·햇살",
          growthPoint: "협력",
          growthKeyword: "협력",
          storyTitle: "우리들의 비밀기지",
          coreMessage: "혼자 하기 어려운 일도 친구와 힘을 합치면 함께 해낼 수 있어요.",
          experienceSummary:
            "비와 햇살을 몸으로 주고받은 뒤, 각자 만든 장식을 모아 우리 반의 공간 하나를 함께 완성합니다.",
          experienceFlow: [
            "자연현상 표현",
            "친구에게 다가가기",
            "도움 주고받기",
            "역할 나누기",
            "하나의 공동 공간 완성",
          ],
          movement: {
            title: "톡톡 비가 와요! 따뜻한 햇살이 와요!",
            summary:
              "비와 햇살의 움직임을 몸으로 표현하며 친구와 움직임을 주고받는 협력 놀이입니다.",
          },
          workbook: {
            title: "날씨 표현 워크북",
            items: [
              "같은 날씨 찾기",
              "무엇이 필요한지 연결하기",
              "비·바람·햇살 선으로 표현하기",
              "함께 완성한 비밀기지",
            ],
          },
          creative: {
            title: "우리들의 비밀기지 만들기",
            summary:
              "각자가 만든 장식과 아이디어를 하나씩 모아 우리 반의 공동 공간을 완성하는 협동 창작활동입니다.",
          },
          takeHome: { title: "우리 반 비밀기지", summary: "함께 만든 공동 작품" },
          homeConnection: {
            title: "나와 함께 자라는 우리 가족",
            summary:
              "가족사진으로 도안을 꾸미며 아이가 가족과 함께 자라고 있음을 이야기합니다.",
          },
        },
        {
          /* 7~8주차는 별도 준비 중이다. 이전 구성표의 확정 값만 그대로 둔다. */
          week: 7,
          topic: "나비·별",
          growthPoint: "기다림",
          storyTitle: "서두르지 않아도 돼",
          coreMessage: "기다림은 좋은 결과를 가져와",
          movement: { title: "나비 놀이 · 벌 놀이" },
          workbook: { title: "나비 꾸미기" },
          creative: { title: "데칼코마니 나비" },
          takeHome: { title: "데칼코마니 나비" },
        },
        {
          week: 8,
          topic: "숲",
          growthPoint: "공동체",
          storyTitle: "모이면 숲이 되는 우리",
          coreMessage: "우리 모두가 있어서 멋진 우리반",
          movement: { title: "협동 놀이" },
          workbook: { title: "나무 꾸미기" },
          creative: { title: "우리들의 숲 공동작품" },
          takeHome: { title: "공동작품 액자" },
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
