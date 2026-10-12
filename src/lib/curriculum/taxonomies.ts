/**
 * 네 가지 분류 체계의 명시적 분리 — 실행 묶음 C1.
 *
 * ── 왜 이 파일이 필요한가 ───────────────────────────────────────────
 *
 * 저장소 안에 "관찰에 쓰이는 분류"가 네 개 있고, 서로 뜻이 다르다. 이름이 비슷해서
 * 한 축으로 합치거나 이름만 바꿔 다른 의미로 쓰려는 시도가 반복해서 생긴다.
 * 그래서 한 곳에 네 개를 나란히 적고, 섞으면 안 되는 이유를 함께 둔다.
 *
 *   A. 누리과정 공식 5영역      국가 교육과정의 영역. 우리가 정의하지 않는다.
 *   B. SOYE KIDS 핵심경험       누리 영역이 아닌 내부 성장 관점.
 *   C. observation_domains      기존 관찰 기록의 분류. 과거 기록이 참조한다.
 *   D. SOYE Growth 5            성장 지표. growth_metrics 테이블의 code.
 *
 * ── 규칙 ────────────────────────────────────────────────────────────
 *
 * ★ 기존 기록의 식별자·의미·원문을 보존한다.
 *   C 의 code 는 과거 관찰 행이 FK 로 참조한다. 이름을 바꿔 다른 뜻으로 쓰지 않는다.
 *   승인되지 않은 새 분류로 과거 관찰을 자동 변환하지 않는다.
 *
 * ★ A 와 D 를 서로 바꾸지 않는다.
 *   누리과정 영역을 성장 지표로 쓰거나 그 반대로 쓰면, 두 체계가 답하는 질문이
 *   달라진다. A 는 "어떤 교육과정 영역과 이어지는가", D 는 "무엇을 관찰했는가"다.
 *
 * ★ A ↔ D 대응은 **승인 상태가 있는 매핑**으로만 둔다.
 *   아래 NURI_GROWTH_MAPPING 은 전부 승인 대기 상태이며, 화면·리포트가
 *   이것을 근거로 자동 집계하지 않는다.
 *
 * ★ 평균·성장률·서열을 만들지 않는다. 이 파일에 집계 함수가 없는 이유다.
 */

/* ════════════════════════════════════════ A. 누리과정 공식 5영역 */

/**
 * 2019 개정 누리과정의 5영역.
 *
 * ★ 우리가 정의하는 값이 아니다. 국가 교육과정의 영역 이름을 그대로 쓴다.
 *   `src/lib/content/starter-journey.ts` 의 `NURI_AREAS` 와 같은 값이어야 한다.
 */
export const NURI_AREA_CODES = [
  "physical_health",
  "communication",
  "social_relations",
  "art_experience",
  "nature_inquiry",
] as const;

export type NuriAreaCode = (typeof NURI_AREA_CODES)[number];

export const NURI_AREA_LABEL: Record<NuriAreaCode, string> = {
  physical_health: "신체운동·건강",
  communication: "의사소통",
  social_relations: "사회관계",
  art_experience: "예술경험",
  nature_inquiry: "자연탐구",
};

/** 라벨 → code. 원본 교안이 한국어 라벨로 적혀 있어 역변환이 필요하다. */
export const NURI_LABEL_TO_CODE: Record<string, NuriAreaCode> = Object.fromEntries(
  (Object.entries(NURI_AREA_LABEL) as [NuriAreaCode, string][]).map(
    ([code, label]) => [label, code],
  ),
);

export function isNuriAreaLabel(label: string): boolean {
  return label in NURI_LABEL_TO_CODE;
}

/* ══════════════════════════════════ B. SOYE KIDS 핵심경험 */

/**
 * 누리과정 영역이 아닌 내부 성장 관점.
 *
 * ★ 원본 교사용 가이드 §3 표에는 누리 5영역이 아닌 값이 섞인 주차가 있다
 *   (W2 "정서·자기조절"). STARTER 표준화 규격 §5 가 그것을 누리과정 영역으로
 *   표기하지 말고 "SOYE KIDS 핵심경험"으로 분리하도록 지정했다.
 *
 * ★ **누리에 없는 값을 전부 핵심경험으로 자동 승인하지 않는다.**
 *   이전 구현은 "누리 5영역이 아니면 핵심경험"으로 보았다. 그러면 원본의 오기나
 *   아직 검수되지 않은 표현까지 "SOYE KIDS 핵심경험"이라는 공식 이름을 얻는다.
 *   핵심경험은 **승인된 목록에 있는 것만** 이고, 나머지는 `unclassified` 다.
 *
 * ★ 승인 목록은 규격 문서가 명시한 것만 담는다.
 *   현재 저장소 정본(content/starter/2026.1)에서 확인되고 규격 §5 가 분리를
 *   지정한 값은 "정서·자기조절" 하나다. 목록을 늘리는 것은 교육 결정이다.
 */
export const APPROVED_SOYE_CORE_EXPERIENCES = ["정서·자기조절"] as const;

export type SoyeCoreExperience = (typeof APPROVED_SOYE_CORE_EXPERIENCES)[number];

export function isApprovedSoyeCoreExperience(label: string): boolean {
  return (APPROVED_SOYE_CORE_EXPERIENCES as readonly string[]).includes(label);
}

/** 분류 결과 세 갈래 */
export type AreaLabelKind =
  /** 누리과정 공식 5영역 */
  | "nuri"
  /** 승인된 SOYE KIDS 핵심경험 */
  | "soye_core_experience"
  /**
   * 어느 쪽으로도 승인되지 않은 원문 값.
   *
   * 원문에 그렇게 적혀 있다는 사실은 보존하고, 공식 이름을 붙이지 않는다.
   * 화면은 "분류 미승인" 으로 따로 표시하고, 리포트·집계가 근거로 쓰지 않는다.
   */
  | "unclassified";

export function classifyAreaLabel(label: string): AreaLabelKind {
  if (isNuriAreaLabel(label)) return "nuri";
  if (isApprovedSoyeCoreExperience(label)) return "soye_core_experience";
  return "unclassified";
}

/** 세 갈래로 나눈 결과. 원문 문자열을 그대로 보존한다. */
export interface ClassifiedAreaLabels {
  nuri: string[];
  soyeCoreExperiences: string[];
  unclassified: string[];
}

export function classifyAreaLabels(raw: readonly string[]): ClassifiedAreaLabels {
  const out: ClassifiedAreaLabels = {
    nuri: [],
    soyeCoreExperiences: [],
    unclassified: [],
  };
  for (const label of raw) {
    switch (classifyAreaLabel(label)) {
      case "nuri":
        out.nuri.push(label);
        break;
      case "soye_core_experience":
        out.soyeCoreExperiences.push(label);
        break;
      case "unclassified":
        out.unclassified.push(label);
        break;
    }
  }
  return out;
}

export const AREA_KIND_LABEL: Record<AreaLabelKind, string> = {
  nuri: "누리과정",
  soye_core_experience: "SOYE KIDS 핵심경험",
  unclassified: "분류 미승인",
};

export const UNCLASSIFIED_NOTICE =
  "원본 자료에 적힌 값이지만 누리과정 영역도, 승인된 SOYE KIDS 핵심경험도 아닙니다. 교육 검수 전까지 분류를 확정하지 않습니다.";

/* ══════════════════════════════ C. 기존 observation_domains */

/**
 * 기존 관찰 기록의 분류.
 *
 * ★ 이 code 는 과거 관찰 행(class_session_observation_domains)이 참조한다.
 *   `on delete restrict` 로 묶여 있어 행을 지울 수도 없다.
 *   이름을 고쳐 다른 뜻으로 쓰면 과거 기록의 의미가 소급 변경된다.
 *
 * ★ Growth 5 와 다른 체계다.
 *   미술 표현 어휘로 만들어진 분류이고, 성장 지표(D)는 별도 code 로 신설되었다.
 *   둘을 매핑해 과거 기록을 지표로 환산하는 것은 **승인되지 않았다.**
 *
 * ★ 값은 DB(observation_domains)가 단일 출처다.
 *   여기에 복사해 두면 둘이 갈라진다. code 만 참고용으로 적는다.
 */
export const LEGACY_OBSERVATION_DOMAIN_CODES = [
  "color_expression",
  "form_space",
  "detail_expression",
  "creative_extension",
  "activity_completion",
] as const;

export type LegacyObservationDomainCode =
  (typeof LEGACY_OBSERVATION_DOMAIN_CODES)[number];

/* ════════════════════════════════════ D. SOYE Growth 5 */

/**
 * 성장 지표.
 *
 * ★ code 는 `growth_metrics` 테이블(migration 20261001100000_m2)이 단일 출처다.
 *   아래 값은 그 테이블과 같아야 하고, 라벨은 화면 문구를 맞추기 위한 사본이다.
 *
 * ★ 구 observation_domains code 와 **겹치지 않게** 새로 지었다.
 *   같은 code 를 재사용하면 과거 기록이 지표로 둔갑한다.
 */
export const GROWTH_METRIC_CODES = [
  "expression_variety",
  "form_space_composition",
  "creative_attempt",
  "engagement_immersion",
  "self_explanation",
] as const;

export type GrowthMetricCode = (typeof GROWTH_METRIC_CODES)[number];

export const GROWTH_METRIC_LABEL: Record<GrowthMetricCode, string> = {
  expression_variety: "표현 다양성",
  form_space_composition: "형태·공간 구성",
  creative_attempt: "창의적 시도",
  engagement_immersion: "활동 참여·몰입",
  self_explanation: "자기 설명·소통",
};

/**
 * 지표 설명. "많을수록 좋다"로 읽히지 않게 쓴다.
 * DB `growth_metrics.guide` 와 같은 문구여야 한다.
 */
export const GROWTH_METRIC_GUIDE: Record<GrowthMetricCode, string> = {
  expression_variety: "색 · 재료 · 방법을 여러 갈래로 시도한 모습 (많을수록 좋다는 뜻 아님)",
  form_space_composition: "형태를 배치하고 공간을 다룬 모습",
  creative_attempt: "제시된 방법과 다른 방식을 꺼내 본 모습",
  engagement_immersion: "활동에 머문 방식 (시간 길이 아님)",
  self_explanation: "자기 선택을 말 · 몸짓으로 전한 모습",
};

/* ══════════════════════════════════ 도움 표현 (단계) */

/**
 * 그 활동에서 아이에게 어떤 도움이 필요했는지.
 *
 * ★ 점수·등급·발달수준·또래평가가 **아니다.**
 *   "이번 활동에서 관찰된 참여 / 지원 방식"이다.
 *
 * ★ 순서를 부여하지 않는다.
 *   배열 순서는 화면 배치 편의일 뿐이고, 숫자·화살표·그라데이션을 붙이지 않는다.
 *   `independent` 가 목표가 아니고 `not_observed` 가 결핍이 아니다.
 *
 * ★ AI 가 이 값을 판정·추천·검증하지 않는다. 교사가 직접 고른다.
 */
export const SUPPORT_LEVEL_CODES = [
  "not_observed",
  "with_teacher",
  "after_modeling",
  "independent",
] as const;

export type SupportLevelCode = (typeof SUPPORT_LEVEL_CODES)[number];

export const SUPPORT_LEVEL_LABEL: Record<SupportLevelCode, string> = {
  not_observed: "기록 없음",
  with_teacher: "함께",
  after_modeling: "보고 나서",
  independent: "스스로",
};

export const SUPPORT_LEVEL_MEANING: Record<SupportLevelCode, string> = {
  not_observed: "이번 활동에서 그 모습이 나오지 않았거나 관찰하지 못했습니다.",
  with_teacher: "선생님과 함께하는 방식으로 참여했습니다.",
  after_modeling: "선생님이나 친구의 모습을 본 뒤에 참여했습니다.",
  independent: "스스로 시작해서 참여했습니다.",
};

/** 화면에 반드시 함께 쓰는 고정 문구 */
export const SUPPORT_LEVEL_NOTICE =
  "표시는 점수나 등급이 아닙니다. 빈 칸은 그 활동에서 그 모습이 나오지 않았다는 뜻이며, 못했다는 뜻이 아닙니다. 모든 비교는 그 아이 자신의 지난 기록과만 합니다.";

/**
 * "기록 없음"과 데이터가 없는 상태를 구분한다.
 *
 * `not_observed` 는 교사가 고른 값이다. null · undefined 는 아직 입력하지 않았거나
 * 조회에 실패한 상태다. 둘을 같은 화면 표시로 합치면 "선생님이 보고 없다고 한 것"과
 * "시스템이 모르는 것"이 구별되지 않는다.
 */
export type SupportLevelCell =
  | { state: "recorded"; level: SupportLevelCode }
  /** 교사가 아직 입력하지 않았다 */
  | { state: "not_entered" }
  /** 조회에 실패했다 */
  | { state: "unavailable" };

export function describeSupportLevelCell(cell: SupportLevelCell): string {
  switch (cell.state) {
    case "recorded":
      return SUPPORT_LEVEL_LABEL[cell.level];
    case "not_entered":
      return "입력 전";
    case "unavailable":
      return "불러오지 못함";
  }
}

/* ══════════════════════════ A ↔ D 매핑 (승인 상태 포함) */

export type MappingApproval =
  /** 교육 검수·승인을 받았다 */
  | "approved"
  /** 제안만 되어 있다. 화면·리포트가 근거로 쓰지 않는다 */
  | "proposed";

export interface NuriGrowthMapping {
  growthMetric: GrowthMetricCode;
  /** 그 지표가 주로 이어지는 누리 영역 */
  nuriAreas: readonly NuriAreaCode[];
  approval: MappingApproval;
}

/**
 * 지표 ↔ 누리 영역 대응.
 *
 * ★ 전부 `proposed` 다. 교육 검수를 받지 않았다.
 *   `approvedNuriGrowthMappings()` 가 빈 배열을 돌려주는 동안 어떤 화면도
 *   이 대응으로 누리 연계를 자동 생성하지 않는다.
 *
 * ★ 주차별 누리 연계는 이 매핑이 아니라 **원본 교안 §3** 에서 온다.
 *   `content/starter/2026.1/manifest.json` 의 `nuri_areas` 가 그 값이고,
 *   거기에 적힌 것이 사실이다. 이 매핑은 지표 쪽에서 본 참고 대응이다.
 */
export const NURI_GROWTH_MAPPING: readonly NuriGrowthMapping[] = [
  {
    growthMetric: "expression_variety",
    nuriAreas: ["art_experience"],
    approval: "proposed",
  },
  {
    growthMetric: "form_space_composition",
    nuriAreas: ["art_experience", "nature_inquiry"],
    approval: "proposed",
  },
  {
    growthMetric: "creative_attempt",
    nuriAreas: ["art_experience", "nature_inquiry"],
    approval: "proposed",
  },
  {
    growthMetric: "engagement_immersion",
    nuriAreas: ["physical_health", "social_relations"],
    approval: "proposed",
  },
  {
    growthMetric: "self_explanation",
    nuriAreas: ["communication", "social_relations"],
    approval: "proposed",
  },
] as const;

/** 승인된 매핑만. 지금은 빈 배열이다. */
export function approvedNuriGrowthMappings(): NuriGrowthMapping[] {
  return NURI_GROWTH_MAPPING.filter((m) => m.approval === "approved");
}

/* ══════════════════════ 선택 확장 — 아직 채택하지 않은 것 */

/**
 * 5대지표 v2 문서에는 아래 세 가지가 더 있다. **이번에 필수·자동 평가로 채택하지 않는다.**
 *
 *   1. 워크북 정량 5항목 (사용한 색 수 · 화면 채운 비율 · 그린/붙인 수 ·
 *      칸 밖 표현 · "왜 그렇게 했나요" 대답 유무)
 *   2. 증감 화살표 · "한 단계 상승"
 *   3. 1주차부터의 누적 격자
 *
 * 1 은 아동마다 수치를 손으로 입력해야 해 교사 부담이 지나치고,
 * 2 는 "스스로가 목표"로 읽힐 위험이 있어 표현 방식이 교육 결정 사항이며,
 * 3 은 2 와 같은 판단에 묶여 있다.
 *
 * 그래서 타입만 둔다. 저장 구조도 화면도 만들지 않는다.
 * 채택 여부는 01_출시결정표 · 02_전수대조의 결정 항목이다.
 */
export interface WorkbookQuantityEvidence {
  /** 선택 확장. 입력하지 않아도 리포트가 성립한다 */
  colorCount?: number;
  filledRatioPercent?: number;
  drawnOrPastedCount?: number;
  outsideDesignatedAreaCount?: number;
  explainedWhy?: boolean;
}

export const OPTIONAL_EXTENSIONS = {
  workbookQuantity: {
    adopted: false,
    reason:
      "아동별 수치 입력이 필요해 교사 부담이 크다. 특정 워크북의 선택 근거로만 확장 가능성을 남긴다.",
  },
  levelDelta: {
    adopted: false,
    reason:
      "증감 표기가 '스스로'를 목표로 읽히게 할 수 있다. 표현 방식은 교육 결정 사항이다.",
  },
  cumulativeGrid: {
    adopted: false,
    reason: "증감 표기 결정과 함께 정한다.",
  },
} as const;
