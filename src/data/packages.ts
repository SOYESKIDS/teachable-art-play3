import type { ComparisonRow, PricingPackage } from "@/types/content";

/** 기획서 15번: 상품 패키지 (정규 상품 3종, 콘텐츠 수량은 확정된 값만 사용) */
export const pricingPackages: PricingPackage[] = [
  {
    id: "starter",
    name: "STARTER",
    subtitle: "스타터 밸런스 팩",
    label: "처음 도입하는 기관",
    tagline: "처음 경험하기",
    isBest: false,
    durationWeeks: 8,
    frequency: "주 1회 · 40~50분",
    recommendedAge: "만 4~6세",
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 99000,
    totalPriceKrw: 198000,
    totalPriceNote: "8주 총액",
    contentItems: [
      "마음동화 · EBOOK 8권",
      "VOD 8편",
      "활동 음원 24곡",
      "워크북 8권",
      "창의활동 키트 2회",
      "교사용 가이드",
      "주간 미니 리포트",
      "8주 요약",
    ],
    accentColor: "light-blue",
  },
  {
    id: "standard",
    name: "STANDARD",
    subtitle: "플레이 팩",
    label: "한 학기 운영 추천",
    tagline: "한 학기 기록 만들기",
    isBest: true,
    durationWeeks: 16,
    frequency: "주 1회 · 40~50분",
    recommendedAge: "만 4~7세",
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 150000,
    totalPriceKrw: 600000,
    totalPriceNote: "한 학기 총액",
    contentItems: [
      "마음동화 · EBOOK · VOD · 음원",
      "워크북 16권",
      "창의활동 키트 4회",
      "AI 성장기록 플랫폼 Full",
      "주간 · 월간 리포트",
      "학기 성장 포트폴리오",
      "원장 대시보드",
    ],
    accentColor: "ivory-yellow",
  },
  {
    id: "premium",
    name: "PREMIUM",
    subtitle: "스마트 아트 & 플레이",
    label: "성장기록 완성형",
    tagline: "우리 원의 시그니처",
    isBest: false,
    durationWeeks: 24,
    frequency: "주 1회 · 40~50분",
    recommendedAge: "만 4~7세",
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 250000,
    totalPriceKrw: 1500000,
    totalPriceNote: "24주 총액",
    contentItems: [
      "동화 · VOD · 음원 풀세트",
      "워크북 24권",
      "창의활동 키트 6회",
      "STANDARD 모든 구성 포함",
      "도입원 현판",
      "상담자료 팩",
    ],
    accentColor: "navy-yellow",
  },
];

/**
 * 가격 조건 — 상품소개서 v4에서 확정된 항목만 적는다.
 *
 * ★ 환불 · 자동갱신 · 결제주기 · 계약해지 조건은 아직 확정되지 않았다.
 *   확정되지 않은 정책을 홈페이지가 먼저 만들면 계약서와 어긋난다.
 *   여기에는 v4에 명시된 다섯 줄만 둔다.
 */
export const priceDisclaimerLines = [
  "표시 가격은 1개 반 · 15명 기준입니다.",
  "부가세 별도입니다.",
  "15명 초과 시 원아 1인당 월 6,600원부터 추가됩니다.",
  "3개 반 이상 도입 시 별도 상담으로 안내드립니다.",
  "창의활동 키트 배송비가 포함된 금액입니다.",
];

/** 기획서 10번: 상품 비교표 (6개 항목) */
export const comparisonRows: ComparisonRow[] = [
  { label: "운영기간", values: ["8주", "16주", "24주"] },
  {
    label: "콘텐츠",
    values: [
      "마음동화·VOD·워크북 각 8회",
      "마음동화·VOD·워크북 각 16회",
      "마음동화·VOD·워크북 각 24회",
    ],
  },
  { label: "창의키트", values: ["2회", "4회", "6회"] },
  {
    label: "성장리포트",
    values: ["주간 미니 리포트", "월간 · 학기 리포트", "주간 · 월간 · 학기 리포트"],
  },
  { label: "대시보드", values: ["－", "포함", "포함 · 원 브랜딩 지원"] },
  { label: "월 이용료", values: ["99,000원", "150,000원", "250,000원"] },
  { label: "총액", values: ["198,000원", "600,000원 / 학기", "1,500,000원"] },
];

/** 기획서 17번: 4주 Pilot — 정규 상품과 명확히 분리된 체험 상품 */
export const pilotOffer = {
  eyebrow: "BEFORE CONTRACT",
  headline: "정규 도입 전,\n우리 원에서 4주 먼저 경험해 보세요.",
  subCopy:
    "1~2개 반에서 담임교사가 직접 운영해 보고 결정하는 과정입니다. 4주 후 운영지표를 함께 확인합니다.",
  note: "4주 파일럿은 STARTER · STANDARD · PREMIUM과 동일한 정규 판매상품이 아닌, 도입 전 체험 프로그램입니다.",
  flow: ["4주 PILOT", "운영 리뷰", "정규 도입 결정", "STARTER · STANDARD · PREMIUM"],
};
