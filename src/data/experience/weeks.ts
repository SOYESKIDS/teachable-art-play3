import { WEEK_INDEX } from "@/lib/weeks/week-index";
import { PARTS } from "@/lib/weeks/week-types";
import { DEMO_LESSONS } from "./demo-lessons";
import { MEDIA, WEEK_MEDIA } from "./media";
import {
  STAGE_LABEL,
  type ClassStage,
  type DemoLessonBody,
  type ExperiencePart,
  type ExperienceWeek,
  type OfficialWeekMeta,
  type StageKey,
} from "./types";

/**
 * 공개 체험 24주 — 공식 지도 메타 + 체험용 본문.
 *
 * ★ 공식 값(주차명 · 성장 키워드 · 핵심 메시지 · 수업 시간 · 대표 활동 · 결과물 · 색)은
 *   week-index.ts 에서 읽기만 한다. 여기서 고치지 않는다.
 * ★ week-index.ts 는 정적 데이터 파일이다 — DB · Supabase 를 부르지 않는다.
 *   (tests/experience-isolation.test.mjs 가 이 폴더의 import 를 검사한다)
 */

export const STAGE_ORDER: StageKey[] = ["story", "move", "explore", "make", "share"];

/** 다섯 단계의 시간 비중 — 만들기가 가장 길다 */
const STAGE_WEIGHT: Record<StageKey, number> = { story: 16, move: 20, explore: 18, make: 30, share: 16 };

/** "약 55~65분" → 60 (가운데 값). 읽지 못하면 60 */
export function parseDurationMinutes(label: string): number {
  const m = label.match(/(\d+)\s*~\s*(\d+)/);
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2);
  const one = label.match(/(\d+)/);
  return one ? Number(one[1]) : 60;
}

/** 합이 총 시간과 정확히 같도록 나눈다 (반올림 오차는 만들기 단계가 흡수) */
export function splitMinutes(total: number): Record<StageKey, number> {
  const sum = STAGE_ORDER.reduce((s, k) => s + STAGE_WEIGHT[k], 0);
  const out = {} as Record<StageKey, number>;
  let used = 0;
  for (const k of STAGE_ORDER) {
    out[k] = Math.max(3, Math.round((total * STAGE_WEIGHT[k]) / sum));
    used += out[k];
  }
  out.make += total - used;
  return out;
}

function buildStages(body: DemoLessonBody, total: number): ClassStage[] {
  const minutes = splitMinutes(total);
  const guide: Record<StageKey, string> = {
    story: body.story,
    move: body.movement,
    explore: body.explore,
    make: body.art,
    share: body.homeConnection,
  };
  const question: Record<StageKey, string> = {
    story: body.teacherQuestions[0],
    move: body.teacherQuestions[1] ?? body.teacherQuestions[0],
    explore: body.teacherQuestions[1] ?? body.teacherQuestions[0],
    make: body.teacherQuestions[2] ?? body.teacherQuestions[0],
    share: body.closingQuestion,
  };
  return STAGE_ORDER.map((key) => ({
    key,
    title: STAGE_LABEL[key],
    childLine: body.childLines[key],
    guide: guide[key],
    teacherQuestion: question[key],
    minutes: minutes[key],
  }));
}

function officialMeta(weekNo: number): OfficialWeekMeta {
  const w = WEEK_INDEX.find((x) => x.weekNo === weekNo);
  if (!w) throw new Error(`week-index 에 ${weekNo}주차가 없다`);
  return {
    weekNo: w.weekNo,
    partNo: w.partNo as 1 | 2 | 3,
    title: w.title,
    growthKeyword: w.growthKeyword,
    coreMessage: w.coreMessage,
    durationLabel: w.durationLabel,
    activitySummary: w.activitySummary,
    outcome: w.outcome && w.outcome.trim() !== "" ? w.outcome : null,
    themeColor: w.themeColor,
  };
}

export const EXPERIENCE_WEEKS: ExperienceWeek[] = DEMO_LESSONS.map((body) => {
  const meta = officialMeta(body.weekNo);
  const totalMinutes = parseDurationMinutes(meta.durationLabel);
  return {
    ...meta,
    body,
    stages: buildStages(body, totalMinutes),
    image: WEEK_MEDIA[body.weekNo] ?? null,
    totalMinutes,
  };
}).sort((a, b) => a.weekNo - b.weekNo);

export function experienceWeek(weekNo: number): ExperienceWeek | null {
  return EXPERIENCE_WEEKS.find((w) => w.weekNo === weekNo) ?? null;
}

export function weeksInPart(partNo: number): ExperienceWeek[] {
  return EXPERIENCE_WEEKS.filter((w) => w.partNo === partNo);
}

/** 대표 체험 주차 — 4주차 《소예의 씨앗》 */
export const FEATURED_WEEK_NO = 4;

const PART_COPY: Record<1 | 2 | 3, Omit<ExperiencePart, "partNo" | "title" | "nameProvisional" | "weekFrom" | "weekTo">> = {
  1: {
    tagline: "나를 알고, 친구를 만나요",
    description: "작은 씨앗이 숲이 되듯, 새 교실에서 나와 친구를 알아 가는 여덟 번의 모험.",
    tone: "mint",
    character: "pupu",
    image: MEDIA.classroom,
  },
  2: {
    tagline: "계절과 함께 자라요",
    description: "봄 꽃비부터 겨울 영상편지까지, 사계절의 색과 마음을 몸으로 느끼는 여덟 번의 여행.",
    tone: "sky",
    character: "bukgeuki",
    image: MEDIA.artPlay, // 예전 heroMusic 은 사용권 미확인 스티커가 있어 공개 화면에서 뺐다
  },
  3: {
    tagline: "세상과 어울려요",
    description: "색 · 물 · 소리 · 하늘, 그리고 세계의 축제로 넓어지는 마지막 여덟 번의 탐험.",
    tone: "pink",
    character: "ella",
    image: MEDIA.paintSplash,
  },
};

export const EXPERIENCE_PARTS: ExperiencePart[] = PARTS.map((p) => ({
  partNo: p.partNo as 1 | 2 | 3,
  title: p.title,
  nameProvisional: p.nameProvisional,
  weekFrom: p.weekFrom,
  weekTo: p.weekTo,
  ...PART_COPY[p.partNo as 1 | 2 | 3],
}));

export function experiencePart(partNo: number): ExperiencePart | null {
  return EXPERIENCE_PARTS.find((p) => p.partNo === partNo) ?? null;
}
