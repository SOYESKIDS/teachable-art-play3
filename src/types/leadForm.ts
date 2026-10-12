/** B2B Lead 접수 Form 전용 타입 (lead_submissions 테이블과 대응) */

/**
 * 문의 유형. DB CHECK(lead_submissions_submission_type_check)와 같은 목록이어야 한다.
 * 서버 action 이 들어온 값을 이 배열로 검증한다.
 */
export const SUBMISSION_TYPES = [
  "pilot",
  "demo",
  "consult",
  "purchase_interest",
] as const;

export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export type PackageCode = "starter" | "standard" | "premium" | "undecided";
