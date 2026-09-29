# weekly_report 출시 체크리스트

> **DRAFT — HUMAN APPROVAL REQUIRED**
> 이 문서는 초안이다. 승인되지 않았다. 체크 표시는 "증거 위치"일 뿐 출시 승인이 아니다.
> 출시(플래그 전환)는 `public.set_capability_release('weekly_report', true, <사유>, <updated_at>)` 로만 한다 (PHASE 10C) — Staging rehearsal → Production 순서 · 사람이 이 목록을 확인한 뒤.

| | |
|---|---|
| 대상 | `platform_capabilities.weekly_report` (현재 `is_released = false` · blocker 없음) |
| 근거 | DEC-063 · DEC-066 (AI 없음) · DEC-069 (8주 모아보기) · DEC-074 (교사 완료 = 게시 가능) · [weekly-report-readiness.md](./weekly-report-readiness.md) |
| 출시의 효과 | 계약 Readiness 의 `feature:weekly_report` 항목만 충족 — 런타임 쓰기 권한은 바뀌지 않는다 (pgTAP R13) |
| 승인자 | (미정 — 사람 결정) |
| 승인일 | (미승인) |

## 1. 작성 · 완료

| # | 항목 | 수락 기준 | 증거 (현재) | 상태 |
|---|---|---|---|---|
| 1 | 결정적 weekly 초안 | `create_weekly_report_draft` = 차시 제목 · s13 · 교사 메모로 구성 · 같은 입력 = 같은 초안 | `20261001120000_m4_report_portal_rpcs.sql` · p0_hardening | 증거 있음 |
| 2 | AI 없음 | weekly 경로에 AI 호출 · AI 컬럼 없음 | `weekly-report-actions.ts` · PHASE 08 app gates (앱 코드의 AI provider 호출 0) | 증거 있음 |
| 3 | 교사 명시적 완료 | `complete_report_revision` 만 · 완료 조건(완료 관찰 ≥1 · 주제 · 교사 관찰 · 가정 대화 · RP006) | p0_hardening · local role E2E (Weekly 완료) | 증거 있음 |
| 4 | 완료 revision 불변 | 완료 후 수정 불가 | p0_hardening | 증거 있음 |
| 5 | 정정 흐름 | `start_report_correction` · 2번째 revision 부터 정정 사유 필수 | p0_hardening | 증거 있음 |
| 6 | Growth5 텍스트만 | 지표 이름 · stage 텍스트 · 숫자 변환 없음 (DEC-065) | schema · portal DTO | 증거 있음 |
| 7 | 점수 · 순위 · 진단 없음 | 화면 · DTO · 문구에 점수 · 순위 · 진단 표현 없음 | 사람 검토 필요 | **사람 확인 필요** |

## 2. 원장 · 학부모

| # | 항목 | 수락 기준 | 증거 (현재) | 상태 |
|---|---|---|---|---|
| 8 | 원장 숨김 · 다시 공개 | 사유 · audit · 자동 재공개 없음 (DEC-074) | p0_hardening (숨김 audit) | 증거 있음 |
| 9 | 학부모 DTO | stage · 사진 없음 · 지표 이름만 | portal DTO · production_shaped | 증거 있음 |
| 10 | CO-12 의존 | `parent_portal` 이 CO-12 blocker 로 막혀 있음 → weekly 만 출시해도 STARTER 는 활성화되지 않는다 · 학부모 노출은 portal 출시 후 | `parent_portal.blocked_by = {CO-12}` (PHASE 10C 에서도 그대로) | **OPEN (CO-12)** |
| 11 | 8주 모아보기 수락 테스트 | STARTER 약속 "8주 기록 모아보기"(DEC-069) 수락 기준 + 테스트 | `src/lib/staff/program-summary-queries.ts` · 수락 테스트 없음 | **PENDING** |

## 3. 의존 · 운영

| # | 항목 | 수락 기준 | 증거 (현재) | 상태 |
|---|---|---|---|---|
| 12 | G-1 · M5 의존 | weekly 쓰기 gate 는 G-1 전에도 SaaS 2.0 RPC 에 있음 (RP007) · legacy 성장 리포트 쓰기 회수는 M5 | PHASE 10B (앱 legacy 쓰기 제거) · M5 DB 미적용 | **결정 필요** |
| 13 | 정지 후 재개 | 재개 = 활성화와 같은 Readiness (PHASE 10C · CT005) | p0_phase10c_release_controls | 증거 있음 (local) · Staging 미적용 |
| 14 | rollback · audit | `set_capability_release('weekly_report', false, …)` · `capability.changed` reason · actor | pgTAP R10~R12 | 증거 있음 (local) |

## 4. 승인 전 남은 것

- CO-12 결정 (portal 만료 · 재발급 · 사후 보존 · 법적 문구) — 학부모 노출 전제
- 8주 모아보기 수락 기준 · 테스트 (11)
- 점수 · 순위 · 진단 표현 사람 검토 (7)
- PHASE 10C migration Staging 적용 (별도 승인) → Staging rehearsal
- **이 체크리스트 승인 없음 — 출시하지 않는다.**
