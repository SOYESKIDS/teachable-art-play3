/**
 * SERVICE-10A — AI 관찰기록 정리 타입 · 상수.
 *
 * 20260901090000_create_observation_ai_drafts.sql 과 1:1로 맞춘다.
 *
 * ★ 이 시스템은 아동을 평가·진단하지 않는다.
 *   score / grade / level / risk / developmentStage / diagnosis 같은 필드를 두지 않는다.
 *   AI가 만드는 것은 교사가 이미 쓴 문장의 정리 초안 하나뿐이다.
 *
 * ★ SERVICE-11 성장리포트가 쓸 수 있는 공식 텍스트는
 *     reviewStatus === "accepted" && reviewedText !== null
 *   뿐이다. generatedText 단독은 리포트의 근거가 될 수 없다.
 *   (이 규칙은 DB의 accepted CHECK 제약과 같은 내용이다)
 */

/**
 * public.class_session_observation_ai_drafts.review_status
 *
 * generated : AI 초안이 있고 교사가 아직 확정하지 않았다
 * accepted  : 교사가 내용을 확인(필요하면 수정)하고 확정했다
 *
 * accepted는 잠금이 아니다 — 교사는 다시 수정해 확정할 수 있고,
 * 재생성하면 generated로 되돌아간다.
 */
export type ObservationAiReviewStatus = "generated" | "accepted";

/** DB의 generated_text / reviewed_text CHECK와 같은 상한 */
export const MAX_AI_DRAFT_TEXT = 3000;

/** 한 수업 화면이 읽어 오는 AI 정리 상한 (관찰 roster 상한과 같은 성격) */
export const MAX_AI_DRAFT_LOOKUP = 200;

/**
 * 화면에 내려보내는 AI 정리 한 건.
 *
 * ★ generatedText 와 reviewedText 를 분리해서 들고 있는 이유
 *   generatedText : AI 생성 단계에서 저장된 초안 원문. 교사 검토로 바뀌지 않는다.
 *   reviewedText  : 교사가 확인·수정한 최종문.
 *   둘을 합치면 "교사가 고친 것인지 생성 당시 문장 그대로인지"를 구분할 수 없게 된다.
 *
 *   ※ generatedText 는 "provider 가 만들었음이 증명된 문장"이 아니다.
 *     DB 가 provenance 를 보증하지는 않는다 — migration 헤더 주석 참조.
 *
 * ★ updatedAt 은 DB가 돌려준 문자열 그대로다.
 *   이 값이 곧 검토 저장의 낙관적 동시성 토큰(p_expected_updated_at)이라
 *   Date로 파싱했다가 다시 문자열로 만들면 마이크로초가 잘려
 *   저장이 영원히 AI004(stale)로 실패한다. 08A 관찰기록 토큰과 같은 규칙이다.
 *
 * ★ isSourceStale 은 DB 컬럼이 아니다.
 *   sourceObservationUpdatedAt 과 관찰기록의 현재 updated_at 을 조회 시점에
 *   비교해서 만드는 view model 값이다. 컬럼으로 저장하면 원본이 바뀌는 순간을
 *   이 행이 알 수 없어 반드시 언젠가 거짓이 된다.
 */
export interface ObservationAiDraft {
  id: string;
  observationId: string;

  /** AI 생성 단계에서 저장된 초안 원문. 교사 검토로 덮이지 않는다. */
  generatedText: string;
  /** 교사가 확인·수정한 최종문. accepted가 아니면 null일 수 있다. */
  reviewedText: string | null;

  reviewStatus: ObservationAiReviewStatus;

  /** 생성 당시의 관찰기록 토큰 (timestamptz 원본 문자열) */
  sourceObservationUpdatedAt: string;
  /** ★ 검토 저장의 동시성 토큰. 가공하지 않는다. */
  updatedAt: string;

  provider: string;
  model: string;
  promptVersion: string;

  generatedAt: string;
  reviewedAt: string | null;

  /**
   * 생성 이후 원본 관찰기록이 바뀌었는가.
   * true면 확정할 수 없고, 다시 생성해야 한다.
   */
  isSourceStale: boolean;
}

/**
 * SERVICE-11이 쓸 수 있는 공식 텍스트만 골라낸다.
 *
 * ★ 이 함수를 거치지 않고 generatedText를 리포트에 넣지 마라.
 *   교사가 읽지 않은 AI 문장이 공식 기록이 되는 순간 이 기능의 전제가 무너진다.
 */
export function officialObservationSummary(
  draft: ObservationAiDraft | null,
): string | null {
  if (!draft) return null;
  if (draft.reviewStatus !== "accepted") return null;
  if (draft.isSourceStale) return null;

  return draft.reviewedText;
}

/** AI 생성 Server Action 결과 */
export type ObservationAiGenerateState =
  | {
      ok: true;
      /** 생성 직후의 동시성 토큰. 이어서 검토 저장에 바로 쓸 수 있다. */
      updatedAt: string;
    }
  | {
      ok: false;
      message: string;
    };

/** AI 검토 확정 Server Action 결과 */
export type ObservationAiReviewState =
  | {
      ok: true;
      updatedAt: string;
      reviewedText: string;
    }
  | {
      ok: false;
      /** stale이면 화면이 "다시 생성" 안내를 띄운다 */
      kind: "error" | "stale" | "source_changed";
      message: string;
    };
