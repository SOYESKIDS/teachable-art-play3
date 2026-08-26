/** 교사 화면 상단 메뉴. 화면이 둘뿐이라 모바일에서도 한 줄에 들어간다. */
export const TEACHER_NAV = [
  { href: "/teacher", label: "오늘의 수업" },
  { href: "/teacher/history", label: "수업 이력" },
] as const satisfies readonly { href: string; label: string }[];
