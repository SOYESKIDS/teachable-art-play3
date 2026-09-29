# PHASE 09C — G-2 Staging Rehearsal Plan (준비만 · 실행하지 않음)

| | |
|---|---|
| 대상 | Staging Supabase `itcddooiuqsqingfhxkk` 만 · Production 은 이 계획의 대상이 아니다 |
| cutover | G-2 = `supabase/cutover/M3_hq_role_split_sensitive_access.sql` (HQ Admin / Sales 분리 · HQ 민감 blanket SELECT 제거 · 원장 AI 초안 접근 제거 · PHASE 08 §5 구성원 직접 쓰기 회수 · §6 AI 초안 저장 gate) |
| 되돌리기 | `supabase/cutover/M3_hq_role_split_rollback.sql` (정의만 복원 · 데이터 변경 없음) |
| 상태 | PHASE 09C 작성 · **PHASE 09D 에서 이 계획대로 Staging 에 적용 (2026-09-29 11:09 KST) → `G-2 ACTIVE — VERIFIED`** · 결과: [phase-09d-g2-rehearsal-result.md](./phase-09d-g2-rehearsal-result.md) · Production 미적용 |
| 근거 | runbook [../07-implementation/cutover-runbook.md](../07-implementation/cutover-runbook.md) §3 · §5 · PHASE 08 [../08-security-hardening/cutover-readiness.md](../08-security-hardening/cutover-readiness.md) |

## 1. 전제 조건 (모두 충족해야 시작)

| # | 조건 | 09C 확인 결과 |
|---|---|---|
| P1 | 브랜치 · HEAD 가 승인된 커밋 (Preview 에 배포된 커밋과 같음) | 09C 작업 트리 기준 `99f10a7` + 미커밋 QA 수정 — **09C 변경을 커밋 · Preview 재배포한 뒤** 그 커밋으로 다시 확인 |
| P2 | 일반 migration 37 local = remote (… `20261002095000`) | PASS (`migration list`) |
| P3 | `node supabase/cutover/G2_app_preflight.mjs` 18/18 | PASS 18/18 |
| P4 | `G2_db_preflight.sql` (읽기 전용) = `READY (DB) · ESCALATE` · PHASE 08 객체 5종 true | PASS — active HQ Sales **1** · active HQ Admin 1 · 객체 5/5 |
| P5 | Staging DB 비합성 사용자 0 (지문) | PASS (0) |
| P6 | 진행 중(in_progress) 수업 0 | PASS (0 · JKL_window_preflight #3) |
| P7 | 배포된 Preview 가 PHASE 07/08 앱(`/sales` Shell · Sales 로그인 분기 · HQ 메타데이터 RPC)인지 **사람이 확인** | **BLOCKED** — Preview 가 Vercel SSO 뒤 (자동 확인 불가 · bypass 비사용 결정). 운영자가 Vercel 로그인 브라우저로 `/admin/login` → Sales 계정 → `/sales` 착지 확인 |
| P8 | psql + Staging **직접 DB 연결 문자열** (운영자 로컬에만) | **PRECONDITION** — 이 PC 에 psql 없음(local Docker 컨테이너 안에만) · 연결 문자열 env 없음. 아래 §3 주의 |
| P9 | 롤백 담당 · 시간창 · 연락 채널 지정 (사람) | 미정 |
| P10 | local 증거: `G2_post_cutover.test.sql` (적용 · rollback · 재적용 · transaction rollback) | PASS **67/67** (09C.1 · Sales 사진 · Growth5 · portal · 동의 거부 + 대조군 + 확인 SQL 판정 5 상태 추가 · 09C 는 47) |
| P11 | 적용 후 읽기 전용 확인 SQL `supabase/validation/staging_e2e/sql/g2_post_verify.sql` (harness 허용 목록 · `--validate-only` 1 문장 valid) | 준비됨 (09C.1) · Staging PRE 상태에서는 `G-2 NOT VERIFIED` 가 정상 |

## 2. 운영자 확인 (적용 직전 · 순서대로)

1. `git rev-parse HEAD` = 승인 커밋 · 작업 트리 clean
2. `cat supabase/.temp/project-ref` = `itcddooiuqsqingfhxkk` (다르면 중단)
3. `node supabase/cutover/G2_app_preflight.mjs` → `18/18 PASS`
4. `node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/cutover/G2_db_preflight.sql supabase/validation/staging_e2e/sql/staging_inventory.sql`
   → verdict `READY (DB) · ESCALATE` · `non_synthetic_users = 0` · `cutover_audit_events = 0` · `pre_g2_is_soyes_admin_includes_sales = true`
5. Preview 에서 HQ Sales 로그인 → `/sales/leads` 착지 · HQ Admin 로그인 → `/admin/leads` (사람 · 브라우저)
6. 연결 문자열이 **Staging** host 인지 눈으로 확인 (Production ref `vpppxuhodwauaclhybtg` 가 보이면 즉시 중단)

## 3. 적용 명령 (실행하지 않음 · 승인 후 운영자)

```
# 연결 문자열은 운영자 터미널에만 · 파일 · 채팅 · 로그에 남기지 않는다
# ★ DATABASE_URL · SUPABASE_DB_URL 로 export 하지 않는다 — staging_e2e guard 가 그 env 를 보면 REFUSE 한다 (의도된 동작)
psql "<STAGING_DIRECT_DB_URL>" --single-transaction -v ON_ERROR_STOP=1 -v g2_app_preflight=passed \
  -f supabase/cutover/M3_hq_role_split_sensitive_access.sql
```

- `-v g2_app_preflight=passed` 가 없으면 **G2001** 로 중단 (데이터 변경 없음)
- PHASE 07/08 선행 함수가 없으면 **G2002** 로 중단
- `--single-transaction` + `ON_ERROR_STOP=1` — 한 문장이라도 실패하면 전체 rollback
- `supabase db query --linked` 로는 실행할 수 없다 (파일이 psql meta-command `\if` · `:'var'` 를 쓴다)

## 4. 기대 audit event

| 시점 | event_type | 기타 |
|---|---|---|
| 적용 | `cutover.g2_hq_role_split_applied` | target_type `cutover` · reason `G-2 application preflight passed` · metadata `{file: supabase/cutover/M3_hq_role_split_sensitive_access.sql}` |
| rollback | `cutover.g2_hq_role_split_rolled_back` | reason `G-2 rollback` · metadata `{file: supabase/cutover/M3_hq_role_split_rollback.sql}` |

## 5. 적용 직후 DB 확인 (읽기 전용 · `remote_readonly_query.mjs`)

**보안 · release gate 객체 확인 (PHASE 09C.1 · 필수 · 읽기 전용 catalog 조회만):**

```
node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/g2_post_verify.sql
```

| 열 | 적용 후 기대 | 의미 |
|---|---|---|
| `is_soyes_admin_admin_only` | true | legacy `is_soyes_admin()` 이 admin 만 (Sales 제외) |
| `release_gate_triggers_enabled` | true | AI 초안 release gate trigger 2개가 있고 **켜져 있음** (`tgenabled = 'O'`) |
| `release_gate_function_present` | true | `private.gate_ai_draft_release()` |
| `member_direct_insert_closed` · `member_direct_update_closed` | true · true | authenticated 의 organization_members 직접 INSERT · UPDATE 권한 없음 |
| `legacy_member_write_policies_removed` | true | `members insert/update by soyes admin` 정책 없음 |
| `membership_rpcs_present` · `membership_guard_audit_triggers_enabled` | true · true | audited RPC 2개 · guard/audit trigger 켜짐 |
| `sensitive_tables_rls_enabled` | true | 원아 · 관찰 · 사진 · Growth5 · 리포트 · portal · 동의 · 구성원 표 10개 RLS |
| `media_storage_policy_present` | true | 사진 storage SELECT 가 서명 판정 함수를 거침 |
| `g2_applied_audit_latest` | true | 가장 최근 G-2 audit = `cutover.g2_hq_role_split_applied` |
| `g1_entitlement_gates` (정보) | 0 | G-2 는 G-1 을 설치하지 않는다 |
| `missing` | `{}` | 빠진 항목 목록 |
| **`verdict`** | **`G-2 ACTIVE — VERIFIED`** | 하나라도 false 면 `G-2 NOT VERIFIED — …` → §11 중단 조건 (rollback 검토) |

적용 전(PRE-G2) 기대: `G-2 NOT VERIFIED` · missing = `is_soyes_admin_admin_only · release_gate_triggers_enabled · release_gate_function_present ·
member_direct_insert_closed · member_direct_update_closed · legacy_member_write_policies_removed · g2_applied_audit_latest` (local PRE 에서 확인).
이 판정은 local `G2_post_cutover.test.sql` 이 PRE · 적용 · rollback · 재적용 · **trigger disable** 다섯 상태에서 검증한다.

| 확인 | 기대 |
|---|---|
| `staging_inventory.sql` · `cutover_audit_events` | 1 |
| 〃 `pre_g2_is_soyes_admin_includes_sales` | **false** (`is_soyes_admin()` = admin 만) |
| 〃 `pre_g2_member_direct_insert_open` | **false** (authenticated 의 organization_members INSERT/UPDATE 회수) |
| `G1_preflight.sql` | 여전히 `SAFE TO APPLY` (G-2 는 G-1 을 설치하지 않는다 · `g1_gates = 0`) |
| `JKL_window_preflight.sql` #1 | `g2_applied = true` · verdict 는 M5 앱 조건 때문에 여전히 시작 불가 (J/K/L 은 별도) |
| `M5_preflight.sql` | 여전히 NOT SAFE (G-1 미적용) |


## 6. HQ Admin 목표 동작 (적용 후 · 사람 smoke)

- `/admin/login` → `/admin/leads` · 기관 목록 · 기관 상세 · 상품 · Readiness 정상
- 기관 운영 메타데이터(원아 이름 · 반) 유지 · 관찰 본문 · 사진 · AI 초안 · 리포트 본문은 **직접 조회 안 됨** (메타데이터 RPC 만)
- 지원 열람은 사유 필수 · audit 기록
- 구성원 변경 확인 (DB 판정 · local 증거 · Staging 에서는 쓰기 E2E 가 아니므로 사람 승인 없이 실행하지 않는다):

| HQ Admin 확인 | 기대 | local 증거 |
|---|---|---|
| audited membership RPC | 성공 · audit `via = rpc` · 사유 기록 | G2_post `HQ Admin audited membership RPC still works` · `audited change RPC succeeds` · `RPC membership add / change audited with reason` |
| 직접 membership DML (INSERT · UPDATE) | 42501 거부 | G2_post `HQ Admin direct membership INSERT closed` · `direct organization_members UPDATE denied` · 확인 SQL `member_direct_*_closed` |
| self-grant | MB003 거부 | `p0_phase08_security` WS1 (RPC · 직접 INSERT) |
| 마지막 활성 원장 비활성화 | MB006 거부 | `p0_phase08_security` WS1 (RPC · 직접 UPDATE) |

- **초대 제출은 rehearsal smoke 에서 하지 않는다** (실제 메일 발송)

## 7. HQ Sales 목표 동작 (적용 후 · 사람 smoke)

- `/admin/login` → `/sales/leads` · `/sales/organizations` 상업 요약 정상
- `/admin/*` 접근 → `/sales` 로 돌아가거나 권한 없음 (PRE-G2 의 `CUTOVER_PENDING` 이 **해소**되어야 한다)
- **HQ Sales 거부 확인 (적용 후 · 모두 DB 판정으로 local 증거 있음 · §8):**

| HQ Sales 거부 대상 | 기대 | local 증거 (G2_post_cutover) |
|---|---|---|
| 원아 상세 | 0 행 | `N-3` · `J: Sales cannot read children` |
| 관찰 | 0 행 | `N-3` · `J: Sales cannot read observations` |
| 리포트 | 0 행 | `Sales cannot read legacy growth reports` (V2 리포트는 `is_hq_admin` 정책) |
| portal · token | 0 행 | `09C.1: Sales cannot read child portal rows` (token 원문은 저장 안 함) |
| 아동별 동의 | 0 행 | `09C.1: Sales cannot read per-child consent` |
| 구성원 쓰기 | 42501 | `HQ Sales membership RPC denied` · `direct self-grant closed` · INSERT/UPDATE denied |
| **사진 · media** | metadata 0 행 · storage object 0 · 서명 판정 false | `09C.1: Sales cannot read photo metadata` · `… photo objects (storage RLS)` · `… sign observation photos (media access path)` (PRE-G2 에서는 metadata 1 행 = G-2 가 닫는 노출) |
| **Growth5** | 0 행 | `09C.1: Sales cannot read Growth5 selections` (PRE-G2 에서도 0 · 교사 · 원장 대조군 1) |
| 지원 열람 | 42501 | `Sales cannot use support access` |

- 자동 확인: `e2e_roles.mjs --target staging` 의 hqSales 단계 — `PRE-G2: /admin/organizations reachable` 가 **PASS(redirect to /sales)** 로 바뀐다 (Preview SSO 와 비밀번호 준비 필요)

## 8. Post-G2 목표 매트릭스 (TARGET IMPLEMENTED · CUTOVER PENDING)

**아직 활성 상태가 아니다.** G-2 적용 전 Staging 은 PRE-G2 (Sales 가 legacy `is_soyes_admin` 으로 legacy 아동 기록을 읽을 수 있음 · ESCALATE).

| 대상 | HQ Sales (post-G2) | 근거 | 상태 |
|---|---|---|---|
| 원아 상세 (`children`) | 없음 | G2_post `N-3` · `J: Sales cannot read children` | TARGET IMPLEMENTED · CUTOVER PENDING |
| 관찰 (`class_session_observations`) | 없음 | G2_post `N-3` · `J` | 〃 |
| Growth5 (`observation_growth_selections`) | 없음 | 정책 = 기관 staff 만 · G2_post `09C.1: Sales cannot read Growth5 selections` + PRE-G2 0 + 교사 · 원장 대조 1 | 이미 닫힘 · **명시 assertion 있음 (09C.1)** |
| 사진 (관찰 사진 metadata · storage object · 서명 경로) | 없음 | G2_post `09C.1` 3종 (metadata · storage RLS · `can_read_observation_media_object`) · PRE-G2 metadata 1 → 적용 후 0 · rollback 시 다시 1 · 교사 대조 storage 1 | TARGET IMPLEMENTED · CUTOVER PENDING · **명시 assertion 있음 (09C.1)** |
| 리포트 (legacy `child_growth_reports` · V2 `reports`/`report_revisions`) | 없음 | legacy = G2_post `G-2: Sales cannot read legacy growth reports` · V2 = `is_hq_admin()` (admin 만 · PRE-G2 에서도 Sales 없음) | legacy: CUTOVER PENDING · V2: 이미 닫힘 |
| portal token (`child_portals`) | 없음 | `is_hq_admin()` 정책 · G2_post `09C.1: Sales cannot read child portal rows` · token 원문은 저장하지 않음 | 이미 닫힘 · 명시 assertion 있음 |
| 아동별 동의 (`child_media_consents`) | 없음 | `is_hq_admin()` 정책 · G2_post `09C.1: Sales cannot read per-child consent` · 원장 대조 1 | 이미 닫힘 · 명시 assertion 있음 |
| 구성원 쓰기 | 없음 | G2_post `HQ Sales membership RPC denied` · `direct self-grant closed` · INSERT/UPDATE denied | TARGET IMPLEMENTED · CUTOVER PENDING |
| lead · 상업 요약 | 유지 | G2_post `Sales keeps lead access` · `keeps the commercial summary` | 〃 |
| 지원 열람 | 없음 | G2_post `Sales cannot use support access` | 〃 |

| 대상 | HQ Admin (post-G2) | 근거 | 상태 |
|---|---|---|---|
| 구성원 변경 | audited RPC 만 | G2_post `HQ Admin direct membership INSERT closed` · `direct UPDATE denied` · `audited change RPC succeeds` · audit `via rpc` | TARGET IMPLEMENTED · CUTOVER PENDING |
| 직접 membership DML | 거부 | G2_post (위) · `authenticated has no direct organization_members INSERT/UPDATE` | 〃 |
| self-grant | 금지 | `p0_phase08_security` WS1 MB003 (RPC · 직접 INSERT 모두 · PRE-G2 에서도) | RPC 경로는 이미 강제 · 직접 경로는 G-2 로 닫힘 |
| 마지막 활성 원장 | 보호 | `p0_phase08_security` WS1 MB006 (RPC · 직접 UPDATE) | 이미 강제 |
| 관찰 · 사진 blanket SELECT | 없음 (지원 열람 · 사유 · audit) | G2_post `N-4` · `J` · photo metadata · sign · support reason/audit | TARGET IMPLEMENTED · CUTOVER PENDING |

## 9. Rollback 명령 (실행하지 않음)

```
psql "<STAGING_DIRECT_DB_URL>" --single-transaction -v ON_ERROR_STOP=1 -f supabase/cutover/M3_hq_role_split_rollback.sql
```

- 정의만 복원 (`is_soyes_admin` admin+sales · legacy 정책 · 구성원 직접 grant · AI 초안 gate 제거) · 데이터 변경 없음
- 되돌리면 **PRE-G2 노출(Sales 의 legacy 아동 기록 조회 · 구성원 직접 쓰기)이 다시 열린다** — 장애 대응용 · 되돌린 상태로 오래 두지 않는다

## 10. Rollback 후 확인

| 확인 | 기대 |
|---|---|
| `cutover_audit_events` | 2 (applied + rolled_back) |
| `pre_g2_is_soyes_admin_includes_sales` | true |
| `pre_g2_member_direct_insert_open` | true |
| AI 초안 release gate trigger | 0 |
| `g2_post_verify.sql` | `G-2 NOT VERIFIED` · missing 에 `release_gate_triggers_enabled` · `g2_applied_audit_latest` 포함 (local 증거) |
| `G2_db_preflight.sql` | `READY (DB) · ESCALATE` (적용 전과 같음) |
| local 동등 증거 | `G2_post_cutover.test.sql` 이 transaction 안에서 rollback → 재적용까지 확인 (67/67 · 09C.1) |

## 11. 중단 조건 (하나라도 해당하면 적용하지 않거나 즉시 rollback)

- project ref ≠ `itcddooiuqsqingfhxkk` · 연결 문자열에 Production ref · host
- 비합성 사용자 > 0 · `cutover_audit_events` ≠ 0 (적용 전)
- `G2_app_preflight` < 18/18 · `G2_db_preflight` 가 `NOT READY`
- in_progress 수업 > 0 (적용 전)
- 배포된 Preview 가 `/sales` 분기를 갖지 않음 (P7 미확인)
- psql 이 G2001 · G2002 · 기타 오류 (single transaction 이므로 변경 없음 — 원인 확인 전 재시도 금지)
- 적용 후 HQ Admin 이 `/admin/leads` · 기관 화면을 못 씀 · 교사 · 원장 V2 화면 오류 · 원장이 자기 기관 사진을 못 봄 → rollback
- 적용 후 Sales 가 원아 · 관찰 · 리포트를 여전히 읽음 → rollback 후 원인 조사 (SEV-1)
- G-1 · M5 를 같은 창에서 적용하려는 시도 (별도 승인 · 별도 계획)
