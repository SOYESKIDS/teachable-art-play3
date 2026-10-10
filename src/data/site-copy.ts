

/**
 * PHASE CONTENT-FINAL: 화면에서 쓰지 않는 예전 섹션 copy(64개)를 지웠다.
 * 그 안에 출시 상태와 맞지 않는 문구(AI 성장기록 · AI 초안 · 주간·월간·학기 성장기록 등)가 있어
 * 다음 작업자가 다시 가져다 쓰지 않게 한다. 홈 문구의 원본은 src/data/home-narrative.ts,
 * copy 규칙은 docs/06-ux-design/final-content-system.md.
 */

/** 기획서 5번: 브랜드 핵심 메시지 */
export const brandMessage = {
  mainHeadline: "아이의 놀이를,\n성장 이야기로 기록합니다.",
  subHeadline:
    "담임교사가 운영하고, 수업 이후의 성장기록까지 이어지는 유치원 통합예술 교육 운영 시스템",
  /**
   * Footer 마감 문장 — 해결형 (운영자 확정 2026-10-09).
   * 예전 "활동은 남습니다. 성장은 남지 않습니다."는 문제 제기 문장이라 결론처럼 읽혔다.
   */
  coreMessage: "활동을 넘어, 성장을 남깁니다.",
};

/**
 * PUBLIC LAUNCH-01: 공개 홈페이지에서는 온라인 구매/결제/공개 신청 폼을 노출하지 않는다.
 * 기존 CTA 자리에는 클릭 동작이 없는 안내 문구만 표시한다.
 */
export const publicNotice = {
  pricing: "기관 규모와 운영조건에 따른 최종 도입 조건은 20분 데모와 담당자 상담에서 안내드립니다.",
  pilot: "파일럿 운영 조건은 담당자 상담을 통해 안내드립니다.",
  demo: "실제 화면은 20분 데모에서 직접 보여드립니다.",
};

/**
 * CTA 라벨.
 *
 * ★ PHASE CONTENT-FINAL: 홈페이지의 Primary conversion 은 "도입 상담 신청"(consult) 하나다.
 *   Hero · Header · Mobile Sticky · 상품 카드 · Final CTA 가 같은 문구를 쓴다.
 *   20분 데모 · 4주 파일럿은 도입 안내 섹션의 다음 단계로 둔다.
 */
export const ctaLabels = {
  consultApply: "도입 상담 신청",
  demo: "20분 데모 신청",
  pilot: "4주 파일럿 문의",
  consult: "도입 상담",
  primary: "도입 상담 신청",
  secondary: "8주 프로그램 보기",
  tertiary: "기관 맞춤 상담",
  selectProduct: "이 상품 선택하기",
  purchase: "구매하기",
  contact: "도입 상담 문의",
};

/** 기획서 23번: 헤더 내비게이션 (아직 없는 개별 라우트로 연결하지 않도록 전부 홈페이지 앵커로 구성) */
export const navigation = [
  { label: "운영 흐름", href: "#solution" },
  { label: "한 번의 수업", href: "#program" },
  { label: "8주 프로그램", href: "#journey" },
  { label: "성장기록", href: "#growth-record" },
  { label: "상품", href: "#pricing" },
  { label: "도입 안내", href: "#adoption" },
  { label: "문의", href: "#contact" },
];

/** Lead Form(4개 Type) 전용 Headline/설명 */
export const leadFormCopy = {
  pilot: {
    headline: "4주 파일럿 문의",
    description:
      "1~2개 반에서 담임교사가 직접 4주를 운영해 보고 결정하는 과정입니다. 운영 조건은 상담 시 안내해 드립니다.",
  },
  demo: {
    headline: "20분 데모 신청",
    description:
      "교사 수업 화면 · 관찰 기록 흐름 · 원장 운영 화면을 20분 안에 직접 확인하실 수 있습니다. 진행 방식은 담당자가 연락드려 정합니다.",
  },
  consult: {
    headline: "기관 맞춤 도입 상담",
    description: "원의 규모와 운영 목적에 맞는 TeachAble Art Play 도입방법을 안내합니다.",
  },
  purchase_interest: {
    headline: "상품 도입 신청",
    description:
      "선택하신 상품을 기준으로 담당자가 견적과 계약 방법을 안내해 드립니다.",
  },
};

/** PURCHASE / CONSULT Section 전용 카피 */
export const purchaseCopy = {
  headline: "우리 원의 상황에 맞는 방식으로\n시작하세요.",
  direct: {
    title: "상품을 선택하고\n도입 절차를 시작하세요.",
    description: "상품과 운영기간이 정해진 기관은 기관정보를 입력하고 도입 절차를 시작할 수 있습니다.",
    cta: "상품 선택하기",
    flow: ["상품", "기관정보", "주문", "결제", "구독 활성화"],
  },
  consult: {
    title: "우리 원에 맞는 상품을\n상담받고 싶으신가요?",
    description: "원아 수 · 반 수 · 운영기간에 맞춰 기관 맞춤 도입을 안내합니다.",
    cta: ctaLabels.tertiary,
    flow: ["상담 신청", "담당자 확인", "견적", "계약", "결제"],
  },
};

/** FINAL CTA Section 전용 카피 */
export const finalCtaCopy = {
  headline: "아이의 하루가 기록이 되고,\n기록이 성장 이야기가 되도록.",
  subCopy: "TeachAble Art Play",
};

/** Footer 전용: 연락처 (실제 확정된 정보만 사용) */
export const contactInfo = {
  phone: "02-303-4420",
  email: "soyes2013@gmail.com",
  website: "www.soyes.kr",
  copyright: "© SOYE KIDS Co., Ltd.",
};

/**
 * 법적 고지 링크.
 *
 * 지금까지는 문자열 배열이라 Footer 가 "준비 중입니다"라는 제목만 달고
 * 누를 수 없는 글자로 그리고 있었다. 실제 문서가 생겼으므로 경로를 함께 둔다.
 */
export const legalLinks: { label: string; href: string }[] = [
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
];

/**
 * CONTACT Section 전용 카피.
 * mailto / 메일 보내기 등 바로가기 동작 없이 연락처를 텍스트로만 표기한다.
 */
export const contactSectionCopy = {
  eyebrow: "TEACHABLE ART PLAY",
  headline: finalCtaCopy.headline,
  description:
    "한 학기 전체를 결정하기 전에,\n20분만 실제 화면을 확인해 보세요.",
  channels: [
    { label: "TEL", value: contactInfo.phone },
    { label: "E-MAIL", value: contactInfo.email },
  ],
  note: "전화와 이메일로도 도입 상담을 신청하실 수 있습니다.",
};

