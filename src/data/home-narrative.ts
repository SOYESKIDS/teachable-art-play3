/**
 * 공개 홈페이지 V3 내러티브 (PHASE UI-02).
 *
 * 문제 → 흐름 → 한 번의 수업 → 8주 → 기록 → 역할 → 대시보드 → 상품 → 도입 → 신뢰 → CTA.
 *
 * ★ 근거 없는 말을 하지 않는다 (docs/06-ux-design/content-experience-v1.md §1).
 *   · 출시되지 않은 기능은 "준비 중" · 계약 범위에 따라 다른 기능은 그 범위를 적는다.
 *     근거: release-blocker-matrix · product-catalog · entitlement-policy · DEC-009/056/062/065/070/074
 *   · 수치는 원본에 있는 것만 — 50분 6단계(DEC-023) · 8주 · 성장 지표 5가지(growth_metrics seed).
 *   · 수업 내용 예시는 content/starter/2026.1 (canonical · Staging 승인 · Production 미승인).
 *
 * 문장 원칙: 짧게 · 교사가 이해하고 · 원장이 설명할 수 있고 · 학부모가 불안하지 않게.
 */

/** 기능 제공 상태 — 화면에 그대로 배지로 쓴다 */
export type Availability = "포함" | "준비 중" | "STANDARD 이상" | "계약 범위";

/* ──────────────────────────────── 01 HERO */
export const heroNarrative = {
  eyebrow: "유치원을 위한 통합예술 교육 운영 시스템",
  /** 승인된 브랜드 문장 (brandMessage.mainHeadline) — 페이지 안에서 반복하지 않는다 */
  description:
    "수업 준비부터 교사 관찰, 성장기록과 원 운영 확인까지.\nTeachAble Art Play는 한 번의 수업이 기록으로 이어지도록 설계된 교육 운영 시스템입니다.",
  /** 근거: 8주(DEC-055) · 담임교사 1인(DEC-004) · 주 1회 50분(DEC-023) · 회차별 §15 교사용 퀵 가이드 */
  proof: ["8주 STARTER 프로그램", "담임교사가 직접 운영", "주 1회 · 50분 수업", "회차별 교사용 수업 가이드"],
  ctaSecondary: { label: "8주 프로그램 보기", href: "/programs/starter" },
};

/* ──────────────────────────────── 02 WHY — 다섯 가지 문제 */
export const problemNarrative = {
  eyebrow: "WHY",
  headline: "좋은 수업은 이미 하고 있습니다.\n어려운 건 그 앞과 뒤입니다.",
  subCopy:
    "수업을 준비하고, 아이를 보고, 기록하고, 설명하고, 확인하는 일. 지금은 이 다섯 가지가 따로 움직입니다.",
  items: [
    {
      code: "A",
      moment: "수업 전",
      title: "매주 수업을 새로 준비합니다",
      body: "주제 · 그림책 · 활동 · 준비물을 회차마다 다시 찾고 맞춰야 합니다.",
    },
    {
      code: "B",
      moment: "수업 중",
      title: "아이를 볼 여유가 없습니다",
      body: "진행과 안전을 챙기다 보면 아이 한 명 한 명의 반응이 지나가 버립니다.",
    },
    {
      code: "C",
      moment: "수업 후",
      title: "기록은 또 하나의 업무입니다",
      body: "사진 · 메모 · 알림장이 흩어져 있어 수업이 끝난 뒤 다시 정리해야 합니다.",
    },
    {
      code: "D",
      moment: "학부모",
      title: "사진 말고 보여 줄 것이 없습니다",
      body: "무엇을 경험했고 어떻게 참여했는지 설명할 자료가 부족합니다.",
    },
    {
      code: "E",
      moment: "원 운영",
      title: "각 반이 어디까지 했는지 모릅니다",
      body: "진행 상황과 빠진 기록을 확인하려면 반마다 직접 물어봐야 합니다.",
    },
  ],
  answer: "TeachAble Art Play는 이 다섯 가지를 하나의 운영 흐름으로 연결합니다.",
};

/* ──────────────────────────────── 03 HOW IT WORKS — 다섯 단계 */
export const workflowNarrative = {
  eyebrow: "HOW IT WORKS",
  headline: "수업에서 운영 확인까지,\n하나의 흐름으로 이어집니다.",
  steps: [
    {
      no: "01",
      title: "수업",
      lead: "회차별 수업안으로 준비합니다",
      body: "주제 · 그림책 · 준비물 · 진행 순서 · 발문이 한 회차에 정리되어 있어 담임교사가 바로 수업할 수 있습니다.",
      icon: "book",
    },
    {
      no: "02",
      title: "관찰",
      lead: "무엇을 볼지 알고 들어갑니다",
      body: "회차마다 관찰 포인트와 ‘기록에 담을 것’이 정해져 있습니다.",
      icon: "eye",
    },
    {
      no: "03",
      title: "기록",
      lead: "짧게 남깁니다",
      body: "아이의 말과 행동을 짧게 적고, 성장 지표 다섯 가지 중 해당하는 것만 고릅니다.",
      icon: "pencil",
    },
    {
      no: "04",
      title: "교사 확인",
      lead: "공유는 교사가 정합니다",
      body: "주간 리포트는 교사가 직접 확인하고 완료해야 공유 대상이 됩니다. 자동으로 발행되지 않습니다.",
      icon: "check",
      availability: "준비 중" as Availability,
      availabilityNote: "주간 리포트 출시 준비 중",
    },
    {
      no: "05",
      title: "운영 확인",
      lead: "원장은 원 전체를 봅니다",
      body: "오늘 수업, 반별 진행, 빠진 출결 · 관찰 기록을 원 단위로 확인합니다.",
      icon: "grid",
      availability: "STANDARD 이상" as Availability,
      availabilityNote: "원장 대시보드 · STANDARD · PREMIUM",
    },
  ],
};

/* ──────────────────────────────── 04 ONE SESSION — DEC-023 표준 수업 골격 */
export const sessionNarrative = {
  eyebrow: "ONE SESSION",
  headline: "한 번의 수업은 50분,\n담임교사 한 명이 운영합니다.",
  subCopy:
    "모든 회차가 같은 6단계 골격을 따릅니다. 외부 강사 없이, 수업안 한 장으로 진행할 수 있도록 설계했습니다.",
  /** DEC-023 (STARTER 표준화 규격 v1.0 §2) — 6주차만 핵심활동 15 · 미술 15 */
  steps: [
    { title: "도입", minutes: 5, detail: "오늘의 이야기로 마음 열기" },
    { title: "그림책", minutes: 8, detail: "마음동화 · E-BOOK 함께 읽기" },
    { title: "활동 약속", minutes: 2, detail: "움직이기 전 약속 확인" },
    { title: "핵심활동", minutes: 20, detail: "몸으로 경험하는 탐험 · 놀이" },
    { title: "미술 · 창작", minutes: 10, detail: "주제를 작품으로 표현하기" },
    { title: "마무리", minutes: 5, detail: "작품 나누고 오늘 돌아보기" },
  ],
  workbookNote: "워크북은 50분과 별도로 10분 운영합니다.",
  support: [
    {
      phase: "수업 전",
      items: ["오늘의 목표 한 장 요약", "준비물 · 공간 · 안전 확인", "권장 시간표"],
    },
    {
      phase: "수업 중",
      items: ["단계별 진행안과 교사 멘트", "이런 상황이 생기면 (대응 가이드)", "마무리 대화"],
    },
    {
      phase: "수업 후",
      items: ["관찰 포인트와 기록 예시", "가정연계 안내", "출결 · 관찰 기록"],
    },
  ],
};

/* ──────────────────────────────── 05 CONTENT — 이야기 · 몸 · 표현 · 기록 */
export const contentNarrative = {
  eyebrow: "CONTENT",
  headline: "하나의 주제가\n이야기 · 몸 · 표현으로 이어집니다.",
  subCopy:
    "콘텐츠를 많이 주는 것이 목적이 아닙니다. 한 회차의 그림책 · 신체활동 · 미술 · 워크북이 같은 주제로 묶여 있습니다.",
  chain: [
    { verb: "이야기를 만나고", materials: "마음동화 · E-BOOK" },
    { verb: "몸으로 경험하고", materials: "VOD · 활동 음원" },
    { verb: "손으로 표현하고", materials: "미술 · 창의활동 교구 · 워크북" },
    { verb: "기록으로 남깁니다", materials: "관찰 포인트 · 교사 기록" },
  ],
  /** 예시 주차 — canonical W4 (manifest.json) 에서 읽는다 */
  exampleWeek: 4,
  mediaNote: "E-BOOK · VOD · 음원은 수업 자료로 제공됩니다. 플랫폼 안 재생 기능은 준비 중입니다.",
  nuriNote: "주차마다 누리과정 영역과의 연결을 수업안에 표시합니다.",
};

/* ──────────────────────────────── 06 8-WEEK JOURNEY */
export const journeyNarrative = {
  eyebrow: "STARTER · 8주",
  headline: "8주가 하나의 이야기로 이어집니다.",
  subCopy:
    "처음 3주는 나와 우리 반을 알아 가고, 4~7주에 만든 작품은 마지막 주 ‘우리 반 숲’ 현수막으로 모입니다.",
  cta: { label: "8주 전체 수업 보기", href: "/programs/starter" },
};

/* ──────────────────────────────── 07 GROWTH RECORD */
export const growthNarrative = {
  eyebrow: "GROWTH RECORD",
  headline: "얼마나 잘했는지가 아니라,\n어떤 도움이 필요했는지를 남깁니다.",
  subCopy:
    "성장 지표는 점수나 발달 수준이 아닙니다. 그 활동에서 아이가 어떻게 참여했는지를 교사가 관찰해 고르는 기록입니다.",
  /** growth_metrics seed (m2_fact_backfill_reference_seed.sql) 와 같은 이름 · 순서 */
  metrics: ["표현 다양성", "형태 · 공간 구성", "창의적 시도", "활동 참여 · 몰입", "자기 설명 · 소통"],
  /** src/types/staff-observation.ts GrowthStage */
  stages: [
    { label: "함께", meaning: "교사나 친구와 함께 했어요" },
    { label: "보고 나서", meaning: "시범을 보고 해 봤어요" },
    { label: "스스로", meaning: "스스로 시작했어요" },
  ],
  rules: [
    "단계는 오르내릴 수 있습니다. 같은 아이의 지난 기록과만 나란히 봅니다.",
    "다른 아이와 비교하거나 평균 · 순위를 내지 않습니다.",
    "기록하지 않은 주는 ‘기록 없음’일 뿐, 실패가 아닙니다.",
  ],
  /** content/starter/2026.1/week-01.txt §12 첫 항목 (canonical) */
  guideExample: {
    week: 1,
    focus: "환경 적응",
    look: "새로운 공간에 관심을 보이고 자기 방식으로 탐색하는가",
    write: "머문 공간 · 관심을 보인 사물 · 탐색 방식",
  },
  ai: {
    title: "AI는 정리를 돕는 도구일 뿐입니다",
    body: "교사가 쓴 기록을 정리하는 보조 기능으로만 준비하고 있습니다. 아이를 진단하거나 점수를 매기지 않고, 교사 확인 없이 발행하지 않습니다. STARTER에는 포함되지 않습니다.",
    availability: "준비 중" as Availability,
  },
};

/* ──────────────────────────────── 08 ROLES */
export const rolesNarrative = {
  eyebrow: "FOR EVERYONE",
  headline: "교사 · 원장 · 학부모에게\n각자 필요한 만큼만.",
  roles: [
    {
      key: "teacher",
      label: "교사",
      title: "수업을 만드는 시간보다,\n아이를 보는 시간에 집중합니다.",
      items: ["회차별 수업안", "진행 순서와 발문", "준비물 · 안전 확인", "관찰 포인트", "기록 예시"],
      availability: "포함" as Availability,
      note: null,
    },
    {
      key: "director",
      label: "원장",
      title: "각 반이 어디까지 진행됐는지,\n한 화면에서 확인합니다.",
      items: ["반별 오늘 수업 · 진행 현황", "수업 이력", "빠진 출결 · 관찰 기록", "완료된 주간 리포트", "학부모 공개 범위 관리"],
      availability: "계약 범위" as Availability,
      note: "원장 대시보드(빠진 기록 확인)는 STANDARD · PREMIUM에 포함됩니다.",
    },
    {
      key: "parent",
      label: "학부모",
      title: "결과만이 아니라,\n아이의 말과 과정을 전합니다.",
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
  subCopy:
    "꾸민 숫자가 아니라 실제 운영 기록에서 나온 것만 보여 줍니다. 오늘 할 일 → 진행 → 빠진 기록 순서로 읽힙니다.",
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

/* ──────────────────────────────── 10 PRICING (상단 안내) */
export const pricingNarrative = {
  eyebrow: "PACKAGES",
  headline: "운영 규모와 기간에 따라\n시작할 수 있습니다.",
  subCopy:
    "가격보다 먼저, 우리 원이 어디서 시작하면 좋은지 확인해 보세요. 포함 범위와 최종 조건은 상담 · 계약 시 확정됩니다.",
  fitEyebrow: "어떤 원에 맞나요?",
  fits: [
    { packageId: "starter", situation: "처음 도입하는 원", detail: "8주 동안 수업과 기록이 우리 원에 맞는지 확인합니다." },
    { packageId: "standard", situation: "한 학기 정규 운영", detail: "16주 한 학기 과정에 원장 대시보드가 함께 포함됩니다." },
    { packageId: "premium", situation: "장기 운영", detail: "24주 과정으로 원의 대표 교육과정을 만듭니다." },
  ],
};

/* ──────────────────────────────── 11 ADOPTION — 실제 도입 절차 (DEC-061 · admin-flow) */
export const adoptionNarrative = {
  eyebrow: "ONBOARDING",
  headline: "도입은 다섯 단계면 충분합니다.",
  steps: [
    { no: "01", title: "상담 · 20분 데모", body: "원 현황을 듣고 교사 · 원장 화면을 직접 보여 드립니다." },
    { no: "02", title: "운영 범위 결정", body: "반 수 · 기간 · 상품을 정하고 견적을 드립니다." },
    { no: "03", title: "기관 · 반 설정", body: "계약 후 본사가 기관 · 반 · 프로그램을 설정합니다." },
    { no: "04", title: "교사 온보딩", body: "원장 · 교사 계정을 초대하고 첫 수업을 함께 준비합니다." },
    { no: "05", title: "첫 수업", body: "1주차 수업안으로 담임교사가 수업을 시작합니다." },
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
    { title: "판단하지 않습니다", body: "AI도 시스템도 아이를 진단 · 평가하거나 점수를 매기지 않습니다." },
    { title: "교사가 완료해야 공유됩니다", body: "교사가 직접 확인하고 완료한 기록만 공유 대상이 됩니다." },
    { title: "공개 범위는 원이 정합니다", body: "원장은 학부모 공개를 숨기거나 다시 열 수 있고, 그 사유가 남습니다." },
    { title: "사진은 동의 범위 안에서만", body: "사진 활용 동의는 원장이 기록하고, 교사는 동의된 사진만 고릅니다." },
    { title: "필요한 사람만 봅니다", body: "본사 영업 담당자는 아이 개인 정보와 기록을 볼 수 없습니다." },
    { title: "보관 · 파기는 계약으로", body: "보관 기간과 종료 후 이관 · 파기 기준은 계약 시 서면으로 확정합니다." },
  ],
};

/* ──────────────────────────────── 13 FINAL CTA */
export const finalNarrative = {
  headline: "수업은 끝나도,\n아이의 과정은 기록으로 남습니다.",
  subCopy: "20분이면 교사 화면과 원장 화면을 직접 확인할 수 있습니다.",
};
