/**
 * 콘텐츠 상태 세 축 — 서로 다른 질문이므로 따로 둔다.
 *
 * ── 왜 나누는가 ───────────────────────────────────────────────────
 *
 * 이전 구현은 이 셋을 `reviewState` 하나에 섞었다. 그러면 "저장소에 있다"와
 * "검수를 마쳤다"가 구분되지 않아, 전사만 된 원문이 발행본처럼 보일 수 있다.
 *
 *   1. origin      — 이 값이 **어디서** 왔나 (저장소 전사본 / 데이터베이스)
 *   2. transcription — 원문을 **옮겼나**
 *   3. publication — 본사가 **검수하고 발행했나**
 *
 * 세 축은 독립이다. 예를 들어 "DB 에서 왔고(origin) 전사도 끝났지만
 * (transcription) 아직 검수 전(publication)"이 정상적인 상태다.
 *
 * ── 어디에 쓰이나 ─────────────────────────────────────────────────
 *
 * ★ origin 은 **개발·Preview 에서만** 보여 준다. 운영에서 교사에게 저장소
 *   사정을 설명하지 않는다.
 * ★ transcription · publication 은 운영에서도 보여 준다. 교사가 인쇄본과
 *   함께 봐야 하는지 알아야 하기 때문이다.
 * ★ 정식 서비스 경로는 **발행된 것만** 내보낸다. 검수 전 원문은 내부 검수
 *   화면에서만 열린다 (`audience`).
 */

/** 이 값이 어디서 왔나 */
export type ContentOrigin = "fixture" | "database";

/** 원문을 옮겼나 */
export type TranscriptionState = "pending" | "done";

/** 본사가 검수하고 발행했나 */
export type PublicationState = "draft" | "in_review" | "published";

/** 누가 보는 경로인가 */
export type ContentAudience =
  /** 교사·원장·보호자가 쓰는 정식 서비스 경로 */
  | "service"
  /** 본사 콘텐츠 검수 화면 */
  | "internal_review";

export const TRANSCRIPTION_LABEL: Record<TranscriptionState, string> = {
  pending: "원문 미전사",
  done: "원문 전사 완료",
};

export const PUBLICATION_LABEL: Record<PublicationState, string> = {
  draft: "검수 전",
  in_review: "검수 중",
  published: "발행",
};

export const PUBLICATION_NOTE: Record<PublicationState, string> = {
  draft: "본사 원문 대조 검수를 아직 시작하지 않았습니다.",
  in_review: "본사가 원문과 대조하는 중입니다. 수업 전 인쇄본과 함께 확인해 주세요.",
  published: "본사 원문 대조 검수를 마친 내용입니다.",
};

export interface ContentStatus {
  transcription: TranscriptionState;
  publication: PublicationState;
}

/**
 * 정식 서비스에 내보내도 되는가.
 *
 * ★ 발행된 것만 통과한다. 전사만 된 원문은 통과하지 못한다.
 *   내부 검수 화면(`internal_review`)은 전사된 것까지 본다.
 */
export function isVisibleTo(status: ContentStatus, audience: ContentAudience): boolean {
  if (audience === "internal_review") return status.transcription === "done";
  return status.publication === "published";
}

/** 서비스 경로에서 본문을 감춘 이유 */
export type HiddenReason = "not_transcribed" | "not_published";

export function hiddenReason(status: ContentStatus): HiddenReason | null {
  if (status.transcription !== "done") return "not_transcribed";
  if (status.publication !== "published") return "not_published";
  return null;
}

export const HIDDEN_REASON_NOTE: Record<HiddenReason, string> = {
  not_transcribed:
    "공식 가이드 원문이 아직 이 화면에 들어오지 않았습니다. 수업은 인쇄된 가이드로 진행해 주세요.",
  not_published:
    "원문을 옮겼지만 본사 검수가 끝나지 않아 아직 열지 않았습니다. 수업은 인쇄된 가이드로 진행해 주세요.",
};

/* ══════════════════════════════════════════ 표시 환경 */

/**
 * 개발 표시(출처 배지)를 켤 환경인가.
 *
 * ── NODE_ENV 로는 구분되지 않는다 ────────────────────────────────
 *
 * `next build` 는 Preview 배포에서도 NODE_ENV 를 "production" 으로 둔다.
 * 그래서 이전 조건(`NODE_ENV !== "production"`)은 **로컬에서만** 참이고
 * Preview 에서는 배지가 사라졌다 — 정작 배지가 필요한 곳이 Preview 다.
 *
 * ── 그래서 배포 환경을 직접 본다 ─────────────────────────────────
 *
 * Vercel 은 `VERCEL_ENV` 에 production · preview · development 를 넣는다.
 * 이 값이 "production" 일 때만 끈다. Vercel 밖(로컬 `next dev`·`next start`)
 * 에서는 값이 없으므로 켠다 — 모르면 켜는 쪽이 안전하다. 배지가 잘못 보이는
 * 것보다 가상 데이터를 운영으로 착각하는 쪽이 위험하다.
 *
 * ★ 서버에서만 부른다. 클라이언트 번들에 배포 환경을 넘기지 않는다.
 */
export function showsDevelopmentMarkers(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/* ══════════════════════════════════════════ 발행 조건 */

/** 발행을 막는 이유 */
export type PublishBlocker =
  | "not_transcribed"
  | "already_published"
  | "unresolved_notes";

export const PUBLISH_BLOCKER_NOTE: Record<PublishBlocker, string> = {
  not_transcribed:
    "원문을 아직 옮기지 않았습니다. 전사하지 않은 주차는 발행할 수 없습니다.",
  already_published: "이미 발행된 주차입니다.",
  unresolved_notes:
    "전사 중 확인하지 못한 곳이 남아 있습니다. 그 자리는 잠정 해석이므로 원문 쪽을 대조해 해결 처리한 뒤에 발행할 수 있습니다.",
};

/**
 * 지금 발행해도 되는가.
 *
 * ★ **전사가 끝나야 발행할 수 있다.** 옮기지 않은 원문을 발행 상태로 만들면
 *   교사 화면에는 빈 수업이 열린다. 그래서 순서를 코드가 강제한다 — 화면에서
 *   버튼을 숨기는 것으로 끝내지 않는다.
 *
 * ★ **미해결 대조 주의가 있으면 막는다.** 전사는 끝났지만 표의 행·열이나 활동
 *   순서를 확인하지 못한 자리가 남아 있다면, 그 자리는 잠정 해석이다. 잠정
 *   해석을 교사에게 정식 콘텐츠로 내보내지 않는다.
 *
 *   `unresolvedNoteCount` 는 **해결되지 않은** 기록 수다. 해결된 기록은 세지
 *   않는다 — 이력은 남고 발행은 막지 않는다. 기록을 지워야 발행되는 구조를
 *   만들지 않기 위해서다.
 *
 *   ★ **기본값을 두지 않는다.** 예전에는 `= 0` 이 기본값이었는데, 그러면 인자를
 *     빠뜨린 호출이 「미해결 없음」으로 통과한다. 세는 것을 잊은 것과 세어 보니
 *     0인 것은 다르다. 부르는 쪽이 반드시 숫자를 넘기게 한다.
 *
 * ★ 이 함수는 "해도 되는가"만 답한다. 실제로 올리는 일은 사람이 검수한 뒤에
 *   한다. 코드가 저절로 발행하지 않는다.
 *
 * ★ 화면과 서버가 **같은 함수**를 부른다. E단계에서 발행 기능을 붙일 때
 *   서버 쪽은 {@link assertPublishable} 을 통과해야 쓰기로 넘어간다.
 */
export function publishBlockers(
  status: ContentStatus,
  unresolvedNoteCount: number,
): PublishBlocker[] {
  /*
    ★ 타입만으로는 부족하다. 타입 검사를 거치지 않는 호출(테스트의 .mjs,
      JSON 에서 온 값)이 인자를 빠뜨리면 `undefined > 0` 이 false 가 되어
      조용히 통과한다. 세지 않은 것이 「0건」으로 읽히는 것을 막는다.
  */
  if (!Number.isInteger(unresolvedNoteCount) || unresolvedNoteCount < 0) {
    throw new TypeError(
      "publishBlockers: unresolvedNoteCount must be a non-negative integer. " +
        "세지 않은 상태로 발행을 판정하지 않는다.",
    );
  }

  const blockers: PublishBlocker[] = [];
  if (status.transcription !== "done") blockers.push("not_transcribed");
  if (unresolvedNoteCount > 0) blockers.push("unresolved_notes");
  if (status.publication === "published") blockers.push("already_published");
  return blockers;
}

export function canPublish(status: ContentStatus, unresolvedNoteCount: number): boolean {
  return publishBlockers(status, unresolvedNoteCount).length === 0;
}

/** 발행이 막혔다 */
export class PublishBlockedError extends Error {
  readonly blockers: PublishBlocker[];

  constructor(blockers: PublishBlocker[]) {
    super(`publish blocked: ${blockers.join(", ")}`);
    this.name = "PublishBlockedError";
    this.blockers = blockers;
  }
}

/**
 * 서버에서 발행 직전에 부른다.
 *
 * ── 왜 화면 판정으로 끝내지 않는가 ───────────────────────────────
 *
 * 화면이 버튼을 숨겨도 요청은 직접 만들어 보낼 수 있다. 발행은 교사·원장에게
 * 콘텐츠를 열어 주는 일이라 **쓰기 직전 서버에서 다시 판정**해야 한다.
 *
 * ★ 던진다. 조용히 `false` 를 돌려주면 호출한 쪽이 무시하고 쓰기로 넘어갈 수
 *   있다.
 *
 * ★ E단계에서 발행 Server Action 을 만들 때 **첫 줄에서 이 함수를 부른다.**
 *
 * ── 무엇을 넘겨야 하는가 ─────────────────────────────────────────
 *
 * 이 모듈은 DB 를 모른다. 그래서 호출하는 쪽이 값을 넘기는데, **그 값은
 * 서버가 신뢰할 수 있는 저장 데이터에서 직접 읽은 것이어야 한다.**
 *
 *   · 상태(`status`) — 요청 본문이 아니라 DB 의 주차 행에서 읽는다.
 *   · 미해결 건수 — DB 의 대조 주의 행을 `status = 'unresolved'` 로 **세어서**
 *     구한다. 화면이 보낸 숫자를 그대로 믿지 않는다.
 *
 * ★ 클라이언트가 보낸 값으로 판정하면 판정이 없는 것과 같다. 요청을 직접
 *   만들어 「미해결 0건」이라고 적어 보내면 통과한다.
 */
export function assertPublishable(
  status: ContentStatus,
  unresolvedNoteCount: number,
): void {
  const blockers = publishBlockers(status, unresolvedNoteCount);
  if (blockers.length > 0) throw new PublishBlockedError(blockers);
}

/**
 * 검수를 시작해도 되는가 (draft → in_review).
 *
 * 전사가 끝나야 대조할 원문이 있다.
 */
export function canStartReview(status: ContentStatus): boolean {
  return status.transcription === "done" && status.publication === "draft";
}
