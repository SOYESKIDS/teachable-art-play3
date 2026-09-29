# PHASE 10A — Production Readiness Gap Audit (READ-ONLY · 2026-09-29)

| | |
|---|---|
| 기준 | `saas-v2` · HEAD = origin = `b9a564b` · clean |
| 현재 상태 | **EMPLOYEE UAT READY WITH KNOWN LIMITATIONS — STAGING ONLY** · G-2 Staging ACTIVE — VERIFIED · G-1 NOT APPLIED (P09F-AUTH-1) · M5 NOT APPLIED · J/K/L NOT STARTED · Production 변경 0 |
| 목표 판단 | EMPLOYEE UAT READY (STAGING) → **PRODUCTION RELEASE CANDIDATE** 사이에 남은 것 |
| 방법 | 현재 코드 · migration · test · 문서를 다시 읽고 교차 확인 (이전 상태 문서를 그대로 믿지 않음) · 네 갈래 읽기 전용 조사 + 핵심 주장 직접 재확인 · `M5_app_preflight.mjs` 재실행 |
| 이 phase 의 변경 | 문서만 (runtime 코드 · migration · cutover · Staging · Production 변경 없음) |
| 판정 | **PRODUCTION READINESS AUDIT COMPLETE — IMPLEMENTATION REQUIRED** |

**"RC" 정의 (이 문서의 가정 · JUDGEMENT)**: Production 에서 첫 상품(STARTER) 계약을 DEC-063 에 따라 **활성화할 수 있는 후보 빌드 · DB 상태**. 문서에는 "RC" 용어가 없다.

## 문서

| 파일 | 내용 |
|---|---|
| [release-blocker-matrix.md](./release-blocker-matrix.md) | 모든 blocker · open item 의 현재 상태 · 증거 · Production / UAT 차단 여부 |
| [m5-app-readiness.md](./m5-app-readiness.md) | M5 앱 preflight 7 항목 (현재 2/7) · 원인 파일 · 필요한 변경 |
| [class-mode-readiness.md](./class-mode-readiness.md) | class_mode 가 "release readiness OPEN" 인 정확한 이유 · 최소 단위 |
| [weekly-report-readiness.md](./weekly-report-readiness.md) | weekly_report 동일 |
| [parent-portal-co12.md](./parent-portal-co12.md) | CO-12 · 토큰 · 만료 · 동의 · 사진 · rate limit |
| [ai-ar8.md](./ai-ar8.md) | AR-8 · AI 경로 · AI 없이 완주 증거 |
| [security-readiness.md](./security-readiness.md) | 환경 분리 · 비밀 · RLS · 역할 · 공개 경로 · 사람 확인 필요 항목 |
| [content-readiness.md](./content-readiness.md) | W1~8 · W9~16 · W17~24 |
| [uat-triage-process.md](./uat-triage-process.md) | 직원 피드백 분류 · 상태 · 기록 위치 |
| [production-rc-roadmap.md](./production-rc-roadmap.md) | 지금 할 수 있는 일 / G-1 · M5 · J/K/L · 사람 승인 · Production 전용 · 다음 구현 phase |

## 핵심 결론 (요약)

1. **STARTER Production 활성화를 막는 것**: CO-12 (`parent_portal` 이 STARTER 에 포함 · `blocked_by`) · `class_mode` / `weekly_report` 미출시(`is_released=false`)와 **출시 기준 문서 부재** · CO-2 (데이터 보존 · Production Blocker YES) · BC-3 (STARTER W7~8 규격 미적용 — "W1~8 운영" 표기와 **충돌**, 사람 확인 필요) · Production cutover 전부(G-2 · J/K/L = J · G-1 · M5) · P09D-C2.
2. **M5 앱 준비 2/7** — legacy 화면 · Action · 라우팅 스위치 제거가 필요하다. **G-1 없이도 코드 준비 가능** (Production 은 `main` 에서 배포 · 확인).
3. **AR-8 은 STARTER 차단 요인이 아니다** (STARTER 에 `ai_assist` 없음 · 핵심 흐름 AI 불필요 증거 있음). STANDARD · PREMIUM · PILOT 활성화는 막는다.
4. **새로 찾은 결함 · 위험 (코드 증거)**: 출시 플래그를 사유 · 기록 없이 직접 UPDATE 할 수 있음 · `suspended → active` 는 Readiness 재확인 없음 · 새 Child Portal 은 만료가 없는데 공개 법적 문구는 "30일 만료"(legacy 공유 링크 기준) · 공개 portal API 에 rate limit 없음(IB-5) · `server-only` 가드 없음.
5. **다음 구현 phase 권장**: **PHASE 10B — M5 앱 준비(legacy 없는 교사 · 원장 빌드) 를 별도 브랜치에서** + 작은 보안 하드닝(`server-only`). 직원 UAT Preview · Staging 데이터 · Production 을 건드리지 않는다.
