"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import {
  canTransitionStatus,
  LESSON_DURATION_MAX,
  LESSON_DURATION_MIN,
  LESSON_OBJECTIVE_MAX,
  LESSON_TITLE_MAX,
  parseCurriculumStatus,
  parseOptionalInt,
  parseOptionalLongText,
  parseRequiredInt,
  parseRequiredText,
  SESSION_NO_MAX,
  SESSION_NO_MIN,
  WEEK_NO_MIN,
} from "@/lib/admin/curriculum";
import type { CurriculumStatus } from "@/types/curriculum";
import type { CurriculumFormState } from "./curriculum-state";

/**
 * 차시(Lesson) Server Action.
 *
 * ★ 이 파일이 막는 것 (DB가 강제하지 않는 규칙)
 *   1. week_no <= program.duration_weeks
 *      CHECK constraint는 다른 테이블 컬럼을 참조할 수 없다(20260825 주석 참조).
 *   2. archived 프로그램에는 새 차시를 추가하지 않는다.
 *   3. archived 차시는 다른 상태로 되돌리지 않는다.
 *   4. ★ Foreign-object 조작 차단 —
 *      URL은 프로그램 A인데 FormData에 프로그램 B의 lesson id를 보내도 실패해야 한다.
 *      SOYES 운영자는 RLS상 모든 콘텐츠를 볼 수 있어 RLS가 이 조작을 막아주지 않는다.
 *      이 검증이 유일한 방어선이다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation — curriculum_lessons_program_week_session_key 충돌 */
const UNIQUE_VIOLATION = "23505";

const MESSAGES = {
  invalidProgram: "프로그램 정보를 확인할 수 없습니다.",
  invalidTitle: `차시명을 1~${LESSON_TITLE_MAX}자로 입력해주세요.`,
  invalidObjective: `교육 목표는 ${LESSON_OBJECTIVE_MAX}자 이내로 입력해주세요.`,
  invalidWeek: "주차를 확인해주세요.",
  invalidSession: `차시 번호를 ${SESSION_NO_MIN}~${SESSION_NO_MAX} 사이로 입력해주세요.`,
  invalidDuration: `수업 시간을 ${LESSON_DURATION_MIN}~${LESSON_DURATION_MAX} 사이로 입력하거나 비워두세요.`,
  invalidStatus: "상태 값을 확인해주세요.",
  duplicate: "같은 주차에 동일한 차시 번호가 이미 있습니다.",
  programNotFound: "프로그램 정보를 찾을 수 없습니다.",
  archivedProgram: "보관된 프로그램에는 새 차시를 추가할 수 없습니다.",
  lessonNotFound: "차시 정보를 찾을 수 없습니다.",
  lessonNotInProgram: "이 프로그램에 속한 차시가 아닙니다.",
  archivedLessonLocked:
    "보관된 차시는 다른 상태로 되돌릴 수 없습니다. 새 차시를 등록해주세요.",
  createFailure: "차시를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updateFailure: "차시 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
  created: "차시를 등록했습니다.",
  updated: "차시 정보를 저장했습니다.",
} as const;

function error(message: string): CurriculumFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[admin/curriculum] ${scope} failed: ${message}`);
}

interface ProgramContext {
  durationWeeks: number;
  status: CurriculumStatus;
}

/** 프로그램을 읽어 주차 상한과 보관 여부를 확인한다 */
async function loadProgram(
  supabase: SupabaseClient,
  programId: string,
): Promise<
  { ok: true; program: ProgramContext } | { ok: false; state: CurriculumFormState }
> {
  const { data, error: queryError } = await supabase
    .from("curriculum_programs")
    .select("id, duration_weeks, status")
    .eq("id", programId)
    .maybeSingle();

  if (queryError) {
    logFailure("program lookup", queryError.message);
    return { ok: false, state: error(MESSAGES.programNotFound) };
  }

  if (!data) return { ok: false, state: error(MESSAGES.programNotFound) };

  const row = data as unknown as {
    duration_weeks: number;
    status: CurriculumStatus;
  };

  return {
    ok: true,
    program: { durationWeeks: row.duration_weeks, status: row.status },
  };
}

interface LessonFormValues {
  weekNo: number;
  sessionNo: number;
  title: string;
  objective: string | null;
  durationMinutes: number | null;
  status: CurriculumStatus;
}

/**
 * 등록·수정이 공유하는 필드 검증.
 * weekNo 상한은 프로그램의 duration_weeks다(DB의 1~52보다 좁다).
 */
function parseLessonForm(
  formData: FormData,
  durationWeeks: number,
): { ok: true; values: LessonFormValues } | { ok: false; state: CurriculumFormState } {
  const weekNo = parseRequiredInt(
    String(formData.get("week_no") ?? ""),
    WEEK_NO_MIN,
    durationWeeks,
  );

  if (weekNo === null) {
    return {
      ok: false,
      state: error(
        `이 프로그램은 ${durationWeeks}주 과정이므로 1~${durationWeeks}주차만 등록할 수 있습니다.`,
      ),
    };
  }

  const sessionNo = parseRequiredInt(
    String(formData.get("session_no") ?? ""),
    SESSION_NO_MIN,
    SESSION_NO_MAX,
  );

  if (sessionNo === null) return { ok: false, state: error(MESSAGES.invalidSession) };

  const title = parseRequiredText(formData.get("title"), LESSON_TITLE_MAX);

  if (!title) return { ok: false, state: error(MESSAGES.invalidTitle) };

  const objective = parseOptionalLongText(
    formData.get("objective"),
    LESSON_OBJECTIVE_MAX,
  );

  if (!objective.ok) return { ok: false, state: error(MESSAGES.invalidObjective) };

  const durationMinutes = parseOptionalInt(
    String(formData.get("duration_minutes") ?? ""),
    LESSON_DURATION_MIN,
    LESSON_DURATION_MAX,
  );

  if (!durationMinutes.ok) {
    return { ok: false, state: error(MESSAGES.invalidDuration) };
  }

  const status = parseCurriculumStatus(String(formData.get("status") ?? ""));

  if (status === null) return { ok: false, state: error(MESSAGES.invalidStatus) };

  return {
    ok: true,
    values: {
      weekNo,
      sessionNo,
      title,
      objective: objective.value,
      durationMinutes: durationMinutes.value,
      status,
    },
  };
}

export async function createLessonAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  const programId = String(formData.get("programId") ?? "");

  if (!UUID_PATTERN.test(programId)) return error(MESSAGES.invalidProgram);

  const { supabase } = await requireAdmin();

  const loaded = await loadProgram(supabase, programId);

  if (!loaded.ok) return loaded.state;

  // 보관된 프로그램은 운영이 끝난 콘텐츠다. 구조를 더 늘리지 않는다.
  if (loaded.program.status === "archived") {
    return error(MESSAGES.archivedProgram);
  }

  const parsed = parseLessonForm(formData, loaded.program.durationWeeks);

  if (!parsed.ok) return parsed.state;

  const { values } = parsed;

  const { error: insertError } = await supabase.from("curriculum_lessons").insert({
    program_id: programId,
    week_no: values.weekNo,
    session_no: values.sessionNo,
    title: values.title,
    objective: values.objective,
    duration_minutes: values.durationMinutes,
    status: values.status,
  });

  if (insertError) {
    if ((insertError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicate);
    }

    logFailure("lesson insert", insertError.message);
    return error(MESSAGES.createFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.created };
}

export async function updateLessonAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  const programId = String(formData.get("programId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");

  if (!UUID_PATTERN.test(programId) || !UUID_PATTERN.test(lessonId)) {
    return error(MESSAGES.invalidProgram);
  }

  const { supabase } = await requireAdmin();

  const loaded = await loadProgram(supabase, programId);

  if (!loaded.ok) return loaded.state;

  // ★ 이 차시가 정말 이 프로그램의 것인지 확인한다.
  //   다른 프로그램의 lesson id를 보내도 여기서 차단된다.
  const { data: current, error: currentError } = await supabase
    .from("curriculum_lessons")
    .select("id, program_id, status")
    .eq("id", lessonId)
    .maybeSingle();

  if (currentError) {
    logFailure("lesson lookup", currentError.message);
    return error(MESSAGES.lessonNotFound);
  }

  if (!current) return error(MESSAGES.lessonNotFound);

  const currentRow = current as unknown as {
    program_id: string;
    status: CurriculumStatus;
  };

  if (currentRow.program_id !== programId) {
    return error(MESSAGES.lessonNotInProgram);
  }

  const parsed = parseLessonForm(formData, loaded.program.durationWeeks);

  if (!parsed.ok) return parsed.state;

  const { values } = parsed;

  // archived 차시는 되돌리지 않는다(프로그램 규칙과 동일).
  if (!canTransitionStatus(currentRow.status, values.status)) {
    return error(MESSAGES.archivedLessonLocked);
  }

  // program_id는 payload에 넣지 않는다. DB UPDATE GRANT에서도 제외되어 있어
  // 차시를 다른 프로그램으로 옮기는 경로가 없다.
  const { error: updateError } = await supabase
    .from("curriculum_lessons")
    .update({
      week_no: values.weekNo,
      session_no: values.sessionNo,
      title: values.title,
      objective: values.objective,
      duration_minutes: values.durationMinutes,
      status: values.status,
    })
    .eq("id", lessonId)
    .eq("program_id", programId);

  if (updateError) {
    if ((updateError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicate);
    }

    logFailure("lesson update", updateError.message);
    return error(MESSAGES.updateFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.updated };
}
