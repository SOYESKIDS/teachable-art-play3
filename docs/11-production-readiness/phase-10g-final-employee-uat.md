# PHASE 10G — 최종 직원 UAT (Staging Preview)

> **배포 상태: PREVIEW TECHNICALLY READY — SECURITY ROTATION REQUIRED BEFORE STAFF DISTRIBUTION**
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

## 3. 직원 UAT 시트

로그인 경로: 교사 · 원장 = `/login` · HQ Admin · HQ Sales = `/admin/login`. 계정은 합성 `@example.test` (비밀번호는 이 문서에 쓰지 않는다 · 운영자가 별도 전달 — §6 이후).
**쓰기 시험 범위**: 이번 UAT 는 화면 · 흐름 확인 중심이다. 수업 시작 · 출결 · 관찰 · Weekly 작성 등 쓰기는 운영자가 정한 합성 수업 1건에서만 한다 (실제 아동 정보 입력 금지).

### 3-1. 교사 (`staging-teacher@example.test` · `/login`)

| # | 확인 | 기대 결과 | PASS | FAIL |
|---|---|---|---|---|
| T1 | 로그인 | `/teacher` · "오늘의 수업" | ☐ | ☐ |
| T2 | 오늘의 수업 보드 | 무지개반(가상) · **1주차 · 1차시 · SOYE KIDS 8주 프로그램 (STARTER 2026.1) · 「유치원 가는 날」 · 예정일 2026.10.01** 카드 1건 | ☐ | ☐ |
| T3 | 예전 합성 수업 | "색과 모양 놀이(가상)" 예정 수업이 보드에 **없다** | ☐ | ☐ |
| T4 | W1 수업 준비 열기 | 「유치원 가는 날」 · "1주차는 아이가 새로운 공간에 빠르게 적응하도록 요구하는 시간이 아닙니다." · 수업 목표 "‘빨리 적응시키기’ X · 새로운 공간을 자기 속도로 알아가며 안전감과 소속감을 만드는 첫 시작 O" | ☐ | ☐ |
| T5 | W1 실제 콘텐츠 | 수업 준비 · 진행 화면의 차시 내용이 원본 가이드와 같다 (그림책 《유치원 가는 날》 · 교실/어린이집 탐험 · 이름표 만들기) · "(가상)" 차시 문구 없음 | ☐ | ☐ |
| T6 | AI | 교사 화면에 AI 정리 · AI 초안 버튼 없음 | ☐ | ☐ |
| T7 | 수업 이력 | 이력 화면에서 지난 · 예정 수업 확인 가능 | ☐ | ☐ |
| T8 | (음성) 다른 반 | 담당하지 않은 반 · 다른 기관 수업이 보이지 않는다 | ☐ | ☐ |

### 3-2. 원장 (`staging-director@example.test` · `/login`)

| # | 확인 | 기대 결과 | PASS | FAIL |
|---|---|---|---|---|
| D1 | 로그인 | `/director/sessions` (STARTER = 홈 대시보드 없음) | ☐ | ☐ |
| D2 | 수업 현황 | 무지개반(가상) · SOYE-STARTER-2026.1 W1 수업 | ☐ | ☐ |
| D3 | STARTER 범위 | 홈 메뉴 없음 · 집계 없음 · 누락 자동 탐지 없음 · 일괄 인쇄 없음 | ☐ | ☐ |
| D4 | 수업 이력 · 완료 Weekly 목록 | 화면 열림 (현재 완료 Weekly 0 일 수 있음) | ☐ | ☐ |
| D5 | (음성) 다른 기관 | 다른 기관 · 반 데이터가 보이지 않는다 | ☐ | ☐ |
| D6 | (음성) 학부모 링크 | 학부모 공유 링크 발급은 이번 UAT 에서 하지 않는다 (CO-12) | ☐ | ☐ |

### 3-3. HQ Admin (`staging-hq-admin@example.test` · `/admin/login`)

| # | 확인 | 기대 결과 | PASS | FAIL |
|---|---|---|---|---|
| A1 | 로그인 | `/admin/leads` | ☐ | ☐ |
| A2 | 기관 · 준비 상태 | 기관 목록 · 기관 상세 · readiness 화면 열림 | ☐ | ☐ |
| A3 | 상품 · 기능 | 기능 출시 화면 — "출시" 를 누르면 **사유(필수)** 입력이 있는 확인 창 | ☐ | ☐ |
| A4 | (음성) 출시 금지 | 확인 창은 **취소**한다 — class_mode · weekly_report 를 출시하지 않는다 | ☐ | ☐ |
| A5 | 커리큘럼 | SOYE-STARTER-2026.1 · W1~W8 게시 차시 · 섹션 열람 | ☐ | ☐ |
| A6 | (음성) 계약 상태 | UAT 계약을 정지 · 종료하지 않는다 (정지하면 CO-12 해결 전 재개 불가) | ☐ | ☐ |

### 3-4. HQ Sales (`staging-hq-sales@example.test` · `/admin/login`)

| # | 확인 | 기대 결과 | PASS | FAIL |
|---|---|---|---|---|
| S1 | 로그인 | `/sales/leads` | ☐ | ☐ |
| S2 | 기관 요약 | `/sales/organizations` · 상업 요약 (원아 수 · 계약 상태) | ☐ | ☐ |
| S3 | (음성) 원아 정보 | 원아 이름 열 · 아동 기록이 보이지 않는다 | ☐ | ☐ |
| S4 | (음성) 관리자 화면 | `/admin/organizations` 접근 시 `/sales` 로 이동 (G-2) | ☐ | ☐ |

### 3-5. 학부모 화면

**이번 UAT 의 PASS 조건이 아니다** — CO-12 (portal 만료 · 재발급 정책) OPEN · `parent_portal` 미출시.

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
