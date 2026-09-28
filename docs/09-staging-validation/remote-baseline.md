# PHASE 09A — Remote Baseline (2026-09-28 · 읽기 전용)

## 1. Git · Supabase · Vercel

| 항목 | 값 |
|---|---|
| branch · HEAD · origin | `saas-v2` · `153a4138fdc1…` · 동일 · working tree clean (시작 시) |
| linked Supabase | `itcddooiuqsqingfhxkk` (teachable-art-play3-staging · ap-south-1 · ACTIVE_HEALTHY) |
| migration list | local 37 = remote 37 (… `20261002095000_p08_legacy_share_safety`) |
| Preview | alias → `teachable-art-play3-ekrf6e0u4-…` · target preview · READY · functions bom1 (Staging DB 와 같은 지역) |
| Production | 조회 · 변경하지 않음 (Production Supabase ref 는 harness 에서 명시 거부) |

## 2. Staging inventory (`sql/staging_inventory.sql` · 개수 · 상태만)

| 항목 | 값 | 항목 | 값 |
|---|---|---|---|
| auth users (synthetic `@example.test`) | 4 (4) · 비합성 0 | active HQ Admin · Sales | 1 · **1** |
| orgs · active members · classes | 1 · 2 · 1 | children (active) | 3 (3) |
| published lessons · sections | 8 · 88 | sessions (scheduled) | 4 (4) · 오늘 1 · 미래 3 · 1~4주 |
| active contract | 1 · STARTER (class_mode · parent_portal · weekly_report) | 기록 (출결 · 관찰 · 메모 · 리포트 · portal · 동의 · 사진 · audit) | 전부 0 |
| capability blockers | ai_assist:AR-8 · branding:CO-8 · parent_portal:CO-12 | legacy 리포트 | 0 |
| cutover 상태 | `is_soyes_admin` 에 sales 포함 (PRE-G2) · G-2 AI gate 0 · 구성원 직접 INSERT 열림 (PRE-G2) · G-1 gate 0 · session status UPDATE 열림 (PRE-M5) · PHASE 08 gate 있음 · cutover audit 0 | | |

활성 STARTER 계약은 Staging UI 용 합성 시뮬레이션이다. Readiness 는 `feature:class_mode` · `feature:weekly_report` (not_released) ·
`feature:parent_portal` (CO-12) 에서 미충족 — Production readiness 증거가 아니다.

## 3. Preview HTTP (`preview_probe.mjs` · GET)

| 경로 | 결과 |
|---|---|
| /login · /admin/login · /teacher · /director · /admin · /sales · /share/portal/<invalid> | 모두 **302 → vercel.com/sso-api** (Vercel Deployment Protection) · TTFB 9~107 ms |
| edge header | `Strict-Transport-Security` · `X-Frame-Options: DENY` · `X-Robots-Tag: noindex` present |
| 앱 header (SSO 뒤라 Preview 에서 미확인) | 같은 코드의 local build: `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy: geolocation=(), browsing-topics=()` · `X-Frame-Options: SAMEORIGIN` · CSP 없음 (next.config.ts 에 의도적 제외로 기록) |
| 앱 수준 (render · 초기 alert · 정적 자산 · 500 · hydration · 번들 Supabase ref) | **BLOCKED_PENDING_LOCAL_SECRETS** — 사용자가 수동 login smoke(강력 새로고침 · 초기 오류 없음) PASS 보고 |

## 4. Runtime logs (Vercel CLI `logs --json` · 읽기 · 본문 미기록)

| 범위 | 결과 |
|---|---|
| 현재 deployment 24h | 12건 · 전부 info · 200/204 (/login · /auth/forgot-password · /) |
| saas-v2 Preview 7일 (2 deployments) | 36건 · 5xx 0 · error 0 · fatal 0 · warning 0 |
| 해석 | 오류 없음. 다만 인증 후 화면 트래픽이 거의 없어 RPC 실패 · auth loop 여부는 E2E 실행 후 다시 본다 |
