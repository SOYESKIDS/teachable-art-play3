"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { UUID_PATTERN, logRpcFailure } from "@/lib/errors/rpc-errors";
import { isLessonSectionCode } from "@/lib/curriculum/lesson-sections";

/**
 * 차시 수업 섹션 저장 (HQ-09 · DEC-096).
 *
 * · 초안 차시만 수정할 수 있다 (DB trigger 가 최종 판정 · 발행 차시는 조용히 수정하지 않는다)
 * · 섹션 존재 ≠ 검수 완료 — 준비 상태는 발행 상태 + 필수 섹션으로만 판정한다
 * · 본문을 로그에 남기지 않는다
 * · 빈 본문으로 저장하면 섹션을 삭제한다
 */

export interface SectionActionState {
  phase: "idle" | "success" | "error";
  message: string | null;
}

const BODY_MAX = 10000;
const SOURCE_MAX = 300;

export async function saveLessonSectionAction(_prev: SectionActionState, formData: FormData): Promise<SectionActionState> {
  const programId = String(formData.get("programId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const sectionCode = String(formData.get("sectionCode") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const sourceRef = String(formData.get("sourceRef") ?? "").trim();

  if (!UUID_PATTERN.test(programId) || !UUID_PATTERN.test(lessonId) || !isLessonSectionCode(sectionCode)) {
    return { phase: "error", message: "요청 값을 확인할 수 없습니다." };
  }
  if (body.length > BODY_MAX) return { phase: "error", message: `본문은 ${BODY_MAX.toLocaleString()}자 이내로 입력해 주세요.` };
  if (sourceRef.length > SOURCE_MAX) return { phase: "error", message: `출처 메모는 ${SOURCE_MAX}자 이내로 입력해 주세요.` };

  const { supabase } = await requireAdmin();

  // Foreign-object 조작 차단: 차시가 이 프로그램의 초안 차시인지 확인
  const { data: lesson, error: lessonError } = await supabase
    .from("curriculum_lessons")
    .select("id, program_id, status")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson || lesson.program_id !== programId) {
    if (lessonError) logRpcFailure("lesson section lesson read", lessonError);
    return { phase: "error", message: "차시를 찾을 수 없습니다." };
  }
  if (lesson.status !== "draft") {
    return { phase: "error", message: "게시 중이거나 보관된 차시의 수업 섹션은 수정할 수 없습니다. 차시를 초안으로 되돌린 뒤 수정해 주세요." };
  }

  if (body === "") {
    const { error } = await supabase.from("lesson_sections").delete().eq("lesson_id", lessonId).eq("section_code", sectionCode);
    if (error) {
      logRpcFailure("lesson section delete", error);
      return { phase: "error", message: "섹션을 비우지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
    refresh();
    return { phase: "success", message: "섹션을 비웠습니다." };
  }

  // upsert 는 ON CONFLICT 에서 lesson_id · section_code 까지 UPDATE 하려 해 column grant 에 막힌다 → 분기
  const { data: existing, error: existingError } = await supabase
    .from("lesson_sections")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("section_code", sectionCode)
    .maybeSingle();

  if (existingError) {
    logRpcFailure("lesson section read", existingError);
    return { phase: "error", message: "섹션을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const values = { body, source_ref: sourceRef === "" ? null : sourceRef };
  const { error } = existing
    ? await supabase.from("lesson_sections").update(values).eq("id", existing.id)
    : await supabase.from("lesson_sections").insert({ lesson_id: lessonId, section_code: sectionCode, ...values });

  if (error) {
    logRpcFailure("lesson section save", error);
    return { phase: "error", message: "섹션을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  refresh();
  return { phase: "success", message: "저장됨" };
}
