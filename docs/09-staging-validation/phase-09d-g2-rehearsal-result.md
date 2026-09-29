# PHASE 09D — G-2 Staging Cutover Rehearsal Result

| | |
|---|---|
| 결과 | **G-2 STAGING ACTIVE — VERIFIED** (rollback 불필요 · 실행 안 함) |
| 적용 시각 | 2026-09-29 02:09:16 UTC (11:09:16 KST) · audit `cutover.g2_hq_role_split_applied` |
| 최종 확인 | 2026-09-29 11:32 KST · `g2_post_verify` = `G-2 ACTIVE — VERIFIED` · missing `{}` |
| 승인 | 프로젝트 소유자 "G-2 Staging rehearsal 승인" (G-2 적용 · 읽기 전용 확인 · 실패 시 즉시 rollback 만) |
| 승인 커밋 | `c358310c34a7c0c0f541153df990c1349313c003` (saas-v2 · HEAD = origin · clean) |
| Staging | `teachable-art-play3-staging` · ref `itcddooiuqsqingfhxkk` (Production `vpppxuhodwauaclhybtg` 거부 조건 · 해당 없음) |
| 적용 파일 | `supabase/cutover/M3_hq_role_split_sensitive_access.sql` (변경 없음) · `-v g2_app_preflight=passed` · `--single-transaction` · `ON_ERROR_STOP=1` |
| Preview | `dpl_U6pMF5kfaMoxTaenqeMaWXMJkexJ` · preview · Ready · saas-v2 alias (Vercel inspect 만 · `vercel curl` · bypass 비밀 없음) |

## 1. 사전 확인 (모두 PASS 후 적용)

| 확인 | 결과 |
|---|---|
| baseline | branch saas-v2 · HEAD = origin = `c358310` · tree clean · linked ref Staging · migration 37 local = remote (… `20261002095000`) |
| G-2 app preflight | 18/18 PASS (자동 실행 · 적용 직전 runner 가 다시 실행) |
| G-2 DB preflight | `READY (DB) · ESCALATE` · PHASE 08 객체 5/5 · active HQ Sales 1 · active HQ Admin 1 |
| PRE-G2 inventory | 비합성 사용자 0 · cutover audit 0 · `is_soyes_admin` Sales 포함 = true · 구성원 직접 INSERT 열림 = true · 진행 중 수업 0 · `g2_applied` = false |
| PRE-G2 Preview (사람 · 브라우저) | **PASS** — HQ Sales → Sales Shell · HQ Admin → `/admin/leads` · 기관 화면 |

### PRE-G2 Preview 확인 전 발견 · 해소한 선행 문제 (Auth)

첫 PRE-G2 Preview 확인은 FAIL (HQ Sales · HQ Admin 로그인 실패 · 일반 오류 문구). 읽기 전용 진단(09D-AUTH-DIAG):
합성 사용자 4 존재 · 이메일 확인 · 차단 없음 · HQ 역할 정상 · **Staging Auth 로그인 기록 · 세션 · audit 0** (한 번도 로그인된 적 없음) →
원인 = 합성 계정 비밀번호 불일치 (계정은 저장소 밖에서 SQL 로 만들어졌고 비밀번호가 운영자에게 알려져 있지 않았음). Preview 대상 = Staging URL (소유자가 Vercel 에서 확인) · Email provider 사용 중.
해소(09D-AUTH-RESET · 별도 승인): Auth Admin API `updateUserById(id, { password })` 로 합성 4계정 비밀번호만 설정 · 직접 로그인 4/4 PASS ·
역할 · 구성원 · metadata 변경 없음 · 비밀번호 · secret key 는 로컬 숨김 입력만 (기록 없음).

## 2. 적용 방법 (비밀 비노출)

- psql = local Supabase DB 컨테이너(`supabase_db_teachable-art-play3`)의 psql 17 · 대상은 Staging **session pooler** (5432)
- 연결 대상은 입력받지 않고 `supabase/.temp/pooler-url`(비밀번호 없음)에서 만들었다: 사용자 `postgres.<staging-ref>` · `*.pooler.supabase.com` 인지 확인 · Production ref 가 보이면 거부
- DB 비밀번호는 운영자 PowerShell 의 숨김 입력으로만 받아 프로세스 env(`PGPASSWORD`) → `docker exec -e PGPASSWORD`(이름만 전달)로 넘기고 종료 시 삭제 · URL · 비밀번호는 출력 · 파일 · 이력에 없음
- SQL 파일은 `docker cp` 로 원본 그대로 컨테이너에 넣어 실행 후 삭제 (재인코딩 · 수정 없음)
- `DATABASE_URL` · `SUPABASE_DB_URL` · `PG*` env 가 있으면 거부 · 승인 커밋 · clean tree 아니면 거부
- runner 는 적용 직전 app preflight · DB PRE 게이트를 다시 실행하고, 적용 후 필수 post-verify 가 실패하면 **자동 rollback** 하도록 만들었다 (사용되지 않음)
- 임시 runner 는 저장소 밖(세션 scratchpad)에만 있었고 rehearsal 후 삭제했다

### 운영 기록 — runner 이중 실행

runner 가 두 번 실행됐다. 1차 실행이 적용 · post-verify PASS(11:09:39 KST) 를 마칠 무렵 2차 실행이 시작(11:09:36)되어 공용 로그를 새로 쓰면서
1차 실행의 적용 줄이 로그에서 지워졌고, 2차 실행은 PRE 게이트에서 이미 POST-G2 인 상태를 보고 **비밀번호 입력 전에 적용을 거부**했다 (11:11:04 · 설계대로 fail closed).
읽기 전용 조사(09D-STATE-VERIFY)로 확인: G-2 적용 audit **정확히 1건** · rollback 0 · 그 밖의 audit 0 · 1차 실행의 post-verify 출력 파일 존재 · 이중 적용 없음.
→ 다음 cutover runner 는 로그를 실행별 파일로 남기고 동시 실행 lock 을 둔다 (open-items).

## 3. 적용 결과 · 적용 후 확인

| 확인 | 결과 |
|---|---|
| apply | 성공 (single transaction) · G2001 · G2002 · SQL 오류 없음 |
| audit | `cutover.g2_hq_role_split_applied` · 2026-09-29 02:09:16 UTC · reason `G-2 application preflight passed` · file `supabase/cutover/M3_hq_role_split_sensitive_access.sql` · 1건 · rollback 0 |
| `g2_post_verify.sql` | **`G-2 ACTIVE — VERIFIED`** · missing `{}` — `is_soyes_admin_admin_only` · `release_gate_triggers_enabled` · `release_gate_function_present` · `member_direct_insert_closed` · `member_direct_update_closed` · `legacy_member_write_policies_removed` · `membership_rpcs_present` · `membership_guard_audit_triggers_enabled` · `sensitive_tables_rls_enabled` · `media_storage_policy_present` · `g2_applied_audit_latest` 모두 true · `g1_entitlement_gates` 0 |
| POST-G2 inventory | cutover audit 1 · `is_soyes_admin` Sales 포함 = **false** · 구성원 직접 INSERT 열림 = **false** · release gate trigger 2 · 비합성 사용자 0 · 합성 사용자 4 |
| 데이터 변화 | 없음 — 예정 수업 4 · 진행 중 0 · 완료 0 · 출결 · 관찰 · 리포트 · portal · 동의 · 사진 0 · 구성원 2 · 전체 audit 1 (= cutover) |

### HQ Sales (적용 후 · 읽기 전용 catalog + local 증거)

| 대상 | 상태 | 근거 |
|---|---|---|
| legacy 관리자 권한 (`is_soyes_admin`) | 제외 | 함수 정의에 sales 없음 (Staging catalog) |
| 원아 · 관찰 · legacy 리포트 · portal · 아동별 동의 · 사진 metadata · Growth5 | 닫힘 | 민감 표 10개 정책 어디에도 sales 없음 · `is_soyes_admin`(admin 만) · `is_hq_admin`(admin 만) · 기관 staff 정책 (Staging catalog) · 거부 동작 = local `G2_post_cutover` 67/67 |
| 사진 storage · 서명 경로 | 닫힘 | storage SELECT 정책이 `can_read_observation_media_object` 경유 (Staging catalog) · local 67/67 |
| 구성원 쓰기 | 닫힘 | authenticated 의 `organization_members` INSERT · UPDATE · DELETE 권한 없음 · legacy 쓰기 정책 제거 (Staging catalog) |
| 지원 열람 | 닫힘 | local 67/67 (원격 반복 = 쓰기라 하지 않음) |
| lead · 상업 요약 | 유지 | POST-G2 Preview 확인 PASS |
| `/admin/*` | Sales Shell 로 돌아가거나 거부 | POST-G2 Preview 확인 PASS — PHASE 09A 의 `CUTOVER_PENDING`(Sales 가 `/admin` 열람) **Staging 에서 해소** |

### HQ Admin · Teacher · Director

- HQ Admin: active 1 · `is_hq_admin` admin 만 · `/admin/leads` · 기관 운영 화면 정상 (POST-G2 Preview PASS) · 구성원 변경은 audited RPC 만 (catalog · local 67/67)
- Teacher · Director(STARTER): 읽기 전용 화면 정상 · 500 없음 (POST-G2 Preview PASS) · 수업 시작 · 출결 · 리포트 · 사진 · 동의 · 초대 조작 없음

### 사람 확인 (Preview · 브라우저)

| 확인 | 결과 |
|---|---|
| PRE-G2 PREVIEW CHECK | PASS (Auth 비밀번호 설정 후) |
| POST-G2 PREVIEW CHECK | **PASS** |

## 4. G-1 · M5 · J/K/L (적용 후 · 읽기 전용)

| | 상태 |
|---|---|
| G-1 | **NOT APPLIED** · `G1_preflight` = `SAFE TO APPLY M3 CUTOVER` (blocking 0) |
| M5 | **NOT READY** · `M5_preflight` = NOT SAFE (`g2_applied=true` · `g1_applied=false`) · M5 app preflight 2/7 FAIL |
| J/K/L | **DO NOT START** · `JKL_window_preflight` = `READY (DB)` (G-2 적용으로 DB 조건 충족) · `JKL_start_gate` = DO NOT START J (M5 앱 조건 미충족) |

## 5. 원격 쓰기 · Production

| 구분 | 내용 |
|---|---|
| Staging DB | G-2 cutover 1회 (승인) — 정책 · 함수 · 권한 · trigger 정의 변경 + audit 1건. 그 밖의 데이터 쓰기 0 · rollback 0 |
| Staging Auth | 합성 4계정 비밀번호 설정 (09D-AUTH-RESET · 별도 승인) · 확인 로그인 · 사람 Preview 확인 로그인 (세션 · `last_sign_in_at`) |
| Production | **0** (Supabase · Vercel · env · 배포 변경 없음 · `--prod` 없음) |
| Vercel | Deployment Protection 변경 0 · bypass 비밀 생성 0 · `vercel curl` 0 |

기록하지 않은 것: DB 비밀번호 · DB URL · Supabase secret key · 역할 비밀번호 · portal token.

## 6. 현재 Staging 상태

**G-2 ACTIVE — VERIFIED · G-1 NOT APPLIED · M5 NOT APPLIED · J/K/L NOT STARTED.**
Production 은 여전히 PRE-G2 (이 rehearsal 과 무관).
