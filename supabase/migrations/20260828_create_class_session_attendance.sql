-- =========================================================
-- SERVICE-07A — 수업별 원아 출결 (Class Session Attendance) Foundation
-- =========================================================
--
-- 이 Migration이 저장하는 것은 딱 한 문장이다.
--
--   "이 수업에 이 원아가 어떤 출결 상태였는가"
--
-- ★ 이번 단계에 넣지 않는 것 (의도적)
--   심리 진단 · 감정 상태 · 자유 관찰 메모 · 행동 평가 ·
--   사진 · 영상 · 음성 · AI 점수 · 의료 정보 · 보호자 정보 · 결석 사유 텍스트.
--   전부 후속 SERVICE에서 별도 테이블로 설계한다.
--   아동 데이터라 최소 수집 원칙을 가장 강하게 적용한다 —
--   저장하는 아동 관련 값은 child_id와 attendance_status 둘뿐이다.
--
-- ★ child_name / class_name / lesson_title 같은 텍스트 snapshot도 넣지 않는다.
--   이름은 children/classes에서 관계로 읽는다. 복제하면 원아 이름을 고쳤을 때
--   과거 출결이 조용히 어긋난다. (20260827이 staff historical read를 이미 열어 두었다.)
--
-- =========================================================
-- 이 설계에서 가장 중요한 판단: "원아의 반 이동"
-- =========================================================
--   children.class_id는 변경 가능하다 (20260824의 grant update에 class_id가 있다).
--   즉 햇살반에서 수업을 듣던 원아가 나중에 별님반으로 옮겨갈 수 있다.
--
--   그래서 attendance.class_id를 children(id, class_id)로 FK 걸면 안 된다.
--   FK는 "지금도 참"을 요구하므로, 원아가 반을 옮기는 순간 그 UPDATE 자체가
--   과거 출결 행 때문에 막힌다. 출결을 남긴 원아는 영원히 반을 못 옮기게 된다.
--
--   따라서 두 가지를 분리한다.
--     신규 기록 시점 : "지금 이 원아가 이 반 소속인가"를 trigger가 확인한다 (시점 검사)
--     그 이후        : attendance.class_id가 당시 소속을 그대로 보존한다 (스냅샷 역할)
--   반 이동은 자유롭게 되고, 과거 출결은 어느 반 수업이었는지 그대로 남는다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260815 : private.set_updated_at() · private.has_org_role()
--   20260813 : private.is_soyes_admin()
--   20260824 : private.is_class_teacher()          — "지금 운영 중인 반의 담당 교사"
--   20260826 : private.is_assigned_class_teacher() — "그 반에 배정된 교사"(보관돼도 유지)
--
-- 새로 추가하는 것
--   private.is_recordable_session()                   — 출결을 쓸 수 있는 수업 상태인가
--   private.enforce_attendance_insert()               — 신규 기록의 도메인 조건 (trigger 전용)
--   private.enforce_attendance_update()               — 구조 컬럼 불변 · 취소 수업 동결 (trigger 전용)


-- =========================================================
-- 0. RLS 재귀에 대한 메모
-- =========================================================
-- 아래 helper는 SECURITY DEFINER이므로 소유자(postgres) 권한으로 실행되고,
-- 소유자는 RLS를 우회한다(force row level security가 꺼져 있을 때만).
-- 이 프로젝트는 전 migration에서 force RLS를 명시적으로 금지하고 있고 실제로 0건이다.
-- 따라서 is_recordable_session()이 class_sessions를 읽어도
-- class_sessions Policy가 다시 평가되지 않는다 — 순환이 생기지 않는다.
--
-- ※ 앞으로도 이 테이블들에 force row level security를 켜지 마라.


-- =========================================================
-- 1. FK 대상용 UNIQUE 보강
-- =========================================================
-- 출결의 기관·반이 수업의 것과 어긋날 수 없도록 복합 FK로 묶는다.
-- 그러려면 참조 대상 쪽에 그 컬럼 조합의 UNIQUE가 있어야 한다.
-- 둘 다 선두가 PK라 값이 중복될 수 없고, 기존 데이터가 있어도 항상 성공한다.
--
-- add constraint에는 if not exists가 없어 pg_constraint를 직접 확인한다.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'class_sessions_id_org_class_key'
  ) then
    alter table public.class_sessions
      add constraint class_sessions_id_org_class_key
      unique (id, organization_id, class_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'children_id_org_key'
  ) then
    alter table public.children
      add constraint children_id_org_key
      unique (id, organization_id);
  end if;
end $$;


-- =========================================================
-- 2. public.class_session_attendance
-- =========================================================

create table if not exists public.class_session_attendance (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_session_id uuid not null,

  -- ★ 기록 당시의 반. children.class_id의 사본이 아니라 "이 수업의 반"이다.
  --   아래 복합 FK가 수업의 class_id와 일치하도록 강제하므로 임의 값이 들어갈 수 없다.
  --   원아가 나중에 반을 옮겨도 이 값은 그대로 남아 과거 소속을 보존한다.
  class_id uuid not null,

  child_id uuid not null,

  -- present     : 출석
  -- absent      : 결석
  -- late        : 지각
  -- left_early  : 조퇴
  --
  -- 사유 세분화(병결/가정사정/휴가)와 자유 텍스트는 이번 단계에 넣지 않는다.
  -- 사유는 곧 개인정보가 되고, 한 번 열면 되돌리기 어렵다.
  attendance_status text not null
    constraint class_session_attendance_status_check
    check (attendance_status in ('present', 'absent', 'late', 'left_early')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ★ (1) 기관·반이 그 수업의 것과 반드시 같아야 한다.
  --   class_sessions의 구조 컬럼은 20260826 trigger가 불변으로 막아 두었으므로
  --   이 참조는 시간이 지나도 흔들리지 않는다.
  --   "A반 수업 + B반 출결" 같은 조합은 어떤 경로로도 INSERT되지 않는다
  --   (RLS를 우회하는 service_role·직접 SQL·superuser도 위반할 수 없다).
  constraint class_session_attendance_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- ★ (2) 원아는 반드시 같은 기관의 원아여야 한다.
  --   children.organization_id는 UPDATE GRANT에 없어 사실상 불변이라 이 참조도 안정적이다.
  --
  --   여기서 (child_id, class_id) → children(id, class_id)로 걸지 않는 것이 핵심이다.
  --   그렇게 하면 원아가 반을 옮기는 순간 과거 출결 때문에 이동 자체가 막힌다.
  --   "이 원아가 이 반 소속인가"는 아래 BEFORE INSERT trigger가 기록 시점에만 확인한다.
  constraint class_session_attendance_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  -- ★ (3) 한 수업에서 한 원아의 출결은 하나뿐이다.
  --   동시에 두 번 저장해도 중복 행이 생기지 않는다.
  --   이 UNIQUE가 만드는 index가 class_session_id 선행 조회
  --   ("이 수업의 출결 명단")도 함께 커버하므로 세션 단독 index는 만들지 않는다.
  constraint class_session_attendance_session_child_key
    unique (class_session_id, child_id)
);


-- 조회 index — 실제 화면 질의만 덮는다.
--   원아별 출결 이력  : "이 아이가 언제 결석했는가"
--   반별 출결 집계    : 교사·원장 화면의 반 단위 조회
-- organization_id 단독 index는 만들지 않는다 — 기관 전체 출결을 한 번에 훑는
-- 화면이 아직 없고, 실제 조회는 수업 또는 반을 거쳐 들어온다.
create index if not exists class_session_attendance_child_idx
  on public.class_session_attendance (child_id);

create index if not exists class_session_attendance_class_idx
  on public.class_session_attendance (class_id);


-- updated_at — 20260815의 공용 함수를 그대로 쓴다. 같은 기능을 새로 만들지 않는다.
drop trigger if exists trg_class_session_attendance_updated_at
on public.class_session_attendance;

create trigger trg_class_session_attendance_updated_at
before update on public.class_session_attendance
for each row
execute function private.set_updated_at();


-- =========================================================
-- 3. Helper — 출결을 쓸 수 있는 수업 상태인가?
-- =========================================================
-- scheduled   : 수업 전 미리 출석을 체크하는 운영이 실제로 있다 → 허용
-- in_progress : 수업 중 기록 → 허용
-- completed   : 수업 직후 정리하거나 빠뜨린 항목을 채운다 → 허용
-- cancelled   : 하지 않은 수업이다. 새 출결도, 기존 출결 정정도 막는다 → 차단
--
-- 취소 수업을 동결하는 이유
--   취소된 수업의 출결은 의미가 없다. 되살릴 방법도 없다(terminal).
--   "하지 않은 수업의 출결을 고친다"는 흐름을 열어 두면 기록의 뜻이 흐려진다.
--   취소 전에 잘못 넣은 행이 있더라도 그 자체가 "그때 이렇게 입력했다"는 사실이므로
--   지우거나 고치지 않고 그대로 남긴다. 조회는 계속 가능하다.
create or replace function private.is_recordable_session(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_sessions s
    where s.id = p_session_id
      and s.status in ('scheduled', 'in_progress', 'completed')
  );
$$;

revoke execute on function private.is_recordable_session(uuid) from public;
grant execute on function private.is_recordable_session(uuid) to authenticated;


-- =========================================================
-- 4. 신규 출결의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- 아래 INSERT Policy에도 같은 조건을 걸지만, 이 trigger가 최종 판정자다.
-- RLS는 service_role과 superuser를 통과시키는 반면 trigger는 통과시키지 않는다.

create or replace function private.enforce_attendance_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (1) 취소된 수업에는 새 출결을 만들지 않는다.
  if not exists (
    select 1
    from public.class_sessions s
    where s.id = new.class_session_id
      and s.status in ('scheduled', 'in_progress', 'completed')
  ) then
    raise exception
      '취소된 수업에는 출결을 새로 기록할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (2) ★ 이 원아가 "지금" 이 반 소속인가 — 시점 검사다.
  --     FK로 걸지 않는 이유는 파일 상단에 적어 두었다(반 이동이 막힌다).
  --     기관 일치는 복합 FK가 이미 강제하므로 여기서는 반만 본다.
  --
  --     children.status는 보지 않는다. 장기 결석(inactive) 상태의 원아야말로
  --     'absent'로 기록해야 하는 대상이고, 상태를 이유로 막으면 그 기록이 불가능해진다.
  if not exists (
    select 1
    from public.children c
    where c.id = new.child_id
      and c.class_id = new.class_id
  ) then
    raise exception
      '이 수업의 반에 속한 원아만 출결을 기록할 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- trigger 전용이라 client가 직접 호출할 일이 없다. execute를 아무에게도 주지 않는다.
revoke execute on function private.enforce_attendance_insert()
from public, anon, authenticated;

drop trigger if exists trg_class_session_attendance_insert_check
on public.class_session_attendance;

create trigger trg_class_session_attendance_insert_check
before insert on public.class_session_attendance
for each row
execute function private.enforce_attendance_insert();


-- =========================================================
-- 5. 기존 출결의 변경 규칙 (BEFORE UPDATE)
-- =========================================================
-- ★ 여기서는 "이 원아가 지금도 이 반인가"를 절대 다시 묻지 않는다.
--
--   원아는 학기 중에 반을 옮길 수 있다. 그 뒤에 과거 출결의 오타를 고치려 할 때
--   현재 소속을 요구하면 영영 고칠 수 없게 된다.
--   기록 시점의 검사는 INSERT에서 이미 끝났고, 여기서는 그 결과를 존중한다.
--   (20260826의 "정리 경로는 부모 상태를 묻지 않는다"와 같은 판단이다.)

create or replace function private.enforce_attendance_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (1) 구조 컬럼은 생성 후 불변이다. 바꿀 수 있는 값은 attendance_status 하나뿐이다.
  --     GRANT에서도 UPDATE 대상에서 빼 두었지만, GRANT는 authenticated에만 적용된다.
  --     service_role이나 직접 SQL로 출결의 소속을 바꿔치기하는 경로까지 여기서 막는다.
  if new.organization_id is distinct from old.organization_id
    or new.class_session_id is distinct from old.class_session_id
    or new.class_id is distinct from old.class_id
    or new.child_id is distinct from old.child_id
    or new.created_at is distinct from old.created_at
  then
    raise exception
      '출결의 수업·반·원아는 변경할 수 없습니다. 잘못 기록했다면 출결 상태만 정정해주세요.'
      using errcode = 'check_violation';
  end if;

  -- (2) 취소된 수업의 출결은 동결한다. 하지 않은 수업의 기록을 고치지 않는다.
  if not exists (
    select 1
    from public.class_sessions s
    where s.id = old.class_session_id
      and s.status in ('scheduled', 'in_progress', 'completed')
  ) then
    raise exception
      '취소된 수업의 출결은 변경할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_attendance_update()
from public, anon, authenticated;

drop trigger if exists trg_class_session_attendance_update_check
on public.class_session_attendance;

create trigger trg_class_session_attendance_update_check
before update on public.class_session_attendance
for each row
execute function private.enforce_attendance_update();


-- =========================================================
-- 6. GRANT — 컬럼 단위 최소 권한
-- =========================================================
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
--
-- ★ DELETE 권한을 주지 않는다. 아래에서 DELETE Policy도 만들지 않는다.
--   잘못 기록한 출결은 지우지 않고 attendance_status를 정정한다.
--   출결은 "그날 그 아이가 왔는가"에 대한 기록이라 삭제하면 확인할 방법이 사라진다.
--   class_sessions도 삭제 없는 구조이므로 FK는 전부 on delete restrict다.

revoke all on public.class_session_attendance from anon, authenticated;

grant select on public.class_session_attendance to authenticated;

grant insert (
  organization_id,
  class_session_id,
  class_id,
  child_id,
  attendance_status
) on public.class_session_attendance to authenticated;

-- ★ UPDATE는 출결 상태 하나뿐이다.
--   구조 컬럼과 created_at은 여기서 빠져 있고, 위 trigger가 한 번 더 막는다.
grant update (attendance_status)
on public.class_session_attendance to authenticated;


-- =========================================================
-- 7. RLS
-- =========================================================
-- anon        : 0건 (위 revoke로 권한 자체가 없고, Policy도 authenticated 전용이다)
-- SOYES 운영자 : 조회 / 기록 / 정정 (기관 운영 오류를 지원해야 한다. 삭제는 없다)
-- 원장        : 자기 활성 기관 범위에서 조회 / 기록 / 정정
-- 교사        : 조회·정정은 자기가 배정된 반, 신규 기록은 운영 중인 반에서만
--
-- ★ 교사 helper를 동작별로 나눠 쓴다 (20260826/20260827과 같은 기준)
--   SELECT / UPDATE : is_assigned_class_teacher() — 반이 보관되어도 과거 기록을 보고 정정
--   INSERT          : is_class_teacher()          — 운영 중인 반에서만 새로 기록
--   둘 다 기관 active · membership active · role=teacher를 확인하므로
--   타 기관 접근과 배정 해제 뒤 접근은 어느 쪽으로도 열리지 않는다.

alter table public.class_session_attendance enable row level security;


-- 지난 학기 기록이 교사 화면에서 사라지면 "내가 무엇을 기록했는지" 확인할 길이 없어진다.
drop policy if exists "attendance readable by org staff and soyes admin"
on public.class_session_attendance;

create policy "attendance readable by org staff and soyes admin"
  on public.class_session_attendance
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- ★ 신규 기록의 조건 = 권한 + 수업 상태
--
--   1. 운영자이거나, 그 기관의 활성 원장이거나, 그 반의 담당 교사일 것
--      ★ 교사는 여기서만 is_class_teacher()를 쓴다 — 과거에 담당했다는 이유만으로
--        보관된 반의 수업에 새 기록을 추가할 수 있으면 안 된다.
--        (원장·운영자는 보관 후 누락분을 채워 넣는 지원 역할이 있어 반 상태를 요구하지 않는다.)
--   2. 수업이 취소 상태가 아닐 것
--
--   기관·반 일치는 복합 FK가, 원아-반 소속은 BEFORE INSERT trigger가 강제하므로
--   Policy에서 다시 검사하지 않는다. trigger가 service_role까지 덮는 최종 방어선이고,
--   여기는 권한 계층에서 미리 걸러 주는 1차 방어선이다.
drop policy if exists "attendance insert by org staff or soyes admin"
on public.class_session_attendance;

create policy "attendance insert by org staff or soyes admin"
  on public.class_session_attendance
  for insert
  to authenticated
  with check (
    (
      (select private.is_soyes_admin())
      or private.has_org_role(organization_id, array['director'])
      or private.is_class_teacher(class_id)
    )
    and private.is_recordable_session(class_session_id)
  );


-- ★ 정정은 조회와 같은 범위로 연다.
--
--   반이 보관되거나 원아가 다른 반으로 옮겨간 뒤에도 과거 출결의 오타는 고칠 수 있어야 한다.
--   다만 class_teachers 배정이 제거되면 교사의 정정 권한도 함께 끊긴다
--   (is_assigned_class_teacher가 배정 행의 존재를 요구한다).
--
--   바꿀 수 있는 컬럼은 GRANT가 attendance_status로 좁혀 두었고,
--   취소 수업 동결은 BEFORE UPDATE trigger가 판정한다.
drop policy if exists "attendance update by org staff or soyes admin"
on public.class_session_attendance;

create policy "attendance update by org staff or soyes admin"
  on public.class_session_attendance
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


-- DELETE Policy 없음 — 출결은 삭제하지 않고 상태를 정정한다.
-- 어느 수업에 어느 원아가 어떤 상태였는지는 계속 남아 있어야 한다.


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.children              — 컬럼·GRANT·Policy 그대로. UNIQUE(id, organization_id)만 보강.
--   public.class_sessions        — 컬럼·GRANT·Policy·trigger 그대로.
--                                  UNIQUE(id, organization_id, class_id)만 보강.
--   그 외 모든 테이블의 SELECT/INSERT/UPDATE/DELETE Policy와 GRANT
--   private.is_class_teacher() / is_assigned_class_teacher() — 의미 그대로 재사용만 한다.
