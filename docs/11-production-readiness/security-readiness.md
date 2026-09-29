# Security Readiness (PHASE 10A · 읽기 전용 · 비밀 값 출력 없음)

## 확인됨 (코드 · migration 증거)

| 항목 | 결과 |
|---|---|
| Supabase 클라이언트 | `src/lib/supabase/env.ts` · `server.ts` · `client.ts` · `proxy.ts` = `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 만 · `public.ts` = 세션 없는 anon (share API 전용) |
| secret key | `SUPABASE_SECRET_KEY` 는 `src/lib/supabase/admin.ts` 한 곳 · `window` 가드 · import 는 `"use server"` 인 `admin/(dashboard)/organizations/actions.ts`(각 action `requireAdmin()` 선행)와 서버 전용 `lib/admin/director-invite.ts` 뿐 · client 컴포넌트 import 0 |
| env 이름 | 공개: `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` · `NEXT_PUBLIC_SITE_URL` / 서버: `SUPABASE_SECRET_KEY` · `OPENAI_*` · `SOYE_SAAS_V2_APP_CUTOVER` · `VERCEL_URL` · `VERCEL_PROJECT_PRODUCTION_URL` |
| 저장소 | 추적되는 env 파일 = `.env.example`(이름만) · `.gitignore` 가 `.env*` · `.vercel` · `supabase/.temp` 포함 |
| RLS | migration 이 만드는 **44 표 전부 RLS enable** · disable 없음 · anon 표 grant = 문의 폼 INSERT 만 (설계) · anon 함수 = `read_child_portal` · `read_shared_growth_report` · `local_today` |
| SECURITY DEFINER | migration 의 모든 `set search_path` 가 `= ''` (다른 값 0 · 168 곳) |
| 역할 | `requireAdmin` · `requireHqSales` · `requireHqStaff` · `requireDirector` · `requireTeacher` · proxy matcher `/admin` `/sales` `/director` `/teacher` · 모든 보호 page · server action 에 가드 · **가드 없는 보호 경로 없음** · `/kindergarten` 은 설계상 공개 로그인 |
| 학부모 경계 | `/share/*` 는 anon RPC 만 · service role 없음 |
| G-2 (Staging) | ACTIVE — VERIFIED (Sales 민감 표 · 구성원 쓰기 차단) · Production 은 PRE-G2 |
| 헤더 | nosniff · Referrer-Policy · Permissions-Policy · X-Frame-Options SAMEORIGIN · CSP 없음(H-1 · 기존 결정) |

## 결함 · 위험

| ID | 내용 | 조치 |
|---|---|---|
| P09D-C2 | 노출된 Staging `SUPABASE_SECRET_KEY` — **OPEN** | Production 활성화 전 회전 / 폐기 (사람) |
| SEC-NEW-1 | 출시 플래그를 사유 · 기록 없이 직접 UPDATE · `blocked_by` 는 앱에서만 확인 | audited release RPC (migration) |
| SEC-NEW-2 | `suspended → active` Readiness 재확인 없음 | trigger 보완 (migration) |
| SEC-NEW-3 | 새 portal 만료 없음 vs 공개 문구 30일 | CO-12 결정과 함께 |
| IB-5 | 공개 portal API rate limit 없음 | 학부모 공개 전 |
| SEC-NEW-4 | `server-only` 가드 없음 (위험 낮음) | `import "server-only"` — `lib/supabase/admin.ts` · `lib/ai/*` · `lib/admin/director-invite.ts` · `lib/rollout/*` |
| P09-D1 | PRE-G2 Production 에서 Sales 초대 시 초대 메일이 먼저 | Production G-2 · 또는 초대 전 `current_hq_role()='admin'` 확인 |

## HUMAN VERIFICATION REQUIRED (저장소로 증명 불가)

1. **Vercel Deployment Protection Exception** — 예외가 **saas-v2 Preview 도메인 하나에만** 걸려 있고 Production 보호 설정이 그대로인지: Vercel Dashboard → teachable-art-play3 → Settings → Deployment Protection. (문서: `docs/09-staging-validation/phase-09-plan.md` §1-1 은 계획 · `docs/10-employee-uat/README.md` 는 Shareable Link 방식 — 실제 설정 여부는 기록 없음)
2. **환경별 env 범위** — `SUPABASE_SECRET_KEY` · `NEXT_PUBLIC_SUPABASE_URL` 가 Production = Production 프로젝트, Preview(saas-v2) = Staging 으로 나뉘어 있는지 (09D 에서 소유자가 Preview URL = Staging 확인 · Production 쪽은 기록 없음)
3. P09D-C2 회전 완료 여부
