# class_mode 출시 체크리스트

> **DRAFT — HUMAN APPROVAL REQUIRED**
> 이 문서는 초안이다. 승인되지 않았다. 체크 표시는 "증거 위치"일 뿐 출시 승인이 아니다.
> 출시(플래그 전환)는 `public.set_capability_release('class_mode', true, <사유>, <updated_at>)` 로만 한다 (PHASE 10C) — Staging rehearsal → Production 순서 · 사람이 이 목록을 확인한 뒤.

| | |
|---|---|
| 대상 | `platform_capabilities.class_mode` (현재 `is_released = false` · blocker 없음) |
| 근거 | DEC-063 (약속한 기능 전체 Ready 여야 활성화) · [class-mode-readiness.md](./class-mode-readiness.md) |
| 출시의 효과 | 계약 Readiness 의 `feature:class_mode` 항목만 충족 — 런타임 쓰기 권한(`class_write_allowed`)은 바뀌지 않는다 (pgTAP R13) |
| 승인자 | (미정 — 사람 결정) |
| 승인일 | (미승인) |

## 1. 수업 흐름

| # | 항목 | 수락 기준 | 증거 (현재) | 상태 |
|---|---|---|---|---|
| 1 | BEFORE 확인 | 시작 전 필수 확인이 없으면 시작 거부 | 전환 trigger (`20261001092000` · SS 계열) · local role E2E teacher | 증거 있음 · 사람 확인 필요 |
| 2 | scheduled → in_progress | 담당 교사 · 예정 상태 · BEFORE 확인 · `class_write_allowed(…,'class_mode')` ∧ `class_week_entitled` (SS005) · 필수 콘텐츠 세트 (SS008) | `20261002092000` · p0_phase08_security WS8 | 증거 있음 |
| 3 | 수업 마치기 (complete) | 진행 중 → 완료 · 전환 RPC 로만 | 전환 RPC · local role E2E | 증거 있음 |
| 4 | 복구 · 취소 | 진행 중 정리는 entitlement 로 막지 않음 · 사유 · audit | `session.recovery_completed` 등 audit · p0_hardening | 증거 있음 · 사람 확인 필요 |
| 5 | Growth5 | 5개 지표 · stage 텍스트(함께 · 보고 나서 · 스스로) · 선택 안 함 = 기록 없음 · 점수 · 순위 · 진단 아님 · AI 가 고르지 않음 | GM005 · EN003 gate · DEC-065 | 증거 있음 |
| 6 | 빠른 메모 | 저장 · 수정 동시성 (QM005) · 읽기 전용 시 거부 (QM004) | p0_phase08_security WS5 | 증거 있음 |

## 2. 권한 · 계약

| # | 항목 | 수락 기준 | 증거 (현재) | 상태 |
|---|---|---|---|---|
| 7 | 반 entitlement | 계약 범위 반만 쓰기 (`class_write_allowed`) | M3_post_cutover · p0_hardening | 증거 있음 |
| 8 | 주차 entitlement | 상품 버전 week 범위 밖 차시 시작 거부 (`class_week_entitled` · SS005) | M3_post_cutover | 증거 있음 |
| 9 | G-1 요구 | 수업 일정 계약 범위 gate(EN002) · legacy 공유 쓰기 표면 gate 는 **G-1 에서만** — Production G-1 적용이 출시 전제인지 결정 | Staging G-1 미적용 (P09F-AUTH-1) | **결정 필요 (JUDGEMENT: 전제)** |
| 10 | M5 legacy 쓰기 회수 | legacy 직접 쓰기 경로가 남지 않을 것 | PHASE 10B 앱 7/7 · M5 DB 미적용 | **결정 필요 (JUDGEMENT: M5 후 출시)** |
| 11 | 정지 후 재개 | 재개 = 활성화와 같은 Readiness (PHASE 10C · CT005) | p0_phase10c_release_controls C14~C21 | 증거 있음 (local) · Staging 미적용 |

## 3. 검증 · 운영

| # | 항목 | 수락 기준 | 증거 (현재) | 상태 |
|---|---|---|---|---|
| 12 | Teacher E2E | 시작 → 관찰 · Growth5 · 메모 → 마치기 · 오류 0 | local role E2E teacher (48 PASS · PHASE 10C) · 직원 UAT (saas-v2) | 증거 있음 · Production 전 재확인 |
| 13 | Director 가시성 | 원장이 수업 상태 · 관찰을 읽기 전용으로 확인 | local role E2E director · PHASE 10B 읽기 전용 보드 | 증거 있음 |
| 14 | rollback / recovery 증거 | 출시 되돌리기 = `set_capability_release('class_mode', false, <사유>, …)` · audit 확인 · 진행 중 수업 복구 절차 | pgTAP R12 (release → unrelease audit) · 복구 RPC | 증거 있음 (local) · 운영 절차 문서 필요 |
| 15 | audit | 출시 · 미출시 = `capability.changed` · reason · actor · released_from/to | pgTAP R10 · R11 | 증거 있음 (local) |

## 4. 승인 전 남은 것

- G-1 · M5 를 출시 전제로 할지 사람 결정 (9 · 10)
- PHASE 10C migration Staging 적용 (별도 승인) → Staging 에서 출시 · 미출시 rehearsal
- 운영 rollback 절차 문서 (14)
- **이 체크리스트 승인 없음 — 출시하지 않는다.**
