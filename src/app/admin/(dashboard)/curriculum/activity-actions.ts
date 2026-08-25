"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import {
  ACTIVITY_DESCRIPTION_MAX,
  ACTIVITY_DURATION_MAX,
  ACTIVITY_DURATION_MIN,
  ACTIVITY_MATERIALS_MAX,
  ACTIVITY_TITLE_MAX,
  parseActivityType,
  parseOptionalInt,
  parseOptionalLongText,
  parseRequiredInt,
  parseRequiredText,
  SEQUENCE_NO_MAX,
  SEQUENCE_NO_MIN,
} from "@/lib/admin/curriculum";
import type { ActivityType, CurriculumStatus } from "@/types/curriculum";
import type { CurriculumFormState } from "./curriculum-state";

/**
 * 활동(Activity) Server Action.
 *
 * ★ 이 파일이 막는 것
 *   1. 보관된 차시 / 보관된 프로그램에는 새 활동을 추가하지 않는다.
 *      (부모 두 단계를 모두 확인한다 — 차시만 보면 프로그램이 보관된 경우를 놓친다.)
 *   2. ★ Foreign-object 조작 차단 —
 *      URL은 프로그램 A / 차시 A인데 FormData에 다른 차시의 activity id를 보내도 실패한다.
 *      lesson이 정말 그 program의 것인지, activity가 정말 그 lesson의 것인지 모두 확인한다.
 *
 * lesson_activities에는 자체 status가 없다. 활동의 공개 여부는 차시를 따른다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation — lesson_activities_lesson_sequence_key 충돌 */
const UNIQUE_VIOLATION = "23505";

const MESSAGES = {
  invalidRequest: "요청 값을 확인할 수 없습니다.",
  invalidSequence: `활동 순서를 ${SEQUENCE_NO_MIN}~${SEQUENCE_NO_MAX} 사이로 입력해주세요.`,
  invalidTitle: `활동명을 1~${ACTIVITY_TITLE_MAX}자로 입력해주세요.`,
  invalidType: "활동 유형을 확인해주세요.",
  invalidDescription: `활동 설명은 ${ACTIVITY_DESCRIPTION_MAX}자 이내로 입력해주세요.`,
  invalidMaterials: `준비물은 ${ACTIVITY_MATERIALS_MAX}자 이내로 입력해주세요.`,
  invalidDuration: `활동 시간을 ${ACTIVITY_DURATION_MIN}~${ACTIVITY_DURATION_MAX} 사이로 입력하거나 비워두세요.`,
  duplicate: "같은 차시에 동일한 활동 순서가 이미 있습니다.",
  lessonNotFound: "차시 정보를 찾을 수 없습니다.",
  lessonNotInProgram: "이 프로그램에 속한 차시가 아닙니다.",
  archivedParent:
    "보관된 차시 또는 프로그램에는 새 활동을 추가할 수 없습니다.",
  activityNotFound: "활동 정보를 찾을 수 없습니다.",
  activityNotInLesson: "이 차시에 속한 활동이 아닙니다.",
  createFailure: "활동을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updateFailure: "활동 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
  created: "활동을 등록했습니다.",
  updated: "활동 정보를 저장했습니다.",
} as const;

function error(message: string): CurriculumFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[admin/curriculum] ${scope} failed: ${message}`);
}

interface ParentContext {
  lessonStatus: CurriculumStatus;
  programStatus: CurriculumStatus;
}

/**
 * 차시가 이 프로그램의 것인지 확인하고, 차시·프로그램 상태를 함께 돌려준다.
 * 활동은 부모 두 단계를 모두 만족해야 하므로 한 번에 읽는다(질의 1회).
 */
async function loadParents(
  supabase: SupabaseClient,
  lessonId: string,
  programId: string,
): Promise<
  { ok: true; parents: ParentContext } | { ok: false; state: CurriculumFormState }
> {
  const { data, error: queryError } = await supabase
    .from("curriculum_lessons")
    .select("id, program_id, status, curriculum_programs!inner(status)")
    .eq("id", lessonId)
    .maybeSingle();

  if (queryError) {
    logFailure("lesson lookup", queryError.message);
    return { ok: false, state: error(MESSAGES.lessonNotFound) };
  }

  if (!data) return { ok: false, state: error(MESSAGES.lessonNotFound) };

  const row = data as unknown as {
    program_id: string;
    status: CurriculumStatus;
    curriculum_programs:
      | { status: CurriculumStatus }
      | { status: CurriculumStatus }[]
      | null;
  };

  if (row.program_id !== programId) {
    return { ok: false, state: error(MESSAGES.lessonNotInProgram) };
  }

  // PostgREST는 관계를 객체 또는 배열로 돌려줄 수 있어 둘 다 받는다.
  const program = Array.isArray(row.curriculum_programs)
    ? row.curriculum_programs[0]
    : row.curriculum_programs;

  if (!program) return { ok: false, state: error(MESSAGES.lessonNotFound) };

  return {
    ok: true,
    parents: { lessonStatus: row.status, programStatus: program.status },
  };
}

interface ActivityFormValues {
  sequenceNo: number;
  title: string;
  activityType: ActivityType;
  description: string | null;
  durationMinutes: number | null;
  materials: string | null;
}

function parseActivityForm(
  formData: FormData,
): { ok: true; values: ActivityFormValues } | { ok: false; state: CurriculumFormState } {
  const sequenceNo = parseRequiredInt(
    String(formData.get("sequence_no") ?? ""),
    SEQUENCE_NO_MIN,
    SEQUENCE_NO_MAX,
  );

  if (sequenceNo === null) return { ok: false, state: error(MESSAGES.invalidSequence) };

  const title = parseRequiredText(formData.get("title"), ACTIVITY_TITLE_MAX);

  if (!title) return { ok: false, state: error(MESSAGES.invalidTitle) };

  const activityType = parseActivityType(
    String(formData.get("activity_type") ?? ""),
  );

  if (activityType === null) return { ok: false, state: error(MESSAGES.invalidType) };

  const description = parseOptionalLongText(
    formData.get("description"),
    ACTIVITY_DESCRIPTION_MAX,
  );

  if (!description.ok) {
    return { ok: false, state: error(MESSAGES.invalidDescription) };
  }

  const materials = parseOptionalLongText(
    formData.get("materials"),
    ACTIVITY_MATERIALS_MAX,
  );

  if (!materials.ok) return { ok: false, state: error(MESSAGES.invalidMaterials) };

  const durationMinutes = parseOptionalInt(
    String(formData.get("duration_minutes") ?? ""),
    ACTIVITY_DURATION_MIN,
    ACTIVITY_DURATION_MAX,
  );

  if (!durationMinutes.ok) {
    return { ok: false, state: error(MESSAGES.invalidDuration) };
  }

  return {
    ok: true,
    values: {
      sequenceNo,
      title,
      activityType,
      description: description.value,
      durationMinutes: durationMinutes.value,
      materials: materials.value,
    },
  };
}

export async function createActivityAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  const programId = String(formData.get("programId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");

  if (!UUID_PATTERN.test(programId) || !UUID_PATTERN.test(lessonId)) {
    return error(MESSAGES.invalidRequest);
  }

  const { supabase } = await requireAdmin();

  const loaded = await loadParents(supabase, lessonId, programId);

  if (!loaded.ok) return loaded.state;

  // 부모 둘 중 하나라도 보관 상태면 새 활동을 만들지 않는다.
  if (
    loaded.parents.lessonStatus === "archived" ||
    loaded.parents.programStatus === "archived"
  ) {
    return error(MESSAGES.archivedParent);
  }

  const parsed = parseActivityForm(formData);

  if (!parsed.ok) return parsed.state;

  const { values } = parsed;

  const { error: insertError } = await supabase.from("lesson_activities").insert({
    lesson_id: lessonId,
    sequence_no: values.sequenceNo,
    title: values.title,
    activity_type: values.activityType,
    description: values.description,
    duration_minutes: values.durationMinutes,
    materials: values.materials,
  });

  if (insertError) {
    if ((insertError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicate);
    }

    logFailure("activity insert", insertError.message);
    return error(MESSAGES.createFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.created };
}

export async function updateActivityAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  const programId = String(formData.get("programId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");

  if (
    !UUID_PATTERN.test(programId) ||
    !UUID_PATTERN.test(lessonId) ||
    !UUID_PATTERN.test(activityId)
  ) {
    return error(MESSAGES.invalidRequest);
  }

  const { supabase } = await requireAdmin();

  // 차시가 이 프로그램의 것인지 먼저 확인한다.
  const loaded = await loadParents(supabase, lessonId, programId);

  if (!loaded.ok) return loaded.state;

  // ★ 활동이 정말 이 차시의 것인지 확인한다.
  //   다른 차시의 activity id를 보내도 여기서 차단된다.
  const { data: current, error: currentError } = await supabase
    .from("lesson_activities")
    .select("id, lesson_id")
    .eq("id", activityId)
    .maybeSingle();

  if (currentError) {
    logFailure("activity lookup", currentError.message);
    return error(MESSAGES.activityNotFound);
  }

  if (!current) return error(MESSAGES.activityNotFound);

  if ((current as unknown as { lesson_id: string }).lesson_id !== lessonId) {
    return error(MESSAGES.activityNotInLesson);
  }

  const parsed = parseActivityForm(formData);

  if (!parsed.ok) return parsed.state;

  const { values } = parsed;

  // 보관된 콘텐츠라도 기존 활동의 오타 정정은 허용한다.
  // 막는 것은 "새 활동 추가"(구조 확장)이지 "기존 내용 수정"이 아니다.

  // lesson_id는 payload에 넣지 않는다. DB UPDATE GRANT에서도 제외되어 있어
  // 활동을 다른 차시로 옮기는 경로가 없다.
  const { error: updateError } = await supabase
    .from("lesson_activities")
    .update({
      sequence_no: values.sequenceNo,
      title: values.title,
      activity_type: values.activityType,
      description: values.description,
      duration_minutes: values.durationMinutes,
      materials: values.materials,
    })
    .eq("id", activityId)
    .eq("lesson_id", lessonId);

  if (updateError) {
    if ((updateError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicate);
    }

    logFailure("activity update", updateError.message);
    return error(MESSAGES.updateFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.updated };
}
