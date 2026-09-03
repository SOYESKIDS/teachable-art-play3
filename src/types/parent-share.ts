/**
 * SERVICE-13 — 학부모 성장 리포트 공유 타입.
 *
 * 20260903090000_create_growth_report_parent_shares.sql 과 1:1로 맞춘다.
 *
 * ★ 이 시스템은 아동을 평가·진단하지 않는다.
 *   score / grade / percentile / diagnosis / riskLevel / developmentStage 필드가 없다.
 *   부모가 받는 것은 교사가 쓰고 작성 완료한 문장 그대로다.
 *
 * ★ 부모 DTO에는 내부 식별자가 없다.
 *   reportId / childId / organizationId / classId / observationId 를 담지 않는다.
 *   담을 필드가 없으므로 실수로 새어 나갈 수도 없다.
 *
 * ★ AI 흔적을 담지 않는다.
 *   provider / model / promptVersion / generatedText / reviewedText 필드가 없다.
 *   부모 화면은 AI가 쓰였는지 여부를 알 수 없고, 알 필요도 없다.
 */

/** 공유 비밀값의 길이. 32바이트 = 256bit 난수. */
export const SHARE_TOKEN_BYTES = 32;

/** base64url(32 bytes) = 43자. 형식 검증에 쓴다. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** DB가 저장하는 것은 원본이 아니라 이 형식의 SHA-256 hex다. */
export const SHARE_TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/;

/** 기본 유효기간. 실제 값은 DB trigger가 정한다 — 여기 값은 화면 문구용이다. */
export const SHARE_DEFAULT_EXPIRY_DAYS = 30;

/** 공개 링크 경로. 비밀값은 여기 뒤에 #으로 붙고 서버로 전송되지 않는다. */
export const SHARE_PATH_PREFIX = "/share/growth-report";

/** 부모 페이지가 비밀값을 넘기는 endpoint */
export const SHARE_RESOLVE_ENDPOINT = "/api/share/growth-report/resolve";

/**
 * 원장 화면에 보여 주는 공유 상태.
 *
 * ★ none 과 revoked 를 구분하는 이유
 *   "한 번도 공유하지 않았다"와 "공유했다가 중지했다"는 원장에게 다른 사실이다.
 *   (부모 쪽에서는 이 둘을 절대 구분해 주지 않는다 — 13번 항목 참조)
 */
export type GrowthReportShareStatus = "none" | "active" | "expired" | "revoked";

/**
 * 원장이 볼 수 있는 공유 metadata.
 *
 * ★ token 도 tokenHash 도 없다.
 *   token_hash 는 SELECT GRANT 목록에 아예 없어서 조회 자체가 되지 않고,
 *   원본은 DB에 저장된 적이 없다. 그래서 "기존 링크 다시 보기"가 불가능하다.
 */
export interface GrowthReportShareMetadata {
  shareId: string;
  status: GrowthReportShareStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

/**
 * 공유 링크 생성 결과.
 *
 * ★ token 이 나가는 유일한 지점이다.
 *   서버 메모리에서 만들어져 이 응답으로 원장에게 한 번 전달되고 사라진다.
 *   DB에는 SHA-256만 남으므로 나중에 다시 만들어 낼 수 없다.
 */
export type GrowthReportShareCreateState =
  | { ok: true; shareId: string; token: string; expiresAt: string }
  | { ok: false; message: string };

export type GrowthReportShareRevokeState =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 부모에게 보여 주는 활동 한 건.
 *
 * ★ 근거 snapshot 원문이 아니다.
 *   reviewedText / teacherNote / childVoice 는 필드 자체가 없다.
 *   날짜 · 차시명 · 관찰영역 이름까지만 나간다.
 */
export interface ParentSharedActivity {
  observedOn: string | null;
  lessonTitle: string | null;
  domainLabels: string[];
}

/** 부모 페이지가 받는 전부 */
export interface ParentSharedReport {
  organizationName: string;
  className: string | null;
  childName: string | null;
  title: string;
  periodStart: string;
  periodEnd: string;
  completedAt: string | null;
  growthChanges: string;
  observationSummary: string;
  nextSupport: string;
  activities: ParentSharedActivity[];
}

/**
 * resolve endpoint 응답.
 *
 * ★ 실패에 이유가 없다.
 *   없는 링크 · 틀린 비밀값 · 만료 · 중지를 구분해 주지 않는다.
 *   구분해 주면 링크 열거로 "존재하는 공유"를 찾아낼 수 있게 된다.
 */
export type ParentShareResolveResponse =
  | { ok: true; report: ParentSharedReport }
  | { ok: false };
