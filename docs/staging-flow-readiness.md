# 스테이징 수업 흐름 검증 — 준비 현황과 연결 필요 항목

대상 흐름: **수업 준비 → 교실 화면 → 관찰 기록 → 결과보고**
작성: 2026-10-14 · 기준 커밋 `058b768`

> 이 문서는 **코드와 기존 문서를 읽어** 정리한 것이다. 스테이징 DB 에 직접 붙어
> 확인하지 않았다 — 아래 1절의 「확인 방법」이 그 때문에 첫 항목이다.

---

## 1. 먼저 바로잡을 것 — 스테이징과 운영은 다른 프로젝트다

| 환경 | Supabase 프로젝트 | ref | 문서상 적용 migration |
|---|---|---|---|
| **Staging** | `teachable-art-play3-staging` | `itcddooiuqsqingfhxkk` | **38건** (`20261002100000_p10c_release_controls` 까지) |
| **Production** | SOYESKIDS's Project | `vpppxuhodwauaclhybtg` | 21건 |

ChatGPT 가 읽기 전용으로 확인했던 **「21건」은 Production** 이다
(`vpppxuhodwauaclhybtg`). 스테이징은 그보다 훨씬 앞서 있다.

근거: [phase-10c2-staging-rehearsal.md](11-production-readiness/phase-10c2-staging-rehearsal.md)
(적용 후 `migration list --linked` = 38 = 38 · 마지막 `20261002100000`),
[g1-rehearsal-plan.md](09-staging-validation/g1-rehearsal-plan.md) (두 ref 구분).

### 확인 방법 (아직 안 함)

```
supabase migration list --linked      # supabase/.temp/project-ref 가 itcddooiuqsqingfhxkk 인지 먼저 눈으로 확인
```

이 문서의 모든 판정은 **스테이징 = #38** 이라는 문서 기준 가정 위에 있다.
위 명령으로 실제 번호를 확인하기 전에는 아래 표를 확정으로 쓰지 않는다.

### migration 번호

이 문서의 `#n` 은 `supabase/migrations` 를 파일명 정렬한 순서다 (#1 =
`20260812_create_lead_submissions.sql`, #49 = `20261014093000_e4_lesson_section_scope.sql`).

---

## 2. 단계별 준비 현황 (스테이징 #38 가정)

### 2-1. 수업 준비 — `/teacher/sessions/[sessionId]/before`

| | |
|---|---|
| 판정 | ✅ **열린다** |
| 필요한 것 | `class_sessions.week_no` + 채움 트리거(#24) · `session_before_confirmations`(#24) · `quick_memos`(#24) · `child_media_consents`(#24) · `lesson_sections`(#23) · `confirm_session_before`·`start_class_session`(#29) · 시작 권한 트리거(#34) · `class_entitlements`(#30) |
| 스테이징 | 전부 ≤#38 → 있음 |
| 빠지는 것 | **수업 자료 패널**(`list_lesson_assets_for_class` #41, `lesson_asset_download_status` #45) → 「미적용」으로 비어 보인다. 화면 전체는 실패하지 않는다 |
| 계약 조건 | feature `class_mode` · 활성 계약 1건 · `contract_classes` 에 그 반 · 주차가 `product_versions.week_from..week_to` 안 |

`start_class_session` 이 DB 에서 재판정하는 것: 로그인 · 회차 `scheduled` ·
담당 교사(`class_teachers`) · BEFORE 확인 선행 · `class_write_allowed` ·
주차 이용권 · **Required Content Set**(`required_lesson_sections()` 의 모든
섹션이 `lesson_sections` 에 있어야 함 — 없으면 `SS008`).

> ★ 회차(`class_sessions` 행)는 **교사가 만들 수 없다.** 본사 운영자가
> 반 배정 → 회차 예정 순으로 만든다. 스테이징에는 합성 UAT 반에 W1~W8
> 8건이 이미 들어가 있다
> ([phase-10g](11-production-readiness/phase-10g-final-employee-uat.md) ·
> `supabase/content/starter_2026_1_staging_uat_sessions.sql`).

### 2-2. 교실 화면 — `/class/[sessionId]`

| | |
|---|---|
| 판정 | 🟡 **fixture 로는 열린다 · DB 교안으로는 안 열린다** |
| 지금 동작 | `CONTENT_SOURCE` 기본값이 `fixture` 이므로 저장소 fixture 의 장면이 뜬다 |
| DB 경로에 필요한 것 | `lesson_scenes`·`product_version_programs`(#46) · `list_lesson_scenes_for_class`(#48) · `member_lesson_entitled`(#49) · 적재 `tap24_2026_1_load.sql` · `CONTENT_SOURCE=database` |
| 스테이징 | #46~#49 **미적용** |
| 권한 | RPC 가 담당 교사/원장 → 계약 범위 → 배정·발행·주차 이용권 순으로 판정. 못 보면 **0행**(있는지 없는지 알려주지 않는다) |

진입 경로: `/teacher/weeks/[weekNo]` 의 회차 띠에서 상태가 `in_progress` 일 때
「교실 화면 열기」가 나온다. `/teacher/sessions/[id]/during` 에는 링크가 없다.

### 2-3. 관찰 기록 — `/teacher/sessions/[sessionId]/observations`

| | |
|---|---|
| 판정 | ✅ **열린다** |
| 필요한 것 | `class_session_observations.taxonomy`·`growth_metrics`·`observation_growth_selections`(#24) · `save_class_observation`(#29) · 쓰기 게이트 트리거(#35) · Storage 버킷 `observation-media`(#16) |
| 스테이징 | 전부 ≤#38 → 있음 |
| 조건 | 회차가 `in_progress` 또는 `completed` · feature `class_mode` · Growth5 선택 최대 5개 · `complete` 에는 교사 관찰이나 아이의 말 중 하나 이상 |
| AI 정리 | feature `ai_assist` ∧ `capability_released('ai_assist')` ∧ `OPENAI_API_KEY` — 셋 중 하나라도 없으면 버튼이 닫힌다 (설계대로) |

### 2-4. 결과보고

| 갈래 | 판정 | 필요한 것 | 스테이징 |
|---|---|---|---|
| **주간 리포트** | ✅ 열린다 | `reports`·`report_revisions`·`report_revision_evidence`(#25) · `create_weekly_report_draft`·`save_report_draft`·`complete_report_revision`(#31) · feature `weekly_report` | 있음 |
| **월간·학기 리포트** | ❌ 안 열린다 | `report_period_sources`·`create_period_report_draft`·`set_period_report_sources`(**#44**) + `capability_released('monthly_report'/'semester_report')` | **#44 미적용** |
| 일괄 인쇄 | 🟡 스위치 문제 | feature `bulk_print` ∧ `capability_released('bulk_print')` | 표는 있음 · 출시 스위치 확인 필요 |
| **보호자 포털 공개 조회** | ❌ 안 열린다 | `child_portals`(#25) · `issue_child_portal`(#31) 은 있으나 `portal_access_throttle`(**#40**) · `read_child_portal_guarded`(**#42**) 가 없고, 라우트가 `register_portal_access_attempt` 실패를 **fail-closed** 로 처리 | **#40·#42 미적용** |
| 구 형식 성장 리포트 읽기 | ✅ | `child_growth_reports`(#18) 계열 | 있음 |

> `create_or_refresh_child_growth_report`(#18) 는 **앱에서 더 이상 호출하지 않는다**
> (`grep -rn "create_or_refresh" src` 0건). 교사 결과보고의 정식 경로는
> `reports`/`report_revisions` 기반 주간·기간 리포트다.

### 한눈에

| 단계 | 스테이징 #38 에서 | 막는 것 |
|---|---|---|
| 1 수업 준비 | ✅ | — (자료 패널만 비어 보임 #41·#45) |
| 2 교실 화면 | 🟡 fixture 만 | #46~#49 + 적재 + `CONTENT_SOURCE` |
| 3 관찰 기록 | ✅ | — |
| 4 결과보고 (주간) | ✅ | — |
| 4 결과보고 (월간·학기·포털) | ❌ | #40 · #42 · #44 |

---

## 3. 연결 필요 항목

### A. 먼저 할 것 — 사실 확인 (쓰기 없음)

| # | 항목 | 왜 |
|---|---|---|
| A1 | 스테이징 `migration list --linked` 실제 번호 | 이 문서 전체가 「#38」 가정 위에 있다 |
| A2 | `feat/platform-finish-20261012` 의 Vercel Preview 가 **어느 Supabase** 를 보는지 | Preview 환경변수는 저장소에 없다. 스테이징을 보지 않으면 이 흐름을 시험할 수 없고, 운영을 보면 **건드리면 안 된다** |
| A3 | 스테이징 `platform_capabilities` 의 `is_released`·`blocked_by` | 월간·학기·일괄 인쇄·AI 가 여기서 닫힌다 |
| A4 | 합성 UAT 회차 8건의 현재 상태(`scheduled`/`in_progress`/`completed`)와 계약 기간 | 계약 기간이 2026-11-27 까지로 적혀 있다. 지났으면 주차 이용권 판정이 전부 막힌다 |

### B. 적용이 필요한 migration (스테이징 기준 · 아직 하지 않음)

| 순서 | 파일 | 이 흐름에서 푸는 것 |
|---:|---|---|
| #39 | `d3_lead_notification_outbox` | (흐름과 무관하나 순서상 선행) **CHECK 서브쿼리 결함 수정본이어야 적용된다** |
| #40 | `c3_portal_expiry_rate_limit` | 보호자 포털 공개 조회 |
| #41 | `b2_lesson_assets` | 수업 준비 화면의 자료 패널 |
| #42 | `c3b_portal_access_policy` | 보호자 포털 공개 조회 |
| #43 | `d3b_lead_notification_delivery` | (순서) |
| #44 | `c2b_period_report_compose` | **월간·학기 리포트** |
| #45 | `b2b_lesson_asset_predownload` | 자료 사전 내려받기 |
| #46~#49 | `e1`~`e4` | 교실 화면 DB 교안·장면 + 발행 게이트 + 읽기 범위 |
| — | `supabase/content/tap24_2026_1_load.sql` | 24주 교안 적재 (migration 아님) |

적용 절차·백업·복구는 [e-stage-db-connection.md §2](./e-stage-db-connection.md) 에 있다.
스테이징 쓰기 경로는 `supabase/content/apply_staging_content.mjs` 처럼
**대상 ref 를 명시 확인하는 길**만 쓴다.

### C. 환경변수

| 변수 | 상태 | 필요한 곳 |
|---|---|---|
| `CONTENT_SOURCE` | **`.env.example` 에 없다** — 문서화 누락 | 교실 화면·교사 화면의 DB 교안. 기본값 `fixture` |
| `PORTAL_THROTTLE_SALT` | 16자 이상 필수 · 없으면 공유 조회를 **아예 열지 않는다** | 보호자 포털 · 구 형식 공유 링크 |
| `OPENAI_API_KEY` · `OPENAI_OBSERVATION_MODEL` | 선택 | 관찰 AI 정리 |
| `SUPABASE_SECRET_KEY` | 선택 | 원장 초대(Auth Admin) |

`.env.example` 의 `SOYE_SAAS_V2_APP_CUTOVER` 는 `src/` 에서 더 이상 읽지 않는다.

### D. 접근 — 지금 막혀 있는 것

| 항목 | 상태 |
|---|---|
| Vercel Preview 보호 | 모든 Preview 가 Vercel Authentication(SSO) 뒤에 있다. 로그인한 사람만 연다 — 자동 검증도 직원 UAT 도 여기서 멈춘다 |
| 합성 계정 비밀번호 | 저장소에 없다 (설계대로). 별도 전달 |
| **P09D-C2 — 스테이징 키 회전** | **열려 있다.** [phase-10h](11-production-readiness/phase-10h-employee-uat-handoff.md) 가 「닫히기 전에는 직원에게 URL·계정을 보내지 않는다」고 적어 둔 상태다 |

### E. 기능 출시 스위치 (`platform_capabilities`)

`monthly_report` · `semester_report` · `bulk_print` · `ai_assist` · `parent_portal`
은 표가 있어도 `capability_released()` 가 false 면 닫힌다. 변경 RPC 는
`set_capability_release`(#38). 어떤 것을 켤지는 본사 결정이다.

---

## 4. 권하는 순서

```
1) A1·A2 확인 (읽기 전용)            ← 여기서 그림이 달라질 수 있다
2) A3·A4 확인
3) #39~#45 스테이징 적용 + 검증       ← 월간·학기·포털·자료가 열린다
4) 1~4단계 흐름을 스테이징에서 사람이 실행 (CONTENT_SOURCE 는 fixture 유지)
5) #46~#49 적용 + 24주 적재
6) CONTENT_SOURCE=database 로 교실 화면 재확인
7) 본사 검수 → 발행
```

3)·5) 사이에 흐름을 한 번 돌려 두면, 교안 연결에서 생긴 문제와 업무 흐름에서
생긴 문제를 구분할 수 있다. 한꺼번에 올리면 어느 쪽이 깨졌는지 알기 어렵다.

---

## 5. 이 문서에서 확인하지 않은 것

- 스테이징 DB 실제 상태 (migration 번호 · 기능 스위치 · 회차 상태 · 계약 기간)
- Preview 가 보는 Supabase 프로젝트
- `/teacher` 홈과 출결 화면이 각 환경에서 실제로 뜨는지 (주요 질의만 읽어 본 추정)
- 네 단계를 사람이 눌러 보는 시험 (브라우저 검증)
