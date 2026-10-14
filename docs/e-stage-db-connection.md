# E단계 — DB 연결 현황 · 검증 결과 · 원격 적용 계획

기준 커밋: `27369f8` + 이번 보완분
작성: 2026-10-14

> 원격 DB 적용 · 계정 변경 · 본사 발행 · main 병합 · Production 승격은 **아직 하지 않았다.**

---

## 1. 원격 적용 이력 대조

ChatGPT 가 읽기 전용으로 확인한 현재 원격 상태:

| 항목 | 값 |
|---|---|
| 프로젝트 | SOYESKIDS's Project |
| ref | `vpppxuhodwauaclhybtg` |
| 상태 | ACTIVE_HEALTHY |
| 적용 migration | **21건** |
| 없는 것 | `lesson_sections` · `lesson_assets` · `product_versions` · `contracts` 등 |

저장소에는 **50건**이 있다 (E1~E4 + `uat_db_guard` 포함). 없는 표가 전부
`m1_commerce_entitlement_foundation` 이후에 생기므로, 원격은
**#1~#21 (2026-09-04 `harden_admin_access_execute` 까지)** 이다.

### ⚠️ 적용을 막던 결함 (고침)

`20261012090000_d3_lead_notification_outbox.sql` 의 `payload` CHECK 제약 안에
**서브쿼리**가 있었다. PostgreSQL 은 이것을 거부한다 (`cannot use subquery in
check constraint`). 원격에 적용된 적이 없어 드러나지 않았다.

→ 허용 키 검사를 `private.lead_outbox_payload_keys_allowed()` immutable 함수로
빼내 고쳤다. **이 줄이 고쳐지기 전에는 #39 이후를 하나도 적용할 수 없었다.**
같은 결함이 E1 에도 있었고(본사 결정 `affected_weeks` 범위 검사) 같은 방식으로 고쳤다.

---

## 2. 원격 적용 계획 — **운영(Production) 기준**

> ## ⚠️ 이 절은 운영 기준이다. 스테이징에 쓰지 않는다
>
> 2026-10-14 조회로 확정된 값:
>
> | 환경 | ref | migration |
> |---|---|---|
> | Production | `vpppxuhodwauaclhybtg` | **21건** |
> | Staging | `itcddooiuqsqingfhxkk` | **39건** (`…p10c_release_controls` + `uat_db_guard`) |
>
> 아래 `#22~#49` 는 **운영의 21건 위에** 올리는 계획이다. 스테이징은 이미
> 훨씬 앞서 있어 올릴 것이 **11건뿐**이고, 그 목록은
> [staging-flow-readiness.md §3](./staging-flow-readiness.md) 에 version 으로 적었다.
>
> 또한 원격에는 저장소 번호로 세던 것과 다른 version 이 하나 더 있다 —
> `20261002110000_uat_db_guard` (이번에 저장소로 가져왔다). **번호가 아니라
> version 으로 대조한다.**


### 2-1. 최소 의존 목록 (E1~E4 가 **직접** 필요로 하는 것)

E 단계 콘텐츠 구조만 놓고 보면 아래 네 건이 선행 조건이다.

| # | 파일 | 무엇을 주는가 |
|---:|---|---|
| 22 | `20261001090000_m1_hq_roles_audit_foundation.sql` | `private.is_hq_admin()` · `private.set_updated_at_clock()` |
| 23 | `20261001091000_m1_commerce_entitlement_foundation.sql` | `lesson_sections` · `products` · `product_versions` · `contracts` · `private.class_week_entitled()` · `required_lesson_sections()` |
| 24 | `20261001092000_m1_class_operation_foundation.sql` | `contract_classes` (E3·E4 의 범위 판정) |
| 26 | `20261001100000_m2_fact_backfill_reference_seed.sql` | starter · standard · premium 2026.1 상품 버전 seed (적재의 상품 연결) |

### 2-2. 운영 실제 적용 목록 (28건 + uat_db_guard, 이 순서로)

**최소 의존 목록만 골라 적용할 수는 없다.** migration 은 이력 순서대로
올라가고, 중간을 건너뛰면 이후 파일이 없는 객체를 참조한다. 그래서 실제로
적용하는 것은 #22~#49 **전부**다. 최소 의존 목록은 「무엇을 왜 올리는가」를
설명하기 위한 것이고, 적용 목록은 아래다.

| 순서 | 파일 | 기존 데이터 영향 |
|---:|---|---|
| 1 | `20261001090000_m1_hq_roles_audit_foundation.sql` | 역할·감사 표 추가. 기존 행 변경 없음 |
| 2 | `20261001091000_m1_commerce_entitlement_foundation.sql` | 상거래·이용권 표 **신설**. 기존 표에 열 추가 (기본값 있음) |
| 3 | `20261001092000_m1_class_operation_foundation.sql` | `class_sessions.week_no` 등 추가. 기존 회차에 값이 채워진다 |
| 4 | `20261001093000_m1_report_portal_foundation.sql` | 리포트 포털 표 추가 |
| 5 | `20261001100000_m2_fact_backfill_reference_seed.sql` | 상품·기능 기준자료 seed **삽입** |
| 6 | `20261001110000_m3_hq_role_foundation.sql` | 본사 역할 분리 |
| 7 | `20261001111000_m3_commerce_contract_readiness.sql` | 계약 활성화 게이트 트리거 |
| 8 | `20261001112000_m3_class_operation_rpcs.sql` | 반 운영 RPC |
| 9 | `20261001113000_m3_app_context_rpcs.sql` | `organization_entitlements` · `class_entitlements` |
| 10 | `20261001120000_m4_report_portal_rpcs.sql` | 리포트 포털 RPC |
| 11 | `20261002090000_p08_membership_authority.sql` | **읽기 정책 교체** — 반 조회가 담당 반 기준으로 좁아진다 |
| 12 | `20261002091000_p08_ai_assist_authorization.sql` | AI 사용 권한 판정 |
| 13 | `20261002092000_p08_session_start_authority.sql` | 수업 시작 조건 |
| 14 | `20261002093000_p08_evidence_write_gates.sql` | 근거 쓰기 게이트 |
| 15 | `20261002094000_p08_contract_capacity.sql` | 계약 정원 |
| 16 | `20261002095000_p08_legacy_share_safety.sql` | 기존 공유 링크 안전장치 |
| 17 | `20261002100000_p10c_release_controls.sql` | 기능 출시 스위치 |
| 17-a | `20261002110000_uat_db_guard.sql` | 미래 회차 쓰기 금지(SS009) · 학부모 공유 신규 발급 잠금(PT004). **스테이징에는 이미 적용돼 있다** |
| 18 | `20261012090000_d3_lead_notification_outbox.sql` | **위 결함 수정본.** 상담 알림 대기열 |
| 19 | `20261012091000_c3_portal_expiry_rate_limit.sql` | 포털 만료·빈도 제한 |
| 20 | `20261012092000_b2_lesson_assets.sql` | 수업 자료 표 |
| 21 | `20261012093000_c3b_portal_access_policy.sql` | 포털 접근 정책 |
| 22 | `20261012094000_d3b_lead_notification_delivery.sql` | 알림 발송 기록 |
| 23 | `20261012095000_c2b_period_report_compose.sql` | 기간 리포트 구성 |
| 24 | `20261012096000_b2b_lesson_asset_predownload.sql` | 자료 사전 다운로드 |
| 25 | `20261014090000_e1_lesson_content_structure.sql` | `lesson_sections.body_json` 열 추가 (nullable) + 콘텐츠 6표 신설 |
| 26 | `20261014091000_e2_lesson_publish_gate.sql` | 체크섬·발행 게이트 함수 |
| 27 | `20261014092000_e3_publish_lock_and_scope.sql` | 쓰기 잠금 · 장면 범위 제한 |
| 28 | `20261014093000_e4_lesson_section_scope.sql` | **본문·활동 읽기 범위 제한** (아래 4-2) |
| — | `supabase/content/tap24_2026_1_load.sql` | migration 이 아니다. 콘텐츠 적재 (멱등) |

#### 적용 뒤 상태 전환

```
1) #22 ~ #49 적용
2) supabase/content/tap24_2026_1_load.sql 적재  (호출자가 begin/commit)
3) Preview 환경에서 CONTENT_SOURCE=database 로 확인
     · 교사 주차 화면이 DB 본문으로 뜨는가
     · 계약 범위 밖 주차가 안 보이는가 (8주 계약 기관에서 24주)
     · 본사 검수 목록 배너가 「데이터베이스 적재본」으로 바뀌는가
     · 교실 화면 장면이 권한 RPC 로 뜨는가
4) 본사 검수 → 발행
5) 운영에 CONTENT_SOURCE=database 반영
```

적재는 `product_versions` 행이 없으면 상품 연결만 건너뛰고 나머지를 적재한다
(`if found then` 으로 감쌌다). 그러나 #26 없이 적재하면 **상품 ↔ 프로그램
연결이 비어** 교사 경로가 교안을 찾지 못한다.

### 2-3. 백업

적용 전에 **되돌릴 수 있는 지점**을 만든다. E1~E4 는 되돌리기 스크립트가
있지만, #22~#45 는 **앞으로만 가는 변경**이다(표 신설·정책 교체). 이 구간을
되돌리는 길은 복원뿐이다.

```
1) Supabase 대시보드에서 적용 직전 백업 시각을 확인한다
     Database → Backups. Point-in-Time Recovery 가 켜져 있으면 분 단위로 되돌린다.
2) 논리 백업을 따로 뜬다 (PITR 과 별개로, 사람이 들고 있을 사본)
     pg_dump --no-owner --no-privileges -Fc > tap3_pre_e_stage.dump
   ★ 이 파일에는 원아·관찰 기록이 들어간다. 암호화된 보관소에만 둔다.
     저장소·대화·로그에 올리지 않는다.
3) 적용 전 행 수를 기록한다 (복원 뒤 대조 기준)
     organizations · classes · children · class_sessions ·
     class_session_observations · child_growth_reports · lead_submissions
```

### 2-4. 복구

| 어디까지 갔나 | 복구 방법 |
|---|---|
| E4 만 되돌린다 | `supabase/cutover/E4_lesson_section_scope_rollback.sql` |
| E 단계 전체를 되돌린다 | E4 → E3 → E2 → E1 순서로 rollback 실행. **먼저 `CONTENT_SOURCE` 를 `fixture` 로 내린다** |
| 적재만 되돌린다 | 프로그램 `SOYE-TAP24-2026.1` 의 차시를 지운다. 단 발행된 차시는 거부된다 — 먼저 초안으로 내린다 |
| #22~#45 구간까지 되돌린다 | **스크립트가 없다.** PITR 로 적용 직전으로 복원하거나 논리 백업을 복원한다 |

E 단계 rollback 을 돌리면 다시 열리는 것:

- **E4**: 계약 주차 범위 밖 본문·활동이 활성 기관 구성원 누구에게나 읽힌다
- **E3**: 발행 우회(`status` 직접 UPDATE) · 게시본 장면 수정 · 범위 밖 장면 열람
- **E2**: 미해결 기록·체크섬 확인 없이 발행
- **E1**: `body_json` 이 사라진다 → 구조가 날아간다 (평문 `body` 만 남는다)

되돌리기 전에 발행 기능을 먼저 내린다.

---

## 3. 실행한 검증

### 3-1. 코드 테스트 — 90건 통과 (실행함)

```
node --import ./tests/register-hooks.mjs --test "tests/**/*.test.mjs"
→ tests 90 · pass 90 · fail 0
```

새로 더한 것: `tests/week-version-consistency.test.mjs` 9건 —
교사 화면·인쇄물·교실 화면이 **같은 차시 id** 에 도달하는지, 본사 검수가
프로그램을 코드로 명시하는지, 교직원 장면이 권한 RPC 로만 읽히는지,
DB 실패를 fixture 로 대체하지 않는지.

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 |
| `npx eslint .` | 통과 (경고 0) |
| `npm run build` | 통과 |

### 3-2. SQL 실행 검증 — 격리 Postgres에서 실제로 돌림 (실행함)

**pgTAP 이 아니라 JS 기반 SQL 실행 검증이다.** 실제 PostgreSQL 에 migration 을
올리고 실제 질의를 보낸다. 「미실행」이 아니다.

```
npm run verify:db          → 57/57 통과   (빈 DB 에 49건 적용 + 적재 + 재적재)
npm run verify:db:upgrade  → 61/61 통과   (#1~#21 + 업무 데이터 → #22~#49 적용)
```

#### `verify:db` — 빈 DB 전체 적용 (57건)

- migration 49건 적용 · 재적용
- 기존 STARTER 2026.1 적재 보존 (136 섹션, `body_json` null)
- 24차시 · 408섹션 · 240장면 · 168검수기록 · 3본사결정
- 재적재 멱등 — 중복 없음, `updated_at` 불변, 사람이 바꾼 상태 보존
- 발행 게이트 — 미해결·오래된 체크섬·권한 없는 발행 거부
- `status` 직접 UPDATE 로 발행 우회 거부
- 두 세션 동시 수정+발행 (B 가 A 의 잠금을 기다린 뒤 거부됨)
- 게시 후 본문·장면 수정·삭제·재발행 거부
- 범위 제한 — 아래 3-3

#### `verify:db:upgrade` — 기존 DB 업그레이드 (61건)

#1~#21 을 올린 뒤 **가상 업무 데이터**(기관 2 · 구성원 3 · 반 2 · 원아 3 ·
수업 2 · 출결 4 · 관찰 2 · 성장 리포트 1 · 공유 1 · 상담 문의 1)를 심고,
그 위에 #22~#49 를 적용한다.

- 열두 표의 행 수가 그대로 (2→2, 4→4 …)
- 관찰기록·리포트 **본문 문자열**이 그대로
- `updated_at` 이 바뀌지 않음 — migration 이 일괄 UPDATE 를 돌리지 않았다
- 복합 FK 여섯 갈래 모두 끊긴 참조 0건
- 교사·원장의 구성원 판정이 적용 뒤에도 `true`
- 업무 조회 여덟 갈래가 적용 전/후 같은 행 수 (끊긴 것 없음)
- 다른 기관 교사는 적용 전·후 모두 0행
- 계약 없는 기존 기관에 새 콘텐츠 본문은 0행
- 계약 없는 기관의 이용권 조회가 `service_mode: no_contract` 로 **오류 없이** 답함

> 기록해 둘 것: `curriculum_lessons` **메타**(제목·주차)는 #20 부터 활성 기관
> 구성원 누구에게나 열려 있다 — 공용 교육과정이고 적용 전에도 그랬다.
> 막아야 하는 것은 **본문**이며 그것은 E4 가 막는다.

### 3-3. 권한 검증 보완 (이번에 고친 것)

#### 오류를 성공으로 바꾸던 판정

검증 스크립트에 `catch(() => 0)` 가 여섯 군데 있었다. 이것은 **모든** 조회
오류를 「0행 성공」으로 바꾼다 — 표가 없어도, SQL 이 틀려도, 함수가 없어도
통과한다. 검증이 아무것도 보지 않는 상태였다.

→ `expectNoRows()` 로 바꿨다.

```
통과:  조회가 되고 0행  ·  권한 오류(42501 · RLS)로 거부
실패:  1행이라도 나옴  ·  그 밖의 오류(표 없음 · 문법 오류 · 함수 없음)
```

#### 본문 직접 조회 (E4 가 막는 것)

E3 은 `lesson_scenes` 를 막았지만 **본문은 그대로였다.** M1 정책이

```
is_hq_admin  or  (is_active_org_member and is_published_lesson(lesson_id))
```

이어서 「활성 기관 구성원이고 게시된 차시면」 **어느 차시든** 읽혔다.
8주 계약 기관의 교사가 `lesson_sections` 를 직접 조회해 24주차 본문을 가져갈
수 있었다. 본문이 장면보다 담는 내용이 많으므로 더 큰 구멍이다.

`20261014093000_e4_lesson_section_scope.sql` 가 `private.member_lesson_entitled()`
(배정된 활성 반 + 계약 주차 범위)를 더해 두 정책에 조건을 건다 —
`lesson_sections` 와 `lesson_activities`.

실제로 거부되는 것을 확인한 항목:

| 누가 | 무엇을 | 결과 |
|---|---|---|
| 8주 계약 담당 교사 | 24주 `body` · `body_json` | 0행 |
| 8주 계약 담당 교사 | 24주 `lesson_activities` | 0행 |
| 8주 계약 담당 교사 | 24주 장면 직접 조회 | 0행 |
| 8주 계약 담당 교사 | **1주 본문** (범위 안) | 17섹션 — 열려야 한다 |
| 다른 기관 교사 | 1주 본문 | 0행 |
| 다른 기관 교사 | 반 장면 RPC | 거부 (오류) |
| 같은 기관 · 담당 외 반 | 반 장면 RPC | 거부 (오류) |
| 같은 기관 · 담당 외 반 | 24주 본문 | 0행 |
| **만료된 계약**의 담당 교사 | 1주 본문 · 활동 | 0행 |
| **만료된 계약**의 담당 교사 | 반 장면 RPC | 거부 (오류) |
| 소속 없는 사용자 | 본문 · 장면 · 검수기록 · 본사결정 · 원문출처 | 0행 |

#### 교안 버전 일치

계약이 가리키는 교안(`contracts → product_versions → product_version_programs`)과
반 배정 교안(`class_program_assignments.program_id`)이 같은 id 인지 SQL 로 확인한다.
다르면 교사 화면과 교실 화면이 서로 다른 교안을 띄우게 된다.

### 3-4. 미실행으로 남은 것

| 검사 | 상태 | 이유 |
|---|---|---|
| `supabase/tests/p0_phase_e_lesson_content.test.sql` (pgTAP) | **미실행** | Supabase CLI · Docker 가 이 환경에 없다. 파일은 작성돼 있고, CLI 가 있는 환경에서 `supabase test db` 로 돌린다 |
| 원격(`vpppxuhodwauaclhybtg`) 실제 적용 | **미실행** | 이번 작업 범위 밖 |
| 브라우저에서 `CONTENT_SOURCE=database` 수동 확인 | **미실행** | 원격에 표가 없어 Preview 에서도 DB 모드를 켤 수 없다 |

> pgTAP 미실행은 위 3-2 의 JS 기반 SQL 실행 검증과 **별개**다.
> 3-2 는 실제 PostgreSQL 에서 돌렸다.

---

## 4. 화면 연결 상태

`CONTENT_SOURCE` 환경변수가 출처를 정한다. **기본값은 `fixture`** 다 —
부르는 쪽이 깜빡하면 지금 동작하는 쪽으로 떨어진다. 서버에서만 읽는다.

| 경로 | DB 연결 | 어떻게 읽나 |
|---|---|---|
| `/teacher/weeks/[weekNo]` | **완료** | `loadWeekContent()` · 계약 → 상품 버전 → 프로그램. 장면은 `loadStaffScenes()` → 권한 RPC |
| `/teacher/weeks/[weekNo]/quick-guide` | **완료** | 교사 화면과 **같은 호출**. 같은 계약·같은 교안 버전 |
| `/class/[sessionId]` (교실 화면) | **완료** | 회차 행의 `program_id`·`lesson_id` → 본문. 장면은 `list_lesson_scenes_for_class` RPC |
| `/admin/curriculum/weeks` (24주 목록) | **완료** | `loadWeekRollupForReview()` · 네 질의로 24주. 출처 배너 표시 |
| `/admin/curriculum/weeks/[weekNo]` | **완료** | 본문 fixture + DB 적재 상태 배너 (원문 대조 화면이라 fixture 가 기준) |
| `/admin/.../[weekNo]/preview` (교실 화면 검수) | **완료** | `loadWeekContentForReview()` · 프로그램 코드 명시 |
| `/admin/.../[weekNo]/quick-guide` (인쇄 검수본) | **완료** | `loadWeekContentForReview()` · 프로그램 코드 명시 |
| `/curriculum` · `/sample` (공개) | 해당 없음 | 본문을 내보내지 않는다 |

### 4-1. 조용한 대체를 하지 않는다

`database` 모드에서 조회가 실패하면 fixture 로 넘어가지 않는다. 각 화면이
**이유를 적고 멈춘다.**

- 교사 주차 화면 — 「수업 내용을 열지 못했습니다 + 이유」
- 퀵 가이드 — 인쇄본을 만들지 않는다 (종이로 나가면 회수할 수 없다)
- 교실 화면 — 「교실 화면을 열지 못했습니다」와 「장면이 아직 없습니다」를 **구분해서** 적는다.
  교사가 할 일이 다르다 (전자는 담당자에게 알린다, 후자는 인쇄물로 진행한다)
- 본사 목록 — 디코드가 깨진 주차를 빨간 칸에 따로 적는다. 비어 보이는 것과 깨진 것은 다르다

### 4-2. 교직원 장면은 표를 직접 읽지 않는다

E3 이후 `lesson_scenes` 직접 조회는 본사만 된다. 교직원 경로는
`public.list_lesson_scenes_for_class(class_id, lesson_id)` 로만 읽고, DB 가
「담당 반인가 · 기관이 맞는가 · 계약 주차 범위인가 · 발행됐는가」를 판정한다.

주차 화면은 반을 받지 않으므로 `loadStaffScenes()` 가 **배정된 담당 반을 찾아**
묻는다. 담당 반이 없으면 장면을 열지 않는다 — 그것이 맞는 동작이다.

RPC 는 교실 화면에 필요한 것만 돌려주므로 **원문 출처(`source_ref`)가 들어오지
않는다.** `WeekScene.sourceRef` 를 nullable 로 바꾸고 화면은 있을 때만 적는다.
없는 것을 지어내지 않는다.

---

## 5. DB 검증 CI

`.github/workflows/db-validation.yml`

- `push` 대상에 `feat/platform-finish-20261012` 추가
- `paths` 에 **워크플로 파일 자신**을 포함 — 빼면 CI 수정이 검증되지 않는다
- `postgres:17-alpine` 서비스 컨테이너에서 실행. 운영 DB 를 쓰지 않으며,
  검증 스크립트는 `DATABASE_URL` 이 Supabase 호스트면 시작하지 않는다
- 단계: 적재 SQL 드리프트 확인 → `verify:db` → `verify:db:upgrade`

### 실제 실행 기록

| 커밋 | 결과 | 로그 |
|---|---|---|
| `aa4b96f` (CI 설정 변경) | success | https://github.com/SOYESKIDS/teachable-art-play3/actions/runs/38497643444 |
| `76ca4e3` (이번 보완분) | **success** | https://github.com/SOYESKIDS/teachable-art-play3/actions/runs/38500486313 |

`76ca4e3` 실행 로그에서 확인한 것 (GitHub 러너의 `postgres:17-alpine`):

```
7_E단계 SQL 실행 검증     PASS  migration 49건 적용 … 결과: 57/57 통과
8_기존 DB 업그레이드 검증  PASS  선행 migration 21건 적용
                          PASS  적용 전 교사가 자기 기관 데이터를 본다 (기준선)
                          PASS  후속 migration 28건이 데이터가 있는 DB 에 적용된다
                          결과: 61/61 통과
```

> **Vercel 배포 성공을 DB CI 성공으로 쓰지 않는다.** 둘은 다른 것을 본다.
> Vercel 은 빌드가 되는지 보고, DB CI 는 migration 과 권한이 실제로 도는지 본다.
