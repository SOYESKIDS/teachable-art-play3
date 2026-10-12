import { CLASS_TIME_STANDARD, pricingPackages } from "./packages";
import { contactInfo } from "./site-copy";

/**
 * 공개 안내 페이지 데이터 — 실행 묶음 D1 (/faq · /guide/teacher · /roadmap).
 *
 * ★ 확정된 사실만 적는다.
 *   가격·기간·수업 시간·연락처는 기존 단일 출처(packages.ts · site-copy.ts)를 읽는다.
 *   같은 숫자를 여기 다시 적지 않는다 — 언젠가 한쪽만 고쳐지는 자리를 만들지 않는다.
 *
 * ★ 없는 약속을 만들지 않는다.
 *   출시월·분기·"무료"·"계약 없음"·"○월 제공" 같은 표현을 쓰지 않는다.
 *   승인되지 않은 주차별 제목·활동을 적지 않는다.
 *
 * ★ 미정은 미정으로 적는다.
 *   로드맵 상태는 제공 / 개발 중 / 검토·승인 대기 / 일정 미정 네 가지뿐이고,
 *   완료 체크나 진행률 숫자를 만들지 않는다.
 */

/* ════════════════════════════════════════════════════════════ FAQ */

export interface FaqItem {
  id: string;
  question: string;
  /** 단락 배열. 각 단락은 그대로 한 문단으로 그린다. */
  answer: string[];
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

const starter = pricingPackages.find((p) => p.id === "starter");

export const faqGroups: FaqGroup[] = [
  {
    id: "program",
    title: "프로그램",
    items: [
      {
        id: "duration",
        question: "한 회차는 얼마나 걸리나요?",
        answer: [
          `${CLASS_TIME_STANDARD} 기준으로 운영합니다. 선택 연계활동을 함께 하시면 60~65분이 됩니다.`,
          "주차별 교사용 가이드에는 기관 일정에 따라 미술·워크북을 나누어 운영하는 방법도 함께 적혀 있습니다. 원의 하루 일정에 맞춰 조정하실 수 있습니다.",
        ],
      },
      {
        id: "age",
        question: "몇 세 아이들에게 맞나요?",
        answer: [
          "원아 연령과 반 구성에 따라 적합한 운영 방법이 달라지므로 상담 시 안내해 드립니다.",
          "자료마다 권장 연령 표기가 달라 공개 화면에서는 특정 연령을 단정하지 않습니다.",
        ],
      },
      {
        id: "weeks",
        question: "8주·16주·24주는 어떻게 다른가요?",
        answer: [
          "운영 기간과 포함되는 콘텐츠 수량, 리포트 종류가 다릅니다. 기간이 길어질수록 수업이 성장기록으로 쌓입니다.",
          "현재 공개 승인된 주차별 구성은 8주 프로그램입니다. 16주·24주의 주차별 구성은 승인 절차가 진행 중이며, 확정되기 전에는 주차별 제목과 활동을 공개하지 않습니다.",
        ],
      },
      {
        id: "teacher",
        question: "외부 강사가 오나요?",
        answer: [
          "담임 선생님이 직접 운영합니다. 외부 강사 섭외가 필요하지 않습니다.",
          "회차별 수업안·진행 순서·발문 예시·준비물 안내·관찰 포인트·기록 문장 예시가 교사용 가이드에 들어 있습니다.",
        ],
      },
    ],
  },
  {
    id: "record",
    title: "기록과 리포트",
    items: [
      {
        id: "evaluation",
        question: "아이를 평가하거나 점수를 매기나요?",
        answer: [
          "아니요. 점수·등급·순위·진단을 만들지 않고, 다른 아이나 또래 평균과 비교하지 않습니다.",
          "기록에서 쓰는 표현은 그 활동에서 아이에게 어떤 도움이 필요했는지를 나타냅니다. 우열을 가리는 척도가 아니며, “기록 없음”은 부족하거나 실패했다는 뜻이 아닙니다.",
          "이 기록은 발달선별검사가 아닙니다. 아이의 발달이 걱정되실 때는 영유아 건강검진이나 전문기관에서 별도로 확인해 주세요.",
        ],
      },
      {
        id: "ai",
        question: "AI가 아이를 분석하나요?",
        answer: [
          "아니요. AI는 선생님이 적은 짧은 메모를 읽기 좋은 문장으로 다듬는 일만 합니다.",
          "진단·평가·점수·단계 자동판정·또래 비교를 하지 않고, 기록에 없는 내용을 만들지 않습니다.",
          "AI가 정리한 문장은 담임 선생님이 확인하고 승인한 뒤에만 보호자에게 전달됩니다. AI가 설정되지 않은 상태에서도 수업·관찰·리포트는 그대로 운영됩니다.",
        ],
      },
      {
        id: "photo",
        question: "아이 사진은 어떻게 다루나요?",
        answer: [
          "사진 촬영과 공유는 기관의 보호자 동의 및 개인정보 운영 기준을 따릅니다.",
          "활동 사진은 기관 안에서만 보관되며, 보호자 화면에 사진을 표시하는 기능은 동의 관리와 공개 범위가 확정되기 전까지 제공하지 않습니다.",
        ],
      },
    ],
  },
  {
    id: "adoption",
    title: "도입과 상담",
    items: [
      {
        id: "how",
        question: "어떻게 신청하나요?",
        answer: [
          "이 사이트의 상담 신청으로 접수하시면 담당자가 연락드립니다. 온라인 즉시 결제나 공개 회원가입은 제공하지 않습니다.",
          `문의 담당은 백향은이며 주 1회 확인합니다. 접수 후 1주일 이내에 회신드립니다. 급한 경우 ${contactInfo.phone} 로 전화 주시면 됩니다.`,
        ],
      },
      {
        id: "pilot",
        question: "먼저 체험해 볼 수 있나요?",
        answer: [
          "1~2개 반에서 담임교사가 직접 운영해 보는 4주 파일럿 과정이 있습니다. 정규 판매상품이 아니라 도입 전 확인 과정입니다.",
          "운영 조건은 원의 규모와 일정에 따라 달라지므로 상담 시 안내해 드립니다.",
        ],
      },
      {
        id: "price",
        question: "표시된 금액이 최종 금액인가요?",
        answer: [
          "표시 금액은 상담을 위한 기준 정보입니다. 실제 제공 콘텐츠·준비 중 항목·키트 구성과 일정은 계약 전에 확인합니다.",
          starter
            ? `${starter.priceUnitNote} 금액이며 부가세는 별도입니다.`
            : "기준 인원과 부가세 조건은 상품 안내 화면을 확인해 주세요.",
          "환불·자동갱신·결제주기·계약 해지 조건은 확정되지 않았습니다. 확정 전에는 안내드리지 않습니다.",
        ],
      },
      {
        id: "device",
        question: "따로 준비할 장비가 있나요?",
        answer: [
          "교실 또는 유희실, 화면(TV 또는 빔), 인터넷 연결, 교사용 태블릿 또는 노트북이면 됩니다.",
          "이미 원에 있는 기기로 운영하실 수 있습니다.",
        ],
      },
    ],
  },
];

/* ══════════════════════════════════════════════════ 교사용 안내 */

export interface TeacherGuideStep {
  order: number;
  title: string;
  description: string;
  /** 이 단계에서 선생님이 하는 일 */
  actions: string[];
}

export const teacherGuideIntro = {
  eyebrow: "FOR TEACHERS",
  headline: "선생님이 처음부터\n만들지 않으셔도 됩니다.",
  subCopy:
    "회차마다 같은 구성으로 수업안·진행 순서·발문 예시·준비물 안내·관찰 포인트·기록 문장 예시가 제공됩니다. 이 페이지는 선생님이 한 회차를 어떤 순서로 쓰시는지 안내합니다.",
};

export const teacherGuideSteps: TeacherGuideStep[] = [
  {
    order: 1,
    title: "수업 전",
    description: "그날 무엇을 하는지와 무엇을 준비해야 하는지를 먼저 확인합니다.",
    actions: [
      "이번 회차의 주제와 핵심 메시지를 읽습니다.",
      "준비물 목록을 체크합니다. 수량 기준이 적혀 있는 항목은 그대로 따릅니다.",
      "교실 배치와 안전 확인 항목을 점검합니다.",
      "사진 촬영·공유가 기관의 보호자 동의 기준에 맞는지 확인합니다.",
      "1페이지 퀵 가이드를 인쇄하거나 화면에 띄워 둡니다.",
    ],
  },
  {
    order: 2,
    title: "수업 중",
    description: "단계별 흐름을 따라가며, 아이의 말과 선택을 그 자리에서 짧게 남깁니다.",
    actions: [
      "단계 순서대로 진행합니다. 각 단계의 권장 시간이 표시됩니다.",
      "교사 멘트 예시를 그대로 쓰셔도 되고, 반 상황에 맞게 바꾸셔도 됩니다.",
      "아이 반응이 예상과 다를 때는 상황별 대응 안내를 확인합니다.",
      "기억에 남는 말이나 행동은 짧은 메모로 남깁니다. 정리는 수업 후에 합니다.",
    ],
  },
  {
    order: 3,
    title: "수업 후",
    description: "출결과 관찰을 기록하고, 필요한 경우 리포트로 이어 갑니다.",
    actions: [
      "출결을 입력합니다.",
      "아이별 관찰을 적습니다. 아이가 한 말은 그대로 옮기고, 아이 간 비교나 성공 횟수는 적지 않습니다.",
      "활동 사진이 있으면 올립니다.",
      "필요하면 AI 정리를 눌러 문장을 다듬고, 내용을 직접 확인한 뒤 저장합니다.",
      "기록 작성을 완료 처리합니다. 수업 완료와 기록 완료는 서로 다른 상태입니다.",
    ],
  },
];

export const teacherGuidePrinciples = [
  {
    title: "기록에 적는 것",
    body: "아이가 한 말, 시도한 방법, 바꾼 방법을 그대로 적습니다. 관찰되지 않은 것은 적지 않습니다.",
  },
  {
    title: "적지 않는 것",
    body: "잘함·못함, 상·중·하, 또래 대비 같은 표현을 쓰지 않습니다. 몇 번 성공했는지도 적지 않습니다.",
  },
  {
    title: "빈 칸의 뜻",
    body: "그 주 수업에서 그 모습이 나오지 않았다는 뜻입니다. 못했다는 뜻이 아닙니다.",
  },
  {
    title: "AI의 역할",
    body: "메모를 읽기 좋은 문장으로 다듬습니다. 판단은 선생님이 하시고, 승인 전에는 보호자에게 전달되지 않습니다.",
  },
];

/* ══════════════════════════════════════════════════════ 로드맵 */

/**
 * 제공 현황 상태.
 *
 * ★ 네 가지뿐이다. 출시월·분기·진행률·완료 체크를 만들지 않는다.
 */
export type RoadmapStatus =
  /** 지금 쓸 수 있다 */
  | "available"
  /** 코드가 만들어지고 있다 */
  | "in_development"
  /** 코드는 있고 검토·승인을 기다린다 */
  | "awaiting_approval"
  /** 제공 시점이 정해지지 않았다 */
  | "unscheduled";

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  available: "제공",
  in_development: "개발 중",
  awaiting_approval: "검토·승인 대기",
  unscheduled: "일정 미정",
};

export interface RoadmapItem {
  id: string;
  title: string;
  status: RoadmapStatus;
  /** 왜 그 상태인지. 추측하지 않고 확인된 사실만 적는다. */
  note: string;
}

export interface RoadmapGroup {
  id: string;
  title: string;
  items: RoadmapItem[];
}

export const roadmapIntro = {
  eyebrow: "WHAT WE PROVIDE",
  headline: "지금 제공하는 것과\n아직 아닌 것을 구분해 알려드립니다.",
  subCopy:
    "출시 시점을 약속하지 않습니다. 확정되지 않은 일정은 일정 미정으로 적습니다. 상담 시 현재 제공 범위를 다시 확인해 드립니다.",
};

export const roadmapGroups: RoadmapGroup[] = [
  {
    id: "content",
    title: "수업 콘텐츠",
    items: [
      {
        id: "starter-weeks",
        title: "8주 프로그램 주차 구성",
        status: "available",
        note: "주차별 주제와 구성이 공개 승인된 범위입니다.",
      },
      {
        id: "standard-weeks",
        title: "16주 프로그램 주차 구성",
        status: "awaiting_approval",
        note: "원본 자료가 있으나 판본 확인과 교육 검수가 끝나지 않았습니다. 확정 전에는 주차별 제목·활동을 공개하지 않습니다.",
      },
      {
        id: "premium-weeks",
        title: "24주 프로그램 주차 구성",
        status: "awaiting_approval",
        note: "원본 자료가 있으나 초안 상태인 주차가 있습니다. 교육 검수와 정본 지정이 필요합니다.",
      },
      {
        id: "asset-playback",
        title: "EBOOK·영상·음원 화면 내 재생",
        status: "in_development",
        note: "재생 화면과 권한 통제를 만들고 있습니다. 승인된 자산이 등록되면 열립니다.",
      },
    ],
  },
  {
    id: "teacher",
    title: "교사 화면",
    items: [
      {
        id: "attendance-observation",
        title: "출결·관찰 기록·활동 사진",
        status: "available",
        note: "담당 반에서 사용하실 수 있습니다.",
      },
      {
        id: "class-mode",
        title: "수업 실행 화면 (수업 전·중·후 한 흐름)",
        status: "awaiting_approval",
        note: "구현되어 있고 출시 준비 확인이 남았습니다.",
      },
      {
        id: "ai-assist",
        title: "AI 기록 정리",
        status: "awaiting_approval",
        note: "자유서술의 식별정보 최소화를 적용했고, 외부 전송 전 검토가 남았습니다. AI 없이도 기록은 그대로 운영됩니다.",
      },
    ],
  },
  {
    id: "report",
    title: "성장 기록",
    items: [
      {
        id: "weekly",
        title: "주간 기록",
        status: "awaiting_approval",
        note: "구현되어 있고 출시 준비 확인이 남았습니다.",
      },
      {
        id: "monthly-semester",
        title: "월간 요약 · 학기 포트폴리오",
        status: "in_development",
        note: "승인된 주간 기록을 모아 구성합니다. 기록이 쌓인 뒤에 의미가 있는 기능입니다.",
      },
      {
        id: "parent-portal",
        title: "보호자 열람 화면",
        status: "awaiting_approval",
        note: "링크 유효기간과 재발급 정책 확정이 남았습니다.",
      },
      {
        id: "parent-photo",
        title: "보호자 화면의 활동 사진",
        status: "unscheduled",
        note: "동의 관리와 공개 범위가 확정되지 않았습니다.",
      },
    ],
  },
  {
    id: "operation",
    title: "운영",
    items: [
      {
        id: "director-dashboard",
        title: "원장 운영 현황",
        status: "available",
        note: "반별 진행과 기록 누락을 확인하실 수 있습니다.",
      },
      {
        id: "consult",
        title: "도입 상담 접수",
        status: "available",
        note: "접수 후 1주일 이내 회신드립니다.",
      },
      {
        id: "online-purchase",
        title: "온라인 구매·결제",
        status: "unscheduled",
        note: "환불·자동갱신·결제주기·해지 조건이 확정되지 않았습니다. 현재 도입은 상담으로 진행합니다.",
      },
      {
        id: "cases",
        title: "도입 사례·후기",
        status: "unscheduled",
        note: "실제 기관의 자료와 사용 승인이 있을 때만 공개합니다.",
      },
    ],
  },
];

/** 로드맵 하단 고지. 약속으로 읽히지 않게 한다. */
export const roadmapDisclaimer = [
  "위 상태는 현재 확인된 개발·승인 상태이며 제공 시점에 대한 약속이 아닙니다.",
  "검토·승인 대기 항목은 코드가 준비되어 있어도 교육 검수나 운영 정책 확정 전에는 제공하지 않습니다.",
  "상담 시 현재 제공 범위를 다시 확인해 드립니다.",
];
