import type { ClassStatus } from "./class-child";
import type { GrowthReportAiDraft } from "./staff-growth-report-ai";

/**
 * SERVICE-11A — 원아 성장 리포트 타입.
 *
 * 20260901160000_create_child_growth_reports.sql 과 1:1로 맞춘다.
 *
 * ★ 이 시스템은 아동을 평가·진단하지 않는다.
 *   score / grade / percentile / diagnosis / riskLevel / ranking /
 *   competency 같은 필드를 두지 않는다. DB에도 그런 컬럼이 없다.
 *   성장은 숫자가 아니라 "기간 동안 관찰된 변화의 서술"로만 표현된다.
 *
 * ★ 출결 숫자는 맥락(context)이지 평가 지표가 아니다.
 *   화면에서도 "몇 회 참여했는가"라는 사실로만 표시하고,
 *   비율·등급·달성도로 가공하지 않는다.
 *
 * ★ 근거는 교사가 검토·확정한 기록뿐이다.
 *   AI 초안(generated_text)은 리포트에 들어오지 않는다.
 *   이 파일 어디에도 generatedText 필드가 없는 것이 그 설계의 표현이다.
 */

/**
 * public.child_growth_reports.status
 *
 * draft    : 작성 중. 근거 새로고침·본문 수정 가능.
 * complete : 교사 작성 완료. ★ 이 기능에서는 잠금이다 —
 *            원장이 읽고 향후 학부모에게 공유될 문서라, 완료 후 조용히
 *            바뀌면 신뢰할 수 없다. DB의 UPDATE Policy가 draft만 허용한다.
 */
export type GrowthReportStatus = "draft" | "complete";

export const GROWTH_REPORT_STATUS_LABELS: Record<
  GrowthReportStatus,
  string
> = {
  draft: "작성 중",
  complete: "작성 완료",
};

/** DB CHECK와 같은 상한. 한쪽만 바뀌면 화면은 통과시키는데 DB가 거부한다. */
export const MAX_GROWTH_REPORT_TITLE = 200;
export const MAX_GROWTH_CHANGES = 4000;
export const MAX_OBSERVATION_SUMMARY = 4000;
export const MAX_NEXT_SUPPORT = 3000;

/** RPC의 c_max_sources와 같은 값 */
export const MAX_GROWTH_REPORT_SOURCES = 50;

/** 한 화면이 읽어 오는 리포트 수 상한 */
export const MAX_GROWTH_REPORT_LIST = 200;

/**
 * 출결 맥락.
 *
 * ★ 전부 서버가 계산한 값이다.
 *   DB trigger가 class_session_attendance에서 직접 집계해 덮어쓰므로
 *   Client가 보낸 숫자는 어느 경로로도 남지 않는다.
 *   (해당 컬럼들은 INSERT/UPDATE GRANT 목록에 아예 없다)
 */
export interface GrowthReportAttendanceContext {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leftEarlyCount: number;
  /** 기간 안에 이 반에서 열린(취소되지 않은) 수업 수 */
  sessionCount: number;
}

/**
 * 근거 스냅샷 한 건.
 *
 * ★ 전부 채택 시점의 사본이다.
 *   원본 관찰기록·AI 검토본·차시 제목·관찰영역 label이 나중에 바뀌어도
 *   이 값들은 변하지 않는다. 그래서 domainLabels는 code가 아니라 label이다.
 *
 * ★ reviewedText는 "교사가 검토·확정한 문장"이다.
 *   AI 원문(generated_text)은 여기에도, 화면에도 오지 않는다.
 */
export interface GrowthReportSource {
  id: string;
  observationId: string;
  sessionId: string;

  /** 수업일 (YYYY-MM-DD, 시간대 변환 없음) */
  observedOn: string | null;
  lessonTitle: string | null;
  /** "3주차 2차시" */
  lessonOrder: string | null;

  domainLabels: string[];

  /** 교사가 검토 완료한 문장 */
  reviewedText: string;
  childVoice: string | null;
  teacherNote: string | null;

  /** 채택 시점의 원본 토큰 (timestamptz 원본 문자열) */
  sourceObservationUpdatedAt: string;
  sourceAiUpdatedAt: string;
}

/** 목록 한 줄 */
export interface GrowthReportListItem {
  id: string;
  organizationId: string;
  classId: string;
  childId: string;

  className: string | null;
  classStatus: ClassStatus | null;
  childName: string | null;

  periodStart: string;
  periodEnd: string;
  title: string;
  status: GrowthReportStatus;

  sourceCount: number;

  completedAt: string | null;
  updatedAt: string;
}

/**
 * 상세 화면 전체.
 *
 * ★ updatedAt은 DB가 돌려준 문자열 그대로다.
 *   이 값이 곧 저장의 낙관적 동시성 토큰(p_expected_updated_at)이라
 *   Date로 파싱했다가 다시 문자열로 만들면 마이크로초가 잘려
 *   저장이 영원히 GR004(stale)로 실패한다. 08A/10A와 같은 규칙이다.
 */
export interface GrowthReportDetail {
  id: string;
  organizationId: string;
  classId: string;
  childId: string;

  className: string | null;
  classStatus: ClassStatus | null;
  childName: string | null;

  periodStart: string;
  periodEnd: string;
  title: string;
  status: GrowthReportStatus;

  growthChanges: string | null;
  observationSummary: string | null;
  nextSupport: string | null;

  attendance: GrowthReportAttendanceContext;
  sources: GrowthReportSource[];

  completedAt: string | null;
  createdAt: string;
  /** ★ 저장의 동시성 토큰. 가공하지 않는다. */
  updatedAt: string;

  /**
   * SERVICE-11B — 이 리포트의 AI 초안 (교사 화면 전용).
   *
   * ★ 원장에게는 언제나 null 이다 — DB SELECT Policy 에 원장 분기가 없어
   *   조회 자체가 0건이 된다. 화면 조건이 아니라 RLS 가 만드는 경계다.
   * ★ 이 값이 리포트의 공식 문장이 되는 것은 교사가 "초안 적용"을 누른 뒤
   *   growthChanges / observationSummary / nextSupport 로 복사될 때뿐이다.
   */
  aiDraft: GrowthReportAiDraft | null;
}

/** 교사가 리포트를 만들 때 고를 수 있는 반·원아 */
export interface GrowthReportClassOption {
  classId: string;
  className: string;
  classStatus: ClassStatus;
  children: {
    childId: string;
    childName: string;
  }[];
}

export type GrowthReportListResult =
  | { ok: true; reports: GrowthReportListItem[] }
  | { ok: false; reason: "load_failed" };

export type GrowthReportDetailResult =
  | { ok: true; report: GrowthReportDetail }
  | { ok: false; reason: "invalid_id" | "not_found" | "load_failed" };

/** 리포트 생성/근거 새로고침 Server Action 결과 */
export type GrowthReportCreateState =
  | {
      ok: true;
      reportId: string;
      created: boolean;
      sourceCount: number;
    }
  | {
      ok: false;
      message: string;
    };

/** 본문 저장 Server Action 결과 */
export type GrowthReportSaveState =
  | {
      ok: true;
      status: GrowthReportStatus;
      /** 다음 저장에 그대로 쓸 토큰 */
      updatedAt: string;
    }
  | {
      ok: false;
      /** stale이면 화면이 "새로고침" 안내를 띄운다 */
      kind: "error" | "stale" | "locked";
      message: string;
    };

/** 기간 표기 "2026.08.01 ~ 2026.09.30" */
export function formatReportPeriod(
  start: string,
  end: string,
): string {
  return `${start.replaceAll("-", ".")} ~ ${end.replaceAll("-", ".")}`;
}
