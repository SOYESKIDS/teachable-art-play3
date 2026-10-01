/** 홈페이지 섹션 콘텐츠 및 상품 관련 공용 타입 */

export interface StakeholderValue {
  role: "director" | "teacher" | "parent" | "child";
  label: string;
  question?: string;
  values: string[];
}

export interface ProblemStatement {
  order: number;
  title: string;
  description: string;
}

export interface CoreSolution {
  code: `CORE ${string}`;
  title: string;
  items: string[];
  description?: string;
}

export interface ClassStep {
  step: number;
  title: string;
  minutes: number;
  description: string;
  isCore?: boolean;
}

export interface ThreeNeedItem {
  role: "director" | "teacher" | "parent";
  label: string;
  question: string;
  needs: string[];
}

export interface CoreSolutionFlowStep {
  order: number;
  code: string;
  label: string;
  title: string;
  description: string;
}

export interface TeacherSupportItem {
  text: string;
  highlight?: boolean;
}

export interface TeacherSupportPhase {
  id: "before" | "during" | "after";
  label: string;
  title: string;
  items: TeacherSupportItem[];
}

export interface GrowthObservationItem {
  label: string;
}

export interface ValueItem {
  code: string;
  role: string;
  keyword: string;
  description: string;
  accent: "soft-green" | "light-blue" | "navy";
}

export interface ContentItem {
  label: string;
  /**
   * large = 아이가 수업에서 직접 만나는 핵심 콘텐츠,
   * small = 그 수업을 지원하는 자료. 카드 크기는 동일하고 아이콘 강조만 달라진다.
   */
  size: "large" | "small";
}

/** ContentSection 하단 "실제 콘텐츠 예시" 스트립에 쓰는 실제 제작물 이미지. */
export interface ContentExample {
  src: string;
  alt: string;
  label: string;
}

export interface DirectorKpi {
  label: string;
  value: string;
}

export interface ClassProgressItem {
  label: string;
  percent: number;
}

export interface PlatformTab {
  id: "ai" | "parent" | "director";
  label: string;
  tagline: string;

  // AI 성장기록
  demoLabel?: string;
  input?: string[];
  output?: string[];

  // 학부모 리포트
  headerLabel?: string;
  activityTitle?: string;
  childQuote?: string;
  teacherComment?: string;
  homeTip?: string;
  badges?: string[];

  // 원장 대시보드
  kpis?: DirectorKpi[];
  weeklyUsageLabel?: string;
  weeklyUsage?: number[];
  recentReportsLabel?: string;
  recentReports?: string[];
  classProgressLabel?: string;
  classProgress?: ClassProgressItem[];
}

export interface AIFlowStep {
  step: number;
  title: string;
  role: string;
  items: string[];
  accent: "neutral" | "ai" | "review";
}

export interface AIPrincipleItem {
  order: number;
  title: string;
  description: string;
}

export interface GrowthExamplePoint {
  label: string;
  text: string;
}

export interface DashboardRecentReport {
  label: string;
  status: "완료" | "검토중";
}

export interface DashboardCallout {
  order: number;
  text: string;
}

export interface PricingPackage {
  id: "starter" | "standard" | "premium";
  name: string;
  subtitle: string;
  label: string;
  /** 상품소개서 v4의 한 줄 메시지 (처음 경험하기 / 한 학기 기록 만들기 / 우리 원의 시그니처) */
  tagline: string;
  isBest: boolean;
  durationWeeks: number;
  frequency: string;
  recommendedAge: string;
  priceUnitNote: string;
  monthlyPriceKrw: number;
  /**
   * 운영기간 전체 금액.
   *
   * ★ 컴포넌트에서 monthlyPriceKrw × 개월수를 계산하지 않는다.
   *   STARTER는 8주(2개월) 198,000원, STANDARD는 16주(4개월) 600,000원,
   *   PREMIUM은 24주(6개월) 1,500,000원으로 영업자료에 확정되어 있고,
   *   PREMIUM은 250,000 × 6 = 1,500,000이지만 나머지도 같은 규칙이라 보장할 수 없다.
   *   확정된 값을 그대로 데이터에 둔다.
   */
  totalPriceKrw: number;
  /** 총액 옆에 붙는 기간 표기 (예: "8주 총액") */
  totalPriceNote: string;
  contentItems: string[];
  accentColor: "light-blue" | "ivory-yellow" | "navy-yellow";

  /*
    ── 아래는 추가 필드(선택). 기존 화면은 위 필드만 읽어도 그대로 동작한다.
    B2B 결정 순서: 어떤 원에 적합 → 무엇을 운영 → 기간 → 포함 내용 → 비용.
  */
  /** 어떤 원에 적합한가 (한 줄) */
  fit?: string;
  /** 무엇을 운영하는가 (한 줄) */
  operation?: string;
  /** 포함 내용 + 현재 제공 상태. contentItems 는 이 목록에서 만든 문자열이다. */
  features?: PackageFeature[];
}

/**
 * 상품 구성 항목의 제공 상태.
 * - "포함": 지금 만들어져 있고 상품에 들어 있다.
 * - "준비 중": 상품에 약속된 항목이지만 아직 만들어지지 않았거나 공개 전이다.
 * - "계약 범위": 실물 · 맞춤 납품물이라 계약 조건에 따라 제공된다.
 */
export type PackageFeatureAvailability = "포함" | "준비 중" | "계약 범위";

export interface PackageFeature {
  label: string;
  availability: PackageFeatureAvailability;
  /** 상태에 대한 짧은 보충 (예: "9~16주 콘텐츠 준비 중") */
  note?: string;
}

/**
 * WHAT WE MEASURE — 기관이 직접 확인할 수 있는 운영지표.
 *
 * ★ 교육효과 수치가 아니다. "창의성 +37%" 같은 근거 없는 marketing metric을
 *   만들지 않기 위해, 분자/분모가 명확한 운영지표만 다룬다.
 */
export interface OperationMetric {
  order: string;
  title: string;
  formula: string;
  description: string;
}

/**
 * WHY DIFFERENT — 운영유형 비교.
 *
 * ★ 경쟁사 실명을 쓰지 않는다. 비교 대상은 서비스가 아니라 "운영유형"이다.
 */
export interface DifferentiatorRow {
  label: string;
  values: [boolean, boolean, boolean];
}

/** 우리 원 규모에 맞는 시작 방법 (Pricing 앞) */
export interface PackageScenario {
  code: string;
  title: string;
  recommended: string;
  packageId: PricingPackage["id"];
  operation: string;
  purpose: string;
  next: string;
  isRecommended?: boolean;
}

export interface ComparisonRow {
  label: string;
  values: [string, string, string];
}

export interface BenefitItem {
  code: string;
  role: string;
  tag: string;
  description: string;
  keywords: string[];
  accent: "pale-yellow" | "light-blue" | "soft-coral" | "soft-green";
}

export interface SafeOperationPrinciple {
  order: number;
  text: string;
}

export interface AdoptionStep {
  order: number;
  title: string;
  description: string;
}
