# LOCAL BROWSER SMOKE KIT (PHASE 07 · local 전용)

가상 데이터로 앱을 local Supabase 에 붙여 브라우저에서 점검하는 도구다. **remote · 운영 값 사용 금지.**

## 1. 앱이 읽는 환경 변수

| 이름 | 필수 | 노출 | local 값 출처 (`npx supabase@2.113.0 status -o env`) |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | 공개 | `API_URL` (http://127.0.0.1:54321) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 필수 | 공개 | `PUBLISHABLE_KEY` |
| `SUPABASE_SECRET_KEY` | 원장 초대 · Auth 이메일 조회 등 서버 전용 기능에만 | **서버 전용** | `SECRET_KEY` |
| `SOYE_SAAS_V2_APP_CUTOVER` | 선택 (비우면 legacy 화면 계열) | 서버 전용 | — (`true` 일 때만 SaaS 2.0 화면) |
| `NEXT_PUBLIC_SITE_URL` | 선택 | 공개 | 예: `http://localhost:3000` |
| `OPENAI_API_KEY` · `OPENAI_OBSERVATION_MODEL` · `OPENAI_GROWTH_REPORT_MODEL` | 선택 (비우면 AI 비활성 · AR-8) | 서버 전용 | 비워 둔다 |

### 운영자가 `.env.local` 을 직접 만들 때 (local 값만)

1. `npx supabase@2.113.0 status -o env` 를 실행해 **local** 값인지 확인한다 (`API_URL` 이 127.0.0.1 · localhost).
2. 프로젝트 루트에 `.env.local` 을 만들고 위 표의 이름에 local 값을 넣는다. 운영 URL · 운영 key 를 넣지 않는다.
3. `.env.local` 은 git ignore 대상이다. 커밋 · 공유하지 않는다.

이 kit 의 `run-app.mjs` 는 `.env.local` 없이 local 값을 **프로세스 env 로만** 넘긴다 (파일 생성 · 값 출력 없음 · localhost 가 아니면 중단).

## 2. 순서

```
npx supabase@2.113.0 db reset                                             # 깨끗한 local DB
node supabase/validation/browser_smoke/01_accounts.mjs                     # 가상 계정 6 (example.test)
node supabase/cutover/tests/run-local.mjs supabase/validation/browser_smoke/02_seed.sql --raw
node supabase/validation/browser_smoke/03_media.mjs                        # 1×1 가상 사진 4장
node supabase/validation/browser_smoke/run-app.mjs build                  # local 값으로 build (.next)
node supabase/validation/browser_smoke/run-app.mjs start legacy           # http://127.0.0.1:3100 (legacy 기본)
node supabase/validation/browser_smoke/run-app.mjs start saas-v2          # SaaS 2.0 화면 계열
```

- 계정: `smoke-hq-admin` · `smoke-hq-sales` · `smoke-legacy-director` · `smoke-legacy-teacher` · `smoke-v2-director` · `smoke-v2-teacher` (`@example.test`) · 비밀번호는 `accounts.mjs` (local 전용)
- 교직원 로그인 `/login` · HQ 로그인 `/admin/login`
- Org L(legacy) = 계약 없음 (현재 Production 과 같은 상태)
- Org V(SaaS V2) = **[LOCAL SIMULATION]** STARTER 계약 active. 정책 blocker 해소 이후를 가정한 화면 점검용이며,
  실제 Readiness 는 여전히 활성화를 거부한다 (CT005). Production 계약이 활성화 가능하다는 뜻이 아니다.
- `cdp.mjs` · `session.mjs` : headless Chrome/Edge 를 DevTools Protocol 로 조작하는 최소 helper (node 내장만 · 새 의존성 없음)

## 3. G-2 local 점검 (선택)

```
node supabase/cutover/G2_app_preflight.mjs
# 한 transaction 으로 local 에만 적용: begin; \set g2_app_preflight passed; \ir supabase/cutover/M3_hq_role_split_sensitive_access.sql; commit;
```
G-1 · M5 는 적용하지 않는다.

## 4. 정리

```
npx supabase@2.113.0 db reset     # 가상 계정 · 데이터 · 사진 metadata · G-2 적용 상태 모두 제거
npm run build                     # local 값이 들어간 .next 산출물을 기본 build 로 되돌림
```
