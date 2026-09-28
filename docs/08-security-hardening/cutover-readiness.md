# PHASE 08 — Cutover Readiness (G-2 · G-1 · M5 · J/K/L window)

| | |
|---|---|
| 상태 | 세 cutover 모두 **파일 준비 · local 검증 완료 · 어디에도 적용하지 않음** |
| 순서 | 일반 migration → (앱 배포) → **G-2** → F 정책 blocker · G 상품 발행 · H 계약 mapping → I G-1 preflight → **[controlled window: J → K(G-1) → L(M5)]** |
| 원칙 | 적용 · 시점 · 대상 환경은 사람이 결정한다. 이 문서는 준비 상태만 말한다 |

## 1. 일반 migration (PHASE 08 · 6개)

- **Staging · Production 모두 미적용** (local 만). Staging 에 적용된 마지막 migration 은 `20261001120000`.
- 현재 Production(계약 없음 · legacy 화면 계열 · 이전 앱 코드)과 Step H 이후(계약 활성화 · G-1 전) 모두에서
  **legacy 운영 쓰기 동작을 바꾸지 않는다** (PRE-COMMIT Issue 1 · [write-surface-matrix.md §0](./write-surface-matrix.md)).

| migration | 현재 Production 에 적용되면 | Step H 계약 활성화 후 · G-1 전 |
|---|---|---|
| 20261002090000 membership | legacy 초대(직접 INSERT) 그대로 · audit 행 추가 · self-grant · 마지막 원장 변경만 거부 (정상 운영 경로 아님) | 같음 |
| 20261002091000 AI authorization | 함수 추가만 (이전 앱은 부르지 않음 · legacy AI 효과는 새 앱 배포 후) | 같음 |
| 20261002092000 start | SaaS 2.0 전환 RPC 만 | 같음 |
| 20261002093000 evidence gates | SaaS 2.0 전용 경로 · 동의 declined 만 (Production 동의 행 없음) | legacy 경로 동작 불변 (test: ISSUE1 5 assertion) |
| 20261002094000 capacity | 계약 없음 → 영향 없음 | HQ 계약 범위 조작만 (운영 쓰기 아님) |
| 20261002095000 legacy share | 퇴소(inactive) 원아 리포트 링크만 닫힘 | + 계약 종료 · 기간 만료 후 legacy 링크 닫힘 (읽기 · parent_portal) |

- production-shaped: 적용 전후 fingerprint 동일 · 83/83.

## 2. G-2 (`M3_hq_role_split_sensitive_access.sql`)

### D2 상태: **TARGET IMPLEMENTED / CUTOVER PENDING** (D2 resolved 아님)

| 시점 | organization_members 쓰기 |
|---|---|
| PRE G-2 (현재 · 일반 migration 까지) | HQ Admin RPC (사유 · audit) + **legacy 직접 DML 남음**: RLS `is_soyes_admin` 이 HQ Admin **과 HQ Sales** 를 통과시킨다 → Sales 도 다른 사용자 구성원을 직접 INSERT/UPDATE 할 수 있다 (self-grant · 마지막 원장 · 교사→원장 규칙과 audit 는 적용). 현재 Production legacy 앱의 초대가 이 경로를 쓰기 때문에 일반 migration 에서 회수할 수 없다 |
| POST G-2 (target) | Sales INSERT · UPDATE **거부** · HQ Admin 직접 DML **거부** · HQ Admin audited RPC 만 · self-grant 금지 · 마지막 원장 보호 · 사유 · audit — POST-G2 test 로 확인 |

| 항목 | 상태 |
|---|---|
| guard | `-v g2_app_preflight=passed` 없으면 G2001 · PHASE 08 membership · AI 객체 없으면 G2002 |
| 앱 preflight | `node supabase/cutover/G2_app_preflight.mjs` → 18/18 PASS |
| **DB preflight (신규)** | `psql -f supabase/cutover/G2_db_preflight.sql` — PHASE 08 객체 · **READ-ONLY: active HQ Sales account count (필수)** · active HQ Admin 수 · G-2 전 직접 구성원 변경 기록. active Sales ≥ 1 이면 VERDICT = `ESCALATE` → G-2 적용 시점을 보안 우선으로 앞당긴다 |
| rollback | `M3_hq_role_split_rollback.sql` — 구성원 직접 grant · 정책 복원 · AI 저장 gate 제거 |
| 검증 | POST-G2 47/47 (Sales INSERT · UPDATE 거부 · HQ Admin 직접 UPDATE · INSERT 거부 · RPC 성공 · audit · rollback · 재적용) |
| 앱 호환 주의 | 이전(legacy) 앱의 원장 · 교사 초대와 legacy AI 저장은 G-2 후 실패한다 → PHASE 08 앱 배포 후에만 |

## 3. G-1 (`M3_entitlement_write_gates.sql`)

| 항목 | 상태 |
|---|---|
| 켜지는 것 | 배정(EN001 · D4 onboarding) · 일정(EN002 · before_start) · **legacy 공유 쓰기 표면 전부**: 출결 · legacy 관찰 · legacy 직접 시작/완료 · 관찰영역 연결 · 사진 업로드 재원/반 쓰기 (PRE-COMMIT Issue 1 로 일반 migration 에서 이동) |
| guard | G1001 (유효 계약 없는 운영 기관) · G1002 (PHASE 08 기반 없음) |
| rollback | `M3_entitlement_write_gates_rollback.sql` — trigger 6 · 함수 제거 · 사진 업로드 판정을 동의만으로 복원 · audit |
| 검증 | POST-G1 59/59 · production-shaped 83/83 |

### G1001 은 cutover-time cleanliness guard 다

> **G1001 is a cutover-time cleanliness guard, not the normal post-G1 onboarding rule.**

- G1001 은 G-1 파일을 **적용(재적용)하는 순간에만** 실행된다. 그 순간 운영 중(active) 반이 있는데 서비스 모드가 active 가 아닌
  운영 기관(계약 없음 · 초안뿐 · 시작 전 · 정지 · 종료)이 있으면 적용 전체를 중단한다. 적용 창에서는 그런 기관을 mapping 하거나
  `organizations.status = 'suspended'` 로 정리한다.
- G-1 적용 **이후** 신규 기관 onboarding 에는 G1001 이 관여하지 않는다. POST-G1 test (ISSUE4 · 12 assertion) 로 증명:
  초안 계약 → 반 범위 → 배정(provenance = 초안 계약) → Readiness READY → HQ 활성화 → 서비스 모드 active → 일정 등록 · BEFORE · 시작 ·
  출결 · Growth5 관찰. 계약 1개 (자동 생성 없음) · G-1 재적용 없음 (적용 audit 수 불변).

## 4. M5 (`M5_legacy_write_revoke.sql`)

| 요구 | 상태 |
|---|---|
| READ-ONLY preflight | `M5_preflight.sql` (DB) + `M5_app_preflight.mjs` (앱 · 7 항목: 회수 RPC 소비자 0 · 회수 표 직접 쓰기 0 · status 직접 UPDATE 0 · legacy 파일 · 스위치 제거 · **legacy UI 꺼짐(Legacy* import 0)** · **legacy Action · 라우팅 스위치 의존 0**) |
| operator guard | M5001 (확인 변수 없음) · M5002 (G-2 · G-1 · PHASE 08 없음) — local 실행으로 확인 |
| audit · rollback · post-M5 test | `cutover.m5_legacy_writes_revoked` · `M5_legacy_write_rollback.sql` · POST-M5 46/46 |
| idempotence | 반복 안전 (audit 는 적용마다 1행) |
| 현재 브랜치 | 앱 preflight FAIL (legacy 화면 계열 유지 · 정상) |

## 5. J / K / L controlled window

J · K · L 은 설계상 별도 단계지만 **Production 에서는 한 번의 controlled window 에서 연속 수행**한다.
J 이후 M5 전 상태(legacy 직접 쓰기 경로가 DB 에 남은 상태)는 **승인된 steady state 가 아니다.**
DB 는 배포 env 를 읽지 않는다 — window 절차와 preflight 가 이 간격을 짧게 만든다.

| # | 단계 | 통과 조건 (하나라도 아니면 멈춘다) |
|---|---|---|
| 0 | window 시작 전 | `node supabase/cutover/JKL_start_gate.mjs` = READY (배포할 빌드가 M5 앱 조건 충족) · `psql -f JKL_window_preflight.sql` = READY (G-2 적용 · PHASE 08 · G-1 blocking 0 · G-1 · M5 미적용) · `G1_preflight.sql` = SAFE |
| 1 | maintenance / controlled window 시작 | 쓰기 공지 · 진행 중 수업 정리 계획 |
| 2 | J — M5 앱 조건을 충족한 빌드 배포 (legacy UI 없음) | 배포 확인 |
| 3 | 즉시 검증 | 교사 · 원장 V2 화면 smoke · legacy Action 호출 경로 없음 |
| 4 | K — G-1 적용 | audit · trigger 6 |
| 5 | 즉시 검증 | 출결 · 관찰 · 일정 (유효 계약 반) 정상 · 범위 밖 EN00x |
| 6 | L — `M5_preflight.sql` SAFE 확인 후 M5 적용 (`-v m5_preflight=passed`) | audit |
| 7 | post-M5 검증 | legacy 직접 쓰기 42501 · V2 경로 정상 · legacy 조회 · 공유 읽기 유지 |

중간 단계에서 실패하면: 그 단계의 rollback 파일(M5 → G-1 → 앱 이전 빌드 순)로 되돌리고 window 를 닫는다. window 를 연 채
다음 영업일까지 J 상태로 운영하지 않는다.

- 검증: 현재 브랜치 → start gate `DO NOT START J` · fixture 빌드(legacy 소비자 없음) → READY · legacy 직접 쓰기 소비자가 있는 빌드 → 차단
  (node:test) · DB window preflight: 새 DB → `NOT READY — G-2 미적용` · local G-2 적용 후 → READY · 계약 없는 운영 기관 추가 → `NOT READY — G-1 blocking`.
