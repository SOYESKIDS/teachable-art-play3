/** 원장 화면 상단 메뉴. 이번 단계에서는 수업 운영에 필요한 최소 구성만 둔다. */
export const DIRECTOR_NAV = [
  { href: "/director", label: "홈" },
  { href: "/director/sessions", label: "수업 운영" },
  { href: "/director/sessions/history", label: "수업 이력" },
  { href: "/director/growth-reports", label: "성장 리포트" },
] as const satisfies readonly { href: string; label: string }[];
