/** 교사 메뉴 (DEC-097): 오늘의 수업 · 수업 일정·이력 · 리포트. 계약 · 상품 메뉴 없음. */
export const TEACHER_NAV = [
  { href: "/teacher", label: "오늘의 수업" },
  { href: "/teacher/history", label: "수업 일정·이력" },
  { href: "/teacher/growth-reports", label: "리포트" },
] as const satisfies readonly { href: string; label: string }[];
