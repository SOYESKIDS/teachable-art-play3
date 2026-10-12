/**
 * 홈 섹션 앵커("#solution")를 어느 페이지에서나 동작하는 경로("/#solution")로 바꾼다.
 * Header(client) 와 Footer(server) 가 함께 쓰므로 "use client" 파일 밖에 둔다.
 */
export function toHomeAnchor(href: string): string {
  return href.startsWith("#") ? `/${href}` : href;
}
