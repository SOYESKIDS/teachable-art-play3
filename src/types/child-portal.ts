/**
 * 학부모 "아이 기록" (Child Portal) DTO (DEC-092 · DEC-103).
 *
 * 내부 id · 초안 · raw Stage · 사진 공유 기록 · audit · AI 정보를 담지 않는다.
 * 사진은 CO-9 · CO-10 · DB-9 해결 전까지 전달하지 않는다.
 */

export const PORTAL_RESOLVE_ENDPOINT = "/api/share/portal/resolve";

/** 서버가 만든 43자 base64url token */
export const PORTAL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface PortalWeeklyContent {
  topic: string | null;
  quoteChoice: string | null;
  teacherObservation: string | null;
  familyConversation: string | null;
  nextWeekPreview: string | null;
}

export interface PortalWeekly {
  weekNo: number;
  dateFrom: string | null;
  dateTo: string | null;
  /** revision > 1 일 때 "업데이트됨 YYYY.MM.DD" 의 날짜 */
  updatedOn: string | null;
  content: PortalWeeklyContent;
  /** 관찰된 모습 — 지표 이름만 (Stage 없음) */
  observedMoments: string[];
}

export interface ChildPortalData {
  organizationName: string;
  className: string | null;
  childName: string;
  thisWeek: PortalWeekly[];
  past: PortalWeekly[];
}

export type ChildPortalResolveResponse = { ok: true; portal: ChildPortalData } | { ok: false };
