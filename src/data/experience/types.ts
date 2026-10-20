/**
 * 공개 체험(/experience) 데이터 타입.
 *
 * ★ 이 폴더의 데이터는 **공개 데모 전용**이다. DB 를 읽지 않고, 어떤 서버 쿼리도
 *   부르지 않는다. 실제 기관 · 원아 · 보호자 정보는 여기에 들어오지 않는다.
 *
 * ★ 출처를 세 갈래로 나눈다. 화면은 이 값을 보고 안내 문구를 붙인다.
 *   official   — 공식 24주 지도에 이미 공개된 값 (주차명 · 성장 키워드 · 핵심 메시지 ·
 *                수업 시간 · 대표 활동 · 결과물). `src/lib/weeks/week-index.ts` 가 단일 출처다.
 *   adapted    — 공식 교사용 가이드의 수업 흐름을 체험용으로 짧게 재구성 (본사 검수 전)
 *   demo_draft — 체험용으로 새로 쓴 임시 구성. 정식 교안이 아니다.
 */
export type ExperienceContentStatus = "official" | "adapted" | "demo_draft";

export const CONTENT_STATUS_LABEL: Record<ExperienceContentStatus, string> = {
  official: "공식 교육과정",
  adapted: "공식 가이드 기반 체험 구성 · 검수 전",
  demo_draft: "체험용 구성 · 정식 교안 확정 전",
};

/** 수업 진행 다섯 단계 — 실제 주차에 공식 순서가 있으면 그 순서를 쓴다. */
export type StageKey = "story" | "move" | "explore" | "make" | "share";

export const STAGE_LABEL: Record<StageKey, string> = {
  story: "이야기 만나기",
  move: "몸으로 표현하기",
  explore: "탐색하기",
  make: "만들기",
  share: "정리하고 나누기",
};

export type MotifKey =
  | "school" | "medal" | "heart" | "seed" | "flower" | "house" | "butterfly" | "forest"
  | "blossom" | "bug" | "plane" | "leaf" | "moon" | "chat" | "bell" | "seasons"
  | "paint" | "water" | "drum" | "tomato" | "balloon" | "pumpkin" | "gift" | "globe";

export type CharacterKey = "pupu" | "bukgeuki" | "cat" | "maru" | "ubi" | "ella";

export interface ExperienceImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ClassStage {
  key: StageKey;
  title: string;
  /** 교실 화면에 크게 띄우는 한 줄 (아이들이 보는 글) */
  childLine: string;
  /** 교사용 한 문장 활동 안내 */
  guide: string;
  /** 교사 발문 */
  teacherQuestion: string;
  minutes: number;
}

/** 공식 지도 메타 — week-index.ts 에서 그대로 가져온다 */
export interface OfficialWeekMeta {
  weekNo: number;
  partNo: 1 | 2 | 3;
  title: string;
  growthKeyword: string;
  coreMessage: string;
  durationLabel: string;
  activitySummary: string;
  /** 공식 지도에 비어 있으면 null — 화면은 대체하지 않고 "정리 중"으로 둔다 */
  outcome: string | null;
  themeColor: string;
}

/** 체험용 본문 — 손으로 쓴 데이터 (demo-lessons.ts) */
export interface DemoLessonBody {
  weekNo: number;
  status: Exclude<ExperienceContentStatus, "official">;
  motif: MotifKey;
  character: CharacterKey;
  goal: string;
  coreExperiences: string[];
  /** 누리과정 5개 영역 공식 명칭만 (taxonomies.ts NURI_AREA_LABEL) */
  nuriAreas: string[];
  /** 승인된 SOYE KIDS 핵심경험만 (taxonomies.ts APPROVED_SOYE_CORE_EXPERIENCES) */
  soyeCoreExperiences: string[];
  materials: string[];
  story: string;
  movement: string;
  music: string;
  explore: string;
  art: string;
  teacherQuestions: string[];
  observationPoints: string[];
  homeConnection: string;
  safety: string[];
  /** 각 단계의 교실 화면 문장 */
  childLines: Record<StageKey, string>;
  /** 마무리 질문 */
  closingQuestion: string;
}

export interface ExperienceWeek extends OfficialWeekMeta {
  body: DemoLessonBody;
  stages: ClassStage[];
  image: ExperienceImage | null;
  totalMinutes: number;
}

export interface ExperiencePart {
  partNo: 1 | 2 | 3;
  title: string;
  nameProvisional: boolean;
  tagline: string;
  description: string;
  weekFrom: number;
  weekTo: number;
  tone: "mint" | "sky" | "pink";
  character: CharacterKey;
  image: ExperienceImage;
}
