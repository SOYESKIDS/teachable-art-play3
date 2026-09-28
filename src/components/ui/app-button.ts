/**
 * 운영 화면(teacher · director · HQ) 버튼 클래스 (DEC-109 · DEC-110).
 *
 * · Primary 는 화면당 하나를 원칙으로 한다 (Navy).
 * · Danger 는 Coral 이 아니라 별도 danger 토큰을 쓴다.
 * · 일반 44px · Class Mode 56px 터치 목표.
 * · 로딩 · 비활성은 disabled 로 표현하고 문구로 상태를 알린다.
 */

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export const appButtonPrimary = `${base} bg-brand-navy text-white hover:bg-navy-deep`;

export const appButtonSecondary = `${base} border border-control-border bg-white text-ink hover:bg-brand-ivory`;

export const appButtonGhost = `${base} text-ink-muted hover:bg-brand-ivory hover:text-ink`;

export const appButtonDanger = `${base} bg-danger text-white hover:bg-[#8f1c13]`;

export const appButtonDangerOutline = `${base} border border-danger/40 bg-white text-danger hover:bg-danger-soft`;

/** Class Mode 전용 큰 버튼 (56px) */
export const classModeButtonPrimary =
  "inline-flex min-h-14 items-center justify-center rounded-xl bg-brand-navy px-6 text-[18px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60";

export const classModeButtonSecondary =
  "inline-flex min-h-14 items-center justify-center rounded-xl border border-control-border bg-white px-5 text-[17px] font-semibold text-ink transition-colors hover:bg-brand-ivory disabled:cursor-not-allowed disabled:opacity-60";

/** 알림 박스 */
export const noticeInfo = "rounded-lg border border-brand-sky bg-brand-sky px-3 py-2 text-[14px] leading-relaxed text-info-text";
export const noticeSuccess = "rounded-lg border border-brand-mint bg-brand-mint px-3 py-2 text-[14px] leading-relaxed text-success-text";
export const noticeWarning = "rounded-lg border border-warning-soft bg-warning-soft px-3 py-2 text-[14px] leading-relaxed text-warning-text";
export const noticeDanger = "rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[14px] leading-relaxed text-danger";
