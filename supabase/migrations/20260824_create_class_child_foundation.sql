-- TeachAble Art Play — 반(Class) / 원아(Child) 데이터 Foundation
--
-- PHASE SERVICE-04A 초안입니다. **아직 Supabase에 적용하지 않았습니다.**
-- 검토 후 `npx supabase db push`로 1회 적용하세요.
--
-- 전제: 아래 Migration이 이미 원격에 적용된 상태에서 이어서 적용합니다.
--   20260812_create_lead_submissions.sql
--   20260813_create_admin_access.sql              (private.admin_users / private.is_soyes_admin())
--   20260814_create_admin_access_check.sql
--   20260815_create_organization_foundation.sql   (organizations / profiles / organization_members
--                                                  + private.set_updated_at()
--                                                  + is_org_member / has_org_role / is_director_of_user_org)
-- 위 네 파일은 전혀 수정하지 않았고, 여기서도 건드리지 않습니다.
--
-- ─────────────────────────────────────────────────────────
-- 이 Migration이 지키는 원칙 (20260815의 원칙을 그대로 승계)
--   1. 한 유치원 = 한 organization. 모든 업무 데이터는 organization_id로 격리한다.
--   2. 격리의 최종 방어선은 RLS다. UI 차단에 의존하지 않는다.
--   3. 업무 데이터(반·원아)는 삭제하지 않는다. status로 비활성화한다.
--      단 class_teachers는 업무 데이터가 아니라 "반↔교사 배정 관계"만 담는 pivot table이라
--      해제 = 행 삭제가 자연스럽다. 이 테이블만 SOYES 운영자에게 DELETE를 연다.
--   4. 권한은 "나중에 열기"는 쉽고 "이미 연 것을 닫기"는 어렵다. 항상 좁게 시작한다.
--   5. 개인정보는 목적이 확정된 것만 저장한다. 특히 원아는 미성년자다.
--
-- 이 Migration에서 추가로 세운 원칙
--   6. "다른 기관 데이터가 섞이는 것"은 검사(trigger)가 아니라 **구조(FK)**로 막는다.
--      trigger는 우회 가능한 경로(service_role, 직접 SQL)가 있지만
--      복합 FK는 superuser를 포함한 누구도 위반할 수 없다.
-- ─────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create schema if not exists private;
grant usage on schema private to authenticated;


-- =========================================================
-- 0. 기관 불일치 방지를 위한 복합 FK 대상 키
-- =========================================================
-- class_teachers가 "같은 기관의 구성원"만 참조하도록 강제하려면
-- organization_members를 (id, organization_id) 쌍으로 참조할 수 있어야 한다.
-- id가 이미 PK이므로 이 UNIQUE는 데이터상 항상 참이고, 기존 행에 영향이 없다.
--
-- 제약조건에는 `if not exists`가 없으므로 카탈로그를 직접 확인해 멱등성을 확보한다.
-- (기존 Migration 파일은 수정하지 않고 여기서 확장만 한다.)

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_id_org_key'
  ) then
    alter table public.organization_members
      add constraint organization_members_id_org_key
      unique (id, organization_id);
  end if;
end
$$;


-- =========================================================
-- 1. public.classes — 반
-- =========================================================
-- 반은 삭제하지 않는다. 학년도가 끝나면 status = 'archived'로 남긴다.
-- 과거 반이 남아 있어야 이후 성장기록/리포트가 어느 반에서 나온 것인지 설명할 수 있다.

create table if not exists public.classes (

  id uuid primary key default gen_random_uuid(),

  -- 반이 남아 있는 기관은 실수로도 지워지지 않게 restrict (organization_members와 동일 정책)
  organization_id uuid not null
    references public.organizations (id) on delete restrict,

  name text not null
    constraint classes_name_check
    check (char_length(btrim(name)) between 1 and 50),

  -- 만 나이 기준 반 편성. 혼합반(mixed)이 흔해 nullable로 시작한다.
  age_group text
    constraint classes_age_group_check
    check (
      age_group is null
      or age_group in ('age3', 'age4', 'age5', 'mixed')
    ),

  -- 학년도. 2026 같은 4자리 정수.
  -- CHECK은 immutable해야 하므로 now() 대신 고정 범위로 오타만 걸러낸다.
  school_year integer not null
    constraint classes_school_year_check
    check (school_year between 2000 and 2100),

  status text not null default 'active'
    constraint classes_status_check
    check (status in ('active', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- children / class_teachers가 (id, organization_id)로 참조하기 위한 키.
  -- 이 한 줄이 "다른 기관 원아/교사가 이 반에 붙는 것"을 구조적으로 불가능하게 만든다.
  constraint classes_id_org_key unique (id, organization_id)
);


-- 같은 기관 · 같은 학년도에 같은 이름의 "운영 중인" 반을 두 번 만들지 못하게 한다.
--   - btrim/lower로 '햇살반'과 '햇살반 '(뒤 공백)을 같은 이름으로 본다.
--   - status = 'active'인 행만 대상으로 하는 partial index다.
--     archived된 과거 반과 같은 이름으로 새 학년도 반을 다시 만들 수 있어야 하고,
--     같은 학년도 안에서 반을 archive한 뒤 같은 이름으로 재생성하는 것도 막지 않는다.
create unique index if not exists classes_org_year_name_active_key
on public.classes (organization_id, school_year, lower(btrim(name)))
where status = 'active';


-- 원장 화면의 "우리 원 반 목록"(활성/보관 모두) 조회용.
-- 위 partial unique index는 active 행만 담고 있어 이 경로를 대신할 수 없다.
create index if not exists classes_organization_id_status_idx
on public.classes (organization_id, status);


drop trigger if exists trg_classes_updated_at on public.classes;

-- 20260815에서 만든 공통 함수를 그대로 재사용한다. 중복 함수를 만들지 않는다.
create trigger trg_classes_updated_at
before update on public.classes
for each row
execute function private.set_updated_at();


-- =========================================================
-- 2. public.class_teachers — 반 ↔ 담당 교사
-- =========================================================
-- 교사 계정 초대 흐름이 아직 없으므로 이번 단계에서는 "연결을 담을 그릇"만 만든다.
--
-- organization_id는 정규화 관점에서는 중복이지만 의도적으로 둔다.
-- 이 컬럼이 있어야 아래 두 복합 FK가 "반의 기관"과 "구성원의 기관"이
-- 같은 값을 가리키도록 강제할 수 있다. (0번 주석 참조)

create table if not exists public.class_teachers (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,

  class_id uuid not null,

  organization_member_id uuid not null,

  created_at timestamptz not null default now(),

  -- 같은 반에 같은 교사를 두 번 배정하지 않는다.
  constraint class_teachers_class_member_key
    unique (class_id, organization_member_id),

  -- ★ 기관 불일치 차단 (1) — 반은 이 기관의 반이어야 한다.
  constraint class_teachers_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict,

  -- ★ 기관 불일치 차단 (2) — 구성원도 같은 기관의 구성원이어야 한다.
  --   organization_id가 한 컬럼뿐이므로 두 FK가 같은 값을 봐야 하고,
  --   그 결과 "A원 반 + B원 교사" 조합은 어떤 경로로도 INSERT되지 않는다.
  constraint class_teachers_member_fk
    foreign key (organization_member_id, organization_id)
    references public.organization_members (id, organization_id)
    on delete restrict
);


-- unique (class_id, organization_member_id)가 class_id 선행 조회를 이미 커버하므로
-- 반대 방향(내 배정 반 찾기)만 별도 index를 만든다. (organization_members와 동일한 판단)
create index if not exists class_teachers_organization_member_id_idx
on public.class_teachers (organization_member_id);


-- =========================================================
-- 3. class_teachers — role = 'teacher' 강제 trigger
-- =========================================================
-- 복합 FK는 "같은 기관"까지만 보장한다. role은 변할 수 있는 값이라
-- FK로 고정하면 교사→원장 승격 UPDATE 자체가 FK 위반으로 막혀버린다.
-- 그래서 role 검사는 배정 시점 trigger로 처리한다.
--
-- status는 검사하지 않는다. 초대(invited) 상태의 교사를 미리 반에 배정해 두고
-- 계정 활성화 후 바로 쓰는 흐름을 막지 않기 위해서다.
-- 실제 접근 권한은 아래 private.is_class_teacher()가 조회 시점에
-- status='active'까지 다시 확인하므로 이 예외로 권한이 새지 않는다.
--
-- 승격 등으로 배정이 뒤늦게 무효가 되어도(예: teacher → director)
-- is_class_teacher()가 role='teacher'를 재확인하므로 그 경로로는 아무 권한도 주지 않는다.

create or replace function private.enforce_class_teacher_is_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select m.role
    into v_role
  from public.organization_members m
  where m.id = new.organization_member_id;

  if v_role is null then
    raise exception
      'organization_member % 를 찾을 수 없습니다.', new.organization_member_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_role <> 'teacher' then
    raise exception
      'class_teachers에는 role=teacher인 구성원만 배정할 수 있습니다. (현재 role=%)', v_role
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_class_teacher_is_teacher()
from public, anon, authenticated;

drop trigger if exists trg_class_teachers_role_check on public.class_teachers;

create trigger trg_class_teachers_role_check
before insert or update of organization_member_id on public.class_teachers
for each row
execute function private.enforce_class_teacher_is_teacher();


-- =========================================================
-- 4. public.children — 원아
-- =========================================================
-- ★ 미성년자 개인정보다. 최소정보 원칙을 가장 강하게 적용한다.
--
-- 이번 단계에서 의도적으로 **넣지 않는** 항목:
--   주민등록번호 / 상세 주소 / 생년월일 전체 / 성별 /
--   부모 전화번호 / 부모 이메일 / 의료·장애·심리 정보 / 상담 내용 / 사진 URL / notes
--
--   - 성별: 반 편성·수업 운영·성장기록 어디에도 필요하지 않다.
--           "일단 넣어두는" 순간 화면과 리포트로 새기 시작하므로 넣지 않는다.
--   - notes: 자유 입력란은 결국 민감정보(건강·가정사·발달 우려)가 들어간다.
--           관찰기록은 목적과 접근범위를 따로 설계한 전용 테이블에서 다룬다.
--   - 생년월일: 반 편성에 필요한 것은 "나이"지 "날짜"가 아니다. birth_year까지만 둔다.
--
-- 위 항목이 실제로 필요해지는 Phase에서, 목적·보관기간·접근범위를 정한 뒤
-- 별도 테이블로 분리해 추가한다.

create table if not exists public.children (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations (id) on delete restrict,

  -- 반 미배정 원아(입학 예정, 반 편성 전, 반 이동 중)가 실제로 존재하므로 nullable이다.
  -- 값이 있을 때는 아래 복합 FK가 기관 일치를 강제한다.
  class_id uuid,

  name text not null
    constraint children_name_check
    check (char_length(btrim(name)) between 1 and 50),

  -- 나이 계산용. CHECK은 immutable해야 하므로 고정 범위로 오타만 걸러낸다.
  birth_year integer
    constraint children_birth_year_check
    check (
      birth_year is null
      or birth_year between 2000 and 2100
    ),

  status text not null default 'active'
    constraint children_status_check
    check (status in ('active', 'inactive', 'graduated')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ★ 기관 불일치 차단 — class_id가 지정된 경우
  --   children.organization_id와 classes.organization_id가 반드시 같아야 한다.
  --
  --   복합 FK의 기본 동작인 MATCH SIMPLE 덕분에 두 의미가 동시에 성립한다.
  --     - class_id IS NULL      → 참조 검사를 하지 않는다 (반 미배정 허용)
  --     - class_id IS NOT NULL  → (class_id, organization_id) 쌍이 반드시 존재해야 한다
  --   organization_id는 NOT NULL이므로 "한쪽만 NULL로 만들어 검사를 피하는" 우회로가 없다.
  constraint children_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict
);


-- 원장 화면: 우리 원 원아 목록 (재원/졸업 필터)
create index if not exists children_organization_id_status_idx
on public.children (organization_id, status);

-- 교사 화면: 내 반 재원 원아 목록
create index if not exists children_class_id_status_idx
on public.children (class_id, status);


drop trigger if exists trg_children_updated_at on public.children;

create trigger trg_children_updated_at
before update on public.children
for each row
execute function private.set_updated_at();


-- =========================================================
-- 5. 권한 Helper (private)
-- =========================================================
-- 20260815의 helper 3종(is_org_member / has_org_role / is_director_of_user_org)을
-- 그대로 재사용하고, 이번 Phase에 필요한 두 개만 추가한다.
--
-- 둘 다 SECURITY DEFINER다. 이유는 20260815와 동일하다.
--   classes의 RLS Policy가 class_teachers를 읽고, class_teachers의 RLS Policy가
--   classes를 읽으므로 일반 함수로 만들면 상호 재귀에 빠진다.
--   SECURITY DEFINER는 소유자 권한으로 실행되어 RLS를 우회하므로 재귀가 없다.
--
--   ★ classes / children / class_teachers에 `force row level security`를 절대 켜지 마라.
--     켜면 소유자도 RLS를 받게 되어 재귀가 되살아난다.
--     (organizations / organization_members에 대한 기존 경고와 동일하다.)

-- (1) 내가 이 반의 담당 교사인가?
--
-- 다음을 모두 만족해야 true다.
--   - 반이 존재하고 status = 'active'          (보관된 반은 교사에게 보이지 않는다)
--   - 기관이 status = 'active'                 (정지된 기관은 전면 차단)
--   - 내 membership이 status = 'active'
--   - 내 membership의 role = 'teacher'         (승격/강등된 배정은 자동으로 무효)
--   - class_teachers에 나-반 배정이 있다
--
-- p_class_id가 NULL이면 어떤 행과도 매칭되지 않아 false를 돌려준다.
-- (반 미배정 원아가 교사에게 보이지 않게 하는 근거이기도 하다.)
create or replace function private.is_class_teacher(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_teachers ct
    join public.classes c
      on c.id = ct.class_id
    join public.organization_members m
      on m.id = ct.organization_member_id
    join public.organizations o
      on o.id = m.organization_id
    where ct.class_id = p_class_id
      and c.status = 'active'
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'teacher'
      and o.status = 'active'
  );
$$;

revoke execute on function private.is_class_teacher(uuid) from public;
grant execute on function private.is_class_teacher(uuid) to authenticated;


-- (2) 이 organization_members 행이 "나"인가?
--
-- class_teachers SELECT Policy에서 교사가 자기 배정만 보게 하는 데 쓴다.
-- 기관/구성원 status를 검사하지 않는 것은 의도적이다.
-- 20260815의 organization_members SELECT Policy가 "자기 행은 기관 정지와 무관하게 보인다"로
-- 정해 두었으므로, 자기 배정 조회도 같은 기준을 따른다.
-- 다른 기관 정보가 새지 않으면서 "계정은 있으나 기관이 비활성" 상태를 안내할 수 있게 하기 위함이다.
create or replace function private.owns_org_membership(p_organization_member_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.id = p_organization_member_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.owns_org_membership(uuid) from public;
grant execute on function private.owns_org_membership(uuid) to authenticated;


-- =========================================================
-- 6. GRANT — 컬럼 단위로 최소 권한만
-- =========================================================
-- 20260815와 동일한 방식이다.
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
-- anon(비로그인)은 세 테이블 어디에도 권한을 갖지 않는다.
--
-- ★ 세 테이블 모두 organization_id를 UPDATE 대상에서 제외한다.
--   기관 이동은 업무상 존재하지 않는 행위이고, 허용하면 원장이 자기 반/원아를
--   다른 기관으로 옮기거나 가져오는 경로가 열린다. 컬럼 단위에서 원천 차단한다.
--
-- ★ classes / children에는 DELETE 권한을 부여하지 않는다. 아래에서 DELETE Policy도 만들지 않는다.
--   class_teachers만 예외다(위 원칙 3 참조). DELETE는 컬럼 단위 GRANT가 없는 문법이라
--   테이블 단위로 부여되지만, 실제로 지울 수 있는 행은 RLS Policy가
--   private.is_soyes_admin()으로 제한한다. anon은 revoke 대상이라 애초에 접근 자체가 없다.

revoke all on public.classes from anon, authenticated;
revoke all on public.class_teachers from anon, authenticated;
revoke all on public.children from anon, authenticated;

-- classes
grant select on public.classes to authenticated;
grant insert (organization_id, name, age_group, school_year, status)
on public.classes to authenticated;
grant update (name, age_group, school_year, status)
on public.classes to authenticated;

-- class_teachers
-- 아래 GRANT는 SOYES 운영자가 쓰기 위해 필요하다.
-- 기관 사용자(director/teacher)는 RLS Policy에서 전부 막힌다.
grant select on public.class_teachers to authenticated;
grant insert (organization_id, class_id, organization_member_id)
on public.class_teachers to authenticated;
-- 배정 해제용. 실제 삭제 가능 행은 아래 DELETE Policy가 SOYES 운영자로 좁힌다.
grant delete on public.class_teachers to authenticated;
-- UPDATE는 부여하지 않는다. 배정 변경은 "기존 행 DELETE → 새 행 INSERT"로 처리한다.
-- 이 테이블에는 배정 관계 외에 수정할 값이 없어 UPDATE를 열 이유가 없다.

-- children
grant select on public.children to authenticated;
grant insert (organization_id, class_id, name, birth_year, status)
on public.children to authenticated;
grant update (class_id, name, birth_year, status)
on public.children to authenticated;


-- =========================================================
-- 7. RLS — classes
-- =========================================================
-- SOYES 운영자 : 전체 조회 / 생성 / 수정
-- 원장         : 자기 활성 기관의 반만 조회 / 생성 / 수정
-- 교사         : 자기에게 배정된 활성 반만 조회 (생성·수정 불가)

alter table public.classes enable row level security;

drop policy if exists "classes readable by org staff and soyes admin" on public.classes;

create policy "classes readable by org staff and soyes admin"
  on public.classes
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_class_teacher(id)
  );

-- 반 생성은 SOYES 운영자와 원장만. 교사는 with check를 통과할 수 없다.
drop policy if exists "classes insert by soyes admin or director" on public.classes;

create policy "classes insert by soyes admin or director"
  on public.classes
  for insert
  to authenticated
  with check (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
  );

-- 수정도 SOYES 운영자와 원장만.
-- using과 with check를 같은 조건으로 두어 "내 기관 반을 남의 기관으로 옮기는" UPDATE를 막는다.
-- (organization_id는 GRANT에서도 제외되어 이중으로 차단된다.)
drop policy if exists "classes update by soyes admin or director" on public.classes;

create policy "classes update by soyes admin or director"
  on public.classes
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

-- DELETE Policy 없음 — 반은 삭제하지 않고 status = 'archived'로 처리한다.


-- =========================================================
-- 8. RLS — class_teachers
-- =========================================================
-- SOYES 운영자 : 전체 조회 / 배정(INSERT) / 배정 해제(DELETE)
-- 원장         : 자기 기관 배정 현황 "조회만"
-- 교사         : 자기 배정만 조회
--
-- ★ 원장/교사에게 쓰기를 열지 않는 이유
--   교사 초대 흐름이 아직 없어 기관에 teacher 구성원이 존재할 수 없다.
--   쓰기를 미리 열어두면 실제로 쓰이지도 않는 권한만 남는다.
--   후속 "Teacher Invite Phase"에서 교사 초대와 함께 원장 배정 권한을 연다.
--   (20260815에서 organization_members 쓰기를 운영자로 좁힌 것과 동일한 판단이다.)
--
-- ★ 배정 해제(DELETE)는 SOYES 운영자에게 연다.
--   운영자 화면이 service_role이 아니라 "관리자 세션 + RLS"로 동작하므로
--   (20260815 organization_members 연결과 동일한 방식) API에서 해제할 수 있어야 한다.
--   UPDATE는 열지 않는다 — 배정 변경은 DELETE 후 INSERT다.

alter table public.class_teachers enable row level security;

drop policy if exists "class teachers readable by self director and soyes admin"
on public.class_teachers;

create policy "class teachers readable by self director and soyes admin"
  on public.class_teachers
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.owns_org_membership(organization_member_id)
  );

drop policy if exists "class teachers insert by soyes admin" on public.class_teachers;

create policy "class teachers insert by soyes admin"
  on public.class_teachers
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));

-- 배정 해제. SOYES 운영자만, 그리고 authenticated 세션에서만 가능하다.
-- anon은 이 Policy의 대상 role이 아니고 GRANT도 revoke된 상태라 이중으로 차단된다.
-- 원장/교사는 is_soyes_admin()이 false라 단 한 행도 삭제할 수 없다.
drop policy if exists "class teachers delete by soyes admin" on public.class_teachers;

create policy "class teachers delete by soyes admin"
  on public.class_teachers
  for delete
  to authenticated
  using ((select private.is_soyes_admin()));

-- UPDATE Policy 없음 — GRANT도 없으므로 이중으로 차단된다.


-- =========================================================
-- 9. RLS — children
-- =========================================================
-- SOYES 운영자 : 전체 조회 / 생성 / 수정
-- 원장         : 자기 활성 기관의 원아만 조회 / 생성 / 수정
-- 교사         : 자기에게 배정된 활성 반의 **active 원아만** 조회 (생성·수정 불가)
--
-- 교사 조회 범위가 가장 좁다. 미성년자 정보이므로
-- "내가 지금 가르치는 아이"를 벗어나는 행은 한 건도 보이지 않아야 한다.
--   - 반 미배정 원아(class_id IS NULL) → is_class_teacher(NULL)이 false라 보이지 않는다
--   - 다른 반 원아                      → 배정이 없어 false
--   - 다른 기관 원아                    → 배정도 없고 기관도 다르다
--   - 퇴원/졸업 원아                    → status 조건에서 걸러진다

alter table public.children enable row level security;

drop policy if exists "children readable by org staff and soyes admin" on public.children;

create policy "children readable by org staff and soyes admin"
  on public.children
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or (
      status = 'active'
      and private.is_class_teacher(class_id)
    )
  );

drop policy if exists "children insert by soyes admin or director" on public.children;

create policy "children insert by soyes admin or director"
  on public.children
  for insert
  to authenticated
  with check (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
  );

drop policy if exists "children update by soyes admin or director" on public.children;

create policy "children update by soyes admin or director"
  on public.children
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

-- DELETE Policy 없음 — 원아는 삭제하지 않고 status = 'inactive' / 'graduated'로 처리한다.
