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
 * 콘텐츠 상태는 `content-state.ts` 의 두 축을 쓴다.
 *
 * ★ 전사(옮겼나)와 발행(검수했나)을 한 값에 섞지 않는다. 섞으면 전사만 된
 *   원문이 발행본처럼 읽힌다.
 */
export type { ContentStatus } from "./content-state";

import type { ContentStatus } from "./content-state";

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
  /**
   * 핵심활동(7번)과 **같은 활동**인가.
   *
   * ── 왜 이 표시가 필요한가 ──────────────────────────────────────
   *
   * 8주차 원문은 「8주차의 미술활동은 별도의 개인 만들기가 아니라 대형 숲
   * 현수막을 함께 완성하는 공동작품입니다」라고 밝힌다. 섹션은 둘이지만
   * 교실에서 하는 일은 하나다.
   *
   * ★ 화면은 두 블록을 다른 자리에 그리므로, 이 값이 true 면 **연결 관계를
   *   적는다.** 적지 않으면 교사가 활동을 두 번 하는 것으로 읽는다.
   * ★ 시간을 두 번 세지 않는다. 원문 권장 시간표에도 「공동활동 20분」 한 줄만
   *   있고 미술 단계가 따로 없다. 장면도 한 벌만 만든다.
   */
  sameAsCoreActivity?: boolean;
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
  /** 전사 · 발행 두 축 */
  status: ContentStatus;
}

/**
 * 전사 중 남긴 대조 주의 — 내부 검수 정보.
 *
 * ── 어떤 것을 여기 적는가 ────────────────────────────────────────
 *
 * PDF 에서 글자만 뽑으면 표가 열로 깔끔히 나뉘지 않는다. 어떤 칸이 어떤 행에
 * 속하는지 분명하지 않은 경우가 생긴다. 그럴 때 **조용히 골라 넣고 끝내지
 * 않는다.** 가장 그럴듯한 해석을 옮기고, 분명하지 않았다는 사실을 여기 남긴다.
 *
 * ── 미해결과 해결을 구분한다 ─────────────────────────────────────
 *
 * ★ `status: "unresolved"` — 아직 확인하지 못했다. 전사본의 그 자리는
 *   **잠정 해석**이고 틀렸을 수 있다. 이 상태가 하나라도 있으면 **발행을
 *   막는다** (`publishBlockers`).
 *
 * ★ `status: "resolved"` — 확인했다. `evidence` 에 **어떻게** 확인했는지
 *   적는다 (예: "원문 p.5 를 이미지로 렌더링해 표의 행·열을 눈으로 대조").
 *   근거 없이 해결로 바꾸지 않는다.
 *
 * ── 이력을 지우지 않는다 ─────────────────────────────────────────
 *
 * ★ 해결된 기록도 배열에 그대로 남는다. 「주의 기록을 다 지워야 발행된다」는
 *   방식으로 만들지 않는다 — 그러면 기록을 지우는 것이 발행 절차가 되고,
 *   무엇을 어떻게 확인했는지가 사라진다.
 *
 * ★ 문자열 대조가 통과했다는 것이 표의 대응 관계·활동 순서까지 맞다는 뜻은
 *   아니다. 글자가 모두 원문에 있어도 행과 열이 바뀌어 있을 수 있다. 그래서
 *   표·순서·발문 연결은 **쪽을 이미지로 렌더링해 눈으로** 확인한 뒤에만
 *   해결로 바꾼다.
 *
 * ★ 이 기록은 **본사 검수 화면에서만** 보인다. 교사·원장은 전사 사정을 보지
 *   않는다.
 */
export type NoteStatus = "unresolved" | "resolved";

/**
 * 기록의 종류. **해결하는 방법이 다르기 때문에** 나눈다.
 *
 * ★ `extraction` — 글자를 뽑는 과정에서 생긴 문제. 표의 행·열이 섞이거나
 *   문장이 쪽에 걸쳐 끊긴다. **원문 쪽을 보면 풀린다.** 렌더링해 확인하고
 *   해결 처리한다.
 *
 * ★ `structure` — 원문 자체가 다른 주차와 형식이 다르다 (섹션 번호가 바뀌거나,
 *   어떤 항목이 아예 없다). **형식이 다르다는 것만으로 미해결로 두지 않는다.**
 *   원문을 눈으로 확인해 그대로 반영했다면 해결이다. 화면에서 어떻게 보여
 *   줄지는 별개의 일이고, 그 자체가 전사 오류는 아니다.
 *
 * ★ `decision` — **원문 자체가 서로 모순되거나 상품 기준을 정해야 한다.**
 *   (예: 같은 문서 안에서 핵심 메시지가 두 가지, 음원명이 다른 주차와 같음)
 *   전사로 풀 수 없고 본사가 정해야 한다. **임의로 고치지 않는다.**
 *   이 종류는 {@link hqDecisionNotes} 로 따로 모아 본사 결정 목록으로 관리한다.
 */
export type NoteCategory = "extraction" | "structure" | "decision";

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> = {
  extraction: "추출·표 대응",
  structure: "원문 구조 차이",
  decision: "본사 결정 필요",
};

export interface TranscriptionNote {
  /** 원문 섹션 (예: "5. 권장 시간표") */
  section: string;
  /** 원문 페이지 */
  page: number;
  /** 무엇이 분명하지 않은가 */
  issue: string;
  /** 어떻게 풀어야 하는 문제인가 */
  category: NoteCategory;
  /** 확인했나 */
  status: NoteStatus;
  /**
   * 어떻게 확인했는가. `status: "resolved"` 면 반드시 적는다.
   *
   * ★ 미해결이면 null 이다. 「확인 예정」 같은 말을 근거로 적지 않는다.
   */
  evidence: string | null;
}

/** 아직 확인하지 못한 기록만 */
export function unresolvedNotes(notes: TranscriptionNote[]): TranscriptionNote[] {
  return notes.filter((n) => n.status === "unresolved");
}

/**
 * 본사가 정해야 하는 것들.
 *
 * ★ 전사자가 풀 수 없는 종류다. 원문이 스스로 어긋나 있거나 상품 기준을
 *   정해야 한다. 코드가 한쪽을 고르면 그것이 공식 콘텐츠가 되어 버린다.
 */
export function hqDecisionNotes(notes: TranscriptionNote[]): TranscriptionNote[] {
  return notes.filter((n) => n.category === "decision" && n.status === "unresolved");
}

export interface WeekContent {
  summary: WeekSummary;
  blocks: WeekBlocks;
  scenes: WeekScene[];
  /** 원문 파일명 — 대조 검수에 쓴다 */
  sourceFile: string | null;
  /**
   * 전사 중 분명하지 않았던 곳.
   *
   * ★ 빈 배역은 「주의할 것이 없다」가 아니라 「아직 정리하지
   *   않았다」일 수도 있다. 화면은 전사 상황과 함께 읽는다.
   */
  transcriptionNotes: TranscriptionNote[];
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
