# PHASE 10G — 최종 직원 UAT (Staging Preview)

> **배포 상태: PREVIEW TECHNICALLY READY — SECURITY ROTATION REQUIRED BEFORE STAFF DISTRIBUTION**
> **PHASE 10H (2026-10-01):** 교사 자격증명 CLOSED · **P09D-C2 OPEN — 운영자가 미룸** → **DO NOT DISTRIBUTE YET**. 인계: [phase-10h-employee-uat-handoff.md](./phase-10h-employee-uat-handoff.md)
> 아래 §6 의 두 보안 항목 중 **교사 계정 자격증명 = CLOSED (2026-10-01)** · **P09D-C2 = OPEN** — P09D-C2 가 닫히기 전에는 **직원에게 URL · 계정을 배포하지 않는다**. 운영자 기술 확인은 계속 가능.
> 학부모 화면(Parent Portal)은 이번 UAT 범위가 아니다 — CO-12 OPEN.

| | |
|---|---|
| 직원 UAT Preview | `https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app` (saas-v2 branch alias) |
| 배포 | Vercel `dpl_5DJc56kGg7Nd9eiG3bw13XmLvskU` · target **preview** · Ready · 2026-10-01 18:40 KST · commit `1d901c62aaae491e6d7778f742882db11d7408b3` |
| 앱 → DB | 앱 번들 Supabase = **Staging `itcddooiuqsqingfhxkk` 만** (preview_probe · 정적 자산 13/13) · Production ref 없음 |
| saas-v2 갱신 | **fast-forward** `80537ae → 1d901c6` (PHASE 10B~10G · 9 commits) · main `faa8f9a` 그대로 |
| 데이터 | 합성 기관 · 반(무지개반(가상)) · 원아 · 계정만 · 실제 아동 · 학부모 정보 없음 |
| Production | DB 변경 0 · Vercel Production 변경 0 |

## 1. 이번 phase 에서 바뀐 것

| 항목 | 내용 |
|---|---|
| 오늘의 수업 보드 | 종료된 배정(completed · cancelled)의 **예정** 수업은 오늘 · 지난 · 날짜 없음 갈래에서 뺀다 (시작할 수 없는 이력). 진행 중 수업 · 오늘의 완료/취소 · 수업 이력 화면은 그대로. `buildTodayBoard` (서버 · `src/lib/staff/class-session-queries.ts`) · 범위(RLS) 변경 없음 · 테스트 4/4 |
| Staging 예정 수업 | SOYE-STARTER-2026.1 W1~W8 8건 생성 — W1 **2026-10-01**(오늘 · 즉시 시험) · W2~W8 = 기존 합성 수업의 월요일 주기 10-05 · 10-12 · 10-19 · 10-26 · 11-02 · 11-09 · 11-16 (`class_sessions` 에 시각 열 없음 = 날짜만). HQ Admin 수업 예정 흐름(`createClassSessionAction`)과 같은 확인 · 같은 열 · 결정적 id · 반복 실행 안전 (`supabase/content/starter_2026_1_staging_uat_sessions.sql` · local rehearsal 17/17) · 적용 2026-10-01 09:08 UTC |
| 기존 STAGING-P8 수업 4건 | **삭제 · 수정 없음** (예정 · W1~W4 · 종료된 배정) — 보드에는 안 나오고 데이터는 남는다 |
| harness | `e2e_roles` 교사 W1 카드 · 준비 화면 canonical 확인 (읽기 전용) · `ui_audit` 교사 W1 수업 · HQ Sales 화면 추가 |

## 2. 검증 결과

| 항목 | 결과 |
|---|---|
| 읽기 전용 역할 smoke (새 Preview) | **PASS 29 · SKIP 5 · FAIL 0** — HQ Admin · HQ Sales · Director · Teacher 로그인 PASS · 교사 보드에 W1 「유치원 가는 날」 · 종료 STAGING-P8 예정 수업 없음 · W1 준비 화면 = canonical 제목 · §1 첫 문장 · 수업 목표 · 합성 차시 표시 없음 · HQ Admin 출시 dialog 사유 필드 PASS (**OLD_PREVIEW_CODE 해소** · 제출 안 함) · SKIP = 쓰기 · 실패 로그인 단계 |
| UI smoke (desktop 1366 · tablet 768 · mobile 390) | 18 화면: login · 교사 보드 · **교사 W1 수업** · 원장 · HQ Admin · **HQ Sales** — console 오류 0 · 실패 요청 0 · 페이지 가로 넘침 0 · h1 1 · 이름 없는 버튼 0 · label 없는 입력 0 · focus 표시 누락 0 |
| UI 경미 (비차단) | 작은 터치 대상: HQ 기관 화면 링크 196×16 (desktop · tablet) · 교사 W1 준비 체크박스 24×24 (WCAG 2.2 AA 최소 충족) · 1×1 링크(숨김 이동 링크로 보임) · HQ Sales 표가 tablet/mobile 에서 표 영역 안 가로 스크롤 (페이지 넘침 없음) |
| Staging 데이터 (배포 후 · 읽기 전용) | 계약 ACTIVE · active 1 · suspended 0 · 합성 아닌 사용자 0 · 현재 배정 SOYE-STARTER-2026.1 · W1~W8 published (136/136 canonical) · 새 수업 8 · STAGING-P8 배정 completed · 수업 4 그대로 · 업무 데이터 지문 = 수업 생성 직후와 동일 · content readiness ok |
| cutover · 기능 | 10C ACTIVE · G-2 ACTIVE — VERIFIED · G-1 NOT APPLIED · M5 NOT APPLIED · class_mode · weekly_report 미출시 · parent_portal CO-12 · ai_assist AR-8 · branding CO-8 |
| local 회귀 | pgTAP 8 files **368/368** · cutover 24 · 67 · 70 · 46 · 앱 테스트 96 · M5 7/7 · JKL READY · G2 17/18 (기대) · lint · tsc · build |

## 3. 직원 UAT 시트 (staff-facing · PHASE 10H 최종)

> **DO NOT DISTRIBUTE YET — P09D-C2 OPEN.** 비밀번호는 이 문서에 쓰지 않는다 (운영자가 배포 시 별도 전달).
> 기기: 데스크톱 · 태블릿 · 휴대폰 중 가능한 것으로 확인. 결과는 ☐ 에 표시하고 문제가 있으면 "메모" 칸에 화면 · 시각 · 증상을 적는다 (아동 실명 · 개인정보 쓰지 않음).

| 역할 | 로그인 주소 | 계정 (합성) |
|---|---|---|
| HQ Admin | https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/admin/login | `staging-hq-admin@example.test` |
| HQ Sales | https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/admin/login | `staging-hq-sales@example.test` |
| 원장 | https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/kindergarten | `staging-director@example.test` |
| 교사 | https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/kindergarten | `staging-teacher@example.test` |

### 시험 범위

**IN SCOPE**: HQ Admin 로그인 · 메뉴 이동 · HQ Sales 제한 화면 · 원장 기관 · 반 화면 · 교사 오늘의 수업 · 실제 STARTER W1 수업 · 8주 실제 커리큘럼 열람 · 수업 일정 · 현재 프로그램 동작 · 데스크톱 · 태블릿 · 휴대폰 화면.
**OUT OF SCOPE (실패로 보지 않음 · 시도하지 않음)**: 학부모 화면(Parent Portal · CO-12) · AI 기능(STARTER 제외 · AR-8) · Production · 실제 아동 · 학부모 정보 · 기능 출시(class_mode · weekly_report).

### 3-1. 교사 — https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/kindergarten

| # | 무엇을 누르나 | 보여야 하는 것 | 보이면 안 되는 것 | PASS | FAIL | 메모 |
|---|---|---|---|---|---|---|
| T1 | 로그인 | "오늘의 수업" 화면 | 오류 알림 | ☐ | ☐ | |
| T2 | (첫 화면) | 무지개반(가상) · **1주차 · 1차시 · SOYE KIDS 8주 프로그램 (STARTER 2026.1) · 「유치원 가는 날」 · 예정일 2026.10.01** | "색과 모양 놀이(가상)" 예전 합성 수업 | ☐ | ☐ | |
| T3 | W1 카드의 **수업 준비** | 「유치원 가는 날」 · "1주차는 아이가 새로운 공간에 빠르게 적응하도록 요구하는 시간이 아닙니다." · 수업 목표 "‘빨리 적응시키기’ X · … 첫 시작 O" | "(가상)" 차시 문구 · 빈 화면 | ☐ | ☐ | |
| T4 | 수업 준비 화면 내용 훑어보기 | 그림책 《유치원 가는 날》 · 교실/어린이집 탐험 · 이름표 만들기 등 원본 가이드 내용 | 엉뚱한 차시 · 깨진 문장 | ☐ | ☐ | |
| T5 | 메뉴 **수업 이력** | 지난 · 예정 수업 목록 (W2 10-05 … W8 11-16) | 다른 반 · 다른 기관 수업 | ☐ | ☐ | |
| T6 | (모든 교사 화면) | — | AI 정리 · AI 초안 버튼 | ☐ | ☐ | |
| T7 | (주의) | **수업 시작 · 출결 · 관찰 · Weekly 저장은 운영자가 지정한 경우에만** | — | ☐ | ☐ | |

### 3-2. 원장 — https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/kindergarten

| # | 무엇을 누르나 | 보여야 하는 것 | 보이면 안 되는 것 | PASS | FAIL | 메모 |
|---|---|---|---|---|---|---|
| D1 | 로그인 | **수업 운영** 화면 (STARTER = 홈 대시보드 없음) | 오류 알림 | ☐ | ☐ | |
| D2 | (첫 화면) | SOYE-STARTER-2026.1 · W1 「유치원 가는 날」 수업 | "색과 모양 놀이(가상)" 예전 합성 수업 | ☐ | ☐ | |
| D3 | 메뉴 전체 | 수업 운영 · 수업 이력 · 리포트 · 학부모 공유 | 홈 · 집계 · 누락 자동 탐지 · 일괄 인쇄 | ☐ | ☐ | |
| D4 | **수업 이력** · **리포트** | 화면이 열린다 (완료 리포트 0건일 수 있음) | 다른 기관 데이터 | ☐ | ☐ | |
| D5 | (주의) | — | 학부모 공유 링크 발급 (이번 UAT 제외 · CO-12) | ☐ | ☐ | |

### 3-3. HQ Admin — https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/admin/login

| # | 무엇을 누르나 | 보여야 하는 것 | 보이면 안 되는 것 | PASS | FAIL | 메모 |
|---|---|---|---|---|---|---|
| A1 | 로그인 | **기관 문의 관리** 화면 | 오류 알림 | ☐ | ☐ | |
| A2 | **기관 관리** → 기관 이름 | 기관 · 반(무지개반(가상)) · 현재 프로그램 SOYE KIDS 8주 프로그램 (STARTER 2026.1) | — | ☐ | ☐ | |
| A3 | **서비스 오픈 준비** | 계약 준비 항목 (기능 출시 안 됨 · CO-12 표시는 정상) | — | ☐ | ☐ | |
| A4 | **수업 프로그램** → SOYE-STARTER-2026.1 | W1~W8 게시 차시 · 각 차시 섹션 | "(가상)" 차시 | ☐ | ☐ | |
| A5 | **상품 · 기능** → 기능의 "출시" | **사유(필수)** 입력이 있는 확인 창 → **취소** | 사유 없이 바로 출시 | ☐ | ☐ | |
| A6 | (주의) | — | 기능 출시 제출 · 계약 정지/종료 | ☐ | ☐ | |

### 3-4. HQ Sales — https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app/admin/login

| # | 무엇을 누르나 | 보여야 하는 것 | 보이면 안 되는 것 | PASS | FAIL | 메모 |
|---|---|---|---|---|---|---|
| S1 | 로그인 | **문의 관리** 화면 | 오류 알림 | ☐ | ☐ | |
| S2 | **기관 영업 현황** | 기관 상업 요약 (원아 수 · 계약 상태) | **원아 이름 · 아동 기록** | ☐ | ☐ | |
| S3 | 주소창에 `/admin/organizations` | `/sales` 화면으로 이동 | HQ Admin 기관 상세 · 아동 정보 | ☐ | ☐ | |

### 3-5. 학부모 화면

**제외** — CO-12 (portal 만료 · 재발급 정책) OPEN · `parent_portal` 미출시. PASS 조건 아님.

## 4. 남은 범위 밖 항목 (UAT 에서 실패로 보지 않는다)

class_mode · weekly_report 미출시 (Readiness 표시는 "출시 안 됨") · G-1 · M5 · J/K/L 미적용 · 학부모 portal (CO-12) · AI (STARTER 제외) · 대시보드 (STARTER 제외).

## 5. 데이터 · 되돌리기

- 새 수업 8건은 합성 UAT 데이터다. 정리가 필요하면 수업 취소(사유) 흐름을 쓴다 — 삭제하지 않는다.
- 배정 전환 되돌리기 경로: [phase-10f §6](./phase-10f-starter-staging-content.md) (새 배정 completed + STAGING-P8 새 배정 · 삭제 없음 · 별도 승인).

## 6. 배포 전 필수 — 보안 회전 (운영자 작업 · 값은 어디에도 쓰지 않는다)

A = **CLOSED (2026-10-01)** · B = **OPEN**. 환경 변수 존재 · git secret scan 은 회전 증거가 아니다.

### A. TEACHER CREDENTIAL ROTATION — **CLOSED — 2026-10-01**

Evidence:
- Staging Supabase password reset confirmed by operator (`staging-teacher@example.test` · Staging `itcddooiuqsqingfhxkk`)
- manual new-password Preview login confirmed by operator
- automated new-credential Preview login **PASS** (단 1회 · 재시도 없음 · 이전 비밀번호 시험 없음 · Preview 번들 Supabase = Staging 만)
- real STARTER W1 screen **PASS** (교사 보드 W1 「유치원 가는 날」 카드 · 준비 화면 canonical 제목 · §1 · 수업 목표 · 읽기만 · 쓰기 없음)
- credential value never recorded (출력 · 로그 · 해시 · 파일 없음)

(아래는 수행한 절차 — 기록용)
1. Supabase Dashboard → **Staging 프로젝트 `itcddooiuqsqingfhxkk`** (Production 아님 확인) → Authentication → Users → `staging-teacher@example.test` → 새 비밀번호로 재설정 (이전 노출 값과 다른 값).
2. 운영자 PC 의 User 환경 변수 `SOYE_STAGING_TEACHER_PASSWORD` 를 새 값으로 갱신 (PowerShell `Read-Host -AsSecureString` 스크립트 · 채팅 · 파일에 쓰지 않음).
3. 교사 로그인 1회 확인 → 이 문서 · `phase-10d` 에 "회전 완료 · 날짜 · 확인자" 기록.

### B. P09D-C2 — 노출된 Staging secret key 회전
1. Supabase Dashboard → **Staging 프로젝트** → Project Settings → API Keys → 사용 중인 secret key 종류 확인 (`sb_secret_…` 새 형식 또는 legacy `service_role`).
2. 새 secret key 생성 (새 형식이면 키 추가 · legacy 면 JWT secret 회전 영향 범위를 먼저 확인 — 모든 legacy 키가 바뀐다).
3. Vercel → teachable-art-play3 → Settings → Environment Variables → `SUPABASE_SECRET_KEY` 의 **Preview (saas-v2)** 값을 새 키로 교체 (Production 값은 건드리지 않음 · Production 이 Staging 키를 쓰지 않는지 함께 확인).
4. saas-v2 Preview 재배포 (Preview 만) → HQ Admin 서버 기능(기관 구성원 초대 화면 열기 등 · 실제 초대 발송 없이) 동작 확인.
5. 이전 secret key 폐기(revoke) → 이 문서 · `release-blocker-matrix.md` P09D-C2 에 "회전 완료 · 날짜 · 확인자" 기록.

A 는 닫혔다. **B (P09D-C2) 가 닫히면** 분류를 **FINAL EMPLOYEE UAT READY — SAFE TO DISTRIBUTE** 로 바꿀 수 있다 (그 전에는 직원 배포 금지).
