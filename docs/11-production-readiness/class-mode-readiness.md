# class_mode Release Readiness (PHASE 10A · 읽기 전용)

> **Updated PHASE 10C (local 만 · Staging 미적용)** — 아래 "출시 경로의 결함" 은 `phase-10c-release-controls` 브랜치에서 local 로 닫았다:
> audited `set_capability_release` RPC (HQ Admin · 사유 · 동시성 · actor) · blocker 있는 출시를 DB trigger 가 모든 경로에서 거부 · authenticated 의 `is_released` 직접 UPDATE 권한 회수 · `capability.changed` audit 에 reason · actor · from/to · `suspended → active` = 활성화와 같은 Readiness (CT005).
> "없는 테스트" 도 `supabase/tests/p0_phase10c_release_controls.test.sql` (47) 로 채웠다. **class_mode 는 출시하지 않았다** (`is_released = false`).
> 출시 기준: [class-mode-release-checklist.md](./class-mode-release-checklist.md) — **DRAFT — HUMAN APPROVAL REQUIRED**. 상세: [phase-10c-release-controls.md](./phase-10c-release-controls.md).
> 남은 것: Staging migration 적용 승인 · 체크리스트 승인 · G-1 / M5 전제 결정 · 실제 출시는 사람이.

## 왜 OPEN 인가 (정확히)

`platform_capabilities.class_mode.is_released` 가 seed 값 `false` 그대로다 (`supabase/migrations/20261001100000_m2_fact_backfill_reference_seed.sql:133` · 이후 migration 변경 없음).
그래서 계약 Readiness(`private.contract_readiness_internal` · `20261001111000_m3_commerce_contract_readiness.sql:173-192`)가 `feature:class_mode = not_released` 를 반환하고,
**draft → active 활성화는 CT005 로 거부된다** (`:359-369`). 그리고 **"무엇이 충족되면 class_mode 를 출시하는가"에 대한 기준 · 체크리스트 문서가 없다** (DEC-063 은 원칙만 · `docs/03-commerce/open-items.md:130` 에 "Service Ready 계산 방식" 이 PHASE 05 항목으로 남음).

`is_released` 는 **활성화 판정 입력일 뿐** 쓰기 · 화면을 막지 않는다: `class_write_allowed` = 계약 기능 ∧ 반 active ∧ 서비스 모드 active (`20261001091000_m1…:859-876`) — 출시 플래그 없음. Staging 교사 흐름이 동작하는 이유다.

## end-to-end 현황 (증거)

| 영역 | 상태 |
|---|---|
| schema | `session_before_confirmations` · `class_session_transitions` · `quick_memos` · `growth_metrics` · `observation_growth_selections` · `child_media_consents` (`20261001092000_m1_class_operation_foundation.sql`) |
| 수업 시작 | 전환 trigger: scheduled · 담당 교사 · BEFORE 확인 · `class_write_allowed(…,'class_mode')` ∧ `class_week_entitled` (SS005) · 필수 콘텐츠 세트 (SS008 · `20261002092000`) |
| 수업 마치기 · 복구 · 취소 | entitlement 판정 없음 (진행 중 정리는 막지 않는 원칙) |
| 관찰 · Growth5 · 메모 | `save_class_observation` OB007 · Growth5 gate EN003 · 메모 gate (`20261002093000`) |
| 수업 일정 생성 | HQ 가 직접 INSERT · 계약 범위 gate(EN002)는 **G-1 에서만** (Staging 미적용) |
| legacy 쓰기 | G-1 에서 판정 · M5 에서 회수 |
| 앱 | 화면은 `classModeWrite` 로만 보이고 숨긴다 · **출시 플래그를 보지 않는다** |
| 테스트 | p0_hardening · p0_security_baseline · p0_phase08_security · M3/M5 post-cutover · production_shaped · local role E2E |
| 없는 테스트 | 출시 전후 readiness(`not_released` → ok) · Sales · 원장의 출시 플래그 UPDATE 거부 · 출시 변경 audit · 출시가 `class_write_allowed` 를 바꾸지 않음 · `suspended → active` 재확인 |

## 출시 경로의 결함 (코드 확인)

- HQ Admin 이 `/admin/products` 에서 "출시" 를 누르면 `platform_capabilities.update({is_released})` 를 **직접** 실행 (`src/app/admin/(dashboard)/products/actions.ts`) — 확인 대화상자 1개 · 체크리스트 · 사유 없음
- DB 는 `grant update (is_released, blocked_by, note) … to authenticated` (`20261001091000_m1…:452`) + HQ admin RLS — `blocked_by` 가 있는데 출시로 바꾸거나 `blocked_by` 를 직접 비우는 것을 **DB 가 막지 않는다** (앱에서만 확인)
- audit trigger 는 `capability.changed` 를 남기지만 **사유가 null** · `updated_by` 미기록
- `suspended → active` 는 허용되고 Readiness 재확인은 `draft → active` 에만 있다 (`20261001111000_m3…:306,355-369`)

## 닫기 위한 최소 안전 단위

1. **출시 기준 문서 (사람 승인)** — class_mode 출시 체크리스트: 시작 · 마치기 · 복구 · 취소 · BEFORE · Growth5 · 메모 · 위 gate · 그리고 **G-1(EN002) · M5(legacy 회수) 가 Production 에서 먼저 적용되어야 하는지** 결정 (JUDGEMENT: 먼저여야 함 — M5 전에는 legacy 직접 쓰기가 남는다)
2. **audited release RPC (migration · 승인 필요)** — `set_capability_release(code, released, reason, expected_updated_at)`: HQ admin 만 · `blocked_by = '{}'` DB 강제 · 사유 · `updated_by` 기록 · 직접 column UPDATE grant 회수
3. **pgTAP** — `not_released` → ok · Sales · 원장 거부 · audit 사유 · 출시가 쓰기 판정을 바꾸지 않음
4. (별도) `suspended → active` Readiness 재확인
5. 실제 출시(플래그 전환)는 **Production 에서 사람이 체크리스트 확인 후** — Staging 에서 먼저 rehearsal
