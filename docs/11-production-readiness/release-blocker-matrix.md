# Release Blocker Matrix (PHASE 10A · 2026-09-29 · 읽기 전용)

표기: **PU** = Production RC(STARTER 활성화 후보) 차단 · **EU** = 직원 UAT 차단 · 분류 = app / DB / infra / content / security / policy / legal.
상태는 **가장 최근 문서** 기준으로 인용했고, 코드로 재확인한 것은 "(코드 확인)" 으로 표시했다. 추정은 JUDGEMENT.

## 1. Cutover

| ID | 제목 | 현재 상태 | 증거 | 역할 | 분류 | PU | EU | 의존 | 다음 조치 |
|---|---|---|---|---|---|---|---|---|---|
| G-2 | HQ Admin / Sales 분리 | Staging ACTIVE — VERIFIED · **Production PRE-G2** | `docs/09-staging-validation/phase-09d-g2-rehearsal-result.md` | HQ | security/DB | yes (Prod) | no | — | Production 은 runbook 순서대로 (승인 필요) |
| G-1 | 계약 기반 쓰기 gate | Staging NOT APPLIED (**P09F-AUTH-1**) · local 70/70 · 24/24 · preflight SAFE | `docs/09-staging-validation/open-items.md` · `g1-rehearsal-plan.md` | Teacher · Director | DB | yes (K) | no | P09F-AUTH-1 · P09E-O1 | pooler 연결 확인(읽기 전용) 후 별도 승인으로 재시도 |
| M5 | legacy 직접 쓰기 회수 | NOT APPLIED · **앱 preflight 2/7** (코드 확인) | `supabase/cutover/M5_app_preflight.mjs` 재실행 | Teacher · Director | app/DB | yes | no | G-1 · J | [m5-app-readiness.md](./m5-app-readiness.md) |
| J/K/L | controlled window | NOT STARTED · start gate DO NOT START J (코드 확인) | `supabase/cutover/JKL_start_gate.mjs` | all | infra/app | yes | no | M5 앱 7/7 · G-1 | M5 앱 준비 후 |
| P09F-AUTH-1 | Shared Pooler DB 인증 불안정 → G-1 SQL 실행 전 중단 | OPEN · 회전(P09F-C1) 후 pooler 재확인 **기록 없음** | `docs/09-staging-validation/open-items.md` | ops | infra | no (rehearsal 차단) | no | — | 읽기 전용 connectiontest 1회 기록 |
| P09E-O1 | G-1 단독 Staging 적용 후 full J/K/L 전 rollback 필요 | 결정 기록 | 같은 파일 | ops | policy | no | no | G-1 | 적용 시 유지 |
| P09E-O2 | G-1 후 M5 DB preflight SAFE 표시 함정 | 주의 | 같은 파일 | ops | infra | no | no | — | DB SAFE 만으로 M5 금지 |

## 2. 상품 · 출시 (DEC-063)

| ID | 제목 | 현재 상태 | 증거 | PU | EU | 다음 조치 |
|---|---|---|---|---|---|---|
| class_mode release | 출시 플래그 · 기준 | `is_released=false` · blocker 없음 · **PHASE 10D: 승인용 체크리스트 PASS 15 · HUMAN 5 · BLOCKED 4 (BC-3 · G-1 · M5 · P10C-PROD)** | `20261001100000_m2…:133` · readiness `20261001111000_m3…:173-192` | yes | no | [class-mode-readiness.md](./class-mode-readiness.md) |
| weekly_report release | 동일 | `is_released=false` · **PHASE 10D: 8주 모아보기 수락 PASS (pgTAP 22 · 앱 6)** · 체크리스트 PASS 18 · HUMAN 5 · BLOCKED 4 (CO-12 · G-1 · M5 · P10C-PROD) | m2 `:134` | yes | no | [weekly-report-readiness.md](./weekly-report-readiness.md) |
| CO-12 | Child Portal 만료 · 재발급 정책 | OPEN · Production Blocker YES · `parent_portal.blocked_by={CO-12}` · **모든 상품에 parent_portal 포함** | `docs/03-commerce/open-items.md:51` · m2 `:138,91,98,106,113` | **yes** | no | [parent-portal-co12.md](./parent-portal-co12.md) |
| AR-8 | AI 자유 텍스트 개인정보 최소화 | OPEN · 외부 AI 사용 blocker | `docs/04-ai-report/open-items.md:66,80` | no (STARTER) · yes (STANDARD · PREMIUM · PILOT 는 ai_assist 포함) | no | [ai-ar8.md](./ai-ar8.md) |
| CO-8 | 브랜딩 범위 | OPEN · `branding.blocked_by` | m2 seed | no (PREMIUM 만) | no | 사람 결정 |
| CO-2 | 데이터 보존 · 삭제 · 내보내기 | OPEN · **Production Blocker YES** | `docs/03-commerce/open-items.md:29,41` | **yes** | no | 법무 · 개인정보 결정 |
| CO-9 · CO-10 · DB-9 | 단체 사진 · 동의 법적 단위 · portal 사진 signer | OPEN · YES (사진 공개 전) | `docs/03-commerce/open-items.md:47-49` · `docs/05-data-security/open-items.md:35,95` | no (학부모 사진 비활성 유지 시) | no | 사진 공개 전 결정 |
| BP-14 | STANDARD/PREMIUM 판매 문구 | 부분 해결 (활성화 차단) · 판매 문구 사업 판단 | `docs/03-commerce/open-items.md:79` | no (STARTER) | no | 사업 판단 |
| BP-16 | AI 국외 이전 고지 | Pilot Go 조건 | `docs/03-commerce/open-items.md:81` | no (AI OFF) | no | AR-8 와 함께 |
| BC-3 | STARTER W1~W8 운영 콘텐츠 | **PHASE 10E: TECHNICALLY READY — HUMAN CONTENT APPROVAL REQUIRED** — SOURCE CONTENT: AVAILABLE (교사용 가이드 W1~W8 · SHA-256 기록) · CANONICAL REPOSITORY INGESTION: COMPLETE (`content/starter/2026.1` · local pgTAP 26/26) · STAGING REAL CONTENT: NOT YET APPLIED · HUMAN CONTENT APPROVAL: REQUIRED (W1 · W3~W6 원본 대조 포함 · W4 성장키워드 결정) | [phase-10e](./phase-10e-starter-content-approval.md) | **yes (승인 · 적재 전까지)** | no | W1~W8 승인 체크 → Staging 적재 · 배정 전환(별도 승인) |
| BC-1 · BC-2 | W9~16 · W17~24 콘텐츠 | SOURCE EXISTS MIXED · DRAFT/PROPOSAL | [content-readiness.md](./content-readiness.md) | no (STARTER) · yes (STANDARD · PREMIUM) | no | 콘텐츠 승인 · 적재 |

## 3. 보안 · 운영

| ID | 제목 | 현재 상태 | 증거 | PU | EU | 다음 조치 |
|---|---|---|---|---|---|---|
| P09D-C2 | 노출된 Staging `SUPABASE_SECRET_KEY` | **OPEN** | `docs/09-staging-validation/open-items.md:18` | yes | no | Production 활성화 전 회전/폐기 (사람) |
| SEC-NEW-1 | 출시 플래그 직접 UPDATE · 사유 · `updated_by` 없음 · `blocked_by` guard 는 앱에만 | 신규 (코드 확인) | `20261001091000_m1…:452` (column grant) · `src/app/admin/(dashboard)/products/actions.ts` | yes (JUDGEMENT: 활성화 판정 근거의 감사성) | no | audited release RPC ([class-mode-readiness.md](./class-mode-readiness.md)) |
| SEC-NEW-2 | `suspended → active` Readiness 재확인 없음 | 신규 (코드 확인) | `20261001111000_m3…:306,359-369` | JUDGEMENT: yes (재개 시 준비 미충족 계약 활성) | no | trigger 에 재확인 (migration · 승인) |
| SEC-NEW-3 | 새 Child Portal 만료 없음 vs 공개 법적 문구 "30일" | 신규 (코드 확인) — 현재 Production 의 legacy 공유 링크는 30일 만료가 **맞다** | `src/data/legal.ts:216,371,571` · `20260903090000…:189` · m4 `:1140` | yes (portal 출시 시) | no | CO-12 결정과 함께 문구 · 동작 일치 |
| IB-5 / AD-14 | 공개 portal resolve API rate limit 없음 | OPEN | `src/app/api/share/portal/resolve/route.ts:15` | yes (학부모 공개 전) | no | platform rate limit 설계 |
| SEC-NEW-4 | `server-only` 가드 미사용 | 신규 · 위험 낮음 | `grep server-only` = 0 · `src/lib/supabase/admin.ts:22-24` window guard | no | no | `import "server-only"` 추가 (앱 · 지금 가능) |
| P09-D1 | PRE-G2 Sales 초대 시 service-role 초대 메일이 RPC 거부보다 먼저 | CUTOVER PENDING (Prod) | `docs/09-staging-validation/open-items.md:9` · `src/app/admin/(dashboard)/organizations/actions.ts` | yes (Prod PRE-G2) | no | G-2 · 또는 초대 전 `current_hq_role()='admin'` 확인 (앱) |
| H-1 | CSP 없음 | 기존 결정 유지 | `next.config.ts` · `docs/09-staging-validation/open-items.md:24` | no (문서 결정) | no | 재검토는 선택 |
| Protection Exception | saas-v2 Preview 예외 범위 | **HUMAN VERIFICATION REQUIRED** (저장소로 증명 불가) | [security-readiness.md](./security-readiness.md) | no | no | Vercel Dashboard 확인 |

## 4. PHASE 08 open items

| ID | 제목 | 현재 상태 | PU | 비고 |
|---|---|---|---|---|
| P08-OPEN-1 | J~L 사이 legacy 직접 status UPDATE | OPEN | yes | M5 가 닫음 |
| P08-OPEN-2 | G-2 전 구성원 직접 DML | OPEN (Prod) · Staging 닫힘 | yes | G-2 |
| P08-OPEN-3 | 예정일 전후 수업 시작 정책 | OPEN | unknown | 정책 결정 |
| P08-OPEN-4 | 동의 상태별 사진 처리 | OPEN (사람 확인) | CO-9/10 연동 | — |
| P08-OPEN-5 | G-1 적용 창 (G1001) | OPEN | yes (K) | — |
| P08-OPEN-6 | 졸업 · 퇴소 아동 legacy 공유 | OPEN | unknown | 정책 |
| P08-OPEN-7 | 구성원 등록 사유 입력 | OPEN | no | — |
| **P08-OPEN-8** | G-1 후 before_start 일정 | OPEN (08) · **PHASE 09 목록에서 빠짐 · 해결 기록 없음** | unknown | 목록 정정 필요 |
| P08-OPEN-9 | AI 식별자 검사 한계 | OPEN | AI 사용 시 | AR-8 |
| P08-OPEN-10 | 배포 후 legacy AI 실제 꺼짐 | OPEN | unknown | M5 앱 준비와 함께 |
| P08-OPEN-11 · 12 | 계정 삭제 · audit 공백 | OPEN (이월) | unknown | — |
| **P08-OPEN-13** | 앱 모드 거부 정적 확인만 | OPEN (08) · **PHASE 09 목록에서 빠짐** | unknown | 목록 정정 필요 |

## 5. 기타 OPEN (Production RC 비차단 · 기록 유지)

CO-1 · CO-3 · CO-6 · CO-7 · CO-11 · AR-1 · AR-2 · AR-5 · AR-10 · DB-1 · DB-5 · DB-6 · DB-8 · IB-1 · IB-2 · IB-3 · IB-6 · IB-7 · BC-4~17 · BP-1~7 · BP-10 · BP-15 · PH3-2 · PH3-6~10 · A11Y-2(DirectorDashboard DEFERRED) · PERF-1(부분).
해결됨(문서 기준): CO-4 · CO-5 · CO-13 · AR-3 · AR-4 · AR-9 · DB-2 · DB-3 · DB-4 · DB-7 · BP-9 · BP-13 · PH3-1 · PH3-3 · PH3-5 · P09D-C1 · P09F-C1 · A11Y-1 · P09C-A1.

## 6. 문서 정합성 (정정 필요 · 이번 phase 에서 고치지 않음)

- A11Y-1 · A11Y-2 · P09C-A1 · `docs/09-staging-validation/qa-fixes.md` 의 "미커밋" 표기 → 실제로는 `c358310` 에 커밋됨
- `phase-09d-g2-rehearsal-result.md` §6 "G-1 rehearsal 전 회전 필수" → P09D-C1 · P09F-C1 RESOLVED 로 대체됨
- P08-OPEN-8 · 13 이 PHASE 09 OPEN 목록에서 빠짐 (해결 기록 없음)
- "G-n" 이 cutover(G-1 · G-2) · 구현 메모(G-3 · G-4) · Pilot Go 조건(G-9 · G-12) 세 뜻으로 쓰임
