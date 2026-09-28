# PHASE 09A — Harness Safety Review (pre-commit · 2026-09-28)

대상: `supabase/validation/staging_e2e/**` · `docs/09-staging-validation/**` · 의존하는 읽기 전용 preflight 7개.
원칙: positive allow-list · 알려진 Production 명시 deny · 모든 판정은 네트워크 · 브라우저 전에 · 하나라도 어긋나면 REFUSE TO RUN.
remote 쓰기 · cutover · Production 접근 없이 local 로만 검증했다.

## 1. 발견 · 수정

| # | 검토 | 발견 (수정 전) | 수정 |
|---|---|---|---|
| 1 | Production hard fail | Preview deployment 고유 URL 형식(`teachable-art-play3-<hash>-soyeskids-projects.vercel.app`)을 허용 — Production deployment 도 같은 형식 | alias 정확히 하나만 허용 · deployment URL 거부 · 알려진 Production host 명시 deny · userinfo · 포트 · http 거부 · redirect 후 origin 재확인 · CLI 대상 env 거부 · DB 지문(비합성 사용자 0) |
| 2 | remote 쓰기 gate | `--allow-staging-writes` 하나로 쓰기 · project ref · 합성 범위 확인 없음 | 쓰기 = flag ∧ Staging ref ∧ alias ∧ 지정 수업 UUID ∧ 합성 범위 ∧ 교사 · 원장 비밀번호 ∧ bypass (브라우저 전에 판정) |
| 3 | 읽기 전용 SQL | 문장 검증이 실행 중에 이뤄져 앞 문장이 실행된 뒤 뒤 문장이 거부될 수 있었다 · block comment · dollar-quote 미처리 · 결과 rows 없음이 성공으로 판정될 수 있었다 | 전 문장 사전 검증 후 실행 · 주석 · 문자열 · dollar-quote 파서 · 세션 변경 키워드(`set` · `reset` · `execute` 등) 추가 · rows 없음 · CLI 실패 = 오류 · `--validate-only` · UUID 전용 파라미터 |
| 4 | 비밀 | 비밀번호를 page.eval 문자열 안에 넣어 입력 | Input.insertText(page.type)로만 입력 · 테스트 fixture 값은 `FAKE_TEST_ONLY_` |
| 5 | Vercel bypass | bypass URL · cookie 가 지워지지 않는 Chrome 임시 profile 에 남음 | `browser.mjs`: 매 실행 임시 profile · 종료 시 삭제 (검증: 남은 profile 0) · bypass 는 alias 에만 |
| 6 | 합성 데이터 경계 | 없음 | `e2e_target_scope.sql` + `assertSyntheticScope` (수업 · 기관 · 반 · 모든 원아 · 구성원 · DB 지문) · Staging 실측: 기관 1/1 · 반 1/1 · 원아 3/3 합성 표시 · 비합성 사용자 0 |
| 7 | 되돌릴 수 없는 효과 | "오늘의 수업" 첫 카드를 자동으로 열어 수업을 소비 | 지정 수업 카드만 연다 · 이미 소비된 수업은 scope 확인에서 거부 (local 재실행: 교사 쓰기 0 · exit 1) · 자동 재시도 · 자동 복구 없음 |
| 8 | 초대 | 자동 제출 코드 없음 (확인) | 정적 테스트로 고정 |
| 9 | portal token | 메모리에만 두지만 redact 대상이 아니었다 | `redact()` 가 URL fragment token · `"token"` JSON 을 가림 · 사용 후 메모리에서 지움 |
| 10 | screenshot · 로그 | screenshot · HTML dump 없음 (확인) · 결과 note 에 화면 alert 문구가 들어갈 수 있음 | 정적 테스트로 screenshot · HTML 파일 쓰기 금지 고정 · note 는 200자 · redact |
| 11 | cutover 격리 | 적용 · rollback 호출 없음 (확인) · SQL runner 허용 목록에 cutover 적용 파일 없음 | 정적 테스트 + 허용 목록 테스트로 고정 |
| 12 | local rehearsal 판정 | 일부 PASS 가 nav 문구 · 항상 있는 탭 문구 존재만 확인 (예: "지난 기록") · 일부 클릭 결과 미확인 | h1 · 섹션 문구 · 빈 상태 문구 · 클릭 성공 여부 확인 · 입력 필드 존재 확인 · DB 전후 비교 유지 |

## 2. 검증 (local · 네트워크 없는 테스트 + local rehearsal)

| 검증 | 결과 |
|---|---|
| `node --check` (새 .mjs 8개) | 8/8 |
| `node --test tests/harness_safety.test.mjs` | **30/30 PASS** (ref · URL · redirect · local · 번들 · SQL 허용 파일 · 쓰기 패턴 27종 · 다중 문장 · 문자열 안 키워드 · 정식 preflight 통과 · UUID 파라미터 · read-only 래핑 · CLI 거부 · 쓰기 gate 7종 · 비밀 없음 BLOCKED · 합성 범위 11종 · redaction · 초대 · cutover 격리 · artifact) |
| `--validate-only` 정식 preflight 4 + harness SQL 4 | 모두 valid (문장 수 5 · 13 · 8 · 4 · 1 · 1 · 1 · 1 — 기존 remote 실행과 같음) |
| 키워드 검사를 지나친 쓰기 함수의 read-only 실패 (local Postgres) | `select private.record_audit_event(...)` → "cannot execute INSERT in a read-only transaction" · 기록 0 |
| local rehearsal (지정 수업) | **40 PASS · 1 CUTOVER_PENDING · 0 FAIL** (teacher 13 · director 14 · parent 5 · hqAdmin 6 · hqSales 2 + 1) · DB 전후: 완료 +1 · 출결 +3 · E2E 관찰 1 · Growth5(창의적 시도 · 스스로) 1 · 메모 0 · Weekly 완료 1 · 숨김 0 · portal 중지 1 · audit +4 |
| 같은 수업 재실행 | 교사 카드 없음 FAIL · 교사 쓰기 0 (수업 · 출결 · 관찰 · Weekly 변화 없음) · exit 1 · 원장 portal 발급 → 중지만 반복 (되돌릴 수 있는 쓰기 · audit +2) |
| UI audit local | 12 화면 · 가로 넘침 0 · label 누락 0 · 콘솔/네트워크 오류 0 · HQ 44px 미만 13/6/4 (A11Y-2 그대로) · profile 삭제 |
| 임시 browser profile 잔존 | 0 |
| secret scan (untracked 20개 파일) | 실제 비밀 값 0 (fixture 는 `FAKE_TEST_ONLY_` 로만) |

## 3. Hotfix — remote read-only 실행기 CLI 출력 형식 (09c26f7 이후)

| | |
|---|---|
| 증상 | 사람 터미널에서 `remote_readonly_query.mjs sql/staging_inventory.sql` → `REFUSE TO RUN — DB 지문 확인 실패 (unparsed output)` (fail closed 로 멈춤 · 쓰기 없음) |
| 원인 | CLI 출력 형식을 명시하지 않았다. supabase 2.113.0 `db query` 는 `--agent auto`(기본)가 실행 환경을 감지해 agent 환경에서는 `{boundary, rows, warning}` JSON 을, 사람 터미널에서는 표(text)를 낸다 — 검토 때 실행은 agent 환경이라 JSON 이 나와 통과했다. local 재현: `--agent no` = 표 · `--agent yes` = JSON |
| CLI help 확인 | `--linked` · `--file` · 전역 `--output`(json 지원) · `--output-format`(text/json/stream-json) · `--agent`(auto/yes/no) |
| 수정 | 명령 = `npx supabase@2.113.0 db query --linked --output json --agent yes --file "<tmp>"` (`buildQueryCommand` · `--db-url` · `--local` · project ref 없음) · `parseCliResult`: exit 0 ∧ stderr 오류 줄 없음 ∧ stdout 이 하나의 JSON object ∧ `rows` array(행 = object) ∧ `error` 필드 없음일 때만 성공 · stdout 앞 안내 줄은 오류 패턴이 없고 JSON 이 줄 맨 앞에서 시작해 끝까지 온전할 때만 허용 · 나머지 전부 실패 · stderr 진행 메시지는 무시 · 오류 문구는 ANSI · DB URL · 비밀 제거 · 300자 |
| 테스트 | +9 (명령 구성 · 단일 spawn 경로 · A 표 출력 실패 · B JSON 성공 · C 앞 안내 줄 · D 빈 stdout · E exit ≠ 0 · F rows 없음 · G error 필드) → **39/39 PASS** |
| remote 재확인 (읽기 전용 1회) | linked ref `itcddooiuqsqingfhxkk` · DB 지문 통과 (비합성 사용자 0) · `staging_inventory.sql` 1 문장 → 1 행 · 39 열 · 오류 0 · exit 0 · 쓰기 0 · cutover 0 |

## 4. 남은 한계

- remote SQL 실행 경로(지문 확인 · `queryReadOnly`)는 hotfix 에서 `staging_inventory.sql` 로 remote 확인했다. `e2e_target_scope.sql`(쓰기 gate) 은 아직 remote 에서 실행하지 않았다.
- 빠른 메모 자동 저장은 화면 문구("저장됨")로만 확인하고 DB 는 "남은 E2E 메모 0" 만 본다 — 저장 자체의 DB 증거는 없다 (정리 후 0 이라서).
- 부재 확인(AI UI · 일괄 인쇄 · raw stage 코드)은 문구 기반이다.
- 원장 portal 발급 · 중지는 재실행 때마다 반복된다 (되돌릴 수 있는 쓰기 · audit 누적).
