import type { ReactNode } from "react";

/**
 * 마케팅 화면의 가로 폭.
 *
 * ★ 폭을 여기 한 곳에서만 정한다.
 *   지금까지 화면마다 max-w-[1320px] · [1200px] · [1100px] · [960px] 이
 *   따로 적혀 있었다. 마케팅 폭은 토큰(--container-marketing)이 정하고,
 *   운영 화면은 그쪽 셸이 따로 정한다 — 두 종류의 화면은 실제로
 *   다른 폭을 써야 하기 때문이다.
 *
 * ★ 1280px 인 이유
 *   1320px 는 넓은 모니터에서 한 줄이 길어져 시선이 좌우로 흔들린다.
 *   1280px 에서 좌우 여백(lg:px-10)을 빼면 본문 폭이 1200px 안팎이 되고,
 *   12칸 그리드가 100px 단위로 떨어져 배치가 정돈된다.
 */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[var(--container-marketing)] px-5 sm:px-8 lg:px-10 ${className}`}
    >
      {children}
    </div>
  );
}
