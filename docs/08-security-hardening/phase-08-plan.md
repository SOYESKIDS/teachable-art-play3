# PHASE 08 — Security & Cutover Integrity Hardening

| | |
|---|---|
| 문서 상태 | 구현 완료 · PRE-COMMIT hardening review 반영 · 사용자 검토 대기 (stage · commit · push 전) |
| 기준 | `saas-v2` · HEAD `5526e9e` (PHASE 07 staging slice) |
| 범위 | privilege boundary · entitlement enforcement · legacy bypass closure · G-1 correctness · M5 completeness · AI safety gate · server-authoritative P0 rules · security regression tests · rollout safety |
| 범위 밖 | 사용자-facing 기능 대량 추가 · 원장 Growth5 UI · HQ 지원 / 리포트 숨김 / onboarding UI · Monthly · Semester · W9~24 · Portal 사진 · 결제 · 모든 Production 변경 · 모든 cutover 적용 · legal 문구 · remote Staging E2E · legacy 코드 삭제 |
| 관련 | [write-surface-matrix.md](./write-surface-matrix.md) · [cutover-readiness.md](./cutover-readiness.md) · [test-matrix.md](./test-matrix.md) · [open-items.md](./open-items.md) · [../07-implementation/cutover-runbook.md](../07-implementation/cutover-runbook.md) · DEC-113 · DEC-114 · DEC-115 |

## 0. 원칙

1. **일반 migration 은 현재 Production legacy 앱을 깨뜨리지 않고, Step H(계약 mapping · 활성화)만으로 legacy 운영 쓰기 동작을 바꾸지 않는다.**
   legacy 앱과 함께 쓰는 쓰기 경로의 entitlement enforcement 는 G-1 controlled cutover 에서만 켜진다 (PRE-COMMIT Issue 1).
2. **SaaS 2.0 전용 경로와 동의 판정은 처음부터 DB 가 판정한다.** UI 가드는 유지하되 같은 규칙을 DB 가 다시 판정한다.
3. **cutover 는 적용하지 않는다.** G-2 · G-1 · M5 파일은 고쳤고 local 에서만 적용 · 되돌리기 · 재적용을 검증했다.
4. **이미 Staging 에 적용된 migration(… `20261001120000`)은 수정하지 않는다.** PHASE 08 migration 6개는 어디에도 적용되지 않은 새 파일이다.
5. **permanent bypass flag 없음 · DB 가 배포 env 를 읽는 설계 없음.**

## 1. 새 일반 migration (forward · local 적용만)

| 파일 | WS | 내용 |
|---|---|---|
| `20261002090000_p08_membership_authority.sql` | WS1 (D2) | self-grant 금지 · 마지막 원장 보호 · 교사→원장 전환 시 담당 반 확인 · 기관/사용자 불변 · 모든 변경 audit (`membership.*` · via rpc/direct/cascade) · HQ Admin 전용 audited RPC 2개 (사유 필수 · 낙관적 잠금 · 기관 교차 검증) |
| `20261002091000_p08_ai_assist_authorization.sql` | WS2 (A1) | `public.ai_assist_authorization` (담당 교사 · AR-8 · 출시 · ai_assist capability · C2 는 monthly_report · 반 쓰기) · `private.ai_assist_allowed` (G-2 저장 gate 용) |
| `20261002092000_p08_session_start_authority.sql` | WS8 (A3) | V2 시작 전환에 Required Content Set 확인 (SS008) |
| `20261002093000_p08_evidence_write_gates.sql` | WS5 · WS9 | **SaaS 2.0 전용 · 동의만**: Growth5 관찰 · 선택 gate · 동의 declined 업로드 거부 · 'deleted' 표시 전 Storage 객체 확인 · Weekly 사진 자격 · 수정본 사진 복사 자격 · 빠른 메모 수정 gate · `org_contract_governed` helper (쓰기 gate 에는 쓰지 않음) |
| `20261002094000_p08_contract_capacity.sql` | WS6 (D6) | 활성화된 계약의 반 범위 추가 시 max_classes · Pilot 반당 15 (CT009) · 정지 후 재개 시 구조 항목 재확인 (CT010) · 초안은 Readiness |
| `20261002095000_p08_legacy_share_safety.sql` | WS10 (D8) | legacy 리포트 숨김 표 · RPC · legacy 공유 읽기에 숨김 · 퇴소 원아 · 계약 적용 기관 parent_portal 조건 |

## 2. cutover 파일 (적용 안 함)

| 파일 | 변경 |
|---|---|
| `M3_hq_role_split_sensitive_access.sql` (G-2) | §5 구성원 직접 INSERT/UPDATE 회수 · §6 AI 초안 저장 gate (AG002) · G2002 에 PHASE 08 객체 확인 |
| `M3_hq_role_split_rollback.sql` | §5 · §6 복원 |
| `G2_app_preflight.mjs` | 18 항목 (구성원 직접 DML 없음 · 초대 RPC · AI 판정 순서) |
| `G2_db_preflight.sql` (신규) | READ ONLY · PHASE 08 객체 · **active HQ Sales account count (필수 · ≥1 이면 ESCALATE)** |
| `M3_entitlement_write_gates.sql` (G-1) | D4 onboarding · 배정 재개 · before_start 일정 · **legacy 공유 쓰기 표면 gate 전부 (출결 · legacy 관찰 · 직접 시작/완료 · 관찰영역 연결 · 사진 재원/반 쓰기)** · G1002 · G1001 은 cutover-time guard 로 명시 |
| `M3_entitlement_write_gates_rollback.sql` (신규) | trigger 6 · 함수 제거 · 사진 판정을 동의만으로 복원 · audit |
| `M5_legacy_write_revoke.sql` (완성) · `M5_legacy_write_rollback.sql` · `M5_preflight.sql` (신규) | 회수 A~F · M5001 · M5002 · OB008 · audit · rollback · DB preflight |
| `M5_app_preflight.mjs` (신규) | 7 항목 · `--root` (배포할 빌드 점검) · legacy UI 꺼짐 · legacy Action/스위치 의존 0 |
| `JKL_start_gate.mjs` · `JKL_window_preflight.sql` (신규) | J 시작 조건 (앱 · DB) · J/K/L 을 한 controlled window 에서 연속 수행 |

## 3. 앱 변경 (서버)

| 파일 | 변경 |
|---|---|
| `src/app/admin/(dashboard)/organizations/actions.ts` | 원장 · 교사 초대의 membership 등록을 `hq_add_organization_member` RPC 로 |
| `src/lib/ai/ai-assist-gate.ts` (신규) | `authorizeAiAssist` (DB 판정 · fail closed) · `findExplicitIdentifier` |
| `observation-ai-actions.ts` · `growth-report-ai-actions.ts` | provider 호출 전: 판정 → 환경변수 → 식별자 검사 |
| `LegacyTeacherObservationPage.tsx` · `teacher/growth-reports/[reportId]/page.tsx` · AI Section 2개 | AI 버튼 = 환경변수 ∧ DB 판정 · 사용 불가 문구 |
| `legacy-session-actions.ts` | saas_v2 모드면 인증 · DB 접근 전에 거부 (A2) · EN003 문구 |
| `observation-media-actions.ts` | 업로드 준비 시 declined 안내 · MD004 · MD005 · EN003 문구 |
| `rpc-errors.ts` | 사용자 문구 코드 MB · AG · MB005 충돌 |

## 4. Workstream 결과

| WS | 결과 | 상태 · 남은 것 |
|---|---|---|
| WS1 D2 | DB 강제: HQ Admin RPC · 사유 · audit · self-grant · 마지막 원장 · 교차 검증 | **TARGET IMPLEMENTED / CUTOVER PENDING** — 직접 DML 회수는 G-2 §5 (P08-OPEN-2) |
| WS2 A1 | provider 전 DB 판정 · 식별자 검사 · G-2 §6 저장 gate · M5 legacy AI 회수 | 새 앱 배포 후 효력 (P08-OPEN-10) · AR-8 OPEN |
| WS3 D1 | M5 완성 (preflight · guard · audit · rollback · test) | 적용은 J/K/L window |
| WS4 D4 | 초안 · 시작 전 계약 범위 배정 (DEC-115) · G-1 이후 onboarding 전 과정 test | G1001 = cutover-time guard (P08-OPEN-5) |
| WS5 D5 | 쓰기 표면 전수 · SaaS 2.0 전용 gate 는 일반 migration · legacy 공유 표면 gate 는 G-1 | — |
| WS6 D6 | 활성 계약 범위 추가 · 재개 재확인 · 초안 · 원아 등록은 DEC-051 그대로 | — |
| WS7 A2 | 서버 mode-aware 거부 · G-1 에서 직접 시작/완료 entitlement · M5 회수 · J/K/L window | P08-OPEN-1 (transitional) |
| WS8 A3 | 시작 RPC 필수 섹션 판정 | P08-OPEN-3 |
| WS9 A4 | 동의 판정(모든 기관) · Weekly 자격 · 출결/업로드 entitlement 는 G-1 | P08-OPEN-4 |
| WS10 D8 | legacy 공유 읽기 안전장치 · 숨김 RPC | P08-OPEN-6 |
