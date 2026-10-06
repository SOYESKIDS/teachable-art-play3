/**
 * 출시 잠금 (PHASE UAT-STABILIZATION).
 *
 * ★ 학부모 공유(Child Portal 링크 발급)는 출시 승인 전이다 (CO-12 · parent_portal 미출시).
 *   직원 UAT 를 포함해 어디서도 새 공유 링크를 만들지 않는다. 화면(버튼 비활성)과
 *   서버 행동(issueChildPortalAction)이 같은 상수를 본다.
 *   기존 데이터 · 기존 링크 중지(revoke) · 사진 동의 기록은 그대로 둔다.
 *
 * ★ 환경(Staging/Production) 분기가 아니다 — 출시 결정 전까지 모든 환경에서 잠근다.
 *   출시 시: 이 값을 platform_capabilities(parent_portal) 판정으로 바꾼다
 *   (docs/11-production-readiness/parent-sharing-release-todo.md).
 */
export const PARENT_SHARING_RELEASED = false;

export const PARENT_SHARING_LOCK_MESSAGE =
  "학부모 공유 기능은 현재 준비 중입니다. 공유 동의 및 보안 정책 확정 후 제공됩니다.";
