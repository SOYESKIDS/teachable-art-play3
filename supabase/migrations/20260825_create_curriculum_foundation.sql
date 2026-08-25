-- TeachAble Art Play — 수업 프로그램 / 차시 / 활동 + 반 배정 Foundation
--
-- PHASE SERVICE-05A 초안입니다. **아직 Supabase에 적용하지 않았습니다.**
-- 검토 후 `npx supabase db push`로 1회 적용하세요.
--
-- 전제: 아래 Migration이 이미 원격에 적용된 상태에서 이어서 적용합니다.
--   20260812_create_lead_submissions.sql
--   20260813_create_admin_access.sql              (private.is_soyes_admin())
--   20260814_create_admin_access_check.sql
--   20260815_create_organization_foundation.sql   (organizations / profiles / organization_members
--                                                  + private.set_updated_at()
--                                                  + is_org_member / has_org_role / is_director_of_user_org)
--   20260824_create_class_child_foundation.sql    (classes / children / class_teachers
--                                                  + private.is_class_teacher / owns_org_membership)
-- 위 다섯 파일은 전혀 수정하지 않았고, 여기서도 건드리지 않습니다.
--
-- ※ 파일명이 20260825인 이유
--   Supabase CLI는 파일명 앞 숫자를 migration version으로 읽는다.
--   20260824는 class_child_foundation이 이미 쓰고 있어 같은 날짜를 다시 쓰면
--   version이 충돌한다. 그래서 다음 번호를 사용한다.
--
-- ─────────────────────────────────────────────────────────
-- 이 Migration의 핵심 설계 판단
--
--   1. 교육 콘텐츠(프로그램/차시/활동)는 SOYESKIDS가 만들어 여러 기관이 함께 쓰는
--      **공용 자산**이다. 따라서 organization_id를 두지 않는다.
--      "어느 기관의 어느 반이 이 프로그램을 쓰는가"만 기관 데이터이므로
--      class_program_assignments 한 곳에 격리한다.
--
--   2. 콘텐츠는 지우지 않는다. 이미 수업에 쓰인 프로그램을 삭제하면
--      나중에 붙을 수업 실행/관찰기록/리포트가 전부 고아가 된다.
--      네 테이블 모두 DELETE GRANT와 DELETE Policy를 만들지 않는다.
--
--   3. "콘텐츠 관리"와 "실제 운영 배정"을 분리한다.
--      draft 프로그램은 만들고 다듬을 수 있지만, 실제 반에는 붙지 않는다.
--      (아래 12번 INSERT Policy에서 published만 통과시킨다.)
--
--   4. 개인정보를 담지 않는다. child_id / teacher_id / 사진 / 음성 / 관찰 notes 없음.
--      이번 단계는 "콘텐츠 구조 + 반 배정"까지다.
-- ─────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create schema if not exists private;
grant usage on schema private to authenticated;


-- =========================================================
-- 1. public.curriculum_programs — 교육 프로그램 마스터
-- =========================================================
-- 가격/결제 정보는 넣지 않는다.
-- 홈페이지의 8주·16주·24주 "상품 패키지"와 교육 커리큘럼은 수명주기가 달라
-- 한 테이블에 섞으면 둘 다 바꾸기 어려워진다.

create table if not exists public.curriculum_programs (

  id uuid primary key default gen_random_uuid(),

  -- 운영자가 눈으로 식별하는 내부 코드. 예) TAP-STARTER-08
  code text not null
    constraint curriculum_programs_code_check
    check (char_length(btrim(code)) between 1 and 50),

  title text not null
    constraint curriculum_programs_title_check
    check (char_length(btrim(title)) between 1 and 100),

  summary text
    constraint curriculum_programs_summary_check
    check (summary is null or char_length(summary) <= 500),

  -- 권장 연령이다. classes.age_group과 DB 수준으로 강제 연결하지 않는다.
  -- mixed 프로그램을 age5 반에서 쓰는 운영이 실제로 존재한다.
  -- 연령 불일치 안내는 향후 Admin UI의 경고로 처리한다.
  age_group text
    constraint curriculum_programs_age_group_check
    check (
      age_group is null
      or age_group in ('age3', 'age4', 'age5', 'mixed')
    ),

  duration_weeks integer not null
    constraint curriculum_programs_duration_weeks_check
    check (duration_weeks between 1 and 52),

  -- draft   : 제작 중. 기관에 보이지 않고 반에도 배정할 수 없다.
  -- published: 공개. 기관이 조회하고 반에 배정할 수 있다.
  -- archived : 운영 종료. 기존 배정은 유지되지만 신규 조회/배정 대상이 아니다.
  status text not null default 'draft'
    constraint curriculum_programs_status_check
    check (status in ('draft', 'published', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 코드는 운영 식별자라 전 프로그램에서 유일해야 한다.
  constraint curriculum_programs_code_key unique (code)
);


-- 기관 사용자는 "published 목록"만 반복 조회한다.
create index if not exists curriculum_programs_status_idx
on public.curriculum_programs (status);


drop trigger if exists trg_curriculum_programs_updated_at
on public.curriculum_programs;

-- 20260815의 공통 함수를 그대로 재사용한다. 중복 함수를 만들지 않는다.
create trigger trg_curriculum_programs_updated_at
before update on public.curriculum_programs
for each row
execute function private.set_updated_at();


-- =========================================================
-- 2. public.curriculum_lessons — 주차 / 차시
-- =========================================================

create table if not exists public.curriculum_lessons (

  id uuid primary key default gen_random_uuid(),

  -- 차시가 남아 있는 프로그램은 실수로도 지워지지 않게 restrict
  program_id uuid not null
    references public.curriculum_programs (id) on delete restrict,

  week_no integer not null
    constraint curriculum_lessons_week_no_check
    check (week_no between 1 and 52),

  -- 한 주에 2회 수업하는 운영이 있어 차시 번호를 따로 둔다.
  session_no integer not null
    constraint curriculum_lessons_session_no_check
    check (session_no between 1 and 10),

  title text not null
    constraint curriculum_lessons_title_check
    check (char_length(btrim(title)) between 1 and 150),

  objective text
    constraint curriculum_lessons_objective_check
    check (objective is null or char_length(objective) <= 1000),

  duration_minutes integer
    constraint curriculum_lessons_duration_minutes_check
    check (duration_minutes is null or duration_minutes between 1 and 300),

  status text not null default 'draft'
    constraint curriculum_lessons_status_check
    check (status in ('draft', 'published', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 같은 프로그램 안에서 같은 주차·차시 번호가 두 번 나오지 않는다.
  -- 이 UNIQUE가 만드는 index가 program_id 선행 조회(프로그램의 전체 차시 목록)도 커버하므로
  -- program_id 단독 index는 따로 만들지 않는다.
  constraint curriculum_lessons_program_week_session_key
    unique (program_id, week_no, session_no)
);


drop trigger if exists trg_curriculum_lessons_updated_at
on public.curriculum_lessons;

create trigger trg_curriculum_lessons_updated_at
before update on public.curriculum_lessons
for each row
execute function private.set_updated_at();


-- ※ week_no가 program.duration_weeks를 넘는지는 DB에서 막지 않는다.
--   CHECK constraint는 다른 테이블 컬럼을 참조할 수 없고, 이걸 강제하려면
--   lessons INSERT/UPDATE와 programs.duration_weeks UPDATE 양쪽에 trigger가 필요하다
--   (duration_weeks를 8→4로 줄이는 순간 기존 차시가 위반이 된다).
--   그 복잡도에 비해 얻는 것이 적어 이번 단계에서는 두지 않고,
--   "8주 프로그램에 9주차" 같은 입력은 Admin Server Action(SERVICE-05B)에서 검증한다.


-- =========================================================
-- 3. public.lesson_activities — 차시 안의 활동 단위
-- =========================================================
-- 도입 / 워밍업 / 창의활동 / 미술표현 / 정리 처럼 한 차시를 구성하는 순서 단위다.
--
-- ★ 이번 단계에서 JSONB 대형 구조를 만들지 않는다.
--   AI prompt / 영상 URL / 파일 URL / 썸네일 / 음원 / 워크시트 / 교사 notes는
--   실제 콘텐츠 운영 요구가 확인된 뒤 각각 목적에 맞는 컬럼이나 테이블로 확장한다.
--   지금 JSONB로 열어두면 스키마 없는 데이터가 쌓여 나중에 정리할 수 없게 된다.

create table if not exists public.lesson_activities (

  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  -- 화면은 이 번호 오름차순으로 정렬한다.
  sequence_no integer not null
    constraint lesson_activities_sequence_no_check
    check (sequence_no between 1 and 100),

  title text not null
    constraint lesson_activities_title_check
    check (char_length(btrim(title)) between 1 and 150),

  activity_type text not null default 'activity'
    constraint lesson_activities_activity_type_check
    check (
      activity_type in (
        'intro',
        'warmup',
        'activity',
        'creative',
        'reflection',
        'closing'
      )
    ),

  description text
    constraint lesson_activities_description_check
    check (description is null or char_length(description) <= 3000),

  duration_minutes integer
    constraint lesson_activities_duration_minutes_check
    check (duration_minutes is null or duration_minutes between 1 and 180),

  materials text
    constraint lesson_activities_materials_check
    check (materials is null or char_length(materials) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 같은 차시 안에서 순서 번호가 겹치지 않는다.
  -- 이 UNIQUE가 lesson_id 선행 조회(차시의 활동 목록)도 커버한다.
  constraint lesson_activities_lesson_sequence_key
    unique (lesson_id, sequence_no)
);


drop trigger if exists trg_lesson_activities_updated_at
on public.lesson_activities;

create trigger trg_lesson_activities_updated_at
before update on public.lesson_activities
for each row
execute function private.set_updated_at();


-- =========================================================
-- 4. public.class_program_assignments — 반 ↔ 프로그램 배정
-- =========================================================
-- 여기서부터 기관 데이터다. 위 세 테이블(공용 콘텐츠)과 성격이 다르다.
--
-- organization_id는 정규화 관점에서는 classes에서 유도할 수 있지만 의도적으로 둔다.
-- 이 컬럼이 있어야 (class_id, organization_id) 복합 FK로 기관 불일치를 구조적으로 막고,
-- 원장 조회 RLS도 join 없이 organization_id 하나로 판정할 수 있다.
-- (20260824의 class_teachers와 동일한 판단이다.)

create table if not exists public.class_program_assignments (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations (id) on delete restrict,

  class_id uuid not null,

  program_id uuid not null
    references public.curriculum_programs (id) on delete restrict,

  -- 운영 시작일. 배정 시점에 아직 안 정해졌을 수 있어 nullable이다.
  start_date date,

  -- active    : 운영 중
  -- completed : 정상 종료
  -- cancelled : 중도 취소
  status text not null default 'active'
    constraint class_program_assignments_status_check
    check (status in ('active', 'completed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ★ 기관 불일치 차단 — 반은 반드시 이 기관의 반이어야 한다.
  --   20260824에서 classes에 만들어 둔 UNIQUE(id, organization_id)를 참조한다.
  --   organization_id가 한 컬럼뿐이라 "A원 반 + B원 배정" 조합은 어떤 경로로도 INSERT되지 않는다.
  --   (RLS를 우회하는 service_role·직접 SQL·superuser도 위반할 수 없다.)
  constraint class_program_assignments_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict
);


-- 한 반에 같은 프로그램을 "동시에" 두 번 운영하지 않는다.
--
-- 단순 UNIQUE(class_id, program_id)로 막으면 다음 학년도에 같은 프로그램을
-- 다시 쓸 수 없게 된다. 그래서 status='active'인 행만 대상으로 하는 partial index를 쓴다.
--   - 진행 중 중복 배정  → 차단
--   - completed/cancelled 이력이 있는 프로그램을 다시 active로 배정 → 허용
create unique index if not exists class_program_assignments_active_class_program_key
on public.class_program_assignments (class_id, program_id)
where status = 'active';


-- 원장 화면: 우리 기관 배정 현황(상태 필터 포함)
create index if not exists class_program_assignments_organization_status_idx
on public.class_program_assignments (organization_id, status);

-- 반 상세: 이 반의 배정 이력 전체(active 외 상태 포함)
-- 위 partial unique index는 active 행만 담고 있어 이 경로를 대신할 수 없다.
create index if not exists class_program_assignments_class_id_idx
on public.class_program_assignments (class_id);

-- 콘텐츠 운영: 이 프로그램을 쓰는 반 찾기
create index if not exists class_program_assignments_program_id_idx
on public.class_program_assignments (program_id);


drop trigger if exists trg_class_program_assignments_updated_at
on public.class_program_assignments;

create trigger trg_class_program_assignments_updated_at
before update on public.class_program_assignments
for each row
execute function private.set_updated_at();


-- =========================================================
-- 5. 권한 Helper (private)
-- =========================================================
-- 기존 helper(is_soyes_admin / has_org_role / is_class_teacher / set_updated_at)를
-- 그대로 재사용하고, 이번 Phase에 없는 판정 4개만 추가한다.
--
-- 전부 SECURITY DEFINER인 이유는 20260815·20260824와 동일하다.
--   1. Policy 안에서 다른 테이블(curriculum_programs 등)을 읽어야 하는데,
--      일반 함수로 두면 그 테이블의 RLS가 다시 걸려 판정이 꼬이거나 재귀한다.
--   2. 콘텐츠 테이블 자체를 노출하지 않고 boolean만 돌려준다.
--
--   ★ 이 네 테이블에 `force row level security`를 절대 켜지 마라.
--     켜면 소유자도 RLS를 받게 되어 helper가 제 역할을 못 한다.
--     (기존 테이블에 대한 동일한 경고와 같은 이유다.)

-- (1) 나는 "활성" 기관의 활성 구성원인가? (역할 무관)
--
-- 공용 콘텐츠에는 organization_id가 없어 기존 is_org_member(org_id)를 쓸 수 없다.
-- "어느 기관이든 정상 소속이면 published 콘텐츠를 볼 수 있다"를 판정한다.
-- 기관이 suspended면 false가 되어 정지된 기관은 콘텐츠도 볼 수 없다
-- (기존 helper 3종이 organizations.status를 함께 보는 원칙을 그대로 잇는다).
create or replace function private.is_active_org_member()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o
      on o.id = m.organization_id
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

revoke execute on function private.is_active_org_member() from public;
grant execute on function private.is_active_org_member() to authenticated;


-- (2) 이 프로그램이 published인가?
--
-- curriculum_lessons Policy와 class_program_assignments INSERT Policy에서 함께 쓴다.
create or replace function private.is_published_program(p_program_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.curriculum_programs p
    where p.id = p_program_id
      and p.status = 'published'
  );
$$;

revoke execute on function private.is_published_program(uuid) from public;
grant execute on function private.is_published_program(uuid) to authenticated;


-- (3) 이 차시가 published이고, 그 차시가 속한 프로그램도 published인가?
--
-- lesson_activities는 자체 status가 없다. 활동의 공개 여부는 차시를 따르고,
-- 차시는 다시 프로그램을 따른다. 두 단계를 한 번에 판정한다.
-- (프로그램만 published이고 차시가 draft면 활동도 보이지 않아야 한다.)
create or replace function private.is_published_lesson(p_lesson_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.curriculum_lessons l
    join public.curriculum_programs p
      on p.id = l.program_id
    where l.id = p_lesson_id
      and l.status = 'published'
      and p.status = 'published'
  );
$$;

revoke execute on function private.is_published_lesson(uuid) from public;
grant execute on function private.is_published_lesson(uuid) to authenticated;


-- (4) 이 반이 운영 중(active)인가?
--
-- 보관된 반에 새 프로그램을 배정하지 못하게 하는 데 쓴다.
-- 기관 일치는 복합 FK가 이미 강제하므로 여기서는 status만 본다.
create or replace function private.is_active_class(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.status = 'active'
  );
$$;

revoke execute on function private.is_active_class(uuid) from public;
grant execute on function private.is_active_class(uuid) to authenticated;


-- =========================================================
-- 6. GRANT — 컬럼 단위로 최소 권한만
-- =========================================================
-- 기존 Migration과 동일한 방식이다.
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
-- anon(비로그인)은 네 테이블 어디에도 권한을 갖지 않는다.
--
-- INSERT/UPDATE GRANT는 SOYES 운영자(그리고 assignment의 경우 원장)가 쓰기 위해 필요하다.
-- GRANT는 role 단위라 운영자와 기관 사용자를 구분하지 못하므로,
-- "누가" 쓸 수 있는지는 전부 아래 RLS Policy가 결정한다.
--
-- ★ 네 테이블 모두 DELETE 권한을 부여하지 않는다. 아래에서 DELETE Policy도 만들지 않는다.
--   이미 수업에 쓰인 콘텐츠를 지우면 이후 붙을 수업 실행/기록/리포트가 고아가 된다.

revoke all on public.curriculum_programs from anon, authenticated;
revoke all on public.curriculum_lessons from anon, authenticated;
revoke all on public.lesson_activities from anon, authenticated;
revoke all on public.class_program_assignments from anon, authenticated;

-- curriculum_programs
grant select on public.curriculum_programs to authenticated;
grant insert (code, title, summary, age_group, duration_weeks, status)
on public.curriculum_programs to authenticated;
grant update (code, title, summary, age_group, duration_weeks, status)
on public.curriculum_programs to authenticated;

-- curriculum_lessons
-- ★ program_id는 UPDATE 대상에서 제외한다.
--   차시를 다른 프로그램으로 옮기는 것은 커리큘럼 구조를 깨는 행위이고,
--   허용하면 (program_id, week_no, session_no) UNIQUE의 의미도 흐려진다.
grant select on public.curriculum_lessons to authenticated;
grant insert (program_id, week_no, session_no, title, objective, duration_minutes, status)
on public.curriculum_lessons to authenticated;
grant update (week_no, session_no, title, objective, duration_minutes, status)
on public.curriculum_lessons to authenticated;

-- lesson_activities
-- ★ lesson_id도 같은 이유로 UPDATE에서 제외한다.
grant select on public.lesson_activities to authenticated;
grant insert (lesson_id, sequence_no, title, activity_type, description, duration_minutes, materials)
on public.lesson_activities to authenticated;
grant update (sequence_no, title, activity_type, description, duration_minutes, materials)
on public.lesson_activities to authenticated;

-- class_program_assignments
-- ★ organization_id / class_id / program_id 전부 UPDATE에서 제외한다.
--   배정을 다른 기관·다른 반·다른 프로그램으로 바꿔치기하는 경로를 원천 차단한다.
--   배정 대상을 바꾸려면 기존 행을 completed/cancelled로 두고 새 행을 만든다.
grant select on public.class_program_assignments to authenticated;
grant insert (organization_id, class_id, program_id, start_date, status)
on public.class_program_assignments to authenticated;
grant update (start_date, status)
on public.class_program_assignments to authenticated;


-- =========================================================
-- 7. RLS — curriculum_programs
-- =========================================================
-- SOYES 운영자 : 전체 status 조회 / 생성 / 수정
-- 원장·교사    : published 프로그램만 조회 (draft·archived는 보이지 않는다)
-- anon         : 0건

alter table public.curriculum_programs enable row level security;

drop policy if exists "curriculum programs readable by soyes admin and org members"
on public.curriculum_programs;

create policy "curriculum programs readable by soyes admin and org members"
  on public.curriculum_programs
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      status = 'published'
      and (select private.is_active_org_member())
    )
  );

drop policy if exists "curriculum programs insert by soyes admin"
on public.curriculum_programs;

create policy "curriculum programs insert by soyes admin"
  on public.curriculum_programs
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));

drop policy if exists "curriculum programs update by soyes admin"
on public.curriculum_programs;

create policy "curriculum programs update by soyes admin"
  on public.curriculum_programs
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));

-- DELETE Policy 없음 — 프로그램은 삭제하지 않고 status = 'archived'로 처리한다.


-- =========================================================
-- 8. RLS — curriculum_lessons
-- =========================================================
-- SOYES 운영자 : 전체 조회 / 생성 / 수정
-- 원장·교사    : 차시가 published이고 **부모 프로그램도 published**일 때만 조회
-- anon         : 0건
--
-- 프로그램이 draft/archived면 그 안의 차시는 published여도 보이지 않는다.
-- 공개 여부의 기준점은 항상 프로그램이다.

alter table public.curriculum_lessons enable row level security;

drop policy if exists "curriculum lessons readable by soyes admin and org members"
on public.curriculum_lessons;

create policy "curriculum lessons readable by soyes admin and org members"
  on public.curriculum_lessons
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      status = 'published'
      and private.is_published_program(program_id)
      and (select private.is_active_org_member())
    )
  );

drop policy if exists "curriculum lessons insert by soyes admin"
on public.curriculum_lessons;

create policy "curriculum lessons insert by soyes admin"
  on public.curriculum_lessons
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));

drop policy if exists "curriculum lessons update by soyes admin"
on public.curriculum_lessons;

create policy "curriculum lessons update by soyes admin"
  on public.curriculum_lessons
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));

-- DELETE Policy 없음.


-- =========================================================
-- 9. RLS — lesson_activities
-- =========================================================
-- SOYES 운영자 : 전체 조회 / 생성 / 수정
-- 원장·교사    : 부모 차시가 published이고 그 차시의 프로그램도 published일 때만 조회
-- anon         : 0건
--
-- lesson_activities에는 자체 status가 없다. 활동은 차시의 구성요소이지
-- 독립적으로 공개/비공개를 갖는 대상이 아니기 때문이다.

alter table public.lesson_activities enable row level security;

drop policy if exists "lesson activities readable by soyes admin and org members"
on public.lesson_activities;

create policy "lesson activities readable by soyes admin and org members"
  on public.lesson_activities
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (
      private.is_published_lesson(lesson_id)
      and (select private.is_active_org_member())
    )
  );

drop policy if exists "lesson activities insert by soyes admin"
on public.lesson_activities;

create policy "lesson activities insert by soyes admin"
  on public.lesson_activities
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));

drop policy if exists "lesson activities update by soyes admin"
on public.lesson_activities;

create policy "lesson activities update by soyes admin"
  on public.lesson_activities
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));

-- DELETE Policy 없음.


-- =========================================================
-- 10. RLS — class_program_assignments
-- =========================================================
-- SOYES 운영자 : 전체 조회 / 배정 / 상태 변경
-- 원장         : 자기 활성 기관의 배정만 조회 / 배정 / 상태 변경
-- 교사         : 자기가 담당하는 반의 배정만 조회 (쓰기 불가)
-- anon         : 0건

alter table public.class_program_assignments enable row level security;

drop policy if exists "class program assignments readable by org staff and soyes admin"
on public.class_program_assignments;

-- 교사 판정은 20260824의 private.is_class_teacher()를 그대로 쓴다.
-- 이 helper가 반 active · 기관 active · membership active · role=teacher를 모두 재확인하므로
-- 여기서 조건을 다시 나열하지 않는다.
create policy "class program assignments readable by org staff and soyes admin"
  on public.class_program_assignments
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_class_teacher(class_id)
  );


-- ★ 신규 배정의 안전 조건 (요구사항 13 · 15)
--
--   1. 운영자이거나, 그 기관의 활성 원장일 것
--   2. 반이 운영 중(active)일 것        → 보관된 반에는 새로 배정하지 않는다
--   3. 프로그램이 published일 것        → draft/archived 콘텐츠는 실제 운영에 붙지 않는다
--
--   2·3은 SOYES 운영자에게도 똑같이 적용한다.
--   "콘텐츠 관리(draft를 만들고 다듬는 일)"와 "실제 운영 배정"을 분리하기 위해서다.
--   운영자라도 published가 아닌 프로그램을 반에 붙일 수는 없다.
--
--   기관 일치는 복합 FK가 이미 구조적으로 강제하므로 Policy에서 다시 검사하지 않는다.
--   (다른 기관 class_id를 넣으면 FK 위반으로 INSERT 자체가 실패한다.)
drop policy if exists "class program assignments insert by soyes admin or director"
on public.class_program_assignments;

create policy "class program assignments insert by soyes admin or director"
  on public.class_program_assignments
  for insert
  to authenticated
  with check (
    (
      (select private.is_soyes_admin())
      or private.has_org_role(organization_id, array['director'])
    )
    and private.is_active_class(class_id)
    and private.is_published_program(program_id)
  );


-- ★ UPDATE에는 "반 active / 프로그램 published" 조건을 걸지 않는다.
--
--   걸어버리면 반이 보관되거나 프로그램이 archived된 뒤에
--   진행 중이던 배정을 completed로 정리하는 것조차 막힌다.
--   과거 이력을 마무리하는 일은 언제나 가능해야 한다.
--
--   바꿀 수 있는 컬럼은 GRANT가 start_date / status로 이미 좁혀 두었다.
--   organization_id / class_id / program_id는 UPDATE 대상이 아니라
--   배정 대상을 바꿔치기하는 경로가 없다.
drop policy if exists "class program assignments update by soyes admin or director"
on public.class_program_assignments;

create policy "class program assignments update by soyes admin or director"
  on public.class_program_assignments
  for update
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
  )
  with check (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
  );

-- DELETE Policy 없음 — 배정은 삭제하지 않고 completed / cancelled로 처리한다.
-- 과거에 어떤 반이 어떤 프로그램을 운영했는지는 계속 남아 있어야 한다.


-- ─────────────────────────────────────────────────────────
-- 상태 되돌리기(completed/cancelled → active)에 대한 메모
--
--   DB는 이 전이를 막지 않는다. 막으려면 OLD/NEW status를 비교하는 trigger가 필요한데,
--   이번 Foundation에 그만한 복잡도를 넣을 이유가 없다.
--
--   대신 partial unique index가 실질적인 안전장치가 된다.
--   같은 반에 같은 프로그램이 이미 active로 있으면 되돌리기가 unique 위반으로 실패한다.
--   즉 "중복 운영"은 DB가 확실히 막고, "이력을 남기려면 되돌리지 말고 새 행을 만든다"는
--   운영 원칙은 SERVICE-05B의 Server Action이 담당한다.
-- ─────────────────────────────────────────────────────────
