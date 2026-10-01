# PHASE 10H — 직원 UAT 인계 (Operator handoff)

> ## DO NOT DISTRIBUTE YET — P09D-C2 OPEN
> Preview 는 기술적으로 준비됐다. **Staging secret/API key 회전(P09D-C2)은 운영자 결정으로 미뤘다** ("새키는 나중에 하고 나머지 진행" · 2026-10-01).
> P09D-C2 가 닫히기 전에는 직원에게 URL · 계정을 보내지 않는다. 비밀번호 · 키 값은 이 문서와 저장소 어디에도 쓰지 않는다.

| | |
|---|---|
| 상태 | **TECHNICALLY READY — NOT SAFE TO DISTRIBUTE (P09D-C2 OPEN)** |
| 코드 | `phase-10c-release-controls` = `saas-v2` (이 문서 커밋 직전 `6b21937`) · `main` = `faa8f9a` (변경 없음) |
| 직원 UAT Preview | `https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app` |
| 배포 | Vercel `dpl_3vxC8Acd3KRSBgZLsmcL9WqhVAfS` · Preview · Ready · branch saas-v2 · commit `6b21937` (이 문서 커밋 뒤 saas-v2 fast-forward 로 문서만 바뀐 새 Preview 가 생긴다 · 앱 코드 동일) |
| DB | Staging Supabase **`itcddooiuqsqingfhxkk`** — 앱 번들 ref 확인 (정적 자산 13/13) · Production ref 없음 |
| Production | Supabase `vpppxuhodwauaclhybtg` 접근 0 · Vercel Production 최신 배포 22일 전 그대로 (변경 0) |

## 1. 운영자 인계 (배포할 때 쓸 내용)

**Employee UAT Preview URL:** https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app

| 역할 | 로그인 경로 | 계정 (승인된 합성 계정 · 비밀번호 별도 전달) |
|---|---|---|
| HQ Admin | `/admin/login` | `staging-hq-admin@example.test` |
| HQ Sales | `/admin/login` | `staging-hq-sales@example.test` |
| 원장 | `/kindergarten` (유치원 전용 로그인 · `/login` 과 같은 화면) | `staging-director@example.test` |
| 교사 | `/kindergarten` | `staging-teacher@example.test` |

직원 시험지: [phase-10g-final-employee-uat.md §3](./phase-10g-final-employee-uat.md) (역할별 누를 것 · 보여야 할 것 · 보이면 안 되는 것 · PASS/FAIL · 메모).

## 2. 시험 범위

| IN SCOPE | OUT OF SCOPE |
|---|---|
| HQ Admin 로그인 · 메뉴 이동 · 기관 · 반 · 프로그램 · 출시 확인 창(취소) | 학부모 화면 Parent Portal (CO-12) |
| HQ Sales 제한 화면 (아동 정보 없음) | AI 기능 (STARTER 제외 · AR-8) |
| 원장 기관 · 반 · 수업 운영 화면 | Production |
| 교사 오늘의 수업 보드 · 실제 STARTER W1 수업 | 실제 아동 · 학부모 정보 |
| 8주 실제 커리큘럼 열람 · 수업 일정 · 현재 프로그램 동작 | 기능 출시 (class_mode · weekly_report) · Production 기능 출시 |
| 데스크톱 · 태블릿 · 휴대폰 | 계약 정지 · 종료 (재개 불가 — CO-12) |

## 3. 최종 확인 (2026-10-01 · 읽기 전용)

### 3-1. 4개 역할 smoke (`e2e_roles.mjs --target staging` · 쓰기 flag · 수업 id 없음 · 20:44 KST)

**PASS 30 · SKIP 5 · FAIL 0** (SKIP = 쓰기 · 실패 로그인 단계)

| 역할 | 확인 |
|---|---|
| 교사 | 로그인 · 오늘의 수업 · AI UI 없음 · 종료된 STAGING-P8 수업 없음 · **W1 「유치원 가는 날」 카드 · 수업 준비 화면 canonical 제목 · §1 · 수업 목표** · console/요청 오류 0 |
| 원장 | 로그인 · **SOYE-STARTER-2026.1 · W1 「유치원 가는 날」 · 예전 합성 수업 없음** · 홈 · 집계 · 누락 탐지 · 일괄 인쇄 없음 · 수업 이력 · 완료 리포트 · 학부모 공유 화면 열람 · 오류 0 |
| HQ Admin | 로그인 · 기관 목록 · 서비스 오픈 준비 · 상품 · 기능 · **출시 확인 창에 사유(필수) 입력 (제출 안 함)** · **기관 상세에 반 · 현재 프로그램** · 오류 0 |
| HQ Sales | 로그인 · 기관 영업 현황 (원아 이름 열 없음) · `/admin/organizations` → `/sales` 이동 (G-2) |
| 다른 기관 노출 | Staging 기관 1 · 교차 기관 차단은 RLS pgTAP 로 확인 (hardening 116 · phase08 86 · 10D 22) |

### 3-2. UAT 데이터 (`sql/p10f_staging_content_state.sql` · 수업 생성 직후와 비교)

| 항목 | 값 |
|---|---|
| 계약 | `9b9eef88…` **ACTIVE** · active 1 · suspended 0 · ended 0 |
| 사용자 | 4 · 합성 아닌 사용자 **0** |
| 현재 프로그램 | **SOYE-STARTER-2026.1** (배정 `794fbfb1…` active) |
| W1~W8 | published · 136/136 section = canonical (md5 1:1) · W4 성장키워드 ‘시작’ |
| 현재 반 수업 | STARTER 8건 — W1 10-01 · W2 10-05 · W3 10-12 · W4 10-19 · W5 10-26 · W6 11-02 · W7 11-09 · W8 11-16 (모두 예정) |
| 예전 STAGING-P8 | 프로그램 보존 · 배정 **completed** · 수업 4건 (W1~W4 예정) 그대로 — 보드에 안 나오고 시작 불가 · 이력은 남음 |
| 출결 · 관찰 · 리포트 | 0 · 0 · 0 |
| 업무 데이터 지문 | 수업 생성 직후와 **동일** (예기치 않은 변경 없음) |
| Readiness | content ok · missing_weeks [] · program_assignment ok |

### 3-3. 기능 · cutover (변경하지 않음)

| 항목 | 상태 |
|---|---|
| class_mode | 미출시 |
| weekly_report | 미출시 |
| parent_portal | 미출시 · blocked by **CO-12** |
| ai_assist | 미출시 · blocked by **AR-8** |
| branding | 미출시 · blocked by **CO-8** |
| 10C | ACTIVE — VERIFIED |
| G-2 | ACTIVE — VERIFIED |
| G-1 | NOT APPLIED |
| M5 | NOT APPLIED |

### 3-4. 회귀 (local)

pgTAP 8 files **368/368** · cutover G1 24 · G2 67 · M3 70 · M5 46 · 앱 테스트 96 (10G 4 · 10F 4 · 10E 9 · 10D 6 · 10C 6 · harness 49 · 08 13 · 09C 5) · `build-sql --check` · `M5_app_preflight` 7/7 · `JKL_start_gate` READY · `G2_app_preflight` 17/18 (기대한 lifecycle FAIL 만) · lint · tsc · build 통과.

## 4. UI 메모 (비차단 · 코드 변경 없음)

| 항목 | 판단 |
|---|---|
| HQ 기관 목록 링크 196×16 | **오탐** — 데스크톱 표는 stretched-link(`after:absolute after:inset-0`)라 실제 누르는 영역 = 표 한 줄 전체 · 모바일은 카드 전체가 링크 |
| 교사 W1 준비 체크박스 24×24 | WCAG 2.2 AA 최소(24×24) 충족 — 변경 없음 |
| HQ Sales 표 (태블릿 · 휴대폰) | 표 영역 안 가로 스크롤 · 페이지 가로 넘침 0 — 변경 없음 |
| 1×1 링크 | 화면에 보이지 않는 이동 링크로 보임 — 변경 없음 |

범위를 넓히지 않았다 (PHASE 10H 앱 코드 변경 0 · harness 읽기 전용 확인 2개만 추가: 원장 실제 프로그램 · HQ 기관 상세 프로그램).

## 5. 보안

| 항목 | 상태 |
|---|---|
| TEACHER CREDENTIAL ROTATION | **CLOSED — 2026-10-01** (운영자 재설정 · 수동 로그인 확인 · 자동 로그인 1회 PASS · 값 기록 없음) |
| **P09D-C2** Staging secret/API key rotation | **OPEN — OPERATOR DEFERRED** (새 키 생성 · 이전 키 폐기 · Vercel `SUPABASE_SECRET_KEY` 변경 모두 하지 않음) |

환경 변수 존재 · git secret scan 은 회전 증거가 아니다. 키 값은 기록하지 않는다.

## 6. P09D-C2 다음 단계 (닫을 때 정확한 순서)

1. Supabase Dashboard → **Staging `itcddooiuqsqingfhxkk`** (Production 아님 확인) → Project Settings → API Keys → 사용 중인 secret key 종류 확인 (`sb_secret_…` / legacy `service_role`).
2. 새 secret key 생성 (legacy 면 JWT secret 회전이 모든 legacy 키에 미치는 영향을 먼저 확인).
3. Vercel → teachable-art-play3 → Environment Variables → `SUPABASE_SECRET_KEY` 의 **Preview (saas-v2)** 값만 새 키로 교체 (Production 값 변경 금지 · Production 이 Staging 키를 쓰지 않는지 함께 확인).
4. saas-v2 Preview 재배포 (Preview 만 · `vercel --prod` 금지) → `preview_probe` (Staging ref) · 4개 역할 읽기 전용 smoke · HQ Admin 서버 기능 화면 열기 (초대 발송 없이) 확인.
5. 이전 secret key 폐기 → `release-blocker-matrix.md` · `phase-10g-final-employee-uat.md §6` · 이 문서에 "P09D-C2 CLOSED · 날짜 · 확인 결과" 기록 (값 없이).
6. 그 뒤 분류를 **FINAL EMPLOYEE UAT READY — SAFE TO DISTRIBUTE** 로 바꾸고 §1 을 직원에게 전달.

## 7. 하지 않은 것

새 secret key 생성 · 이전 키 폐기 · Vercel env 변경 · Production 접근 · Vercel Production 배포 · main 병합 · 기능 출시 · CO-12 해제 · G-1 · M5 · J/K/L · 계약 정지/종료 · Staging 쓰기 (PHASE 10H 는 읽기 전용 확인만).
