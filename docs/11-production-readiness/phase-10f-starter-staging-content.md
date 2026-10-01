# PHASE 10F — STARTER W1~W8 실제 콘텐츠 Staging 활성화

| | |
|---|---|
| 범위 | **Staging 만** (`itcddooiuqsqingfhxkk`) · Production 접근 0 |
| 브랜치 | `phase-10c-release-controls` (시작 HEAD = origin = `efa5510`) · 병합하지 않음 |
| 사람 승인 | **2026-10-01** — 공식 원본 = 2026-09-11 "교사용 수업 가이드" **Version A** · W1~W8 Staging 사용 승인 · **W4 성장키워드 = ‘시작’** · Staging load · publish 승인 · 합성 UAT 반 STAGING-P8 → SOYE-STARTER-2026.1 전환 승인 · UAT 계약 ACTIVE 유지 · **Production 미승인** ([phase-10e §9](./phase-10e-starter-content-approval.md)) |
| 결과 | 실제 W1~W8 콘텐츠 Staging **published** · 합성 UAT 반의 현재 프로그램 = **SOYE-STARTER-2026.1** · 계약 ACTIVE · 업무 데이터 변경 0 |

## 1. 대상 확인 (쓰기 전 매번)

| 신호 | 값 |
|---|---|
| `supabase/.temp/project-ref` | `itcddooiuqsqingfhxkk` |
| `supabase/.temp/linked-project.json` | ref `itcddooiuqsqingfhxkk` · name `teachable-art-play3-staging` |
| runner 출력 | `# target: Supabase Staging itcddooiuqsqingfhxkk` (읽기 · 쓰기 모두) |
| 대상 변경 env | `SUPABASE_DB_URL` · `SUPABASE_PROJECT_ID` · `SUPABASE_PROJECT_REF` · `DATABASE_URL` · `SUPABASE_ACCESS_TOKEN` — Process · User · Machine 모두 없음 |
| Production ref | `vpppxuhodwauaclhybtg` 명시 거부 (guards.mjs · 적용기 `--confirm-staging`) |

## 2. 쓰기 경로 — `supabase/content/apply_staging_content.mjs` (신규 · 좁은 용도)

- 단계 allow-list `load | publish | uat-switch` → 고정 파일 3개 · 임의 SQL · 파일 인자 없음
- `load` · `publish` = `build-sql.mjs` 생성 결과와 같아야 실행 · `uat-switch` = SHA-256 고정 (`d5536b41…a6e27b8`)
- 대상: guards.mjs (project-ref · 거부 ref · 대상 env) + `linked-project.json` + 명령줄 `--confirm-staging itcddooiuqsqingfhxkk`
- 쓰기 전 읽기 전용 gate (읽기 전용 runner 경로 그대로): 합성 아닌 사용자 0 · active 계약 1 · suspended 0
- 파일 전체를 `begin; … commit;` 하나로 · `db query --linked --output json --agent yes` 만 (db push · migration · db-url 없음) · 재시도 없음 · 출력 정리
- 읽기 전용 runner(`remote_readonly_query.mjs` · `sql_guard.mjs`) 규칙은 **바꾸지 않았다**
- 검사: `supabase/validation/phase10f/content_runner.test.mjs` 4/4

## 3. 쓰기 전 상태 (2026-10-01 · 읽기 전용 · `sql/p10f_staging_content_state.sql`)

| 항목 | 값 |
|---|---|
| 사용자 | 4 · **합성 아닌 사용자 0** |
| 계약 | `9b9eef88-6e5c-02ba-946a-1db2b34c06be` · **active** · STARTER 2026.1 · active 1 · suspended 0 · ended 0 |
| 기관 · 반 | `dad40381-5965-c087-5462-23169a6e3971` active · 반 `6169936b-c450-c53d-2f45-62ed03293221` active |
| 배정 | `3c7d7ceb-0043-d005-45f5-018e8d5e4085` · **STAGING-P8 (가상)** · active · start 2026-09-28 |
| 수업 | 4 (모두 STAGING-P8 · scheduled · W1 2026-09-28 · W2 10-05 · W3 10-12 · W4 10-19) · 출결 · 관찰 · 리포트 0 |
| STAGING-P8 | published · 차시 8 · section 88 · content md5 `546c4bef…` |
| SOYE-STARTER-2026.1 | **없음** |
| Readiness | content ok (합성 차시 기준) · class_mode · weekly_report not_released · parent_portal CO-12 |
| cutover | 10C VERIFIED · G-2 VERIFIED · G-1 · M5 NOT APPLIED |

업무 데이터 지문(문장 #1): organizations `8324dc6b…` · members `ab86614e…` · classes `742fab65…` · children `eacd109a…` · contracts `ee875443…` · contract_classes `fd1f4bce…` · sessions `4ce7feef…` · attendance · observations · reports (0행) · capabilities `d9dd5db8…` · audit_events 1.

## 4. 콘텐츠 SQL 안전 검토

| 파일 | 결과 |
|---|---|
| `starter_2026_1_load.sql` (202,557자 · sha256 `9db95221…`) | `build-sql.mjs --check` PASS · INSERT = curriculum_programs 1 · curriculum_lessons 8 · lesson_sections 136 · UPDATE = lesson_sections 만 (고정 lesson id · draft 일 때만) · DELETE · DROP · TRUNCATE · 계약 · 기관 · 원아 · 수업 · 리포트 · auth · STAGING-P8 언급 0 · `'published'` 0 · 고정 id 9 (프로그램 1 + 차시 8) |
| `starter_2026_1_publish.sql` (2,450자 · sha256 `af3047c2…`) | 고정 id 9 개만 UPDATE · 필수 section 11 누락 시 예외 · 차시 8 개 아니면 예외 (fail closed) · 다른 프로그램 · 계약 · 사용자 · 원아 변경 없음 |

## 5. 실행

| 단계 | 시각 (UTC) | 결과 |
|---|---|---|
| load (draft) | 2026-10-01 08:30:54 → 08:32:04 | applied · exit 0 |
| draft 검증 | 08:32 이후 | 136/136 section md5 · 제목 · objective · source_ref = canonical (불일치 0) · W1~W8 17 section · 필수 누락 0 · source_ref 17/17 · 원본 sha 앞 16자 일치 · W4 키워드 ‘시작’ · (가상)/TODO/샘플 0 · URL 0 · 금지 표현 0 · 업무 데이터 · 계약 · 배정 · Readiness · STAGING-P8 **변화 없음** |
| publish | 08:33:55 → 08:34:55 | applied · exit 0 · 136/136 그대로 · 차시 · 프로그램 published |
| UAT 전환 | 08:41:08 → 08:42:27 | applied · exit 0 (`switched`) |

검증 도구: `supabase/content/verify_staging_content.mjs` (canonical ↔ Staging section 1:1 md5 · 읽기 전용) · `sql/p10f_starter_section_hashes.sql`.

## 6. UAT 전환 설계 — `supabase/content/starter_2026_1_staging_uat_switch.sql`

스키마 · 앱 수명주기 근거: `class_program_assignments.status` ∈ (active · completed · cancelled) · DELETE 권한 · 정책 없음 · 상태 전환 trigger 없음 (updated_at 만) · 앱 `closeClassProgramAssignmentAction` = `set status='completed' where id · org · status='active'` · `createClassProgramAssignmentAction` = (organization_id, class_id, program_id, start_date, status='active') · 배정 audit 이벤트 없음 · Readiness 는 active 배정만 본다.

| 항목 | 설계 |
|---|---|
| 대상 | 고정 id: 기관 `dad40381…` · 반 `6169936b…` · 계약 `9b9eef88…` · 기존 배정 `3c7d7ceb…` (STAGING-P8 `c66a3734…`) · 새 프로그램 `4f54cc7e…` · 새 배정 `794fbfb1-97d5-3231-a4bf-67ce781bf92c` (결정적) |
| 거부 조건 | 합성 아닌 사용자 > 0 · 계약 없음/기관 다름/active 아님 (suspended · ended · draft) · active 계약 ≠ 1 또는 suspended ≠ 0 · 반이 계약 범위 아님/active 아님 · 새 프로그램 published 아님 · W1~W8 게시+필수 section 완비 ≠ 8 · 기존 배정 id/프로그램/반 불일치 · 기대 외 배정 상태 · 반 active 배정 ≠ 1 |
| 동작 | 기존 배정 `active → completed` (앱과 같은 조건 · 1행) · 새 배정 INSERT (`status='active'` · `start_date = private.local_today()` · `origin_contract_id = 계약`) |
| 사후 확인 | 계약 active · 반 active 배정 = 새 배정 하나 · content readiness ok · missing_weeks [] · STAGING-P8 published 그대로 — 실패 시 예외 → 전체 취소 |
| 반복 | 기존 completed + 새 active = `already_switched` (변화 없음) |
| 하지 않음 | 삭제 · 계약 변경 · 수업 · 출결 · 관찰 · 리포트 · 원아 · STAGING-P8 프로그램/차시 변경 · 영구 함수 생성 (pg_temp 만) |

### 되돌리기 (삭제 · 재활성화 없이 · 별도 승인 시)

새 배정을 `completed` 로 바꾸고 STAGING-P8 에 **새** active 배정을 추가한다 (기존 STAGING-P8 배정 행은 이력으로 남김 · 앱은 종료 배정 재활성화를 허용하지 않는다). local rehearsal B1 · B2 로 확인. 기존 STAGING-P8 예정 수업은 어느 쪽이든 그대로 남는다.

## 7. Local rehearsal — `supabase/tests/p0_phase10f_uat_switch.test.sql` **24/24**

Staging 과 같은 id 의 합성 fixture (계약 · 반 · 원아 2 · STAGING-P8 · 기존 배정 · 예정 수업 4 + 완료 수업 1 · 출결 · 관찰 · 리포트) → load · publish · **같은 전환 파일** \ir 실행:
기존 배정 completed 보존 · 새 배정 active · 반 현재 배정 1 · 계약 ACTIVE · 업무 데이터 지문 동일 · STAGING-P8 불변 · 수업 5 · 리포트 보존 · content ok · missing_weeks [] · 두 번째 실행 `already_switched` · 계약 suspended / 합성 아닌 사용자 / 기대 외 상태 = 거부 · 종료 배정 예정 수업 시작 불가 · 새 배정 수업 예정 가능 · 되돌리기 경로 (이력 3행 · 삭제 없음).

## 8. 전환 후 Staging (읽기 전용)

| 항목 | 값 |
|---|---|
| 업무 데이터 지문 | **쓰기 전과 동일** (차이 필드 0 — 기관 · 구성원 · 반 · 원아 · 계약 · 계약 반 · 수업 · 출결 · 관찰 · 리포트 · capability · audit 행 수) |
| 계약 | `9b9eef88…` **ACTIVE** · active 1 · suspended 0 · ended 0 |
| 반 현재 프로그램 | **SOYE-STARTER-2026.1** (배정 `794fbfb1…` active · start 2026-10-01 · origin = 계약) |
| STAGING-P8 | 배정 `3c7d7ceb…` **completed (이력 보존)** · 프로그램 published · 차시 8 · section 88 · md5 `546c4bef…` 그대로 · 예정 수업 4 그대로 |
| 실제 콘텐츠 | W1~W8 published · 136/136 = canonical · md5 `dbb8d9a0…` |
| Readiness | **content ok · missing_weeks []** · program_assignment ok · class_scope ok · contract ok · product_version ok · feature:class_mode · weekly_report not_released · parent_portal policy_blocked (CO-12) |
| 게시 section 보호 trigger | 켜짐 |
| cutover | **10C ACTIVE — VERIFIED** · **G-2 ACTIVE — VERIFIED** · G-1 NOT APPLIED (gate trigger 0 · audit 없음) · M5 NOT APPLIED |
| 합성 아닌 사용자 | 0 |

## 9. 읽기 전용 역할 smoke (`e2e_roles.mjs --target staging` · 쓰기 flag · 수업 id 없음 · 2026-10-01 08:47 UTC)

**PASS 25 · SKIP 5 · FAIL 1** — HQ Admin · HQ Sales · Director · Teacher 로그인 PASS · 교사 오늘의 수업 · 원장 STARTER 화면 PASS · SKIP = 쓰기 · 실패 로그인 단계.
FAIL 1 = HQ Admin 출시 dialog 사유 필드 → **OLD_PREVIEW_CODE** (saas-v2 Preview 에 이 브랜치 앱 코드 없음 · 10C.2 와 같음 · DB 로 맞추지 않음).
교사 · 원장 화면에서 **실제 W1~W8 차시를 여는 확인은 이번 smoke 범위 밖** — 새 배정에 예정 수업이 아직 없다 (아래 §11).

## 10. 회귀 (local · repository)

pgTAP 7 files **351/351** (10F 24 · 10E 26 · 10D 22 · 10C 47 · 08 86 · hardening 116 · baseline 30) · cutover G1 24 · G2 67 · M3 70 · M5 46 · 앱 테스트 10F 4 · 10E 9 · 10D 6 · 10C 6 · harness 49 · 08 13 · 09C 5 · `build-sql --check` · `M5_app_preflight` 7/7 · `JKL_start_gate` READY · `G2_app_preflight` 17/18 (기대) · lint · tsc · build 통과.

## 11. 최종 직원 UAT Preview 전 남은 것

1. **새 프로그램 수업 일정**: 새 배정(SOYE-STARTER-2026.1)에 예정 수업이 없다 → HQ Admin 화면(`createClassSessionAction`)으로 W1~ 일정 생성 (Staging 쓰기 · 별도 승인)
2. **기존 STAGING-P8 예정 수업 4건**: 종료된 배정이라 **시작할 수 없고** 오늘의 수업 보드에 남는다 (W1 은 2026-09-28 지남) → 취소(정리) 여부 결정 (별도 승인 · 이번 phase 수업 쓰기 없음)
3. **Preview 앱 코드**: saas-v2 Preview 는 이 브랜치 코드가 아니다 (10C 출시 dialog · 10D 모아보기 수정 미포함) → Preview 배포 범위 결정
4. **TEACHER CREDENTIAL ROTATION — OPEN** (사람 확인 필요)
5. **P09D-C2 Staging secret/API key rotation — OPEN**
6. (변화 없음) class_mode · weekly_report 미출시 · CO-12 OPEN · G-1 · M5 · J/K/L 미적용 — 직원 UAT 는 읽기 · 쓰기 범위를 이 상태 기준으로 안내

4 · 5 는 최종 직원 UAT 패키지 배포 전에 닫아야 한다. 환경 변수 존재 · git secret scan 은 회전 증거가 아니다.

## 12. BC-3

**CLOSED FOR STAGING EMPLOYEE UAT** — 실제 W1~W8 콘텐츠가 Staging 에 published · 합성 UAT 반의 현재 프로그램 · content readiness ok. **Production 은 승인 · 적재되지 않았다** (Production BC-3 = OPEN · 별도 승인).

## 13. 하지 않은 것

Production 접근 · Vercel 배포 · 병합 · 기능 출시 · CO-12 해제 · G-1 · M5 · J/K/L · 계약 정지/종료 · STAGING-P8 삭제 · 이력 삭제 · 수업 · 출결 · 관찰 · 리포트 쓰기 · 실제 아동 · 학부모 데이터 · 자격증명 회전 · 출력.
