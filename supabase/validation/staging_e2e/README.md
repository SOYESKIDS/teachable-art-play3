# Staging E2E harness (PHASE 09A)

Remote Staging(`itcddooiuqsqingfhxkk`) · saas-v2 Preview 검증 도구. **새 npm 의존성 없음** (node 내장 + `browser_smoke/cdp.mjs` 의 Page).
결과 · 기대값: [../../../docs/09-staging-validation/](../../../docs/09-staging-validation/phase-09-plan.md) · 안전 검토: [harness-safety-review.md](../../../docs/09-staging-validation/harness-safety-review.md)

## 1. 안전장치 — 하나라도 어긋나면 `REFUSE TO RUN` (exit 3 · fail closed)

| guard | 동작 (`guards.mjs` · `sql_guard.mjs`) |
|---|---|
| Supabase project ref | `supabase/.temp/project-ref` 가 정확히 `itcddooiuqsqingfhxkk` · 비었거나 없거나 다르면 거부 · Production(`vpppxuhodwauaclhybtg`) · 다른 프로젝트 명시 거부 · CLI 대상을 바꾸는 env(`SUPABASE_DB_URL` · `SUPABASE_PROJECT_ID` · `SUPABASE_PROJECT_REF` · `DATABASE_URL`)가 있으면 거부 |
| App base URL | saas-v2 Preview alias **정확히 하나**만 (https · 기본 포트 · userinfo 없음). deployment 고유 URL(`…-<hash>-soyeskids-projects.vercel.app`)은 **받지 않는다** — Production deployment 도 같은 형식이기 때문. 알려진 Production host 명시 거부 |
| redirect | 이동할 때마다 현재 origin 을 다시 확인 — SSO(vercel.com) · Production · 모르는 host 로 가면 거부 (인증 E2E 중단) |
| 앱 번들 Supabase ref | 로그인 화면 HTML · 같은 origin JS chunk 의 `*.supabase.co` 가 Staging 이 아니면 거부 (local-rehearsal 은 remote ref 가 있으면 거부) |
| remote SQL | 허용 파일만 (`sql/*.sql` · 읽기 전용 preflight 4개 · cutover 적용 · rollback 파일 불가) → 문장 분리(문자열 · 주석 · dollar-quote 처리) → **모든 문장 사전 검증** (SELECT/WITH · 쓰기 · 세션 변경 키워드 · dollar-quote 거부 · 하나라도 거부면 아무것도 실행 안 함) → DB 지문(비합성 사용자 0) → 문장마다 `begin transaction read only; … rollback;` (키워드 검사를 지나친 쓰기 함수 호출도 25006 으로 실패 · local 검증) · 오류 · 해석 불가 · rows 없음 = 실패 |
| remote 쓰기 | 기본 = 읽기 전용. 쓰기는 **모두** 필요: `--allow-staging-writes` · 위 ref · alias · `SOYE_STAGING_E2E_SESSION_ID`(UUID · 사람이 지정 · 자동 선택 없음) · 대상 범위 합성 확인(`sql/e2e_target_scope.sql` · 수업 scheduled · 기관 · 반 · 반의 모든 원아 이름 합성 표시 · 구성원 전원 `@example.test` · DB 비합성 사용자 0 · 반 쓰기 가능) · 교사 · 원장 비밀번호 · bypass. 전부 브라우저를 띄우기 전에 판정 |
| 비밀 | env 로만 · 결과에는 `PRESENT / MISSING` 만 · fallback · 기본값 없음 · 비밀번호는 입력(Input.insertText)으로만 전달 · 최종 출력 `redact()` (비밀 값 · bypass query · portal token fragment 가림) |
| Vercel bypass | Preview alias 에만 (query 로 bypass cookie 설정 · URL 기록 안 함) · 브라우저 profile 은 매 실행 임시 생성 → 종료 시 삭제 (`browser.mjs`) |
| 초대 | 원장 · 교사 초대 화면을 열거나 제출하지 않는다 (service-role 초대 메일 발송 경로) — 정적 테스트로 확인 |
| artifact | screenshot 없음 · HTML dump 없음 · 결과는 route · status · 단계 · PASS/FAIL 중심 · portal token 은 메모리에만 |
| cutover | harness 는 G-2 · G-1 · M5 적용 · rollback 을 호출하지 않는다 (읽기 전용 preflight 만) — 정적 테스트로 확인 |

## 2. 비밀 · 지정 값 (env 이름만 · 값은 채팅 · 파일 · 로그에 남기지 않는다)

```
SOYE_STAGING_HQ_ADMIN_PASSWORD
SOYE_STAGING_HQ_SALES_PASSWORD
SOYE_STAGING_DIRECTOR_PASSWORD
SOYE_STAGING_TEACHER_PASSWORD
SOYE_STAGING_VERCEL_BYPASS        # Vercel "Protection Bypass for Automation" 값 (Preview 가 SSO 보호 중)
SOYE_STAGING_E2E_SESSION_ID       # 쓰기 E2E 가 소비할 합성 수업 1건 (사람이 승인 · 오늘 예정 · scheduled)
```

없으면 `BLOCKED_PENDING_LOCAL_SECRETS` 로 끝난다 (exit 0 · 아무것도 하지 않음).

## 3. 스크립트

| 스크립트 | 목적 | remote 쓰기 |
|---|---|---|
| `remote_readonly_query.mjs <file.sql> [--param session_id=<uuid>]` | Staging 읽기 전용 조회 | 없음 |
| `remote_readonly_query.mjs --validate-only <file.sql>` | 네트워크 없이 파일 검증만 | 없음 |
| `preview_probe.mjs` | Preview HTTP 상태 · redirect · 보안 header · 시간 · (bypass 시) 정적 자산 · 번들 Supabase ref | 없음 (GET · Preview origin 에만 bypass header) |
| `ui_audit.mjs --target staging\|local-rehearsal` | responsive · a11y · focus · console/네트워크 오류 · 로드 시간 | 없음 |
| `e2e_roles.mjs --target staging\|local-rehearsal` | Teacher · Director · Parent Portal · HQ Admin · HQ Sales(PRE-G2) | 쓰기 조건 전부일 때만 |
| `tests/harness_safety.test.mjs` | `node --test` — guard · SQL · 쓰기 gate · 합성 범위 · redaction · 정적 격리 (네트워크 없음) | 없음 |

## 4. Staging 쓰기 E2E — 데이터 · 정리 · 재실행

| 대상 | 생성 | 정리 |
|---|---|---|
| 지정 수업 1건 | BEFORE 확인 · 시작 · 마치기 · 출결 · 관찰 · Weekly 완료 | 되돌릴 수 없다 (완료 수업 · 출결 · 관찰 · 완료 revision 삭제 경로 없음) → `E2E_` 표시 합성 기록으로 남는다 |
| 빠른 메모 | `E2E_MEMO_*` | 같은 실행에서 비워 삭제 (값이 비었는지 확인) |
| 리포트 숨김 | 사유 `E2E_HIDE_*` | 같은 실행에서 다시 공개 (audit 는 append-only) |
| Child Portal 링크 | 발급 | 같은 실행에서 중지 (재실행하면 발급 · 중지가 다시 일어난다 · 되돌릴 수 있는 쓰기) |

- **재실행 · 부분 실패**: 지정 수업이 scheduled 가 아니면(이미 시작 · 완료) scope 확인에서 거부된다 → 같은 수업을 두 번 소비하지 않는다.
  중간 실패로 수업이 `in_progress` 로 남으면 자동 복구하지 않는다 — 원장 화면의 복구 처리(사유)로 사람이 정리한 뒤 새 합성 수업을 지정한다.
- 실행 전후 `remote_readonly_query.mjs sql/e2e_effects.sql` 로 비교한다.
- 자동 재시도 · 실패 시 자동 rollback / cutover 없음.

## 5. local-rehearsal (harness 자체 검증 · 로컬만)

```
npx supabase@2.113.0 db reset --local
node supabase/validation/browser_smoke/01_accounts.mjs
node supabase/cutover/tests/run-local.mjs supabase/validation/browser_smoke/02_seed.sql --raw
node supabase/validation/browser_smoke/03_media.mjs
node supabase/validation/browser_smoke/run-app.mjs build
node supabase/validation/browser_smoke/run-app.mjs start saas-v2      # 별도 터미널
node supabase/validation/staging_e2e/ui_audit.mjs --target local-rehearsal
node supabase/validation/staging_e2e/e2e_roles.mjs --target local-rehearsal --allow-writes --session <오늘 예정 수업 uuid>
node supabase/cutover/tests/run-local.mjs supabase/validation/staging_e2e/sql/e2e_effects.sql --raw   # 전후 비교
# 정리: 앱 중지 · npm run build · npx supabase@2.113.0 db reset --local
```
