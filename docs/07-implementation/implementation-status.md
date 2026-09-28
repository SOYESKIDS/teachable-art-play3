# PHASE 07 — Implementation Status (log)

| | |
|---|---|
| 문서 성격 | **구현 로그** (Product Decision 문서 아님 · 새 DEC 없음) |
| Branch / Base | `saas-v2` / `bf785b2` |
| 최종 갱신 | 2026-09-28 (세션 8 · local 브라우저 smoke) · PHASE 08 로 바뀐 사실만 반영 (§8-A · [../08-security-hardening/](../08-security-hardening/phase-08-plan.md)) |
| 상태 표기 | IMPLEMENTED · VERIFIED · UNVERIFIED · BLOCKED · DEFERRED |

> 이 문서는 context 가 끊겨도 다음 세션이 이어갈 수 있게 **현재 구현 · migration · 검증 · blocker** 를 기록한다.
> 여기 적힌 "IMPLEMENTED" 는 코드 · SQL 파일이 존재한다는 뜻이다. **실행 검증이 없으면 VERIFIED 가 아니다.**

---

## 0. Preflight (세션 1)

| 항목 | 결과 |
|---|---|
| Git | `saas-v2` · HEAD `bf785b2` = origin · clean |
| Node / npm | v24.16.0 / 11.13.0 |
| package.json scripts | `dev` · `build` · `start` · `lint` (test · typecheck script 없음) |
| Next / React / Supabase | next 16.3.0 · react 19.2.8 · @supabase/ssr 0.12.4 · supabase-js 2.112.3 |
| Supabase CLI | devDependency `supabase` 2.113.0 (`npx supabase`) · 전역 CLI 없음 |
| `supabase/config.toml` | **없음** (local Supabase 미구성) |
| Docker | **없음** → local migration apply · `supabase test db` 실행 불가 |
| Env (`.env.local`) | 파일 없음 → NEXT_PUBLIC_SUPABASE_URL · PUBLISHABLE_KEY · SUPABASE_SECRET_KEY · OPENAI_API_KEY: **missing** (값 출력 안 함) |
| Remote apply | **하지 않음** (§6 · 사용자 승인 후 별도 단계) |

---

## 1. M0 ~ M6 (PHASE 05 migration-cutover.md 기준)

| 단계 | 문서상 목적 | 이번 구현 | 상태 |
|---|---|---|---|
| **M0** | pgTAP · 보안 기준선 | 기본 suite `supabase/tests/p0_security_baseline.test.sql` (30) + `p0_hardening.test.sql` (116) · post-G2 `supabase/cutover/tests/G2_post_cutover.test.sql` (28) · post-G1 `M3_post_cutover.test.sql` (24) · production-shaped `03_validation.test.sql` (83) | IMPLEMENTED · **LOCAL TEST VERIFIED (281/281 · 세션 7)** |
| **M1** | additive schema only | `20261001090000_m1_hq_roles_audit_foundation` · `…091000_m1_commerce_entitlement_foundation` · `…092000_m1_class_operation_foundation` · `…093000_m1_report_portal_foundation` | IMPLEMENTED · **DB EXECUTION VERIFIED** (local fresh `db reset`) |
| **M2** | fact backfill · 기준 데이터 | `20261001100000_m2_fact_backfill_reference_seed` (week_no 복사 · Growth5 catalog · 상품 draft 버전 · capability registry) | IMPLEMENTED · **DB EXECUTION VERIFIED** (빈 DB 기준 · 운영 데이터 backfill 은 미검증) |
| **M3** | 신규 운영 write 경로 · 계약 · HQ 역할 기반(additive). HQ 역할 제한 · entitlement write gate 는 cutover 로 분리 | `…110000_m3_hq_role_foundation` · `…111000_m3_commerce_contract_readiness` · `…112000_m3_class_operation_rpcs` · `…113000_m3_app_context_rpcs` · **cutover**: `supabase/cutover/M3_hq_role_split_sensitive_access.sql` (G-2) · `supabase/cutover/M3_entitlement_write_gates.sql` (G-1) | IMPLEMENTED · **LOCAL DB VERIFIED** · cutover 는 **LOCAL TEST VERIFIED** (post-G2 28 · post-G1 24) · 운영 적용은 각 preflight 후 |
| **M4** | Report 2.0 · Portal · legacy adapter | `…120000_m4_report_portal_rpcs` | IMPLEMENTED · **DB EXECUTION VERIFIED** (local) |
| **M5** | cutover: legacy write · 세션 status 직접 UPDATE 회수 | `supabase/cutover/M5_legacy_write_revoke.sql` (**migrations 밖 · 자동 적용 안 됨**) | PREPARED · DEFERRED (앱 cutover 승인 시) · PHASE 08: 회수 범위 완성 · preflight(DB · 앱) · guard(M5001 · M5002) · audit · rollback · post-M5 test |
| **M6** | cleanup | 없음 | DEFERRED (CO-2 · 별도 승인) |

---

## 2. 설계 선택 (구현 방법 · Decision 아님)

| 주제 | 구현 방법 | 근거 |
|---|---|---|
| INVOKER RPC 와 status 직접 UPDATE 차단의 양립 (PHASE 05 가 PHASE 07 로 넘긴 항목) | 세션 전환은 `class_session_transitions` 명령 행을 INSERT → SECURITY DEFINER BEFORE INSERT trigger 가 역할 · 상태 · BEFORE · entitlement · 사유를 검증하고 세션을 갱신. M5 에서 `update(status)` 권한을 회수해도 정상 경로 유지 | Invariant AI-1 · AI-4 · DEC-085 |
| 숨김 · 다시 공개 | `report_visibility_actions` 명령 행 + DEFINER trigger (사유 · audit) | DEC-074 · DEC-102 |
| 동시 effective 계약 1개 | 계약 쓰기 trigger + 기관 단위 advisory lock + daterange 겹침 검사 (btree_gist exclusion 미사용) | DEC-082 (강제 방식 PHASE 07 결정) |
| `latest_completed_revision_id` 무결성 | FK `(latest_completed_revision_id, id) → report_revisions(id, report_id)` + trigger 로 complete 확인 | DEC-089 · DI-6 |
| `ai_assist` capability scope | `product_version_features.ai_capabilities text[]` + CHECK (`<@ {c1,c2,c3}`) | DEC-081 |
| Growth5 stable code | `expression_variety` · `form_space_composition` · `creative_attempt` · `engagement_immersion` · `self_explanation` (구 5영역 code 와 겹치지 않게 새로 지음) | DEC-086 (이름은 구현 선택) |
| "이번 주" 판정 | `Asia/Seoul` 기준 ISO 주(월~일) · `private.local_today()` | DEC-103 · 기존 앱 Asia/Seoul 규칙 |
| Portal token | 서버가 43자 base64url token 생성 → sha256 hex 만 RPC 로 전달 · 원문은 발급 응답 1회만 | DEC-092 · 기존 legacy share 패턴 |
| 사진 삭제 | metadata hide RPC → 서버가 사용자 세션으로 Storage 삭제 (hidden 사진만 허용하는 DELETE 정책) → 결과 기록 RPC · 실패 시 재시도 | DEC-088 · service role 미사용 |
| 오류 문구 | SQL 이 앱 전용 SQLSTATE(SS/OB/GM/QM/RP/PT/CT/MD/CS/EN/HS + 3자리) 와 사용자 문구를 던지고, 앱은 이 코드만 화면에 표시 (`src/lib/errors/rpc-errors.ts`) | DEC-111 |

---

## 3. 적용 게이트 · 운영 주의

| # | 내용 |
|---|---|
| G-1 | **Entitlement write enforcement 는 통제된 cutover 다 (세션 6).** 기존 `20261001115000_m3_entitlement_write_gates.sql`(전부 enforcement · 의존 객체 없음)을 `supabase/cutover/M3_entitlement_write_gates.sql` 로 옮겼다 (로직 동일 · G-1 guard `private.assert_g1_preflight_clean()` → G1001 전체 중단 · audit). 일반 `db reset` · `db push` 는 적용하지 않는다. 적용 전 `supabase/cutover/G1_preflight.sql` VERDICT = SAFE 필요. **현재는 NOT SAFE** — 모든 상품이 `parent_portal`(CO-12)을 포함해 어떤 계약도 활성화할 수 없다 (DEC-063 · 정상 결과). cutover-runbook.md |
| G-2 | **HQ 역할 · 민감 접근 제한은 통제된 cutover 다 (세션 7).** 기존 `110000` 의 §1~§3(legacy `is_soyes_admin` 의미 축소 · lead 정책 · HQ 민감 blanket SELECT 제거 · 원장 AI 초안 SELECT 제거 · HQ 제외 helper)을 `supabase/cutover/M3_hq_role_split_sensitive_access.sql` 로 옮겼다 (본문 동일). 일반 migration `20261001110000_m3_hq_role_foundation.sql` 은 메타데이터 · Sales 요약 · 지원 열람 RPC 와 호환 사진 helper(기존 역할 + 숨김 제외)만 가진다. 적용 전 `node supabase/cutover/G2_app_preflight.mjs` PASS + `-v g2_app_preflight=passed` 필요 (없으면 G2001). 되돌리기 `M3_hq_role_split_rollback.sql`. cutover-runbook.md |
| G-3 | 상품 버전은 **draft** 로 seed 되어 있다. HQ 가 PROVISIONAL 항목 확정 후 `/admin/products` 에서 발행해야 계약을 만들 수 있다 (IB-2 · 발행은 버전 이름 입력 확인). |
| G-4 | `platform_capabilities` 는 전부 미출시로 시작. `parent_portal`(CO-12) · `ai_assist`(AR-8) · `branding`(CO-8)은 `blocked_by` 로 막혀 있어 **어떤 상품도 Production Ready 가 되지 않는다** — 정책 미해결을 정확히 반영한 상태. |
| G-5 | DB-8: `add constraint unique` 3건 (class_program_assignments · class_session_observations · class_session_observation_media) 이 인덱스를 만든다. PK 상위집합이라 데이터로는 실패할 수 없음. 가상 데이터(소규모) 위 적용은 PASS · 운영 규모 lock 시간은 미검증. |

---

## 4. Implementation Blockers (IB · Decision 아님)

| ID | 내용 | 영향 | 상태 |
|---|---|---|---|
| IB-1 | 상품 버전 ↔ 프로그램 연결 구조 미정 (CO-7) | Readiness 콘텐츠 판정을 "반에 배정된 프로그램 · 약속한 week 범위 · 필수 섹션" 사실 기준으로 구현. 상품 버전에 program_id 를 두지 않음 | OPEN (CO-7) |
| IB-2 | catalog 의 PROVISIONAL 포함 기능 (bulk_print · content_playback) · branding 범위 (CO-8) | seed 에서 PROVISIONAL 기능 제외 · 버전 draft 유지 · HQ 확정 후 발행 | OPEN |
| IB-3 | 계약 종료 후 Portal 조회 유지 기간 (DEC-052 "Portal 기존 링크 별도 정책" · CO-1 · CO-12) | `read_child_portal` 은 effective 계약에 `parent_portal` 이 있을 때만 반환 (보수적) | OPEN |
| IB-4 | 기존 C1 (관찰 AI 정리) 을 Observation 2.0 과 결합하는 방법 · AR-8 | 교사 관찰 화면이 Observation 2.0 workspace 로 바뀌어 **C1 UI 진입점이 현재 없다** (legacy `ObservationBoard` 는 원장 전용 · AI 섹션 비노출). DB gate(`class_ai_capability_allowed`) · legacy server action/provider 는 남아 있음. 수동 경로만 동작 | DEFERRED |
| IB-5 | anon rate limit (AD-14) | `read_child_portal` route 에 rate limit 없음 | OPEN (AD-14) |
| IB-6 | 운영 timezone 전략 (Product Decision 없음) | 기존 repo 관례(Asia/Seoul · `todayInSeoul` · lead/organization label)를 따름. DB 는 `private.local_today()` 한 곳 + Portal `updated_on` 표시 1곳. Portal "이번 주" = Asia/Seoul ISO 주(월~일). 확정 정책 아님 — 바뀌면 이 두 지점과 app helper 를 교체 | VERIFICATION ITEM |
| IB-7 | "8주 기록 모아보기" 노출 surface · 8주 구간 산정 | 교직원(교사 · 원장) 읽기 전용 view 만 구현. 구간 = 계약 week 시작점부터 8주 단위 블록(계약 없으면 1주차부터). 학부모 Portal 노출 여부는 문서에 명시 없음 → 미구현 | OPEN |

---

## 5. 진행 로그 (세션 1)

| 영역 | 파일 | 상태 |
|---|---|---|
| DB M1~M4 · M5 준비 · M0 tests | `supabase/migrations/20261001*` · `supabase/cutover/` · `supabase/tests/` | IMPLEMENTED · UNVERIFIED |
| HQ Sales Shell | `src/app/sales/**` · `src/lib/auth/admin.ts` (`getHqRole` · `requireHqSales` · `requireHqStaff`) · `/admin/login` 역할별 이동 · proxy matcher `/sales` | IMPLEMENTED |
| HQ 운영 화면 메타데이터 RPC 전환 | `src/lib/admin/admin-dashboard-queries.ts` · `readiness-queries.ts` | IMPLEMENTED |
| 세션 행동 교체 (카드 직접 시작/완료 제거 · 복구 처리 · 취소 RPC) | `src/lib/staff/session-actions.ts` · `SessionActions.tsx` · `SessionCard.tsx` · `TodaySessionBoard.tsx` · admin `class-session-actions.ts` · `ClassSessionManageDialog.tsx` | IMPLEMENTED |
| Director AI 초안 비노출 | `ObservationBoard.tsx` (+ RLS M3) | IMPLEMENTED |
| STARTER 대시보드 게이트 · 원장 메뉴 · 로그인 착지 | `src/app/director/nav.ts` · `director/page.tsx` · `login/actions.ts` | IMPLEMENTED |
| Design token · focus · Dialog | `globals.css` (Target palette · semantic) · `focus:outline-none` 제거 11개 파일 · `components/ui/Dialog.tsx` · `app-button.ts` | IMPLEMENTED |

| Class Mode BEFORE · DURING · 마치기 · 빠른 메모 | `src/lib/staff/class-mode-{queries,actions}.ts` · `src/components/class-mode/*` · `teacher/sessions/[sessionId]/{before,during}` | IMPLEMENTED |
| Observation 2.0 (Growth5 · 명시 저장 · 충돌 문구 · 관찰 마무리) | `observation-v2-actions.ts` · `ClassObservationWorkspace.tsx` · `GrowthMetricSelector.tsx` · teacher observations page | IMPLEMENTED |
| 사진 숨김 + Storage 삭제 orchestration | `observation-media-hide-actions.ts` · `ObservationMediaSection.tsx` | IMPLEMENTED |
| Weekly 큐 (bounded) · Composer · 완료 · 수정본 | `weekly-report-{queries,actions}.ts` · `WeeklyQueue.tsx` · `WeeklyComposer.tsx` · teacher weekly pages | IMPLEMENTED |
| 원장 리포트 · 숨김/다시 공개 · 인쇄 · 학부모 공유 관리 | `director-report-queries.ts` · `ReportVisibilityControl.tsx` · `PrintButton.tsx` · `PortalManager.tsx` · director growth-reports/weekly · director/portal | IMPLEMENTED |
| 학부모 "아이 기록" Portal | `/share/portal/[portalId]` · `api/share/portal/resolve` · `ChildPortalView.tsx` · legacy share 실패 문구 DEC-103 통일 | IMPLEMENTED (Production Ready 아님 · CO-12) |

## 6. 진행 로그 (세션 2)

| 영역 | 파일 | 상태 |
|---|---|---|
| HQ 계약 · 이용권 section (DEC-106) — 계약 초안 · 반 범위 추가/제외 · Readiness 체크리스트 · 활성화(Readiness 미충족 시 버튼 비활성 · 서버 최종) · 일시 정지 / 재개 / 종료(사유 필수) · 계약 상태와 날짜 파생 기간 상태 분리 표시 · 반별 기준 인원 초과 표시 | `src/lib/admin/contract-queries.ts` · `organizations/[id]/contract-actions.ts` · `ContractSection.tsx` · 기관 상세 page | IMPLEMENTED |
| 상품 버전 발행 (LEVEL 3 · 버전 이름 입력) · 플랫폼 기능 출시 토글 (`blocked_by` 있는 기능은 UI 에서 출시 불가 · blocked_by 해제 UI 없음) | `src/app/admin/(dashboard)/products/*` · AdminNav "상품 · 기능" | IMPLEMENTED |
| 차시 수업 섹션 편집 (HQ-09 · 초안 차시만 · 필수 섹션 누락 표시 · 빈 본문 = 삭제) | `src/lib/curriculum/lesson-sections.ts` · `curriculum/section-actions.ts` · `LessonSectionEditor.tsx` · 차시 상세 page | IMPLEMENTED |
| Onboarding Contract step | — | **DEFERRED** (기관 상세 "계약 · 이용권" 으로 대체 운영 가능 · onboarding 흐름에는 아직 없음) |

---

## 7. 검증 결과 (세션 2 기준)

| 검증 | 결과 | 상태 |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | VERIFIED |
| `npm run lint` | 오류 · 경고 0 | VERIFIED |
| `npm run build` | exit 0 · 경고 없음 (env 없이도 build 통과) | VERIFIED |
| 신규 테이블 RLS | 신규 20개 테이블 모두 `enable row level security` | VERIFIED (static) |
| SECURITY DEFINER `search_path` | 신규 migration 의 DEFINER 함수 전부 `set search_path = ''` | VERIFIED (static) |
| 함수 기본 PUBLIC execute 회수 | 신규 함수 전부 revoke · 재정의 2개(`can_read_observation_media_object` · `can_read_child_observation_history`)는 기존 migration 의 revoke/grant 유지 | VERIFIED (static) |
| anon grant | `read_child_portal(uuid, text)` 1개뿐 | VERIFIED (static) |
| 세션 status 직접 UPDATE (앱) | `src` 에 `class_sessions` status 직접 update 없음 (RPC 경유) | VERIFIED (search) |
| service role 사용처 | 기존 원장 초대 · Auth 이메일 조회만 (`createAuthAdminClient`) · SaaS 데이터 접근 없음 | VERIFIED (search) |
| Client component 의 `process.env` | 없음 | VERIFIED (search) |
| Sales loader | `/sales` 는 leads + `hq_sales_organization_summary` RPC 만 · 아이 데이터 질의 없음 (RLS 에서도 차단) | VERIFIED (search) · RLS 실행 검증은 UNVERIFIED |
| Parent DTO | 기관명 · 반 · 아이 이름 · week · 날짜 · 업데이트일 · whitelisted content 5개 키 · 관찰된 모습 label. child_id · stage · 사진 없음 (DB normalize + route 이중 whitelist) | VERIFIED (static) |
| legacy AI (GR003 · ai_draft) 의존 | legacy 파일(`growth-report-*`, `GrowthReport*`)에만 남음 · 새 Weekly 경로 AI 의존 없음 | VERIFIED (search) |
| Migration 실행 · pgTAP | (세션 2 당시) Docker 없음 → 실행 불가 | 세션 4 에서 VERIFIED (§7-2) |
| 브라우저 E2E | 실행 환경(env · DB) 없음 | **UNVERIFIED** |

---

## 7-1. 세션 3 (§149~193 completion audit) — 변경 · 검증

**Completed (코드 수정)**

| 항목 | 파일 | 이유 |
|---|---|---|
| 빠른 메모 autosave 직렬화 (진행 중 저장이 있으면 끝난 뒤 최신 내용으로 1회 재저장) | `src/components/class-mode/QuickMemoPanel.tsx` | 저장 응답이 1.2s debounce 보다 늦으면 두 번째 요청이 옛 `updated_at` 으로 가서 거짓 충돌(QM005) 발생 |
| 주간 큐 행별 [작성하기] 중복 제출 방지 | `src/components/staff/WeeklyQueue.tsx` | §177 (서버 RPC 는 이미 idempotent) |
| Portal 지난 기록: limit 전에 최신순 정렬 | `supabase/migrations/20261001120000_m4_report_portal_rpcs.sql` (미적용 신규 파일) | 정렬 없는 `limit 200` 은 임의 200건을 남김 |
| "8주 기록 모아보기" (DEC-069 · DEC-104) 교사 · 원장 읽기 전용 view | `src/lib/staff/program-summary-queries.ts` · `src/components/staff/ProgramSummaryView.tsx` · `teacher/growth-reports/weekly/[reportId]/summary` · `director/growth-reports/weekly/[reportId]/summary` · 두 weekly 상세에 링크 | 완료 Snapshot 최대 8개 · write/AI 없음 · 빈 주 중립 |
| 교직원 오류 경계 | `src/components/staff/StaffRouteError.tsx` · `src/app/teacher/error.tsx` · `src/app/director/error.tsx` | load 실패 시 기본 오류 화면 대신 중립 문구 · 원문 비노출 |
| 계약 카드 포함 기능 · week 범위 · 최대 반 수 요약 | `contract-queries.ts` · `ContractSection.tsx` | §170 entitlements summary |

**Verification (세션 3)**

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit` | PASS (수정 후 재실행) |
| `npm run lint` | PASS (수정 후 재실행) |
| `npm run build` | PASS · 경고 없음 (수정 후 재실행) |
| 의존 순서 (함수 · 테이블 참조가 정의보다 앞서는지 · 32개 migration 전체) | STATIC REVIEW PASS — 같은 파일 내 선참조 1건은 plpgsql trigger 본문(실행 시 해석) |
| 후속 migration 에서 추가된 column 을 SQL 함수 · policy 가 먼저 쓰는지 | STATIC REVIEW PASS |
| RLS enable (20 tables) · DEFINER search_path · PUBLIC execute revoke · anon grant 1개 | STATIC REVIEW PASS |
| UUID literal | 신규 migration · cutover 에 0건. pgTAP fixture 는 엔티티별 prefix 규칙 id · `begin … rollback` 안 (의도된 test id) |
| raw DB message parsing | 없음 — 앱은 SQLSTATE 앱 코드일 때만 message 사용 |
| DB 실행 · pgTAP | (세션 3 당시) NOT RUN → 세션 4 에서 VERIFIED (§7-2) |

## 8. 남은 항목 (P0 범위 안 · 미완료 또는 의도적 보류)

| 항목 | 상태 | 비고 |
|---|---|---|
| Migration 실제 적용 · pgTAP 실행 | VERIFIED (local · 세션 4) | 운영 데이터 기준 backfill · lock 시간(G-5)은 미검증 · remote 적용은 사용자 승인 후 별도 단계 |
| M5 cutover (`update(status)` · legacy write 회수) | DEFERRED (파일 완성 · PHASE 08) | 앱 전환 배포 · legacy 화면 계열 제거 확인 후 (M5_app_preflight PASS) |
| Onboarding Contract step | DEFERRED | §6 |
| 원장 관찰 화면 Growth5 label 표시 | DEFERRED | 교사 화면만 구현 |
| 8주 기록 모아보기 학부모 노출 | OPEN | IB-7 |
| 공통 `InlineAlert` · `ReadOnlyBanner` · `PermissionState` component | 없음 | `EmptyState` · `ErrorState`(ui/surface) · `NotEntitledState` · `ServiceModeBanner` · `ContentNotReadyState` 만 존재 · 알림은 `notice*` class 로 통일 |
| Legacy share 생성 UI (원장 legacy 리포트 상세) | 유지 | M5 에서 발급 RPC · 표 INSERT 회수 (PHASE 08) · 기존 링크 중지는 유지 · 새 공유는 아동별 링크 |
| Monthly · Semester | DEFERRED (P1/P2) | AR-1 · AR-2 하드코딩 없음 |
| AI C1 × Observation 2.0 | DEFERRED | IB-4 · AR-8 |
| Marketing 정합 (UI-6) · 마케팅 페이지 serif · yellow 정리 | DEFERRED | 마지막 우선순위 · 원천 충돌 미해결 유지 |
| Portal · 사진 Production Ready | BLOCKED | CO-12 · CO-9 · CO-10 · DB-9 |
| AI Production Ready | BLOCKED | AR-8 |
| anon rate limit | OPEN | IB-5 · AD-14 |

---

## 7-2. 세션 4 — local DB 검증 (2026-09-28)

| 검증 | 결과 |
|---|---|
| Docker / local Supabase | 사용 가능 (사용자 환경 준비) · 대상 local 전용 · link 없음 |
| `npx supabase@2.113.0 db reset` (사용자 실행) | **PASS** — 기존 migration + PHASE 07 11개 전부 빈 DB 에 적용 |
| 11개 PHASE 07 migration | **DB EXECUTION VERIFIED** (local fresh apply) |
| `npx supabase@2.113.0 test db` 1차 (사용자 실행) | fixture 단계에서 중단 — 0/30 실행 (아래 수정 참조) |
| `npx supabase@2.113.0 test db` 2차 (fixture 수정 후) | **PASS · planned 30 · executed 30 · passed 30 · failed 0 · TODO/SKIP 0** |
| 격리 확인 | 실행 후 test 사용자 · Org A/B · 80000000-* 세션 · audit_events 0건 · 상품 버전 전부 draft 유지 (rollback 확인) |
| Remote DB | **NOT TOUCHED** (link · db push 없음) |
| `npx tsc --noEmit` · `npm run build` | PASS |
| `npm run lint` | **FAIL — 환경 산출물 때문**: `supabase start` 가 만든 `supabase/.temp/start-secrets/**/index.ts` (minified edge runtime bundle) 를 eslint 가 검사. git 에는 ignored 이나 eslint ignore 에 없음. `npx eslint --ignore-pattern "supabase/.temp/**"` → PASS (소스 오류 0) |

**Fixture 결함과 수정 (test 전용 · 제품 제약 변경 없음)**

- 원인: fixture 가 세션 `80…a1` · `80…a2` 를 **같은 배정(70…a1) × 같은 차시(51…01) · 둘 다 `scheduled`** 로 넣었다. `class_sessions_open_assignment_lesson_key` (`unique (class_program_assignment_id, lesson_id) where status in ('scheduled','in_progress')` · 20260826 migration) 는 이를 금지한다. replica 모드는 trigger 만 끄고 unique index 는 끄지 않으므로 적재 단계에서 중단.
- `80…a2` 는 "Recovery cannot complete a scheduled session" 검증용이라 `scheduled` 여야 한다 → 상태 변경 불가.
- 수정: 같은 프로그램에 2주차 차시 `51…02` (week 2 · session 1 · published) 추가, `80…a2` 를 그 차시 · `week_no = 2` · `current_date + 7` 로 변경. plan 30 유지 · ON CONFLICT 없음.

## 7-3. 세션 5 — local validation hardening (2026-09-28)

**변경 파일**

| 파일 | 내용 |
|---|---|
| `eslint.config.mjs` | `globalIgnores` 에 `"supabase/.temp/**"` 추가 (Supabase CLI 임시 산출물만 · `supabase/**` 전체 아님) |
| `.gitignore` | `/supabase/.branches/` 추가 (CLI local branch marker `_current_branch` 1개 · 4 bytes · 비밀 없음) |
| `supabase/tests/p0_hardening.test.sql` | **신규** 112 assertions (A~J) · 기존 30 assertions 파일은 변경 없음 |
| `src/app/admin/(dashboard)/products/ProductControls.tsx` · `products/page.tsx` | 기능 출시 전환 안내 문구 정정 — 출시 여부는 **활성화 시점 Readiness 입력**(DEC-082)이며 유효 계약의 runtime kill switch 가 아님. 이전 문구("즉시 막힙니다")는 실제 동작과 달랐다 |
| `docs/07-implementation/production-shaped-local-test-plan.md` | **신규** — 가상 데이터 기반 M2 backfill · M3 gate 호환성 검증 계획 (NOT EXECUTED) |

**검증 결과**

| 검증 | 결과 | 상태 구분 |
|---|---|---|
| `npx supabase@2.113.0 db reset` (local · 세션 5 두 번) | PASS · 기존 + PHASE 07 11개 migration | LOCAL DB VERIFIED |
| `npx supabase@2.113.0 test db` | Files=2 · **planned 142 · executed 142 · passed 142 · failed 0 · TODO 0 · SKIP 0** | LOCAL TEST VERIFIED |
| — `p0_security_baseline.test.sql` | 30/30 | LOCAL TEST VERIFIED |
| — `p0_hardening.test.sql` | 112/112 | LOCAL TEST VERIFIED |
| 격리 | 실행 후 test 사용자 · 기관 · 계약 · 리포트 · portal · audit 0건 · 상품 버전 전부 draft · `class_sessions.status` UPDATE 권한 원상태(M5 시뮬레이션 rollback) | LOCAL TEST VERIFIED |
| `npx tsc --noEmit` · `npm run lint` (flag 없음) · `npm run build` · `git diff --check` | 모두 PASS | VERIFIED |
| 운영 형태 데이터 (backfill · lock 시간 · gate 영향) | 계획만 작성 | NOT VERIFIED WITH PRODUCTION-SHAPED DATA |
| Remote DB | NOT TOUCHED | — |

**hardening 중 발견 · 수정 (test 전용)**

- 1차 실행 110/112: "이번 주" portal 2건 실패. 원인 = fixture 가 `current_date`(DB UTC 날짜)로 세션을 잡았는데 portal "이번 주"는 `private.local_today()`(Asia/Seoul) 기준. 한국 월요일 00~09시에는 UTC 날짜가 전 주 일요일이라 세션이 "지난 기록"으로 분류됐다 (응답에는 past 로 정상 포함). 제품 동작은 일관 (앱도 Seoul 기준 날짜 저장 · 신규 migration 에 `current_date` 사용 0건) → fixture 날짜를 `private.local_today()` 로 변경. IB-6 참고.

**발견 사실 (결함 아님 · 보고)**

- M5 이전에는 legacy trigger(20260826)가 직접 UPDATE `scheduled → completed` 를 허용한다 (권한 있는 담당 교사). 문서화된 M5 순서대로이며, M5 revoke 문을 transaction 안에서 적용하면 42501 로 막힘을 test 로 확인 (H 그룹 마지막).
- 계약 활성화 가능성 → §3 G-1 갱신 내용.

**상태 구분 요약**

| 구분 | 항목 |
|---|---|
| IMPLEMENTED | P0 vertical slice 전체 (§1 · §5~§7-1) |
| LOCAL DB VERIFIED | 11개 PHASE 07 migration fresh apply |
| LOCAL TEST VERIFIED | pgTAP 142 (HQ split · Sales · 민감 접근 · 세션 전환 · 복구 · BEFORE · Quick Memo · Growth5 · Weekly 사진 0~3 · DEC-066 · revision 불변 · pointer · 숨김/portal · token hash · 계약 1개 · Pilot · entitlement gate · 정지/종료 읽기 전용 · AI/portal blocker · M5 효과) |
| NOT VERIFIED WITH PRODUCTION-SHAPED DATA | M2 backfill · G-5 lock · G-1 gate 영향 · legacy 관찰 × Observation 2.0 |
| PRODUCTION BLOCKED | Portal (CO-12) · 학부모 사진 (CO-9 · CO-10 · DB-9) · AI (AR-8) · 계약 활성화 전반 (CO-12 → 모든 상품) |
| DEFERRED | M5 · M6(CO-2) · Monthly/Semester · AI C1 UI(IB-4) · Onboarding Contract step · 원장 Growth5 표시 · marketing 정리 |

## 7-4. 세션 6 — G-1 cutover 분리 · production-shaped local 검증 (2026-09-28)

**115000 분석 (분리 전)**

| 문장 | 분류 |
|---|---|
| `private.gate_class_program_assignment_insert()` · `private.gate_class_session_insert()` · `private.gate_class_record_write()` (trigger 함수 · execute revoke) | C. write enforcement |
| trigger 4개: `class_program_assignments` · `class_sessions` · `class_session_attendance` · `class_session_observations` | E. trigger installation (enforcement) |
| helper · 계산 함수 · 권한/정책 변경 | 없음 (계산 함수는 M1 `20261001091000` 에 있음) |
| 의존 | M4 · 다른 migration · tests(이전) · 앱 코드 어느 것도 115000 객체를 참조하지 않음. `origin_contract_id` 컬럼은 M1 |

→ 파일 전체를 cutover 로 이동 (split 불필요). 상세: cutover-runbook.md

**변경 파일 (세션 6)**

| 파일 | 내용 |
|---|---|
| `supabase/migrations/20261001115000_m3_entitlement_write_gates.sql` | **삭제 (이동)** |
| `supabase/cutover/M3_entitlement_write_gates.sql` | **신규** — 원본 enforcement 본문 동일 + "DO NOT APPLY UNTIL G-1 PREFLIGHT PASSES" header + G-1 guard + audit |
| `supabase/cutover/G1_preflight.sql` | **신규** — 읽기 전용 점검 보고서 (BLOCKING · WARN · INFO · VERDICT) |
| `supabase/cutover/tests/M3_post_cutover.test.sql` · `run-local.mjs` | **신규** — post-cutover pgTAP (23) · local 컨테이너 전용 실행기 (`\ir` 펼침 · 새 의존성 없음) |
| `supabase/tests/p0_hardening.test.sql` | gate 7개 assertion 을 post-cutover 로 이동 · PRE-CUTOVER 7개로 대체 · 원아 대량 등록 capacity 회귀 2개 추가 (112 → 114) |
| `supabase/validation/production_shaped/01_legacy_seed.sql` · `02_fingerprint.sql` · `03_validation.test.sql` | **신규** — 가상 운영 데이터 · 사실 fingerprint · 검증 (74) |
| `supabase/migrations/20261001111000_m3_commerce_contract_readiness.sql` | **결함 수정**: capacity 이벤트 trigger 를 row-level → statement-level + transition table (중복 기록 제거) |
| `docs/07-implementation/cutover-runbook.md` | **신규** |
| `docs/07-implementation/production-shaped-local-test-plan.md` | 실행 결과 §7 |

**검증 (세션 6)**

| 검증 | 결과 | 구분 |
|---|---|---|
| `npx supabase@2.113.0 db reset` | PASS · 일반 migration 10개 · entitlement gate trigger 0 | LOCAL DB VERIFIED |
| `npx supabase@2.113.0 test db` (PRE-CUTOVER) | 2 files · **144/144** (baseline 30 · hardening 114) | LOCAL TEST VERIFIED |
| `run-local.mjs M3_post_cutover.test.sql` (POST-CUTOVER) | **23/23** | LOCAL TEST VERIFIED |
| production-shaped: reset --version → seed → fingerprint → `migration up --local` → fingerprint | 10개 적용 PASS (≈5.4s) · **17개 테이블 사실 IDENTICAL** | LOCAL DB VERIFIED (가상 데이터) |
| `G1_preflight.sql` (가상 운영 데이터) | NOT SAFE · blocking 5 · 읽기 전용 확인 | LOCAL VERIFIED |
| `03_validation.test.sql` | **74/74** | LOCAL TEST VERIFIED |
| 합계 | **241/241** (pre 144 · post 23 · production-shaped 74) · TODO 0 · SKIP 0 | — |
| 실행 후 DB | gate 0 · guard 함수 없음 · 계약 0 · 버전 draft (전부 rollback) | — |
| `npx tsc --noEmit` · `npm run lint` · `npm run build` · `git diff --check` | PASS | VERIFIED |
| Remote DB | NOT TOUCHED | — |

**발견 · 보고**

- (결함 · 수정) 원아 대량 등록 · 이동 시 capacity 이벤트 중복 기록 → statement-level trigger. 회귀 test 추가.
- (사실) 정지 기관(org status suspended) 교사의 쓰기는 gate 이전에 기존 접근 규칙(AT002)으로 막힌다.
- (사실 · G-2) 새 앱의 교사 핵심 흐름(Class Mode 시작 · BEFORE · Observation 2.0 · Quick Memo · Weekly)은 RPC 에서 entitlement 를 요구한다 (DEC-083).
  계약이 활성화되지 않은 기관에 새 앱을 배포하면 M3 cutover 없이도 새 수업 시작 · 새 관찰 작성이 불가하다 (출결 · 마치기 · 복구 · 취소는 가능).
  현재 어떤 계약도 활성화할 수 없으므로(CO-12) production 배포 순서는 사람 결정이 필요하다.

## 7-5. 세션 7 — G-2 배포 안전 (2026-09-28)

**110000 분석 (분리 전)**

| 문장 | 분류 | 처리 |
|---|---|---|
| `private.is_soyes_admin()` → `is_hq_admin()` (Sales 제외) | D. 의미 재정의 (현재 앱의 Sales /admin · 모든 legacy `is_soyes_admin` 정책에 영향) | → G-2 cutover |
| lead select/update 정책 (Admin + Sales) | C. 정책 변경 (위 재정의와 짝 · 재정의 전에는 불필요) | → G-2 cutover |
| 관찰 · 도메인 · 사진 · AI 초안 · 성장 리포트 · sources SELECT 정책 (HQ 제거 · 원장 AI 초안 제거) | C. 제한 SELECT (현재 앱 HQ 대시보드 · 원장 AI 초안 화면에 영향) | → G-2 cutover |
| `can_read_observation_media_object` (HQ 제외 + 숨김 제외) | C + B | 일반: 기존 역할 + 숨김 제외 (B) · cutover: HQ 제외 (C) |
| `can_read_child_observation_history` (HQ 제외) | C | → G-2 cutover |
| `hq_completed_legacy_report_meta` · `hq_completed_legacy_report_counts` · `hq_observed_session_ids` | A. additive RPC (PHASE 07 HQ 대시보드 · 준비 화면이 사용) | 일반 migration 유지 |
| `hq_sales_organization_summary` | A. additive RPC (/sales 가 사용) | 일반 유지 |
| `hq_support_open_observation` (사유 + audit) | E + F | 일반 유지 (권한을 줄이지 않음) |

- 의존: 111000 · 112000 · 113000 · 120000 은 110000 객체를 참조하지 않는다. 앱은 4개 RPC(메타데이터 3 · Sales 요약)만 필요 — 모두 일반 migration 에 남음.
- 현재(legacy) 앱에 영향을 주는 것: `is_soyes_admin` 축소(Sales 의 /admin · 모든 legacy 정책) · HQ 민감 SELECT 제거(현재 HQ 대시보드의 직접 조회) · 원장 AI 초안 제거.

**앱 라우팅 (G-2 · 임시 switch)**

- `src/lib/rollout/staff-app-routing.ts` — `SOYE_SAAS_V2_APP_CUTOVER === "true"` 일 때만 SaaS 2.0 교사 · 원장 화면이 기본. Production 기본 = legacy.
- legacy 계열 (PHASE 07 이전 production 사본): `src/components/staff/LegacySessionActions.tsx` · `src/lib/staff/legacy-session-actions.ts` ·
  `src/app/teacher/sessions/[sessionId]/observations/LegacyTeacherObservationPage.tsx` · `src/app/teacher/growth-reports/LegacyTeacherGrowthReportsPage.tsx`
- 분기 지점: `SessionCard`(`appRouting`) · `TodaySessionBoard` · 교사 홈 · 원장 수업 운영 · 교사 관찰 page · 교사 리포트 page · 원장 홈(대시보드 gate) · 원장 메뉴 · 원장 로그인 착지
- 권한 · entitlement 함수 변경 없음. SaaS 2.0 경로는 값과 무관하게 서버 RPC 가 계약을 강제한다.
- legacy 계열에서도 유지되는 PHASE 07 변경: 원장 화면 AI 초안 비표시 · 사진 숨김 · 오류 문구 · 교사 메뉴 이름.
- `requireAdmin`: 비관리자 중 Sales 는 `/sales` 로 안내 (G-2 후 UX · 권한 변화 없음). `.env.example` 에 switch 설명 추가 (값 없음).

**검증 (세션 7)**

| 검증 | 결과 | 구분 |
|---|---|---|
| `npx supabase@2.113.0 db reset` | PASS · 일반 migration 10개 · gate 0 · `is_soyes_admin` 에 sales 포함(legacy) | LOCAL DB VERIFIED |
| `npx supabase@2.113.0 test db` (PRE) | **146/146** (baseline 30 · hardening 116) — G-2 의존 8개는 PRE-G2 호환 assertion 으로 교체 · 원 assertion 은 post-G2 로 이동 | LOCAL TEST VERIFIED |
| `run-local.mjs G2_post_cutover.test.sql` | **28/28** (이동한 8 · Sales/HQ/원장 제한 · lead 유지 · 지원 열람 · 사진 helper · G-1 미적용 · rollback · 재적용) | LOCAL TEST VERIFIED |
| G-2 cutover 확인 변수 없이 실행 | G2001 중단 · DB 변경 없음 | LOCAL VERIFIED |
| `run-local.mjs M3_post_cutover.test.sql` | **24/24** (+ G-1 이 G-2 를 수행하지 않음) | LOCAL TEST VERIFIED |
| `node supabase/cutover/G2_app_preflight.mjs` | **15/15 PASS** · 위반 삽입 시 FAIL 확인 | VERIFIED (static) |
| production-shaped (reset --version → seed → fingerprint → `migration up --local` → fingerprint → G1 preflight → validation) | 적용 ≈5.3s · **사실 IDENTICAL** · G-1 NOT SAFE(5) · **83/83** | LOCAL DB · TEST VERIFIED |
| 합계 | **281/281** (pre 146 · post-G2 28 · post-G1 24 · production-shaped 83) · TODO 0 · SKIP 0 | — |
| `npx tsc --noEmit` · `npm run lint` · `npm run build` · `git diff --check` | PASS | VERIFIED |
| legacy 앱(`bf785b2`) × 새 일반 migration | 코드 실행 검증 없음 — DB 수준 호환(legacy HQ 조회 · Sales-via-admin · legacy 쓰기 · 직접 세션 status UPDATE · legacy 관찰 RPC)을 test 로 확인 | PARTIAL (앱 미실행) |
| 브라우저 · 화면 수동 점검 | 실행 안 함 (local `.env.local` 없음) | NOT VERIFIED |
| Remote DB | NOT TOUCHED | — |

## 7-6. 세션 8 — local 브라우저 smoke (2026-09-28)

- 방법: `supabase/validation/browser_smoke/` (가상 계정 6 · 가상 데이터 · 1×1 가상 사진) + headless Chrome 을 DevTools Protocol 로 조작 (node 내장만).
  앱은 local 값을 프로세스 env 로만 받아 `next build` + `next start -p 3100 -H 127.0.0.1` (사용자의 기존 `next dev`(3000) 는 건드리지 않음 · `.env.local` 미생성).
- legacy 모드 (switch 미설정): 교사 로그인 → /teacher · legacy [수업 시작] · 출결 저장/새로고침 유지 · legacy 관찰 작성 완료/유지 · 이력 · legacy 성장 리포트 화면 /
  원장 → /director 대시보드 · legacy 메뉴 · AI 초안 비표시 / HQ admin RPC-only 수업 취소 · Dialog focus trap · Escape · focus 복원 / Sales(G-2 전) /sales · /admin 호환 접근 — 모두 PASS
- SaaS V2 모드: BEFORE 필수 확인 · 56px 시작 · DURING · 빠른 메모(저장됨 · 새로고침 유지) · 수업 마치기 → 출결(after=1) · Observation 2.0 + Growth5 stage 필수 ·
  Weekly 대기열 · 수정본 · 사진 0~3 (4번째 거부) · 완료 / 원장 STARTER (홈 없음 · /director not-entitled) · 숨김/다시 공개(사유) · 인쇄 숨김 ·
  공유 링크 발급/재발급/중지 / 학부모: token fragment 만 · 제거 · POST · 승인 문구(이번 주 없음 · 기록 없음 · 무효/중지) · stage 없음 · 사진 없음 · 숨김 기록 미노출 /
  HQ admin 상품 · 계약 초안 Readiness(CO-12 표시 · 활성화 버튼 비활성) — 모두 PASS
- G-2 local 적용 후: Sales /sales 유지 · /admin → /sales · HQ 민감 조회 0 · 지원 열람 사유(HS001) · audit · Sales 지원 불가(42501) · 교사/원장 영향 없음 — PASS · 이후 db reset
- 반응형: desktop 1366 · tablet 1024 · mobile 390 에서 가로 넘침 0 · 44px 미만 조작 요소 0 · Class Mode 주 버튼 56px · 키보드 focus 2px outline
- console · network: runtime 오류 · hydration 오류 · 4xx/5xx 0 · 학부모 token 저장/URL 잔존 없음 · Sales 응답에 아동 정보 없음

**수정 (세션 8)**

| 증상 | 원인 | 파일 | 전 → 후 |
|---|---|---|---|
| 완료 시각이 한국 00~09시에 하루 전 날짜로 표시 (예: 09-28 완료가 "2026.09.27 완료") | timestamptz ISO 문자열 앞 10자리(UTC 날짜)를 잘라 표시 | `src/lib/entitlement/labels.ts` (`formatDotDate`) · `src/components/staff/WeeklyComposer.tsx` | UTC 날짜 → Asia/Seoul 날짜 (날짜만 있는 값은 그대로) |
| 계약 없음 · 읽기 전용 반에서 진행 중 수업의 DURING 이 정상처럼 보이고 빠른 메모 저장이 QM004 로 실패 | DURING 에 entitlement 상태 처리가 없었다 (BEFORE 에만 있음) | `src/app/teacher/sessions/[sessionId]/during/page.tsx` · `src/components/class-mode/DuringView.tsx` | 읽기 전용 안내(role=status) 표시 · 빠른 메모 숨김 · 수업 마치기는 유지 |
| 교직원 상단 메뉴 오른쪽에 세로 스크롤 화살표 (PHASE 07 이전부터 존재) | `overflow-x-auto` 가 세로 overflow 도 auto 로 만듦 | `src/components/staff/StaffShell.tsx` | `overflow-y-hidden` 추가 |

**검증 (세션 8)**: `db reset` PASS · `test db` 146/146 · post-G2 28/28 · post-G1 24/24 · G-2 preflight 15/15 · tsc · lint · build · diff-check PASS · Remote NOT TOUCHED

## 8-A. PHASE 08 이후 달라진 사실 (요약 · 상세는 docs/08-security-hardening)

| 항목 | PHASE 07 기록 | PHASE 08 이후 |
|---|---|---|
| 일반 migration | 10개 (PHASE 07) | 16개 (+ `20261002090000` ~ `20261002095000` · local 만 · Staging 미적용) |
| G-2 | HQ 역할 split | + §5 구성원 직접 쓰기 회수 · §6 AI 초안 저장 gate · 앱 preflight 18 항목 · DB preflight(active HQ Sales 수 필수) · D2 = TARGET IMPLEMENTED / CUTOVER PENDING |
| G-1 | trigger 4 · rollback = trigger drop | trigger 6 · D4 onboarding · 배정 재개 gate · before_start 일정 · legacy 공유 쓰기 표면 gate 는 G-1 에서만 (Step H 로 legacy 동작 불변) · G1001 = cutover-time guard · G1002 · rollback 파일 |
| M5 | 세션 status + legacy RPC 6개 | 표 grant 전부 · legacy 관찰 AI · 관찰영역 연결 · legacy 형식 관찰 closure · guard · preflight · rollback · J/K/L 한 window 연속 수행 (start gate · window preflight) |
| 검증 | 281 (pre 146 · G2 28 · G1 24 · prod-shaped 83) | [../08-security-hardening/test-matrix.md](../08-security-hardening/test-matrix.md) |
| 새 DEC | 없음 | DEC-113 · DEC-114 · DEC-115 |

## 9. Next (새 세션이 이어갈 순서)

1. staging review — 일반 migration 10개 + PHASE 07 앱(legacy 기본) 조합 (remote 적용은 사용자 승인 후 별도 단계)
2. local 또는 staging 에서 화면 수동 점검: legacy 계열(기본) · `SOYE_SAAS_V2_APP_CUTOVER=true` 계열(가상 계약 fixture)
3. G-2 cutover 적용 시점 결정 (runbook Step C~E)
4. 정책 blocker(CO-12 · AR-8 · CO-8) 결정 — Step F 이후의 전제
5. ~~M5 preflight 작성 (Step L 전)~~ → PHASE 08 에서 작성 (`M5_preflight.sql` · `M5_app_preflight.mjs`)

상태 marker: **READY TO COMMIT PHASE 07 FOR STAGING** (local 브라우저 smoke 완료 · production cutover 아님 · Step F 이후 정책 blocker 로 진행 불가)
