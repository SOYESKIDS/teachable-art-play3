import type {
  AdoptionStep,
  AIFlowStep,
  AIPrincipleItem,
  BenefitItem,
  ClassStep,
  ContentItem,
  CoreSolution,
  CoreSolutionFlowStep,
  DashboardCallout,
  DashboardRecentReport,
  DirectorKpi,
  GrowthExamplePoint,
  GrowthObservationItem,
  PlatformTab,
  ProblemStatement,
  SafeOperationPrinciple,
  StakeholderValue,
  TeacherSupportPhase,
  ThreeNeedItem,
  ValueItem,
} from "@/types/content";

/** 기획서 5번: 브랜드 핵심 메시지 */
export const brandMessage = {
  mainHeadline: "아이의 놀이를,\n성장 이야기로 기록합니다.",
  subHeadline:
    "누리과정 연계 수업 콘텐츠부터 교사 운영, AI 성장기록, 학부모 리포트, 원장 대시보드까지 하나로 연결한 유치원 교육 운영 플랫폼",
  coreMessage:
    "놀이가 끝나면 사진만 남는 것이 아니라, 아이의 성장 이야기가 남습니다.",
};

/** 기획서 6번: 유치원이 겪는 3가지 문제 (WHY NOW Section) */
export const problemStatements: ProblemStatement[] = [
  {
    order: 1,
    title: "수업은 매주 진행되지만 교육자산으로 남기 어렵습니다.",
    description:
      "수업안·활동·작품은 매주 쌓이지만 학기 전체의 교육 흐름으로 연결하기 어렵습니다.",
  },
  {
    order: 2,
    title: "사진은 계속 쌓이지만 아이의 변화를 설명하기 어렵습니다.",
    description:
      "활동사진은 많아져도 무엇을 경험했고 표현이 어떻게 달라졌는지는 한눈에 확인하기 어렵습니다.",
  },
  {
    order: 3,
    title: "교사는 기록하고 있지만 상담 때 다시 자료를 만들어야 합니다.",
    description:
      "알림장·사진·메모가 흩어져 있어 학부모 상담 시즌마다 다시 정리해야 합니다.",
  },
];

export const problemStatement = {
  problem:
    "문제는 좋은 수업이 없는 것이 아닙니다. 좋은 수업이 아이의 성장기록으로 연결되지 않는 것입니다.",
  answer:
    "한 번의 수업이 아이의 경험에서 끝나지 않고, 교사의 기록과 학부모 소통, 유치원의 교육자산으로 이어집니다.",
};

/** WHY NOW Section 전용 카피 */
export const whyCopy = {
  eyebrow: "WHY TEACHABLE ART PLAY",
  headline: "좋은 수업은 진행되고 있지만,\n아이의 성장기록은 남지 않습니다.",
  subCopy: problemStatement.problem,
  insight: "수업의 부족이 아니라, 좋은 수업이 성장기록으로 연결되지 않는 것이 문제입니다.",
};

/** 기획서 7번: 이해관계자 가치 */
export const stakeholderValues: StakeholderValue[] = [
  {
    role: "director",
    label: "원장",
    question: "우리 원의 교육을 어떻게 차별화할까?",
    values: ["교육과정 가시화", "교육품질 표준화", "학부모 신뢰", "상담자료", "유치원 브랜드 차별화"],
  },
  {
    role: "teacher",
    label: "교사",
    question: "준비와 기록을 조금 더 쉽게 할 수 없을까?",
    values: ["준비된 수업", "발문", "재료", "관찰 포인트", "간편한 기록", "AI 초안", "반복 업무 감소"],
  },
  {
    role: "parent",
    label: "학부모",
    question: "우리 아이가 어떻게 성장하고 있나요?",
    values: ["오늘의 활동", "아이 작품", "아이의 말", "교사 관찰", "변화 흐름", "가정연계"],
  },
  {
    role: "child",
    label: "아이",
    values: ["이야기", "탐색", "창의적 표현", "지속적인 경험", "자기 설명", "자기표현의 습관"],
  },
];

/** THREE NEEDS Section 전용 카피 */
export const threeNeedsCopy = {
  headline:
    "원장·교사·학부모가 원하는 것은 다르지만,\n하나의 교육 흐름으로 연결할 수 있습니다.",
};

/** THREE NEEDS Section 전용: 원장·교사·학부모 3개 Persona */
export const threeNeeds: ThreeNeedItem[] = [
  {
    role: "director",
    label: "원장",
    question: "우리 원의 교육을\n어떻게 차별화할까?",
    needs: ["교육 품질 가시화", "유치원 브랜드", "학부모 신뢰"],
  },
  {
    role: "teacher",
    label: "담임교사",
    question: "준비와 기록을\n조금 더 쉽게 할 수 없을까?",
    needs: ["준비된 수업", "쉬운 기록", "반복업무 감소"],
  },
  {
    role: "parent",
    label: "학부모",
    question: "우리 아이가\n어떻게 성장하고 있나요?",
    needs: ["오늘의 활동", "시간에 따른 변화", "가정 연계"],
  },
];

/** 기획서 4번: 5대 핵심상품 */
export const coreSolutions: CoreSolution[] = [
  {
    code: "CORE 01",
    title: "수업 콘텐츠",
    items: ["마음동화", "EBOOK", "VOD", "활동 음원", "워크북", "미술·창의활동 키트"],
  },
  {
    code: "CORE 02",
    title: "교사 운영",
    items: ["수업안", "발문 예시", "준비물", "수업 순서", "관찰 포인트", "수업 중 가이드"],
  },
  {
    code: "CORE 03",
    title: "AI 성장기록",
    items: ["사진 분류", "기록 요약", "변화 흐름 정리", "리포트 초안"],
    description:
      "작품사진 · 활동사진 · 아이 설명 · 교사의 관찰메모를 기반으로 지원합니다.",
  },
  {
    code: "CORE 04",
    title: "학부모 리포트",
    items: ["주간 활동기록", "월간 성장 리포트", "학기 성장 포트폴리오", "가정연계 Tip"],
  },
  {
    code: "CORE 05",
    title: "원장 대시보드",
    items: [
      "반별 수업 진행",
      "콘텐츠 이용현황",
      "작품·기록 업로드 현황",
      "리포트 검토·발송 현황",
      "상담·포트폴리오 준비현황",
    ],
  },
];

/** 기획서 8번: 핵심 서비스 Flow (Hero Diagram) */
export const serviceFlow = [
  { order: 1, title: "수업 콘텐츠", detail: "마음동화 · VOD" },
  { order: 2, title: "창의활동", detail: "워크북 · 창의키트" },
  { order: 3, title: "교사 운영", detail: "발문 · 관찰 · 기록" },
  { order: 4, title: "AI 기록 정리", detail: "사진분류 · 요약 · 변화흐름 · 리포트 초안" },
  { order: 5, title: "교사 검토", detail: "활동맥락 확인 · 수정 · 승인" },
  { order: 6, title: "성장리포트", detail: "학부모 · 원장 전달" },
];

/** CORE SOLUTION Section 전용 카피 */
export const coreSolutionCopy = {
  headline: "수업 콘텐츠부터 성장 리포트까지,\n하나의 흐름으로 연결합니다.",
  subCopy:
    "TeachAble Art Play는 교재나 미술키트 하나가 아니라 수업 · 활동 · 기록 · 소통을 하나로 연결하는 유치원 교육 운영 플랫폼입니다.",
  highlight: problemStatement.answer,
  viewProgramLink: "전체 프로그램 보기",
};

/** CORE SOLUTION Section 전용: 실제 서비스가 작동하는 6-STEP Connected Journey (Hero의 5대 상품 Mini Flow와는 별개) */
export const coreSolutionFlow: CoreSolutionFlowStep[] = [
  {
    order: 1,
    code: "STEP 01",
    label: "INPUT",
    title: "마음동화 · VOD",
    description: "이야기로 주제를 엽니다.",
  },
  {
    order: 2,
    code: "STEP 02",
    label: "CREATE",
    title: "워크북 · 창의활동",
    description: "아이가 자신의 방식으로 표현합니다.",
  },
  {
    order: 3,
    code: "STEP 03",
    label: "RECORD",
    title: "교사 관찰 · 기록",
    description: "작품 · 과정 · 아이 설명 · 관찰메모를 기록합니다.",
  },
  {
    order: 4,
    code: "STEP 04",
    label: "AI ORGANIZE",
    title: "AI 기록 정리",
    description: "사진·기록을 분류하고 변화 흐름과 리포트 초안을 정리합니다.",
  },
  {
    order: 5,
    code: "STEP 05",
    label: "TEACHER REVIEW",
    title: "교사 검토",
    description: "활동 맥락을 확인하고 수정·승인합니다.",
  },
  {
    order: 6,
    code: "STEP 06",
    label: "DELIVER",
    title: "성장 리포트 · 원장 대시보드",
    description: "학부모와 원장에게 필요한 형태로 전달합니다.",
  },
];

/** 기획서 9번: AI 사용 원칙 */
export const aiPrinciple = {
  headline: "AI가 판단하지 않습니다. 교사가 최종 결정합니다.",
  flow: ["교사 입력", "AI 정리", "교사 검토", "최종 승인", "전달"],
  description:
    "AI는 작품사진, 활동사진, 아이 설명, 교사의 관찰메모 등 누적된 기록을 정리하여 시간에 따른 변화의 흐름을 교사가 확인할 수 있도록 지원하는 교육기록 보조도구입니다.",
};

/** 기획서 10번: 성장 관찰 예시 항목 (점수 아닌 변화 흐름) */
export const growthObservationItems: GrowthObservationItem[] = [
  { label: "표현 다양성" },
  { label: "형태·공간 구성" },
  { label: "창의적 시도" },
  { label: "활동 참여·몰입" },
  { label: "자기 설명·소통" },
];

/** 기획서 11번: 누리과정 연계 */
export const nuriCurriculum = {
  primary: ["예술경험", "의사소통", "사회관계"],
  secondary: ["자연탐구", "신체운동·건강"],
};

/** 기획서 12번: 50분 표준수업 */
export const classSteps: ClassStep[] = [
  {
    step: 1,
    title: "마음 열기",
    minutes: 5,
    description: "인사와 오늘의 감정 나누기",
  },
  {
    step: 2,
    title: "주제 이해",
    minutes: 10,
    description: "마음동화·VOD로 오늘의 이야기 이해",
  },
  {
    step: 3,
    title: "창의 표현 활동",
    minutes: 25,
    description: "워크북·미술·창의키트로 표현",
    isCore: true,
  },
  {
    step: 4,
    title: "작품 나눔",
    minutes: 5,
    description: "아이의 작품 설명과 교사 관찰",
  },
  {
    step: 5,
    title: "촬영·업로드",
    minutes: 5,
    description: "대표 작품·활동장면 기록",
  },
];

export const classMessage = {
  headline: "외부 전문강사 없이, 담임교사 1명이 운영할 수 있도록 설계했습니다.",
  sub: "수업안 · 발문 · 영상 · 음원 · 활동재료 · 관찰포인트까지 사전에 준비되어 있어 교사는 아이를 바라보고 관찰하는 데 집중할 수 있습니다.",
};

/** CLASS + TEACHER SUPPORT Section 전용: 수업 전/중/후 교사 지원 */
export const teacherSupportPhases: TeacherSupportPhase[] = [
  {
    id: "before",
    label: "BEFORE",
    title: "수업 전 준비",
    items: [
      { text: "수업안" },
      { text: "준비물" },
      { text: "발문" },
      { text: "관찰 포인트" },
    ],
  },
  {
    id: "during",
    label: "DURING",
    title: "수업 중 운영",
    items: [
      { text: "단계별 가이드" },
      { text: "발문" },
      { text: "관찰" },
      { text: "대표 장면 촬영" },
    ],
  },
  {
    id: "after",
    label: "AFTER",
    title: "수업 후 기록",
    items: [
      { text: "사진·관찰 메모 업로드" },
      { text: "AI 초안 정리", highlight: true },
      { text: "교사 검토·수정", highlight: true },
      { text: "학부모 공유" },
    ],
  },
];

export const teacherSupportMessage =
  "교사의 준비는 줄이고, 아이를 관찰하는 시간은 늘립니다.";

/** 기획서 25번: CTA 전략 */
export const ctaLabels = {
  primary: "4주 파일럿 신청하기",
  secondary: "대시보드 데모 보기",
  tertiary: "기관 맞춤 상담",
  selectProduct: "이 상품 선택하기",
  purchase: "구매하기",
  consult: "도입 상담",
  contact: "도입 상담 문의",
};

/**
 * PUBLIC LAUNCH-01: 공개 홈페이지에서는 온라인 구매/결제/공개 신청 폼을 노출하지 않는다.
 * 기존 CTA 자리에는 클릭 동작이 없는 안내 문구만 표시한다.
 */
export const publicNotice = {
  pricing: "기관별 도입 조건은 담당자 상담을 통해 안내드립니다.",
  pilot: "파일럿 운영 조건은 담당자 상담을 통해 안내드립니다.",
  demo: "플랫폼 화면은 담당자 미팅을 통해 직접 안내해드립니다.",
};

/** 기획서 23번: 헤더 내비게이션 (아직 없는 개별 라우트로 연결하지 않도록 전부 홈페이지 앵커로 구성) */
export const navigation = [
  { label: "서비스 소개", href: "#solution" },
  { label: "프로그램", href: "#program" },
  { label: "성장기록", href: "#growth-record" },
  { label: "대시보드", href: "#dashboard" },
  { label: "상품·가격", href: "#pricing" },
  { label: "도입안내", href: "#adoption" },
  { label: "도입문의", href: "#contact" },
];

/** VALUE Section 전용 카피 */
export const valueCopy = {
  headline: "한 번의 수업이,\n세 가지 교육자산으로 남습니다.",
  subCopy:
    "TeachAble Art Play의 한 회차는 아이의 창의 경험, 교사의 관찰기록, 유치원의 성장기록과 교육자산으로 동시에 이어집니다.",
  hub: "한 번의 수업",
};

/** VALUE Section 전용: 하나의 수업이 확장되는 3개의 Value (Keyword를 크게 보여주는 구조) */
export const valueItems: ValueItem[] = [
  {
    code: "01",
    role: "아이",
    keyword: "창의적 경험",
    description: "이야기를 듣고 재료를 탐색하며 자신의 방식으로 표현합니다.",
    accent: "soft-green",
  },
  {
    code: "02",
    role: "교사",
    keyword: "관찰기록",
    description: "수업 준비보다 아이를 관찰하고 기록하는 데 집중합니다.",
    accent: "light-blue",
  },
  {
    code: "03",
    role: "유치원",
    keyword: "성장기록 + 교육자산",
    description: "활동·작품·리포트가 학기 단위로 축적됩니다.",
    accent: "navy",
  },
];

/** CONTENT Section 전용 카피 */
export const contentCopy = {
  headline: "이야기를 이해하고,\n작품으로 표현하도록 설계했습니다.",
  subCopy:
    "마음동화 · VOD · 활동음원 · 워크북 · 창의활동 키트 · 교사용 가이드가 하나의 커리큘럼으로 연결됩니다.",
  bridgeMessage:
    "콘텐츠는 수업에서 끝나지 않습니다.\n활동과 작품이 성장기록 플랫폼으로 이어집니다.",
};

/**
 * CONTENT Section 전용: 실제 제공 콘텐츠 6종 (상단 3개를 크게, 하단 3개를 작게)
 * imagePath는 실제 제품 이미지 확보 시 해당 경로에 파일만 넣으면 되도록 미리 분리해둔 경로입니다.
 * 지금은 파일이 없으므로 컴포넌트에서 이 경로 대신 placeholderCaption을 보여줍니다.
 */
export const contentItems: ContentItem[] = [
  {
    label: "마음동화 + EBOOK",
    size: "large",
    imagePath: "/images/products/storybook.jpg",
    placeholderCaption: "마음동화 제품 이미지",
  },
  {
    label: "VOD 애니메이션",
    size: "large",
    imagePath: "/images/products/vod.jpg",
    placeholderCaption: "VOD 대표 장면",
  },
  {
    label: "워크북",
    size: "large",
    imagePath: "/images/products/workbook.jpg",
    placeholderCaption: "워크북 제품 이미지",
  },
  {
    label: "활동 음원",
    size: "small",
    imagePath: "/images/products/audio.jpg",
    placeholderCaption: "활동 음원 커버 이미지",
  },
  {
    label: "미술·창의활동 키트",
    size: "small",
    imagePath: "/images/products/kit.jpg",
    placeholderCaption: "창의활동 키트 이미지",
  },
  {
    label: "교사용 수업 가이드",
    size: "small",
    imagePath: "/images/products/guide.jpg",
    placeholderCaption: "교사용 가이드 이미지",
  },
];

/** NURI Section 전용 카피 */
export const nuriSectionCopy = {
  headline: "누리과정을 토대로,\n프로그램과 활동을 연결합니다.",
  subCopy:
    "TeachAble Art Play는 예술경험 · 의사소통 · 사회관계를 중심으로 누리과정과 연결하고, 자연탐구 · 신체운동·건강을 놀이의 맥락 안에서 함께 경험하도록 설계했습니다.",
  disclaimer:
    "AI는 누리과정을 평가하거나 아동을 진단하는 도구가 아니라, 활동과 표현의 변화 흐름을 정리하는 교육기록 보조도구입니다.",
};

/** PLATFORM PREVIEW Section 전용 카피 */
export const platformCopy = {
  headline: "수업이 끝난 뒤,\nTeachAble Art Play의 진짜 가치가 시작됩니다.",
  subCopy:
    "교사의 기록은 AI 성장기록으로 정리되고, 학부모 리포트와 원장 대시보드로 연결됩니다.",
  ctaSecondary: ctaLabels.secondary,
};

/** PLATFORM PREVIEW Section 전용: AI 성장기록 · 학부모 리포트 · 원장 대시보드 3개 Tab (전부 DEMO · 예시 데이터) */
export const platformTabs: PlatformTab[] = [
  {
    id: "ai",
    label: "AI 성장기록",
    tagline: "기록을 정리합니다.",
    demoLabel: "햇살반 · 예시 원아",
    input: ["대표 작품", "활동 과정", "아이의 말", "교사 관찰"],
    output: ["사진 분류", "기록 요약", "변화 흐름", "리포트 초안"],
  },
  {
    id: "parent",
    label: "학부모 리포트",
    tagline: "변화를 전달합니다.",
    headerLabel: "이번 주 활동",
    activityTitle: "나의 마음 색깔",
    childQuote: "기분이 좋을 때는 노란색을 칠했어요.",
    teacherComment: "색을 감정과 연결하려는 시도가 반복되었습니다.",
    homeTip: "오늘 하루 기분을 색으로 이야기해 보세요.",
    badges: ["주간", "월간", "학기 포트폴리오"],
  },
  {
    id: "director",
    label: "원장 대시보드",
    tagline: "교육과정을 관리합니다.",
    kpis: [
      { label: "반별 진행", value: "4 / 4반" },
      { label: "작품·기록 업로드", value: "87건" },
      { label: "리포트 발송", value: "100%" },
      { label: "검토 대기", value: "6건" },
    ],
    weeklyUsageLabel: "주차별 콘텐츠 이용현황",
    weeklyUsage: [58, 72, 45, 88, 66, 79],
    recentReportsLabel: "최근 리포트",
    recentReports: [
      "햇살반 · 리포트 발송 완료",
      "무지개반 · 리포트 검토 중",
      "별빛반 · 포트폴리오 준비",
    ],
    classProgressLabel: "반별 진행상태",
    classProgress: [
      { label: "햇살반", percent: 100 },
      { label: "무지개반", percent: 85 },
      { label: "별빛반", percent: 70 },
      { label: "노을반", percent: 95 },
    ],
  },
];

/** AI PRINCIPLE Section 전용 카피 */
export const aiPrincipleCopy = {
  eyebrow: "AI RECORD PRINCIPLE",
  headline: "AI는 아이를 판단하지 않고,\n변화의 흐름을 정리합니다.",
  subCopy:
    "AI는 의료적·심리적 진단도구가 아닙니다. 작품과 활동기록을 정리하고, 시간에 따른 표현의 변화 흐름을 교사가 확인할 수 있도록 지원하는 교육기록 보조도구입니다.",
  highlight: aiPrinciple.headline,
};

/** AI PRINCIPLE Section 전용: 교사 → AI → 교사 → 전달의 Human-Machine-Human 4-STEP */
export const aiFlowSteps: AIFlowStep[] = [
  {
    step: 1,
    title: "교사 입력",
    role: "교사",
    items: ["작품사진", "활동사진", "아이의 설명", "교사 관찰메모"],
    accent: "neutral",
  },
  {
    step: 2,
    title: "AI 정리",
    role: "AI",
    items: ["사진 분류", "기록 요약", "변화 흐름 정리", "리포트 초안"],
    accent: "ai",
  },
  {
    step: 3,
    title: "교사 검토",
    role: "교사",
    items: ["활동 맥락 확인", "코멘트 수정·보완", "아이 상황 확인", "최종 승인"],
    accent: "review",
  },
  {
    step: 4,
    title: "전달",
    role: "학부모 · 원장",
    items: ["주간 활동기록", "월간 성장 리포트", "학기 성장 포트폴리오", "원장 대시보드"],
    accent: "neutral",
  },
];

/** AI PRINCIPLE Section 전용: AI 기록 4가지 원칙 */
export const aiPrincipleItems: AIPrincipleItem[] = [
  {
    order: 1,
    title: "진단하지 않습니다.",
    description: "의료적·심리적 진단도구가 아닙니다.",
  },
  {
    order: 2,
    title: "작품 한 장으로 판단하지 않습니다.",
    description: "색상 하나나 특정 작품만으로 아이를 규정하지 않습니다.",
  },
  {
    order: 3,
    title: "누적된 기록의 흐름을 봅니다.",
    description: "초기와 최근의 변화 흐름을 중심으로 정리합니다.",
  },
  {
    order: 4,
    title: "교사가 검토·승인합니다.",
    description: "교사의 관찰과 활동 맥락이 최종 리포트에 반영됩니다.",
  },
];

/** BEFORE/AFTER + GROWTH Section 전용 카피 */
export const growthCopy = {
  headline: "사진이 기록으로,\n기록이 성장 이야기로 바뀝니다.",
  subCopy:
    "완성된 작품 한 장만 남기는 것이 아니라, 활동 과정 · 아이의 말 · 교사의 관찰을 함께 쌓아 시간에 따른 변화 흐름을 기록합니다.",
  transitionCaption: "놀이가 사진에서 성장기록으로",
};

export const growthBefore = {
  label: "BEFORE",
  sublabel: "기존 알림장 · 활동기록 예시",
  caption: "오늘 미술활동 즐겁게 참여했어요.",
  problems: [
    "사진 1~2장",
    "짧은 활동 문구",
    "활동 과정의 맥락 부족",
    "학기 전체 변화 확인 어려움",
  ],
};

export const growthAfter = {
  label: "AFTER",
  sublabel: "TeachAble Art Play Growth Record",
  artworkCaption: "대표 작품 · 활동 과정",
  childQuote: "노란색이 기분 좋은 색이라서 많이 사용했어요.",
  teacherComment: "색을 감정과 연결해 설명하는 표현이 반복적으로 나타났습니다.",
};

/** GROWTH Section 전용: 3월→6월 변화 예시 (반드시 DEMO 표기 유지) */
export const growthExample: { before: GrowthExamplePoint; after: GrowthExamplePoint } = {
  before: { label: "3월 · 초기", text: "한두 가지 색을 중심으로 표현" },
  after: {
    label: "6월 · 최근",
    text: "여러 색을 조합하고 자신의 선택 이유를 설명",
  },
};

export const growthExampleDemoNote = "DEMO · 이해를 돕기 위한 예시 기록";

/** PARENT REPORT Section 전용 카피 */
export const parentReportCopy = {
  headline: "활동사진을 보여주는 것에서,\n아이의 변화를 설명하는 것으로.",
  subCopy:
    "학부모는 사진 한 장이 아니라, 우리 아이가 무엇을 경험하고 어떻게 표현이 달라지고 있는지 이해할 수 있는 설명을 받습니다.",
};

/** PARENT REPORT Section 전용: 스마트폰 Mockup DEMO 데이터 */
export const parentReportDemo = {
  weekLabel: "WEEK 03",
  headerLabel: "이번 주 활동",
  activityTitle: "나의 마음 색깔",
  childQuote: "기분이 좋을 때는 노란색을 칠했어요.",
  teacherComment: "색을 감정과 연결하려는 표현이 이번 활동에서 반복되었습니다.",
  changeNote:
    "초기에는 한 가지 색을 주로 사용했지만 최근에는 여러 색을 조합하여 표현합니다.",
  homeTip: "오늘 하루의 기분을 색으로 이야기해 보세요.",
};

/** PARENT REPORT Section 전용: 보조 Content 5개 (AI는 전면 노출하지 않음) */
export const parentReportInfoItems = [
  { order: 1, label: "오늘의 활동" },
  { order: 2, label: "아이의 작품" },
  { order: 3, label: "아이의 설명" },
  { order: 4, label: "교사 관찰" },
  { order: 5, label: "가정연계 Tip" },
];

/** PARENT REPORT Section 전용: 리포트 제공 주기 (패키지별 포함범위는 Pricing에서 별도 설명) */
export const reportCadence = [
  { id: "weekly", label: "WEEKLY", title: "주간 활동기록" },
  { id: "monthly", label: "MONTHLY", title: "월간 성장 리포트" },
  { id: "semester", label: "SEMESTER", title: "학기 성장 포트폴리오" },
];

/** DIRECTOR DASHBOARD Section 전용 카피 */
export const dashboardCopy = {
  headline: "개별 아이의 기록을 넘어,\n유치원 전체 운영을 한눈에.",
  subCopy:
    "아이를 점수로 관리하는 화면이 아니라, 교육과정을 안정적으로 운영하기 위한 원장·교사 관리 도구입니다.",
};

/** DIRECTOR DASHBOARD Section 전용: Demo UI 데이터 (전부 예시 데이터) */
export const dashboardSidebarItems = [
  "홈 · 반별 개요",
  "콘텐츠 이용",
  "작품·기록",
  "리포트 관리",
  "리포트 출력",
  "교사 지원",
];

export const dashboardKpis: DirectorKpi[] = [
  { label: "반별 수업 진행", value: "4 / 4반 완료" },
  { label: "작품·기록 업로드", value: "87건" },
  { label: "리포트 발송", value: "100%" },
  { label: "검토 대기", value: "6건" },
];

export const dashboardWeeklyUsageLabel = "주차별 콘텐츠 이용 현황";
export const dashboardWeeklyUsage = [52, 68, 74, 60, 85, 70, 90, 78];

export const dashboardRecentReportsLabel = "최근 리포트";
export const dashboardRecentReports: DashboardRecentReport[] = [
  { label: "햇살반", status: "완료" },
  { label: "달빛반", status: "완료" },
  { label: "별빛반", status: "검토중" },
  { label: "숲속반", status: "완료" },
];

export const dashboardCallouts: DashboardCallout[] = [
  { order: 1, text: "반별 수업 진행을 확인합니다." },
  { order: 2, text: "리포트 검토·발송 현황을 확인합니다." },
  { order: 3, text: "상담과 포트폴리오 자료를 관리합니다." },
];

export const dashboardTeacherValue = {
  director: "교육과정을 가시화합니다.",
  teacher: "수업 운영을 단순화합니다.",
};

/** FOUR BENEFITS Section 전용 카피 (THREE NEEDS=도입 전 고민 / 이 Section=도입 후 기대되는 변화) */
export const benefitsCopy = {
  headline: "하나의 플랫폼,\n네 가지 변화.",
  subCopy:
    "TeachAble Art Play는 원장 · 교사 · 학부모 · 아이에게 각기 다른 방식의 가치를 제공합니다.",
};

/** FOUR BENEFITS Section 전용: 도입 시 기대되는 변화 4가지 (실적·성과 단정 표현 없음) */
export const benefitItems: BenefitItem[] = [
  {
    code: "01 FOR DIRECTOR",
    role: "원장",
    tag: "교육 차별화",
    description: "수업 · 기록 · 리포트를 원의 교육자산으로 축적합니다.",
    keywords: ["교육과정 가시화", "브랜드 차별화", "상담자료 확보"],
    accent: "pale-yellow",
  },
  {
    code: "02 FOR TEACHER",
    role: "담임교사",
    tag: "업무 단순화",
    description: "준비된 수업과 기록 지원으로 아이를 관찰하는 데 집중합니다.",
    keywords: ["준비 표준화", "기록 간소화", "관찰기록 축적"],
    accent: "light-blue",
  },
  {
    code: "03 FOR PARENT",
    role: "학부모",
    tag: "성장 이해",
    description: "사진이 아니라 아이의 변화 이야기를 확인합니다.",
    keywords: ["활동 이해", "변화 확인", "가정 연계"],
    accent: "soft-coral",
  },
  {
    code: "04 FOR CHILD",
    role: "아이",
    tag: "자기표현 확장",
    description: "이야기 · 탐색 · 표현 · 설명의 경험이 지속적으로 이어집니다.",
    keywords: ["창의 경험", "자기표현", "작품 설명"],
    accent: "soft-green",
  },
];

/** SAFE OPERATION Section 전용 카피 */
export const safeOperationCopy = {
  headline: "아이의 기록은 더 세심하게,\n활용은 더 안전하게.",
  subCopy:
    "TeachAble Art Play는 AI가 아이를 직접 판단하는 구조가 아니라 교사가 기록을 확인하고 승인하는 방식으로 운영됩니다.",
  reconnect: aiPrinciple.headline,
};

/** SAFE OPERATION Section 전용: 4가지 운영 원칙 (확정되지 않은 보관기간·인증 등은 다루지 않음) */
export const safeOperationPrinciples: SafeOperationPrinciple[] = [
  { order: 1, text: "AI는 진단·점수화하지 않습니다." },
  { order: 2, text: "교사가 최종 검토·승인합니다." },
  { order: 3, text: "기관·사용자별 접근권한을 관리합니다." },
  { order: 4, text: "학부모에게는 승인된 기록만 제공합니다." },
];

/** PRICING & PACKAGES Section 전용 카피 */
export const pricingCopy = {
  headline: "우리 원의 운영기간과 목적에 맞게\n선택하세요.",
  subCopy:
    "첫 도입을 위한 8주, 한 학기 운영을 위한 16주, 성장기록과 대시보드까지 확장하는 24주 프로그램을 제공합니다.",
};

/** Lead Form(4개 Type) 전용 Headline/설명 */
export const leadFormCopy = {
  pilot: {
    headline: "4주 파일럿 신청",
    description:
      "정규 도입 전, TeachAble Art Play의 수업 운영과 성장기록 흐름을 먼저 경험해 보세요.",
  },
  demo: {
    headline: "대시보드 데모 요청",
    description:
      "원장·교사 대시보드가 실제로 어떤 방식으로 운영되는지 온라인 데모를 요청하세요.",
  },
  consult: {
    headline: "기관 맞춤 도입 상담",
    description: "원의 규모와 운영 목적에 맞는 TeachAble Art Play 도입방법을 안내합니다.",
  },
  purchase_interest: {
    headline: "상품 도입 신청",
    description:
      "선택하신 상품으로 도입 절차를 진행합니다. 담당자가 확인 후 계약 방법을 안내해 드립니다.",
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

/** ADOPTION PROCESS Section 전용 카피 */
export const adoptionCopy = {
  headline: "도입은 어렵지 않습니다.",
  subCopy: "상담부터 운영까지 5단계로 시작합니다.",
};

export const adoptionSteps: AdoptionStep[] = [
  { order: 1, title: "기관 상담", description: "현황 · 목표 · 규모 확인" },
  { order: 2, title: "상품 선택", description: "8주 · 16주 · 24주" },
  { order: 3, title: "교사 온보딩", description: "플랫폼 · 수업 운영 안내" },
  { order: 4, title: "프로그램 운영", description: "주 1회 표준수업" },
  { order: 5, title: "리뷰 · 정규 운영", description: "파일럿 또는 계약 이후 운영 검토" },
];

/** FINAL CTA Section 전용 카피 */
export const finalCtaCopy = {
  headline: "유치원의 놀이를,\n아이의 성장 이야기로 바꿔보세요.",
  subCopy:
    "수업 콘텐츠부터 성장기록과 학부모 소통까지, TeachAble Art Play로 시작할 수 있습니다.",
};

/** Footer 전용: 연락처 (실제 확정된 정보만 사용) */
export const contactInfo = {
  phone: "02-303-4420",
  email: "soyes@soyesai.com",
  website: "www.soyes.kr",
  copyright: "© SOYE KIDS Co., Ltd.",
};

export const legalLinks = ["개인정보처리방침", "이용약관"];

/**
 * CONTACT Section 전용 카피.
 * mailto / 메일 보내기 등 바로가기 동작 없이 연락처를 텍스트로만 표기한다.
 */
export const contactSectionCopy = {
  eyebrow: "CONTACT",
  headline: "TeachAble Art Play 도입 상담",
  description:
    "우리 원의 규모와 운영 목적에 맞는\nTeachAble Art Play 도입 방법을\nSOYESKIDS 담당자가 직접 안내해드립니다.",
  channels: [
    { label: "TEL", value: contactInfo.phone },
    { label: "E-MAIL", value: contactInfo.email },
  ],
  note: "상품 도입 및 기관 상담은\n담당자와 사전 미팅을 통해 안내드립니다.",
};

/** Hero 전용: 5대 핵심상품 Mini Flow (CoreSolution의 상세 6-STEP과는 별개, coreSolutions 5개를 순서대로 재사용) */
export const heroFlowSteps = coreSolutions.map((solution, index) => ({
  order: index + 1,
  title: solution.title,
}));

/** Hero 전용: 원장이 5초 안에 확인할 수 있는 작은 신뢰 정보 3개 (검증되지 않은 수치는 넣지 않음) */
export const heroMicroProof = [
  "누리과정 연계",
  "담임교사 1인 운영",
  "주간·월간·학기 성장기록",
];

/** Hero Section 전용 카피 */
export const heroCopy = {
  eyebrow: "SOYESKIDS · KINDERGARTEN EDTECH",
  brandName: "TeachAble Art Play",
  headline: brandMessage.mainHeadline,
  subCopy: brandMessage.subHeadline,
  supportingMessage: brandMessage.coreMessage,
  ctaPrimary: ctaLabels.primary,
  ctaSecondary: "서비스 한눈에 보기",
  visualHeading: "수업 사진 · 성장기록 UI",
  visualPlaceholderNote: "실제 이미지 준비 중",
  visualBadge: "원장 대시보드 연동",
  demoCard: {
    badge: "DEMO · 예시 화면",
    title: "이번 주 성장기록",
    items: [
      { label: "대표 작품", value: "가을 나무 그리기" },
      { label: "아이의 말", value: "알록달록하게 칠했어요" },
      { label: "교사 관찰", value: "색 조합에 대한 관심이 확장되었습니다" },
    ],
  },
};

/** 기획서 16번: 가격 미확정 사항 안내 문구 */
export const pricingDisclaimer =
  "기관 규모 및 운영조건에 따라 달라질 수 있습니다. 세부 계약조건은 최종 계약 시 확정됩니다.";
