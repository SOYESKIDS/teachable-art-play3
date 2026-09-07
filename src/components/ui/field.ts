/**
 * 입력 요소의 공통 모양.
 *
 * ★ 왜 한곳으로 모았는가
 *   같은 역할의 입력칸이 19개 파일에 각각 적혀 있었고, 조금씩 달랐다.
 *   어떤 칸에는 placeholder 색이 있고 어떤 칸에는 없었으며,
 *   비활성 상태는 opacity-60 · opacity-70 · bg-surface-soft 세 갈래였다.
 *   한 화면 안에서 입력칸끼리 미묘하게 다르면 완성도가 먼저 떨어져 보인다.
 *
 * ★ 40px 였던 것을 44px 로 올렸다.
 *   목록 위 필터에 쓰이던 h-10(40px)은 손가락 타깃 최소치(44px)에 못 미쳤다.
 *   모바일에서 원장·교사가 실제로 누르는 칸이라 높이를 맞춘다.
 *
 * ★ 사용하는 쪽의 이름은 바꾸지 않았다.
 *   각 파일은 지금까지 쓰던 inputClasses / controlClasses / fieldClasses 라는
 *   이름을 그대로 두고 값만 여기서 받아 간다. 그래서 사용처(수백 곳의
 *   className={inputClasses})는 한 글자도 건드리지 않는다.
 */

/** 대화상자 안의 한 줄 입력칸 (44px) */
export const fieldInput =
  "h-11 rounded-lg border border-line-strong bg-white px-3 text-[14px] text-navy placeholder:text-navy/40 transition-colors focus:border-trust-blue focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70";

/** 목록 위 필터·선택 (44px) — 예전 h-10 을 대체한다 */
export const fieldControl =
  "h-11 rounded-lg border border-line-strong bg-white px-3 text-[13px] font-medium text-navy placeholder:text-navy/40 transition-colors focus:border-trust-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-70";

/** 로그인·비밀번호 등 인증 화면의 입력칸 (48px) */
export const fieldAuth =
  "min-h-12 w-full rounded-[var(--radius-lg)] border border-line-strong bg-white px-4 py-3 text-[15px] text-navy placeholder:text-navy/40 transition-colors focus:border-trust-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** 여러 줄 입력칸. 높이는 쓰는 곳에서 min-h 로 덮어쓴다. */
export const fieldTextarea =
  "min-h-[110px] rounded-lg border border-line-strong bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy placeholder:text-navy/40 transition-colors focus:border-trust-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-70";

/** 입력칸 위의 라벨 */
export const fieldLabel = "block text-[13px] font-semibold text-navy/70";
