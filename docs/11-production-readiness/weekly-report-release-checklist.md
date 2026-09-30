# weekly_report 출시 체크리스트 (PHASE 10D · 승인용)

> **NOT APPROVED — 출시하지 않는다.** 이 문서는 승인 판단을 위한 증거 목록이다. `is_released` 는 `false` 그대로다.
> 출시(플래그 전환)는 `public.set_capability_release('weekly_report', true, <사유>, <updated_at>)` 로만 한다 (PHASE 10C · Staging 적용 · 확인 완료).
> 순서: 아래 **BLOCKED · HUMAN APPROVAL REQUIRED 항목 해소 → 사람 승인 → Staging 출시 rehearsal (별도 승인) → Production**.

| | |
|---|---|
| 대상 | `platform_capabilities.weekly_report` — 2026-09-30 Staging 읽기 전용 확인: `is_released = false` · `blocked_by = {}` |
| 근거 | DEC-063 · DEC-065 (Growth5 텍스트) · DEC-066 (AI 없음) · DEC-069 · DEC-104 (8주 기록 모아보기) · DEC-074 (교사 완료 = 게시 가능) · [weekly-report-readiness.md](./weekly-report-readiness.md) · [phase-10d-starter-release-readiness.md](./phase-10d-starter-release-readiness.md) |
| 출시의 효과 | 계약 Readiness 의 `feature:weekly_report` 항목만 충족 — 런타임 쓰기 권한은 바뀌지 않는다 (pgTAP R13) |
| 상태 표기 | **PASS** = 객관 증거 있음 · **FAIL** = 기준 미충족 · **HUMAN APPROVAL REQUIRED** = 사람 판단 · 확인만 남음 · **BLOCKED BY &lt;code&gt;** = 다른 항목 해소 전 판정 불가 |
| 승인자 · 승인일 | (없음) |

## 판정 요약

| PASS | FAIL | HUMAN APPROVAL REQUIRED | BLOCKED |
|---|---|---|---|
| 18 | 0 | 5 | 4 (CO-12 · G-1 · M5 · P10C-PROD) |

**현재 결론: 출시 불가 — BLOCKED 4 · 사람 승인 5 남음.** (PHASE 10A 의 "8주 모아보기 테스트 없음"은 **PASS 로 닫힘**.)

## 1. 작성 · 조회 흐름

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 1 | 결정적 초안 | `create_weekly_report_draft` = 차시 제목 · s13 · 교사 메모 · 같은 입력 = 같은 초안 | `20261001120000_m4_report_portal_rpcs.sql` · `p0_hardening` 116/116 (2026-09-30 local) | **PASS** |
| 2 | 교사 명시적 완료 | `complete_report_revision` 만 · 완료 조건 (완료 관찰 ≥1 · 주제 · 교사 관찰 · 가정 대화 · RP006) | `p0_hardening` · local role E2E (Weekly 완료) | **PASS** |
| 3 | 교사 검토 데이터만 | 원장 · 학부모 · 모아보기는 **완료 revision** 만 읽는다 | RLS `report_revisions` (원장 = complete) · pgTAP 10D A9 (원장 초안 0) · loader `latest_completed_revision_id` 필터 | **PASS** |
| 4 | 완료 revision 불변 · 정정 | 완료 후 수정 불가 · 2번째 revision 부터 정정 사유 | `p0_hardening` · `report_revisions_correction_required_check` | **PASS** |
| 5 | 과거 기록 불변 | 조회(모아보기 포함)는 reports · revisions · audit 를 바꾸지 않는다 | pgTAP 10D M1 · M2 (역할별 조회 전후 지문 동일) · 앱 정적 검사 (쓰기 · server action 없음) | **PASS** |

## 2. STARTER 8주 기록 모아보기 (DEC-069 · DEC-104)

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 6 | STARTER = 8주 | STARTER 2026.1 week 1~8 · 모아보기 구간 = W1~W8 | pgTAP 10D S1 · 앱 테스트 1 | **PASS** |
| 7 | 역할 · 범위 | 담당 교사 = 담당 반 아이만 · 다른 반 교사 0 · 원장 = 기관 · 완료본만 · 다른 기관 0 · 기준 Weekly 가 선택 기관(`?org`) 소속이 아니면 not_found | pgTAP 10D A1~A12 · 앱 테스트 2·3 · **PHASE 10D 수정: 기관 확인 추가** | **PASS** |
| 8 | 구간 밖 주 | 계약 범위 밖 주를 조용히 섞지 않는다 · 범위 밖 · 계약 없음 = 화면 안내 | 앱 테스트 4 · pgTAP 10D W2 · G3 · **PHASE 10D 수정: 구간 계산 3개 edge case** | **PASS** |
| 9 | 빈 주 | 완료본 없는 주 = "완료된 주간 리포트가 없습니다." · 내용 · 날짜를 만들지 않음 · 사유 구분 없음 | 앱 테스트 5-7 · pgTAP 10D W3 | **PASS** |
| 10 | 학부모 노출 없음 | 모아보기는 staff 전용 (portal 에 없음) | 앱 테스트 2·3 (ChildPortalView) | **PASS** |

## 3. Growth5 · 표현 · AI

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 11 | Growth5 텍스트만 | 지표 이름 · stage 텍스트 · 숫자 변환 없음 (DEC-065) · 모아보기는 Growth5 값을 싣지 않음 | schema `20261001092000…:427-430` · 앱 테스트 5-7 (출력 키 = topic · quote · 표시 flag 뿐) | **PASS** |
| 12 | 점수 · 순위 · 진단 저장 없음 | reports · revisions · media 에 점수 · 순위 · 등급 · 백분율 · 진단 열 없음 | pgTAP 10D G1 | **PASS** |
| 13 | 점수 · 순위 · 진단 표현 (자동 검사) | weekly · 모아보기 · portal 화면 코드에 점수 · 순위 · 진단 표현 없음 | PHASE 10D 문구 검사 21개 파일: 해당 단어 2건 = 모두 부정 안내문 ("점수나 평가가 아니라" `ChildPortalView.tsx:240` · "평가 점수가 아닙니다" `GrowthReportAttendanceSummary.tsx:44`) | **PASS** |
| 14 | 표현 · 톤 최종 검토 | 발달 진단 · 비교로 읽히지 않는지 사람이 화면으로 확인 | 자동 검사는 사람 검토를 대신하지 않는다 | **HUMAN APPROVAL REQUIRED** |
| 15 | STARTER AI 의존 없음 | weekly · 모아보기 경로에 AI 호출 · AI 컬럼 없음 · STARTER 기능에 ai_assist 없음 (DEC-070) | `weekly-report-actions.ts:14` · PHASE 08 app gates 13/13 · 앱 테스트 8·10 · pgTAP 10D S2 | **PASS** |

## 4. 원장 · 학부모 · audit

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 16 | 원장 숨김 · 다시 공개 | 사유 · audit · 자동 재공개 없음 (DEC-074) | `p0_hardening` (숨김 audit) | **PASS** |
| 17 | 학부모 DTO | stage · 사진 없음 · 지표 이름만 | portal DTO · `production_shaped` | **PASS** |
| 18 | 출시 audit · 되돌리기 | `capability.changed` reason · actor · released_from/to · `set_capability_release('weekly_report', false, …)` | pgTAP R10~R12 · Staging 10C 확인 | **PASS** |
| 19 | RLS 회귀 | 전체 pgTAP · cutover 테스트 | 2026-09-30 local 301/301 · G1 24 · G2 67 · M3 70 · M5 46 | **PASS** |
| 20 | 학부모 노출 (parent_portal) | weekly 의 학부모 가치 = portal · STARTER 활성화에 portal 필요 | `parent_portal.blocked_by = {CO-12}` (2026-09-30 Staging) | **BLOCKED BY CO-12** |

## 5. 의존 · Production · 결정

| # | 항목 | 수락 기준 | 증거 | 상태 |
|---|---|---|---|---|
| 21 | G-1 의존 | weekly 쓰기 gate 는 G-1 전에도 SaaS 2.0 RPC 에 있음 (RP007) · 수업 일정 계약 gate(EN002)는 G-1 | Staging G-1 NOT APPLIED | **BLOCKED BY G-1** (JUDGEMENT: STARTER 활성화 전제 · 사람이 면제 결정 가능) |
| 22 | M5 의존 | legacy 성장 리포트 쓰기 회수 | 앱 7/7 · Staging M5 NOT APPLIED | **BLOCKED BY M5** |
| 23 | Production 10C | Production 에 audited 출시 경로 적용 · 확인 | Production 접근 없음 · 미적용 | **BLOCKED BY P10C-PROD** |
| 24 | Staging 출시 · 미출시 rehearsal | 한 번 출시 → Readiness 확인 → 미출시 · audit 2건 | 수행하지 않음 | **HUMAN APPROVAL REQUIRED** (별도 승인) |
| 25 | Staging 쓰기 흐름 직원 UAT | 사람이 Staging 에서 Weekly 작성 → 완료 → 모아보기 확인 | 직원 UAT 기록 = 읽기만 · 모아보기 Staging 확인 기록 없음 | **HUMAN APPROVAL REQUIRED** |
| 26 | 교사 계정 자격증명 | 노출됐던 `staging-teacher@example.test` 비밀번호 새 값 재설정 확인 | 저장소로 증명 불가 | **HUMAN APPROVAL REQUIRED** |
| 27 | 최종 승인 | 승인자 · 날짜 · 사유 | 없음 | **HUMAN APPROVAL REQUIRED** |


## 6. 출시 · 되돌리기 절차 (승인 후에만)

class_mode 체크리스트 §6 과 같다 (`weekly_report` 로 바꿔 수행). 이미 완료된 Weekly · 숨김 상태는 미출시로 바뀌지 않는다.
