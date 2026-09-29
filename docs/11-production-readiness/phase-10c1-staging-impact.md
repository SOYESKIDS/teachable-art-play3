# PHASE 10C.1 — Staging 재개 영향 점검 (READ ONLY)

| | |
|---|---|
| 목적 | PHASE 10C migration(`20261002100000_p10c_release_controls.sql`)을 Staging 에 rehearsal 하기 **전**, `suspended → active` 전체 Readiness 재확인이 Staging 운영에 주는 영향을 읽기 전용으로 확인 |
| 대상 | Supabase **Staging `itcddooiuqsqingfhxkk`** (runner 출력 `# target: Supabase Staging itcddooiuqsqingfhxkk`) · Production 접근 없음 |
| 조회 시각 | 2026-09-29 12:54:27 UTC (1차) · 12:55:53 UTC (§H 추가 후 2차 · 같은 결과 + §H) = 21:54 · 21:55 KST |
| 도구 | `supabase/validation/staging_e2e/remote_readonly_query.mjs` (수정 없음) · SQL `supabase/validation/staging_e2e/sql/p10c_staging_impact.sql` (SELECT/WITH 9문장 · `--validate-only` PASS) |
| 안전장치 확인 | 허용 파일만 · SELECT/WITH 만 (쓰기 · `set` · `into` 등 거부) · linked ref = Staging (Production · 제3 프로젝트 거부) · CLI 대상 env 없음 (`SUPABASE_DB_URL` · `DATABASE_URL` 등 unset) · 합성 계정 지문 · 문장마다 `begin transaction read only … rollback` · `--linked` 만 (db-url 인자 없음) · 비밀번호 입력 · 출력 없음 |
| 결과 | **Remote writes = 0 · Staging 변경 0 · Production 변경 0 · migration 적용 없음** |

## 1. 기준 (statement #1)

| 항목 | 값 |
|---|---|
| auth 사용자 | 4 · **합성 아닌 사용자 0** (runner 지문 통과) |
| PHASE 10C RPC `set_capability_release` | **없음** (미적용 확인) |
| `schema_migrations` 20261002100000 | **0 행** (미적용 확인) |

## 2. 계약 · 기관 (A)

| 계약 상태 | 개수 |
|---|---|
| draft | 0 |
| active | 1 |
| **suspended** | **0** |
| ended | 0 |

기관: active 1.

## 3. 정지 계약 (B · C · D · F)

**정지 계약 0건** → 목록 · Readiness · projection · parent_portal 조회 결과 모두 0 행 (statement #4 · #5 · #7).

## 4. 기능 출시 상태 (E · statement #6)

| code | is_released | blocked_by |
|---|---|---|
| class_mode | false | {} |
| weekly_report | false | {} |
| parent_portal | false | {CO-12} |
| ai_assist | false | {AR-8} |
| branding | false | {CO-8} |
| bulk_print · content_playback · director_dashboard · monthly_report · semester_report | false | {} |

변경 없음 (2026-09-28 seed 값 그대로).

## 5. 상품 버전의 parent_portal (G · statement #8)

| 상품 | 버전 | lifecycle | parent_portal 포함 | 계약 수 |
|---|---|---|---|---|
| starter | 2026.1 | published | **예** | 1 |
| standard | 2026.1 | draft | 예 | 0 |
| premium | 2026.1 | draft | 예 | 0 |
| pilot | 2026.1 | draft | 예 | 0 |

## 6. 참고: 유일한 활성 계약이 나중에 정지된다면 (H · statement #9)

| 항목 | 값 |
|---|---|
| contract | `9b9eef88-6e5c-02ba-946a-1db2b34c06be` (STARTER 2026.1 · 합성 UAT 기관) |
| 현재 Readiness | **ready = false** |
| 실패 항목 (DB 반환 그대로) | `feature:class_mode` = `not_released` · `feature:weekly_report` = `not_released` · `feature:parent_portal` = `policy_blocked` (blocked_by `CO-12`) |
| 구조 항목 (class_scope 등) | 실패 없음 → **현재 Staging(PHASE 08 규칙)에서는 정지 후 재개 가능** |
| PHASE 10C 적용 후 projection | **WOULD_NOT_RESUME_AFTER_SUSPEND** (CT005 · 위 3개 항목) |

product_version · class_scope · program_assignment · content · 기관 상태 · pilot 항목은 실패 없음.

## 7. CO-12 영향 (Step 7 · 실제 Staging 증거)

1. 정지된 상품 버전: **해당 없음 (정지 계약 0)**. 참고로 Staging 의 모든 상품 버전(4)과 활성 계약의 STARTER 2026.1 은 `parent_portal` 을 포함한다.
2. `parent_portal` = **미출시 · `blocked_by = {CO-12}`**.
3. CO-12 는 활성 계약의 현재 Readiness 실패 사유 중 하나다 (`feature:parent_portal = policy_blocked`). 정지 계약에 대해서는 해당 없음.
4. PHASE 10C 적용 후 **현재 정지 계약은 없으므로 즉시 막히는 재개는 없다**. 그러나 활성 계약을 정지하면, CO-12 해결 **그리고** class_mode · weekly_report 출시 전까지 재개할 수 없다.

## 8. 영향 분류

**CASE A — NO SUSPENDED CONTRACTS.**
PHASE 10C 재개 규칙이 지금 Staging 에서 작동할 정지 계약 대상은 없다. 이것이 migration 을 자동 승인하지는 않는다.

잠재 영향 (DB 는 상태만 보여 준다 · 의도는 알 수 없다): 직원 UAT 중 누군가 유일한 활성 계약을 **정지 → 재개** 하는 시나리오를 시험하면, 지금은 재개되지만 10C 적용 후에는 재개가 거부된다 (정지 = 사실상 일방향 · 교사 쓰기 읽기 전용 유지).

## 9. HUMAN VERIFICATION REQUIRED

1. 직원 UAT 기간에 Staging 활성 계약(`9b9eef88…`)을 **정지 · 재개할 계획이 있는지** — 있으면 10C Staging 적용 시점을 UAT 이후로 두거나, 정지 시험을 하지 않기로 확인
2. 10C 적용 후 Staging 에서 정지 · 재개 rehearsal 이 필요하면 별도 합성 계약(준비 완료 상태) 준비 방법 결정 — 기능 출시 · CO-12 해제로 해결하지 않는다
3. Production 에서도 같은 효과: CO-12 · class_mode · weekly_report 가 해결되기 전에는 첫 STARTER 계약 활성화 자체가 불가하므로 정지 계약이 생길 수 없다 (활성화 = 같은 Readiness) — 이 판단을 사람이 확인 (**Production 계약 상태는 이번 phase 에서 조회하지 않았다 · ABSOLUTE DENY**)
4. PHASE 10C Staging migration rehearsal 자체의 승인 (이 문서는 증거일 뿐)

## 10. 판정

**STAGING 10C REHEARSAL CANDIDATE — HUMAN APPROVAL STILL REQUIRED**

근거: 정지 계약 0 (CASE A) · 적용 즉시 막히는 운영 경로 없음. 단 §9-1 (UAT 중 정지 · 재개 계획 없음) 확인 전에는 적용하지 않는다. **migration 은 적용하지 않았다.**
