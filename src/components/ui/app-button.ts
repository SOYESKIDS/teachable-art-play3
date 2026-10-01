import { variants } from "./cx";

/**
 * 운영 화면(teacher · director · HQ) 버튼 (DEC-109 · DEC-110).
 *
 *   primary   Navy 면 — 화면에서 가장 중요한 한 가지 행동. 한 화면에 하나.
 *   secondary 흰 면 + 대비 3:1 테두리 — 나란히 놓이는 일반 행동.
 *   ghost     면 없음 — 덜 중요한 행동 · 툴바.
 *   danger    되돌릴 수 없는 행동을 "확정"하는 마지막 버튼 (Coral 이 아니라 danger 토큰).
 *   danger-outline 위험한 흐름의 "입구".
 *
 * 상태: hover 는 면을 한 단계 진하게 · active 는 한 단계 더 + 1px 눌림 ·
 * focus 는 globals.css 의 2px 링 · disabled 는 흐리게 + not-allowed (문구로도 알린다).
 * 높이 44px(일반) · 56px(Class Mode) 은 WCAG 2.5.8 터치 목표를 넉넉히 넘는다.
 */
export const appButton = variants({
  base: "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  variants: {
    tone: {
      primary:
        "bg-primary text-on-primary shadow-[var(--shadow-soft)] hover:bg-primary-hover active:bg-primary-active",
      secondary:
        "border border-control-border bg-white text-ink hover:border-ink-muted hover:bg-bg active:bg-surface-soft",
      ghost: "text-ink-muted hover:bg-primary-soft hover:text-ink active:bg-primary-soft",
      danger: "bg-danger text-white hover:bg-danger-hover",
      "danger-outline":
        "border border-danger/45 bg-white text-danger hover:border-danger hover:bg-danger-soft",
    },
    size: {
      sm: "min-h-9 px-3 text-label",
      md: "min-h-11 px-4 text-label",
      lg: "min-h-12 px-5 text-body-sm",
      class: "min-h-14 rounded-xl px-6 text-title-sm font-bold",
    },
  },
  defaults: { tone: "primary", size: "md" },
});

export const appButtonPrimary = appButton({ tone: "primary" });
export const appButtonSecondary = appButton({ tone: "secondary" });
export const appButtonGhost = appButton({ tone: "ghost" });
export const appButtonDanger = appButton({ tone: "danger" });
export const appButtonDangerOutline = appButton({ tone: "danger-outline" });

/** Class Mode 전용 큰 버튼 (56px · 교실 태블릿에서 멀리서도 누른다) */
export const classModeButtonPrimary = appButton({ tone: "primary", size: "class" });
export const classModeButtonSecondary = appButton({
  tone: "secondary",
  size: "class",
  className: "font-semibold",
});

/**
 * 알림 박스 — 색 + 왼쪽 굵은 선 + 문구. 색만으로 의미를 전하지 않는다.
 * role 은 쓰는 곳에서 정한다 (status · alert · note).
 */
const noticeBase =
  "rounded-lg border border-l-4 px-3.5 py-2.5 text-label leading-relaxed";
export const noticeInfo = `${noticeBase} border-info-border border-l-info bg-info-soft text-info-text`;
export const noticeSuccess = `${noticeBase} border-success-border border-l-success bg-success-soft text-success-text`;
export const noticeWarning = `${noticeBase} border-warning-border border-l-warning bg-warning-soft text-warning-text`;
export const noticeDanger = `${noticeBase} border-danger-border border-l-danger bg-danger-soft text-danger`;
