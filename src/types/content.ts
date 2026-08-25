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
  isBest: boolean;
  durationWeeks: number;
  frequency: string;
  recommendedAge: string;
  priceUnitNote: string;
  monthlyPriceKrw: number;
  contentItems: string[];
  accentColor: "light-blue" | "ivory-yellow" | "navy-yellow";
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
