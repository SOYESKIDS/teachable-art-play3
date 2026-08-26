-- =========================================================
-- SERVICE-06A — 실제 수업 실행 단위 (Class Session) Foundation
-- =========================================================
--
-- 이 Migration이 만드는 것은 딱 하나다.
--
--   "어느 기관의 어느 반이, 어느 프로그램 배정을 통해,
--    어느 차시를 실제로 실행하는가"
--
-- 즉 커리큘럼(설계)과 배정(계약)을 잇는 마지막 단계인 "수업 실행"의 뼈대다.
--
-- ★ 이번 단계에 넣지 않는 것 (의도적)
--   출결 / 아동별 참여도 / 관찰 기록 / 교사 메모 / AI 분석 / 성장평가 / 사진·영상.
--   전부 후속 SERVICE에서 별도 테이블로 설계한다.
--   여기에 child_id나 자유서술 메모를 두면 이 테이블이 곧바로 민감정보 테이블이 되고,
--   그 순간 RLS 난이도와 사고 반경이 함께 커진다. 실행 단위만 남긴다.
--
-- ★ week_no / session_no / lesson_title을 저장하지 않는 것도 의도적이다.
--   전부 curriculum_lessons에 이미 있다. lesson_id로 조회한다.
--   복제해 두면 커리큘럼을 고쳤을 때 과거 수업이 조용히 어긋난다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260815 : private.set_updated_at() · private.is_soyes_admin() · private.has_org_role()
--   20260824 : private.is_class_teacher() · classes UNIQUE(id, organization_id)
--   20260825 : private.is_published_program() · private.is_published_lesson() · private.is_active_class()
--
-- 새로 추가하는 것
--   private.is_active_assignment()          — 배정이 운영 중인지 (RLS INSERT용)
--   private.is_assigned_class_teacher()     — 보관된 반의 이력까지 볼 수 있는 교사 판정 (RLS SELECT/UPDATE용)
--   private.enforce_class_session_insert()  — 신규 수업의 도메인 조건 (trigger 전용)
--   private.enforce_class_session_update()  — 구조 컬럼 불변 · 상태 전이 · 예정일 규칙 (trigger 전용)
--
-- ★ 교사 판정 helper를 두 개로 나눈 이유
--   is_class_teacher()      = "지금 운영 중인 반의 담당 교사"  → 새 수업을 여는 자격
--   is_assigned_class_teacher() = "그 반에 배정된 교사"        → 지난 수업을 보고 정리하는 자격
--   반이 보관되면 새 수업은 못 열지만, 자기가 하던 수업을 마무리할 길은 남겨야 한다.


-- =========================================================
-- 1. FK 대상용 UNIQUE 보강
-- =========================================================
-- class_sessions는 단일 FK 다섯 개로 끝내지 않는다.
-- "A원 반 + B원 배정" 또는 "P프로그램 배정 + Q프로그램 차시" 같은 조합이
-- 애초에 INSERT되지 않도록 복합 FK로 묶는다. 그러려면 참조 대상 쪽에
-- 그 컬럼 조합의 UNIQUE가 있어야 한다.
--
-- classes에는 20260824가 만들어 둔 UNIQUE(id, organization_id)가 이미 있어 그대로 쓴다.
-- 나머지 둘은 여기서 보강한다. 값이 중복될 수 없는 조합(선두가 PK)이라
-- 기존 데이터가 있어도 항상 성공한다.
--
-- add constraint에는 if not exists가 없어 pg_constraint를 직접 확인한다.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'class_program_assignments_id_org_class_program_key'
  ) then
    alter table public.class_program_assignments
      add constraint class_program_assignments_id_org_class_program_key
      unique (id, organization_id, class_id, program_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'curriculum_lessons_id_program_key'
  ) then
    alter table public.curriculum_lessons
      add constraint curriculum_lessons_id_program_key
      unique (id, program_id);
  end if;
end $$;


-- =========================================================
-- 2. public.class_sessions — 수업 실행 단위
-- =========================================================

create table if not exists public.class_sessions (

  id uuid primary key default gen_random_uuid(),

  -- 아래 복합 FK들이 이 세 컬럼을 배정/반과 강제로 일치시킨다.
  -- 단독 FK를 따로 걸지 않는 이유: 복합 FK가 이미 상위 무결성을 전부 함의한다.
  organization_id uuid not null,
  class_id uuid not null,
  class_program_assignment_id uuid not null,
  program_id uuid not null,
  lesson_id uuid not null,

  -- 수업 예정일. 배정 시점에 날짜가 안 정해졌을 수 있어 nullable이다.
  -- 실제 진행일이 아니라 "예정일"이다. 진행 시각 기록은 후속 단계에서 다룬다.
  scheduled_date date,

  -- scheduled   : 예정
  -- in_progress : 진행 중
  -- completed   : 완료      (terminal)
  -- cancelled   : 취소      (terminal)
  status text not null default 'scheduled'
    constraint class_sessions_status_check
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ★ (1) 반은 반드시 이 기관의 반이어야 한다.
  --   20260824의 classes UNIQUE(id, organization_id)를 참조한다.
  --   아래 (2)가 사실상 이 조건을 함의하지만, 배정 쪽 제약이 나중에 느슨해지더라도
  --   "반과 기관은 항상 같이 간다"는 불변식이 살아남도록 명시적으로 남긴다.
  constraint class_sessions_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict,

  -- ★ (2) 기관·반·프로그램이 전부 그 배정의 것과 같아야 한다.
  --   이 네 컬럼 복합 FK 하나로 "다른 기관 배정", "다른 반 배정",
  --   "배정과 다른 프로그램" 세 가지 조작이 한꺼번에 막힌다.
  --   RLS를 우회하는 service_role·직접 SQL·superuser도 위반할 수 없다.
  constraint class_sessions_assignment_fk
    foreign key (class_program_assignment_id, organization_id, class_id, program_id)
    references public.class_program_assignments (id, organization_id, class_id, program_id)
    on delete restrict,

  -- ★ (3) 차시는 반드시 그 프로그램의 차시여야 한다.
  --   program_id가 (2)에 의해 배정의 프로그램으로 고정되므로,
  --   결과적으로 "배정된 프로그램의 차시"만 실행할 수 있다.
  constraint class_sessions_lesson_fk
    foreign key (lesson_id, program_id)
    references public.curriculum_lessons (id, program_id)
    on delete restrict
);


-- ★ 같은 배정의 같은 차시가 동시에 두 번 열려 있을 수 없다.
--
--   'scheduled' / 'in_progress'만 대상으로 하는 partial unique다.
--   completed / cancelled가 되면 같은 차시를 다시 열 수 있다
--   (1주차 1차시를 완료한 뒤 보충수업으로 다시 잡는 운영이 실제로 있다).
--   전체 unique로 만들면 그 재수업이 영원히 불가능해진다.
create unique index if not exists class_sessions_open_assignment_lesson_key
  on public.class_sessions (class_program_assignment_id, lesson_id)
  where status in ('scheduled', 'in_progress');


-- 조회 index — 실제 화면 질의 패턴만 덮는다.
--   기관 상세 / 원장 대시보드 : 기관 + 날짜순
--   반별 수업 목록            : 반 + 날짜순  (교사 RLS의 class_id 조회도 이 index가 받는다)
--   배정 상세                 : 배정별 전체 이력 (위 partial unique는 열린 행만 담아 대체 불가)
--   차시 역참조               : "이 차시를 실제로 몇 번 운영했는가"
-- status 단독 index는 만들지 않는다. 카디널리티가 낮고 항상 다른 조건과 함께 쓰인다.
create index if not exists class_sessions_org_scheduled_date_idx
  on public.class_sessions (organization_id, scheduled_date desc);

create index if not exists class_sessions_class_scheduled_date_idx
  on public.class_sessions (class_id, scheduled_date desc);

create index if not exists class_sessions_assignment_idx
  on public.class_sessions (class_program_assignment_id);

create index if not exists class_sessions_lesson_idx
  on public.class_sessions (lesson_id);


-- updated_at — 20260815의 공용 함수를 그대로 쓴다. 같은 기능을 새로 만들지 않는다.
drop trigger if exists trg_class_sessions_updated_at on public.class_sessions;

create trigger trg_class_sessions_updated_at
before update on public.class_sessions
for each row
execute function private.set_updated_at();


-- =========================================================
-- 3. Helper — 배정이 운영 중인가?
-- =========================================================
-- 20260825의 is_active_class / is_published_program / is_published_lesson과 같은 결의 함수다.
-- INSERT Policy에서 호출자 권한으로 평가되므로 authenticated에 execute를 준다.

create or replace function private.is_active_assignment(p_assignment_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_program_assignments a
    where a.id = p_assignment_id
      and a.status = 'active'
  );
$$;

revoke execute on function private.is_active_assignment(uuid) from public;
grant execute on function private.is_active_assignment(uuid) to authenticated;


-- =========================================================
-- 3-2. Helper — 이 반에 배정된 교사인가? (반의 보관 여부와 무관)
-- =========================================================
-- 20260824의 private.is_class_teacher()와 딱 한 조건만 다르다: classes.status를 보지 않는다.
--
-- 기존 helper를 느슨하게 고치지 않고 새로 만드는 이유
--   is_class_teacher()는 이미 다른 기능에서 "지금 운영 중인 반의 담당 교사"라는 뜻으로 쓰이고 있다.
--   그 의미를 넓히면 그쪽 판정까지 조용히 함께 넓어진다. 의미가 다르면 함수도 나눈다.
--
-- 반이 보관되어도 유지하는 조건 (하나라도 깨지면 false)
--   - 그 반이 실제로 존재한다
--   - 그 반에 대한 class_teachers 배정이 남아 있다   ← 배정이 해제되면 접근도 끊긴다
--   - 그 배정의 구성원이 지금 로그인한 사용자다
--   - 그 구성원이 role=teacher이고 status=active다
--   - 그 기관 자체가 active다                        ← 타 기관/정지 기관은 여전히 차단
create or replace function private.is_assigned_class_teacher(p_class_id uuid)
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
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'teacher'
      and o.status = 'active'
  );
$$;

revoke execute on function private.is_assigned_class_teacher(uuid) from public;
grant execute on function private.is_assigned_class_teacher(uuid) to authenticated;


-- =========================================================
-- 4. 신규 수업의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- 아래 INSERT Policy에도 같은 조건을 걸어 두지만, 이 trigger가 최종 판정자다.
-- RLS는 service_role과 superuser를 통과시키는 반면 trigger는 통과시키지 않는다.
-- "Admin이라고 해서 draft 차시를 수업으로 만들 수 있으면 안 된다"는 규칙은
-- 권한 계층이 아니라 도메인 규칙이라 여기에 둔다.
--
-- lesson이 program에 속하는지는 복합 FK가 이미 강제하므로 다시 확인하지 않는다.

create or replace function private.enforce_class_session_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.class_program_assignments a
    where a.id = new.class_program_assignment_id
      and a.status = 'active'
  ) then
    raise exception
      '운영 중인 배정에만 수업을 만들 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from public.classes c
    where c.id = new.class_id
      and c.status = 'active'
  ) then
    raise exception
      '운영 중인 반에만 수업을 만들 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from public.curriculum_programs p
    where p.id = new.program_id
      and p.status = 'published'
  ) then
    raise exception
      '게시된 프로그램만 수업으로 실행할 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from public.curriculum_lessons l
    where l.id = new.lesson_id
      and l.status = 'published'
  ) then
    raise exception
      '게시된 차시만 수업으로 실행할 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  -- 신규 수업은 항상 예정 상태로 시작한다.
  -- 처음부터 완료/취소로 만들어진 수업은 실행 이력으로서 의미가 없다.
  if new.status <> 'scheduled' then
    raise exception
      '새 수업은 예정(scheduled) 상태로만 만들 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- trigger 전용이라 client가 직접 호출할 일이 없다. execute를 아무에게도 주지 않는다.
revoke execute on function private.enforce_class_session_insert()
from public, anon, authenticated;

drop trigger if exists trg_class_sessions_insert_check on public.class_sessions;

create trigger trg_class_sessions_insert_check
before insert on public.class_sessions
for each row
execute function private.enforce_class_session_insert();


-- =========================================================
-- 5. 기존 수업의 변경 규칙 (BEFORE UPDATE)
-- =========================================================
-- ★ "정리(close)"와 "재개(restart)"를 구분한다. 이 구분이 이 trigger의 핵심이다.
--
--   정리 — completed / cancelled 로 보내는 전이
--     부모 상태를 묻지 않는다. 반이 보관되거나, 프로그램·차시가 archived 되거나,
--     배정이 completed/cancelled 되어도 이미 열린 수업은 반드시 마무리할 수 있어야 한다.
--     여기에 조건을 걸면 부모가 먼저 정리된 순간 자식 수업이 영구 미결로 남는다.
--
--   재개 — 수업을 실제로 "진행"시키거나 앞으로의 일정을 다시 잡는 행위
--     scheduled -> in_progress, 그리고 scheduled_date 변경이 여기 해당한다.
--     이때는 부모가 지금도 유효해야 한다. 이미 끝난 배정이나 보관된 반에서
--     수업을 새로 시작하거나 앞날의 일정을 잡는 것은 운영상 말이 되지 않는다.
--     INSERT를 막아 두고 이 경로를 열어 두면 "예정 행을 미리 만들어 두었다가
--     배정 종료 후 진행"하는 우회로가 생긴다.
--
--   부모 검증은 20260825의 helper를 그대로 재사용한다.
--   판정 기준은 반드시 old.* — 구조 컬럼은 위에서 불변으로 막았고,
--   client가 보낸 값이 아니라 저장된 행의 소속으로 확인해야 하기 때문이다.

create or replace function private.enforce_class_session_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_needs_parent_check boolean;
begin
  -- (1) 구조 컬럼은 생성 후 불변이다.
  --     GRANT에서도 UPDATE 대상에서 빼 두었지만, GRANT는 authenticated에만 적용된다.
  --     service_role이나 직접 SQL로 수업의 소속을 바꿔치기하는 경로까지 여기서 막는다.
  if new.organization_id is distinct from old.organization_id
    or new.class_id is distinct from old.class_id
    or new.class_program_assignment_id is distinct from old.class_program_assignment_id
    or new.program_id is distinct from old.program_id
    or new.lesson_id is distinct from old.lesson_id
    or new.created_at is distinct from old.created_at
  then
    raise exception
      '수업의 기관·반·배정·프로그램·차시는 변경할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (2) 완료·취소는 종착 상태다. 어떤 컬럼도 더 이상 바뀌지 않는다.
  --     완료 -> 취소 같은 "정정"도 막는다. 기록을 고치는 대신 새 수업을 만든다.
  if old.status in ('completed', 'cancelled') then
    raise exception
      '완료 또는 취소된 수업은 변경할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (3) 허용 전이만 통과시킨다.
  --     scheduled   -> scheduled / in_progress / completed / cancelled
  --     in_progress -> in_progress / completed / cancelled
  --     (in_progress -> scheduled 되돌리기는 허용하지 않는다.)
  if not (
    (old.status = 'scheduled'
      and new.status in ('scheduled', 'in_progress', 'completed', 'cancelled'))
    or (old.status = 'in_progress'
      and new.status in ('in_progress', 'completed', 'cancelled'))
  ) then
    raise exception
      '허용되지 않는 수업 상태 변경입니다. (% -> %)', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- (4) 예정일은 아직 시작하지 않은 수업에서만 고칠 수 있다.
  --     수업이 시작된 뒤에 예정일을 바꾸면 "언제 하기로 했었는가"가 사라진다.
  if old.status <> 'scheduled'
    and new.scheduled_date is distinct from old.scheduled_date
  then
    raise exception
      '시작된 수업의 예정일은 변경할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (5) 재개 경로에서만 부모 유효성을 확인한다.
  --     completed / cancelled 로 가는 정리 경로는 여기에 걸리지 않는다.
  v_needs_parent_check :=
    (old.status = 'scheduled' and new.status = 'in_progress')
    or (
      old.status = 'scheduled'
      and new.scheduled_date is distinct from old.scheduled_date
    );

  if v_needs_parent_check then
    -- 어느 부모가 걸렸는지 알 수 있도록 하나씩 확인한다.
    if not private.is_active_assignment(old.class_program_assignment_id) then
      raise exception
        '종료된 배정의 수업은 진행하거나 일정을 변경할 수 없습니다. 예정일은 그대로 두고 완료 또는 취소로 정리해주세요.'
        using errcode = 'check_violation';
    end if;

    if not private.is_active_class(old.class_id) then
      raise exception
        '보관된 반의 수업은 진행하거나 일정을 변경할 수 없습니다. 예정일은 그대로 두고 완료 또는 취소로 정리해주세요.'
        using errcode = 'check_violation';
    end if;

    if not private.is_published_program(old.program_id) then
      raise exception
        '게시 중이 아닌 프로그램의 수업은 진행하거나 일정을 변경할 수 없습니다. 예정일은 그대로 두고 완료 또는 취소로 정리해주세요.'
        using errcode = 'check_violation';
    end if;

    -- is_published_lesson()은 차시와 그 프로그램의 published를 함께 확인한다.
    if not private.is_published_lesson(old.lesson_id) then
      raise exception
        '게시 중이 아닌 차시의 수업은 진행하거나 일정을 변경할 수 없습니다. 예정일은 그대로 두고 완료 또는 취소로 정리해주세요.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_class_session_update()
from public, anon, authenticated;

drop trigger if exists trg_class_sessions_update_check on public.class_sessions;

create trigger trg_class_sessions_update_check
before update on public.class_sessions
for each row
execute function private.enforce_class_session_update();


-- =========================================================
-- 6. GRANT — 컬럼 단위 최소 권한
-- =========================================================
-- 기존 Migration과 같은 방식이다.
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
--
-- ★ DELETE 권한을 주지 않는다. 아래에서 DELETE Policy도 만들지 않는다.
--   잘못 잡힌 수업도 지우지 않고 cancelled로 남긴다.
--   "그날 수업이 왜 없었는가"는 나중에 반드시 필요한 정보다.

revoke all on public.class_sessions from anon, authenticated;

grant select on public.class_sessions to authenticated;

-- status는 INSERT에는 열어 두되 trigger가 'scheduled'만 허용한다.
-- (컬럼을 아예 막으면 default에 의존해야 해서 client 코드가 더 불투명해진다.)
grant insert (
  organization_id,
  class_id,
  class_program_assignment_id,
  program_id,
  lesson_id,
  scheduled_date,
  status
) on public.class_sessions to authenticated;

-- ★ UPDATE는 예정일과 상태 둘뿐이다.
--   구조 컬럼과 created_at은 여기서 빠져 있고, 위 trigger가 한 번 더 막는다.
grant update (scheduled_date, status)
on public.class_sessions to authenticated;


-- =========================================================
-- 7. RLS
-- =========================================================
-- anon        : 0건 (위 revoke로 권한 자체가 없고, Policy도 authenticated 전용이다)
-- SOYES 운영자 : 전 기관 조회 / 생성 / 변경
-- 원장        : 자기 활성 기관의 수업만
-- 교사        : 자기가 담당하는 반의 수업만
--
-- ★ 교사 판정 helper를 동작별로 나눠 쓴다.
--   SELECT / UPDATE : private.is_assigned_class_teacher()  — 반이 보관되어도 유지
--   INSERT          : private.is_class_teacher()           — 운영 중인 반에서만
--   두 helper 모두 기관 active · membership active · role=teacher를 확인하므로
--   타 기관 접근과 배정 해제 뒤 접근은 어느 쪽으로도 열리지 않는다.

alter table public.class_sessions enable row level security;


-- 교사가 담당했던 반이 나중에 보관되어도 그 반의 수업 이력은 계속 볼 수 있어야 한다.
-- 지난 학기 기록이 교사 화면에서 갑자기 사라지면 "내가 뭘 했는지"를 확인할 길이 없어진다.
drop policy if exists "class sessions readable by org staff and soyes admin"
on public.class_sessions;

create policy "class sessions readable by org staff and soyes admin"
  on public.class_sessions
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- ★ 신규 수업의 조건 = 권한 + 도메인
--
--   1. 운영자이거나, 그 기관의 활성 원장이거나, 그 반의 담당 교사일 것
--      ★ 여기서만 is_class_teacher()를 쓴다 — 보관된 반에는 새 수업을 열 수 없어야 하므로
--        historical helper로 바꾸면 안 된다.
--   2. 배정이 운영 중(active)일 것
--   3. 반이 운영 중(active)일 것
--   4. 프로그램이 published이고 차시도 published일 것
--
--   2~4는 운영자에게도 똑같이 적용한다. "콘텐츠를 다듬는 일"과
--   "실제 수업을 여는 일"을 분리하기 위해서다.
--   is_published_lesson()은 차시와 그 프로그램의 published를 함께 확인하므로
--   프로그램만 published이고 차시가 draft인 조합도 여기서 걸린다.
--
--   기관·반·프로그램 일치는 복합 FK가 구조적으로 강제하므로 Policy에서 다시 검사하지 않는다.
--   같은 조건이 BEFORE INSERT trigger에도 있다 — 그쪽이 service_role까지 덮는 최종 방어선이고,
--   여기는 권한 계층에서 미리 걸러 주는 1차 방어선이다.
drop policy if exists "class sessions insert by org staff or soyes admin"
on public.class_sessions;

create policy "class sessions insert by org staff or soyes admin"
  on public.class_sessions
  for insert
  to authenticated
  with check (
    (
      (select private.is_soyes_admin())
      or private.has_org_role(organization_id, array['director'])
      or private.is_class_teacher(class_id)
    )
    and private.is_active_assignment(class_program_assignment_id)
    and private.is_active_class(class_id)
    and private.is_published_program(program_id)
    and private.is_published_lesson(lesson_id)
  );


-- ★ UPDATE Policy는 "누가" 만질 수 있는지만 본다.
--
--   부모 유효성 조건을 여기 걸지 않는 이유는 정리(completed/cancelled)까지 함께 막히기 때문이다.
--   "재개(scheduled -> in_progress, 예정일 변경)에는 부모가 유효해야 한다"는 규칙은
--   BEFORE UPDATE trigger가 전이 종류를 구분해서 판정한다.
--   Policy에서 구분하려면 OLD/NEW를 함께 봐야 하는데 RLS는 그럴 수 없다.
--
--   바꿀 수 있는 컬럼은 GRANT가 scheduled_date / status로 이미 좁혀 두었다.
--
--   교사는 historical helper를 쓴다. 반이 보관된 뒤에도 자기가 열어 둔 수업을
--   완료/취소로 마무리할 수 있어야 하기 때문이다(신규 생성은 위 INSERT Policy가 막는다).
drop policy if exists "class sessions update by org staff or soyes admin"
on public.class_sessions;

create policy "class sessions update by org staff or soyes admin"
  on public.class_sessions
  for update
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  )
  with check (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- DELETE Policy 없음 — 수업은 삭제하지 않고 cancelled로 처리한다.
-- 어느 반이 어느 차시를 언제 실행했는지(또는 취소했는지)는 계속 남아 있어야 한다.


-- =========================================================
-- 상태 되돌리기에 대한 메모
-- =========================================================
--   completed / cancelled -> 다른 상태로의 전이는 위 trigger가 막는다.
--   20260825의 class_program_assignments가 "DB는 막지 않고 Server Action이 담당한다"로
--   둔 것과 달리, 여기서는 trigger로 DB에서 직접 막는다.
--
--   차이를 둔 이유: 수업은 배정보다 행 수가 훨씬 많고,
--   앞으로 교사 화면 · 원장 화면 · 배치 작업 등 쓰기 경로가 여러 갈래로 늘어난다.
--   경로마다 같은 규칙을 반복 구현하면 언젠가 한 곳이 빠진다.
--   partial unique만으로는 completed -> scheduled 되돌리기를 막을 수 없다
--   (열린 행이 없으면 unique에 걸리지 않는다).
