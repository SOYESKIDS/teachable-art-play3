/**
 * SERVICE-11B — 성장 리포트 AI 초안 타입.
 *
 * 20260901190000_create_growth_report_ai_drafts.sql 과 1:1로 맞춘다.
 *
 * ★ AI는 리포트를 완성하지 않는다.
 *   여기 있는 세 문장은 교사가 읽고 고칠 초안이고,
 *   확정된 공식 문장은 여전히 GrowthReportDetail의 growthChanges /
 *   observationSummary / nextSupport 다.
 *
 * ★ 이 시스템은 아동을 평가·진단하지 않는다.
 *   score / grade / percentile / diagnosis / riskLevel / ranking 필드가 없다.
 *
 * ★ 원장은 이 타입을 보지 않는다.
 *   DB의 SELECT Policy에 원장 분기가 없어 조회 자체가 되지 않고,
 *   원장 화면은 이 타입을 import하지도 않는다.
 */

/**
 * 화면에 내려보내는 AI 초안.
 *
 * ★ isSourceStale은 DB 컬럼이 아니다.
 *   생성 당시의 sourceRevision과 리포트의 현재 sourceRevision을
 *   조회 시점에 비교해서 만드는 view model 값이다.
 *
 * ★ sourceRevision 같은 내부 토큰은 화면에 표시하지 않는다.
 *   교사에게 필요한 것은 "다시 만들어야 하는가"뿐이다.
 */
export interface GrowthReportAiDraft {
  id: string;
  growthChanges: string;
  observationSummary: string;
  nextSupport: string;

  /** 근거가 그 뒤 다시 모였는가. true면 적용할 수 없다. */
  isSourceStale: boolean;

  /**
   * 이 초안이 리포트에 실제로 들어간 시점.
   *
   * ★ Client 가 남길 수 있는 값이 아니다.
   *   applied_at / applied_by 에는 컬럼 GRANT 가 없고,
   *   DB trigger 가 리포트 본문을 직접 읽어 일치를 확인했을 때만 채운다.
   *   따라서 이 값이 있으면 "세 문장이 리포트에 그대로 들어갔다"가 사실이다.
   */
  appliedAt: string | null;

  generatedAt: string;
}

/** AI 초안 생성 Server Action 결과 */
export type GrowthReportAiGenerateState =
  | { ok: true }
  | { ok: false; message: string };

/** AI 초안 적용 Server Action 결과 */
export type GrowthReportAiApplyState =
  | { ok: true }
  | {
      ok: false;
      /**
       * stale        : 근거가 바뀌어 초안을 쓸 수 없다 → 다시 만들기 안내
       * report_stale : 리포트가 그 사이 바뀌었다 → 새로고침 안내
       */
      kind: "error" | "stale" | "report_stale";
      message: string;
    };
