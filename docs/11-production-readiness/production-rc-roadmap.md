# Production RC Roadmap (PHASE 10A · 증거 기반)

RC = Production 에서 STARTER 계약을 DEC-063 에 따라 활성화할 수 있는 후보 (JUDGEMENT · README 참고). **현재 Production Ready 아님.**

## A. 직원 UAT 진행 중 지금 할 수 있는 것 (Production · G-1 재시도 · UAT 데이터 불필요)

| # | 작업 | 효과 | 비고 |
|---|---|---|---|
| A1 | **M5 앱 준비 — legacy 없는 교사 · 원장 빌드** (별도 브랜치) | M5 앱 preflight 2/7 → 7/7 목표 · J/K/L start gate 조건 | [m5-app-readiness.md](./m5-app-readiness.md) · legacy 조회 · 공유 읽기는 유지 |
| A2 | `import "server-only"` 가드 | 비밀 모듈 client 번들 유입 방지 | 앱 · 테스트 쉬움 |
| A3 | class_mode · weekly_report **출시 체크리스트 초안** | 출시 기준 부재 해소의 전 단계 | 문서 · 사람 승인 필요 |
| A4 | 8주 모아보기(DEC-069) 수락 기준 · 테스트 | weekly 출시 근거 | local 테스트 |
| A5 | 문서 정합성 정정 (미커밋 표기 · P08-OPEN-8/13 · 09D 회전 문구) | 상태 신뢰성 | 문서 |
| A6 | UAT 피드백 triage 운영 | [uat-triage-process.md](./uat-triage-process.md) | — |
| A7 | P09-D1 앱 보완 (초대 전 `current_hq_role()='admin'` 확인) | PRE-G2 Production 초대 메일 선행 제거 | 앱 · 작음 |

## B. G-1 이 필요한 것

P09F-AUTH-1 해소(읽기 전용 pooler connectiontest 1회 기록) → 별도 승인으로 Staging G-1 (K 단독 · P09E-O1) · EN001/EN002 동작 Staging 확인 · 이후 full J/K/L rehearsal 전 G-1 rollback.

## C. M5 가 필요한 것

legacy 직접 쓰기 회수 · P08-OPEN-1 종료 · class_mode 출시 판단(JUDGEMENT: M5 후).

## D. full J/K/L 이 필요한 것

Staging 에서 J(A1 빌드) → K(G-1) → L(M5) 한 window rehearsal → Production 같은 순서.

## E. 사람 승인 · 결정이 필요한 것

CO-12 (portal 만료 · 재발급 · 사후 보존 · 법적 문구 30일 정합) · CO-2 (보존 · 삭제) · BC-3 (W7~8 승인 여부) · class_mode · weekly_report 출시 체크리스트 승인 · audited release RPC · `suspended→active` 재확인 migration (Staging 적용 승인) · IB-5 rate limit 방식 · AR-8 (STANDARD · PREMIUM · PILOT) · CO-9 · CO-10 · DB-9 (사진 · 계속 비활성) · W9~24 콘텐츠 승인 · Protection Exception · env 범위 사람 확인 · P09D-C2.

## F. Production 에서만 할 수 있는 것

G-2 · J/K/L(G-1 · M5) 적용 · Production env 범위 확인 · Staging secret key 회전 반영 · 출시 플래그 전환 · 첫 STARTER 계약 활성화 · 공개 법적 문구 갱신(portal 출시 시).

## 가장 작은 다음 구현 phase — 권장

**PHASE 10B — M5 앱 준비: legacy 없는 교사 · 원장 빌드 (별도 브랜치) + `server-only` 가드**

- 선택 이유: 앱 단독 · local 로 독립 검증 가능(M5 앱 preflight 7/7 · local role E2E · pgTAP) · Production 불필요 · G-1 재시도 불필요 · M5 앱 blocker 5개를 직접 줄임 · 직원 UAT 데이터 · Preview 를 건드리지 않음(별도 브랜치)
- 범위 밖: G-1 · M5 · J/K/L 적용 · migration · Staging 쓰기 · Production
- 완료 기준: `M5_app_preflight` 7/7 · `JKL_start_gate` app READY · local role E2E 교사 · 원장 · 학부모 PASS · legacy 리포트 · 공유 **조회** 유지 · lint · tsc · build
- 그다음(PHASE 10C 후보): audited capability release RPC + `suspended→active` 재확인 + pgTAP (migration · Staging 적용은 승인)

## 진행 기록

| phase | 브랜치 | 상태 |
|---|---|---|
| 10B · 10B.1 | `phase-10b-m5-app-readiness` @ `252c5f5` | M5 앱 7/7 · JKL 앱 READY · G2 preflight lifecycle-safe · 병합 승인 전 |
| **10C** | `phase-10c-release-controls` | **안전한 출시 경로 local 구현** (`set_capability_release` · blocker DB 강제 · 직접 UPDATE 회수 · audit 사유 · actor) · **`suspended→active` Readiness local 수정** · pgTAP 279 · E2E 48 PASS · **migration Staging 미적용** · **어떤 기능도 출시하지 않음** · Production 변경 0 · [phase-10c-release-controls.md](./phase-10c-release-controls.md) |

A3(출시 체크리스트 초안)은 10C 에서 작성했다 — [class_mode](./class-mode-release-checklist.md) · [weekly_report](./weekly-report-release-checklist.md) **DRAFT — HUMAN APPROVAL REQUIRED**.
E 의 "audited release RPC · `suspended→active` 재확인 migration" 은 **local 구현 완료 · Staging 적용 승인 대기**로 바뀌었다. CO-12 는 계속 OPEN · class_mode / weekly_report 사람 출시 승인은 계속 필요.

다음 후보: PHASE 10C Staging migration rehearsal (별도 승인 · 적용 전 Staging 정지 계약 확인) · 8주 모아보기 수락 테스트 (A4) · CO-12 결정.
