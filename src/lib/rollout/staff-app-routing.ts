/**
 * ★ TEMPORARY ROLLOUT SWITCH — 교사 · 원장 기본 화면 계열 선택 (G-2 · cutover-runbook Step J)
 *
 * SOYE_SAAS_V2_APP_CUTOVER="true" 일 때만 SaaS 2.0 교사 · 원장 화면(Class Mode · Observation 2.0 ·
 * Weekly · 원장 계약 기능 메뉴)이 기본 경로가 된다. 설정하지 않았거나 다른 값이면 legacy 운영 화면
 * (PHASE 07 이전 production 과 같은 흐름)이 기본이다. Production 기본값 = legacy.
 *
 * 이 값은 "어떤 화면 계열을 기본으로 보여 줄지"만 정한다.
 *   · 권한 · entitlement 판정과 무관하다. class_has_feature · class_write_allowed · 계약 Readiness ·
 *     AI capability · parent_portal capability 를 바꾸지 않고, 어떤 DB 판정도 우회하지 않는다.
 *   · 서버에서만 읽는다 (NEXT_PUBLIC 아님 · client 에는 판단 결과만 props 로 전달).
 *   · 기관별 bypass 가 아니다 (배포 전체에 하나).
 *
 * 제거 시점: 정책 blocker 해소 → 상품 버전 발행 → 계약 mapping → G-1 preflight → Step J(전환) →
 * G-1 cutover 가 끝나면 legacy 화면 계열과 함께 이 파일을 지운다 (cutover-runbook.md §10).
 */

export type StaffAppRouting = "legacy" | "saas_v2";

export function staffAppRouting(): StaffAppRouting {
  return process.env.SOYE_SAAS_V2_APP_CUTOVER === "true" ? "saas_v2" : "legacy";
}
