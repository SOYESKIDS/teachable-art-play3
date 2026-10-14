-- =====================================================================
-- E3 되돌리기 — 발행 보호 · 범위 제한
--
-- 대상: supabase/migrations/20261014092000_e3_publish_lock_and_scope.sql
-- 실행 순서: **이 파일** → E2 되돌리기 → E1 되돌리기
--
-- ── 되돌리면 다시 열리는 구멍 ──────────────────────────────────
--
-- ★ `curriculum_lessons.status` 를 직접 UPDATE 해 발행을 우회할 수 있게 된다.
--   미해결 기록·본사 결정·체크섬 확인을 전부 건너뛴다.
-- ★ 발행된 차시의 **장면을 직접 수정**할 수 있게 된다.
-- ★ 콘텐츠 쓰기가 발행과 같은 잠금에 참여하지 않게 되어, 검수 직후 끼어든
--   수정이 발행될 수 있다.
-- ★ 교직원이 `lesson_scenes` 를 직접 조회할 수 있게 되고, **계약 주차 범위
--   밖 콘텐츠까지** 읽힌다 (8주 계약 기관이 24주차를 본다).
--
-- 되돌리기 전에 발행 기능을 먼저 내리는 것이 안전하다.
-- =====================================================================

begin;

-- 1. 범위 제한 되돌리기 — E1 의 넓은 정책으로 복구
drop function if exists public.list_lesson_scenes_for_class(uuid, uuid);
drop function if exists private.class_lesson_scenes_readable(uuid, uuid);
drop function if exists private.is_org_director_of_class(uuid);

drop policy if exists "lesson scenes readable by hq" on public.lesson_scenes;

create policy "lesson scenes readable"
  on public.lesson_scenes
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (
      (select private.is_active_org_member())
      and private.is_published_lesson(lesson_id)
    )
  );

drop policy if exists "product version programs readable" on public.product_version_programs;

create policy "product version programs readable"
  on public.product_version_programs
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_active_org_member())
  );

-- 2. 발행 우회 차단 되돌리기
drop trigger if exists trg_curriculum_lessons_publish_path on public.curriculum_lessons;
drop function if exists private.enforce_lesson_publish_path();

-- 3. 잠금 참여 되돌리기
drop trigger if exists trg_lesson_hq_decisions_lock on public.lesson_hq_decisions;
drop trigger if exists trg_lesson_review_notes_lock on public.lesson_review_notes;
drop function if exists private.enforce_lesson_review_write();

drop trigger if exists trg_lesson_scenes_write_check on public.lesson_scenes;
drop function if exists private.enforce_lesson_scene_write();

-- 섹션 쓰기 게이트는 E3 이전 모습(잠금 없음)으로 되돌린다.
-- ★ 이 함수는 E3 이 만든 것이 아니라 M1 이 만든 것이다. 지우지 않고 되돌린다.
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

  select l.status into v_status
  from public.curriculum_lessons l
  where l.id = v_lesson_id;

  if v_status is distinct from 'draft' then
    raise exception '게시 중이거나 보관된 차시의 수업 섹션은 수정할 수 없습니다. 차시를 초안으로 되돌린 뒤 수정해 주세요.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop function if exists private.lock_lesson_for_content_write(uuid);

-- 4. publish_lesson 을 E2 모습(세션 표시 없음)으로 되돌린다.
--    ★ E3 의 트리거를 이미 지웠으므로 표시 없이도 동작한다.
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

  select l.status into v_status
  from public.curriculum_lessons l
  where l.id = p_lesson_id
  for update;

  if not found then
    raise exception '차시를 찾을 수 없습니다.' using errcode = 'no_data_found';
  end if;

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

  update public.curriculum_lessons
  set status = 'published'
  where id = p_lesson_id;

  published_lesson_id := p_lesson_id;
  lesson_status := 'published';
  content_checksum := v_current_checksum;
  published_at := pg_catalog.clock_timestamp();
  return next;
end;
$$;

commit;
