# 스테이징 수업 흐름 검증 — 준비 현황과 연결 필요 항목

대상 흐름: **수업 준비 → 교실 화면 → 관찰 기록 → 결과보고**
작성: 2026-10-14 · 갱신: 2026-10-14 (Supabase 실제 조회 반영) · 기준 커밋 `473b49a`

> ## ⛔ 지금은 스테이징에서 아무것도 시험할 수 없다
>
> 스테이징 프로젝트가 **INACTIVE**(일시정지) 상태다. 먼저 재개해야 한다.
> 재개는 **사람이 결정하고 사람이 실행한다** — 이 문서는 절차만 적는다.

---

## 0. 실제 조회 결과 (2026-10-14)

| 대상 | 결과 | 뜻 |
|---|---|---|
| Staging `itcddooiuqsqingfhxkk` | **INACTIVE** | 일시정지. 앱도 CLI 도 붙지 못한다 |
| Staging migration 이력 조회 | **연결 시간 초과** | 정지 상태라 응답이 없다 — 「이력이 없다」가 아니다 |
| Production `vpppxuhodwauaclhybtg` | **ACTIVE_HEALTHY · migration 21건** | 운영은 #1~#21 에 머물러 있다 |
| 문서 커밋 `473b49a` | Vercel 검사 **success** | 앱 빌드는 이상 없다 |

### 이것이 바꾸는 것

- **1~5절의 「스테이징 = #38」은 확인되지 않은 문서 기준 가정으로 남는다.**
  정지된 프로젝트에서는 `migration list` 가 돌지 않으므로 확인할 길이 없었다.
  재개한 뒤 5절 순서대로 읽어 확인한다.
- 그때까지 네 단계의 「열린다 / 안 열린다」 판정도 **가정**이다. 표에 그대로 둔
  이유는, 재개 뒤 실제 값과 대조할 기준이 있어야 하기 때문이다 —
  **맞다고 보고하기 위한 것이 아니다.**
- **운영(#21)에서는 네 단계 중 1·2·3 이 모두 열리지 않는다.** 수업 준비·관찰·
  주간 리포트가 쓰는 것들(`class_sessions.week_no`·Growth5·`reports`·업무 RPC)이
  전부 #23 이후에 생기기 때문이다. 이것은 **조회로 확인된 migration 번호**에서
  나오는 판정이므로 가정이 아니다 — 그리고 운영에서 이 흐름을 시험할 일은 없다.

---

## 1. 스테이징과 운영은 다른 프로젝트다

| 환경 | Supabase 프로젝트 | ref | migration | 상태 |
|---|---|---|---|---|
| **Staging** | `teachable-art-play3-staging` | `itcddooiuqsqingfhxkk` | **38건 (문서 기준 · 미확인)** | **INACTIVE** |
| **Production** | SOYESKIDS's Project | `vpppxuhodwauaclhybtg` | **21건 (조회 확인)** | ACTIVE_HEALTHY |

ChatGPT 가 읽기 전용으로 확인했던 **「21건」은 Production** 이다.
스테이징이 그보다 앞서 있다는 것은 아래 문서들의 기록이고, **조회로 확인한 적은
없다**:
[phase-10c2-staging-rehearsal.md](11-production-readiness/phase-10c2-staging-rehearsal.md)
(적용 후 `migration list --linked` = 38 = 38 · 마지막 `20261002100000`),
[g1-rehearsal-plan.md](09-staging-validation/g1-rehearsal-plan.md) (두 ref 구분).

### migration 번호

이 문서의 `#n` 은 `supabase/migrations` 를 파일명 정렬한 순서다 (#1 =
`20260812_create_lead_submissions.sql`, #49 = `20261014093000_e4_lesson_section_scope.sql`).

---

## 2. 단계별 준비 현황 (스테이징 #38 **가정** · 미확인)

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

**A0 이 끝나기 전에는 A1·A3·A4 를 시도할 수 없다** (정지된 프로젝트는 응답하지 않는다).

| # | 항목 | 상태 | 왜 |
|---|---|---|---|
| A0 | 스테이징 프로젝트 재개 | **대기** — 사람이 결정 | 아래 5절 |
| A1 | 스테이징 `migration list --linked` 실제 번호 | **미실행** (연결 시간 초과) | 이 문서 전체가 「#38」 가정 위에 있다 |
| A2 | 개발 브랜치 Preview 가 **어느 Supabase** 를 보는지 | **미확인** — 아래 6절 | 스테이징을 보지 않으면 흐름을 시험할 수 없고, 운영을 보면 **쓰면 안 된다** |
| A3 | 스테이징 `platform_capabilities` 의 `is_released`·`blocked_by` | 미실행 | 월간·학기·일괄 인쇄·AI 가 여기서 닫힌다 |
| A4 | 합성 UAT 회차 8건 상태와 계약 기간 | 미실행 | 계약 기간이 2026-11-27 까지로 적혀 있다. 지났으면 주차 이용권 판정이 전부 막힌다 |

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
| `CONTENT_SOURCE` | ✅ `.env.example` 에 추가함 (기본 `fixture` · 허용값 `fixture`·`database`) | 교실 화면·교사 화면의 DB 교안 |
| `PORTAL_THROTTLE_SALT` | 16자 이상 필수 · 없거나 짧으면 공유 조회를 **아예 열지 않는다** (코드 조건 확인함) | 보호자 포털 · 구 형식 공유 링크 |
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
0) 스테이징 재개 여부 결정 + 재개      ← 사람. 5-1 의 세 가지를 먼저 정한다
1) A1 확인 (migration 실제 번호)       ← 여기서 2절 전체가 달라질 수 있다
2) A2 확인 (Preview 가 보는 Supabase)  ← 확인 전에는 Preview 로 쓰지 않는다
3) A3·A4 확인 (기능 스위치 · 회차 · 계약)
4) #39~#45 스테이징 적용 + 검증        ← 월간·학기·포털·자료가 열린다
5) 네 단계 흐름을 사람이 실행          ← CONTENT_SOURCE=fixture 유지
6) #46~#49 적용 + 24주 적재 (draft)
7) 본사 검수 경로에서 24주 대조         ← 정식 경로는 아직 fixture 다
8) 검수가 끝난 주차만 본사가 발행
9) CONTENT_SOURCE=database 로 정식 경로 재확인
```

5)와 6) 사이를 갈라 두는 이유는 7절에 적었다 — 한꺼번에 올리면 교사 화면이
비었을 때 **업무 흐름이 깨진 것인지 · 적재가 안 된 것인지 · 검수 전이라 막힌
것인지** 구분할 수 없다.

---

## 5. 스테이징 재개 절차 (준비만 · 실행하지 않음)

> 재개 · migration 적용 · 키 회전은 **이번 작업에서 하지 않는다.**
> 아래는 사람이 실행할 순서다.

### 5-1. 재개 전에 정하고 갈 것

| 항목 | 왜 지금 정해야 하나 |
|---|---|
| **P09D-C2 키 회전** | [phase-10h](11-production-readiness/phase-10h-employee-uat-handoff.md) 가 「닫히기 전에는 직원에게 URL·계정을 보내지 않는다」로 묶어 둔 항목이다. 재개하면 옛 키로 접근 가능한 상태가 그대로 살아난다 — 회전을 먼저 할지, 내부 검증만 하고 배포는 미룰지 정한다 |
| 일시정지 사유 | 비용 절감인지 사고 대응인지에 따라 재개 뒤 할 일이 다르다 |
| 데이터 보존 여부 | Supabase 무료 플랜의 장기 정지는 백업만 남기고 복원이 필요할 수 있다. 합성 UAT 기관·반·계약·회차·관찰이 남아 있는지가 7절 검증의 전제다 |

### 5-2. 재개 (사람이 실행)

```
1) Supabase 대시보드 → 프로젝트 teachable-art-play3-staging (itcddooiuqsqingfhxkk)
   → Restore / Resume.  ★ 운영(vpppxuhodwauaclhybtg) 화면이 아닌지 ref 로 확인한다.
2) 상태가 ACTIVE_HEALTHY 가 될 때까지 기다린다 (재개는 수 분 걸린다).
3) 대시보드가 「restore from backup」을 요구하면, 어느 시점 백업인지 적어 둔다.
   그 시점 이후의 합성 데이터는 사라진 상태로 돌아온다.
```

### 5-3. 재개 직후 — 읽기 전용 확인 순서

**순서가 중요하다.** 앞 단계가 틀리면 뒤 결과를 믿을 수 없다.

```
0) 대상 확인      supabase/.temp/project-ref 와 linked-project.json 이
                 itcddooiuqsqingfhxkk 인지 눈으로 본다.
                 vpppxuhodwauaclhybtg 가 보이면 즉시 멈춘다.
1) migration 이력  supabase migration list --linked
                 → local 49 · remote ? · 마지막 remote 파일명을 적는다.
                 이것이 1절 표의 「38건 가정」을 대체한다.
2) 기능 출시 스위치 select code, is_released, blocked_by
                   from public.platform_capabilities order by code;
                 → monthly_report · semester_report · bulk_print · ai_assist ·
                   parent_portal · class_mode · weekly_report
3) 상품 ↔ 프로그램  select pv.id, p.code, pv.version_label, pv.week_from, pv.week_to,
                          pvp.program_id, cp.code
                     from public.product_versions pv
                     join public.products p on p.id = pv.product_id
                     left join public.product_version_programs pvp
                            on pvp.product_version_id = pv.id
                     left join public.curriculum_programs cp on cp.id = pvp.program_id
                    order by p.code, pv.version_label;
                 ★ product_version_programs 는 E1(#46) 에서 생긴다.
                   remote 가 #46 미만이면 이 조인은 「표 없음」으로 실패한다 —
                   그것이 정상이며, 실패 자체가 답이다.
4) 계약           select c.id, c.status, c.start_date, c.end_date, pv.version_label
                     from public.contracts c
                     join public.product_versions pv on pv.id = c.product_version_id;
                 → 오늘이 start_date..end_date 안인지. 지났으면 주차 이용권이 전부 막힌다.
5) UAT 회차        select s.id, s.status, s.week_no, s.scheduled_date, l.title
                     from public.class_sessions s
                     join public.curriculum_lessons l on l.id = s.lesson_id
                    order by s.scheduled_date;
                 → 8건(W1~W8)이 있는지 · 상태가 무엇인지.
6) 반 배정 · 담임   select cpa.class_id, cpa.program_id, cpa.status,
                          (select count(*) from public.class_teachers ct
                            where ct.class_id = cpa.class_id) as teachers
                     from public.class_program_assignments cpa;
                 → 담임이 0이면 교실 화면 RPC 가 거부한다 (화면 문제가 아니다).
7) 콘텐츠 상태     select p.code, count(*) filter (where l.status='published') as published,
                          count(*) as lessons
                     from public.curriculum_lessons l
                     join public.curriculum_programs p on p.id = l.program_id
                    group by p.code;
```

읽기 전용 수단: `supabase db query --linked --file <tmp.sql>` (저장소의
`supabase/validation/staging_e2e/guards.mjs` 가 쓰는 방식) 또는 대시보드 SQL
편집기. **SELECT 만 보낸다.**

### 5-4. 확인 뒤에 판단할 것

| 읽은 값 | 다음 행동 |
|---|---|
| remote 가 #38 이면 | 3절 B 표의 #39~#45 적용 검토 → 월간·학기·포털·자료가 열린다 |
| remote 가 #38 미만이면 | 1~5절 판정을 그 번호 기준으로 **다시 쓴다** |
| 합성 데이터가 사라졌으면 | `supabase/content/apply_staging_content.mjs` 의 `uat-switch`·`uat-sessions` 로 다시 만든다 (대상 ref 확인 필수) |
| 계약 기간이 지났으면 | 계약 기간 연장은 본사 결정이다. 임의로 늘리지 않는다 |

---

## 6. 개발 브랜치 Preview 는 어느 Supabase 를 보는가 — **확인 못 함**

### 시도한 것과 결과

| 방법 | 결과 |
|---|---|
| Preview URL 로 HTML·정적 자산·이미지 요청 | **전부 302 → vercel.com SSO.** 번들을 읽을 수 없다 |
| 저장소에서 Preview 환경변수 찾기 | 없다 (`.env*` 는 커밋하지 않는다 · `vercel.json` 에도 없다) |
| `supabase/validation/staging_e2e/preview_probe.mjs` | 이 도구가 바로 「번들에서 Supabase ref 찾기」를 한다. 다만 `guards.mjs` 의 `PREVIEW_ALIAS` 가 **saas-v2 Preview 하나로 고정**되어 있어 이 브랜치 Preview 를 넣으면 거부한다. 그 가드는 도구가 엉뚱한 데를 보지 못하게 하려고 둔 것이므로 **임의로 넓히지 않았다** |

### 추측 (확인 아님)

Vercel 환경변수는 보통 **Preview 환경 단위**로 설정한다. saas-v2 Preview 가
스테이징을 봤다는 기록이 있으므로, 같은 Preview 환경을 쓰는 이 브랜치도
스테이징을 볼 **가능성이 높다**. 그렇다면 스테이징이 INACTIVE 인 지금,
이 Preview 의 로그인·업무 화면은 **DB 에 닿지 못해 오류**가 난다.
공개 홈페이지처럼 DB 를 쓰지 않는 화면만 정상으로 보인다.

이것은 추측이다. 아래 중 하나로 확인한다.

```
① Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   → Preview 범위의 NEXT_PUBLIC_SUPABASE_URL 의 <ref> 를 본다 (값 전체를 옮겨 적지 않는다)
② 로그인한 브라우저로 Preview 를 열고 개발자도구 Network 에서
   *.supabase.co 요청의 호스트 <ref> 를 본다
③ 이 브랜치 Preview alias 를 preview_probe 의 허용 목록에 **의도적으로** 추가하고
   (코드 변경 · 리뷰 대상) Deployment Protection Exception 을 연 뒤 돌린다
```

### 그때까지의 규칙

> **확인 전에는 Preview 를 통한 시험 데이터 쓰기를 하지 않는다.**
> 운영을 보고 있을 가능성을 배제하지 못한 상태에서 쓰면 운영 데이터가 더럽혀진다.
> 읽기(화면 열기)도 운영을 본다면 운영 데이터를 보는 것이므로, 확인이 먼저다.

보조 안전장치는 이미 있다 — `SUPABASE_PRODUCTION_PROJECT_REF` 와
`BLOCK_WRITES_ON_PRODUCTION_DATA=1` 을 Preview 환경에 설정해 두면 비운영 배포가
운영 프로젝트에 쓰는 것을 서버 쓰기 경로에서 막는다
(`src/lib/env/deployment-guard.ts`). **설정 여부도 ①에서 함께 본다.**

---

## 7. 적재 뒤 draft 는 막히는 것이 정상이다 — 두 경로를 구분한다

DB 적재(`tap24_2026_1_load.sql`)는 **전부 draft 로 넣는다. 자동 발행하지 않는다.**
그래서 적재 직후 정식 교사·교실 경로에서는 24주 교안이 **열리지 않는다.**
이것은 고장이 아니라 설계다.

> ★ 화면을 열려고 **임의로 발행하거나 발행 게이트를 우회하지 않는다.**
>   `publish_lesson()` 은 미해결 검수 기록 · 본사 결정 · 검수 시점 체크섬을
>   확인하고, `status` 직접 UPDATE 로 발행하는 길은 트리거가 막는다(E3).
>   그 둘을 피해 발행하면 **검수하지 않은 내용이 아이들 화면에 뜬다.**

### 두 경로

| | 기존 발행본 업무 흐름 검증 | 본사 콘텐츠 검수 |
|---|---|---|
| 무엇을 보나 | 수업 준비 → 교실 화면 → 관찰 → 결과보고가 **동작하는가** | 24주 전사본이 **원문과 맞는가** |
| 콘텐츠 | 이미 발행된 STARTER W1~W8 (스테이징에 published) | 새로 적재한 TAP24 2026.1 (draft) |
| `CONTENT_SOURCE` | `fixture` 로 둔다 — 업무 흐름 검증에 교안 출처를 섞지 않는다 | `database` |
| 누가 | 교사·원장 계정 | 본사(HQ Admin) 계정 |
| 경로 | `/teacher/...` · `/class/[sessionId]` | `/admin/curriculum/weeks` · `/admin/curriculum/weeks/[주차]` · `.../preview` · `.../quick-guide` |
| draft 가 보이나 | **아니다** (정식 경로는 발행본만) | **그렇다** (`internal_review` 경로라 검수 전 원문도 본다) |
| 발행 | 하지 않는다 | 검수가 끝난 뒤 **본사가** `publish_lesson()` 으로 한다 |

### 그래서 순서는

```
1) CONTENT_SOURCE=fixture 인 채로 네 단계 업무 흐름을 시험한다
   → 여기서 나는 문제는 전부 업무 흐름 문제다 (교안 연결과 무관)
2) E1~E4 적용 + 적재 (draft)
3) 본사 검수 경로에서 24주를 대조한다. 정식 경로는 아직 그대로 fixture 다
4) 검수가 끝난 주차만 본사가 발행한다
5) 그 뒤에 CONTENT_SOURCE=database 로 바꿔 정식 경로를 다시 본다
```

1)과 2)를 한꺼번에 하면, 교사 화면이 비었을 때 **업무 흐름이 깨진 것인지
적재가 안 된 것인지 검수 전이라 막힌 것인지** 구분할 수 없다.

---

## 8. 이 문서에서 확인하지 않은 것

| 항목 | 왜 |
|---|---|
| 스테이징 migration 번호 · 기능 스위치 · 회차 · 계약 | 프로젝트 INACTIVE · 연결 시간 초과 |
| 스테이징 합성 데이터 생존 여부 | 같음 |
| Preview 가 보는 Supabase 프로젝트 | Preview 가 SSO 뒤에 있고 저장소에 설정이 없다 (6절) |
| `/teacher` 홈·출결 화면이 각 환경에서 실제로 뜨는지 | 주요 질의만 읽어 본 추정 |
| 네 단계를 사람이 눌러 보는 시험 | 환경이 없다 |
| `PORTAL_THROTTLE_SALT` 가 `/admin/readiness` 에 표시되는지 | **표시되지 않는다.** `portal-throttle.ts` 주석은 「운영자는 로그와 /admin/readiness 로 원인을 본다」고 적었지만, 그 화면은 환경변수를 검사하지 않는다 — 주석이 앞서 나간 것으로 보인다 (코드는 고치지 않았다) |
