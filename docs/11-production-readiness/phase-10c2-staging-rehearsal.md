# PHASE 10C.2 — Staging migration rehearsal (10C release controls)

| | |
|---|---|
| 승인 범위 | `supabase/migrations/20261002100000_p10c_release_controls.sql` **하나**를 Supabase **Staging `itcddooiuqsqingfhxkk`** 에 적용 (Production · G-1 · G-2 재적용 · M5 · J/K/L · 기능 출시 · CO-12 · 계약 정지/재개 · 병합 제외) |
| 브랜치 | `phase-10c-release-controls` (시작 HEAD = origin = `ad3d90a`) · **병합하지 않음** |
| 대상 확인 | `supabase/.temp/project-ref` = `itcddooiuqsqingfhxkk` (적용 직전 재확인) · CLI 대상 env(`SUPABASE_DB_URL` · `DATABASE_URL` · `SUPABASE_PROJECT_ID` · `SUPABASE_PROJECT_REF`) 없음 · runner 출력 `# target: Supabase Staging itcddooiuqsqingfhxkk` |
| 적용 시각 | **2026-09-30 09:02:28 → 09:02:41 UTC** (18:02 KST) |
| 결과 | **10C STAGING REHEARSAL APPLIED AND VERIFIED** · 업무 데이터 변경 0 · UAT 계약 ACTIVE 유지 · **Production 변경 0** |

## 1. 적용 전 상태 (`p10c_staging_impact.sql` 재실행 · READ ONLY)

| 항목 | 값 |
|---|---|
| auth 사용자 | 4 · **합성 아닌 사용자 0** |
| 계약 | draft 0 · **active 1** · **suspended 0** · ended 0 |
| 기관 | active 1 |
| 10C migration 행 | 0 (미적용) |
| `set_capability_release` | 없음 |
| 활성 계약 `9b9eef88-6e5c-02ba-946a-1db2b34c06be` | STARTER 2026.1 · Readiness 실패 = class_mode · weekly_report (not_released) · parent_portal (CO-12) — 10C.1 과 같음 |

## 2. migration queue (`npx supabase@2.113.0 migration list --linked`)

- 적용 전: local 38 · remote 37 — `20260812` … `20261002095000_p08_legacy_share_safety` 까지 local = remote · **pending 은 `20261002100000` 하나**.
- `db reset --linked` · `db push` · `repair` · `squash` · 이력 수동 편집 **없음**.

## 3. 적용

```
npx supabase@2.113.0 migration up --linked      (stdin 닫음 · 비밀번호 입력 · 출력 없음)
Applying migration 20261002100000_p10c_release_controls.sql...
{"applied":[".../20261002100000_p10c_release_controls.sql"],"message":"Migrations applied"}   exit 0
```

적용 후 `migration list --linked`: **38 = 38 · 불일치 0** · 마지막 `20261002100000` local = remote.

## 4. 적용 후 확인 (`sql/p10c_post_apply_verify.sql` · SELECT/WITH 6문장 · READ ONLY)

적용 **전**에도 같은 파일을 실행했다 (대조군: verdict `P10C NOT VERIFIED` · 10C 항목 전부 missing · `authenticated` 의 `is_released` UPDATE 권한 있음).

| # | 확인 | 적용 전 | 적용 후 |
|---|---|---|---|
| 1 | `schema_migrations` `20261002100000` 정확히 1행 | 0 | **PASS** |
| 2 | `public.set_capability_release(text, boolean, text, timestamptz)` 존재 · SECURITY DEFINER | 없음 | **PASS** |
| 3 | `authenticated` EXECUTE | — | **PASS** |
| 4 | `anon` EXECUTE 없음 · PUBLIC EXECUTE 없음 (proacl 확인) | — | **PASS** |
| 5 | `authenticated` 의 `platform_capabilities.is_released` 직접 UPDATE 권한 없음 (anon 도 없음) | 있음 | **PASS (회수됨)** |
| 6 | `trg_platform_capabilities_release_guard` → `private.enforce_capability_release()` (켜짐 · CP003) | 없음 | **PASS** |
| 7 | `trg_platform_capabilities_audit` → `private.audit_platform_capability_change()` (켜짐 · 10C 정의 `capability_release_reason`) | 이전 정의 | **PASS** |
| 8 | `trg_contracts_reactivation_check` → `private.enforce_contract_reactivation()` (켜짐 · 10C 정의 CT005) | 이전 정의 | **PASS** |
| + | private 함수 3개 anon · authenticated EXECUTE 없음 | PASS | **PASS** |
| | **verdict** | `P10C NOT VERIFIED` | **`P10C ACTIVE — VERIFIED` · missing `{}`** |

RPC 는 호출하지 않았다 (catalog 로만 확인 · 시험용 출시 없음).

## 5. 기능 출시 상태 (적용 전 = 적용 후 = role smoke 후)

| code | is_released | blocked_by | updated_at |
|---|---|---|---|
| class_mode | false | {} | 2026-09-28 03:25:08.130728+00 |
| weekly_report | false | {} | 2026-09-28 03:25:08.131736+00 |
| parent_portal | false | {CO-12} | 2026-09-28 03:25:08.131828+00 |
| ai_assist | false | {AR-8} | 2026-09-28 03:25:08.131868+00 |
| branding | false | {CO-8} | 2026-09-28 03:25:08.131896+00 |

## 6. 계약 · 기관 · cutover 상태 (적용 전 = 적용 후 = role smoke 후)

| 항목 | 값 |
|---|---|
| 계약 상태 | draft 0 · **active 1** · suspended 0 · ended 0 |
| UAT STARTER 계약 `9b9eef88…` | **active** · starter 2026.1 · 2026-08-29 ~ 2026-11-27 · class scope 1 · `updated_at` 2026-09-28 04:34:20.895879+00 (변경 없음) |
| 기관 | active |
| 합성 아닌 사용자 | 0 |
| G-2 | **`G-2 ACTIVE — VERIFIED`** (`g2_post_verify.sql` · missing `{}`) |
| G-1 | **NOT APPLIED** (`g1_post_verify.sql` = NOT VERIFIED · entitlement gate trigger 0 · G-1 audit 없음) |
| M5 | **NOT APPLIED** (`class_sessions.status` UPDATE 권한 그대로 · M5 audit 없음) |

## 7. 데이터 불변 (문장 #1 · 행 수 + 행 내용 md5)

적용 전 · 적용 후 · role smoke 후 세 번 모두 **동일**:

| 표 | 행 | md5 |
|---|---|---|
| platform_capabilities | 10 | `d9dd5db8…a036` |
| contracts | 1 | `ee875443…1a24` |
| organizations | 1 | `8324dc6b…2ac8` |
| classes | 1 | `742fab65…94fb` |
| children | 3 | `eacd109a…d21f` |
| class_sessions | 4 | `4ce7feef…f241` |
| class_session_observations | 0 | (empty) |
| reports | 0 | (empty) |
| child_growth_reports | 0 | (empty) |
| audit_events | 1 | (행 수) |

migration 은 schema · 함수 · 권한만 바꿨다. 업무 데이터 변경 **0**.

## 8. 앱 회귀 — Staging role smoke (READ ONLY)

`e2e_roles.mjs --target staging` · **`--allow-staging-writes` 없음 · `SOYE_STAGING_E2E_SESSION_ID` 없음** (쓰기 단계 전부 SKIP) ·
대상 = saas-v2 Preview alias (앱 번들 Supabase = Staging 확인) · 2026-09-30 11:03:57 → 11:05:34 UTC · 비밀번호는 Windows User env → 그 child process 에만 (값 출력 없음).

| 역할 | 결과 |
|---|---|
| auth | `/login` · `/admin/login` 초기 오류 없음 PASS · 실패 로그인 시험 SKIP (Staging 에서는 하지 않음) |
| Teacher | 로그인 → `/teacher` · h1 오늘의 수업 · V2 화면 AI UI 없음 · console/네트워크 오류 없음 **PASS** · 수업 흐름 SKIP (대상 수업 없음 · 읽기 전용) |
| Director | 로그인 → `/director/sessions` · 홈 없음 · `/director` not-entitled · 누락 자동 탐지 없음 · 일괄 인쇄 없음 · 수업 이력 · 완료 Weekly · portal 동의 select · 오류 없음 **PASS** · 링크 발급 SKIP (쓰기) |
| Parent | 잘못된 token → 일반 문구 PASS · 발급 링크 시험 SKIP |
| HQ Admin | 로그인 → `/admin/leads` · 기관 목록 · readiness · products/capabilities · 기관 상세 · 오류 없음 **PASS** |
| HQ Admin | 출시 dialog 사유 필드 — **FAIL (기대 · 회귀 아님)**: 이 브랜치의 10C UI 확인을 **saas-v2 Preview(10C 앱 코드 없음)** 에 실행했다. dialog 는 열고 취소만 했다 (제출 없음) |
| HQ Sales | 로그인 → `/sales/leads` · 상업 요약(원아 이름 열 없음) · `/admin/organizations` → `/sales` redirect (G-2 적용 상태) **PASS** |
| **합계** | **PASS 25 · SKIP 5 · FAIL 1 (위 기대 FAIL)** · 브라우저 profile 삭제 |

smoke 후 데이터 지문 · 계약 · 기능 · cutover 상태 재확인: **동일** (§5 · §6 · §7).

### Preview 호환 (기록)

- saas-v2 Preview 의 HQ 출시 토글은 아직 `platform_capabilities.is_released` **직접 UPDATE** 다. 10C 적용 후 Staging 에서 이 경로는 **permission denied** 로 실패한다 (의도된 fail-closed). RPC 경로 앱 코드(이 브랜치)가 배포되기 전까지 Staging 에서 출시 토글은 쓸 수 없다 — 이번 승인 범위에서 출시는 금지이므로 운영 영향 없음.
- 10C 재개 규칙: 활성 UAT 계약을 정지하면 CO-12 · class_mode · weekly_report 해결 전까지 재개할 수 없다 (10C.1 §8) — **직원 UAT 에서 정지 시험 금지** 유지.

### harness 수정 (사람 승인 · 2026-09-30)

첫 실행은 로그인 전 `REFUSE TO RUN — 앱 번들에서 Supabase project ref 를 찾지 못했다` (exit 3 · 로그인 · 쓰기 없음) 로 멈췄다.
원인: saas-v2 `/login` 은 server action 로그인이라 브라우저 Supabase client 가 번들에 없다 (공개 첫 화면 `/` 의 문의 form 번들에만 `itcddooiuqsqingfhxkk.supabase.co`).

| 파일 | 변경 |
|---|---|
| `guards.mjs` | `BUNDLE_REF_PATHS = ["/login", "/"]` · `bundleTextsScript()` (같은 origin GET 만 · `/_next/` script) · **`assertBundleProjectRef` 판정 규칙 변경 없음** (찾은 ref 전부 Staging · 없음 · Production · 그 밖 = 거부) |
| `e2e_roles.mjs` · `ui_audit.mjs` | inline 수집식 → `bundleTextsScript()` |
| `preview_probe.mjs` | 번들 ref 를 `BUNDLE_REF_PATHS` 전부에서 찾음 (결과 `bundle_supabase_project = itcddooiuqsqingfhxkk` · `app_level = CHECKED`) |
| `tests/harness_safety.test.mjs` | 신규 1건 (경로 고정 · 같은 origin GET · /login 무 ref + / Staging = 통과 · / 무 ref · Production · 혼합 = 거부) · **49/49 PASS** |

## 9. local 회귀

| 항목 | 결과 |
|---|---|
| `M5_app_preflight` | **7/7 PASS** |
| `JKL_start_gate` (앱) | **READY** |
| `G2_app_preflight` (J-ready 빌드) | 17/18 · 기대한 lifecycle FAIL · crash 없음 (회귀 아님) |
| harness safety | 49/49 |
| `npm run lint` · `npx tsc --noEmit` | 통과 · 통과 |

## 10. 변경 범위

| 대상 | 변경 |
|---|---|
| Staging `itcddooiuqsqingfhxkk` | **10C migration 1개만** (schema · 함수 · 권한) · 업무 데이터 0 · 로그인 세션 기록(합성 계정)만 |
| Production `vpppxuhodwauaclhybtg` | **0 (접근 없음)** |
| Vercel | 0 |
| git | 이 문서 · `phase-10c-release-controls.md` 상태 · `sql/p10c_post_apply_verify.sql` · harness bundle-ref 수정 · `saas-v2` · `main` 변경 없음 |

## 11. 하지 않은 것

G-1 재시도 · M5 · J/K/L · class_mode · weekly_report 출시 · CO-12 해제 · 계약 정지 · 재개 · 종료 · 상품 버전 · class scope 변경 · RPC 호출 · Staging 쓰기 E2E · Production 접근 · 병합.

## 12. 판정

**PHASE 10C STAGING REHEARSAL PASS — RELEASE CONTROLS VERIFIED**

다음 단계(G-1 · M5 · J/K/L · 기능 출시 · CO-12 · 병합 · Production)는 별도 승인.
