-- TeachAble Art Play — 기관(Organization) / 사용자 / 권한 기반
--
-- PHASE SERVICE-01 초안입니다. **아직 Supabase에 적용하지 않았습니다.**
-- 승인 후 `npx supabase db push`로 1회 적용하세요.
--
-- 전제: 아래 Migration이 이미 원격에 적용된 상태에서 이어서 적용합니다.
--   20260812_create_lead_submissions.sql
--   20260813_create_admin_access.sql   (private.admin_users / private.is_soyes_admin())
--   20260814_create_admin_access_check.sql
-- 위 세 파일은 전혀 수정하지 않았고, 여기서도 건드리지 않습니다.
--
-- ─────────────────────────────────────────────────────────
-- 보안 검토 반영 (2차 개정)
--   1. helper 3종이 organizations.status = 'active'까지 검사한다.
--      → suspended 기관은 활성 membership이 있어도 전면 차단된다.
--   2. profiles는 teacher끼리 서로 볼 수 없다.
--      is_org_colleague()를 폐기하고 원장 전용 helper로 교체했다.
--   3. organization_members 쓰기(INSERT/UPDATE)는 SOYES 운영자만 가능하다.
--      원장 초대 / 교사 초대 UI가 없는 단계에서 원장에게 쓰기를 열지 않는다.
--   4. organizations.status는 어떤 authenticated 사용자도 Data API로 바꿀 수 없다.
-- ─────────────────────────────────────────────────────────
--
-- 핵심 원칙
--   1. 한 유치원 = 한 organization. 모든 업무 데이터는 organization_id로 격리한다.
--   2. 격리의 최종 방어선은 RLS다. UI 차단에 의존하지 않는다.
--   3. SOYES 운영자 권한(private.admin_users)과 기관 사용자 권한(organization_members)은
--      완전히 다른 계통으로 유지한다. 서로 옮기거나 통합하지 않는다.
--   4. 삭제하지 않는다. status로 비활성화한다.
--   5. 권한은 "나중에 열기"는 쉽고 "이미 연 것을 닫기"는 어렵다. 항상 좁게 시작한다.

create extension if not exists pgcrypto;

create schema if not exists private;
grant usage on schema private to authenticated;


-- =========================================================
-- 1. 공통 updated_at 트리거 함수
-- =========================================================
-- lead_submissions 전용 함수(public.set_lead_submissions_updated_at)는 그대로 두고,
-- 신규 테이블용 공통 함수를 private에 새로 만든다.
--
-- 트리거 실행 시점에는 EXECUTE 권한을 검사하지 않으므로(생성 시점에만 검사)
-- 기존 Migration과 동일하게 외부 role에서는 직접 호출할 수 없도록 회수한다.

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;


-- =========================================================
-- 2. public.organizations — 기관(유치원) 자체
-- =========================================================
-- 사업자번호 / 주소 / 계약 / 결제 정보는 이번 단계에서 넣지 않는다.
-- 실제로 필요해지는 Phase에서 별도 테이블 또는 컬럼으로 추가한다.

create table if not exists public.organizations (

  id uuid primary key default gen_random_uuid(),

  name text not null
    constraint organizations_name_check
    check (char_length(btrim(name)) between 1 and 100),

  -- 유치원/어린이집/학원은 운영 규정이 달라 향후 분기 지점이 된다. nullable로 시작.
  institution_type text
    constraint organizations_institution_type_check
    check (
      institution_type is null
      or institution_type in ('kindergarten', 'daycare', 'academy', 'other')
    ),

  -- 계약 종료/일시 정지는 삭제가 아니라 status로 표현한다.
  --
  -- ★ status는 Data API(GRANT)에서 어떤 authenticated 사용자에게도 열리지 않는다.
  --   원장이 자기 기관의 정지를 스스로 해제하는 경로를 원천 차단하기 위함이다.
  --   SOYES 운영자의 기관 중지/재활성화 기능은 후속
  --   "Admin Organization Management Phase"에서 private.is_soyes_admin()을 검사하는
  --   전용 SECURITY DEFINER RPC(또는 그것을 호출하는 Server Action)로 구현한다.
  --   그 전까지 status 변경은 SQL / Supabase Dashboard로만 수행한다.
  status text not null default 'active'
    constraint organizations_status_check
    check (status in ('active', 'suspended')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_status_idx
on public.organizations (status);

drop trigger if exists trg_organizations_updated_at on public.organizations;

create trigger trg_organizations_updated_at
before update on public.organizations
for each row
execute function private.set_updated_at();


-- =========================================================
-- 3. public.profiles — 서비스 사용자 기본 프로필
-- =========================================================
-- email은 auth.users에 이미 있으므로 중복 저장하지 않는다(동기화 부채 방지).
-- 최소 개인정보 원칙: 이름과 업무용 연락처까지만 둔다.
-- 생년월일 / 주소 / 주민번호 등 민감정보는 저장하지 않는다.
--
-- phone이 들어 있으므로 이 테이블의 SELECT 범위가 곧 개인정보 노출 범위다.
-- 아래 8번 Policy에서 "본인 / SOYES 운영자 / 소속 기관 원장"으로만 제한한다.

create table if not exists public.profiles (

  user_id uuid primary key
    references auth.users (id) on delete cascade,

  display_name text not null
    constraint profiles_display_name_check
    check (char_length(btrim(display_name)) between 1 and 50),

  phone text
    constraint profiles_phone_check
    check (
      phone is null
      or char_length(btrim(phone)) between 1 and 30
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();


-- =========================================================
-- 4. public.organization_members — 사용자 ↔ 기관 연결
-- =========================================================
-- role은 "사용자의 속성"이 아니라 "사용자와 기관 사이 관계의 속성"이다.
-- 같은 사람이 A원 원장이면서 B원 교사일 수 있으므로 별도 테이블로 둔다.
--
-- user_id가 auth.users가 아니라 public.profiles를 참조하는 이유:
--   - PostgREST가 organization_members ↔ profiles를 자동 임베드할 수 있다.
--   - "프로필 없는 구성원"이 생기지 않는다. (profiles는 auth.users를 참조하므로 출처는 동일)

create table if not exists public.organization_members (

  id uuid primary key default gen_random_uuid(),

  -- 구성원이 남아 있는 기관은 실수로도 지워지지 않게 restrict
  organization_id uuid not null
    references public.organizations (id) on delete restrict,

  user_id uuid not null
    references public.profiles (user_id) on delete cascade,

  -- 이번 Phase는 director / teacher만. parent는 의도적으로 제외한다.
  role text not null
    constraint organization_members_role_check
    check (role in ('director', 'teacher')),

  status text not null default 'active'
    constraint organization_members_status_check
    check (status in ('active', 'invited', 'disabled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 같은 기관에 같은 사람이 두 번 들어가지 않는다.
  -- 역할 변경은 새 행이 아니라 이 행의 UPDATE로 처리한다.
  constraint organization_members_org_user_key
    unique (organization_id, user_id)
);

-- (organization_id, user_id) unique index가 organization_id 선행 조회를 이미 커버하므로
-- 반대 방향(내가 속한 기관 찾기)만 별도 index를 만든다.
create index if not exists organization_members_user_id_idx
on public.organization_members (user_id);

drop trigger if exists trg_organization_members_updated_at
on public.organization_members;

create trigger trg_organization_members_updated_at
before update on public.organization_members
for each row
execute function private.set_updated_at();


-- =========================================================
-- 5. 권한 Helper (private)
-- =========================================================
-- 전부 SECURITY DEFINER다. 이유가 두 가지 있다.
--   1. organization_members의 RLS Policy 안에서 organization_members를 다시 조회해야 하는데,
--      일반 함수로 만들면 무한 재귀에 빠진다. SECURITY DEFINER는 소유자 권한으로 실행되어
--      RLS를 우회하므로 재귀가 발생하지 않는다.
--      => organization_members / organizations에 `force row level security`를 절대 켜지 마라.
--         켜면 소유자도 RLS를 받게 되어 재귀가 되살아난다.
--   2. 구성원 테이블 자체를 노출하지 않고 boolean만 돌려준다.
--
-- ★ 세 함수 모두 organizations.status = 'active'를 함께 검사한다.
--   기관이 suspended면 활성 membership이 있어도 전부 false가 된다.
--   향후 classes / children / observations / reports의 RLS가 이 helper만 재사용하면
--   정지된 기관은 자동으로 모든 업무 데이터에서 차단된다.
--   SOYES 운영자는 이 경로를 쓰지 않고 private.is_soyes_admin()으로 판정되므로
--   정지된 기관도 계속 조회·관리할 수 있다.

-- 이전 초안에 있던 동료 프로필 helper는 폐기한다(teacher끼리 phone이 노출됐다).
drop function if exists private.is_org_colleague(uuid);


-- (1) 내가 이 "활성" 기관의 활성 구성원인가? (역할 무관 — 향후 parent도 자기 기관은 봐야 한다)
create or replace function private.is_org_member(p_organization_id uuid)
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
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

revoke execute on function private.is_org_member(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;


-- (2) 내가 이 "활성" 기관에서 특정 역할인가? (원장 전용 판정)
create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles text[]
)
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
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (p_roles)
      and o.status = 'active'
  );
$$;

revoke execute on function private.has_org_role(uuid, text[]) from public;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;


-- (3) 내가 이 사용자가 소속된 "활성" 기관의 원장인가?
--
-- profiles(phone 포함) 가시성 판정 전용이다.
-- 이름이 곧 판정 내용이다: 원장만 자기 기관 교직원의 프로필을 볼 수 있다.
-- teacher는 이 함수로 true를 받을 수 없으므로 다른 교사의 전화번호를 조회할 수 없다.
--
-- theirs.role을 director/teacher로 좁힌 것은 의도적이다.
-- 향후 parent role을 추가해도 학부모 프로필이 이 경로로 자동 노출되지 않는다.
-- (학부모 프로필 접근은 아이 단위로 별도 설계한다.)
create or replace function private.is_director_of_user_org(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organizations o
      on o.id = mine.organization_id
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and mine.role = 'director'
      and o.status = 'active'
      and theirs.user_id = p_user_id
      and theirs.status = 'active'
      and theirs.role in ('director', 'teacher')
  );
$$;

revoke execute on function private.is_director_of_user_org(uuid) from public;
grant execute on function private.is_director_of_user_org(uuid) to authenticated;


-- =========================================================
-- 6. GRANT — 컬럼 단위로 최소 권한만
-- =========================================================
-- lead_submissions에서 쓴 방식과 동일하다.
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
-- anon(비로그인)은 이 세 테이블에 어떤 권한도 갖지 않는다.
--
-- GRANT는 role 단위라 SOYES 운영자와 기관 사용자를 구분하지 못한다.
-- 따라서 "누가" 쓸 수 있는지는 전부 아래 RLS Policy가 결정한다.

revoke all on public.organizations from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.organization_members from anon, authenticated;

-- organizations
grant select on public.organizations to authenticated;
grant insert (name, institution_type) on public.organizations to authenticated;
-- ★ status는 의도적으로 제외한다(위 2번 주석 참조). 컬럼 단위에서 원천 차단된다.
grant update (name, institution_type) on public.organizations to authenticated;

-- profiles
grant select on public.profiles to authenticated;
grant insert (user_id, display_name, phone) on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

-- organization_members
-- 아래 GRANT는 SOYES 운영자가 쓰기 위해 필요하다.
-- 기관 사용자(director/teacher)는 RLS Policy에서 전부 막힌다.
grant select on public.organization_members to authenticated;
grant insert (organization_id, user_id, role, status)
on public.organization_members to authenticated;
grant update (role, status) on public.organization_members to authenticated;

-- 세 테이블 모두 DELETE 권한을 부여하지 않는다. 아래에서 DELETE Policy도 만들지 않는다.


-- =========================================================
-- 7. RLS — organizations
-- =========================================================

alter table public.organizations enable row level security;

-- suspended 기관은 is_org_member()가 false를 돌려주므로
-- 해당 기관 원장/교사에게는 기관 행 자체가 보이지 않는다.
drop policy if exists "organizations readable by members and soyes admin"
on public.organizations;

create policy "organizations readable by members and soyes admin"
  on public.organizations
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.is_org_member(id)
  );

-- 기관 생성은 SOYES 운영자만 한다. Public Signup으로 기관이 생기지 않는다.
drop policy if exists "organizations insert by soyes admin" on public.organizations;

create policy "organizations insert by soyes admin"
  on public.organizations
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));

-- 원장은 자기 "활성" 기관의 name / institution_type만 수정할 수 있다.
-- 수정 가능 컬럼 범위는 위 GRANT가, 수정 가능 행 범위는 이 Policy가 정한다.
drop policy if exists "organizations update by soyes admin or director"
on public.organizations;

create policy "organizations update by soyes admin or director"
  on public.organizations
  for update
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(id, array['director'])
  )
  with check (
    (select private.is_soyes_admin())
    or private.has_org_role(id, array['director'])
  );

-- DELETE Policy 없음 — 기관은 삭제하지 않고 status = 'suspended'로 처리한다.


-- =========================================================
-- 8. RLS — profiles
-- =========================================================
-- phone이 포함된 테이블이므로 가장 좁게 연다.
--   본인            → 자기 프로필
--   SOYES 운영자    → 전체
--   원장            → 자기 활성 기관의 director/teacher 프로필
--   교사            → 본인 것만 (다른 교사의 전화번호 조회 불가)
--
-- 교사에게 동료 "이름"이 필요해지는 시점(반 배정 등)에는 이 Policy를 넓히지 말고,
-- display_name과 role만 돌려주는 public.list_org_staff(org_id) 형태의
-- SECURITY DEFINER RPC를 따로 만든다. phone은 계속 원장/본인만 본다.

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by self colleagues and soyes admin"
on public.profiles;
drop policy if exists "profiles readable by self director and soyes admin"
on public.profiles;

create policy "profiles readable by self director and soyes admin"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_soyes_admin())
    or private.is_director_of_user_org(user_id)
  );

drop policy if exists "profiles insert self" on public.profiles;

create policy "profiles insert self"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "profiles update self" on public.profiles;

create policy "profiles update self"
  on public.profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE Policy 없음 — 프로필은 auth.users 삭제 시 cascade로만 사라진다.


-- =========================================================
-- 9. RLS — organization_members
-- =========================================================
-- 이 테이블이 기관 격리의 심장이다.
-- 여기 Policy에서 쓰는 has_org_role / is_soyes_admin은 전부 SECURITY DEFINER라
-- organization_members를 다시 읽어도 재귀하지 않는다.
--
-- ★ 쓰기(INSERT/UPDATE)는 이번 Phase에서 SOYES 운영자만 가능하다.
--   원장 초대 / 교사 초대 / 구성원 관리 UI가 아직 없는데 원장에게 쓰기를 열면
--   API를 직접 호출해 teacher → director 승격, 새 director 생성,
--   다른 director의 role/status 변경이 가능해진다.
--   후속 "Teacher Invite Phase"에서 원장에게 다음만 별도로 안전하게 허용한다.
--     - role = 'teacher'인 행의 추가
--     - role = 'teacher'인 행의 status 변경(active <-> disabled)
--   그때는 role 값까지 검증하는 별도 Policy 또는 전용 RPC로 구현한다.

alter table public.organization_members enable row level security;

drop policy if exists "members readable by self org staff and soyes admin"
on public.organization_members;
drop policy if exists "members readable by self director and soyes admin"
on public.organization_members;

-- 교사는 자기 소속 행만 본다("필요한 범위").
-- 자기 행은 기관 정지 여부와 무관하게 보인다. 다른 기관 정보가 새지 않으면서,
-- 앱이 "계정은 있으나 기관이 비활성"인 상태를 사용자에게 안내할 수 있게 하기 위한 의도적 예외다.
create policy "members readable by self director and soyes admin"
  on public.organization_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
  );

-- 구성원 추가는 SOYES 운영자만.
drop policy if exists "members insert by soyes admin or director"
on public.organization_members;
drop policy if exists "members insert by soyes admin"
on public.organization_members;

create policy "members insert by soyes admin"
  on public.organization_members
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));

-- 역할/상태 변경도 SOYES 운영자만.
-- 교사는 자기 행을 읽을 수만 있고 role을 스스로 올릴 수 없다.
-- 원장도 이번 Phase에서는 구성원 role/status를 바꿀 수 없다.
drop policy if exists "members update by soyes admin or director"
on public.organization_members;
drop policy if exists "members update by soyes admin"
on public.organization_members;

create policy "members update by soyes admin"
  on public.organization_members
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));

-- DELETE Policy 없음 — 퇴사/해지는 status = 'disabled'로 처리한다.


-- =========================================================
-- 10. (선택) auth.users → profiles 자동 생성
-- =========================================================
-- 이 섹션은 제거해도 나머지 설계는 그대로 동작합니다.
-- 다만 organization_members.user_id가 profiles를 참조하므로,
-- 이 트리거가 없으면 구성원 추가 전에 profiles 행을 반드시 먼저 만들어야 합니다.
--
-- 트리거가 실패하면 사용자 생성 자체가 실패하므로 로직을 최소로 유지하고
-- on conflict do nothing으로 재실행에도 안전하게 만든다.
-- display_name은 NOT NULL이므로 3단계 fallback으로 반드시 값을 채운다.
--   1) raw_user_meta_data->>'display_name'
--   2) 이메일 로컬파트 (email이 null이거나 비면 건너뜀)
--   3) '이름 미설정'

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '이름 미설정'
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_auth_user()
from public, anon, authenticated;

drop trigger if exists trg_auth_user_created on auth.users;

create trigger trg_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_auth_user();


-- 이미 존재하는 사용자(현재 SOYES 관리자 계정 포함) 백필.
-- 트리거는 신규 INSERT에만 반응하므로 기존 계정은 여기서 한 번 채운다.
insert into public.profiles (user_id, display_name)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    '이름 미설정'
  )
from auth.users u
on conflict (user_id) do nothing;
