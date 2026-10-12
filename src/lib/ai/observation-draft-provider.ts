import "server-only";
import OpenAI from "openai";
import {
  minimizeFreeText,
  summarizeMinimization,
  type KnownIdentifiers,
  type MinimizationSummary,
} from "@/lib/ai/identifier-minimization";

/**
 * SERVICE-10A — 관찰기록 정리 초안 provider.
 *
 * ⚠️ 서버 전용. Client Component에서 절대 import하지 않는다.
 *   API key 환경변수에 NEXT_PUBLIC_ 접두사가 없으므로 Next.js가 브라우저 번들에
 *   값을 인라인하지 않지만, 아래 런타임 가드로 한 번 더 막는다
 *   (src/lib/supabase/admin.ts와 같은 방식).
 *
 * ★ 이 모듈이 하는 일은 하나뿐이다.
 *   교사가 이미 쓴 문장을 받아, 사실 중심의 짧은 정리 문단 하나를 돌려준다.
 *   평가하지 않고, 진단하지 않고, 관찰되지 않은 것을 추측하지 않는다.
 *
 * ★ 식별 필드를 provider로 보내지 않는다.
 *   아이 이름 · UUID · 기관 · 반 · 수업 id · 교사 · 사진 어느 것도 입력에 넣지 않는다.
 *   무엇을 보내고 무엇을 보내지 않는지는 ObservationDraftInput 타입이 강제한다.
 *
 *   ※ 다만 childVoice / teacherNote 는 교사가 자유롭게 쓰는 문장이라,
 *     그 안에 사람 이름이 직접 적혀 있을 수 있다. 이 코드가 보장하는 것은
 *     "명시적 식별 필드를 전송하지 않는다"까지이고, 자유 입력에서 개인정보를
 *     완전히 제거한다고 주장하지 않는다.
 *
 * ★ 사진은 입력에 포함하지 않는다.
 *   09A의 활동사진 binary · signed URL · storage path 어느 것도 전송하지 않는다.
 *   멀티모달 분석은 별도 단계(10B 후보)다.
 */

/**
 * 서버 내부 prompt 버전.
 *
 * ★ 문구를 고치면 반드시 올린다.
 *   DB의 prompt_version 컬럼에 함께 저장되므로, 나중에 "이 문장이 어떤 규칙으로
 *   만들어졌는가"를 행 단위로 되짚을 수 있다.
 */
export const OBSERVATION_DRAFT_PROMPT_VERSION = "v1";

/** DB의 generated_text / reviewed_text CHECK와 같은 상한 */
export const MAX_AI_DRAFT_TEXT = 3000;

/** provider 호출 상한 (밀리초) */
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * 모델에 넘길 최대 출력 토큰.
 * 2~4문장짜리 문단 하나면 충분하고, 길어지면 교사가 읽지 않는다.
 */
const MAX_OUTPUT_TOKENS = 700;

const PROVIDER_NAME = "openai";

/**
 * provider로 보내는 값 — 이 타입에 있는 것이 전부다.
 *
 * ★ 여기에 아이 이름 · id · 기관 · 반 · 교사 정보를 추가하지 마라.
 *   이름 없이도 기록 정리는 충분히 가능하고, 개인정보는 나가지 않을수록 좋다.
 */
export interface ObservationDraftInput {
  /** 차시 제목 (없을 수 있다) */
  lessonTitle: string | null;
  /** "3주차 2차시" 같은 표기 (없을 수 있다) */
  lessonOrder: string | null;
  /** 교사가 고른 관찰영역의 표시명. code가 아니라 label을 보낸다. */
  domainLabels: string[];
  /** 아이가 한 말 (교사가 기록한 원문) */
  childVoice: string | null;
  /** 교사 관찰 메모 (교사가 기록한 원문) */
  teacherNote: string | null;
  /**
   * 자유서술 치환에만 쓰는 등록된 이름 (실행 묶음 C4).
   *
   * ★ 이 값 자체는 **전송되지 않는다.**
   *   childVoice · teacherNote 안에 적힌 이름을 자리표시로 바꾸기 위한 대조용이다.
   *   호출자는 서버에서 조회한 값만 넣는다.
   *
   * ★ 넘기지 않아도 동작한다. 그때는 연락처·이메일·식별번호·보호자 호칭만 가려지고,
   *   이름 치환은 일어나지 않는다. 결과의 residualRisk 가 그 사실을 반영한다.
   */
  knownIdentifiers?: KnownIdentifiers;
}

export type ObservationDraftResult =
  | {
      ok: true;
      text: string;
      provider: string;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      /**
       * not_configured : 환경변수가 없어 기능 자체를 쓸 수 없다
       * no_source      : 정리할 교사 기록이 비어 있다
       * failed         : provider 호출 실패 (네트워크 · 인증 · 서버 오류 · 타임아웃)
       * invalid_output : 응답이 비었거나 너무 길다
       */
      reason:
        | "not_configured"
        | "no_source"
        | "failed"
        | "invalid_output"
        /** 실행 묶음 C4 — 진단·의료 표현이 보여 전송하지 않았다 */
        | "sensitive_input";
      /** 치환 결과 요약 (있을 때만). 원문 조각을 담지 않는다 */
      minimization?: MinimizationSummary;
    };

/**
 * AI 기능이 설정되어 있는가.
 *
 * ★ 값이 아니라 존재 여부만 본다. 키 자체는 어디에도 반환하지 않는다.
 *   환경변수가 없으면 화면은 정상 동작하고 버튼만 안내 문구와 함께 비활성화된다
 *   (build도 실패하지 않는다).
 */
export function isObservationAiConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_OBSERVATION_MODEL,
  );
}

/**
 * 서버 내부 지침.
 *
 * ★ 이 문구가 이 기능의 안전선이다.
 *   금지어 목록으로 사후에 걸러 내는 방식은 한국어에서 반드시 새므로,
 *   "무엇을 쓰지 않는가"를 지침에 명시하고 마지막 판단은 교사 검토에 맡긴다.
 */
const SYSTEM_INSTRUCTIONS = [
  "당신은 유치원 교사가 직접 작성한 관찰기록을 읽고, 그 내용을 정리해 주는 도우미입니다.",
  "",
  "반드시 지킬 것:",
  "- 한국어로 씁니다.",
  "- 입력에 실제로 적혀 있는 사실만 사용합니다.",
  "- 입력에 없는 행동, 감정, 이유, 배경을 추측해서 덧붙이지 않습니다.",
  "- 아이가 한 말은 아이의 말로 다룹니다. 교사가 한 말처럼 바꾸지 않습니다.",
  "- 2~4문장으로 씁니다. 800자를 넘기지 않습니다.",
  "- 담담하고 객관적인 서술체로 씁니다. 과장하지 않습니다.",
  "- 하나의 문단으로만 씁니다. 제목, 목록, 머리기호를 쓰지 않습니다.",
  "",
  "절대 하지 말 것:",
  "- 점수, 등급, 수준, 발달 단계, 연령 기준 비교를 쓰지 않습니다.",
  "- 정상/비정상, 우수/부족, 빠름/느림 같은 판정을 쓰지 않습니다.",
  "- 위험도, 심리 진단, 성격 진단, 지능 추론, 장애 가능성, 정서 문제 판정을 쓰지 않습니다.",
  "- 다른 아이나 또래 평균과 비교하지 않습니다.",
  "- '창의성이 뛰어나다', '집중력이 부족하다'처럼 입력에 없는 평가성 결론을 쓰지 않습니다.",
  "- 의학적·심리학적 소견을 쓰지 않습니다.",
  "- 'AI가', '분석 결과', '요약하면' 같은 표현을 쓰지 않습니다.",
  "- 교사나 보호자에게 하는 조언, 제안, 지도 방법을 쓰지 않습니다.",
  "",
  "결과는 정리된 문단 본문만 출력합니다. 다른 설명을 덧붙이지 않습니다.",
].join("\n");

/** provider에 보낼 사용자 입력을 만든다. 값이 없는 항목은 아예 넣지 않는다. */
interface BuiltUserInput {
  text: string | null;
  /** 치환 결과 요약. 원문 조각을 담지 않는다. */
  minimization: MinimizationSummary;
}

/**
 * 전송할 prompt 본문을 만든다.
 *
 * ★ 실행 묶음 C4 — 자유서술은 전송 직전에 치환한다.
 *   원문(DB 의 관찰기록)은 바꾸지 않는다. 여기서 만드는 것은 전송용 사본이다.
 *   치환이 완전한 익명화가 아니라는 점은 identifier-minimization.ts 주석에 있다.
 */
function buildUserInput(input: ObservationDraftInput): BuiltUserInput {
  const known = input.knownIdentifiers ?? {};

  const voice = minimizeFreeText(input.childVoice, known);
  const note = minimizeFreeText(input.teacherNote, known);
  const minimization = summarizeMinimization([voice, note]);

  const childVoice = voice.text.trim();
  const teacherNote = note.text.trim();

  // 정리할 원문이 하나도 없으면 호출하지 않는다.
  if (childVoice === "" && teacherNote === "") {
    return { text: null, minimization };
  }

  const lines: string[] = [];

  if (input.lessonOrder) lines.push(`수업: ${input.lessonOrder}`);
  if (input.lessonTitle) lines.push(`활동: ${input.lessonTitle}`);

  if (input.domainLabels.length > 0) {
    lines.push(`관찰영역: ${input.domainLabels.join(", ")}`);
  }

  if (childVoice !== "") lines.push(`아이의 말: ${childVoice}`);
  if (teacherNote !== "") lines.push(`교사 관찰: ${teacherNote}`);

  return { text: lines.join("\n"), minimization };
}

/**
 * 로그에 남기는 최소 정보.
 *
 * ★ API key · 전체 프롬프트 · 아이 기록 원문 · provider 응답 본문을 남기지 않는다.
 *   무엇이 어디서 실패했는지만 남긴다.
 */
function logFailure(scope: string, message: string) {
  console.error(`[ai/observation-draft] ${scope} failed: ${message}`);
}

/**
 * 관찰기록 정리 초안을 만든다.
 *
 * 실패해도 예외를 던지지 않고 reason을 돌려준다 —
 * 호출부(Server Action)가 사용자 문구를 고르고, 저장은 하지 않는다.
 */
export async function generateObservationDraft(
  input: ObservationDraftInput,
): Promise<ObservationDraftResult> {
  if (typeof window !== "undefined") {
    throw new Error(
      "Observation AI provider must never run in the browser.",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_OBSERVATION_MODEL;

  // ★ 모델 ID를 코드에 하드코딩하지 않는다. 환경변수가 유일한 출처다.
  if (!apiKey || !model) {
    return { ok: false, reason: "not_configured" };
  }

  const built = buildUserInput(input);

  if (built.text === null) {
    return { ok: false, reason: "no_source" };
  }

  /**
   * ★ 실행 묶음 C4 — 진단·의료 표현이 보이면 전송하지 않는다.
   *   아이를 진단하지 않는 서비스이고, 그런 문장이 메모에 들어왔다면
   *   AI 로 보내기 전에 사람이 먼저 봐야 한다.
   *   원문·치환문을 로그에 남기지 않는다 — 판정 결과만 돌려준다.
   */
  if (built.minimization.blocked) {
    return {
      ok: false,
      reason: "sensitive_input",
      minimization: built.minimization,
    };
  }

  const userInput = built.text;

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
        // 재시도는 하지 않는다. 교사가 버튼을 다시 누르는 편이 예측 가능하고,
        // 자동 재시도는 비용만 조용히 늘린다.
        maxRetries: 0,
      },
    );

    rawText = response.output_text ?? "";
  } catch (error) {
    // ★ provider 오류 본문·stack·secret을 화면으로 내보내지 않는다.
    //   여기서도 message 한 줄만 서버 로그에 남긴다.
    logFailure(
      "provider request",
      error instanceof Error ? error.name : "unknown error",
    );
    return { ok: false, reason: "failed" };
  }

  const text = rawText.trim();

  // 비었거나 상한을 넘으면 저장하지 않는다.
  if (text === "" || [...text].length > MAX_AI_DRAFT_TEXT) {
    logFailure(
      "provider output",
      text === "" ? "empty output" : "output too long",
    );
    return { ok: false, reason: "invalid_output" };
  }

  return {
    ok: true,
    text,
    provider: PROVIDER_NAME,
    model,
    promptVersion: OBSERVATION_DRAFT_PROMPT_VERSION,
  };
}
