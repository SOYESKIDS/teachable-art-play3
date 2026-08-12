import type { ComparisonRow, PricingPackage } from "@/types/content";

/** 기획서 15번: 상품 패키지 (정규 상품 3종, 콘텐츠 수량은 확정된 값만 사용) */
export const pricingPackages: PricingPackage[] = [
  {
    id: "starter",
    name: "STARTER",
    subtitle: "스타터 밸런스 팩",
    label: "처음 도입하는 기관",
    isBest: false,
    durationWeeks: 8,
    frequency: "주 1회 · 40~50분",
    recommendedAge: "만 4~6세",
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 99000,
    contentItems: [
      "마음동화 + EBOOK 8",
      "VOD 8",
      "워크북 8",
      "활동음원 24",
      "창의활동 키트 2회",
      "교사용 가이드",
      "주간 미니 리포트",
    ],
    accentColor: "light-blue",
  },
  {
    id: "standard",
    name: "STANDARD",
    subtitle: "플레이 팩",
    label: "한 학기 운영 추천",
    isBest: true,
    durationWeeks: 16,
    frequency: "주 1회 · 50분",
    recommendedAge: "만 4~7세",
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 150000,
    contentItems: [
      "마음동화 + EBOOK 16",
      "VOD 16",
      "워크북 16",
      "활동음원 48",
      "미술·창의키트 4회",
      "월간 성장 리포트",
      "학기 성장 포트폴리오",
      "대시보드 포함",
    ],
    accentColor: "ivory-yellow",
  },
  {
    id: "premium",
    name: "PREMIUM",
    subtitle: "스마트 아트 & 플레이",
    label: "성장기록 완성형",
    isBest: false,
    durationWeeks: 24,
    frequency: "주 1회 · 50분",
    recommendedAge: "만 4~7세",
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 250000,
    contentItems: [
      "마음동화 + EBOOK 24",
      "VOD 24",
      "워크북 24",
      "활동음원 72",
      "프리미엄 활동키트 6회",
      "교사 운영 플랫폼",
      "주간 · 월간 · 학기 성장리포트",
      "원장 대시보드",
      "원 브랜딩 지원",
    ],
    accentColor: "navy-yellow",
  },
];

/** 기획서 8번: 가격 안내 문구 (VAT/환불/자동갱신 등 미확정 정책은 넣지 않음) */
export const priceDisclaimerLines = [
  "표시 가격은 1개 반 · 15명 기준입니다.",
  "기관 규모와 운영조건에 따라 세부 계약조건은 달라질 수 있습니다.",
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
];

/** 기획서 17번: 4주 Pilot — 정규 상품과 명확히 분리된 체험 상품 */
export const pilotOffer = {
  eyebrow: "BEFORE CONTRACT",
  headline: "정규 도입 전,\n우리 원에서 4주 먼저 경험해 보세요.",
  subCopy:
    "TeachAble Art Play의 수업 운영 방식과 성장기록 흐름을 부담 없이 먼저 확인할 수 있습니다.",
  note: "4주 파일럿은 STARTER · STANDARD · PREMIUM과 동일한 정규 판매상품이 아닌, 도입 전 체험 프로그램입니다.",
  flow: ["4주 PILOT", "운영 리뷰", "정규 도입 결정", "STARTER · STANDARD · PREMIUM"],
};
