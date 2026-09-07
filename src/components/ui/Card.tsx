import type { MouseEventHandler, ReactNode } from "react";

/**
 * 마케팅 화면의 카드.
 *
 *   basic       — 흰 면. 정보 카드의 기본.
 *   highlighted — 따뜻한 아이보리 + 노란 테두리. 눈길을 한 번 끌어야 할 때.
 *   premium     — 남색 면. 섹션 안에서 결론이나 상위 상품을 말할 때.
 *
 * ★ 모든 것을 카드로 만들지 않는다.
 *   흰 카드가 흰 배경 위에 계속 놓이면 경계가 사라지고 화면이 평평해진다.
 *   카드는 "묶여 있다"는 뜻이므로, 묶을 것이 없으면 쓰지 않는다.
 *
 * ★ 테두리는 토큰을 쓴다.
 *   navy/8 · /10 · /12 · /15 로 흩어져 있던 값을 border-line 하나로 모은다.
 *   같은 역할의 선은 같은 굵기여야 면이 정돈되어 보인다.
 */
type CardVariant = "basic" | "highlighted" | "premium";

const variantClasses: Record<CardVariant, string> = {
  basic: "border-line bg-white text-navy",
  highlighted: "border-yellow/25 bg-yellow-soft/50 text-navy",
  premium: "border-navy bg-navy text-white",
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
      className={`rounded-[var(--radius-card)] border p-6 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
