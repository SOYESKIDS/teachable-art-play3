# Parent Sharing — Release TODO (잠금 해제 전 필수)

> 상태: **RELEASE-LOCKED** (2026-10-06 · PHASE UAT-STABILIZATION) · 관련: CO-12 · CO-9 · CO-10 · DB-9 · DEC-092 · DEC-059 · DEC-060
> 잠금 위치: `src/lib/staff/release-locks.ts` `PARENT_SHARING_RELEASED = false`
> 화면 `/director/portal` = 준비 중 안내 + "링크 만들기 / 새 링크 발급" 비활성 · 서버 `issueChildPortalAction` = RPC 전에 거절
> 그대로 둔 것: 기존 DB 구조 · 기존 발급 기록 · 기존 링크 **중지(revoke)** · 사진 공유 동의 운영 기록

## 잠금을 풀기 전에 끝낼 것

| # | 항목 | 내용 | 현재 |
|---|---|---|---|
| 1 | record consent | 학부모에게 교사 기록을 공유하는 것에 대한 동의 항목 · 기록 방식 | 미정 |
| 2 | photo consent | 사진 공유 동의(법정대리인) · 동의 범위 · 철회 (CO-9 · CO-10) | 운영 상태 기록만 · 법적 동의 아님 (DEC-059) |
| 3 | AI consent | AI 정리 보조로 만든 문장이 학부모 화면에 실릴 때의 고지 · 동의 | AI 미출시 (AR-8) |
| 4 | expiry | 링크 만료 정책 — 법적 고지의 "30일 만료"와 새 포털(만료 없음) 불일치 해소 (SC-11 · J-6) | **충돌** |
| 5 | revoke / reissue | 중지 · 재발급 시 기존 토큰 즉시 무효 · 학부모 안내 문구 | 동작함 · 문구 검토 필요 |
| 6 | token hashing | 원본 토큰은 발급 응답 1회 · DB 는 sha256 hash 만 (현재 구현) — 해시 알고리즘 · 길이 재검토 | 구현됨 · 검토 필요 |
| 7 | signed image URL | 사진을 싣는다면 private bucket + 짧은 signed URL · 발급 주체 (DB-9) | 사진 미노출 |
| 8 | view audit log | 학부모 열람 기록(시각 · 포털 id) 보존 범위 · 보관 기간 | 없음 |
| 9 | rate limiting | `/api/share/portal/resolve` 조회 · 토큰 추측 방지 rate limit | 없음 |
| 10 | DB 쪽 잠금 | 현재 잠금은 앱 서버 행동 기준. `issue_child_portal` RPC 를 PostgREST 로 직접 부르는 경로는 DB 가드(capability 확인)가 있어야 완전히 닫힌다 | **미적용 (migration 승인 필요)** |

## 잠금 해제 순서 (제안)
1. 위 1~10 결정 · 구현 · pgTAP
2. `PARENT_SHARING_RELEASED` 상수 → `platform_capabilities.parent_portal.is_released` 판정으로 교체
3. HQ 출시 화면(capability release)에서 사유와 함께 출시 → Staging 역할 smoke → Production 승인
