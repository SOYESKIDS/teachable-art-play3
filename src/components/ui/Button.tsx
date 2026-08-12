import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-yellow text-navy hover:bg-yellow/90 border border-transparent shadow-[var(--shadow-cta)]",
  secondary:
    "bg-navy text-white hover:bg-navy-deep border border-transparent",
  tertiary:
    "bg-transparent text-navy border border-navy/25 hover:border-navy/40 hover:bg-navy/[0.04]",
};

/** 크기(padding/font-size)는 base에 두지 않고 항상 사용처 className에서 지정한다 (유틸리티 클래스 충돌 방지) */
const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full min-h-12 transition-[color,background-color,border-color,box-shadow,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
