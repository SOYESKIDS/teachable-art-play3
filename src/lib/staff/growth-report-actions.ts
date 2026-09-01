"use server";

import { refresh } from "next/cache";
import { requireTeacher } from "@/lib/auth/organization";
import {
  MAX_GROWTH_CHANGES,
  MAX_GROWTH_REPORT_TITLE,
  MAX_NEXT_SUPPORT,
  MAX_OBSERVATION_SUMMARY,
  type GrowthReportCreateState,
  type GrowthReportSaveState,
  type GrowthReportStatus,
} from "@/types/staff-growth-report";

/**
 * SERVICE-11A — 성장 리포트 Server Action.
 *
 * ★ 교사만 도달할 수 있다. 두 함수 모두 requireTeacher()로 시작한다.
 *   20260901160000의 쓰기 Policy에도 director 분기가 없다.
 *
 * ★ Client가 보내는 값 중 권한 근거로 쓰는 것은 없다.
 *   organization_id · created_by · completed_by · 출결 숫자 · 근거 스냅샷은
 *   전부 DB(RPC·trigger)가 만든다. 화면은 반/원아/기간/본문만 보낸다.
 *
 * ★ Client가 근거 id 목록을 보내는 경로가 없다.
 *   어떤 관찰기록이 자격을 갖췄는지는 RPC가 DB에서 직접 고른다.
 *
 * ★ service_role을 쓰지 않는다. 사용자 세션 client + RLS만 사용한다.
 * ★ 이 파일은 OpenAI를 호출하지 않는다. 이미 확정된 텍스트만 모은다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** date 컬럼 — 시간대 변환 없이 "YYYY-MM-DD" 문자열 그대로 다룬다 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PostgREST가 돌려주는 timestamptz 문자열의 모양만 확인한다.
 * 값을 다시 만들지 않는다 — 마이크로초가 잘리면 영구 GR004가 된다.
 */
const TIMESTAMPTZ_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?$/;

/** 20260901160000이 직접 던지는 코드 */
const GR_INVALID_INPUT = "GR001";
const GR_NOT_FOUND = "GR002";
const GR_NO_SOURCE = "GR003";
const GR_STALE = "GR004";
const GR_LOCKED = "GR005";

/** unique(child_id, period_start, period_end) */
const UNIQUE_VIOLATION = "23505";
/** trigger / CHECK 제약 */
const CHECK_VIOLATION = "23514";
/** RLS Policy 위반 */
const RLS_VIOLATION = "42501";

const MESSAGES = {
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  invalidPeriod: "리포트 기간을 확인해주세요. 시작일이 종료일보다 늦을 수 없습니다.",
  notFound: "리포트 또는 반·원아를 찾을 수 없거나 접근 권한이 없습니다.",
  noSource:
    "이 기간에 검토 완료된 관찰기록이 없습니다. 관찰기록을 작성 완료하고 AI 정리를 검토 완료한 뒤 다시 시도해주세요.",
  locked:
    "작성 완료된 리포트는 수정할 수 없습니다.",
  titleRequired: "리포트 제목을 입력해주세요.",
  titleTooLong: `리포트 제목은 ${MAX_GROWTH_REPORT_TITLE}자 이내로 입력해주세요.`,
  growthTooLong: `성장 변화는 ${MAX_GROWTH_CHANGES.toLocaleString("ko-KR")}자 이내로 입력해주세요.`,
  summaryTooLong: `관찰 요약은 ${MAX_OBSERVATION_SUMMARY.toLocaleString("ko-KR")}자 이내로 입력해주세요.`,
  supportTooLong: `다음 지원 방향은 ${MAX_NEXT_SUPPORT.toLocaleString("ko-KR")}자 이내로 입력해주세요.`,
  completeNeedsAll:
    "작성 완료로 저장하려면 성장 변화 · 관찰 요약 · 다음 지원 방향을 모두 입력해야 합니다.",
  stale:
    "리포트가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  notAllowed:
    "이 리포트를 저장할 권한이 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  failure: "리포트를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

/** 서버 로그에만 남긴다. DB 원문 메시지를 화면에 내보내지 않는다. */
function logFailure(scope: string, message: string) {
  console.error(`[staff/growth-report] ${scope} failed: ${message}`);
}

/** PostgreSQL char_length와 같은 기준(code point)으로 센다 */
function characterCount(value: string): number {
  return [...value].length;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * 리포트를 만들거나 근거를 새로 모은다.
 *
 * ★ 근거가 하나도 없으면 리포트를 만들지 않는다(GR003).
 *   RPC 안에서 예외가 나면 그 호출 전체가 rollback되므로,
 *   "근거 없는 빈 리포트"가 남는 경로가 없다.
 */
export async function createOrRefreshGrowthReportAction(input: {
  classId: string;
  childId: string;
  periodStart: string;
  periodEnd: string;
  title?: string | null;
}): Promise<GrowthReportCreateState> {
  const classId = String(input?.classId ?? "");
  const childId = String(input?.childId ?? "");
  const periodStart = String(input?.periodStart ?? "").trim();
  const periodEnd = String(input?.periodEnd ?? "").trim();
  const title = normalizeText(input?.title);

  if (!UUID_PATTERN.test(classId) || !UUID_PATTERN.test(childId)) {
    return { ok: false, message: MESSAGES.invalidRequest };
  }

  if (
    !DATE_PATTERN.test(periodStart) ||
    !DATE_PATTERN.test(periodEnd)
  ) {
    return { ok: false, message: MESSAGES.invalidRequest };
  }

  // 문자열 비교로 충분하다 — 두 값 모두 같은 "YYYY-MM-DD" 형식이다.
  if (periodStart > periodEnd) {
    return { ok: false, message: MESSAGES.invalidPeriod };
  }

  if (title !== null && characterCount(title) > MAX_GROWTH_REPORT_TITLE) {
    return { ok: false, message: MESSAGES.titleTooLong };
  }

  // 로그인 + role='teacher' + membership active + 기관 active를 DB가 판정한다.
  const { supabase } = await requireTeacher();

  /**
   * ★ organization_id를 넘기지 않는다.
   *   RPC가 p_class_id로 조회한 반 행에서 직접 만든다.
   *   담당하지 않는 반이면 RLS 때문에 그 조회가 0건이 되어 GR002로 끝난다.
   */
  const { data, error } = await supabase.rpc(
    "create_or_refresh_child_growth_report",
    {
      p_class_id: classId,
      p_child_id: childId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_title: title,
    },
  );

  if (error) {
    logFailure("create or refresh", error.message);

    switch (error.code) {
      case GR_INVALID_INPUT:
        return { ok: false, message: MESSAGES.invalidPeriod };
      case GR_NOT_FOUND:
        return { ok: false, message: MESSAGES.notFound };
      case GR_NO_SOURCE:
        return { ok: false, message: MESSAGES.noSource };
      case GR_LOCKED:
        return { ok: false, message: MESSAGES.locked };
      case UNIQUE_VIOLATION:
      case GR_STALE:
        return { ok: false, message: MESSAGES.stale };
      case RLS_VIOLATION:
      case CHECK_VIOLATION:
        return { ok: false, message: MESSAGES.notAllowed };
      default:
        return { ok: false, message: MESSAGES.failure };
    }
  }

  const row = readCreateResult(data);

  if (!row) {
    logFailure("create or refresh", "unexpected rpc payload");
    return { ok: false, message: MESSAGES.failure };
  }

  refresh();

  return {
    ok: true,
    reportId: row.reportId,
    created: row.created,
    sourceCount: row.sourceCount,
  };
}

/**
 * 리포트 본문 저장 / 완료.
 *
 * ★ expectedUpdatedAt은 화면이 받은 문자열 그대로 넘긴다.
 *   서버가 방금 읽은 값으로 바꿔치기하면 낙관적 동시성이 무력화된다.
 *
 * ★ completed_by / completed_at / 출결 맥락은 넘기지 않는다.
 *   DB trigger가 auth.uid()와 실제 출결 집계로 채운다.
 */
export async function saveGrowthReportAction(input: {
  reportId: string;
  title: string;
  growthChanges: string;
  observationSummary: string;
  nextSupport: string;
  status: string;
  expectedUpdatedAt: string;
}): Promise<GrowthReportSaveState> {
  const reportId = String(input?.reportId ?? "");
  const expectedUpdatedAt = String(input?.expectedUpdatedAt ?? "").trim();
  const statusRaw = String(input?.status ?? "").trim();

  if (!UUID_PATTERN.test(reportId)) {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  if (!TIMESTAMPTZ_PATTERN.test(expectedUpdatedAt)) {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  if (statusRaw !== "draft" && statusRaw !== "complete") {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  const status = statusRaw as GrowthReportStatus;

  const title = normalizeText(input?.title);
  const growthChanges = normalizeText(input?.growthChanges);
  const observationSummary = normalizeText(input?.observationSummary);
  const nextSupport = normalizeText(input?.nextSupport);

  if (title === null) {
    return { ok: false, kind: "error", message: MESSAGES.titleRequired };
  }

  if (characterCount(title) > MAX_GROWTH_REPORT_TITLE) {
    return { ok: false, kind: "error", message: MESSAGES.titleTooLong };
  }

  if (
    growthChanges !== null &&
    characterCount(growthChanges) > MAX_GROWTH_CHANGES
  ) {
    return { ok: false, kind: "error", message: MESSAGES.growthTooLong };
  }

  if (
    observationSummary !== null &&
    characterCount(observationSummary) > MAX_OBSERVATION_SUMMARY
  ) {
    return { ok: false, kind: "error", message: MESSAGES.summaryTooLong };
  }

  if (
    nextSupport !== null &&
    characterCount(nextSupport) > MAX_NEXT_SUPPORT
  ) {
    return { ok: false, kind: "error", message: MESSAGES.supportTooLong };
  }

  // 완료는 세 칸이 모두 필요하다. RPC와 컬럼 CHECK가 최종 방어선이지만
  // 여기서 먼저 끝내야 사용자가 바로 이해할 문구가 나간다.
  if (
    status === "complete" &&
    (growthChanges === null ||
      observationSummary === null ||
      nextSupport === null)
  ) {
    return {
      ok: false,
      kind: "error",
      message: MESSAGES.completeNeedsAll,
    };
  }

  const { supabase } = await requireTeacher();

  const { data, error } = await supabase.rpc(
    "save_child_growth_report_atomic",
    {
      p_report_id: reportId,
      p_title: title,
      p_growth_changes: growthChanges,
      p_observation_summary: observationSummary,
      p_next_support: nextSupport,
      p_status: status,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );

  if (error) {
    logFailure("save", error.message);

    switch (error.code) {
      case GR_STALE:
        return { ok: false, kind: "stale", message: MESSAGES.stale };
      case GR_LOCKED:
        return { ok: false, kind: "locked", message: MESSAGES.locked };
      case GR_INVALID_INPUT:
        return {
          ok: false,
          kind: "error",
          message: MESSAGES.completeNeedsAll,
        };
      case GR_NOT_FOUND:
        return { ok: false, kind: "error", message: MESSAGES.notFound };
      case RLS_VIOLATION:
      case CHECK_VIOLATION:
        return { ok: false, kind: "error", message: MESSAGES.notAllowed };
      default:
        return { ok: false, kind: "error", message: MESSAGES.failure };
    }
  }

  const updatedAt = readUpdatedAt(data);

  if (!updatedAt) {
    logFailure("save", "unexpected rpc payload");
    return { ok: false, kind: "error", message: MESSAGES.failure };
  }

  refresh();

  return { ok: true, status, updatedAt };
}

interface CreateResult {
  reportId: string;
  created: boolean;
  sourceCount: number;
}

/** RPC는 jsonb 객체 하나를 돌려준다. 형태가 어긋나면 실패로 본다. */
function readCreateResult(value: unknown): CreateResult | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const reportId = row.report_id;
  const sourceCount = row.source_count;

  if (typeof reportId !== "string" || reportId === "") return null;

  return {
    reportId,
    created: row.created === true,
    sourceCount:
      typeof sourceCount === "number" && Number.isFinite(sourceCount)
        ? sourceCount
        : 0,
  };
}

function readUpdatedAt(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const updatedAt = (value as Record<string, unknown>).updated_at;

  // ★ RPC가 준 문자열 그대로. 다음 저장의 토큰이다.
  return typeof updatedAt === "string" && updatedAt !== ""
    ? updatedAt
    : null;
}
