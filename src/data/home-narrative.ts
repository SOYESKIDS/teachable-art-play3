/**
 * 공개 홈페이지 내러티브 — PHASE CONTENT-FINAL.
 *
 * 문제 → 연결 흐름 → 콘텐츠 → 한 번의 수업 → 8주 → 기록 → 역할 → 원장 화면 → 상품 → 도입 → 신뢰 → 상담.
 * copy 규칙의 원본: docs/06-ux-design/final-content-system.md
 *
 * ★ 근거 없는 말을 하지 않는다.
 *   · 출시 전 기능은 "준비 중", 상품마다 다른 기능은 "STANDARD 이상" · "계약 범위" 배지를 단다.
 *     근거: release-blocker-matrix · product-catalog · entitlement-policy · DEC-009/056/062/065/070/074
 *   · 수치는 원본에 있는 것만 — 8주 · 50분(DEC-023) · 성장 지표 5가지(growth_metrics seed).
 *   · 수업 예시는 content/starter/2026.1 (canonical · Staging 승인 · Production 미승인 — SC-1).
 */

/** 기능 제공 상태 — 화면에 그대로 배지로 쓴다 */
export type Availability = "포함" | "준비 중" | "STANDARD 이상" | "계약 범위";

/* ──────────────────────────────── 01 HERO */
export const heroNarrative = {
  eyebrow: "유치원을 위한 통합예술 교육 운영 시스템",
  /** H1 은 승인된 브랜드 문장 — 페이지 안에서 반복하지 않는다 */
  description:
    "담임교사가 직접 운영하는 통합예술 수업과\n수업 이후의 관찰 · 기록까지 하나의 흐름으로 연결합니다.",
  /** 근거: 8주(DEC-055) · 담임교사 1인(DEC-004) · 주 1회 50분(DEC-023) · 회차별 §15 교사용 퀵 가이드 */
  proof: ["8주 STARTER 프로그램", "담임교사가 직접 운영", "주 1회 · 50분 수업", "회차별 교사용 수업 가이드"],
  ctaSecondary: { label: "8주 프로그램 보기", href: "/programs/starter" },
  /** 3순위 — 작은 글자 링크. 데모 · 파일럿은 도입 안내 섹션에서 자세히 */
  ctaTertiary: { label: "20분 데모 · 4주 파일럿 알아보기", href: "#adoption" },
};

/* ──────────────────────────────── 02 PROBLEM — 교사를 탓하지 않는다 · 겁주지 않는다 */
export const problemNarrative = {
  eyebrow: "WHY",
  headline: "좋은 수업은 이미 하고 있습니다.\n남기고 확인하는 일이 어렵습니다.",
  subCopy: "유치원에서 자주 듣는 네 가지 이야기입니다.",
  items: [
    {
      code: "01",
      moment: "수업 준비",
      title: "좋은 수업을 준비하는 데 시간이 많이 듭니다",
      body: "주제 · 그림책 · 활동 · 준비물을 회차마다 찾고 맞추는 일이 매주 반복됩니다.",
    },
    {
      code: "02",
      moment: "수업 뒤",
      title: "수업은 끝났지만 아이의 과정은 남기 어렵습니다",
      body: "수업 중에 본 아이의 말과 행동을 따로 적어 둘 시간이 부족합니다.",
    },
    {
      code: "03",
      moment: "학부모",
      title: "보여 줄 수 있는 것이 사진 몇 장뿐입니다",
      body: "무엇을 경험했고 어떻게 참여했는지 설명할 기록이 부족합니다.",
    },
    {
      code: "04",
      moment: "원 운영",
      title: "여러 반의 운영 상태를 한눈에 보기 어렵습니다",
      body: "어느 반이 어디까지 진행했는지, 빠진 기록은 없는지 반마다 확인해야 합니다.",
    },
  ],
  answer: "TeachAble Art Play는 수업과 기록을 하나의 운영 흐름으로 연결합니다.",
};

/* ──────────────────────────────── 03 SOLUTION — 수업 → 관찰 → 기록 → 리포트 → 운영 확인 */
export const workflowNarrative = {
  eyebrow: "HOW IT WORKS",
  headline: "수업이 끝나도,\n기록과 확인으로 이어집니다.",
  steps: [
    {
      no: "01",
      title: "수업",
      lead: "회차별 수업안으로 진행합니다",
      body: "주제 · 그림책 · 준비물 · 진행 순서 · 발문이 한 회차에 정리되어 있습니다.",
      icon: "book",
    },
    {
      no: "02",
      title: "관찰",
      lead: "무엇을 볼지 알고 들어갑니다",
      body: "회차마다 관찰 포인트와 기록 문장 예시가 있습니다.",
      icon: "eye",
    },
    {
      no: "03",
      title: "기록",
      lead: "짧게 남깁니다",
      body: "아이의 말 · 선택 · 행동을 짧게 적고, 성장 지표 중 해당하는 것만 고릅니다.",
      icon: "pencil",
    },
    {
      no: "04",
      title: "리포트",
      lead: "교사가 확인한 기록만 공유됩니다",
      body: "주간 리포트는 교사가 직접 확인하고 완료해야 공유 대상이 됩니다.",
      icon: "check",
      availability: "준비 중" as Availability,
      availabilityNote: "주간 리포트 출시 준비 중",
    },
    {
      no: "05",
      title: "운영 확인",
      lead: "원장은 원 전체를 봅니다",
      body: "반별 진행과 빠진 출결 · 관찰 기록을 원 단위로 확인합니다.",
      icon: "grid",
      availability: "STANDARD 이상" as Availability,
      availabilityNote: "원장 대시보드 · STANDARD · PREMIUM",
    },
  ],
};

/* ──────────────────────────────── 04 CONTENT ECOSYSTEM */
export const contentNarrative = {
  eyebrow: "CONTENT",
  headline: "콘텐츠를 하나씩 주는 것이 아니라,\n하나의 커리큘럼과 기록으로 연결합니다.",
  subCopy: "한 회차의 그림책 · 영상과 음원 · 워크북 · 창의활동 키트가 같은 주제로 묶여 있고, 마지막은 교사의 관찰 기록입니다.",
  /** example 키는 canonical 주차 데이터의 필드 이름 */
  chain: [
    { name: "마음동화 · EBOOK", role: "이야기를 만나고", example: "storybook" },
    { name: "VOD · 활동 음원", role: "몸으로 경험하고", example: "physicalActivity" },
    { name: "워크북", role: "생각을 정리하고", example: "workbook" },
    { name: "창의활동 키트", role: "손으로 표현하고", example: "artActivity" },
    { name: "관찰 기록", role: "기록으로 남깁니다", example: "observationFocus" },
  ],
  /** 예시 주차 — canonical W4 */
  exampleWeek: 4,
  mediaNote: "EBOOK · VOD · 음원은 수업 자료로 제공합니다. 플랫폼 안에서 바로 재생하는 기능은 준비 중입니다.",
  kitNote: "창의활동 키트 제공 횟수는 상품 · 계약 범위에 따라 다릅니다.",
};

/* ──────────────────────────────── 05 ONE SESSION — 수업 경험 5단계 (시간은 DEC-023 표준 골격) */
export const sessionNarrative = {
  eyebrow: "ONE SESSION",
  headline: "한 번의 수업은 이렇게 흘러갑니다.",
  subCopy: "담임교사 한 명이 수업안을 따라 50분 동안 진행합니다. 다섯 번째 단계, 교사의 관찰 기록이 수업을 기록으로 이어 줍니다.",
  /**
   * 시간 = DEC-023 6단계를 경험 단위로 묶은 값.
   *   이야기 열기 = 도입 5 + 그림책 8 · 몸으로 느끼기 = 활동 약속 2 + 핵심활동 20 ·
   *   나답게 표현하기 = 미술 · 창작 10 (+ 워크북 별도 10) · 친구와 나누기 = 마무리 5
   */
  steps: [
    { title: "이야기 열기", time: "13분", minutes: 13, detail: "마음동화 · EBOOK로 오늘의 주제를 만납니다." },
    { title: "몸으로 느끼기", time: "22분", minutes: 22, detail: "활동 음원 · 영상에 맞춰 움직이며 주제를 몸으로 경험합니다." },
    { title: "나답게 표현하기", time: "10분", minutes: 10, detail: "미술 · 창의활동으로 자기 방식대로 표현합니다. 워크북은 별도 10분." },
    { title: "친구와 나누기", time: "5분", minutes: 5, detail: "서로의 작품과 이야기를 함께 보며 오늘을 돌아봅니다." },
    { title: "교사 관찰 기록", time: "수업 중 · 후", minutes: 0, detail: "아이의 말 · 선택 · 행동을 짧게 남깁니다. 무엇을 볼지는 회차별 관찰 포인트에 있습니다." },
  ],
  timeNote: "표준 50분 · 워크북은 50분과 별도로 10분 운영합니다. 6주차는 대형 공동작업이라 시간 배분이 다릅니다.",
  support: [
    { phase: "수업 전", items: ["오늘의 목표 한 장 요약", "준비물 · 공간 · 안전 확인", "권장 시간표"] },
    { phase: "수업 중", items: ["단계별 진행안과 발문", "이런 상황이 생기면 (대응 가이드)", "마무리 대화"] },
    { phase: "수업 후", items: ["관찰 포인트와 기록 문장 예시", "가정연계 안내", "출결 · 관찰 기록"] },
  ],
};

/* ──────────────────────────────── 06 PROGRAM JOURNEY */
export const journeyNarrative = {
  eyebrow: "STARTER · 8주",
  headline: "씨앗에서 숲까지,\n8주가 하나의 이야기로 이어집니다.",
  subCopy:
    "시작하고, 경험하고, 표현하고, 함께 자라서, 마지막 주에 하나의 숲이 됩니다. 4~7주에 만든 작품은 8주의 ‘우리 반 숲’ 현수막으로 모입니다.",
  cta: { label: "8주 전체 수업 보기", href: "/programs/starter" },
};

/* ──────────────────────────────── 07 GROWTH RECORD */
export const growthNarrative = {
  eyebrow: "GROWTH RECORD",
  headline: "잘했는지를 점수로 매기지 않습니다.\n어떻게 참여했는지를 기록합니다.",
  subCopy:
    "교사는 활동마다 아이에게서 본 모습을 다섯 가지 지표 중에서 고르고, 그때 어떤 도움이 있었는지를 남깁니다.",
  /** growth_metrics seed 와 같은 이름 · 순서 */
  metrics: ["표현 다양성", "형태 · 공간 구성", "창의적 시도", "활동 참여 · 몰입", "자기 설명 · 소통"],
  /** "기록 없음"은 단계가 아니라 기록이 없는 상태 (GrowthMetricSelector 기본값) */
  noRecord: {
    label: "기록 없음",
    help: "이번 활동에서 해당 모습을 관찰하지 못했다는 뜻입니다. 부족함이나 실패가 아닙니다.",
  },
  rules: [
    "점수 · 등급 · 합계를 내지 않습니다.",
    "다른 아이와 비교하지 않습니다. 같은 아이의 이전 기록과만 나란히 봅니다.",
    "단계는 활동마다 오르내릴 수 있습니다.",
  ],
  /** content/starter/2026.1/week-01.txt §12 첫 항목 (canonical) */
  guideExample: {
    week: 1,
    focus: "환경 적응",
    look: "새로운 공간에 관심을 보이고 자기 방식으로 탐색하는가",
    write: "머문 공간 · 관심을 보인 사물 · 탐색 방식",
  },
  ai: {
    title: "AI는 교사의 기록 정리를 돕는 도구입니다",
    body: "교사가 남긴 관찰 메모를 읽기 좋은 초안으로 정리하는 기능을 준비하고 있습니다. 아이를 진단 · 평가하거나 단계를 정하지 않고, 최종 기록은 교사가 확인합니다. STARTER에는 포함되지 않습니다.",
    availability: "준비 중" as Availability,
  },
};

/* ──────────────────────────────── 08 VALUE BY ROLE */
export const rolesNarrative = {
  eyebrow: "FOR EVERYONE",
  headline: "같은 수업 기록을,\n각자 필요한 만큼 봅니다.",
  roles: [
    {
      key: "teacher",
      label: "교사",
      title: "수업을 만드는 시간보다,\n아이를 보는 시간에 집중합니다.",
      items: ["회차별 수업안", "발문 예시", "준비물 안내", "관찰 포인트", "기록 문장 예시"],
      availability: "포함" as Availability,
      note: null,
    },
    {
      key: "director",
      label: "원장",
      title: "각 반이 어디까지 진행됐는지,\n한 화면에서 확인합니다.",
      items: ["반별 수업 진행 현황", "지난 미완료 수업", "빠진 출결 · 관찰 기록", "주간 리포트 상태", "운영 중인 프로그램"],
      availability: "계약 범위" as Availability,
      note: "수업 운영 · 이력 화면은 모든 상품에, 원장 대시보드(빠진 기록 확인)는 STANDARD · PREMIUM에 포함됩니다.",
    },
    {
      key: "parent",
      label: "학부모",
      title: "결과만이 아니라,\n아이의 말과 과정을 전하려고 합니다.",
      items: ["교사가 완료한 주간 기록", "아이의 말", "교사의 관찰 문장", "가정연계 활동"],
      availability: "준비 중" as Availability,
      note: "학부모 공유 화면은 출시 준비 중입니다. 사진은 싣지 않고 교사의 글 기록으로 전합니다.",
    },
  ],
};

/* ──────────────────────────────── 09 DIRECTOR DASHBOARD (예시 화면) */
export const dashboardNarrative = {
  eyebrow: "DIRECTOR",
  headline: "오늘의 우리 원,\n한 화면에서 확인합니다.",
  subCopy: "오늘 수업 → 반별 진행 → 확인이 필요한 기록 순서로 보입니다. 꾸민 숫자 없이 실제 운영 기록만 씁니다.",
  availability: "STANDARD 이상" as Availability,
  note: "원장 대시보드는 STANDARD · PREMIUM에 포함됩니다. 아래는 예시 화면입니다.",
  /** 실제 원장 대시보드(DirectorDashboard.tsx)의 항목과 같은 구성 · 값은 예시 */
  sample: {
    today: [
      { label: "오늘 수업", value: "3" },
      { label: "진행 중", value: "1" },
      { label: "완료", value: "1" },
    ],
    classes: [
      { name: "햇살반", week: "4주차", title: "소예의 씨앗", status: "완료" },
      { name: "새싹반", week: "4주차", title: "소예의 씨앗", status: "진행 중" },
      { name: "꽃잎반", week: "3주차", title: "마음을 말해줘", status: "예정" },
    ],
    followUps: [
      { label: "출결 기록 없음", detail: "꽃잎반 · 3주차" },
      { label: "관찰 기록 없음", detail: "햇살반 · 4주차" },
    ],
  },
};

/* ──────────────────────────────── 10 PRODUCT / PACKAGE (상단 안내) */
export const pricingNarrative = {
  eyebrow: "PACKAGES",
  headline: "우리 원은 어디서 시작하면 될까요?",
  subCopy: "운영 규모와 기간에 맞춰 고를 수 있습니다. 포함 범위 · 서비스 시작일 · 최종 조건은 상담과 계약에서 확정합니다.",
  fitEyebrow: "어떤 원에 맞나요?",
  fits: [
    { packageId: "starter", situation: "처음 도입하는 원", detail: "한 반부터 8주 동안 수업과 기록이 우리 원에 맞는지 확인합니다." },
    { packageId: "standard", situation: "한 학기 정규 운영", detail: "16주 과정에 원장 대시보드가 함께 포함됩니다." },
    { packageId: "premium", situation: "장기 운영", detail: "24주 과정으로 원의 대표 교육과정을 만듭니다." },
  ],
};

/* ──────────────────────────────── 11 ADOPTION — 실제 도입 절차 (DEC-061 · admin-flow · OnboardingFlow) */
export const adoptionNarrative = {
  eyebrow: "ONBOARDING",
  headline: "상담부터 첫 수업까지,\n함께 준비합니다.",
  steps: [
    { no: "01", title: "도입 상담", body: "반 수 · 연령 · 운영 기간을 듣고 맞는 상품을 안내합니다." },
    { no: "02", title: "운영 방식 확인", body: "20분 데모로 교사 · 원장 화면을 보고 범위와 견적을 정합니다." },
    { no: "03", title: "기관 · 반 설정", body: "계약 후 본사가 기관 · 반 · 프로그램을 설정합니다." },
    { no: "04", title: "교사 온보딩", body: "원장 · 교사 계정을 초대하고 첫 수업을 함께 준비합니다." },
    { no: "05", title: "첫 수업", body: "1주차 수업안으로 담임교사가 수업을 시작합니다." },
    { no: "06", title: "운영 확인", body: "수업 이력과 기록 현황을 보며 운영을 함께 점검합니다." },
  ],
  demo: {
    title: "20분 데모에서 확인하는 것",
    items: ["교사 수업 화면", "관찰 · 기록 흐름", "주간 리포트 예시", "원장 운영 화면"],
  },
  pilot: {
    title: "먼저 작게 확인하고 싶다면",
    body: "1~2개 반에서 4주 동안 운영해 보는 파일럿도 상담할 수 있습니다. 조건은 상담 시 안내합니다.",
  },
};

/* ──────────────────────────────── 12 TRUST — 승인된 운영 원칙 */
export const trustNarrative = {
  eyebrow: "TRUST",
  headline: "아이의 기록은 세심하게,\n공개는 신중하게.",
  /** 근거: DEC-009 · DEC-030 · DEC-058 · DEC-059 · DEC-065 · DEC-071 · DEC-074 · CO-2 */
  principles: [
    { title: "AI는 진단하지 않습니다", body: "AI도 시스템도 아이를 진단 · 평가하거나 성장 단계를 정하지 않습니다." },
    { title: "성장기록은 점수가 아닙니다", body: "등급 · 합계 · 순위를 만들지 않습니다." },
    { title: "다른 아이와 비교하지 않습니다", body: "같은 아이의 이전 기록과만 나란히 봅니다." },
    { title: "교사가 최종 기록을 확인합니다", body: "교사가 직접 확인하고 완료한 기록만 공유 대상이 됩니다." },
    { title: "공개 범위는 원이 정합니다", body: "원장은 학부모 공개를 숨기거나 다시 열 수 있고, 그 사유가 남습니다." },
    { title: "보관 · 파기는 계약으로", body: "보관 기간과 종료 후 이관 · 파기 기준은 계약 시 서면으로 확정합니다." },
  ],
};

/* ──────────────────────────────── 13 FINAL CTA — 구매가 아니라 "우리 원에 맞는지 확인" */
export const finalNarrative = {
  kicker: "수업은 끝나도, 아이의 과정은 기록으로 남습니다.",
  headline: "우리 원에 맞는 운영 방식이\n궁금하신가요?",
  subCopy: "상담에서 반 수 · 연령 · 운영 기간에 맞는 도입 방식을 함께 확인하세요.",
};
