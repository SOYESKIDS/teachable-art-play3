import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { variants } from "./cx";

/**
 * 마케팅 · 공개 화면 버튼 (V3 "Warm Atelier").
 *
 *   primary   Navy 면. 이 사이트가 방문자에게 바라는 단 하나의 행동(도입 상담).
 *   secondary Navy 테두리 · 흰 면. 두 번째 무게의 행동 (V4: primary 와 같은 navy 면을 쓰지 않는다).
 *   tertiary  투명 + 테두리. 보조 동작(상세 보기 · 로그인 입구).
 *   inverse   흰 면. 어두운(Navy) 섹션 위의 주 행동.
 *   inverse-outline 흰 테두리. 어두운 섹션 위의 보조 동작.
 *
 * ★ V2 의 노란 버튼을 Navy 로 바꿨다 (DEC-109 · Yellow 제외).
 *   강조는 색의 소란함이 아니라 무게(면 · 그림자 한 겹)로 만든다.
 *
 * ★ 크기는 size 로 고른다 — md 48px(기본) · lg 56px(Hero · 최종 CTA).
 *   여백 · 폭 같은 배치 클래스만 className 으로 덧붙인다.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "inverse"
  | "inverse-outline";

export type ButtonSize = "md" | "lg";

export const buttonClasses = variants({
  base: "group/button inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55",
  variants: {
    variant: {
      primary:
        "border border-transparent bg-navy text-white shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-primary-hover hover:shadow-[var(--shadow-cta)] active:bg-primary-active",
      secondary:
        "border border-navy bg-white text-navy hover:bg-primary-soft active:bg-primary-soft",
      tertiary:
        "border border-line-strong bg-white/60 text-navy hover:border-navy/45 hover:bg-white",
      inverse:
        "border border-transparent bg-white text-navy shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-ivory",
      "inverse-outline":
        "border border-white/35 bg-transparent text-white hover:border-white/70 hover:bg-white/10",
    },
    size: {
      md: "min-h-12 px-6 text-body-sm",
      lg: "min-h-14 px-8 text-body-lg",
    },
  },
  defaults: { variant: "primary", size: "md" },
});

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, size, className })} {...props} />
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props} />
  );
}
