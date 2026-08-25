"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { parseAgeGroup } from "@/lib/admin/class-child";
import type { AgeGroup } from "@/types/class-child";
import {
  canTransitionStatus,
  DURATION_WEEKS_MAX,
  DURATION_WEEKS_MIN,
  parseCurriculumStatus,
  parseOptionalLongText,
  parseRequiredInt,
  parseRequiredText,
  PROGRAM_CODE_MAX,
  PROGRAM_SUMMARY_MAX,
  PROGRAM_TITLE_MAX,
} from "@/lib/admin/curriculum";
import type { CurriculumFormState } from "./curriculum-state";

/**
 * 수업 프로그램 Server Action.
 *
 * 이 파일의 런타임 export는 async Server Action 함수뿐이어야 한다.
 * 타입/상수는 ./curriculum-state.ts에 있다.
 *
 * 보안 원칙 (기존 Admin Action과 동일)
 *   1. requireAdmin()으로 시작한다.
 *   2. Client가 보낸 id는 UUID 형식부터 확인한다.
 *   3. 수정 대상은 서버에서 현재 값을 다시 읽어 규칙을 검증한다.
 *   4. Data API 호출은 전부 관리자 세션 Client + RLS로 한다. Secret Key를 쓰지 않는다.
 *
 * DB가 일부러 강제하지 않은 운영 규칙(코드 수정 제한, 주차 축소 검증, 게시 조건)을
 * 여기서 구현한다. 근거는 각 함수 주석에 있다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation — curriculum_programs_code_key 충돌 */
const UNIQUE_VIOLATION = "23505";

const MESSAGES = {
  invalidCode: `프로그램 코드를 1~${PROGRAM_CODE_MAX}자로 입력해주세요.`,
  invalidTitle: `프로그램명을 1~${PROGRAM_TITLE_MAX}자로 입력해주세요.`,
  invalidSummary: `요약은 ${PROGRAM_SUMMARY_MAX}자 이내로 입력해주세요.`,
  invalidDuration: `운영 주차를 ${DURATION_WEEKS_MIN}~${DURATION_WEEKS_MAX} 사이로 입력해주세요.`,
  invalidStatus: "상태 값을 확인해주세요.",
  duplicateCode: "이미 사용 중인 프로그램 코드입니다.",
  notFound: "프로그램 정보를 찾을 수 없습니다.",
  codeLocked: "게시된 프로그램의 코드는 변경할 수 없습니다.",
  archivedLocked:
    "보관된 프로그램은 다른 상태로 되돌릴 수 없습니다. 새 프로그램을 등록해주세요.",
  publishNeedsLesson:
    "차시가 한 개 이상 등록되어야 프로그램을 게시할 수 있습니다.",
  createDraftOnly:
    "새 프로그램은 초안으로만 등록됩니다. 차시를 추가한 뒤 게시해주세요.",
  createFailure: "프로그램을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updateFailure:
    "프로그램 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
  updated: "프로그램 정보를 저장했습니다.",
} as const;

function error(message: string): CurriculumFormState {
  return { phase: "error", message };
}

function logFailure(scope: string, message: string) {
  console.error(`[admin/curriculum] ${scope} failed: ${message}`);
}

/**
 * 등록·수정이 공유하는 필드.
 * status는 모드마다 규칙이 달라(등록=draft 고정, 수정=선택) 여기에 포함하지 않는다.
 */
interface ProgramFormValues {
  code: string;
  title: string;
  summary: string | null;
  ageGroup: AgeGroup | null;
  durationWeeks: number;
}

/** 등록·수정이 공유하는 필드 검증 */
function parseProgramForm(
  formData: FormData,
): { ok: true; values: ProgramFormValues } | { ok: false; state: CurriculumFormState } {
  const code = parseRequiredText(formData.get("code"), PROGRAM_CODE_MAX);

  if (!code) return { ok: false, state: error(MESSAGES.invalidCode) };

  const title = parseRequiredText(formData.get("title"), PROGRAM_TITLE_MAX);

  if (!title) return { ok: false, state: error(MESSAGES.invalidTitle) };

  const summary = parseOptionalLongText(
    formData.get("summary"),
    PROGRAM_SUMMARY_MAX,
  );

  if (!summary.ok) return { ok: false, state: error(MESSAGES.invalidSummary) };

  const durationWeeks = parseRequiredInt(
    String(formData.get("duration_weeks") ?? ""),
    DURATION_WEEKS_MIN,
    DURATION_WEEKS_MAX,
  );

  if (durationWeeks === null) {
    return { ok: false, state: error(MESSAGES.invalidDuration) };
  }

  return {
    ok: true,
    values: {
      code,
      title,
      summary: summary.value,
      // 화이트리스트를 통과하지 못한 값은 전부 null(미지정)로 떨어진다.
      ageGroup: parseAgeGroup(String(formData.get("age_group") ?? "")),
      durationWeeks,
    },
  };
}

export async function createProgramAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  const parsed = parseProgramForm(formData);

  if (!parsed.ok) return parsed.state;

  const { values } = parsed;

  // ★ 신규 등록은 항상 초안(draft)이다.
  //   차시가 0개인 상태에서는 게시 조건(차시 1개 이상)을 만족할 수 없고,
  //   보관 상태로 바로 만들 이유도 없다. 그래서 폼에서 상태 선택을 없앴다.
  //   FormData를 조작해 다른 값을 보내도 여기서 차단한다.
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (rawStatus !== "" && rawStatus !== "draft") {
    return error(MESSAGES.createDraftOnly);
  }

  const { supabase } = await requireAdmin();

  const { data, error: insertError } = await supabase
    .from("curriculum_programs")
    .insert({
      code: values.code,
      title: values.title,
      summary: values.summary,
      age_group: values.ageGroup,
      duration_weeks: values.durationWeeks,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !data) {
    if ((insertError as { code?: string } | null)?.code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicateCode);
    }

    logFailure("program insert", insertError?.message ?? "no row returned");
    return error(MESSAGES.createFailure);
  }

  // redirect()는 NEXT_REDIRECT 에러를 던지고 실행을 끝낸다. 그래서
  //   - 반드시 모든 에러 처리 "이후"에 호출해야 하고(try/catch로 감싸면 안 된다)
  //   - 이 Action은 성공 시 값을 반환하지 않는다.
  // 따라서 Client에서는 이 Action을 useActionState에 **그대로** 넘겨야 한다.
  // Client 함수로 감싸 await하면 오지 않을 반환값을 기다리게 되어
  // pending이 끝나지 않고 navigation도 일어나지 않는다. (ProgramFormDialog 주석 참조)
  redirect(`/admin/curriculum/${(data as { id: string }).id}`);
}

export async function updateProgramAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  const programId = String(formData.get("programId") ?? "");

  if (!UUID_PATTERN.test(programId)) return error(MESSAGES.notFound);

  const parsed = parseProgramForm(formData);

  if (!parsed.ok) return parsed.state;

  const { values } = parsed;

  // 수정에서는 상태를 직접 고를 수 있다(등록과 달리 차시가 이미 있을 수 있다).
  const status = parseCurriculumStatus(String(formData.get("status") ?? ""));

  if (status === null) return error(MESSAGES.invalidStatus);

  const { supabase } = await requireAdmin();

  // 현재 값을 먼저 읽는다. 아래 규칙들이 전부 "현재 상태 대비" 판정이기 때문이다.
  const { data: current, error: currentError } = await supabase
    .from("curriculum_programs")
    .select("id, code, status, duration_weeks")
    .eq("id", programId)
    .maybeSingle();

  if (currentError) {
    logFailure("program lookup", currentError.message);
    return error(MESSAGES.notFound);
  }

  if (!current) return error(MESSAGES.notFound);

  const currentRow = current as unknown as {
    code: string;
    status: "draft" | "published" | "archived";
    duration_weeks: number;
  };

  // (1) 코드는 draft에서만 바꿀 수 있다.
  //     게시된 뒤에는 운영·정산·문서에서 참조되는 안정적 식별자가 되기 때문이다.
  if (values.code !== currentRow.code && currentRow.status !== "draft") {
    return error(MESSAGES.codeLocked);
  }

  // (2) archived는 종착 상태다. 다른 상태로 되돌리지 않는다.
  if (!canTransitionStatus(currentRow.status, status)) {
    return error(MESSAGES.archivedLocked);
  }

  // (3) 운영 주차를 줄일 때는 이미 등록된 차시의 최대 주차보다 작아질 수 없다.
  //     DB CHECK은 다른 테이블을 참조할 수 없어 여기서 검증한다(20260825 주석 참조).
  if (values.durationWeeks < currentRow.duration_weeks) {
    const { data: maxRows, error: maxError } = await supabase
      .from("curriculum_lessons")
      .select("week_no")
      .eq("program_id", programId)
      .order("week_no", { ascending: false })
      .limit(1);

    if (maxError) {
      logFailure("max week lookup", maxError.message);
      return error(MESSAGES.updateFailure);
    }

    const maxWeek = (maxRows ?? [])[0] as { week_no: number } | undefined;

    if (maxWeek && maxWeek.week_no > values.durationWeeks) {
      return error(
        `현재 ${maxWeek.week_no}주차까지 차시가 등록되어 있어 ${values.durationWeeks}주로 줄일 수 없습니다.`,
      );
    }
  }

  // (4) 게시하려면 차시가 최소 1개 있어야 한다.
  //     빈 프로그램이 기관에 노출되는 것을 막는다.
  //     차시가 전부 published일 필요는 없다 — 게시 후에도 draft 차시를 준비할 수 있어야 한다.
  if (status === "published" && currentRow.status !== "published") {
    const { count, error: countError } = await supabase
      .from("curriculum_lessons")
      .select("id", { count: "exact", head: true })
      .eq("program_id", programId);

    if (countError) {
      logFailure("lesson count", countError.message);
      return error(MESSAGES.updateFailure);
    }

    if ((count ?? 0) === 0) return error(MESSAGES.publishNeedsLesson);
  }

  const { error: updateError } = await supabase
    .from("curriculum_programs")
    .update({
      code: values.code,
      title: values.title,
      summary: values.summary,
      age_group: values.ageGroup,
      duration_weeks: values.durationWeeks,
      status,
    })
    .eq("id", programId);

  if (updateError) {
    if ((updateError as { code?: string }).code === UNIQUE_VIOLATION) {
      return error(MESSAGES.duplicateCode);
    }

    logFailure("program update", updateError.message);
    return error(MESSAGES.updateFailure);
  }

  refresh();

  return { phase: "success", message: MESSAGES.updated };
}
