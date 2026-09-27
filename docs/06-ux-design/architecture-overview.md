# UX / Design System — Architecture Overview

| | |
|---|---|
| 문서 상태 | PHASE 06 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `dc5ba3d` |
| 대상 독자 | PM · 교육기획 · 디자이너 · 프론트엔드 개발자 |
| 선행 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [../02-ia/ia-overview.md](../02-ia/ia-overview.md) · [../03-commerce/entitlement-policy.md](../03-commerce/entitlement-policy.md) · [../04-ai-report/architecture-overview.md](../04-ai-report/architecture-overview.md) · [../05-data-security/architecture-overview.md](../05-data-security/architecture-overview.md) |
| PHASE 06 문서 | **architecture-overview.md** · [current-frontend-audit.md](./current-frontend-audit.md) · [navigation-screen-system.md](./navigation-screen-system.md) · [class-mode-observation.md](./class-mode-observation.md) · [report-parent-experience.md](./report-parent-experience.md) · [copy-terminology.md](./copy-terminology.md) · [design-system-accessibility.md](./design-system-accessibility.md) · [open-items.md](./open-items.md) |
| 관련 결정 | DEC-097 ~ DEC-112 (및 DEC-027 · DEC-034 ~ DEC-044 · DEC-056 · DEC-060 · DEC-066 ~ DEC-075 · DEC-085 · DEC-093) |

> 이 PHASE는 **UX 구조 · 화면 상태 · 역할별 navigation · 문구 · 디자인 시스템 방향**을 정한다. src · component · CSS · route 구현은 PHASE 07이다.
>
> 핵심 질문은 "화면을 예쁘게 만들 것인가"가 아니라 **"각 역할이 생각하지 않고 다음 행동을 이해하고, 서로 다른 상태를 혼동하지 않는가"**다.

---

## 1. Executive UX Summary

| 주제 | 확정 내용 | 결정 |
|---|---|---|
| Shell | 역할별 App Shell 분리 · HQ Sales 별도 Shell · context 항상 표시 | DEC-097 |
| Teacher 메뉴 | 오늘의 수업 · 수업 이력 · 리포트 | DEC-097 |
| STARTER 원장 | 홈(대시보드) 없음 · 운영 기능은 모두 제공 · 우회 집계 없음 | DEC-097 · DEC-106 |
| Class Mode | 전체 화면 immersive · 카드에서 직접 시작/완료 없음 · BEFORE 필수 확인 · 수업 마치기 · 복구 처리 분리 · offline banner | DEC-098 |
| 관찰 | [관찰 완료하고 다음 아이] · [임시저장] · [나중에 작성] · [관찰 마무리]는 일괄 완료 아님 | DEC-099 |
| 빠른 메모 | 나만 보는 메모 · 자동 사용 없음 · 저장 중/저장됨/저장 실패 | DEC-099 |
| 민감 텍스트 | P0 지속 client storage 기본 저장 없음 · explicit server save | DEC-099 |
| Growth5 | Teacher "관찰 포인트" · Parent "관찰된 모습" · 기록 없음 = 미선택 · raw Stage 비노출 | DEC-100 |
| Weekly | 출처 표시 composer · 대기열 상태 · 리포트 완료 · AI 필수 없음 · 사진 0~3장 선택 · 선택 사항 (DEC-039) | DEC-101 |
| 수정 · 숨김 · 인쇄 | 수정본 · 최근 완료본 ≠ 표시 중 · 숨김/다시 공개 사유 필수 · Hidden 인쇄 불가 · 업데이트됨 YYYY.MM.DD | DEC-102 |
| Parent | 이번 주 = 현재 주 수업 week의 visible Weekly · 빈/실패 단일 문구 · 사진 미표시 시 영역 없음 · 기관명 사용 | DEC-103 |
| 명칭 | 월간 요약 · 4주 단위 · 8주 기록 모아보기 · 리포트 명칭 매핑 | DEC-104 |
| AI | AI로 문장 정리하기 · 원문/제안/확정 · 실패해도 계속 · 근거 부족 문구 | DEC-105 |
| 상태 화면 | SY-01 / SY-02 / 읽기 전용 / 준비 안 됨 · Readiness checklist · Pilot · 초과 인원 | DEC-106 |
| 사진 공유 기록 | 운영 상태 3값 · 법적 표현 금지 · Parent 사진은 CO-9 · CO-10 · DB-9 이후 | DEC-107 |
| HQ 지원 · Sales | 지원 목적 열람 + 사유 + audit · Sales 아동 경로 없음 | DEC-108 |
| 디자인 | Warm Premium Education SaaS · Target palette · Yellow · serif 제외 · 파생 토큰 PROPOSED | DEC-109 |
| 반응형 · 접근성 | 역할별 기기 우선 · Class Mode 고밀도 전환 없음 · WCAG 2.2 AA 실무 baseline | DEC-110 |
| 상태 · 확인 | 상태 어휘 · 화면 상태 9종 · 충돌 UX · 확인 3단계 (typed-name 필수 아님) | DEC-111 |
| 문구 | 용어 사전 · modal 범위 · Cutover 안내 · 법적 문구 경계 | DEC-112 |

---

## 2. UX 원칙

1. **Warm** — 아이보리 바탕 위 흰 화면. 차가운 회색 SaaS 느낌을 피한다.
2. **Calm** — 화면당 강조 1개. 움직임은 짧고 조용하게.
3. **Professional** — 교직원이 매일 쓰는 업무 도구.
4. **Child-centered, not childish** — 캐릭터 · 무지개 없음. 아이 이야기는 기록 내용으로 전한다.
5. **Teacher-efficient** — 수업 중 한 화면 한 행동 · 큰 touch target.
6. **Evidence-first** — 실제 말 · 장면 · 교사 문장이 화면의 주인공.
7. **Non-evaluative** — 숫자 · 진행바 · 등급 색 · 순서 화살표 없음 (DEC-038 · U-1 ~ U-5).
8. **Privacy-conscious** — 최소 노출 · 이유를 알리지 않는 실패 화면 · 민감 텍스트 지속 client 저장 없음.
9. **Mobile-readable** — Parent는 단일 열 · 큰 글자.
10. **No AI spectacle** — 작업 이름으로 부르고 반짝이 아이콘을 쓰지 않는다.

---

## 3. 역할 경험 모델

| 역할 | 주 목표 | 핵심 작업 | 주 기기 | 정보 밀도 | 메뉴 깊이 | 치명 오류 | 민감 경계 |
|---|---|---|---|---|---|---|---|
| Public Visitor | 이해 · 문의 | 상품 비교 · 20분 데모 | mobile · desktop | 여유 | 1 | 가격 · 구성 오표기 | 내부 준비 상태 비노출 |
| Teacher | 수업 진행 · 기록 | 오늘의 수업 → BEFORE → 수업 → 출결 · 관찰 → Weekly | **tablet** (mobile 가능) | 중간 · 큰 action | 2 | 잘못된 상태 전환 · 기록 유실 | 다른 반 · 계약 정보 |
| Director | 운영 파악 · 조치 | 수업 운영 · 리포트 · 숨김 · 학부모 공유 · 사진 공유 기록 | **desktop** (tablet) | 높음 | 2 | 우회 집계 · 잘못된 숨김 | AI 초안 · 교사 초안 · 빠른 메모 |
| HQ Admin | 도입 · 계약 · 준비 | 기관 → 계약 → Readiness → 활성화 → 지원 | desktop | 매우 높음 | 3 | 미준비 활성화 | 민감 기록은 지원 흐름만 |
| HQ Sales | 영업 | 문의 → 기관 영업 요약 → 계약 메타 | desktop | 높음 | 2 | 아동 정보 노출 | 아동 데이터 전부 |
| Parent | 아이 기록 읽기 | 이번 주 · 지난 기록 | **mobile · 한 손** | 여유 | 1 | 다른 아이 · 내부 상태 | consent · raw Stage · 초안 |

기능별 Teacher 기기 권장: 출결 · 빠른 메모 · 사진 · 짧은 관찰 = mobile 가능 / Class Mode = tablet / Weekly 작성 = tablet · desktop (mobile은 확인 · 간단 수정).

---

## 4. Current → Target

| 영역 | CURRENT (`dc5ba3d`) | TARGET |
|---|---|---|
| 세션 전환 | 카드에서 시작 · 완료 · 취소, scheduled → completed 가능, 원장 · HQ도 가능 | [수업 준비] → BEFORE → [수업 시작] → [수업 마치기] · 원장/HQ는 복구 처리만 |
| HQ | admin · sales 같은 화면 · "운영 관리자" | Admin / Sales Shell 분리 |
| 관찰 | 구 미술 5영역 체크 · 수동 저장 · AI 정리 검토 | 관찰 포인트 + Stage · 관찰 완료하고 다음 아이 · AI 선택 |
| 리포트 | 기간형 legacy · AI 검토 완료 관찰만 근거 | Weekly composer · AI 무의존 · 수정본 · 숨김 |
| 학부모 | 리포트별 링크 · 실패 사유 나열 | 아동별 "아이 기록" · 단일 실패 문구 |
| 상태 화면 | not-found 1개 · 나머지는 화면별 inline | SY-01 · SY-02 · 읽기 전용 · 준비 안 됨 · 화면 상태 9종 |
| 디자인 | navy · yellow · trust-blue · 임의 px · 흐린 글자 | Target palette · semantic token · type scale |
| 접근성 | 입력칸 focus 제거 · modal 16개 focus trap 없음 | visible focus · 접근 가능한 dialog |

상세 근거는 [current-frontend-audit.md](./current-frontend-audit.md).

---

## 5. P0 / P1 / P2

| 구분 | 범위 |
|---|---|
| **P0** | 역할별 Shell · Teacher/Director/HQ/Sales/Parent 메뉴 · Class Mode (BEFORE · DURING · AFTER) · 복구 처리 · 빠른 메모 · 관찰 포인트 입력 · AI C1 (조건 충족 시) · Weekly composer · 대기열 · 수정본 · 숨김 · 단건 인쇄 · 아이 기록 (이번 주 · 지난 기록) · SY-01/SY-02 · 읽기 전용 · Readiness checklist · 기관 상세 안 계약 · 이용권 · 사진 공유 기록 · HQ 지원 열람 · design token 기반 · 접근성 기본 |
| **P1** | Monthly (월간 요약 · 4주 단위) · C2 · C3 · 일괄 인쇄 (STANDARD · PREMIUM) · 독립 Product Version / Contract 목록 · 빠른 메모 → 관찰 옮기기 · 충돌 비교 UI · 알림 필요성 검토 |
| **P2** | Semester · 학기 포트폴리오 · 완전 offline sync · 단체 사진 UX (CO-9 이후) |

---

## 6. UX-1 ~ UX-35 → Decision 대응표

| UX | 주제 | Decision |
|---|---|---|
| UX-1 ~ UX-4 | Role Shell · Teacher/Director/Parent navigation | DEC-097 (UX-4는 DEC-103에도 반영) |
| UX-5 · UX-6 · UX-20 | Class Mode · BEFORE · Session Recovery | DEC-098 |
| UX-7 · UX-8 | Quick Memo · Observation 입력 | DEC-099 (Growth5 표시 부분은 DEC-100) |
| UX-9 | Growth5 명칭 | DEC-100 |
| UX-10 · UX-11 | Weekly composer · readiness | DEC-101 |
| UX-12 · UX-13 · UX-29 | Revision · Hide/Unhide · Print | DEC-102 |
| UX-14 · UX-15 · UX-31 | Parent Growth5 · Parent 빈/오류 · 이번 주 | DEC-103 |
| UX-16 · UX-17 | Monthly · 8주 명칭 | DEC-104 |
| UX-18 | AI Assist | DEC-105 |
| UX-19 | Entitlement · Read-only | DEC-106 |
| UX-21 | Consent · Photo | DEC-107 |
| UX-22 | HQ Sensitive Support | DEC-108 |
| UX-23 · UX-24 · UX-32 | Token · Typography · Brand palette | DEC-109 |
| UX-25 · UX-26 | Responsive · Accessibility | DEC-110 |
| UX-27 · UX-28 · UX-33 | Status · Save/Concurrency · Confirmation | DEC-111 (저장 규칙은 DEC-099) |
| UX-30 · UX-34 · UX-35 | Terminology · Legacy 표시 · Modal 범위 | DEC-112 (Legacy 명칭은 DEC-104에도 반영) |

UX-7 · UX-8 · UX-10 · UX-12 · UX-14 · UX-23 · UX-28 · UX-29 · UX-31 · UX-33은 분석안에서 **수정되어** 확정되었다 (관찰 버튼 · 빠른 메모 상태 · 사진 장수 · 최근 완료본 표시 · 섹션 순서 · Yellow · client 저장 · Hidden 인쇄 · 이번 주 의미 · 확인 단계).

---

## 7. 이 PHASE에서 결정하지 않은 것

| 항목 | 위치 |
|---|---|
| 보존 · 삭제 · export 기간 | CO-2 |
| 단체 사진 | CO-9 · DB-5 |
| 법적 consent 의미 · 문구 | CO-10 |
| Portal 만료 · 재발급 기간 | CO-12 |
| Portal 사진 서명 credential | DB-9 |
| Monthly · Semester 최소 근거 · 학기 경계 | AR-1 · AR-2 |
| 원장 교사 초대 · 배정 권한 | PH3-2 · UI-9 |
| Product Version publish 강한 확인 방식 (typed-name 포함 여부) · AI 요청 취소 지원 | PHASE 07 |
| 파생 색 대비 검증 | PHASE 07 |
