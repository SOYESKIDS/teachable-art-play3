import { WEEK_INDEX } from "@/lib/weeks/week-index";
import { PARTS } from "@/lib/weeks/week-types";

/**
 * 공개 사이트용 24주 소개 데이터.
 *
 * ── 교안과 분리한다 ──────────────────────────────────────────────
 *
 * ★ 이 파일은 **요약만** 만든다. 15개 섹션 본문 · 발문 · 교사 대응 · 교실
 *   장면은 담지 않는다. 공개 페이지가 `getWeekContent()` 를 부르지 않도록
 *   여기서 좁혀서 내보낸다 — 서버 컴포넌트가 읽은 값은 그대로 HTML 에 실려
 *   나가므로, 공개 화면에서 접어 두는 것으로는 부족하다.
 *
 * ★ 담는 값: 주차 번호 · 수업명 · 성장키워드 · 핵심 메시지 한 줄 · 결과물 ·
 *   테마색. 전부 상품소개서와 같은 수준의 소개 정보다.
 *
 * ── 제공 상태를 부풀리지 않는다 ──────────────────────────────────
 *
 * ★ 현재 공개 약속은 `src/data/packages.ts` 가 기준이다. 거기서 9주 이후
 *   콘텐츠·워크북은 상품별 `pendingItems` 에 「준비 중」으로 적혀 있다.
 *   이 파일은 같은 선을 따른다 — 소개 페이지가 상품 페이지보다 많은 것을
 *   약속하면 두 화면이 어긋난다.
 *
 * ★ 내부 전사·검수 상태는 공개하지 않는다. 그것은 운영 정보이지 고객이
 *   판단할 값이 아니다. 대신 「제공 중 / 준비 중」 한 가지만 적는다.
 */

/** 공개 페이지가 쓰는 한 주차 요약 */
export interface PublicWeek {
  weekNo: number;
  partNo: number;
  title: string;
  growthKeyword: string;
  /** 한 줄 소개 */
  coreMessage: string;
  /** 대표 활동 한 줄 */
  activitySummary: string;
  outcome: string | null;
  themeColor: string;
  /** 지금 제공되는 주차인가 */
  available: boolean;
}

/**
 * 현재 제공 중인 주차 범위.
 *
 * ★ 1~8주. `packages.ts` 의 STANDARD·PREMIUM `pendingItems` 에 9주 이후
 *   콘텐츠가 「준비 중」으로 적혀 있는 것과 같은 선이다.
 * ★ 콘텐츠가 더 열리면 이 값 하나만 바꾼다.
 */
export const AVAILABLE_THROUGH_WEEK = 8;

export const publicWeeks: PublicWeek[] = WEEK_INDEX.map((w) => ({
  weekNo: w.weekNo,
  partNo: w.partNo,
  title: w.title,
  growthKeyword: w.growthKeyword,
  coreMessage: w.coreMessage,
  activitySummary: w.activitySummary,
  outcome: w.outcome,
  themeColor: w.themeColor,
  available: w.weekNo <= AVAILABLE_THROUGH_WEEK,
}));

export interface PublicPart {
  partNo: number;
  title: string;
  weekFrom: number;
  weekTo: number;
  /** 공식 가이드에 파트명이 없어 임시로 적은 이름인가 */
  nameProvisional: boolean;
  weeks: PublicWeek[];
}

export const publicParts: PublicPart[] = PARTS.map((p) => ({
  partNo: p.partNo,
  title: p.title,
  weekFrom: p.weekFrom,
  weekTo: p.weekTo,
  nameProvisional: p.nameProvisional,
  weeks: publicWeeks.filter((w) => w.partNo === p.partNo),
}));

/** 통합·회고 주차 */
export const INTEGRATION_WEEKS = [8, 16, 24];

export const curriculumCopy = {
  eyebrow: "24주 수업",
  headline: "24주, 세 권의 이야기",
  subCopy:
    "8주마다 한 권의 이야기가 끝나고, 마지막 주에 그동안 만든 것들이 모여 하나의 작품이 됩니다.",
  availabilityNote: `현재 제공되는 수업은 1~${AVAILABLE_THROUGH_WEEK}주입니다. 9주 이후 콘텐츠와 워크북은 준비 중이며, 상품 안내의 「준비 중」 항목과 같은 기준입니다.`,
  detailNote:
    "회차별 수업안 · 발문 · 관찰 기준 등 교사용 상세 내용은 계약한 원의 교사 화면에서 제공됩니다. 이 페이지는 과정 소개입니다.",
  partNote: "17~24주 묶음 이름은 공식 가이드에 없어 임시로 적었습니다. 확정 후 바뀝니다.",
};
