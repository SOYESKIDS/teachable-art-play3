/**
 * 입력 요소의 공통 모양.
 *
 * ★ 왜 한곳으로 모았는가
 *   같은 역할의 입력칸이 19개 파일에 각각 적혀 있었고, 조금씩 달랐다.
 *   각 파일은 inputClasses / controlClasses / fieldClasses 라는 이름을 그대로 두고
 *   값만 여기서 받아 간다.
 *
 * ★ V3: 테두리를 control-border(흰 바탕 3.08:1)로 바꿨다.
 *   예전 navy 20% 선은 1.9:1 로, 입력칸의 경계가 보여야 한다는 WCAG 1.4.11(3:1)에 못 미쳤다.
 *   hover 는 한 단계 진하게, focus 는 파란 테두리 + 옅은 링(+ 전역 focus-visible 링),
 *   오류(aria-invalid)는 danger 테두리로 — 상태마다 모양이 다르다.
 *
 * ★ 높이: 대화상자 · 필터 44px · 인증 화면 48px. 글자는 15px 로 올려
 *   모바일 Safari 의 입력 확대를 줄이고 한글 받침이 흐려지지 않게 한다.
 */
const state =
  "transition-[border-color,box-shadow,background-color] duration-150 hover:border-ink-muted focus:border-trust-blue focus:ring-4 focus:ring-trust-blue/12 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/12 disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-muted disabled:text-ink-muted";

/** 대화상자 안의 한 줄 입력칸 (44px) */
export const fieldInput = `h-11 rounded-lg border border-control-border bg-white px-3 text-body-sm text-navy placeholder:text-ink-subtle ${state}`;

/** 목록 위 필터·선택 (44px) */
export const fieldControl = `h-11 rounded-lg border border-control-border bg-white px-3 text-label font-medium text-navy placeholder:text-ink-subtle ${state}`;

/** 로그인·비밀번호 등 인증 화면의 입력칸 (48px) */
export const fieldAuth = `min-h-12 w-full rounded-lg border border-control-border bg-white px-4 py-3 text-body-sm text-navy placeholder:text-ink-subtle ${state}`;

/** 여러 줄 입력칸. 높이는 쓰는 곳에서 min-h 로 덮어쓴다. */
export const fieldTextarea = `min-h-[110px] rounded-lg border border-control-border bg-white px-3 py-2.5 text-body-sm leading-relaxed text-navy placeholder:text-ink-subtle ${state}`;

/** 입력칸 위의 라벨 */
export const fieldLabel = "block text-label font-semibold text-ink";

/** 입력칸 아래 도움말 · 오류 */
export const fieldHint = "mt-1.5 text-caption text-ink-muted";
export const fieldError = "mt-1.5 text-caption font-medium text-danger";
