import type {
  ComparisonRow,
  PackageFeature,
  PricingPackage,
} from "@/types/content";

/**
 * 상품 패키지 (정규 상품 3종).
 *
 * ★ 필드 순서는 원장이 결정하는 순서를 따른다 (B2B 결정 순서).
 *   어떤 원에 적합 (fit · label) → 무엇을 운영 (operation) → 기간 (durationWeeks ·
 *   frequency) → 포함 내용 (features → contentItems) → 비용 (monthly · total).
 *
 * ★ 포함 내용은 "지금 실제로 제공되는가"를 함께 적는다 (features[].availability).
 *   - 포함     : 만들어져 있고 상품에 들어 있다.
 *   - 준비 중  : 상품에 약속된 항목이지만 아직 만들어지지 않았다.
 *   - 계약 범위: 실물 · 맞춤 납품물 (키트 · 현판 · 상담자료 팩) — 계약 조건에 따라 제공.
 *   홈페이지 카드가 읽는 contentItems 는 features 에서 그대로 만든 문자열이라
 *   두 목록이 갈라질 수 없다.
 *
 * ★ EBOOK · VOD · 음원은 "수업 자료"로 제공된다. 플랫폼 안 재생은 P1 (준비 중).
 *
 * ─────────────────────────────────────────────── SOURCE CONFLICTS (유지 중)
 *  SC-1 가격: STARTER 월 99,000원 · 8주 198,000원은 코드에만 있고
 *       상품소개서 v4 에서 확인되지 않는다. 값은 바꾸지 않았다 — 운영자 확인 필요.
 *       (STANDARD 150,000 / 600,000 · PREMIUM 250,000 / 1,500,000 도 값 변경 없음.)
 *  SC-2 대상 연령: "만 4~6세 / 만 4~7세"는 근거 원본이 없다 (BC-4 · DB age_group NULL).
 *       → "상담 시 안내"로 바꿨다. 확정되면 recommendedAge 값만 고치면 된다.
 *  SC-3 창의활동 키트 횟수(2 · 4 · 6회): 계약 납품물로 보고 값을 유지했다.
 *       원본(주차별 kit 목록)과 횟수 대응은 확인되지 않았다.
 *  SC-4 STANDARD 9~16주(BC-1 미승인) · PREMIUM 17~24주(BC-2 DRAFT):
 *       콘텐츠 수량(16 · 24주 분)은 상품 약속으로 유지하되 "준비 중"으로 표시한다.
 *  SC-5 "8주 요약"(STARTER)의 근거 서식이 없다 — 월간 요약(P1) 미구현과 같이 "준비 중".
 *  SC-6 PREMIUM 원 브랜딩 범위 미정 (CO-8) → "범위 상담".
 *  SC-7 Pilot 가격 미정 (CO-3) — 가격을 적지 않는다.
 *  해소한 drift: STANDARD 리포트에 주간 포함 (DEC-057) · 운영 시간 50분 6단계 +
 *  워크북 별도 10분 (DEC-023) · PREMIUM 은 24주 (연간 아님) · 음원 곡 수(24/48/72) 삭제.
 */

/** features → 홈페이지 카드용 한 줄 문자열 */
function itemsOf(features: PackageFeature[]): string[] {
  return features.map((f) =>
    f.availability === "포함" ? f.label : `${f.label} (${f.note ?? f.availability})`,
  );
}

/** DEC-023: 50분 6단계 골격 + 워크북은 50분 밖 별도 10분 */
const CLASS_FREQUENCY = "주 1회 · 50분 (워크북 별도 10분)";

/** SC-2: 근거 원본이 없어 연령을 단정하지 않는다. */
const AGE_UNCONFIRMED = "상담 시 안내";

const STARTER_FEATURES: PackageFeature[] = [
  { label: "마음동화 그림책 · EBOOK 8권", availability: "포함" },
  { label: "뮤직비디오(VOD) 8편", availability: "포함" },
  { label: "주차별 활동 음원", availability: "포함" },
  { label: "워크북 8권", availability: "포함" },
  { label: "교사용 수업가이드 8주", availability: "포함" },
  { label: "교사 관찰 기록 플랫폼", availability: "포함" },
  { label: "주간 성장 리포트", availability: "준비 중", note: "개발 완료 · 출시 준비 중" },
  { label: "창의활동 키트 2회", availability: "계약 범위" },
  { label: "8주 요약", availability: "준비 중" },
];

const STANDARD_FEATURES: PackageFeature[] = [
  {
    label: "마음동화 · EBOOK · VOD · 음원 16주",
    availability: "준비 중",
    note: "주차별 구성은 상담 시 안내 · 9주 이후 콘텐츠 준비 중",
  },
  {
    label: "워크북 16권",
    availability: "준비 중",
    note: "9~16주 준비 중",
  },
  { label: "교사 관찰 기록 플랫폼", availability: "포함" },
  { label: "주간 성장 리포트", availability: "준비 중", note: "개발 완료 · 출시 준비 중" },
  { label: "원장 대시보드", availability: "포함" },
  { label: "월간 요약", availability: "준비 중" },
  { label: "학기 성장 포트폴리오", availability: "준비 중" },
  { label: "창의활동 키트 4회", availability: "계약 범위" },
];

const PREMIUM_FEATURES: PackageFeature[] = [
  {
    label: "마음동화 · EBOOK · VOD · 음원 24주",
    availability: "준비 중",
    note: "주차별 구성은 상담 시 안내 · 9주 이후 콘텐츠 준비 중",
  },
  {
    label: "워크북 24권",
    availability: "준비 중",
    note: "9~24주 준비 중",
  },
  { label: "STANDARD 기록 · 대시보드 구성", availability: "포함" },
  { label: "원 브랜딩", availability: "계약 범위", note: "범위 상담" },
  { label: "창의활동 키트 6회", availability: "계약 범위" },
  { label: "도입원 현판", availability: "계약 범위" },
  { label: "상담자료 팩", availability: "계약 범위" },
];

export const pricingPackages: PricingPackage[] = [
  {
    id: "starter",
    name: "STARTER",
    subtitle: "스타터 밸런스 팩",
    // 1) 어떤 원에 적합
    label: "처음 도입하는 기관",
    fit: "예술·놀이 수업을 처음 도입해 한 반부터 확인해 보려는 원",
    tagline: "처음 경험하기",
    isBest: false,
    // 2) 무엇을 운영
    operation: "8주 「씨앗에서 숲까지」 수업과 주간 기록",
    // 3) 기간
    durationWeeks: 8,
    frequency: CLASS_FREQUENCY,
    recommendedAge: AGE_UNCONFIRMED,
    // 4) 포함 내용
    features: STARTER_FEATURES,
    contentItems: itemsOf(STARTER_FEATURES),
    // 5) 비용 (SC-1: 값 변경 없음)
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 99000,
    totalPriceKrw: 198000,
    totalPriceNote: "8주 총액",
    accentColor: "light-blue",
  },
  {
    id: "standard",
    name: "STANDARD",
    subtitle: "플레이 팩",
    label: "한 학기 운영 추천",
    fit: "한 학기 단위로 수업을 편성하고 원장이 운영 현황을 함께 보려는 원",
    tagline: "한 학기 기록 만들기",
    isBest: true,
    operation: "16주 수업 · 주간 기록 · 원장 대시보드",
    durationWeeks: 16,
    frequency: CLASS_FREQUENCY,
    recommendedAge: AGE_UNCONFIRMED,
    features: STANDARD_FEATURES,
    contentItems: itemsOf(STANDARD_FEATURES),
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 150000,
    totalPriceKrw: 600000,
    totalPriceNote: "한 학기 총액",
    accentColor: "ivory-yellow",
  },
  {
    id: "premium",
    name: "PREMIUM",
    subtitle: "스마트 아트 & 플레이",
    label: "성장기록 완성형",
    fit: "24주 장기 운영과 원 맞춤 자료까지 함께 준비하려는 원",
    tagline: "우리 원의 시그니처",
    isBest: false,
    operation: "24주 수업 · STANDARD 구성 · 원 맞춤 납품물",
    durationWeeks: 24,
    frequency: CLASS_FREQUENCY,
    recommendedAge: AGE_UNCONFIRMED,
    features: PREMIUM_FEATURES,
    contentItems: itemsOf(PREMIUM_FEATURES),
    priceUnitNote: "1개 반 · 15명 기준",
    monthlyPriceKrw: 250000,
    totalPriceKrw: 1500000,
    totalPriceNote: "24주 총액",
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

/**
 * 상품 비교표 — B2B 결정 순서 (적합 → 운영 → 기간 → 포함 → 비용).
 * "준비 중"은 숨기지 않고 칸 안에 그대로 적는다.
 */
export const comparisonRows: ComparisonRow[] = [
  {
    label: "적합한 원",
    values: ["처음 도입해 보는 원", "한 학기 단위 운영", "24주 장기 운영"],
  },
  {
    label: "운영 내용",
    values: [
      "8주 「씨앗에서 숲까지」",
      "16주 수업 + 학기 기록",
      "24주 수업 + 원 맞춤 납품물",
    ],
  },
  { label: "운영기간", values: ["8주", "16주", "24주"] },
  {
    label: "수업",
    values: [
      "주 1회 50분 + 워크북 10분",
      "주 1회 50분 + 워크북 10분",
      "주 1회 50분 + 워크북 10분",
    ],
  },
  {
    label: "콘텐츠",
    values: [
      "8주 전체 제공",
      "주차별 구성 상담 · 9주 이후 준비 중",
      "주차별 구성 상담 · 9주 이후 준비 중",
    ],
  },
  {
    label: "성장리포트",
    values: [
      "주간 (출시 준비 중)",
      "주간 · 월간 요약(준비 중) · 학기 포트폴리오(준비 중)",
      "주간 · 월간 요약(준비 중) · 학기 포트폴리오(준비 중)",
    ],
  },
  { label: "원장 대시보드", values: ["－", "포함", "포함"] },
  {
    label: "계약 납품물",
    values: [
      "창의키트 2회",
      "창의키트 4회",
      "창의키트 6회 · 현판 · 상담자료 팩 · 원 브랜딩(범위 상담)",
    ],
  },
  { label: "월 이용료", values: ["99,000원", "150,000원", "250,000원"] },
  { label: "총액", values: ["198,000원", "600,000원 / 학기", "1,500,000원"] },
];

/**
 * 4주 Pilot — 정규 상품과 명확히 분리된 선택형 체험.
 * ★ 가격 미정 (CO-3). 가격을 적지 않는다.
 */
export const pilotOffer = {
  eyebrow: "BEFORE CONTRACT",
  headline: "정규 도입 전,\n우리 원에서 4주 먼저 경험해 보세요.",
  subCopy:
    "1~2개 반에서 담임교사가 직접 운영해 보고 결정하는 과정입니다. 4주 후 운영지표를 함께 확인합니다.",
  note: "4주 파일럿은 STARTER · STANDARD · PREMIUM과 동일한 정규 판매상품이 아닌, 도입 전 선택형 체험 프로그램입니다. 조건은 상담 시 안내드립니다.",
  flow: ["4주 PILOT", "운영 리뷰", "정규 도입 결정", "STARTER · STANDARD · PREMIUM"],
};
