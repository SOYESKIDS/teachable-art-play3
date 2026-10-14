# 스테이징 수업 흐름 검증 — 확정 기준과 남은 작업

대상 흐름: **수업 준비 → 교실 화면 → 관찰 기록 → 결과보고**
작성 2026-10-14 · 갱신 2026-10-14 (스테이징 재개 후 읽기 전용 점검 반영)
기준 커밋 `482f30f` + 이번 보완분

---

## 0. 확정된 사실 (2026-10-14 읽기 전용 점검)

| 대상 | 상태 | 비고 |
|---|---|---|
| Staging `itcddooiuqsqingfhxkk` | **ACTIVE_HEALTHY** (restore 후) | 조직 plan=pro |
| Staging migration 이력 | **39건** | `…p10c_release_controls` + `uat_db_guard` |
| Production `vpppxuhodwauaclhybtg` | ACTIVE_HEALTHY · **21건** | 변경 없음 |

> 이전 문서가 「스테이징 38건」이라고 적었던 것은 **39건**으로 정정한다.
> 39번째는 저장소 문서에서 세던 번호의 #39(`d3_lead_notification_outbox`)가
> **아니라** `20261002110000_uat_db_guard` 다. 번호로 세면 어긋나므로
> 이 문서는 이제 **version·파일명**으로만 적는다.

### 점검이 말하지 않는 것

- SQL 조회는 **관리 연결의 읽기 확인**이다. 사용자 역할의 RLS 실검증이나
  브라우저 UAT 완료를 뜻하지 않는다.
- 표·함수가 **존재한다**는 것은 사용자 계정으로 **실행에 성공한다**는 뜻이 아니다.
- 출시 스위치가 모두 false 라는 것만으로 모든 업무가 닫힌다고 단정하지 않는다 (4절).

---

## 1. 스테이징에 남아 있는 것

| 항목 | 값 |
|---|---|
| 활성 UAT 기관 / 반 | 1 / 1 |
| 담임 배정 / 활성 teacher 구성원 | 1 / 1 |
| 합성 원아 | 3 |
| 계약 | active · 2026-08-29~2026-11-27 · 확인일 기준 유효 |
| 상품 버전 | starter 2026.1 · published · 1~8주 |
| 상품 기능 | class_mode · parent_portal · weekly_report |
| 현재 배정 | SOYE-STARTER-2026.1 · active |
| STARTER 발행 차시 / 섹션 | 8 / 136 (주차마다 17, 필수 11/11) |
| UAT 회차 | W1~W8 전부 `scheduled` |
| 해당 반 관찰 / reports | 0 / 0 |
| 다른 프로그램 STAGING-P8 | published 8차시 · 88섹션 |

회차 날짜: W1 10-01 · W2 10-05 · W3 10-12 · W4 10-19 · W5 10-26 ·
W6 11-02 · W7 11-09 · W8 11-16 → 확인일 기준 **과거·현재 3건 · 미래 5건**.

### 미래 회차·학부모 공유 가드 (`uat_db_guard`)

- 미래 회차에는 시작·완료·준비 확인·출결·관찰·Growth5·메모·사진 metadata·
  AI 초안 쓰기를 거부한다 (**SS009**). 트리거 10개 활성.
- Storage 업로드 helper 에도 같은 조건이 있다.
- 학부모 공유 **신규 발급**은 `parent_portal` 출시 전까지 거부한다 (**PT004**).

> ★ 미래 회차를 열려고 날짜를 바꾸거나 트리거를 끄지 않는다.
>   시험하려면 **지난 회차**를 쓴다.

---

## 2. 저장소와 원격의 차이 — `uat_db_guard`

원격에 적용된 `20261002110000_uat_db_guard` 가 **이 개발 브랜치에 없었다.**

- 저장소 전체를 찾아보니 `origin/design-final-polish` 의 커밋 `a8f0250`
  (2026-10-06) 에 있었다. 그 커밋 메시지는 「NOT applied to Staging or
  Production」이지만, 이후 스테이징에 적용된 것으로 보인다.
- **이력을 지우거나 `migration repair` 로 감추지 않았다.** 대신 그 version 의
  파일을 이 브랜치로 가져와 저장소와 원격이 version 기준으로 맞게 했다.

가져온 것 (`a8f0250` 내용 그대로):

```
supabase/migrations/20261002110000_uat_db_guard.sql
supabase/rollback/20261002110000_uat_db_guard_rollback.sql
supabase/tests/p0_uat_db_guard.test.sql
supabase/validation/staging_e2e/sql/uat_db_guard_post_apply_verify.sql
docs/11-production-readiness/uat-db-guard.md
```

가져오지 **않은** 것과 이유:

| 파일 | 왜 |
|---|---|
| `src/lib/staff/session-write-guard.ts` | 이 브랜치에 **원래 없던 앱 코드**다. `design-final-polish` 쪽 작업 줄기에서 왔다. 적용된 migration 을 반영하는 일과 다른 브랜치의 앱 기능을 들여오는 일은 다르다 |
| `docs/11-production-readiness/uat-stabilization.md` | 같은 이유 |
| `p0_hardening` · `p0_phase08_security` · `M5_post_cutover` 수정분 | 위 앱 코드와 묶여 있어 떼어내면 기대값이 어긋난다. pgTAP 은 이 환경에서 실행하지 않으므로 **미반영으로 남기고 여기 적는다** |

### 남은 대조

`20261002110000` 외의 remote-only version 이 더 있는지는 **확인하지 못했다**
(원격 이력 39건의 전체 version 목록을 받지 못했다). 받는 즉시
`supabase migration list --linked` 의 remote 열과 저장소 파일명을 version 으로
대조한다. 건수·순번으로 맞추지 않는다.

---

## 3. 스테이징에 올릴 목록 (version 기준)

기준선 = `20261002110000_uat_db_guard` 까지. 그 위에 **11건**.

```
20261012090000_d3_lead_notification_outbox.sql      CHECK 서브쿼리 결함 수정본
20261012091000_c3_portal_expiry_rate_limit.sql      보호자 포털 만료·빈도 제한
20261012092000_b2_lesson_assets.sql                 수업 자료
20261012093000_c3b_portal_access_policy.sql         포털 접근 정책
20261012094000_d3b_lead_notification_delivery.sql   알림 발송 기록
20261012095000_c2b_period_report_compose.sql        월간·학기 리포트
20261012096000_b2b_lesson_asset_predownload.sql     자료 사전 내려받기
20261014090000_e1_lesson_content_structure.sql      body_json + 콘텐츠 6표
20261014091000_e2_lesson_publish_gate.sql           체크섬·발행 게이트
20261014092000_e3_publish_lock_and_scope.sql        쓰기 잠금·장면 범위
20261014093000_e4_lesson_section_scope.sql          본문·활동 읽기 범위
```

`supabase/content/tap24_2026_1_load.sql` 는 **migration 이 아니다.**
적재는 전부 draft 로 들어가고 자동 발행하지 않는다.

> ⚠️ `docs/e-stage-db-connection.md` 의 `#22~#49` 목록은 **운영(21건) 기준
> 계획**이다. 스테이징에는 쓰지 않는다 — 스테이징은 위 11건뿐이다.

### 검증 (실행함)

`npm run verify:db:staging` → **41/41 통과** (격리 Postgres · 원격 접속 없음).

- 기준선 39건이 올라가고, 그 시점에 신규 구조가 **없다**는 것까지 확인
  (점검 문서의 「아직 없는 신규 구조」와 같은 상태)
- 저장소의 「기준선 뒤 migration」이 위 11건과 **정확히 일치**
- 합성 UAT 모양(기관·반·담임·원아 3·계약·배정·회차 8·발행 8차시·136섹션·
  주차마다 필수 11)을 만든 뒤 11건 적용
- 적용 뒤 **전부 보존** · 회차 `updated_at` 불변 · 기존 평문 `body` 그대로 ·
  새로 생긴 `body_json` 은 기존 섹션에서 null
- **가드가 살아 있다**: 트리거 11→11, 미래 회차 준비 확인·출결이 SS009 로
  거부, 학부모 공유 신규 발급이 PT004 로 거부
- **과잉 차단하지 않는다**: 지난 회차에는 여전히 쓸 수 있다
- 업그레이드가 기능을 임의로 출시하지 않는다 (출시된 기능 0)
- TAP24 교안은 여전히 없다 (적재는 migration 이 아니므로 정상)

가드 검사는 **담당 교사로 가장한 세션**으로 한다. 관리 연결로 쓰면
`auth.uid()` 가 null 이라 기존 권한 검사(SS002)가 먼저 거부해 가드까지 닿지
못한다 — `trg_zz_*` 는 이름 순서상 맨 마지막에 돈다. 학부모 공유만은
`child_portals` 에 authenticated grant 가 없어(쓰기는 RPC 로만 한다) 관리
연결로 확인하되 `auth.uid()` 를 원장으로 둔다.

---

## 4. 기능 출시 스위치 — false 를 과대 해석하지 않는다

`platform_capabilities` 10개 전부 `is_released=false`
(`ai_assist`=AR-8 · `branding`=CO-8 · `parent_portal`=CO-12 · 나머지는 `blocked_by` 비어 있음).

그렇다고 모든 업무가 닫히는 것은 **아니다.**

| 판정 함수 | `capability_released` 를 보나 |
|---|---|
| `private.class_write_allowed` | **아니다** — 반 이용권과 기관 서비스 상태를 본다 |
| `private.class_has_feature` | **아니다** — 계약의 `product_version_features` 를 본다 |
| 학부모 공유 신규 발급 트리거 | **본다** (PT004) |
| 월간·학기 리포트 | **본다** (`c2b` 적용 후) |
| AI 보조 · 일괄 인쇄 | **본다** |

→ 각 화면·Server Action 의 실제 게이트를 코드에서 대조해 판정한다.
   이번 점검에서 스위치는 **바꾸지 않았다.**

---

## 5. 네 단계 현재 판정 (스테이징 39건 기준)

| 단계 | 판정 | 근거 · 막는 것 |
|---|---|---|
| 수업 준비 | 🟡 **지난 회차만** | 필요한 표·RPC 는 모두 있다. 미래 회차 5건은 SS009 로 막힌다 — 설계대로다. 수업 자료 패널은 `b2_lesson_assets` 미적용이라 비어 보인다 |
| 교실 화면 | 🟡 **fixture 로만** | `CONTENT_SOURCE` 기본값이 fixture. DB 장면은 `lesson_scenes`·`e3`·`e4` 가 없어 불가 |
| 관찰 기록 | 🟡 **지난 회차만** | 표·RPC 있음. 미래 회차는 SS009. AI 정리는 `ai_assist` 미출시로 닫힘 |
| 결과보고 (주간) | ✅ 구조상 가능 | `reports`·`report_revisions`·RPC 존재. **실행 성공은 미검증** |
| 결과보고 (월간·학기) | ❌ | `c2b_period_report_compose` 미적용 + 출시 스위치 false |
| 보호자 포털 | ❌ | `c3`·`c3b` 미적용 + PT004 + CO-12 |

> 「구조상 가능」은 표와 함수가 있다는 뜻이다. 사용자 계정 로그인·RLS·실제 수업
> 흐름은 아직 아무도 눌러 보지 않았다 (9절).

---

## 6. Preview 가 보는 Supabase — **여전히 미확인**

| 방법 | 결과 |
|---|---|
| Preview URL (HTML·정적 자산·이미지) | **전부 302 → vercel.com SSO** |
| 저장소의 Vercel 설정 | `vercel.json`·`.vercel` 없음 |
| Vercel CLI | 미설치 |
| `preview_probe.mjs` | 허용 alias 가 saas-v2 하나로 고정. 그 가드를 임의로 넓히지 않았다 |

> ★ **로컬 `.env.local` 로 추정하지 않는다.** 로컬이 운영을 본다는 사실은
>   Preview 가 무엇을 보는지와 별개다.
>   확인 전에는 Preview 로 **시험 데이터를 쓰지 않는다.**

확인하는 길:

```
① Vercel → Settings → Environment Variables → Preview 범위의
   NEXT_PUBLIC_SUPABASE_URL 의 <ref> 와, 아래 셋의 설정 여부를 본다
     SUPABASE_PRODUCTION_PROJECT_REF · SUPABASE_SECRET_KEY_PROJECT_REF ·
     BLOCK_WRITES_ON_PRODUCTION_DATA
② 로그인한 브라우저로 Preview 를 열고 Network 에서 *.supabase.co 호스트를 본다
③ 이 브랜치 alias 를 preview_probe 허용 목록에 **의도적으로** 추가해 돌린다 (코드 변경)
```

P09D-C2(스테이징 키 회전)는 **별개로 열려 있다.** 닫히기 전에는 직원에게
URL·계정을 배포하지 않는다.

---

## 7. 콘텐츠 출처를 배포로 가른다

`CONTENT_SOURCE` 는 **배포 하나에 값 하나**다. 한 배포에서 역할별로 나눌 수 없다.

| 배포 | 값 | 용도 |
|---|---|---|
| 업무 흐름 검증 (기존 Preview) | `fixture` (미설정 = 기본) | 수업 준비 → 교실 → 관찰 → 결과보고 |
| 본사 콘텐츠 검수 (분리된 브랜치) | `database` | 24주 적재본 대조 |

절차는 [write-guard-coverage.md §4](./write-guard-coverage.md) 에 있다
(Vercel **Branch 범위** 환경변수 또는 프로젝트 분리).

> ★ **지금 database 로 바꾸지 않는다.** `e1`~`e4` 가 스테이징에 없다.
> ★ TAP24 는 저장소 전사본이고 적재되면 전부 **draft** 다.
>   스테이징에 이미 **published** 로 있는 STARTER 와 혼동하지 않는다 —
>   업무 흐름 검증이 쓰는 것은 후자다.
> ★ 적재 뒤 draft 가 정식 교사·교실 경로에서 안 보이는 것은 **정상**이다.
>   화면을 열려고 임의 발행하거나 발행 게이트를 우회하지 않는다.
>   검수는 본사 경로(`/admin/curriculum/weeks/...`)에서 한다.

---

## 8. 적용 전 상태 대조표와 백업

### 8-1. 적용 직전에 기록할 값 (읽기 전용)

적용 뒤 같은 질의를 다시 돌려 **같은 값**인지 본다.

| # | 항목 | 2026-10-14 값 |
|---|---|---|
| 1 | migration 이력 건수 · 마지막 version | 39 · `20261002110000_uat_db_guard` |
| 2 | 활성 UAT 기관 / 반 / 담임 / 원아 | 1 / 1 / 1 / 3 |
| 3 | 계약 (상태 · 기간) | active · 2026-08-29~11-27 |
| 4 | 계약↔반 / 활성 배정 | 1 / 1 |
| 5 | STARTER 발행 차시 / 섹션 | 8 / 136 |
| 6 | 주차별 필수 섹션 | 11/11 (전체 17) |
| 7 | UAT 회차 상태 | W1~W8 전부 `scheduled` |
| 8 | 관찰 / reports | 0 / 0 |
| 9 | `is_released=true` 기능 수 | 0 |
| 10 | `trg_zz_*` 가드 트리거 수 | 11 |
| 11 | STAGING-P8 차시 / 섹션 | 8 / 88 |

### 8-2. 백업 — **아직 확정된 것이 없다**

| 항목 | 상태 |
|---|---|
| 조직 plan | pro (조회 확인) |
| 특정 백업 시점 | **미확인** |
| PITR 제공 여부 | **미확인** — Pro 전환만으로 확정됐다고 쓰지 않는다 |
| 논리 백업(`pg_dump`) 보유 | **없음** |

> ★ 유료 부가 기능(PITR 등)을 **사용자 승인 없이 켜지 않는다.**

적용 전에 사람이 확인·결정할 것:

```
1) Supabase → Database → Backups 에서 **실제 백업 목록과 시점**을 본다
   (목록이 비어 있으면 복원 지점이 없다는 뜻이다)
2) PITR 이 필요한지, 비용을 쓸지 결정한다 — 켜는 것은 사용자 승인 사항
3) 논리 백업을 뜬다
     pg_dump --no-owner --no-privileges -Fc > staging_pre_upgrade.dump
   ★ 합성 자료뿐이라도 암호화된 보관소에만 둔다. 저장소·대화·로그에 올리지 않는다
4) 8-1 표의 11개 값을 적어 둔다
```

### 8-3. 읽기 전용 확인 질의

```sql
-- 1 이력
select version from supabase_migrations.schema_migrations order by version;
-- 2~4 기관·반·담임·원아·계약·배정
select (select count(*) from public.organizations where status='active') orgs,
       (select count(*) from public.classes where status='active') classes,
       (select count(*) from public.class_teachers) teachers,
       (select count(*) from public.children where status='active') children,
       (select count(*) from public.contracts where status='active') contracts,
       (select count(*) from public.class_program_assignments where status='active') assignments;
-- 5~6 발행 차시·섹션
select p.code, count(distinct l.id) lessons, count(s.id) sections
  from public.curriculum_programs p
  join public.curriculum_lessons l on l.program_id = p.id and l.status='published'
  left join public.lesson_sections s on s.lesson_id = l.id
 group by p.code;
-- 7 회차
select status, count(*) from public.class_sessions group by status;
-- 9 출시 스위치
select code, is_released, blocked_by from public.platform_capabilities order by code;
-- 10 가드 트리거
select tgname from pg_trigger where not tgisinternal and tgname like 'trg_zz_%' order by 1;
```

### 8-4. 복구

| 어디까지 갔나 | 복구 |
|---|---|
| `e1`~`e4` 만 | `supabase/cutover/E4…` → `E3…` → `E2…` → `E1…` rollback |
| `uat_db_guard` 만 | `supabase/rollback/20261002110000_uat_db_guard_rollback.sql` |
| `c3` · `b2` · `c2b` 등 | **rollback 스크립트가 없다.** 백업 복원뿐 |
| 적재만 | 프로그램 `SOYE-TAP24-2026.1` 차시 삭제 (발행본은 먼저 draft 로) |

---

## 9. 이번에 실행한 검사 / 실행하지 않은 검사

### 실행함

| 검사 | 결과 |
|---|---|
| `npm run verify:db` (빈 DB 전체 적용) | 57/57 |
| `npm run verify:db:upgrade` (#1~#21 + 업무 데이터) | 61/61 |
| **`npm run verify:db:staging`** (스테이징 실제 기준 + 합성 UAT) | **41/41** |

### 실행하지 않음

| 항목 | 이유 |
|---|---|
| 원격 migration 적용 · 키 회전 · 기능 출시 · 계약 변경 · 발행 | 범위 밖 |
| pgTAP (`p0_uat_db_guard` 포함) | Supabase CLI·Docker 없음 |
| 원격 이력 39건의 **전체 version 목록** 대조 | 목록을 받지 못했다 (2절) |
| Preview 환경변수 확인 | SSO (6절) |
| 사용자 계정 로그인·RLS·실제 수업 흐름·자료 접근·사진 업로드 | 환경·계정 없음 |
| 백업 시점·PITR 확인 | 대시보드 접근 필요 (8-2) |
| P09D-C2 키 회전 종료 여부 | 사용자 결정 |
