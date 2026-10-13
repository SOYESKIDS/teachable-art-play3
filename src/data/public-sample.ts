import type { WeekScene } from "@/lib/weeks/week-types";

/**
 * 공개 샘플 수업 — 화면 구조를 보여 주는 용도.
 *
 * ── 왜 교안에서 가져오지 않는가 ──────────────────────────────────
 *
 * ★ 공식 교사용 수업가이드의 발문·활동은 계약한 원에 제공하는 자료다. 공개
 *   페이지에 올리려면 **어느 주차의 무엇을 공개할지 따로 허락**받아야 한다.
 *   아직 그 허락이 없으므로 교안에서 한 문장도 가져오지 않는다.
 *
 * ★ 그래서 아래 장면은 **화면 사용법을 설명하는 문장**이다. 수업 내용이
 *   아니고, 수업 내용인 척하지도 않는다. 화면에도 그렇게 적는다.
 *
 * ── 실제 샘플이 허락되면 ─────────────────────────────────────────
 *
 * `approvedLessonSample` 을 채우고 `hasApprovedLessonSample` 이 true 가 되면
 * 페이지가 그쪽을 보여 준다. 그때까지는 구조 설명만 나간다.
 */

/** 공개가 허락된 실제 수업 샘플. 아직 없다 */
export const approvedLessonSample: {
  weekNo: number;
  title: string;
  scenes: WeekScene[];
} | null = null;

export const hasApprovedLessonSample = approvedLessonSample !== null;

/**
 * 화면 구조 설명용 장면.
 *
 * ★ 수업 발문이 아니다. 교실 화면이 어떻게 넘어가는지 보여 주는 안내문이다.
 * ★ 원아 이름·사진이 없다. 공개 페이지이므로 애초에 담지 않는다.
 */
export const screenTourScenes: WeekScene[] = [
  {
    sceneNo: 1,
    sceneType: "intro",
    kidText: "교실 화면은 이렇게 보입니다",
    stageLabel: "화면 설명 1 · 도입",
    teacherNote:
      "실제 수업에서는 이 자리에 그 주차의 첫 질문이 들어갑니다. 한 장면에 문장 하나만 둡니다.",
    sourceRef: "화면 설명 (수업 내용 아님)",
    baseSeconds: null,
  },
  {
    sceneNo: 2,
    sceneType: "story",
    kidText: "그림책 장면에서 멈춥니다",
    stageLabel: "화면 설명 2 · 그림책",
    teacherNote:
      "그림책을 함께 보다가 아이가 먼저 말할 시간을 줍니다. 자료 파일은 계약한 원에 제공됩니다.",
    sourceRef: "화면 설명 (수업 내용 아님)",
    baseSeconds: null,
  },
  {
    sceneNo: 3,
    sceneType: "promise",
    kidText: "활동 약속을 함께 정합니다",
    stageLabel: "화면 설명 3 · 활동 약속",
    teacherNote: "활동 전에 지킬 약속을 1~3개만 크게 띄웁니다.",
    sourceRef: "화면 설명 (수업 내용 아님)",
    baseSeconds: null,
  },
  {
    sceneNo: 4,
    sceneType: "play",
    kidText: "놀이를 시작하면 화면을 쉽니다",
    stageLabel: "화면 설명 4 · 활동",
    teacherNote:
      "활동 중에는 「화면 쉬기」로 화면을 비워 아이들이 화면이 아니라 놀이에 집중하게 합니다.",
    sourceRef: "화면 설명 (수업 내용 아님)",
    baseSeconds: null,
  },
  {
    sceneNo: 5,
    sceneType: "share",
    kidText: "오늘 발견한 것을 나눕니다",
    stageLabel: "화면 설명 5 · 마무리",
    teacherNote: "마무리 한 문장으로 수업을 닫고, 교사는 관찰한 장면을 짧게 기록합니다.",
    sourceRef: "화면 설명 (수업 내용 아님)",
    baseSeconds: null,
  },
];

export const sampleCopy = {
  eyebrow: "샘플 수업",
  headline: "교실 화면을 먼저 보세요",
  subCopy:
    "수업 중 교실 TV·전자칠판에 띄우는 화면입니다. 이전·다음으로 넘기고, 전체화면과 화면 쉬기를 눌러 보실 수 있습니다.",
  notLessonNotice:
    "아래 장면은 화면 사용법을 보여 주는 예시이며 실제 수업 내용이 아닙니다. 회차별 수업안과 발문은 계약한 원의 교사 화면에서 제공됩니다.",
  noPersonalData:
    "교실 화면에는 원아 이름·사진·관찰 기록이 표시되지 않습니다. 이 페이지에도 들어 있지 않습니다.",
  themeColor: "#2B7F5E",
};
