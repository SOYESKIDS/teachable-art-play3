import type { MouseEventHandler, ReactNode } from "react";

/** 기획서 29번: Card A(기본) / B(강조) / C(프리미엄·CTA) 3종 체계 */
type CardVariant = "basic" | "highlighted" | "premium";

const variantClasses: Record<CardVariant, string> = {
  basic: "bg-white border border-navy/10 text-navy",
  highlighted: "bg-yellow/10 border border-yellow/20 text-navy",
  premium: "bg-navy border border-navy text-white",
};

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  /**
   * 카드 전체를 누를 수 있게 할 때만 넘긴다.
   *
   * ★ 이것만으로 접근 가능한 버튼이 되지는 않는다.
   *   여기에는 role 도 tabIndex 도 붙이지 않는다. 카드를 초점 대상으로
   *   만들면 안쪽 버튼과 함께 탭 정지점이 두 개가 되기 때문이다.
   *   누르는 동작의 접근성은 카드 안에 있는 진짜 <button> 이 책임진다.
   */
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Card({
  children,
  variant = "basic",
  className = "",
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
