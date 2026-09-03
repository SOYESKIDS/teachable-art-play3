import OpenAI from "openai";

/**
 * SERVICE-11B — 성장 리포트 초안 provider.
 *
 * ⚠️ 서버 전용. Client Component에서 절대 import하지 않는다.
 *   API key 환경변수에 NEXT_PUBLIC_ 접두사가 없으므로 Next.js가 브라우저 번들에
 *   값을 인라인하지 않지만, 아래 런타임 가드로 한 번 더 막는다
 *   (10A provider · supabase/admin.ts와 같은 방식).
 *
 * ★ 이 모듈은 리포트를 완성하지 않는다.
 *   교사가 읽고 고칠 초안 세 칸을 만들 뿐이고, 확정은 교사의 "작성완료"다.
 *
 * ★ 입력은 SERVICE-11A가 이미 얼려 둔 근거 스냅샷뿐이다.
 *   살아 있는 관찰기록을 다시 읽어 보내지 않는다 — 리포트가 무엇을 근거로
 *   쓰였는지와 AI가 본 것이 달라지면 그 리포트를 설명할 수 없게 된다.
 *
 * ★ 사진은 절대 보내지 않는다.
 *   binary · signed URL · storage path · 파일명 어느 것도 입력에 없다.
 */

/** 서버 내부 prompt 버전. 문구를 고치면 반드시 올린다(DB에 함께 저장된다). */
export const GROWTH_REPORT_PROMPT_VERSION = "growth-report-v1";

/** DB CHECK · child_growth_reports 컬럼과 같은 상한 */
export const MAX_GROWTH_CHANGES = 4000;
export const MAX_OBSERVATION_SUMMARY = 4000;
export const MAX_NEXT_SUPPORT = 3000;

const REQUEST_TIMEOUT_MS = 40_000;
const MAX_OUTPUT_TOKENS = 2000;
const PROVIDER_NAME = "openai";

/**
 * provider로 보내는 근거 한 건.
 *
 * ★ 여기에 아이 이름 · id · 기관 · 반 · 리포트/관찰 id · 교사 정보를 추가하지 마라.
 */
export interface GrowthReportEvidenceInput {
  /** 수업일 "YYYY-MM-DD" */
  observedOn: string | null;
  lessonTitle: string | null;
  /** "3주차 2차시" */
  lessonOrder: string | null;
  domainLabels: string[];
  childVoice: string | null;
  teacherNote: string | null;
  /** 교사가 검토·확정한 문장 */
  reviewedText: string;
}

export interface GrowthReportDraftInput {
  periodStart: string;
  periodEnd: string;
  attendance: {
    presentCount: number;
    lateCount: number;
    leftEarlyCount: number;
    absentCount: number;
    sessionCount: number;
  };
  evidence: GrowthReportEvidenceInput[];
}

export type GrowthReportDraftResult =
  | {
      ok: true;
      growthChanges: string;
      observationSummary: string;
      nextSupport: string;
      provider: string;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      /**
       * not_configured : 환경변수가 없어 기능 자체를 쓸 수 없다
       * no_source      : 근거가 하나도 없다
       * failed         : provider 호출 실패 (네트워크 · 인증 · 서버 오류 · 타임아웃)
       * invalid_output : 응답이 비었거나 형식이 어긋나거나 저장 한도를 넘었다
       */
      reason: "not_configured" | "no_source" | "failed" | "invalid_output";
    };

/**
 * 모델 선택.
 *
 * ★ 새 환경변수를 필수로 만들지 않는다.
 *   OPENAI_GROWTH_REPORT_MODEL이 있으면 그것을 쓰고, 없으면 이미 운영 중인
 *   OPENAI_OBSERVATION_MODEL을 그대로 쓴다. 그래서 이 기능을 배포해도
 *   Production 환경변수를 손대지 않고 동작한다.
 */
function resolveModel(): string | null {
  return (
    process.env.OPENAI_GROWTH_REPORT_MODEL ||
    process.env.OPENAI_OBSERVATION_MODEL ||
    null
  );
}

/**
 * AI 기능이 설정되어 있는가.
 * ★ 값이 아니라 존재 여부만 본다. 키 자체는 어디에도 반환하지 않는다.
 */
export function isGrowthReportAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && resolveModel());
}

/**
 * 서버 내부 지침 (prompt version: growth-report-v1).
 *
 * ★ 이 문구가 이 기능의 안전선이다.
 *   금지어 목록으로 사후에 거르는 방식은 한국어에서 반드시 새므로,
 *   "무엇을 쓰지 않는가"를 지침에 명시하고 마지막 판단은 교사 검토에 맡긴다.
 */
const SYSTEM_INSTRUCTIONS = [
  "당신은 유치원 교사가 이미 검토·확정한 관찰기록을 읽고, 기간 성장 리포트의 초안을 정리해 주는 도우미입니다.",
  "",
  "반드시 지킬 것:",
  "- 한국어로 씁니다.",
  "- 제공된 근거에 실제로 적혀 있는 사실만 사용합니다.",
  "- 근거에 없는 사건, 장면, 대화를 지어내지 않습니다.",
  "- 담담하고 객관적인 서술체로 씁니다. 과장하지 않습니다.",
  "- 유아 교육 현장에서 쓰는 표현을 사용합니다.",
  "- 구체적인 장면이나 아이의 표현은 도움이 되는 범위에서 살립니다.",
  "- 마크다운을 쓰지 않습니다. 각 항목은 문단 형태의 평문으로 씁니다.",
  "",
  "★ 근거 개수에 따라 표현의 강도를 반드시 달리합니다:",
  "- 근거가 1건이면 시간에 따른 변화를 말하지 않습니다.",
  "  '이번 관찰에서는', '현재 확인된 모습에서는' 같은 표현을 씁니다.",
  "  '지속적으로 성장하였다', '향상되었다', '발전했다' 같은 표현을 쓰지 않습니다.",
  "- 근거가 2건 이상이면 날짜 순서로 관찰된 차이를 조심스럽게 서술할 수 있습니다.",
  "  그때도 단정하지 말고 '~한 모습이 함께 관찰되었다' 정도로 씁니다.",
  "",
  "절대 하지 말 것:",
  "- 점수, 등급, 수준, 백분위, 순위, 또래 비교를 쓰지 않습니다.",
  "- 발달 단계 판정, 발달 지연, 발달 장애 가능성을 언급하지 않습니다.",
  "- ADHD, 자폐, 경계선 등 어떤 진단명도 쓰지 않습니다.",
  "- 지능, 재능, 성격 특성, 기질을 단정하지 않습니다.",
  "- 심리 상태나 정서 문제를 추론하지 않습니다.",
  "- 가정 환경, 양육 방식, 보호자에 대해 추측하지 않습니다.",
  "- 앞으로의 능력이나 성취를 예측하지 않습니다.",
  "- 근거로 뒷받침되지 않는 인과 설명('~때문에 ~하게 되었다')을 쓰지 않습니다.",
  "- 부정적 낙인이 되는 표현('부족하다', '미흡하다', '느리다')을 쓰지 않습니다.",
  "- 치료, 상담, 검사, 의학적 조치를 제안하지 않습니다.",
  "- 자신이 AI라는 사실이나 '분석 결과', '요약하면' 같은 표현을 쓰지 않습니다.",
  "",
  "세 항목의 성격:",
  "- growth_changes(성장 변화): 근거가 날짜순으로 여러 건일 때 관찰된 차이만 서술합니다.",
  "  근거가 1건이면 변화가 아니라 이번에 확인된 모습을 씁니다.",
  "- observation_summary(관찰 요약): 관찰된 행동과 표현을 사실 그대로 정리합니다.",
  "- next_support(다음 지원 방향): 아이가 실제로 보인 관심과 행동에 이어지는",
  "  교실 활동 기회를 제안합니다. 치료나 교정이 아니라 놀이·활동 제안입니다.",
  "",
  "출력 형식:",
  "아래 세 키를 가진 JSON 객체 하나만 출력합니다. 다른 텍스트를 덧붙이지 않습니다.",
  '{"growth_changes": "...", "observation_summary": "...", "next_support": "..."}',
].join("\n");

/**
 * 로그에 남기는 최소 정보.
 *
 * ★ API key · 전체 프롬프트 · 아이의 말 · 교사 관찰 · 검토 문장 ·
 *   생성된 AI 문장 · 아이 식별자를 남기지 않는다.
 *   무엇이 어디서 실패했는지만 남긴다.
 */
function logFailure(scope: string, message: string) {
  console.error(`[ai/growth-report-draft] ${scope} failed: ${message}`);
}

/** provider에 보낼 사용자 입력을 만든다. 값이 없는 항목은 아예 넣지 않는다. */
function buildUserInput(input: GrowthReportDraftInput): string | null {
  if (input.evidence.length === 0) return null;

  const lines: string[] = [];

  lines.push(`기간: ${input.periodStart} ~ ${input.periodEnd}`);
  lines.push(
    `기간 내 수업 ${input.attendance.sessionCount}회 · 출석 ${input.attendance.presentCount} · ` +
      `지각 ${input.attendance.lateCount} · 조퇴 ${input.attendance.leftEarlyCount} · ` +
      `결석 ${input.attendance.absentCount}`,
  );
  lines.push(`근거 기록 수: ${input.evidence.length}`);
  lines.push("");

  input.evidence.forEach((item, index) => {
    lines.push(`[근거 ${index + 1}]`);
    if (item.observedOn) lines.push(`날짜: ${item.observedOn}`);
    if (item.lessonOrder) lines.push(`수업: ${item.lessonOrder}`);
    if (item.lessonTitle) lines.push(`활동: ${item.lessonTitle}`);
    if (item.domainLabels.length > 0) {
      lines.push(`관찰영역: ${item.domainLabels.join(", ")}`);
    }
    if (item.childVoice) lines.push(`아이의 말: ${item.childVoice}`);
    if (item.teacherNote) lines.push(`교사 관찰: ${item.teacherNote}`);
    lines.push(`교사 검토 완료 기록: ${item.reviewedText}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

/** 모델 응답에서 JSON 객체를 꺼낸다. 추측하지 않고 형식이 어긋나면 실패로 본다. */
function parseStructured(raw: string): {
  growthChanges: string;
  observationSummary: string;
  nextSupport: string;
} | null {
  const text = raw.trim();
  if (text === "") return null;

  // 코드펜스가 섞여 오는 경우만 벗겨 낸다. 그 외 형태는 고쳐 쓰지 않는다.
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = (fenced ? fenced[1] : text).trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const row = parsed as Record<string, unknown>;
  const growth = row.growth_changes;
  const summary = row.observation_summary;
  const support = row.next_support;

  if (
    typeof growth !== "string" ||
    typeof summary !== "string" ||
    typeof support !== "string"
  ) {
    return null;
  }

  const growthChanges = growth.trim();
  const observationSummary = summary.trim();
  const nextSupport = support.trim();

  if (
    growthChanges === "" ||
    observationSummary === "" ||
    nextSupport === ""
  ) {
    return null;
  }

  /**
   * ★ 잘라내지 않는다.
   *   교육 기록을 임의로 자르면 문장이 중간에서 끊긴 채 교사에게 제시된다.
   *   한도를 넘으면 저장하지 않고 실패로 돌려 다시 만들게 한다.
   */
  if (
    [...growthChanges].length > MAX_GROWTH_CHANGES ||
    [...observationSummary].length > MAX_OBSERVATION_SUMMARY ||
    [...nextSupport].length > MAX_NEXT_SUPPORT
  ) {
    return null;
  }

  return { growthChanges, observationSummary, nextSupport };
}

/**
 * 성장 리포트 초안을 만든다.
 *
 * 실패해도 예외를 던지지 않고 reason을 돌려준다 —
 * 호출부(Server Action)가 사용자 문구를 고르고, 저장은 하지 않는다.
 */
export async function generateGrowthReportDraft(
  input: GrowthReportDraftInput,
): Promise<GrowthReportDraftResult> {
  if (typeof window !== "undefined") {
    throw new Error(
      "Growth report AI provider must never run in the browser.",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = resolveModel();

  if (!apiKey || !model) {
    return { ok: false, reason: "not_configured" };
  }

  const userInput = buildUserInput(input);

  if (userInput === null) {
    return { ok: false, reason: "no_source" };
  }

  let rawText: string;

  try {
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create(
      {
        model,
        instructions: SYSTEM_INSTRUCTIONS,
        input: userInput,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        /**
         * ★ Responses API 의 응답 저장 기능을 끈다.
         *
         *   이것이 Zero Data Retention 을 뜻하지는 않는다.
         *   API 데이터 보존은 OpenAI 계정/조직의 Data Controls 설정을 따르고,
         *   일반 API 환경에서는 서비스 제공·남용 탐지 목적의 보존이 있을 수 있다.
         *   (API 입력·출력이 기본적으로 모델 학습에 쓰이지는 않는다)
         *   ZDR 이 필요하면 OpenAI 계정에서 자격과 설정을 따로 확인해야 한다.
         */
        store: false,
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
        // 재시도하지 않는다. 교사가 버튼을 다시 누르는 편이 예측 가능하다.
        maxRetries: 0,
      },
    );

    rawText = response.output_text ?? "";
  } catch (error) {
    // ★ provider 오류 본문·stack·secret을 화면으로 내보내지 않는다.
    logFailure(
      "provider request",
      error instanceof Error ? error.name : "unknown error",
    );
    return { ok: false, reason: "failed" };
  }

  const parsed = parseStructured(rawText);

  if (!parsed) {
    // ★ 응답 본문을 로그에 남기지 않는다. 길이만 남긴다.
    logFailure(
      "provider output",
      `unusable output (length=${rawText.trim().length})`,
    );
    return { ok: false, reason: "invalid_output" };
  }

  return {
    ok: true,
    ...parsed,
    provider: PROVIDER_NAME,
    model,
    promptVersion: GROWTH_REPORT_PROMPT_VERSION,
  };
}
