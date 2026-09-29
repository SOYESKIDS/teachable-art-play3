# PHASE 10C — Audited Capability Release + Contract Reactivation Readiness

| | |
|---|---|
| 브랜치 | `phase-10c-release-controls` (source `phase-10b-m5-app-readiness` @ `252c5f5`) · **병합하지 않음** |
| 목적 | PHASE 10A 결함 2건 닫기 — 출시 플래그 직접 UPDATE (SEC-NEW-1) · `suspended → active` Readiness 재확인 없음 (SEC-NEW-2) |
| 결과 | **안전한 출시 경로 local 구현 · 증명** · **재개 Readiness local 수정** |
| 적용 | **local 만. Staging migration 적용 안 함 (별도 승인 필요) · Production 변경 0** |
| 출시 | **어떤 기능도 출시하지 않음** — class_mode · weekly_report `is_released = false` · parent_portal CO-12 blocker 유지 · ai_assist AR-8 · branding CO-8 유지 |

## 1. migration

`supabase/migrations/20261002100000_p10c_release_controls.sql` (additive · 1개)

| 부분 | 내용 |
|---|---|
| 출시 invariant | `trg_platform_capabilities_release_guard` (BEFORE INSERT/UPDATE) — blocker 가 있는 기능은 출시 상태가 될 수 없다 (CP003) · **모든 경로** (RPC · superuser · service role). 이미 출시된 기능에 blocker 를 추가하는 것은 막지 않는다 (blocker 정책 결정은 별도 · Readiness 가 Ready 아님으로 판정) |
| audit | `private.audit_platform_capability_change()` 교체 — **기존 `capability.changed` 이벤트 하나** (중복 없음 · 기존 metadata 키 `code` · `is_released` · `blocked_by` 유지) + `reason` (RPC 사유) · actor (`auth.uid()`) · `released_from` / `released_to` · `blocked_by_from` · `via` |
| RPC | `public.set_capability_release(p_code, p_released, p_reason, p_expected_updated_at)` — SECURITY DEFINER · `search_path=''` · HQ Admin 만 (CP002) · 알 수 없는 코드 · 사유 없음 · 500자 초과 · 필수 값 없음 · 이미 같은 상태 (CP001) · `updated_at` 불일치 (CP004) · blocker (CP003) · `updated_by = auth.uid()` · `updated_at` 은 기존 trigger · anon EXECUTE 없음 |
| 권한 | `revoke update (is_released) on platform_capabilities from authenticated` — `blocked_by` · `note` 권한 · HQ admin RLS 는 그대로 (앱 소비자 0 · blocker 정책 절차 불변) |
| 재개 | `private.enforce_contract_reactivation()` 확장 (trigger `trg_contracts_reactivation_check` 그대로) — HQ Admin 만 (42501) → 구조 항목 CT010 (PHASE 08 그대로) → **활성화와 같은 전체 Readiness (CT005 · 같은 detail 형태 `{ready, items}`)** |

### audit 설계 선택

- 새 이벤트 종류 · 새 컬럼 · `note` 재사용 없음. 기존 audit 인프라(`record_audit_event` · `audit_events.reason` · actor)를 그대로 쓴다.
- 사유는 RPC 가 transaction-local 설정(`soye.capability_release_reason`)으로 trigger 에 넘기고 UPDATE 직후 비운다. 다른 경로(운영자 SQL 등)의 변경도 계속 기록된다 (`via = direct` · reason null) — 기존 동작 손실 없음.
- 한 UPDATE 에 출시 · blocker 가 함께 바뀌어도 이벤트는 하나.

### 재개 Readiness 설계 선택

- `contract_readiness_internal` 은 저장된 행을 읽는다 → BEFORE UPDATE 시점에는 아직 `suspended` 라 `contract` 항목이 항상 실패한다. 그 항목이 **`contract_suspended` 일 때만** 전환 대상(active)으로 본다. 기관 정지(`organization_suspended`)는 그대로 실패.
- 구조 항목 실패는 기존대로 CT010 (더 구체적 · 기존 테스트 유지) · 나머지는 CT005.
- `activated_at` · `activated_by` = 최초 활성화 값 유지 (`enforce_contract_write` 변경 없음) · ended 불변 (CT002) · 기간 겹침 규칙 (CT003) 변경 없음.
- DEC 충돌 없음: DEC-063 은 활성화 조건이며, 재개에 같은 조건을 적용하는 것은 더 엄격한 적용이다. PHASE 08 의 "재개 시 기능 · 콘텐츠 항목은 새로 만들지 않는다" 는 범위 선택(주석)이었고 PHASE 10A 가 SEC-NEW-2 로 결함 판정했다.
- **행동 변화**: 준비 조건(기능 출시 · blocker · 콘텐츠 · 프로그램 배정 · 기관 상태)이 깨진 정지 계약은 다시 시작할 수 없다. 현재 모든 seed 상품이 `parent_portal`(CO-12)을 포함하므로, 이 migration 이 적용된 환경에서는 정지된 계약을 CO-12 해결 전까지 재개할 수 없다 (Staging 적용 전 운영 확인 필요 · §6).

## 2. 앱

| 파일 | 변경 |
|---|---|
| `src/app/admin/(dashboard)/products/actions.ts` | `setCapabilityReleasedAction` → `rpc("set_capability_release", { p_code, p_released, p_reason, p_expected_updated_at })` · 직접 table 접근 제거 · 사유 필수 "출시 · 미출시 변경 사유를 입력해 주세요." · 500자 · `requireAdmin()` 먼저 |
| `src/app/admin/(dashboard)/products/ProductControls.tsx` | 출시 dialog 에 **사유 (필수) textarea** · hidden `expectedUpdatedAt` · 미출시 안내 문구에 "정지 후 다시 시작할 수 없음" |
| `src/app/admin/(dashboard)/products/page.tsx` | `updated_at` 조회 · 전달 · 안내 문구 (활성화 · 재개 · 사유 기록) |
| `src/lib/errors/rpc-errors.ts` | 앱 오류 코드에 `CP` 추가 · `CP004` = 충돌 · `CP002` = 권한 · SQL 원문 비노출 그대로 |

오류 문구 (DB 가 최종 · 앱은 코드가 CP 일 때만 message 사용): 사유 필수 · "다른 곳에서 먼저 변경되었습니다. 새로고침한 뒤 다시 확인해 주세요." (stale) · "정책 결정 대기 중인 기능은 출시할 수 없습니다." (blocker) · 권한 오류는 기존 안전 문구.

## 3. 검증 (local)

| 항목 | 결과 |
|---|---|
| `supabase test db` (clean reset) | **4 files · 279 PASS** (기존 232 + 신규 47) |
| 신규 `p0_phase10c_release_controls.test.sql` | 47/47 — R1~R13 · C14~C21 + 알 수 없는 코드 · 필수 값 · no-op · 중복 audit 없음 · superuser 경로 blocker · 기관 정지 재개 거부 · 재개 audit |
| 기존 테스트 3건 기대값 갱신 | 준비 미충족 fixture 계약(trigger 없이 active 로 넣음)의 재개: `lives_ok` → `throws_ok CT005` (p0_hardening G · p0_phase08_security WS6 · M3_post_cutover) · 이후 검사를 위해 fixture 를 active 로 되돌림. 더 엄격한 기대 · 성공 경로는 신규 파일 C14 (실제 준비된 계약) |
| cutover (local · rollback) | G2_post_cutover 67/67 · M3_post_cutover 70/70 · G1_rehearsal_verify 24/24 · M5_post_cutover 46/46 |
| 앱 테스트 | 신규 `supabase/validation/phase10c/release_controls.test.mjs` 6/6 · PHASE 08 app gates 13/13 · QA fixes 5/5 · harness safety 48/48 |
| local role E2E | **48 PASS · 1 CUTOVER_PENDING (hqSales PRE-G2 · 기대) · 0 FAIL** — 신규: HQ Admin 출시 dialog 사유 필드 확인(열기만 · 제출 없음) · DB 전후 `2\|2\|6\|0…` → `3\|2\|9\|1\|1\|0\|1\|0\|0\|1\|4` (PHASE 10B 와 동일) |
| `M5_app_preflight` | 7/7 PASS |
| `JKL_start_gate` (앱) | READY |
| `G2_app_preflight` (J-ready 빌드) | 기대한 lifecycle FAIL 17/18 · crash 없음 (PHASE 10B.1 · 회귀 아님) |
| lint · tsc · build | 통과 · 통과 · 통과 |

참고: pgTAP 는 clean `db reset` 기준이다. browser smoke seed 를 넣은 뒤 실행하면 데이터 개수 가정이 맞지 않아 기존 파일(p0_security_baseline 등)이 실패한다 — PHASE 10C 와 무관 · reset 후 279/279.

## 4. 하지 않은 것

Staging `db push` · remote migration · remote psql · Staging `platform_capabilities` · contracts 변경 · Production 접근 · G-1 재시도 · M5 · J/K/L · 기능 출시 · blocker 해제 · CO-12 구현 · portal 만료 · rate limit · 콘텐츠 · AI 변경 · `saas-v2` · `main` 변경 · 병합.

## 5. 출시 체크리스트 (초안 · 미승인)

- [class-mode-release-checklist.md](./class-mode-release-checklist.md) — **DRAFT — HUMAN APPROVAL REQUIRED**
- [weekly-report-release-checklist.md](./weekly-report-release-checklist.md) — **DRAFT — HUMAN APPROVAL REQUIRED**

## 6. 남은 blocker · 결정

1. **Staging migration rehearsal 승인** (별도) — 적용 전: Staging 에 정지 계약이 있는지 · 재개 계획이 있는지 확인 (적용 후 준비 미충족 계약은 재개 불가)
2. class_mode · weekly_report 체크리스트 사람 승인 · G-1 / M5 를 출시 전제로 할지 결정
3. **CO-12 OPEN** — parent_portal 차단 유지 · STARTER 활성화 · 재개 불가의 직접 원인
4. 8주 모아보기 수락 테스트 (weekly)
5. G-1 (P09F-AUTH-1) · M5 · J/K/L 미적용 · PHASE 10B 브랜치 병합 승인 전

**Production Ready 아님. Staging 적용 승인 없음. Production 변경 0.**
