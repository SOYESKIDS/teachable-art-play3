/**
 * 주차 수업 콘텐츠 타입 — B단계 (UI·콘텐츠 계층).
 *
 * ── 원문이 기준이다 ───────────────────────────────────────────────
 *
 * 공식 교사용 수업가이드 1~24주는 모두 같은 15개 섹션 틀을 쓴다. 아래 블록
 * 키는 그 15개 섹션과 1:1 로 맞춘다. 화면은 원문을 **나누고 배치할 뿐**
 * 다시 쓰지 않는다.
 *
 * ★ 원문에 없는 칸은 비워 둔다. 채우려고 문장을 만들지 않는다.
 *   화면은 빈 칸을 "가이드 미기재"로 표시한다.
 *
 * ── 검수 상태를 타입으로 강제한다 ────────────────────────────────
 *
 * 전사(transcribe)와 발행(publish)은 다른 일이다. 원문을 옮겨 적었다고
 * 교사에게 보여도 되는 것이 아니다. 그래서 모든 주차가 `reviewState` 를
 * 들고 다니고, 화면은 그 값에 따라 다르게 그린다.
 *
 * ── 저장소가 아니라 읽기 모델이다 ────────────────────────────────
 *
 * 이 타입은 화면이 읽는 모양이다. DB 스키마와 1:1 일 필요가 없고, E단계에서
 * 실제 테이블을 연결할 때 어댑터가 이 모양으로 맞춘다.
 */

/** 24주를 8주씩 세 권으로 나눈다 */
export type PartNo = 1 | 2 | 3;

/**
 * 콘텐츠 검수 상태.
 *
 * ★ `transcribed` 와 `published` 를 반드시 구분한다.
 *   전사만 된 주차를 교사 화면에 "제공"으로 내보내지 않는다.
 */
export type ReviewState =
  /** 원문을 아직 옮기지 않았다. 메타(제목·키워드·시간)만 있다 */
  | "pending_transcription"
  /** 원문을 옮겼고 본사 대조 검수를 기다린다 */
  | "transcribed"
  /** 대조 검수를 마쳤다. 교사에게 보여도 된다 */
  | "published";

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  pending_transcription: "원문 검수 대기",
  transcribed: "전사 완료 · 검수 대기",
  published: "검수 완료 · 발행",
};

export const REVIEW_STATE_NOTE: Record<ReviewState, string> = {
  pending_transcription:
    "공식 가이드 원문이 아직 이 화면에 들어오지 않았습니다. 수업은 인쇄된 가이드로 진행해 주세요.",
  transcribed:
    "원문을 옮겨 적었고 본사 대조 검수를 기다리는 중입니다. 수업 전 인쇄본과 함께 확인해 주세요.",
  published: "본사 대조 검수를 마친 내용입니다.",
};

/* ══════════════════════════════════════════ 15개 블록 */

/** 1. N주차 수업을 시작하기 전에 */
export interface BeforeStartBlock {
  intro: string;
  /** 경험 구조 (화살표 흐름) */
  experienceFlow: string[];
  teacherRoles: string[];
}

/** 2. 수업 한눈에 보기 */
export interface AtAGlanceBlock {
  theme: string;
  storybook: string;
  growthKeyword: string;
  coreMessage: string;
  coreActivities: string[];
  /** 원문 표기 그대로. 임의로 45분·30분으로 바꾸지 않는다 */
  durationLabel: string;
  linkedContents: string[];
}

/** 3. 교육목표 및 누리과정 연계 */
export interface ObjectiveRow {
  /** 누리과정 5영역 원문 표기 */
  nuriArea: string;
  objective: string;
  /** 교사가 볼 행동 */
  teacherWatch: string;
}

/** 4. 수업 전 준비 */
export interface PreparationBlock {
  materials: { group: string; item: string }[];
  spaceSetup: string[];
  safety: string[];
}

/** 5. 권장 시간표 / 관찰 시간표 (주차에 따라 다르다) */
export interface TimetableBlock {
  kind: "time" | "observation";
  rows: { stage: string; duration: string | null; teacherRole: string; childExperience: string }[];
}

/** 6. 실제 수업 진행안 */
export interface LessonStep {
  step: string;
  title: string;
  body: string | null;
  /** 교사 멘트 · 발문 예시 */
  questions: string[];
  /** 아이 반응 → 교사 대응 */
  responses: { child: string; teacher: string }[];
  /** 교사 주의 등 */
  notes: string[];
}

/** 7. 핵심활동 */
export interface CoreActivityBlock {
  title: string;
  intro: string | null;
  /** PLAY / MISSION / 탐험 장소 등 주차마다 단계 수가 다르다 */
  plays: { label: string | null; title: string; points: string[] }[];
  /** 현장 난이도·개별 지원 */
  adaptations: { condition: string; adjust: string }[];
  situations: { situation: string; say: string }[];
}

/** 8 또는 9. 워크북 */
export interface WorkbookBlock {
  title: string | null;
  intro: string | null;
  pages: { activity: string; focus: string; question: string }[];
}

/** 8 또는 9. 미술활동 */
export interface ArtBlock {
  title: string;
  intro: string | null;
  steps: string[];
  questions: string[];
  /** 활동의 기준 */
  standard: string | null;
}

/** 10. 음원·뮤직비디오 활용 / 관찰 포인트 */
export interface MediaOrWatchBlock {
  kind: "media" | "watch";
  items: { name: string; usedAt: string | null; how: string }[];
}

/** 11. 마무리 대화 */
export interface ClosingBlock {
  intro: string | null;
  questions: string[];
  /** 마지막 한 문장 */
  closingLine: string | null;
}

/** 12. 관찰 및 기록 가이드 */
export interface ObservationGuideBlock {
  /** 주차별 관찰영역은 원문 그대로 쓴다 */
  areas: { area: string; behavior: string; recordFocus: string }[];
  /** 기록 예시 (원문). 교사가 복사해 쓰지 않도록 화면에서 접어 둔다 */
  recordExample: string | null;
  cautions: string[];
}

/** 13. 가정연계 */
export interface HomeConnectionBlock {
  title: string;
  description: string | null;
  steps: string[];
  /** 부모님께 전달할 핵심 문장 */
  noticeExample: string | null;
  /** 원문이 「미정」인 주차가 있다 (19주) */
  status: "ready" | "undecided";
}

/** 14. 수업 중 이런 상황이 생기면 */
export interface SituationRow {
  situation: string;
  /** 피해야 할 반응 */
  avoid: string;
  /** 권장 대응 */
  recommend: string;
}

/** 15. 교사용 1페이지 퀵 가이드 */
export interface QuickGuideBlock {
  goal: string;
  rows: { order: number; stage: string; todo: string; keyQuestion: string }[];
  closingNote: string | null;
}

/** 15개 블록 묶음. 아직 전사하지 않은 블록은 null 이다 */
export interface WeekBlocks {
  beforeStart: BeforeStartBlock | null;
  atAGlance: AtAGlanceBlock | null;
  objectives: ObjectiveRow[] | null;
  preparation: PreparationBlock | null;
  timetable: TimetableBlock | null;
  lessonSteps: LessonStep[] | null;
  coreActivity: CoreActivityBlock | null;
  workbook: WorkbookBlock | null;
  art: ArtBlock | null;
  mediaOrWatch: MediaOrWatchBlock | null;
  closing: ClosingBlock | null;
  observationGuide: ObservationGuideBlock | null;
  homeConnection: HomeConnectionBlock | null;
  situations: SituationRow[] | null;
  quickGuide: QuickGuideBlock | null;
}

export const EMPTY_BLOCKS: WeekBlocks = {
  beforeStart: null,
  atAGlance: null,
  objectives: null,
  preparation: null,
  timetable: null,
  lessonSteps: null,
  coreActivity: null,
  workbook: null,
  art: null,
  mediaOrWatch: null,
  closing: null,
  observationGuide: null,
  homeConnection: null,
  situations: null,
  quickGuide: null,
};

/* ══════════════════════════════════════════ 교실 화면 장면 */

/** 장면 유형 8종. 24주 모두 이 틀을 쓴다 */
export type SceneType =
  | "intro"
  | "story"
  | "promise"
  | "play"
  | "workbook"
  | "create"
  | "share"
  | "home";

export const SCENE_TYPE_LABEL: Record<SceneType, string> = {
  intro: "도입",
  story: "그림책",
  promise: "활동 약속",
  play: "활동",
  workbook: "워크북",
  create: "미술",
  share: "마무리",
  home: "가정연계",
};

export interface WeekScene {
  sceneNo: number;
  sceneType: SceneType;
  /** 아이 화면 큰 문장. 원문 질문·연결 문장에서 가져온다 */
  kidText: string;
  /** 단계 이름 (예: "PLAY 2 · 팡팡! 색이 움직여요") */
  stageLabel: string | null;
  /**
   * 교사 노트.
   *
   * ★ 같은 TV 에 열리므로 아이들에게도 보인다. **공통 진행 안내만** 넣는다.
   *   원아별 관찰·개인정보는 업무 화면에서 다룬다.
   */
  teacherNote: string | null;
  /** 원문 출처 (예: "가이드 6. STEP 2") */
  sourceRef: string;
  /** 원안 권장 시간(초). 없으면 null */
  baseSeconds: number | null;
}

/* ══════════════════════════════════════════ 주차 메타 */

export interface WeekSummary {
  weekNo: number;
  partNo: PartNo;
  /** 수업명 = 그림책 제목 */
  title: string;
  storybook: string;
  growthKeyword: string;
  coreMessage: string;
  /** 원문 표기 그대로 */
  durationLabel: string;
  /** 대표 신체활동 → 미술 (수업 지도 한 줄 요약) */
  activitySummary: string;
  /** 결과물 */
  outcome: string | null;
  /** 24주 책갈피 테마색 */
  themeColor: string;
  reviewState: ReviewState;
}

export interface WeekContent {
  summary: WeekSummary;
  blocks: WeekBlocks;
  scenes: WeekScene[];
  /** 원문 파일명 — 대조 검수에 쓴다 */
  sourceFile: string | null;
}

/* ══════════════════════════════════════════ 파트 */

export interface PartMeta {
  partNo: PartNo;
  title: string;
  weekFrom: number;
  weekTo: number;
  /** 파트 이름이 공식 가이드에 없으면 true */
  nameProvisional: boolean;
}

export const PARTS: PartMeta[] = [
  { partNo: 1, title: "씨앗과 숲", weekFrom: 1, weekTo: 8, nameProvisional: false },
  {
    partNo: 2,
    title: "우리 그리고 모두의 사계절",
    weekFrom: 9,
    weekTo: 16,
    nameProvisional: false,
  },
  // ★ 공식 가이드에 17~24주 파트명이 없다. 확정 전까지 임시 표기임을 밝힌다.
  { partNo: 3, title: "세계의 축제", weekFrom: 17, weekTo: 24, nameProvisional: true },
];

export function partOf(weekNo: number): PartMeta {
  return PARTS.find((p) => weekNo >= p.weekFrom && weekNo <= p.weekTo) ?? PARTS[0];
}
