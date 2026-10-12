"use server";

import { createClient } from "@/lib/supabase/server";
import {
  buildLeadSubmissionPayload,
  validateLeadForm,
  type LeadFormValues,
} from "@/lib/validation/leadForm";
import { SUBMISSION_TYPES, type SubmissionType } from "@/types/leadForm";
import {
  NonProductionWriteBlockedError,
  assertWriteAllowed,
} from "@/lib/env/deployment-guard";

/**
 * 공개 상담 접수 — 실행 묶음 E 보완.
 *
 * ── 왜 서버로 옮겼는가 ─────────────────────────────────────────────
 *
 * 이전에는 `LeadForm` 이 브라우저에서 직접 `lead_submissions` 에 INSERT 했다.
 * 그 경로는 서버를 지나지 않으므로 배포 환경 가드가 적용되지 않는다. 비운영
 * 배포(Preview)가 운영 DB 에 붙어 있으면 공개 폼이 운영 데이터에 그대로 쓴다.
 * 클라이언트 쪽 플래그로 막으려 해도 그 플래그는 브라우저에서 바꿀 수 있다.
 *
 * 그래서 쓰기를 Server Action 으로 옮긴다. 이제 모든 상담 접수가 가드를 지난다.
 *
 * ── 바꾸지 않은 것 ────────────────────────────────────────────────
 *
 * ★ 검증과 payload 조립은 기존 코드를 그대로 쓴다.
 *   `validateLeadForm` · `buildLeadSubmissionPayload` 가 단일 출처다.
 *   `marketing_agreed=false` 고정, 12필드 제한, 원아·반 수 범위 검사가 그대로다.
 *
 * ★ 권한을 올리지 않는다.
 *   `createClient()` 는 공개키(publishable) 로 만든 세션 클라이언트다.
 *   Secret Key 를 쓰지 않고, 어떤 행이 들어가는지는 기존 RLS
 *   (`privacy_agreed = true and status = 'new' and source = 'website'`)가 판정한다.
 *
 * ★ 허니팟 판정은 클라이언트에 남겨 두지 않는다.
 *   여기서도 확인한다. 브라우저만 믿지 않는다.
 *
 * ★ 오류 본문을 사용자에게 보여 주지 않는다.
 *   문의 내용이 섞일 수 있어 코드만 로그에 남긴다.
 */

export type LeadSubmitState =
  | { phase: "success" }
  /** 입력 오류 — 어떤 칸인지 돌려준다 */
  | { phase: "invalid"; errors: Record<string, string> }
  /** 저장 실패 — 전화·이메일 안내로 유도한다 */
  | { phase: "error"; message: string }
  /** 환경 설정 때문에 쓰기가 막혔다 */
  | { phase: "blocked"; message: string };

const SAVE_FAILED =
  "접수에 실패했습니다. 잠시 후 다시 시도하시거나 전화·이메일로 연락해 주세요.";

const BLOCKED_MESSAGE =
  "현재 환경에서는 상담 접수를 저장할 수 없습니다. 전화 또는 이메일로 연락해 주세요.";

function isSubmissionType(value: unknown): value is SubmissionType {
  return (
    typeof value === "string" &&
    (SUBMISSION_TYPES as readonly string[]).includes(value)
  );
}

/** FormData 에서 문자열 하나를 꺼낸다. 없으면 빈 문자열 */
function text(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

function checkbox(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

export async function submitLeadAction(
  _prev: LeadSubmitState | null,
  form: FormData,
): Promise<LeadSubmitState> {
  const type = form.get("submissionType");
  if (!isSubmissionType(type)) {
    return { phase: "error", message: SAVE_FAILED };
  }

  const values: LeadFormValues = {
    institutionName: text(form, "institutionName"),
    contactName: text(form, "contactName"),
    position: text(form, "position"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    childCount: text(form, "childCount"),
    classCount: text(form, "classCount"),
    packageCode: text(form, "packageCode"),
    message: text(form, "message"),
    privacyAgreed: checkbox(form, "privacyAgreed"),
    marketingAgreed: false,
    website: text(form, "website"),
  };

  /**
   * ★ 허니팟 — 서버에서도 확인한다.
   *   브라우저가 보낸 판정을 믿지 않는다. 채워져 있으면 저장을 건너뛰고
   *   정상 성공처럼만 보이게 한다 (봇에게 차단 사실을 알려 주지 않는다).
   */
  if (values.website.trim() !== "") {
    return { phase: "success" };
  }

  const errors = validateLeadForm(values);
  if (Object.keys(errors).length > 0) {
    return { phase: "invalid", errors: errors as Record<string, string> };
  }

  /**
   * ★ 배포 환경 가드 — 이 경로가 생긴 이유다.
   *   세트 불일치는 배포 종류와 무관하게 막는다. 비운영 배포의 운영 데이터
   *   쓰기는 옵트인 설정이 켜졌을 때 막는다. 정상 연결된 운영 배포는 통과한다.
   */
  try {
    assertWriteAllowed("public/lead:submit");
  } catch (guardError) {
    if (guardError instanceof NonProductionWriteBlockedError) {
      console.error("[public/lead] write blocked:", { verdict: guardError.verdict });
      return { phase: "blocked", message: BLOCKED_MESSAGE };
    }
    throw guardError;
  }

  const payload = buildLeadSubmissionPayload(type, values);

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("lead_submissions").insert(payload);

    if (error) {
      // 오류 본문에 문의 내용이 포함될 수 있어 코드만 남긴다.
      console.error("[public/lead] insert failed:", { code: error.code ?? null });
      return { phase: "error", message: SAVE_FAILED };
    }
  } catch {
    console.error("[public/lead] insert threw");
    return { phase: "error", message: SAVE_FAILED };
  }

  return { phase: "success" };
}
