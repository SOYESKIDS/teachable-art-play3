-- =====================================================================
-- E3 — 발행 보호 보완 · 콘텐츠 범위 제한
--
-- ── 무엇이 부족했나 (c081be8 검토) ─────────────────────────────
--
-- ① publish_lesson 이 `curriculum_lessons` 행만 잠갔다. 그 잠금은 **본문과
--    장면 쓰기를 막지 않는다.** 다른 세션이 같은 순간에 lesson_sections 를
--    고치면 체크섬을 계산한 뒤 커밋될 수 있다.
--    → 콘텐츠를 쓰는 모든 경로가 **같은 행 잠금에 참여**하게 한다.
--
-- ② `lesson_scenes` 에는 게시본 보호 트리거가 없었다. 발행된 차시의 장면을
--    직접 고칠 수 있었다 (lesson_sections 에는 DEC-096 트리거가 있다).
--
-- ③ `curriculum_lessons.status` 를 직접 UPDATE 하면 publish_lesson 의 모든
--    판정을 건너뛰고 발행된다. 미해결 기록이 남아 있어도 발행된다.
--
-- ④ `lesson_scenes` 읽기가 「활성 기관 구성원 + 게시됨」이었다. 8주 계약
--    기관이 24주차 장면을 **직접 조회로** 가져갈 수 있었다. 화면에서 숨기는
--    것으로는 막히지 않는다.
--
-- 적용 순서: E1 → E2 → 이 파일
-- 되돌리기: supabase/cutover/E3_publish_lock_and_scope_rollback.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 콘텐츠 쓰기가 발행과 같은 잠금에 참여한다
-- ---------------------------------------------------------------------
--
-- 트리거가 차시 행을 `for update` 로 잠근다. publish_lesson 도 같은 행을
-- 잠그므로 둘은 **직렬화된다** — 체크섬 계산 이후에 끼어드는 수정이 없다.
--
-- ★ 잠금은 트랜잭션 끝까지 유지된다. 그래서 「계산 → 검사 → 쓰기」 사이에
--   틈이 생기지 않는다.

create or replace function private.lock_lesson_for_content_write(p_lesson_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select l.status into v_status
  from public.curriculum_lessons l
  where l.id = p_lesson_id
  for update;

  if not found then
    raise exception '차시를 찾을 수 없습니다.' using errcode = 'foreign_key_violation';
  end if;

  return v_status;
end;
$$;

comment on function private.lock_lesson_for_content_write(uuid) is
  '콘텐츠를 쓰기 전에 차시 행을 잠근다. publish_lesson 과 같은 행을 잠가 둘이 직렬화된다.';

revoke execute on function private.lock_lesson_for_content_write(uuid) from public, anon;


-- 기존 섹션 쓰기 게이트를 **잠금에 참여하도록** 바꾼다.
-- 동작(게시본 수정 거부 · 차시 변경 거부)은 그대로다 — 잠금만 더한다.
create or replace function private.enforce_lesson_section_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson_id uuid;
  v_status text;
begin
  v_lesson_id := case when tg_op = 'DELETE' then old.lesson_id else new.lesson_id end;

  if tg_op = 'UPDATE' and new.lesson_id is distinct from old.lesson_id then
    raise exception '섹션의 차시는 바꿀 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- ★ 상태를 읽으면서 **잠근다**. 읽기만 하면 발행과 경쟁한다.
  v_status := private.lock_lesson_for_content_write(v_lesson_id);

  if v_status is distinct from 'draft' then
    raise exception '게시 중이거나 보관된 차시의 수업 섹션은 수정할 수 없습니다. 차시를 초안으로 되돌린 뒤 수정해 주세요.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


-- 장면에도 같은 게이트를 건다. 없던 보호다.
create or replace function private.enforce_lesson_scene_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson_id uuid;
  v_status text;
begin
  v_lesson_id := case when tg_op = 'DELETE' then old.lesson_id else new.lesson_id end;

  if tg_op = 'UPDATE' and new.lesson_id is distinct from old.lesson_id then
    raise exception '장면의 차시는 바꿀 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  v_status := private.lock_lesson_for_content_write(v_lesson_id);

  if v_status is distinct from 'draft' then
    raise exception '게시 중이거나 보관된 차시의 교실 화면 장면은 수정할 수 없습니다. 차시를 초안으로 되돌린 뒤 수정해 주세요.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.enforce_lesson_scene_write() from public, anon;

drop trigger if exists trg_lesson_scenes_write_check on public.lesson_scenes;
create trigger trg_lesson_scenes_write_check
  before insert or update or delete on public.lesson_scenes
  for each row execute function private.enforce_lesson_scene_write();


-- 검수 기록과 본사 결정도 같은 잠금에 참여한다.
--
-- ★ 다만 **게시 여부로 막지는 않는다.** 기록을 해결로 바꾸거나 결정을 내리는
--   것은 내용 변경이 아니고, 발행 뒤에도 일어난다. 잠금에만 참여시켜
--   「발행 판정이 세는 동안 건수가 바뀌는 것」을 막는다.
create or replace function private.enforce_lesson_review_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson_id uuid;
begin
  v_lesson_id := case when tg_op = 'DELETE' then old.lesson_id else new.lesson_id end;
  perform private.lock_lesson_for_content_write(v_lesson_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.enforce_lesson_review_write() from public, anon;

drop trigger if exists trg_lesson_review_notes_lock on public.lesson_review_notes;
create trigger trg_lesson_review_notes_lock
  before insert or update or delete on public.lesson_review_notes
  for each row execute function private.enforce_lesson_review_write();

drop trigger if exists trg_lesson_hq_decisions_lock on public.lesson_hq_decisions;
create trigger trg_lesson_hq_decisions_lock
  before insert or update or delete on public.lesson_hq_decisions
  for each row execute function private.enforce_lesson_review_write();


-- ---------------------------------------------------------------------
-- 2. status 직접 UPDATE 로 발행을 우회하지 못한다
-- ---------------------------------------------------------------------
--
-- `update curriculum_lessons set status = 'published'` 한 줄이면 미해결 기록도
-- 본사 결정도 체크섬도 건너뛴다. 그 경로를 막는다.
--
-- ★ publish_lesson 이 세션 설정으로 「내가 통과시킨 발행이다」를 표시하고,
--   트리거가 그 표시를 확인한다. 표시는 **트랜잭션 지역**(is_local = true)이라
--   다른 세션이나 다음 트랜잭션으로 새지 않는다.
-- ★ 발행 취소(published → draft)는 막지 않는다. 되돌리는 것은 안전하고,
--   막으면 잘못 발행했을 때 손쓸 방법이 없어진다.

create or replace function private.enforce_lesson_publish_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    if coalesce(current_setting('soye.publishing_lesson', true), '') <> new.id::text then
      raise exception
        '차시 발행은 publish_lesson() 으로만 할 수 있습니다. 상태를 직접 바꾸면 미해결 기록·본사 결정·검수 체크섬 확인을 건너뛰게 됩니다.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_lesson_publish_path() from public, anon;

drop trigger if exists trg_curriculum_lessons_publish_path on public.curriculum_lessons;
create trigger trg_curriculum_lessons_publish_path
  before update of status on public.curriculum_lessons
  for each row execute function private.enforce_lesson_publish_path();


-- publish_lesson 이 그 표시를 세우도록 바꾼다 (나머지 판정은 E2 그대로).
create or replace function public.publish_lesson(
  p_lesson_id uuid,
  p_reviewed_checksum text
)
returns table (
  published_lesson_id uuid,
  lesson_status text,
  content_checksum text,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
volatile
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_current_checksum text;
  v_blocker record;
begin
  if v_actor is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  if not (select private.is_hq_admin()) then
    raise exception '본사 관리자만 발행할 수 있습니다.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_reviewed_checksum is null or p_reviewed_checksum !~ '^[0-9a-f]{64}$' then
    raise exception '검수 시점 체크섬이 필요합니다 (sha256 16진 64자).'
      using errcode = 'check_violation';
  end if;

  -- ★ 콘텐츠 쓰기 트리거와 **같은 함수**로 잠근다. 둘이 같은 행을 잠그므로
  --   발행과 수정이 직렬화된다.
  v_status := private.lock_lesson_for_content_write(p_lesson_id);

  for v_blocker in select * from public.lesson_publish_blockers(p_lesson_id) loop
    raise exception '발행할 수 없습니다 (%): %', v_blocker.blocker, v_blocker.detail
      using errcode = 'check_violation';
  end loop;

  v_current_checksum := private.lesson_content_checksum(p_lesson_id);

  if v_current_checksum <> p_reviewed_checksum then
    raise exception
      '검수 이후 본문이 바뀌었습니다. 검수하지 않은 내용은 발행하지 않습니다 — 다시 확인해 주세요.'
      using errcode = 'check_violation';
  end if;

  -- 이 트랜잭션에서만 사는 표시. 트리거가 이것을 보고 통과시킨다.
  perform set_config('soye.publishing_lesson', p_lesson_id::text, true);

  update public.curriculum_lessons
  set status = 'published'
  where id = p_lesson_id;

  perform set_config('soye.publishing_lesson', '', true);

  published_lesson_id := p_lesson_id;
  lesson_status := 'published';
  content_checksum := v_current_checksum;
  published_at := pg_catalog.clock_timestamp();
  return next;
end;
$$;

revoke execute on function public.publish_lesson(uuid, text) from public, anon;
grant execute on function public.publish_lesson(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. 장면 읽기 범위 — 기관·반·상품까지 본다
-- ---------------------------------------------------------------------
--
-- E1 의 정책은 「활성 기관 구성원 + 게시됨」이었다. 그러면 8주 계약 기관이
-- 24주차 장면을 직접 조회로 가져간다. 계약 범위는 반 단위라 표 정책만으로는
-- 판정할 수 없다 — 그래서 **직접 조회는 본사만** 두고, 교직원은 반을 함께
-- 넘기는 RPC 로만 읽는다 (lesson_assets 와 같은 방식).

drop policy if exists "lesson scenes readable" on public.lesson_scenes;

create policy "lesson scenes readable by hq"
  on public.lesson_scenes
  for select
  to authenticated
  using ((select private.is_hq_admin()));


-- 이 반이 이 차시의 장면을 볼 수 있는가
create or replace function private.class_lesson_scenes_readable(
  p_class_id uuid,
  p_lesson_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.curriculum_lessons l
    join public.class_program_assignments cpa
      on cpa.program_id = l.program_id
     and cpa.class_id = p_class_id
     and cpa.status = 'active'
    where l.id = p_lesson_id
      -- 게시된 차시만. 검수 전 콘텐츠는 교사에게 가지 않는다.
      and private.is_published_lesson(l.id)
      -- 계약이 약속한 주차 범위 안인가 (8 · 16 · 24주 상품)
      and private.class_week_entitled(p_class_id, l.week_no)
      -- 담당 반인가 · 기관이 맞는가 — class_write_allowed 가 둘 다 본다
      and private.class_in_effective_contract_scope(p_class_id)
  );
$$;

comment on function private.class_lesson_scenes_readable(uuid, uuid) is
  '반이 이 차시 장면을 읽을 수 있는가. 게시 + 계약 주차 범위 + 계약 반 범위를 모두 본다.';

revoke execute on function private.class_lesson_scenes_readable(uuid, uuid) from public, anon;
grant execute on function private.class_lesson_scenes_readable(uuid, uuid) to authenticated;


-- 이 반이 속한 기관의 원장인가. 원장은 담당 반이 아니어도 자기 기관 반을 본다.
create or replace function private.is_org_director_of_class(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.classes cl
    join public.organizations o on o.id = cl.organization_id
    join public.organization_members m on m.organization_id = cl.organization_id
    where cl.id = p_class_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'director'
      and o.status = 'active'
  );
$$;

revoke execute on function private.is_org_director_of_class(uuid) from public, anon;
grant execute on function private.is_org_director_of_class(uuid) to authenticated;


create or replace function public.list_lesson_scenes_for_class(
  p_class_id uuid,
  p_lesson_id uuid
)
returns table (
  scene_no integer,
  scene_type text,
  kid_text text,
  stage_label text,
  teacher_note text,
  base_seconds integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  -- ★ **호출자**가 이 반의 담당 교사인가 / 이 기관의 원장인가.
  --
  --   class_in_effective_contract_scope() 는 「반이 계약 범위 안인가」만 본다 —
  --   **누가 묻는지는 보지 않는다.** 그것만 믿으면 다른 기관 교사가 반 id 만
  --   알아도 장면을 가져간다. (검증에서 실제로 통과하는 것을 확인했다.)
  if not (
    private.is_assigned_class_teacher(p_class_id)
    or private.is_org_director_of_class(p_class_id)
  ) then
    raise exception '이 반의 콘텐츠를 볼 수 없습니다.' using errcode = 'insufficient_privilege';
  end if;

  -- 반이 계약 범위 안인가 (담당이어도 계약이 끝났으면 못 본다)
  if not private.class_in_effective_contract_scope(p_class_id) then
    raise exception '이 반의 콘텐츠를 볼 수 없습니다.' using errcode = 'insufficient_privilege';
  end if;

  if not private.class_lesson_scenes_readable(p_class_id, p_lesson_id) then
    -- ★ 「없음」과 「권한 없음」을 구분해 알려주지 않는다. 열거에 쓸 정보를
    --   주지 않기 위해서다 — 0행으로 끝낸다.
    return;
  end if;

  return query
  select s.scene_no, s.scene_type, s.kid_text, s.stage_label, s.teacher_note, s.base_seconds
  from public.lesson_scenes s
  where s.lesson_id = p_lesson_id
  order by s.scene_no;
end;
$$;

comment on function public.list_lesson_scenes_for_class(uuid, uuid) is
  '교직원이 교실 화면 장면을 읽는 유일한 경로. 표 직접 조회는 본사만 된다.';

revoke execute on function public.list_lesson_scenes_for_class(uuid, uuid) from public, anon;
grant execute on function public.list_lesson_scenes_for_class(uuid, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 4. 상품 ↔ 프로그램 연결 읽기도 좁힌다
-- ---------------------------------------------------------------------
--
-- 어느 기관이 어느 교안 버전을 쓰는지는 그 기관만 알면 된다. 모든 활성
-- 구성원에게 전체 연결표를 열어 둘 이유가 없다.

drop policy if exists "product version programs readable" on public.product_version_programs;

create policy "product version programs readable"
  on public.product_version_programs
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or exists (
      select 1
      from public.contracts c
      join public.organization_members m
        on m.organization_id = c.organization_id
       and m.user_id = (select auth.uid())
       and m.status = 'active'
      where c.product_version_id = product_version_programs.product_version_id
        and c.id = private.effective_contract_id(c.organization_id)
    )
  );
