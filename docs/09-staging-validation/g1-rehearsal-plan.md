# PHASE 09E — G-1 Staging Rehearsal Plan (준비 완료 · 적용하지 않음 · 명시 승인 대기)

| | |
|---|---|
| 대상 | Staging Supabase `teachable-art-play3-staging` · ref `itcddooiuqsqingfhxkk` 만 · Production `vpppxuhodwauaclhybtg` 은 대상이 아니다 (거부) |
| cutover | G-1 = `supabase/cutover/M3_entitlement_write_gates.sql` (entitlement write gate · 변경 없음) |
| 되돌리기 | `supabase/cutover/M3_entitlement_write_gates_rollback.sql` (정의만 · 데이터 변경 없음) |
| 현재 상태 (2026-09-29) | G-2 **ACTIVE — VERIFIED** · G-1 **NOT APPLIED · REHEARSAL PREPARED · AWAITING EXPLICIT APPROVAL** · M5 NOT READY · J/K/L DO NOT START |
| 순서 | G-2 → **G-1** → (J → K → L window: M5 앱 조건 준비 후 · 별도 승인) |

## 1. G-1 이 정확히 하는 일 (읽은 SQL 기준)

G-1 은 **entitlement(계약 · 상품 기능) 판정으로 쓰기를 막는 trigger 6개 · 함수 8개**를 설치하고, 사진 업로드 판정 함수 1개를 바꾸고, audit 1건을 남긴다.
판정 기준 함수는 모두 일반 migration(`20261001091000`)에 이미 있는 읽기 함수다:
`class_write_allowed(class, feature)` = 반이 **유효 계약**의 반 범위 안 ∧ 그 계약 상품 버전에 feature 포함(`class_has_feature`) ∧ 반 active ∧ 기관 서비스 모드 `active`.
**`platform_capabilities.is_released` · 정책 blocker(CO-12 등)는 이 판정에 들어가지 않는다** — 출시 준비(DEC-063 · Production 서비스 활성화) 항목이다.

| # | G-1 설치물 | 대상 표 · 경로 | 판정 | 거부 코드 |
|---|---|---|---|---|
| 0 | guard `g1_blocking_organizations()` · `assert_g1_preflight_clean()` · G1002 선행 확인 | 적용 순간에만 (신규 onboarding 에는 관여 안 함) | 운영 중 기관 ∧ 운영 중 반 ∧ 서비스 모드 ≠ active 가 있으면 적용 중단 · PHASE 08 선행 함수 없으면 중단 | G1001 · G1002 |
| 1 | `trg_class_program_assignments_entitlement_gate` → `gate_class_program_assignment_insert()` · `class_assignment_contract_id()` | `class_program_assignments` INSERT · 비활성→active UPDATE (HQ Admin 배정) | 유효 계약 반 범위 → 시작 전 계약 → 초안 계약 순으로 근거 계약을 찾음 · `origin_contract_id` 기록 | EN001 |
| 2 | `trg_class_sessions_entitlement_gate` → `gate_class_session_insert()` | `class_sessions` INSERT (수업 일정 등록) | 서비스 active ∧ 계약 반 범위 ∧ 계약 주차(`class_week_entitled` · STARTER 1~8) · 또는 before_start 계약의 반 · 주차 범위 | EN002 |
| 3-1 | `trg_attendance_entitlement_gate` · `trg_observations_entitlement_gate` → `gate_class_record_write()` | `class_session_attendance` · `class_session_observations` INSERT/UPDATE (Growth5 관찰은 일반 migration gate 가 판정 · 내용 변경 없는 UPDATE 통과) | `class_write_allowed(class, 'class_mode')` | EN003 |
| 3-2 | `trg_class_sessions_status_g1_gate` → `gate_class_session_direct_start()` | legacy 직접 `class_sessions.status` scheduled→in_progress/completed (M5 전 경로 · RPC 안 UPDATE 는 제외) | `class_write_allowed(class, 'class_mode')` | EN003 |
| 3-3 | `trg_observation_domains_g1_gate` → `gate_observation_domain_write()` | legacy `class_session_observation_domains` INSERT/DELETE | `class_write_allowed(class, 'class_mode')` | EN003 |
| 3-4 | `observation_media_upload_block_reason()` **교체** | 사진 업로드 (Storage 정책 · metadata · 일반 migration trigger 가 이 함수를 호출) | 동의 declined → 재원 원아 아님 → 반 쓰기(`class_mode`) 없음 순 | MD005 · EN003 |
| 4 | audit `cutover.m3_entitlement_gates_applied` (reason `G-1 preflight passed`) | `audit_events` | — | — |

**G-1 이 하지 않는 것 (구분)**

| 통제 | 담당 |
|---|---|
| 교사 · 원장이 볼 수 있는 기관 · 반 (RLS · 담당 반) | 기존 RLS (일반 migration) |
| HQ Admin / Sales 분리 · 민감 blanket SELECT 제거 · 구성원 직접 쓰기 회수 · AI 초안 release gate | **G-2** (이미 적용 · `g2_post_verify`) |
| V2 수업 시작 · Growth5 관찰/선택 · Weekly 리포트 · 사진 Weekly 선택 · 빠른 메모 쓰기 판정 | 일반 migration `20261002093000` (G-1 전부터 · `class_write_allowed(…, 'class_mode' / 'weekly_report')`) |
| legacy 직접 쓰기 권한 회수 (`update(status)` 등) | **M5** (J/K/L window) |

→ Weekly 리포트 쓰기 권한은 G-1 이 아니라 일반 migration 이 `weekly_report` 기능으로 이미 판정한다. G-1 은 그것을 바꾸지 않는다 (local test 로 G-1 적용 후에도 같은지 확인).

## 2. Staging 판정 (2026-09-29 · 읽기 전용)

| 확인 | 결과 |
|---|---|
| `G1_preflight` verdict | **SAFE TO APPLY M3 CUTOVER** |
| [BLOCKING] 1 · [BLOCKING-FOR-PILOT] 10 | 0 · 0 |
| [WARN] 2 ~ 5 (범위 밖 반 · entitlement 없는 배정 · 쓰기 잃는 세션 · 읽기 전용 교사) | **0 · 0 · 0 · 0** |
| [INFO] 7 Readiness 미충족 (active STARTER 계약) | `class_mode` · `weekly_report` = `not_released` · `parent_portal` = `policy_blocked` (CO-12) |
| [INFO] 8 · 9 정책 blocker | ai_assist(AR-8) · branding(CO-8) · parent_portal(CO-12) — 해제하지 않는다 |

**해석**: INFO 7 의 세 항목은 **EXPECTED RELEASE READINESS WARNINGS** 이다 (G-1 쓰기 판정에 `is_released` 가 들어가지 않음 → G-1 적용 후에도 Staging STARTER 계약 반의 `class_mode` · `weekly_report` 쓰기는 계속된다 · local test 로 확인).
**ACTUAL G-1 CUTOVER BLOCKER 는 0** 이다. 그러나 DEC-063 에 따라 계약에 약속된 기능 · 리포트가 **Service Ready 가 되기 전에는 Production 서비스 활성화를 하지 않는다** — Staging cutover 준비 ≠ Production 활성화 준비.
(참고: PHASE 09C 문서의 "WARN 3" 표기는 이 INFO 7 항목을 가리킨 것이다 · 섹션 2~5 WARN 은 0.)

## 3. 전제 조건 (모두 충족해야 시작 · 하나라도 아니면 중단)

| # | 조건 | 확인 방법 |
|---|---|---|
| P1 | 승인 커밋 = HEAD = origin/saas-v2 · 작업 트리 clean | runner `-ApprovedCommit <sha>` (승인 시 사람이 지정) |
| P2 | linked ref 정확히 `itcddooiuqsqingfhxkk` · Production ref 어디에도 없음 | runner |
| P3 | **G-2 ACTIVE — VERIFIED** (`g2_post_verify` missing `{}`) | runner PRE 게이트 |
| P4 | `g1_post_verify` = NOT VERIFIED · missing = G-1 항목 4개만 (G-2 항목 없음) · M5 미적용 | runner PRE 게이트 |
| P5 | 비합성 사용자 0 · 진행 중 수업 0 · G-1 trigger 0 | runner PRE 게이트 (`staging_inventory`) |
| P6 | `G1_preflight` SAFE · 섹션 1 · 2~5 · 10 = 0 행 | runner PRE 게이트 |
| P7 | Preview Ready (saas-v2 alias) | `npx vercel inspect https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app --scope soyeskids-projects` (`vercel curl` · bypass 금지) |
| P8 | **PRE-G1 사람 smoke = PASS** | §6 |
| P9 | psql = local Supabase DB 컨테이너 psql · Staging session pooler 5432 도달 (`pg_isready`) | runner selftest |
| P10 | Staging DB 비밀번호는 운영자 로컬 숨김 입력만 · 채팅 · 파일 · 이력 · `DATABASE_URL`/`SUPABASE_DB_URL` 금지 · P09D-C1(노출 후 회전) **RESOLVED** | runner |
| P11 | local 증거: `M3_post_cutover` 70/70 · `G1_rehearsal_verify` 24/24 · `G2_post_cutover` 67/67 | §9 |

## 4. 적용 (승인 후 · 운영자 PowerShell · 임시 runner)

runner 는 저장소 밖 세션 scratchpad 의 `g1_runner.ps1` + `g1_gates.mjs` 다 (09E selftest 완료 · rehearsal 직전 다시 selftest).

```
cd D:\소예키즈\teachable-art-play3
powershell -NoProfile -ExecutionPolicy Bypass -File <scratchpad>\g1_runner.ps1 -Mode selftest
powershell -NoProfile -ExecutionPolicy Bypass -File <scratchpad>\g1_runner.ps1 -Mode apply -ApprovedCommit <승인 커밋 40자리>
```

runner 가 하는 일: lock(동시 실행 거부 · P09D-R1) → env · 커밋 · clean · ref · pooler 대상 확인 → **PRE 게이트 재실행**(읽기 전용) →
`APPLY G-1 STAGING` 입력 확인 → 숨김 비밀번호 → 아래 psql 1회 → post-verify → 실패 시 자동 rollback → 비밀번호 삭제 · 실행별 로그.

실제 psql 형태 (G-1 파일에는 psql 변수 guard 가 없다 · 적용 시점 guard 는 SQL 안의 G1001 · G1002):

```
psql -h <staging session pooler> -p 5432 -U postgres.<staging-ref> -d postgres \
  --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_entitlement_write_gates.sql
```

- 적용 SQL 오류(G1001 · G1002 · 기타) = single transaction 전체 abort → **자동 재시도 없음** → PRE 상태 재확인 후 중단
- `supabase db query --linked` 로 실행하지 않는다 (cutover 는 psql 로만)

## 5. 적용 직후 확인 (읽기 전용 · 필수)

```
node supabase/validation/staging_e2e/remote_readonly_query.mjs \
  supabase/validation/staging_e2e/sql/g1_post_verify.sql \
  supabase/validation/staging_e2e/sql/g2_post_verify.sql \
  supabase/validation/staging_e2e/sql/staging_inventory.sql \
  supabase/cutover/M5_preflight.sql \
  supabase/cutover/JKL_window_preflight.sql
```

| 확인 | 적용 후 기대 |
|---|---|
| `g1_post_verify.verdict` | **`G-1 ACTIVE — VERIFIED`** · missing `{}` |
| `g1_gate_triggers_enabled` · `g1_gate_functions_present` · `g1_functions_not_client_executable` · `g1_media_upload_judgement_active` · `evidence_gate_triggers_enabled` · `g1_applied_audit_latest` | 모두 true (trigger 6 켜짐 · 함수 8 · anon/authenticated EXECUTE 없음 · 사진 판정 G-1 정의 · 일반 migration evidence gate 6 · 최근 G-1 audit = applied) |
| `g2_is_soyes_admin_admin_only` · `g2_release_gate_triggers_enabled` · `g2_member_direct_write_closed` · `g2_applied_audit_latest` | 모두 true (G-2 회귀 없음) |
| `m5_applied` (정보) | false |
| `g2_post_verify` | `G-2 ACTIVE — VERIFIED` · missing `{}` |
| `staging_inventory` | `g1_gates` = 6 · cutover audit = 2 (G-2 · G-1) · 비합성 사용자 0 · 데이터 행 변화 없음 |
| `M5_preflight` (DB) | `g1_applied = true` · `g2_applied = true` · DB verdict 는 **`SAFE TO APPLY M5 (DB)`** 로 바뀐다 (Staging 기관은 계약 적용됨) — **그래도 M5 는 NOT READY**: `M5_app_preflight` 2/7 FAIL · verdict 문구 자체가 앱 PASS 를 요구한다. **DB SAFE 만 보고 M5 를 적용하지 않는다** |
| `JKL_window_preflight` | `g1_not_yet_applied = false` → verdict **`NOT READY — G-1 이 이미 적용됨`** (이 preflight 는 J 시작 전 전용) — **J/K/L 시작 안 함** · §10 |

적용 전(현재) 기대: `g1_post_verify` = NOT VERIFIED · missing = `g1_gate_triggers_enabled · g1_gate_functions_present · g1_media_upload_judgement_active · g1_applied_audit_latest` (2026-09-29 Staging 에서 확인 · G-2 항목은 모두 true).

## 6. 사람 Preview smoke (비밀번호 · 스크린샷 요청 없음 · 쓰기 없음)

**PRE-G1 (적용 전)**: HQ Sales 읽기 화면(`/sales/leads` · `/sales/organizations`) · HQ Admin 읽기 화면(`/admin/leads` · 기관) · Teacher 일반 화면 · Director STARTER 화면.

**POST-G1 (적용 후 · G-1 초점)**:
1. Teacher: 오늘의 수업 · 수업 카드 → BEFORE 화면이 열림 (entitlement 라우팅) — **시작 버튼은 누르지 않는다**
2. Teacher: Class Mode 화면이 "이용 상품에 포함되지 않음 / 읽기 전용" 으로 바뀌지 않음
3. Teacher: Weekly 리포트 목록 화면이 열림 (작성 · 완료는 하지 않음)
4. Director: `/director/sessions` · 이력 · 출결 조회 · 학부모 공유 화면 정상 (발급 · 숨김 · 동의 변경 없음)
5. 500 · 권한 오류 없음

응답: `POST-G1 PREVIEW CHECK = PASS / FAIL` — FAIL 이면 §7 rollback.

## 7. Rollback (필요할 때만 · 장애 대응)

```
powershell -NoProfile -ExecutionPolicy Bypass -File <scratchpad>\g1_runner.ps1 -Mode rollback -ApprovedCommit <승인 커밋>
# 실제 psql: psql <staging session pooler> --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_entitlement_write_gates_rollback.sql
```

rollback 이 하는 일 (검토 완료 · 09E): G-1 trigger 6 · 함수 8 제거 · `observation_media_upload_block_reason` 를 일반 migration `20261002093000` 정의(동의 declined 만)로 복원
(정의 비교 일치) · audit `cutover.m3_entitlement_gates_rolled_back`. **G-2 객체는 건드리지 않는다** · 데이터 행 삭제 없음 (`origin_contract_id` 값 유지).
제거되는 함수를 부르는 일반 migration · 앱 코드는 없다 (앱의 언급은 주석 1곳).

rollback 후 기대 (local `G1_rehearsal_verify` 로 확인):

| 확인 | 기대 |
|---|---|
| `g1_post_verify` | `G-1 NOT VERIFIED` · missing 에 `g1_gate_triggers_enabled` · `g1_media_upload_judgement_active` · `g1_applied_audit_latest` · **G-2 항목 없음** |
| `g2_post_verify` | **`G-2 ACTIVE — VERIFIED`** (rollback 이 G-2 를 되돌리지 않음) |
| `staging_inventory` | `g1_gates` = 0 · cutover audit 3 |

## 8. 중단 조건

- 다른 project · Production ref · 연결 대상이 Staging session pooler 가 아님
- 비합성 사용자 > 0 · 진행 중 수업 > 0
- G-2 가 더 이상 VERIFIED 가 아님 (G-2 를 고치거나 재적용하지 않는다)
- `G1_preflight` NOT SAFE · 섹션 1 / 2~5 / 10 에 행
- 적용 SQL 오류 (재시도 금지)
- post-verify 실패 → runner 자동 rollback
- Teacher / Director 핵심 화면 회귀 · 계약 반인데 쓰기가 막힘 (EN003 오탐) → rollback
- entitlement 우회 (계약 범위 밖 반에 쓰기 가능) → rollback · SEV-1
- G-2 회귀 (Sales 가 민감 표 · `/admin` 접근) → rollback 후 조사 · SEV-1
- 같은 창에서 M5 · J/K/L 을 시작하려는 시도

## 9. local 증거 (transaction 안 · 전부 rollback · local DB 변화 없음)

| suite | 결과 | 내용 |
|---|---|---|
| `M3_post_cutover.test.sql` | **70/70** (09E +11) | 기존 59 + 기간 만료 계약 쓰기 불가(EN003) · Weekly 권한 = 계약 범위 · STARTER 에 dashboard · monthly · semester · ai_assist 없음 · Pilot 별도 Offer(1~4주 · 반당 15 · 최대 2반 · Weekly 만 · STARTER 와 다른 버전) |
| `G1_rehearsal_verify.test.sql` (신규) | **24/24** | G-2 위에 G-1 (Staging 순서) · `g1_post_verify` PRE / 적용 / trigger disable / rollback(G-2 유지) / 재적용 / G-2 회귀 · 계약 반 교사 출결 계속 · 범위 밖 반 EN003 |
| `G2_post_cutover.test.sql` | 67/67 | G-2 (09C.1) |
| harness safety | 48/48 | `g1_post_verify.sql` 허용 목록 · 1 문장 · G-1 함수 호출 없음 · G-1 apply/rollback 파일은 읽기 전용 runner 가 거부 |

## 10. 순서 결정 — 승인 시 함께 확인 (precondition)

PHASE 08 runbook §2-1: **Production** 에서 G-1 은 J/K/L controlled window 의 **K** 다 (J 빌드 배포 → 즉시 K(G-1) → 즉시 L(M5) · 한 window).
이 rehearsal 은 Staging 에서 **K 의 DB 동작만 단독으로** 미리 확인한다 (적용 · 확인 · rollback 경로). 결과:

| 영향 | 내용 |
|---|---|
| Production 순서 | 바뀌지 않는다 (J → K → L 한 window · J 없이 Production G-1 단독 적용 안 함) |
| Staging 이후 상태 | G-2 + G-1 (M5 없음). Staging Preview 는 이미 V2 화면(`SOYE_SAAS_V2_APP_CUTOVER=true`)이지만 legacy 코드가 남아 있어 M5 앱 조건은 FAIL — legacy 직접 쓰기 경로는 **G-1 gate 로 entitlement 판정**을 받는 상태가 된다 (계약 반만 쓰기 · M5 전까지 권한 자체는 남음 · P08-OPEN-1) |
| 이후 Staging J/K/L 전체 rehearsal | `JKL_window_preflight` 가 `NOT READY — G-1 이 이미 적용됨` 이 된다 → 전체 window rehearsal 을 하려면 **먼저 G-1 을 rollback** (경로 검증됨 · §7) 하고 시작한다 |
| M5 | DB preflight 가 SAFE (DB) 로 보여도 앱 FAIL → 적용 금지 (§5) |

승인 문구에 "G-1 단독 Staging rehearsal (K 단독 · Production 순서 불변)" 을 명시하는 것을 전제로 한다.
