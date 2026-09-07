import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

/**
 * 버튼 위계 3단계.
 *
 *   primary   — 노랑. 이 사이트가 방문자에게 바라는 단 하나의 행동(도입 상담).
 *   secondary — 남색. 화면 안의 주요 기능.
 *   tertiary  — 흰 배경 + 테두리. 보조 동작(상세 보기 · 뒤로 · 로그인 입구).
 *
 * ★ 셋을 섞지 않는다.
 *   한 화면에 노랑이 둘이면 어느 쪽을 눌러야 하는지 되묻게 된다.
 *
 * ★ 그림자로 고급스러움을 만들지 않는다.
 *   예전 primary 는 노란 글로우(--shadow-cta)를 항상 달고 있어 버튼이
 *   화면에서 떠 보였다. 평소에는 그림자를 두지 않고, 커서를 올렸을 때만
 *   아주 옅게 띄운다 — 눌리는 것이라는 신호는 그 정도면 충분하다.
 *
 * ★ 크기는 사용처가 정한다.
 *   padding/font-size 를 base 에 두면 사용처의 유틸리티 클래스와 충돌해
 *   어느 쪽이 이길지 순서에 달리게 된다. 높이 하한(48px)만 여기서 보장한다.
 */
type Variant = "primary" | "secondary" | "tertiary";

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-transparent bg-yellow text-navy hover:bg-yellow/90 hover:shadow-[var(--shadow-card)]",
  secondary:
    "border border-transparent bg-navy text-white hover:bg-navy-deep",
  tertiary:
    "border border-line-strong bg-transparent text-navy hover:border-navy/40 hover:bg-navy/[0.04]",
};

const baseClasses =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";

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
