"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireTeacher } from "@/lib/auth/organization";
import {
  generateObservationDraft,
  isObservationAiConfigured,
} from "@/lib/ai/observation-draft-provider";
import { formatLessonOrder } from "@/lib/admin/class-session";
import type { ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_AI_DRAFT_TEXT,
  type ObservationAiGenerateState,
  type ObservationAiReviewState,
} from "@/types/staff-observation-ai";

/**
 * SERVICE-10A — AI 관찰기록 정리 Server Action.
 *
 * 두 가지만 한다.
 *   generateObservationAiDraftAction — AI 초안 생성/재생성
 *   reviewObservationAiDraftAction   — 교사 검토 확정
 *
 * ★ 교사만 도달할 수 있다. 두 함수 모두 requireTeacher()로 시작한다.
 *   20260901090000의 쓰기 Policy에도 director 분기가 없다.
 *
 * ★ Client가 보내는 값 중 권한 근거로 쓰는 것은 없다.
 *   sessionId / childId / reviewedText / expectedUpdatedAt 뿐이고,
 *   organization_id · class_id · observation_id · 작성자는 전부 서버가 DB에서 파생한다.
 *
 * ★ Client가 generated_text를 보내는 경로가 없다.
 *   초안 원문은 이 파일 안에서 provider 응답으로 얻고 그대로 RPC에 넘긴다.
 *   화면은 "생성해달라"는 요청만 할 수 있다.
 *
 * ★ 자동 생성이 없다.
 *   페이지 로드·원장 조회·batch 어느 경로에서도 provider를 호출하지 않는다.
 *   교사가 버튼을 눌러야만 이 파일의 provider 호출이 일어난다.
 *
 * ★ service_role을 쓰지 않는다. 사용자 세션 client + RLS만 사용한다.
 * ★ 사진(09A)은 AI 입력에 포함되지 않는다 — 이 파일은 media 테이블을 읽지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgREST가 돌려주는 timestamptz 문자열의 모양만 확인한다.
 * 값을 다시 만들지 않는다 — 마이크로초가 잘리면 영구 AI004가 된다.
 */
const TIMESTAMPTZ_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?$/;

/** 20260901090000이 직접 던지는 코드 */
const AI_INVALID_INPUT = "AI001";
const AI_NOT_FOUND = "AI002";
const AI_NOT_RECORDABLE = "AI003";
const AI_STALE_DRAFT = "AI004";
const AI_SOURCE_CHANGED = "AI005";

/** unique(observation_id) — 동시에 두 번 생성 */
const UNIQUE_VIOLATION = "23505";
/** trigger / CHECK 제약 */
const CHECK_VIOLATION = "23514";
/** RLS Policy 위반 */
const RLS_VIOLATION = "42501";

const MESSAGES = {
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  notConfigured:
    "AI 기능 설정이 필요합니다. 기관 관리자에게 문의해주세요.",
  notFound: "수업 또는 관찰기록을 찾을 수 없거나 접근 권한이 없습니다.",
  cancelled: "취소된 수업에는 AI 정리를 만들 수 없습니다.",
  archived:
    "보관된 반에는 새 AI 정리를 만들 수 없습니다. 기존 정리는 계속 확인할 수 있습니다.",
  notComplete:
    "관찰기록을 작성 완료한 뒤 AI 정리를 사용할 수 있습니다.",
  noSource:
    "정리할 관찰 내용이 없습니다. 아이의 말 또는 교사 관찰을 입력한 뒤 다시 시도해주세요.",
  providerFailed:
    "AI 정리를 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
  invalidOutput:
    "AI 정리 결과를 사용할 수 없습니다. 다시 시도해주세요.",
  reviewEmpty: "검토 완료로 저장하려면 내용이 있어야 합니다.",
  reviewTooLong: `검토 내용은 ${MAX_AI_DRAFT_TEXT.toLocaleString("ko-KR")}자 이내로 입력해주세요.`,
  stale:
    "AI 정리가 이미 변경되었습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  sourceChanged:
    "원본 관찰기록이 변경되었습니다. AI 정리를 다시 생성한 뒤 검토해주세요.",
  notAllowed:
    "이 AI 정리를 저장할 권한이 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  failure: "AI 정리를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

/**
 * 서버 로그에만 남긴다.
 *
 * ★ 아이 기록 원문 · prompt 전문 · provider 응답 본문 · API key를 남기지 않는다.
 *   DB 메시지도 화면으로는 내보내지 않는다.
 */
function logFailure(scope: string, message: string) {
  console.error(`[staff/observation-ai] ${scope} failed: ${message}`);
}

interface SessionContextRow {
  id: string;
  organization_id: string;
  class_id: string;
  lesson_id: string | null;
  status: ClassSessionStatus;
}

interface ClassRow {
  id: string;
  status: ClassStatus;
}

interface ObservationRow {
  id: string;
  child_voice: string | null;
  teacher_note: string | null;
  record_status: string;
  updated_at: string;
}

interface LessonRow {
  id: string;
  week_no: number | null;
  session_no: number | null;
  title: string | null;
}

interface DomainLinkRow {
  domain_code: string;
}

interface DomainRow {
  code: string;
  label: string;
}

/**
 * 두 action이 공유하는 권한 재검증.
 *
 * 여기서 하는 판정은 전부 방금 DB에서 읽은 값이 근거다.
 * Client가 보낸 것은 sessionId / childId 두 uuid뿐이고, 그조차 RLS를 통과해야 행이 온다.
 */
type ObservationContext =
  | {
      ok: true;
      supabase: SupabaseClient;
      session: SessionContextRow;
      classStatus: ClassStatus | null;
      observation: ObservationRow;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveObservationContext(
  sessionId: string,
  childId: string,
): Promise<ObservationContext> {
  // 로그인 + role='teacher' + membership active + 기관 active를 DB가 판정한다.
  const { supabase, memberships } = await requireTeacher();

  const { data: sessionData, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id, organization_id, class_id, lesson_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    logFailure("session lookup", sessionError.message);
    return { ok: false, message: MESSAGES.notFound };
  }

  if (!sessionData) {
    return { ok: false, message: MESSAGES.notFound };
  }

  const session = sessionData as unknown as SessionContextRow;

  /**
   * requireTeacher()는 "어딘가의 교사"까지만 보장한다.
   * 타 기관 sessionId는 RLS가 이미 0건으로 막지만,
   * 기관 대조를 생략하면 그 사실이 코드에 남지 않는다.
   */
  const isTeacherOfOrg = memberships.some(
    (membership) =>
      membership.organizationId === session.organization_id &&
      membership.role === "teacher",
  );

  if (!isTeacherOfOrg) {
    return { ok: false, message: MESSAGES.notFound };
  }

  const [classResult, observationResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id, status")
      .eq("id", session.class_id)
      .maybeSingle(),

    supabase
      .from("class_session_observations")
      .select("id, child_voice, teacher_note, record_status, updated_at")
      .eq("class_session_id", session.id)
      .eq("child_id", childId)
      .maybeSingle(),
  ]);

  if (classResult.error) {
    logFailure("class validation", classResult.error.message);
    return { ok: false, message: MESSAGES.failure };
  }

  if (observationResult.error) {
    logFailure("observation lookup", observationResult.error.message);
    return { ok: false, message: MESSAGES.failure };
  }

  const observation =
    (observationResult.data as unknown as ObservationRow | null) ?? null;

  if (!observation) {
    return { ok: false, message: MESSAGES.notFound };
  }

  return {
    ok: true,
    supabase,
    session,
    classStatus:
      (classResult.data as unknown as ClassRow | null)?.status ?? null,
    observation,
  };
}

/**
 * AI 초안을 만들고 저장한다 (신규 · 재생성 공용).
 *
 * ★ 재생성하면 이전 "검토 완료" 상태가 generated로 되돌아간다.
 *   교사가 읽지 않은 새 문장이 확정된 것처럼 보이면 안 되기 때문이고,
 *   그 초기화는 DB trigger가 강제한다.
 */
export async function generateObservationAiDraftAction(input: {
  sessionId: string;
  childId: string;
}): Promise<ObservationAiGenerateState> {
  const sessionId = String(input?.sessionId ?? "");
  const childId = String(input?.childId ?? "");

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(childId)) {
    return { ok: false, message: MESSAGES.invalidRequest };
  }

  // 환경변수가 없으면 provider를 부르지 않고 여기서 끝낸다.
  // (secret 이름·값·stack을 화면에 노출하지 않는다)
  if (!isObservationAiConfigured()) {
    return { ok: false, message: MESSAGES.notConfigured };
  }

  const context = await resolveObservationContext(sessionId, childId);

  if (!context.ok) {
    return { ok: false, message: context.message };
  }

  const { supabase, session, classStatus, observation } = context;

  // 취소된 수업 — DB trigger(AI003)와 Policy가 최종 방어선이다.
  if (session.status === "cancelled") {
    return { ok: false, message: MESSAGES.cancelled };
  }

  // 신규 생성은 운영 중인 반에서만 가능하다 (is_class_teacher와 같은 조건).
  if (classStatus !== "active") {
    return { ok: false, message: MESSAGES.archived };
  }

  // ★ 작성 완료된 관찰기록만 정리한다.
  if (observation.record_status !== "complete") {
    return { ok: false, message: MESSAGES.notComplete };
  }

  /**
   * provider 입력에 쓸 값만 조회한다.
   *
   * ★ 아이 이름 · id · 기관 · 반 · 교사 정보는 조회하지도, 보내지도 않는다.
   *   보내는 것은 차시 정보 · 관찰영역 label · 교사가 쓴 두 문장뿐이다.
   */
  const [lessonResult, linkResult] = await Promise.all([
    session.lesson_id
      ? supabase
          .from("curriculum_lessons")
          .select("id, week_no, session_no, title")
          .eq("id", session.lesson_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from("class_session_observation_domains")
      .select("domain_code")
      .eq("observation_id", observation.id),
  ]);

  let domainLabels: string[] = [];

  if (linkResult.error) {
    logFailure("domain link lookup", linkResult.error.message);
  } else {
    const codes = (
      (linkResult.data ?? []) as unknown as DomainLinkRow[]
    ).map((row) => row.domain_code);

    if (codes.length > 0) {
      const { data: domainData, error: domainError } = await supabase
        .from("observation_domains")
        .select("code, label")
        .in("code", codes)
        .order("sort_order", { ascending: true });

      if (domainError) {
        logFailure("domain lookup", domainError.message);
      } else {
        domainLabels = (
          (domainData ?? []) as unknown as DomainRow[]
        ).map((row) => row.label);
      }
    }
  }

  const lesson =
    (lessonResult.data as unknown as LessonRow | null) ?? null;

  const generated = await generateObservationDraft({
    lessonTitle: lesson?.title ?? null,
    lessonOrder: lesson
      ? formatLessonOrder(lesson.week_no, lesson.session_no)
      : null,
    domainLabels,
    childVoice: observation.child_voice,
    teacherNote: observation.teacher_note,
  });

  if (!generated.ok) {
    switch (generated.reason) {
      case "not_configured":
        return { ok: false, message: MESSAGES.notConfigured };
      case "no_source":
        return { ok: false, message: MESSAGES.noSource };
      case "invalid_output":
        return { ok: false, message: MESSAGES.invalidOutput };
      default:
        return { ok: false, message: MESSAGES.providerFailed };
    }
  }

  /**
   * ★ 저장은 RPC 한 번으로 끝낸다.
   *   organization_id / class_id / child_id / source token은 함수가
   *   p_observation_id로 조회한 관찰기록 행에서 직접 만든다 — 여기서 넘기지 않는다.
   *   UNIQUE(observation_id) + on conflict라 더블클릭·재시도로 행이 늘지 않는다.
   */
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_observation_ai_generated_atomic",
    {
      p_observation_id: observation.id,
      p_generated_text: generated.text,
      p_provider: generated.provider,
      p_model: generated.model,
      p_prompt_version: generated.promptVersion,
    },
  );

  if (rpcError) {
    logFailure("ai draft save", rpcError.message);

    switch (rpcError.code) {
      case AI_INVALID_INPUT:
        return { ok: false, message: MESSAGES.invalidOutput };
      case AI_NOT_FOUND:
        return { ok: false, message: MESSAGES.notFound };
      case AI_NOT_RECORDABLE:
        return { ok: false, message: MESSAGES.notComplete };
      case AI_SOURCE_CHANGED:
        return { ok: false, message: MESSAGES.sourceChanged };
      case UNIQUE_VIOLATION:
      case AI_STALE_DRAFT:
        return { ok: false, message: MESSAGES.stale };
      case RLS_VIOLATION:
      case CHECK_VIOLATION:
        return { ok: false, message: MESSAGES.notAllowed };
      default:
        return { ok: false, message: MESSAGES.failure };
    }
  }

  const updatedAt = readUpdatedAt(rpcData);

  if (!updatedAt) {
    logFailure("ai draft save", "unexpected rpc payload");
    return { ok: false, message: MESSAGES.failure };
  }

  refresh();

  return { ok: true, updatedAt };
}

/**
 * 교사 검토 확정.
 *
 * ★ generated_text는 여기서 바뀌지 않는다.
 *   교사가 편집한 문장은 reviewed_text로만 저장되고, 초안 원문은 그대로 남는다.
 *
 * ★ expectedUpdatedAt은 화면이 받은 문자열 그대로 넘긴다.
 *   서버가 방금 읽은 값으로 바꿔치기하면 낙관적 동시성이 무력화된다.
 */
export async function reviewObservationAiDraftAction(input: {
  sessionId: string;
  childId: string;
  reviewedText: string;
  expectedUpdatedAt: string;
}): Promise<ObservationAiReviewState> {
  const sessionId = String(input?.sessionId ?? "");
  const childId = String(input?.childId ?? "");
  const reviewedText = String(input?.reviewedText ?? "").trim();
  const expectedUpdatedAt = String(input?.expectedUpdatedAt ?? "").trim();

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(childId)) {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  if (!TIMESTAMPTZ_PATTERN.test(expectedUpdatedAt)) {
    return { ok: false, kind: "error", message: MESSAGES.invalidRequest };
  }

  if (reviewedText === "") {
    return { ok: false, kind: "error", message: MESSAGES.reviewEmpty };
  }

  if ([...reviewedText].length > MAX_AI_DRAFT_TEXT) {
    return { ok: false, kind: "error", message: MESSAGES.reviewTooLong };
  }

  const context = await resolveObservationContext(sessionId, childId);

  if (!context.ok) {
    return { ok: false, kind: "error", message: context.message };
  }

  const { supabase, session, observation } = context;

  if (session.status === "cancelled") {
    return { ok: false, kind: "error", message: MESSAGES.cancelled };
  }

  if (observation.record_status !== "complete") {
    return { ok: false, kind: "error", message: MESSAGES.notComplete };
  }

  /**
   * ★ 보관된 반에서도 검토 확정은 가능하다.
   *   반이 닫혔다고 교사가 자기 기록을 마무리하지 못하는 상태를 만들지 않는다.
   *   (UPDATE Policy가 is_assigned_class_teacher라 DB도 같은 규칙이다.
   *    반 active를 요구하는 것은 "재생성"뿐이고 그것은 trigger가 막는다.)
   */
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_observation_ai_review_atomic",
    {
      p_observation_id: observation.id,
      p_reviewed_text: reviewedText,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );

  if (rpcError) {
    logFailure("ai review save", rpcError.message);

    switch (rpcError.code) {
      case AI_STALE_DRAFT:
        return { ok: false, kind: "stale", message: MESSAGES.stale };
      case AI_SOURCE_CHANGED:
        return {
          ok: false,
          kind: "source_changed",
          message: MESSAGES.sourceChanged,
        };
      case AI_INVALID_INPUT:
        return { ok: false, kind: "error", message: MESSAGES.reviewEmpty };
      case AI_NOT_FOUND:
        return { ok: false, kind: "error", message: MESSAGES.notFound };
      case AI_NOT_RECORDABLE:
        return { ok: false, kind: "error", message: MESSAGES.notComplete };
      case RLS_VIOLATION:
      case CHECK_VIOLATION:
        return { ok: false, kind: "error", message: MESSAGES.notAllowed };
      default:
        return { ok: false, kind: "error", message: MESSAGES.failure };
    }
  }

  const updatedAt = readUpdatedAt(rpcData);

  if (!updatedAt) {
    logFailure("ai review save", "unexpected rpc payload");
    return { ok: false, kind: "error", message: MESSAGES.failure };
  }

  refresh();

  return { ok: true, updatedAt, reviewedText };
}

/** RPC는 jsonb 객체 하나를 돌려준다. 형태가 어긋나면 실패로 본다. */
function readUpdatedAt(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const updatedAt = (value as Record<string, unknown>).updated_at;

  // ★ RPC가 준 문자열 그대로. 다음 저장의 토큰이다.
  return typeof updatedAt === "string" && updatedAt !== ""
    ? updatedAt
    : null;
}
