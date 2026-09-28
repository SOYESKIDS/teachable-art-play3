# PHASE 07 — Deployment & Cutover Runbook (G-2 · G-1 · M5)

| | |
|---|---|
| 문서 성격 | 구현 순서 문서 — 기존 결정(DEC-051 · DEC-052 · DEC-058 · DEC-063 · DEC-079 · DEC-082 · DEC-083 · DEC-093 · DEC-094)의 **적용 순서**만 다룬다. 새 DEC 아님 |
| 최종 갱신 | 2026-09-28 (PHASE 07 세션 7 · G-2 분리) |
| 승인 상태 | **이 문서는 실행 허가가 아니다.** 아래 Step 은 어느 것도 승인되지 않았다. remote 적용 · 배포는 사용자 승인 후 별도 단계 |

---

## 0. 배포 원칙

> **Schema availability and application deployment may precede enforcement.
> Authorization enforcement cutovers happen only after their preflight gates pass.**

- 스키마 · 코드가 먼저 존재할 수 있고, **권한을 줄이는 변경(enforcement)은 각자의 preflight 를 통과한 뒤에만** 적용한다.
- 이것은 entitlement · 역할 규칙이 선택 사항이라는 뜻이 아니다. 규칙은 이미 결정된 대로이며(DEC-083 · DEC-093 등),
  새 경로(Class Mode · Observation 2.0 · Weekly · Portal)는 **처음부터 서버에서 entitlement 를 강제**한다.
  cutover 로 미루는 것은 "기존(legacy) 경로를 언제 새 규칙으로 닫는가"뿐이다.

## 1. 구성 요소

### 1-1. 일반 migration (자동 적용 대상 · backward-compatible)

`supabase/migrations/` 실행 순서:

1. `20261001090000_m1_hq_roles_audit_foundation.sql`
2. `20261001091000_m1_commerce_entitlement_foundation.sql`
3. `20261001092000_m1_class_operation_foundation.sql`
4. `20261001093000_m1_report_portal_foundation.sql`
5. `20261001100000_m2_fact_backfill_reference_seed.sql`
6. `20261001110000_m3_hq_role_foundation.sql` ← (세션 7) HQ 역할 **기반만** · 권한 축소 없음
7. `20261001111000_m3_commerce_contract_readiness.sql`
8. `20261001112000_m3_class_operation_rpcs.sql`
9. `20261001113000_m3_app_context_rpcs.sql`
10. `20261001120000_m4_report_portal_rpcs.sql`

이 10개만 적용된 상태 = **PRE-CUTOVER**. 현재(legacy) 앱과 PHASE 07 앱 모두 기존 운영을 계속할 수 있다
(가상 운영 데이터 위 적용 · 사실 보존 · legacy 쓰기 · legacy HQ 조회를 local 에서 검증).

### 1-2. 통제된 cutover (자동 적용 안 됨 · `supabase/cutover/`)

| cutover | 파일 | 선행 조건 | preflight | 효과 | 되돌리기 · forward-fix | 앱 호환성 영향 |
|---|---|---|---|---|---|---|
| **G-2** HQ 역할 · 민감 접근 | `M3_hq_role_split_sensitive_access.sql` | 일반 migration · PHASE 07 앱 배포 (/sales · 로그인 분기 · HQ 메타데이터 RPC) | `node supabase/cutover/G2_app_preflight.mjs` = PASS + 실행 시 `-v g2_app_preflight=passed` (없으면 G2001 중단) · 선행 RPC 확인(G2002) | `is_soyes_admin` = Admin 만 · lead 정책 Admin + Sales · HQ 의 관찰 · 사진 · AI 초안 · 성장 리포트 blanket SELECT 제거 · 원장 AI 초안 SELECT 제거 · 사진 서명 helper HQ 제외 · audit `cutover.g2_hq_role_split_applied` | `M3_hq_role_split_rollback.sql` (적용 전 정의 복원 · 데이터 변경 없음 · audit) → 이후 재적용 가능 | **현재(legacy) 앱은 이후 Sales 의 /admin · HQ 민감 조회가 막힌다.** PHASE 07 앱은 영향 없음 (preflight 로 확인) |
| **G-1** entitlement write gate | `M3_entitlement_write_gates.sql` | 정책 blocker 해소 · 상품 버전 발행 · 모든 운영 기관 계약 mapping(또는 비운영 = `organizations.status='suspended'`) | `psql -f supabase/cutover/G1_preflight.sql` VERDICT = SAFE · 적용 시 `private.assert_g1_preflight_clean()` 재확인 (G1001 중단) | 배정 = 계약 반 범위(EN001) · 세션 등록 = 반 범위 ∧ 주차(EN002) · 출결 · 관찰(legacy 포함) = 반 기능 ∧ 서비스 모드 active(EN003) · `origin_contract_id` 기록 · audit | trigger 4개 drop (데이터 변경 없음) | 계약 없는 기관 · 범위 밖 반의 **legacy 쓰기가 막힌다** |
| **M5** legacy 직접 쓰기 회수 | `M5_legacy_write_revoke.sql` | Step J(앱 기본 경로 전환) 완료 · legacy 화면 계열 제거 | (별도 preflight 필요 · 미작성) 앱에서 세션 status 직접 UPDATE · legacy RPC 호출 0 확인 | `class_sessions.status` 직접 UPDATE 회수 · legacy 리포트 · 공유 · 관찰 쓰기 RPC 회수 | 회수한 grant 재부여 | legacy 화면 계열의 수업 시작/완료 · legacy 관찰 · 리포트 쓰기가 막힌다 |

- **G-2 는 G-1 을 적용하지 않고, G-1 은 G-2 를 적용하지 않는다** (각 post-cutover test 에서 확인).
- 셋 다 `create or replace` · `drop … if exists` 로 반복 적용이 안전하다 (G-2 · G-1 은 재적용 test 포함).

### 1-3. 교사 · 원장 기본 화면 계열 switch (임시 · 앱)

- `SOYE_SAAS_V2_APP_CUTOVER` (서버 전용 env · `src/lib/rollout/staff-app-routing.ts`)
- **설정 안 함 / `true` 가 아님 → legacy 화면 계열 (Production 기본)**: PHASE 07 이전 production 과 같은
  수업 카드 상태 버튼(시작 · 완료 · 취소) · legacy 관찰 화면 · legacy 성장 리포트 화면 · 원장 대시보드 · 기존 메뉴 · 원장 로그인 → `/director`
- `true` → SaaS 2.0 계열: Class Mode(BEFORE · DURING) · Observation 2.0 · Weekly · 계약 기능 기반 원장 메뉴 · STARTER 대시보드 없음
- **라우팅 전용**: `class_has_feature` · `class_write_allowed` · 계약 Readiness · AI capability · parent_portal capability 를
  바꾸지 않는다. SaaS 2.0 경로는 어느 값이든 서버 RPC 가 entitlement 를 강제한다. legacy 경로의 권한도 기존처럼 DB 가 판정한다.
- 기관별 bypass 아님 (배포 전체에 하나) · NEXT_PUBLIC 아님.
- legacy 계열에서도 유지되는 PHASE 07 강화: 원장 화면의 AI 초안 비표시(DEC-093 · 읽기 전용 UI) · 사진 숨김 기능 · 오류 문구.
- 제거: Step J · G-1 · M5 이후 legacy 화면 계열(`Legacy*` 파일 · `legacy-session-actions.ts`)과 함께 삭제.

## 2. 향후 Production 순서 (개념 · **미승인**)

| Step | 내용 | 확인 |
|---|---|---|
| A | 일반 migration 10개 적용 (additive · backward-compatible) | 적용 후 legacy 앱 정상 · `supabase_migrations` 기록 |
| B | PHASE 07 앱 배포 — `SOYE_SAAS_V2_APP_CUTOVER` 미설정 (legacy 기본 경로) | 교사 · 원장 기존 흐름 smoke test |
| C | HQ Sales 경로(/sales) 배포 · 동작 확인 | Sales 로그인 → /sales · 리드 · 기관 현황 |
| D | G-2 preflight | `G2_app_preflight.mjs` PASS · 배포 상태 운영자 확인 |
| E | G-2 cutover 적용 | audit · Sales /admin 불가 · HQ 민감 조회 0 · 지원 열람 동작 |
| F | 정책 blocker 해소 (CO-12 · AR-8 · CO-8 등) — **별도 결정** | 결정 기록 · capability registry 갱신 |
| G | 올바른 상품 버전 발행 (HQ) | 발행 후 불변 |
| H | 모든 운영 기관 · 반 계약 mapping (사람 검증) · 비운영 기관 정지 처리 | Readiness 충족 · `activate_contract` |
| I | G-1 preflight | VERDICT = SAFE · WARN 검토 |
| J | 교사 · 원장 기본 경로 전환 (`SOYE_SAAS_V2_APP_CUTOVER=true`) | Class Mode · Observation 2.0 · Weekly smoke test |
| K | G-1 entitlement write gate 적용 | trigger 4 · audit |
| L | M5 legacy 직접 쓰기 회수 (자체 preflight 후) | legacy 경로 사용 0 |

**현재 상태**: Step F 이후는 정책 blocker 로 진행할 수 없다 (모든 상품이 `parent_portal`(CO-12)을 포함 → 어떤 계약도 활성화 불가 ·
DEC-063 · 정상 결과). readiness 우회 · 기능 제거 · blocker 해제는 하지 않는다.

## 3. G-2 preflight 항목 (`supabase/cutover/G2_app_preflight.mjs` · 읽기 전용 · 정적)

- /sales Shell 파일 존재 · 모든 Sales page/layout 이 `requireHqSales` 사용
- HQ 로그인에서 `current_hq_role` 로 Sales → `/sales`
- Sales 코드가 `requireAdmin` / `has_soyes_admin_access`(= is_soyes_admin)에 의존하지 않음
- Sales 는 허용 RPC(`hq_sales_organization_summary` · `current_hq_role`)와 `lead_submissions` 만 사용 · lead/label/auth helper 만 import
- Sales Shell 에서 기존 /admin 화면 링크 없음
- HQ Admin 코드가 관찰 · 도메인 · 사진 · AI 초안 · 성장 리포트 · sources 테이블과 사진 storage 를 직접 읽지 않음 (메타데이터 RPC 사용)
- lead 쓰기 action 은 `requireHqStaff`(역할 RPC)
- 원장 관찰 화면은 AI 초안 영역을 그리지 않음
- 교사 · 원장 switch 기본값 legacy · 서버 전용

코드 점검만 한다. 배포된 앱이 실제로 이 코드인지 · /sales 가 동작하는지는 운영자가 확인한 뒤 `-v g2_app_preflight=passed` 를 준다.

## 4. G-1 preflight (`supabase/cutover/G1_preflight.sql` · 읽기 전용)

| 구분 | 항목 |
|---|---|
| BLOCKING | 운영 중(active) 기관 중 운영 중 반이 있는데 서비스 모드 ≠ active |
| WARN | 계약 범위 밖 운영 반 · entitlement 없는 active 배정 · 쓰기를 잃는 예정 · 진행 중 세션 · 읽기 전용이 되는 교사 |
| INFO | 상품 버전 lifecycle · 계약 Readiness 미충족 · 정책 blocker · 상품별 blocker · 정규 기준 인원 초과 · 정지 기관 |
| BLOCKING-FOR-PILOT | Pilot 계약 반 정원 초과 |
| VERDICT | `SAFE TO APPLY M3 CUTOVER` 또는 `NOT SAFE — blocking organizations: N` |

"migration 적용됨" ≠ "enforcement 적용해도 안전함". 비운영 기관은 기존 `organizations.status = 'suspended'` 로만 구분한다.

## 5. 실행 명령 (운영 · 미승인 · 예시)

```
# G-2
node supabase/cutover/G2_app_preflight.mjs
psql --single-transaction -v ON_ERROR_STOP=1 -v g2_app_preflight=passed -f supabase/cutover/M3_hq_role_split_sensitive_access.sql
#   되돌리기: psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_hq_role_split_rollback.sql

# G-1
psql -v ON_ERROR_STOP=1 -f supabase/cutover/G1_preflight.sql
psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_entitlement_write_gates.sql
#   되돌리기: drop trigger trg_class_program_assignments_entitlement_gate on public.class_program_assignments;
#             drop trigger trg_class_sessions_entitlement_gate on public.class_sessions;
#             drop trigger trg_attendance_entitlement_gate on public.class_session_attendance;
#             drop trigger trg_observations_entitlement_gate on public.class_session_observations;

# M5 (자체 preflight 작성 후)
psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M5_legacy_write_revoke.sql
```

## 6. M5 와의 관계

- M5 이전에는 legacy trigger(20260826)가 담당 교사의 직접 UPDATE `scheduled → in_progress / completed` 를 허용한다.
  legacy 화면 계열의 수업 시작/완료가 이 경로를 쓴다 (Production 기본 · Step J 전까지).
- M5 revoke 문 적용 시 42501 로 막히는 것을 pgTAP(transaction 안 시뮬레이션)로 확인했다.
- 순서: Step J → legacy 화면 계열 제거 → M5.

## 7. local 검증 경로

```
npx supabase@2.113.0 db reset                                                     # PRE-CUTOVER (일반 migration 10개)
npx supabase@2.113.0 test db                                                      # 기본 suite 146 (baseline 30 · hardening 116)
node supabase/cutover/tests/run-local.mjs G2_post_cutover.test.sql                 # POST-G2 28 (적용 · rollback · 재적용 · rollback 됨)
node supabase/cutover/tests/run-local.mjs M3_post_cutover.test.sql                 # POST-G1 24
node supabase/cutover/G2_app_preflight.mjs                                        # G-2 앱 점검 15 항목

# production-shaped (가상 데이터)
npx supabase@2.113.0 db reset --local --version 20260904090000
node supabase/cutover/tests/run-local.mjs supabase/validation/production_shaped/01_legacy_seed.sql --raw
node supabase/cutover/tests/run-local.mjs supabase/validation/production_shaped/02_fingerprint.sql --raw   # before
npx supabase@2.113.0 migration up --local
node supabase/cutover/tests/run-local.mjs supabase/validation/production_shaped/02_fingerprint.sql --raw   # after (동일)
node supabase/cutover/tests/run-local.mjs supabase/cutover/G1_preflight.sql --raw
node supabase/cutover/tests/run-local.mjs supabase/validation/production_shaped/03_validation.test.sql     # 83 (PRE-G2 → G-2 → mapping → SIM → G-1)
npx supabase@2.113.0 db reset
```

`run-local.mjs` 는 `supabase_db_*` local 컨테이너 psql 로만 실행한다 (remote 경로 없음 · 새 npm 의존성 없음).
