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
11. `20261002090000_p08_membership_authority.sql` ← (PHASE 08) 이하 6개는 local 만 적용 · Staging 미적용
12. `20261002091000_p08_ai_assist_authorization.sql`
13. `20261002092000_p08_session_start_authority.sql`
14. `20261002093000_p08_evidence_write_gates.sql`
15. `20261002094000_p08_contract_capacity.sql`
16. `20261002095000_p08_legacy_share_safety.sql`

이 16개(PHASE 07 까지는 10개)만 적용된 상태 = **PRE-CUTOVER**. 현재(legacy) 앱과 PHASE 07 앱 모두 기존 운영을 계속할 수 있다
(가상 운영 데이터 위 적용 · 사실 보존 · legacy 쓰기 · legacy HQ 조회를 local 에서 검증).

### 1-2. 통제된 cutover (자동 적용 안 됨 · `supabase/cutover/`)

| cutover | 파일 | 선행 조건 | preflight | 효과 | 되돌리기 · forward-fix | 앱 호환성 영향 |
|---|---|---|---|---|---|---|
| **G-2** HQ 역할 · 민감 접근 | `M3_hq_role_split_sensitive_access.sql` | 일반 migration · PHASE 07 앱 배포 (/sales · 로그인 분기 · HQ 메타데이터 RPC) | `node supabase/cutover/G2_app_preflight.mjs` = PASS + 실행 시 `-v g2_app_preflight=passed` (없으면 G2001 중단) · 선행 RPC 확인(G2002) | `is_soyes_admin` = Admin 만 · lead 정책 Admin + Sales · HQ 의 관찰 · 사진 · AI 초안 · 성장 리포트 blanket SELECT 제거 · 원장 AI 초안 SELECT 제거 · 사진 서명 helper HQ 제외 · (PHASE 08) 구성원 직접 INSERT/UPDATE 회수 · AI 초안 저장 gate · audit `cutover.g2_hq_role_split_applied` | `M3_hq_role_split_rollback.sql` (적용 전 정의 복원 · 데이터 변경 없음 · audit) → 이후 재적용 가능 | **현재(legacy) 앱은 이후 Sales 의 /admin · HQ 민감 조회가 막힌다.** PHASE 07 앱은 영향 없음 (preflight 로 확인) |
| **G-1** entitlement write gate | `M3_entitlement_write_gates.sql` | 정책 blocker 해소 · 상품 버전 발행 · 모든 운영 기관 계약 mapping(또는 비운영 = `organizations.status='suspended'`) | `psql -f supabase/cutover/G1_preflight.sql` VERDICT = SAFE · 적용 시 `private.assert_g1_preflight_clean()` 재확인 (G1001 중단) | 배정 = 계약 반 범위(EN001) · 세션 등록 = 반 범위 ∧ 주차(EN002) · 출결 · 관찰(legacy 포함) = 반 기능 ∧ 서비스 모드 active(EN003) · `origin_contract_id` 기록 · audit | `M3_entitlement_write_gates_rollback.sql` (PHASE 08 · trigger · 함수 제거 · 계약 적용 gate 복원 · 데이터 변경 없음) | 계약 없는 기관 · 범위 밖 반의 **legacy 쓰기가 막힌다** |
| **M5** legacy 직접 쓰기 회수 | `M5_legacy_write_revoke.sql` | Step J(앱 기본 경로 전환) 완료 · legacy 화면 계열 제거 | (PHASE 08) `node supabase/cutover/M5_app_preflight.mjs` = PASS · `M5_preflight.sql` VERDICT = SAFE · 실행 시 `-v m5_preflight=passed` (없으면 M5001) · G-2 · G-1 · PHASE 08 선행 확인 (M5002) | `class_sessions.status` 직접 UPDATE 회수 · legacy 리포트 · 공유 발급 · 관찰 · 관찰영역 · 관찰 AI 쓰기 RPC 와 표 grant 회수 · legacy 형식 관찰 작성 거부(OB008) · audit | `M5_legacy_write_rollback.sql` (원본 grant 복원 · audit) | legacy 화면 계열의 수업 시작/완료 · legacy 관찰 · 리포트 쓰기가 막힌다 |

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
| D | G-2 preflight | `G2_app_preflight.mjs` PASS · `G2_db_preflight.sql` (PHASE 08 · **active HQ Sales 수 필수 · ≥1 이면 escalation**) · 배포 상태 운영자 확인 |
| E | G-2 cutover 적용 | audit · Sales /admin 불가 · HQ 민감 조회 0 · 지원 열람 동작 |
| F | 정책 blocker 해소 (CO-12 · AR-8 · CO-8 등) — **별도 결정** | 결정 기록 · capability registry 갱신 |
| G | 올바른 상품 버전 발행 (HQ) | 발행 후 불변 |
| H | 모든 운영 기관 · 반 계약 mapping (사람 검증) · 비운영 기관 정지 처리 | Readiness 충족 · `activate_contract` |
| I | G-1 preflight | VERDICT = SAFE · WARN 검토 |
| J | 교사 · 원장 기본 경로 전환 — **(PHASE 08) legacy 화면 계열을 뺀 빌드 배포 · §2-1 controlled window 시작** | `JKL_start_gate.mjs` · `JKL_window_preflight.sql` READY · Class Mode · Observation 2.0 · Weekly smoke test |
| K | G-1 entitlement write gate 적용 (J 직후 · 같은 window) | trigger 6 · audit |
| L | M5 legacy 직접 쓰기 회수 (K 직후 · 같은 window · M5 preflight 후) | legacy 경로 사용 0 · post-M5 검증 |

**현재 상태**: Step F 이후는 정책 blocker 로 진행할 수 없다 (모든 상품이 `parent_portal`(CO-12)을 포함 → 어떤 계약도 활성화 불가 ·
DEC-063 · 정상 결과). readiness 우회 · 기능 제거 · blocker 해제는 하지 않는다.

### 2-1. J / K / L controlled window (PHASE 08 · 필수 절차)

J · K · L 은 설계상 별도 단계지만 **Production 에서는 한 번의 maintenance / controlled window 에서 연속 수행**한다.
J 이후 M5 전 상태(legacy 직접 쓰기 경로가 DB 에 남은 상태)는 **승인된 steady state 가 아니다.** DB 는 배포 env 를 읽지 않는다.

| # | 단계 | 통과 조건 (아니면 멈춘다) |
|---|---|---|
| 0 | window 시작 전 | `node supabase/cutover/JKL_start_gate.mjs --root <배포할 빌드>` = READY (M5 앱 preflight PASS: legacy UI 꺼짐 · legacy Action 의존 0 · legacy 직접 쓰기 소비자 0) · `psql -f supabase/cutover/JKL_window_preflight.sql` = READY (G-2 적용 · PHASE 08 · G-1 blocking 0 · G-1 · M5 미적용) · `G1_preflight.sql` = SAFE. **M5 앱 preflight 가 FAIL 이면 J 를 시작하지 않는다** |
| 1 | maintenance / controlled window 시작 | 쓰기 공지 · 진행 중 수업 정리 계획 |
| 2 | J — M5 앱 조건을 충족한 빌드 배포 | 배포 확인 |
| 3 | 즉시 검증 | 교사 · 원장 V2 화면 smoke |
| 4 | K — G-1 적용 | audit · trigger 6 |
| 5 | 즉시 검증 | 유효 계약 반 쓰기 정상 · 범위 밖 EN00x |
| 6 | L — `M5_preflight.sql` SAFE 확인 후 M5 적용 (`-v m5_preflight=passed`) | audit |
| 7 | post-M5 검증 | legacy 직접 쓰기 42501 · V2 경로 정상 · legacy 조회 · 공유 읽기 유지 |

실패 시 역순 rollback (M5 → G-1 → 이전 빌드) 후 window 를 닫는다. J 상태로 window 밖 운영을 하지 않는다.

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

- (PHASE 08) 앱이 organization_members 를 직접 쓰지 않음 · 원장 · 교사 초대가 `hq_add_organization_member` 사용 · AI Action 이 provider 전에 판정

코드 점검만 한다. 배포된 앱이 실제로 이 코드인지 · /sales 가 동작하는지는 운영자가 확인한 뒤 `-v g2_app_preflight=passed` 를 준다.

**G-2 app preflight 의 수명 주기 (PHASE 10B.1 · 순서 변경 없음)**
1. `G2_app_preflight.mjs` 는 **G-2 cutover 직전에 배포되는 PRE-G2 빌드**의 gate 다 (`--root <빌드 소스>` 로 다른 소스도 점검 가능 · 점검 항목은 그대로).
2. J-ready / M5-ready 빌드(PHASE 10B 이후)는 legacy 라우팅 스위치 · legacy AI 쓰기 Action 을 **의도적으로 지운다**.
3. 그래서 J-ready 빌드는 PRE-G2 라우팅 조건을 통과하지 않는 것이 정상이다 — 예외 없이 `pre-G2 routing switch absent … (G-2 app preflight not applicable)` 와 `LIFECYCLE:` 안내로 FAIL 한다 (나머지 항목 · AI provider 판정 순서는 계속 검사하고, src 전체의 provider 호출도 검사한다).
4. G-2 가 ACTIVE · VERIFIED 인 뒤 J 를 위한 앱 gate 는 `M5_app_preflight.mjs` · `JKL_start_gate.mjs` · role E2E / smoke 다.
5. **G-2 가 이미 ACTIVE 인 환경에서 G-2 app preflight 의 FAIL(또는 과거의 crash)을 G-2 재적용 근거로 쓰지 않는다.** 상태 확인은 `g2_post_verify.sql` 로 한다.
6. Production 순서는 그대로: **PRE-G2 앱 → G-2 app preflight → G-2 → 정책 · Readiness 작업 → J-ready 앱 → G-1 → M5** (J → K(G-1) → L(M5) 은 §2-1 의 한 controlled window).

**G-2 DB preflight (PHASE 08 · 필수)**: `psql -v ON_ERROR_STOP=1 -f supabase/cutover/G2_db_preflight.sql`
- PHASE 08 membership authority · AI 판정 객체 존재 (없으면 NOT READY)
- **READ-ONLY: active HQ Sales account count** — 필수 확인 항목. 1 이상이면 G-2 전까지 Sales 가 아동 기록 조회 ·
  구성원 직접 쓰기(자기 자신 제외)를 할 수 있으므로 VERDICT = `ESCALATE` → **G-2 적용 시점을 보안 우선으로 escalation**
- G-2 전 직접 구성원 변경 기록 수 (audit `via = direct`)
- D2 상태 표기: G-2 전 = **TARGET IMPLEMENTED / CUTOVER PENDING** (D2 resolved 아님)

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
#   되돌리기 (PHASE 08): psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_entitlement_write_gates_rollback.sql
#             (trigger 6 · 함수 제거 + 사진 업로드 판정을 동의만으로 복원 · audit)

# J/K/L window 시작 조건 (§2-1)
node supabase/cutover/JKL_start_gate.mjs --root <배포할 빌드>
psql -v ON_ERROR_STOP=1 -f supabase/cutover/JKL_window_preflight.sql

# M5 (PHASE 08 완성 · J/K/L window 안에서 G-1 직후)
node supabase/cutover/M5_app_preflight.mjs --root <배포된 빌드>
psql -v ON_ERROR_STOP=1 -f supabase/cutover/M5_preflight.sql
psql --single-transaction -v ON_ERROR_STOP=1 -v m5_preflight=passed -f supabase/cutover/M5_legacy_write_revoke.sql
#   되돌리기: psql --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M5_legacy_write_rollback.sql
```

PHASE 08 변경 요약 (상세 · 준비 상태: [../08-security-hardening/cutover-readiness.md](../08-security-hardening/cutover-readiness.md)):
- G-2: §5 구성원 직접 INSERT/UPDATE 회수(audited RPC 만) · §6 AI 초안 저장 gate · G2002 에 PHASE 08 선행 함수 · preflight 18 항목
- G-1: D4 onboarding(유효 · 시작 전 · 초안 계약 범위 배정) · 배정 재개 gate · before_start 일정 · **legacy 공유 쓰기 표면 gate 전부**
  (출결 · legacy 관찰 · 직접 시작/완료 · 관찰영역 연결 · 사진 재원/반 쓰기 — 일반 migration 이 아니라 G-1 에서만 켜진다) · G1002 · rollback 파일.
- **G1001 is a cutover-time cleanliness guard, not the normal post-G1 onboarding rule.** 적용 순간에만 실행되며,
  그 순간 운영 중 반이 있는데 서비스 모드가 active 가 아닌 기관(onboarding 중 포함)이 있으면 적용을 중단한다.
  G-1 적용 후 신규 기관 onboarding(초안 → 범위 → 배정 → Readiness → 활성화 → 쓰기)에는 관여하지 않는다 (POST-G1 test).
- M5: 회수 범위 완성 · M5001(확인 변수) · M5002(G-2 · G-1 · PHASE 08 선행) · audit · rollback · 앱 preflight 7 항목(`--root`)
- G-2 DB preflight(active HQ Sales 수 필수) · J/K/L start gate · window preflight (신규)

## 6. M5 와의 관계

- M5 이전에는 legacy trigger(20260826)가 담당 교사의 직접 UPDATE `scheduled → in_progress / completed` 를 허용한다.
  legacy 화면 계열의 수업 시작/완료가 이 경로를 쓴다 (Production 기본 · Step J 전까지).
- M5 revoke 문 적용 시 42501 로 막히는 것을 pgTAP(transaction 안 시뮬레이션)로 확인했다.
- 순서 (PHASE 08 갱신): legacy 화면 계열을 뺀 빌드로 J → 즉시 K(G-1) → 즉시 L(M5) — 한 controlled window (§2-1).
- (PHASE 08) saas_v2 모드 앱의 legacy 수업 Server Action 은 서버에서 거부한다. G-1 적용 후에는 반 쓰기 entitlement 없는 직접 시작 ·
  예정→완료를 DB 가 거부한다(EN003). 그래도 PostgREST 직접 UPDATE 경로는 M5 까지 남는다 — transitional risk
  ([../08-security-hardening/open-items.md](../08-security-hardening/open-items.md) P08-OPEN-1) · window 로 짧게 유지한다.
- (PHASE 08) M5 의 전체 회수 목록 · preflight · 전후 test: [../08-security-hardening/cutover-readiness.md](../08-security-hardening/cutover-readiness.md) §4.

## 7. local 검증 경로

```
npx supabase@2.113.0 db reset                                                     # PRE-CUTOVER (일반 migration 10개)
npx supabase@2.113.0 test db                                                      # 기본 suite 232 (baseline 30 · hardening 116 · PHASE 08 86)
node supabase/cutover/tests/run-local.mjs G2_post_cutover.test.sql                 # POST-G2 67 (적용 · rollback · 재적용 · rollback 됨 · PHASE 08 §5 §6 · 09C.1 Sales 사진 · Growth5 · 확인 SQL 포함)
node supabase/cutover/tests/run-local.mjs M3_post_cutover.test.sql                 # POST-G1 70 (PHASE 08 D4 · D5 · ISSUE1 · ISSUE4 · rollback · 재적용 · 09E 만료 계약 · Weekly · STARTER · Pilot)
node supabase/cutover/tests/run-local.mjs G1_rehearsal_verify.test.sql             # G-2 위 G-1 24 (09E · g1_post_verify.sql 판정 · rollback 후 G-2 유지 · G-2 회귀 감지)
node supabase/cutover/tests/run-local.mjs M5_post_cutover.test.sql                 # POST-M5 46 (G-2 → G-1 → M5 · rollback · 재적용)
node --test supabase/validation/phase08/app_gates.test.mjs                         # 앱 서버 gate 12 (AI 판정 · 식별자 · legacy 수업 Action 모드 · J/K/L start gate)
node supabase/cutover/M5_app_preflight.mjs                                        # M5 앱 점검 7 항목 (legacy 제거 빌드 전에는 FAIL 이 정상)
node supabase/cutover/G2_app_preflight.mjs                                        # G-2 앱 점검 18 항목

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
