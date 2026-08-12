import type { ReactNode } from "react";

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
}

export function Card({ children, variant = "basic", className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
