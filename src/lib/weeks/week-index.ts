import type { ContentStatus } from "./content-state";
import { partOf, type WeekSummary } from "./week-types";

/**
 * 24주 수업 지도 — B단계.
 *
 * ── 어디서 왔는가 ─────────────────────────────────────────────────
 *
 * 수업명 · 성장키워드 · 핵심 메시지 · 권장 시간은 **공식 교사용 수업가이드
 * 1~24주 원문에서 직접 읽어 적었다.** 기획안 문서의 표를 베끼지 않고, 24개
 * 가이드 PDF 본문을 추출해 대조했다.
 *
 * ★ 원문과 다른 문서가 어긋나는 곳은 원문을 따랐다.
 *   - 4주차 성장키워드: 원문 「시작」. (사용설명서 부록 A 는 「성장」으로
 *     적고 그 차이를 D-4 로 남겨 두었다. 원문이 기준이므로 「시작」을 쓴다.)
 *   - 7주차 제목: 원문 「나비야 놀자!」.
 *
 * ── 여기 없는 것 ──────────────────────────────────────────────────
 *
 * ★ 15개 섹션 본문은 이 파일에 없다. `content/week-NN.ts` 에 주차별로 둔다.
 *   본문을 옮기지 않은 주차는 `reviewState: "pending_transcription"` 이고,
 *   화면이 그 상태를 그대로 보여 준다.
 *
 * ★ 결과물(outcome)은 사용설명서 부록 A 의 정리값이다. 원문 대조 시 바뀔 수
 *   있어 null 을 허용한다.
 *
 * ── 테마색 ────────────────────────────────────────────────────────
 *
 * 24주 책갈피 색이다. 모두 흰 글자와 4.5:1 이상 대비가 되도록 맞춰져 있다
 * (디자인 기획안 9쪽).
 */

/**
 * 주차별 상태.
 *
 * ★ 전사와 발행을 따로 적는다.
 *   1주차는 원문을 옮겼지만(`done`) 본사 대조 검수 전이라 발행되지 않았다
 *   (`draft`). 그래서 정식 서비스 경로에서는 아직 본문이 열리지 않고,
 *   내부 검수 화면에서만 열린다.
 *
 * ★ 발행 상태를 코드가 올리지 않는다.
 *   검수는 사람이 하는 일이다. 전사했다고 자동으로 `published` 가 되지 않는다.
 */
const STATUS: Record<number, ContentStatus> = {
  1: { transcription: "done", publication: "draft" },
  2: { transcription: "done", publication: "draft" },
  3: { transcription: "done", publication: "draft" },
  4: { transcription: "done", publication: "draft" },
  5: { transcription: "done", publication: "draft" },
  6: { transcription: "done", publication: "draft" },
  7: { transcription: "done", publication: "draft" },
  8: { transcription: "done", publication: "draft" },
};

const NOT_TRANSCRIBED: ContentStatus = {
  transcription: "pending",
  publication: "draft",
};

interface WeekSeed {
  weekNo: number;
  title: string;
  growthKeyword: string;
  coreMessage: string;
  durationLabel: string;
  activitySummary: string;
  outcome: string | null;
  themeColor: string;
}

const SEEDS: WeekSeed[] = [
  {
    weekNo: 1,
    title: "유치원 가는 날",
    growthKeyword: "시작",
    coreMessage: "새로운 공간을 친구들과 탐색하며 편안함과 소속감을 만들어가요.",
    durationLabel: "약 50~60분",
    activitySummary: "교실 탐험 → 나만의 이름표",
    outcome: "나만의 이름표",
    themeColor: "#C3541F",
  },
  {
    weekNo: 2,
    title: "끝까지 해보자",
    growthKeyword: "끈기",
    coreMessage: "포기하지 않으면 할 수 있어!",
    durationLabel: "약 55~65분",
    activitySummary: "마루의 도전 미션 → 용기 메달",
    outcome: "용기 메달",
    themeColor: "#9D6C17",
  },
  {
    weekNo: 3,
    title: "마음을 말해줘",
    growthKeyword: "표현",
    coreMessage: "내 마음을 표현하면 친구와 서로를 더 잘 이해할 수 있어!",
    durationLabel: "약 55~65분",
    activitySummary: "마음배달 → 마음 팔찌",
    outcome: "마음을 전하는 팔찌",
    themeColor: "#D04168",
  },
  {
    weekNo: 4,
    // ★ 원문 성장키워드는 「시작」이다 (사용설명서 부록 A 의 「성장」과 다름).
    title: "소예의 씨앗",
    growthKeyword: "시작",
    coreMessage: "작은 씨앗도 정성과 기다림으로 자라나요!",
    durationLabel: "약 55~65분",
    activitySummary: "씨앗 마라카스 연주회 → 씨앗 마라카스",
    outcome: "씨앗 소리 마라카스",
    themeColor: "#8C6B3E",
  },
  {
    weekNo: 5,
    title: "우린 모두 특별해",
    growthKeyword: "자존감",
    coreMessage:
      "꽃마다 모양이 다르듯 우리도 모두 특별해요. 나는 소중하고, 친구도 소중한 존재예요.",
    durationLabel: "약 55~65분",
    activitySummary: "동글게 동글게 꽃놀이 → 나만의 꽃",
    outcome: "나만의 꽃",
    themeColor: "#C14A85",
  },
  {
    weekNo: 6,
    title: "우리들의 비밀기지",
    growthKeyword: "협력",
    coreMessage:
      "혼자 하기 어려운 일도 친구와 힘을 합치고 도움을 주고받으면 함께 해낼 수 있어요.",
    durationLabel: "약 60~70분",
    activitySummary: "톡톡 비·햇살 → 대형 비밀기지",
    outcome: "우리들의 비밀기지 (공동)",
    themeColor: "#377CAA",
  },
  {
    weekNo: 7,
    title: "나비야 놀자!",
    growthKeyword: "기다림",
    coreMessage: "기다리면 좋은 순간을 만날 수 있어요.",
    durationLabel: "약 55~65분",
    activitySummary: "나비놀이·벌놀이 → 데칼코마니 나비",
    outcome: "데칼코마니 나비",
    themeColor: "#7A6ABF",
  },
  {
    weekNo: 8,
    title: "모이면 숲이 되는 우리",
    growthKeyword: "공동체",
    coreMessage: "하나씩 모이면 우리 모두의 멋진 숲이 돼요.",
    durationLabel: "약 55~65분",
    activitySummary: "하나씩 모이면 숲이 돼요 (공동 현수막)",
    outcome: "우리 반 숲 현수막 (1~7주 결과물 모음)",
    themeColor: "#2F7D50",
  },
  {
    weekNo: 9,
    title: "안녕? 봄아!",
    growthKeyword: "웃음",
    coreMessage: "봄의 마지막까지 신나게 즐겨요.",
    durationLabel: "약 60~70분",
    activitySummary: "꽃비가 내려요! → 나만의 꽃다발",
    outcome: "나만의 꽃다발",
    themeColor: "#D03E6E",
  },
  {
    weekNo: 10,
    title: "너무 뜨겁잖아!",
    growthKeyword: "탐색",
    coreMessage: "여름에는 신기한 친구들이 가득해요.",
    durationLabel: "약 55~65분",
    activitySummary: "한여름 곤충 채집 → 여름 곤충 자석",
    outcome: null,
    themeColor: "#358450",
  },
  {
    weekNo: 11,
    title: "자! 떠나자!",
    growthKeyword: "도전",
    coreMessage: "새로운 곳에서 새로운 즐거움을 만나요.",
    durationLabel: "약 60~70분",
    activitySummary: "공항→탑승→훌라댄스 → 꽃목걸이·훌라치마",
    outcome: "꽃목걸이 · 훌라치마",
    themeColor: "#267CB5",
  },
  {
    weekNo: 12,
    title: "세상은 알록달록",
    growthKeyword: "발견",
    coreMessage: "가을에는 색과 풍성함이 가득해요.",
    durationLabel: "약 60~70분",
    activitySummary: "상자 속 가을은 누구? → 가을 산물 허수아비",
    outcome: "알록달록 허수아비 (공동)",
    themeColor: "#AC6523",
  },
  {
    weekNo: 13,
    title: "동글동글 보름달",
    growthKeyword: "마음",
    coreMessage: "보름달에 소중한 마음을 담아요.",
    durationLabel: "약 60~70분",
    activitySummary: "달아 커져라! → 복(福)름달주머니",
    outcome: "복(福)름달주머니",
    themeColor: "#917121",
  },
  {
    weekNo: 14,
    title: "말하지 않아도 괜찮아!",
    growthKeyword: "표현",
    coreMessage: "말하지 않아도 괜찮아요!",
    durationLabel: "약 60~70분",
    activitySummary: "몸으로 말해요 → 감기야 사라져라! 얍!",
    outcome: "감기야 사라져라! 얍!",
    themeColor: "#5178AE",
  },
  {
    weekNo: 15,
    title: "따뜻한 소리가 들려요",
    growthKeyword: "나눔",
    coreMessage: "받은 따뜻한 마음을 다른 사람에게도 나눠요.",
    durationLabel: "약 60~70분",
    activitySummary: "마음벨을 울려요 → 딸랑딸랑 마음벨",
    outcome: "딸랑딸랑 마음벨",
    themeColor: "#C75035",
  },
  {
    weekNo: 16,
    title: "우리 그리고 모두의 사계절",
    growthKeyword: "성장",
    coreMessage: "사랑을 받으며 우리는 또 자라요.",
    durationLabel: "약 55~65분",
    activitySummary: "사계절 사진 회상 · 사랑의 영상편지",
    outcome: "사랑의 영상편지",
    themeColor: "#49824F",
  },
  {
    weekNo: 17,
    title: "짝! 우리들의 색",
    growthKeyword: "존중",
    coreMessage: "색이 만들어낸 아름다움",
    durationLabel: "약 60~70분",
    activitySummary: "팡팡!!! 색을 터트려요! → 내가 만든 색친구",
    outcome: "내가 만든 색친구",
    themeColor: "#C34599",
  },
  {
    weekNo: 18,
    title: "반짝이는 물길 놀이터",
    growthKeyword: "표현",
    coreMessage: "표현할수록 따뜻하게 전해지는 마음",
    durationLabel: "약 60~70분",
    activitySummary: "조심조심! 돌다리를 건너요 → 마음을 담은 비누",
    outcome: "마음을 담은 비누",
    themeColor: "#1B8092",
  },
  {
    weekNo: 19,
    title: "숲 속 작은 연주회",
    growthKeyword: "경청·협력",
    coreMessage: "함께 만드는 우리의 리듬",
    durationLabel: "약 60~70분",
    activitySummary: "귀 쫑긋! 소리를 듣고 움직여요 → 북과 스틱",
    outcome: "나만의 북과 스틱",
    themeColor: "#56812B",
  },
  {
    weekNo: 20,
    title: "주렁주렁 신나는 하루",
    growthKeyword: "배려",
    coreMessage: "배려할 때 더 커지는 즐거움",
    durationLabel: "약 60~70분",
    activitySummary: "토마토 길을 이어줘! → 반쪽 토마토",
    outcome: "반쪽 토마토",
    themeColor: "#D6412D",
  },
  {
    weekNo: 21,
    title: "두근두근 하늘여행",
    growthKeyword: "호기심·도전",
    coreMessage: "새로운 세상을 만드는 호기심",
    durationLabel: "약 60~70분",
    activitySummary: "미니 열기구 날리기 → 우리들의 큰 열기구",
    outcome: "우리들의 큰 열기구 (공동)",
    themeColor: "#3176CF",
  },
  {
    weekNo: 22,
    title: "오늘 밤, 무슨 일이 생길까?",
    growthKeyword: "유연함",
    coreMessage: "예상치 못해 더 특별한 재미와 추억",
    durationLabel: "약 60~70분",
    activitySummary: "Trick or Treat! 사탕을 모아요 → 할로윈 바구니",
    outcome: "나만의 할로윈 바구니",
    themeColor: "#B4611A",
  },
  {
    weekNo: 23,
    title: "별빛이 찾아온 크리스마스",
    growthKeyword: "나눔",
    coreMessage: "나누면 커지는 기쁨",
    durationLabel: "약 60~70분",
    activitySummary: "씽씽! 선물 썰매를 끌어요 → 선물 안에는?",
    outcome: "선물 안에는 무엇이 있을까?",
    themeColor: "#2A7552",
  },
  {
    weekNo: 24,
    title: "서로 다른 하루, 하나의 지구",
    growthKeyword: "친구",
    coreMessage: "다른 우리, 같은 지구",
    durationLabel: "약 60~70분",
    activitySummary: "지구촌 사진 붙이기 → 나만의 태극기",
    outcome: "나만의 태극기",
    themeColor: "#2F5FA0",
  },
];

export const WEEK_INDEX: WeekSummary[] = SEEDS.map((seed) => ({
  weekNo: seed.weekNo,
  partNo: partOf(seed.weekNo).partNo,
  title: seed.title,
  // 수업명과 그림책 제목은 공식 가이드에서 같다
  storybook: seed.title,
  growthKeyword: seed.growthKeyword,
  coreMessage: seed.coreMessage,
  durationLabel: seed.durationLabel,
  activitySummary: seed.activitySummary,
  outcome: seed.outcome,
  themeColor: seed.themeColor,
  status: STATUS[seed.weekNo] ?? NOT_TRANSCRIBED,
}));

export function weekSummary(weekNo: number): WeekSummary | null {
  return WEEK_INDEX.find((w) => w.weekNo === weekNo) ?? null;
}

export function weeksOfPart(partNo: number): WeekSummary[] {
  return WEEK_INDEX.filter((w) => w.partNo === partNo);
}

/** 통합·회고 주차 (앞선 주차의 결과물을 모은다) */
export const INTEGRATION_WEEKS = [8, 16, 24];

export function isIntegrationWeek(weekNo: number): boolean {
  return INTEGRATION_WEEKS.includes(weekNo);
}
