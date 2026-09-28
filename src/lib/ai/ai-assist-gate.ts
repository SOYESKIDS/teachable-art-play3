import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PHASE 08 (A1) — AI provider 호출 전 서버 판정.
 *
 * OPENAI_API_KEY 가 있다는 사실만으로 provider 를 부르지 않는다 (PHASE 08 고정 결정 2).
 * provider 호출 전에 반드시 이 두 가지를 통과해야 한다.
 *
 *   1. authorizeAiAssist — DB(public.ai_assist_authorization)가 판정한다.
 *        담당 교사 · ai_assist entitlement(해당 capability) · release registry(AR-8 등 blocked_by) · 반 쓰기 가능
 *        호출 실패 · 알 수 없는 응답 = 차단 (fail closed)
 *   2. findExplicitIdentifier — 보낼 자유 텍스트에 명시적 식별자(원아 이름 · 이메일 · 전화번호 · UUID)가
 *        보이면 보내지 않고 이유를 돌려준다. 자유 텍스트 개인정보 최소화 정책 자체는 AR-8 (OPEN) 이다.
 *
 * 사진 · child id · organization id 는 provider 입력 타입에 애초에 없다 (observation/growth-report provider).
 * AI 는 Growth5 · Stage 를 고르지 않고 리포트를 공개하지 않는다 (초안 저장 · 교사 검토만).
 */

export type AiAssistKind = "observation_cleanup" | "period_report_draft";

export type AiBlockReason =
  | "not_authorized"
  | "policy_blocked"
  | "not_released"
  | "not_entitled"
  | "read_only"
  | "check_failed";

export type AiAssistDecision = { allowed: true } | { allowed: false; reason: AiBlockReason };

export const AI_BLOCK_MESSAGES: Record<AiBlockReason, string> = {
  not_authorized: "담당 반의 기록에서만 AI 작성 보조를 사용할 수 있습니다.",
  policy_blocked: "AI 작성 보조는 개인정보 보호 정책 확정 전까지 사용할 수 없습니다.",
  not_released: "AI 작성 보조는 아직 제공되지 않습니다.",
  not_entitled: "현재 이용 상품에는 AI 작성 보조가 포함되어 있지 않습니다.",
  read_only: "현재 읽기 전용 상태라 AI 작성 보조를 사용할 수 없습니다.",
  check_failed: "AI 작성 보조 사용 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
};

const KNOWN_REASONS = new Set<AiBlockReason>([
  "not_authorized",
  "policy_blocked",
  "not_released",
  "not_entitled",
  "read_only",
]);

export async function authorizeAiAssist(
  supabase: SupabaseClient,
  kind: AiAssistKind,
  targetId: string,
): Promise<AiAssistDecision> {
  if (typeof window !== "undefined") {
    throw new Error("AI assist authorization must run on the server.");
  }

  const { data, error } = await supabase.rpc("ai_assist_authorization", {
    p_kind: kind,
    p_target_id: targetId,
  });

  if (error || !data || typeof data !== "object") {
    console.error(`[ai/assist-gate] authorization failed: code=${error?.code ?? "unexpected_payload"}`);
    return { allowed: false, reason: "check_failed" };
  }

  const payload = data as { allowed?: unknown; reason?: unknown };

  if (payload.allowed === true) return { allowed: true };

  const reason =
    typeof payload.reason === "string" && KNOWN_REASONS.has(payload.reason as AiBlockReason)
      ? (payload.reason as AiBlockReason)
      : "check_failed";

  return { allowed: false, reason };
}

export type ExplicitIdentifierKind = "child_name" | "email" | "phone" | "uuid";

export const IDENTIFIER_BLOCK_MESSAGE =
  "기록에 원아 이름이나 연락처 같은 식별 정보가 있어 AI 작성 보조로 보내지 않았습니다. 해당 표현을 지운 뒤 다시 시도해주세요.";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:^|[^0-9])0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?:[^0-9]|$)/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * 보낼 자유 텍스트에서 명시적 식별자를 찾는다. 찾으면 그 종류, 없으면 null.
 * 원아 이름은 2자 이상일 때만 비교한다 (1자 비교는 일반 단어와 구분할 수 없다).
 * 이 검사는 "보이는 식별자"만 막는다 — 자유 텍스트 전체의 비식별화를 보장하지 않는다 (AR-8).
 */
export function findExplicitIdentifier(
  texts: ReadonlyArray<string | null | undefined>,
  childNames: ReadonlyArray<string | null | undefined>,
): ExplicitIdentifierKind | null {
  const names = childNames
    .map((name) => (name ?? "").trim())
    .filter((name) => name.length >= 2);

  for (const raw of texts) {
    const text = raw ?? "";
    if (text === "") continue;
    if (names.some((name) => text.includes(name))) return "child_name";
    if (EMAIL.test(text)) return "email";
    // UUID 가 전화번호 패턴에도 걸리므로 더 구체적인 UUID 를 먼저 본다
    if (UUID.test(text)) return "uuid";
    if (PHONE.test(text)) return "phone";
  }

  return null;
}
