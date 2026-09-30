# class_mode 출시 체크리스트 (PHASE 10D · 승인용)

> **NOT APPROVED — 출시하지 않는다.** 이 문서는 승인 판단을 위한 증거 목록이다. `is_released` 는 `false` 그대로다.
> 출시(플래그 전환)는 `public.set_capability_release('class_mode', true, <사유>, <updated_at>)` 로만 한다 (PHASE 10C · Staging 적용 · 확인 완료).
> 순서: 아래 **BLOCKED · HUMAN APPROVAL REQUIRED 항목 해소 → 사람 승인 → Staging 출시 rehearsal (별도 승인) → Production**.

| | |
|---|---|
| 대상 | `platform_capabilities.class_mode` — 2026-09-30 Staging 읽기 전용 확인: `is_released = false` · `blocked_by = {}` |
| 근거 | DEC-063 (약속 기능 전체 Ready 여야 활성화) · [class-mode-readiness.md](./class-mode-readiness.md) · [phase-10d-starter-release-readiness.md](./phase-10d-starter-release-readiness.md) |
| 출시의 효과 | 계약 Readiness 의 `feature:class_mode` 항목만 충족 — 런타임 쓰기 권한(`class_write_allowed`)은 바뀌지 않는다 (pgTAP R13) |
| 상태 표기 | **PASS** = 객관 증거 있음 · **FAIL** = 기준 미충족 · **HUMAN APPROVAL REQUIRED** = 사람 판단 · 확인만 남음 · **BLOCKED BY &lt;code&gt;** = 다른 항목 해소 전 판정 불가 |
| 승인자 · 승인일 | (없음) |

## 판정 요약

| PASS | FAIL | HUMAN APPROVAL REQUIRED | BLOCKED |
|---|---|---|---|
| 15 | 0 | 5 | 4 (BC-3 · G-1 · M5 · P10C-PROD) |

**현재 결론: 출시 불가 — BLOCKED 4 · 사람 승인 5 남음.**

## 1. 권한 (authorization)

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 1 | 수업 시작 권한 | 담당 교사 · 예정 상태 · BEFORE 확인 · `class_write_allowed(…,'class_mode')` ∧ `class_week_entitled` (SS005) | `20261002092000_p08_session_start_authority.sql` · pgTAP `p0_phase08_security` 86/86 (2026-09-30 local) | **PASS** |
| 2 | 담당 반만 | 다른 반 교사 · 다른 기관 쓰기 거부 (RLS · RPC) | pgTAP `p0_hardening` 116/116 · `p0_security_baseline` 30/30 (2026-09-30 local) | **PASS** |
| 3 | 출시 권한 | 출시 · 미출시 = HQ Admin 만 (CP002) · 사유 필수 · 동시성 (CP004) · blocker DB 강제 (CP003) · `authenticated` 직접 UPDATE 회수 | pgTAP `p0_phase10c_release_controls` 47/47 · **Staging `P10C ACTIVE — VERIFIED`** (PHASE 10C.2 · 2026-09-30 재확인) | **PASS** |

## 2. 계약 · 기관 · 반 범위

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 4 | 계약 entitlement | 유효 계약 · 상품 기능에 class_mode 포함일 때만 쓰기 | `M3_post_cutover` 70/70 · `p0_hardening` (2026-09-30 local) | **PASS** |
| 5 | 주차 entitlement | 상품 버전 week 범위 밖 차시 거부 (STARTER 9주 거부 · SS005/EN002) | `M3_post_cutover` · `production_shaped/03_validation.test.sql:321` | **PASS** |
| 6 | 기관 상태 | 정지 기관 = 쓰기 거부 · 재개 Readiness 거부 | `p0_hardening` · `p0_phase10c_release_controls` (기관 정지 재개 거부) | **PASS** |
| 7 | 반 범위 | 계약 반(`contract_classes`)만 · 반 수 한도 (CT010) | `p0_phase08_security` · `p0_phase10c` C 그룹 | **PASS** |
| 8 | 정지 후 재개 | 재개 = 활성화와 같은 Readiness (CT005) | `p0_phase10c_release_controls` C14~C21 · Staging 적용 확인 (10C.2) | **PASS** |
| 9 | 계약 범위 쓰기 gate (G-1) | 수업 일정 · 기록 쓰기의 계약 gate (EN002) · legacy 공유 쓰기 표면 gate 는 **G-1 에만** 있다 | local `G1_rehearsal_verify` 24/24 · **Staging G-1 NOT APPLIED** (P09F-AUTH-1 · 2026-09-30 확인) | **BLOCKED BY G-1** (JUDGEMENT: 출시 전제 · 사람이 면제 결정 가능) |
| 10 | legacy 직접 쓰기 회수 (M5) | legacy 직접 status UPDATE 경로 없음 (P08-OPEN-1) | 앱 `M5_app_preflight` 7/7 · `M5_post_cutover` 46/46 (local) · **Staging M5 NOT APPLIED** | **BLOCKED BY M5** (JUDGEMENT: M5 후 출시) |

## 3. 교사 · 원장 경험

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 11 | 수업 흐름 (local) | BEFORE → 시작 → 관찰 · Growth5 · 메모 → 마치기 · 오류 0 | local role E2E 48 PASS (PHASE 10C) | **PASS** |
| 12 | Staging 화면 (읽기) | 교사 · 원장 로그인 · 오늘의 수업 · AI UI 없음 · 원장 STARTER 화면 · 오류 0 | Staging read-only role smoke 25 PASS (PHASE 10C.2 · 2026-09-30) | **PASS** |
| 13 | Growth5 의미 | 5개 지표 · stage 텍스트 · 선택 안 함 = 기록 없음 · 점수 · 순위 · 진단 아님 · AI 가 고르지 않음 | GM005 · DEC-065 · `20261001092000…:427-430` · PHASE 10D 문구 검사 | **PASS** |
| 14 | 필수 콘텐츠 | 약속 주차(W1~8) 게시 차시 + 필수 section 11개 (SS008 · Readiness content) | PHASE 10E: 원본 W1~W8 canonical 적재 · local Readiness content ok (pgTAP 10E R4) · **사람 콘텐츠 승인 전 · Staging 은 여전히 합성 "(가상)" 차시** | **BLOCKED BY BC-3** (TECHNICALLY READY — HUMAN CONTENT APPROVAL REQUIRED) |
| 15 | Staging 수업 흐름 (쓰기) · 직원 UAT | 실제 사람이 Staging 에서 수업 시작 → 마치기를 수행하고 결과 기록 | 직원 UAT 기록 = 읽기 · 화면 이동만 (`docs/10-employee-uat/role-test-matrix.md:7`) · 쓰기 흐름 UAT 기록 없음 | **HUMAN APPROVAL REQUIRED** |

## 4. DB · RLS · audit · rollback

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 16 | DB · RLS 회귀 | 전체 pgTAP · cutover 테스트 통과 | 2026-09-30 local: `supabase/tests` 5 files **301/301** · G1 24 · G2 67 · M3 70 · M5 46 | **PASS** |
| 17 | 출시 audit | 출시 · 미출시 = `capability.changed` · reason · actor · released_from/to | pgTAP R10 · R11 · Staging audit trigger 10C 정의 확인 (10C.2) | **PASS** |
| 18 | 수업 복구 audit | 진행 중 정리 · 사유 · `session.recovery_completed` | `p0_hardening` | **PASS** |
| 19 | 출시 되돌리기 | `set_capability_release('class_mode', false, <사유>, <updated_at>)` · audit 남음 · 진행 중 수업은 복구 RPC | pgTAP R12 (release → unrelease) · 절차 §5 | **PASS** (local) |
| 20 | Staging 출시 · 미출시 rehearsal | Staging 에서 한 번 출시 → Readiness 확인 → 미출시 · audit 2건 | 수행하지 않음 (출시 금지 범위) | **HUMAN APPROVAL REQUIRED** (별도 승인 후 수행) |

## 5. Production · 결정

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 21 | Production 10C | Production 에 10C migration (audited 출시 경로) 적용 · 확인 | Production 접근 없음 · 미적용 | **BLOCKED BY P10C-PROD** |
| 22 | STARTER 활성화 의미 | class_mode 만 출시해도 STARTER 는 weekly_report · parent_portal(CO-12) 없이 활성화 불가 — 이를 알고 출시 | Staging Readiness: `feature:parent_portal = policy_blocked (CO-12)` | **HUMAN APPROVAL REQUIRED** |
| 23 | 교사 계정 자격증명 | 노출됐던 `staging-teacher@example.test` 비밀번호를 새 값으로 재설정했는지 | 저장소로 증명 불가 | **HUMAN APPROVAL REQUIRED** (TEACHER CREDENTIAL ROTATION: HUMAN CONFIRMATION REQUIRED) |
| 24 | 최종 승인 | 승인자 · 날짜 · 사유 기록 | 없음 | **HUMAN APPROVAL REQUIRED** |

## 6. 출시 · 되돌리기 절차 (승인 후에만)

1. HQ Admin 로그인 → 상품 · 기능 화면 → class_mode `출시` → **사유 입력(필수)** → 확인. 화면은 `updated_at` 을 함께 보내 동시 변경을 막는다 (CP004).
2. 확인: `platform_capabilities.class_mode.is_released = true` · `audit_events` 에 `capability.changed` (reason · actor · `released_from=false` · `released_to=true`) 1건.
3. 되돌리기: 같은 화면에서 `미출시로 변경` + 사유 → audit 1건 추가. 이미 유효한 계약 · 진행 중 수업은 영향 없음 (런타임 권한 불변 · R13). 진행 중 수업 정리는 원장 복구 흐름(사유 · audit).
4. 직접 SQL UPDATE 금지 (authenticated 권한 회수 · 운영자 SQL 도 blocker guard 와 `via=direct` audit 가 남는다).
