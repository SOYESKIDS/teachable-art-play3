import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";
import { fetchClassEntitlements, type ClassEntitlements } from "@/lib/entitlement/queries";
import type { ClassSessionStatus } from "@/types/class-session";
import { REQUIRED_LESSON_SECTIONS } from "@/lib/curriculum/lesson-sections";

/**
 * Class Mode (BEFORE · DURING) 데이터 (DEC-036 · DEC-037 · DEC-098 · DEC-099).
 *
 * 범위는 RLS 가 정한다 — 다른 반 · 다른 기관 수업이면 not_found.
 * 필수 수업 섹션(DEC-096 Required Content Set)이 없으면 Class Mode 를 막는다 (DEC-037).
 */

/** DEC-096 Required Content Set (§1 · §2 · §3 · §4-A · §4-C · §5 · §6 · §11 · §12 · §13 · §15) */
export { REQUIRED_LESSON_SECTIONS };

export interface ClassModeStep {
  sequenceNo: number;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  materials: string | null;
}

export interface ClassModeData {
  session: {
    id: string;
    organizationId: string;
    classId: string;
    status: ClassSessionStatus;
    scheduledDate: string | null;
    weekNo: number | null;
  };
  className: string | null;
  programTitle: string | null;
  lesson: {
    title: string | null;
    sessionNo: number | null;
    objective: string | null;
    durationMinutes: number | null;
  };
  steps: ClassModeStep[];
  /** 섹션 본문 (code → body) */
  sections: Record<string, string>;
  missingRequiredSections: string[];
  beforeConfirmedAt: string | null;
  entitlements: ClassEntitlements;
  /** 사진 공유 기록이 "공유 가능으로 기록됨"이 아닌 원아 (BEFORE 안내용 · 이름만) */
  photoNotSharedNames: string[];
  /** 작성자 본인 빠른 메모 (author only) */
  memo: { body: string; updatedAt: string } | null;
}

export type ClassModeLoadResult =
  | { ok: true; data: ClassModeData }
  | { ok: false; reason: "invalid_id" | "not_found" | "load_failed" };

function log(scope: string, code: string | undefined) {
  console.error(`[class-mode] ${scope} failed: code=${code ?? "unknown"}`);
}

export async function fetchClassModeData(
  supabase: SupabaseClient,
  organizationId: string,
  sessionId: string,
  userId: string,
): Promise<ClassModeLoadResult> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id, organization_id, class_id, program_id, lesson_id, scheduled_date, status, week_no")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (sessionError) {
    log("session", sessionError.code);
    return { ok: false, reason: "load_failed" };
  }
  if (!sessionRow) return { ok: false, reason: "not_found" };

  const session = sessionRow as {
    id: string;
    organization_id: string;
    class_id: string;
    program_id: string;
    lesson_id: string;
    scheduled_date: string | null;
    status: ClassSessionStatus;
    week_no: number | null;
  };

  const [classResult, programResult, lessonResult, activityResult, sectionResult, beforeResult, childResult, memoResult, entitlements] =
    await Promise.all([
      supabase.from("classes").select("name").eq("id", session.class_id).maybeSingle(),
      supabase.from("curriculum_programs").select("title").eq("id", session.program_id).maybeSingle(),
      supabase
        .from("curriculum_lessons")
        .select("title, session_no, objective, duration_minutes")
        .eq("id", session.lesson_id)
        .maybeSingle(),
      supabase
        .from("lesson_activities")
        .select("sequence_no, title, description, duration_minutes, materials")
        .eq("lesson_id", session.lesson_id)
        .order("sequence_no", { ascending: true })
        .limit(30),
      supabase.from("lesson_sections").select("section_code, body").eq("lesson_id", session.lesson_id).limit(30),
      supabase
        .from("session_before_confirmations")
        .select("confirmed_at")
        .eq("class_session_id", session.id)
        .maybeSingle(),
      supabase
        .from("children")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("class_id", session.class_id)
        .eq("status", "active")
        .order("name", { ascending: true })
        .limit(200),
      supabase
        .from("quick_memos")
        .select("body, updated_at")
        .eq("class_session_id", session.id)
        .eq("author_user_id", userId)
        .maybeSingle(),
      fetchClassEntitlements(supabase, session.class_id),
    ]);

  const firstError = [classResult, programResult, lessonResult, activityResult, sectionResult, beforeResult, childResult, memoResult].find(
    (result) => result.error,
  );
  if (firstError?.error) {
    log("context", firstError.error.code);
    return { ok: false, reason: "load_failed" };
  }

  const children = (childResult.data ?? []) as { id: string; name: string }[];
  let photoNotSharedNames: string[] = [];

  if (children.length > 0) {
    const { data: consentRows, error: consentError } = await supabase
      .from("child_media_consents")
      .select("child_id, status")
      .in(
        "child_id",
        children.map((child) => child.id),
      );

    if (consentError) {
      log("consents", consentError.code);
      return { ok: false, reason: "load_failed" };
    }

    const consented = new Set(
      ((consentRows ?? []) as { child_id: string; status: string }[])
        .filter((row) => row.status === "consented")
        .map((row) => row.child_id),
    );
    photoNotSharedNames = children.filter((child) => !consented.has(child.id)).map((child) => child.name);
  }

  const sections: Record<string, string> = {};
  for (const row of (sectionResult.data ?? []) as { section_code: string; body: string }[]) {
    sections[row.section_code] = row.body;
  }

  const lesson = (lessonResult.data ?? null) as {
    title: string;
    session_no: number;
    objective: string | null;
    duration_minutes: number | null;
  } | null;

  const memo = (memoResult.data ?? null) as { body: string; updated_at: string } | null;

  return {
    ok: true,
    data: {
      session: {
        id: session.id,
        organizationId: session.organization_id,
        classId: session.class_id,
        status: session.status,
        scheduledDate: session.scheduled_date,
        weekNo: session.week_no,
      },
      className: (classResult.data as { name: string } | null)?.name ?? null,
      programTitle: (programResult.data as { title: string } | null)?.title ?? null,
      lesson: {
        title: lesson?.title ?? null,
        sessionNo: lesson?.session_no ?? null,
        objective: lesson?.objective ?? null,
        durationMinutes: lesson?.duration_minutes ?? null,
      },
      steps: ((activityResult.data ?? []) as {
        sequence_no: number;
        title: string;
        description: string | null;
        duration_minutes: number | null;
        materials: string | null;
      }[]).map((row) => ({
        sequenceNo: row.sequence_no,
        title: row.title,
        description: row.description,
        durationMinutes: row.duration_minutes,
        materials: row.materials,
      })),
      sections,
      missingRequiredSections: REQUIRED_LESSON_SECTIONS.filter((code) => !sections[code]),
      beforeConfirmedAt: (beforeResult.data as { confirmed_at: string } | null)?.confirmed_at ?? null,
      entitlements,
      photoNotSharedNames,
      memo: memo ? { body: memo.body, updatedAt: memo.updated_at } : null,
    },
  };
}
