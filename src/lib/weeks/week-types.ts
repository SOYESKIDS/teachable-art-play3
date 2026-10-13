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

/**
 * 원문 표 하나. 열 제목까지 데이터로 들고 간다.
 *
 * ── 왜 열 제목이 데이터인가 ────────────────────────────────────
 *
 * 1·2·3권이 같은 섹션 번호를 쓰지만 표의 열 제목이 다르다. 예를 들어
 * 14번 표는 1·2권이 「상황 / 피해야 할 반응 / 권장 대응」이고 3권은
 * 「상황 / 교사가 볼 점 / 바로 사용할 말」이다. 뜻이 다른 칸이다.
 * 화면이 제목을 고정해 그리면 교사가 **다른 뜻으로 읽는다.**
 *
 * ★ rows 의 각 줄은 columns 와 길이가 같아야 한다.
 */
export interface SourceTable {
  columns: string[];
  rows: string[][];
}

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
  /**
   * C항의 원문 제목. 대부분 「안전 확인」이지만 16주차는 「안전·개인정보 확인」이다.
   * 화면이 제목을 고정해 그리면 원문과 달라지므로 주차마다 그대로 담는다.
   */
  safetyLabel: string;
}

/**
 * 5. 권장 시간표 / 관찰 시간표 (권마다 다르다)
 *
 * 1·2권: 「단계 / 시간 / 교사 역할 / 아이 경험」 네 칸.
 * 3권: 「단계 / 교사가 볼 것 / 관찰 예시」 세 칸 — **시간 칸이 없다.**
 *   없는 시간을 화면이 지어내지 않도록 표를 그대로 담는다.
 */
export interface TimetableBlock {
  kind: "time" | "observation";
  table: SourceTable;
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
  /** 교사 주의 · 교사 팁 등 */
  notes: string[];
  /**
   * 소제목이 붙은 별도 목록이 들어가는 단계가 있다
   * (3권 「N주 핵심 연결 문장」). 목록에 섞으면 교사 발문으로 읽힌다.
   */
  extraList: { label: string; items: string[] } | null;
}

/** 7. 핵심활동 */
export interface CoreActivityBlock {
  title: string;
  intro: string | null;
  /** PLAY / MISSION / 탐험 장소 등 주차마다 단계 수가 다르다 */
  plays: {
    label: string | null;
    title: string;
    points: string[];
    /**
     * 원문이 표로 둔 묶음. 열 제목이 주차마다 다르다
     * (순서/교사 행동/교사 언어 · 단계/진행 방법/교사 언어 · 단계/움직임/교사 언어 ·
     *  카드 예시/표현에서 볼 점/교사 언어). 한 줄로 이어 적으면 어느 칸의 말인지가 사라진다.
     * 표가 없는 묶음은 null 이다.
     */
    stepTable: { columns: string[]; rows: string[][] } | null;
  }[];
  /**
   * 현장 난이도·개별 지원 표. 열 제목이 권마다 다르다
   * (1권 「아이 상태 / 바로 적용할 조절」, 2권 「상황 / 바로 적용할 조절」).
   * 3권에는 이 표가 없어 null 이다 — 비어 있는 것이 아니라 원문에 없다.
   */
  adaptations: SourceTable | null;
  /**
   * 핵심활동 안의 상황표. 1권 일부(「관찰 상황 / 교사 개입」)와
   * 3권(「상황 / 바로 사용할 교사 말」)에 있다. 없으면 null.
   */
  situations: SourceTable | null;
}

/** 8 또는 9. 워크북 */
export interface WorkbookBlock {
  title: string | null;
  intro: string | null;
  /**
   * 열 제목이 권마다 다르다.
   * 1권 「활동 / 교사 초점 / 발문 예시」, 2권 「활동 방향 / 교사 초점 / 발문 예시」,
   * 3권 「활동 방향 / 교사 질문 / 관찰 포인트」 — 3권은 셋째 칸의 뜻 자체가 다르다.
   */
  table: SourceTable;
  /**
   * 표 뒤에 이어지는 마무리 문장. 2권(9~16주차)에만 있다.
   * 1권·3권에는 원문에 없으므로 null 로 둔다 — 지어내지 않는다.
   */
  outro: string | null;
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

/**
 * 10. 음원·뮤직비디오 활용(1·2권) / 활동을 관찰하며 보는 포인트(3권)
 *
 * 같은 번호지만 다른 섹션이다. 1·2권은 「콘텐츠 / 권장 사용 시점 / 활용」
 * 세 칸, 3권은 「관찰 포인트 / 예시 행동」 두 칸이다.
 */
export interface MediaOrWatchBlock {
  kind: "media" | "watch";
  /** 원문 섹션 제목 (1·2권 「음원·뮤직비디오 활용」, 3권 「활동을 관찰하며 보는 포인트」) */
  title: string;
  table: SourceTable;
}

/** 11. 마무리 대화 */
export interface ClosingBlock {
  intro: string | null;
  questions: string[];
  /** 상자의 원문 제목. 1·2권 「마지막 한 문장」, 3권 「마무리 한 문장」 */
  closingLineLabel: string | null;
  closingLine: string | null;
}

/** 12. 관찰 및 기록 가이드 */
export interface ObservationGuideBlock {
  /**
   * 1·2권 「관찰영역 / 관찰할 행동 / 기록 문장에 담을 것」,
   * 3권 「관찰영역 / 관찰 행동 / 기록 문장 예시」.
   */
  table: SourceTable;
  /** 기록 예시 묶음의 원문 제목 (「키즈노트 기록 예시」·「키즈노트 성장기록 예시」 등) */
  recordExampleLabel: string | null;
  /** 기록 예시 (원문). 교사가 복사해 쓰지 않도록 화면에서 접어 둔다 */
  recordExample: string | null;
  /** 주의 묶음의 원문 제목 (3권 「기록 시 주의」). 없으면 null */
  cautionsLabel: string | null;
  cautions: string[];
}

/** 13. 가정연계 */
export interface HomeConnectionBlock {
  title: string;
  description: string | null;
  /**
   * steps 묶음의 원문 소제목. 「진행 방법」(2권 다수), 「영상편지 준비 안내」(16주),
   * 「가정에 안내할 질문 예시」(7·8주) 등 주차마다 다르다.
   * 소제목 없이 목록만 있는 주차도 있어 null 을 허용한다.
   */
  stepsLabel: string | null;
  steps: string[];
  /**
   * 진행 방법과 핵심 문장 사이에 소제목이 붙은 예시 묶음이 들어가는 주차가 있다 (2주차 「가정 미션 예시」).
   * 소제목이 원문마다 다르므로 label 을 함께 담는다. 없으면 null.
   */
  examples: { label: string; text: string } | null;
  /**
   * 안내 문구 묶음의 원문 소제목.
   * 1·2권 「부모님께 전달할 핵심 문장」, 3권 「안내 문구 예시」.
   */
  noticeLabel: string | null;
  noticeExample: string | null;
  /**
   * 핵심 문장 뒤에 이어지는 마무리 문단. 진행 방법 항목이 아니다.
   * 9~13주차는 「숨은 성장 연결: …」, 16주차는 「숨은 성장 이야기는 …」,
   * 14·15주차는 다음 계절로 잇는 다른 형식의 문장이다. 1권(1~8주차)에는 없다.
   * 원문 문장을 그대로 담는다 — 요약하거나 지어내지 않는다.
   */
  closingNote: string | null;
  /** 원문이 「미정」인 주차가 있다 (19주) */
  status: "ready" | "undecided";
}

/**
 * 14. 수업 중 이런 상황이 생기면
 *
 * 1·2권 「상황 / 피해야 할 반응 / 권장 대응」,
 * 3권 「상황 / 교사가 볼 점 / 바로 사용할 말」.
 * 가운데 칸의 뜻이 정반대다 — 하지 말 것 vs 살펴볼 것. 섞으면 안 된다.
 */
export type SituationsBlock = SourceTable;

/** 15. 교사용 1페이지 퀵 가이드 */
export interface QuickGuideBlock {
  goal: string;
  /**
   * 1·2권 「순서 / 교사가 할 일 / 핵심 문장」, 3권 「순서 / 교사가 할 일 / 핵심 질문」.
   */
  table: SourceTable;
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
  situations: SituationsBlock | null;
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
