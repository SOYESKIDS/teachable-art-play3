-- =====================================================================
-- E2 — 차시 발행 판정을 서버로
--
-- ── 왜 서버가 판정해야 하는가 ───────────────────────────────────
--
-- 지금 `assertPublishable(status, unresolvedNoteCount)` 는 **인자를 받는다.**
-- 클라이언트가 보낸 값을 믿으면 미해결이 남은 주차도 발행된다.
-- 서버가 저장된 데이터에서 직접 읽어야 한다.
--
-- ── 상태 변경과 검증 사이 (TOCTOU) ─────────────────────────────
--
-- 검수자가 내용을 확인한 시점과 발행 버튼을 누르는 시점 사이에 본문이 바뀔 수
-- 있다. 그러면 **검수하지 않은 내용이 발행된다.**
--
-- ★ 그래서 발행 요청에 「검수한 시점의 체크섬」을 함께 받는다. 서버가 지금
--   체크섬을 다시 계산해 다르면 거부한다. 다시 검수해야 한다.
-- ★ 체크섬 계산과 상태 변경을 **한 트랜잭션 안에서** 한다. 중간에 끼어든
--   본문 수정은 행 잠금에 막힌다.
--
-- 적용 순서: 20261014090000_e1_lesson_content_structure.sql → 이 파일
-- 되돌리기: 20261014091000_e2_lesson_publish_gate_rollback.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 차시 콘텐츠 체크섬
-- ---------------------------------------------------------------------
--
-- 본문(body·body_json)과 장면 전체를 정렬해 하나의 해시로. 순서를 고정해야
-- 같은 내용이 같은 해시가 된다.
--
-- ★ 검수 기록(review_notes)은 넣지 않는다. 기록을 해결로 바꾸는 것은
--   내용 변경이 아니다 — 그것까지 체크섬에 넣으면 기록을 정리할 때마다
--   재검수를 요구하게 된다.

create or replace function private.lesson_content_checksum(p_lesson_id uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  -- pg_catalog.sha256() 은 PostgreSQL 11 내장이다. pgcrypto 와 그 스키마 위치에
  -- 의존하지 않는다 (read_shared_growth_report 와 같은 방침).
  select encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
      coalesce(
        (
          select string_agg(
            s.section_code || E'\x1f' || s.body || E'\x1f' || coalesce(s.body_json::text, ''),
            E'\x1e' order by s.section_code
          )
          from public.lesson_sections s
          where s.lesson_id = p_lesson_id
        ),
        ''
      )
      || E'\x1d'
      || coalesce(
        (
          select string_agg(
            sc.scene_no::text || E'\x1f' || sc.scene_type || E'\x1f' || sc.kid_text
              || E'\x1f' || coalesce(sc.stage_label, '')
              || E'\x1f' || coalesce(sc.teacher_note, '')
              || E'\x1f' || coalesce(sc.base_seconds::text, ''),
            E'\x1e' order by sc.scene_no
          )
          from public.lesson_scenes sc
          where sc.lesson_id = p_lesson_id
        ),
        ''
      ),
      'UTF8')
    ),
    'hex'
  );
$$;

comment on function private.lesson_content_checksum(uuid) is
  '차시 본문+장면의 해시. 검수한 내용과 발행하는 내용이 같은지 확인하는 데 쓴다. 검수 기록은 포함하지 않는다 — 기록 정리는 내용 변경이 아니다.';

revoke execute on function private.lesson_content_checksum(uuid) from public;
grant execute on function private.lesson_content_checksum(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 2. 발행 막는 이유 — 조회 전용
-- ---------------------------------------------------------------------
--
-- 화면이 「왜 발행할 수 없는지」를 보여줄 때 쓴다. 이 함수는 상태를 바꾸지
-- 않는다. 실제 발행은 아래 RPC 가 **다시** 판정한다 — 이 결과를 믿고
-- 건너뛰지 않는다.

create or replace function public.lesson_publish_blockers(p_lesson_id uuid)
returns table (
  blocker text,
  detail text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_lesson record;
  v_unresolved integer;
  v_open_decisions integer;
  v_section_count integer;
  v_missing text[];
begin
  if not (select private.is_hq_admin()) then
    raise exception '본사 관리자만 발행 상태를 확인할 수 있습니다.'
      using errcode = 'insufficient_privilege';
  end if;

  select l.id, l.status, l.week_no, p.status as program_status
    into v_lesson
  from public.curriculum_lessons l
  join public.curriculum_programs p on p.id = l.program_id
  where l.id = p_lesson_id;

  if not found then
    blocker := 'lesson_not_found';
    detail := '차시를 찾을 수 없습니다.';
    return next;
    return;
  end if;

  if v_lesson.status = 'published' then
    blocker := 'already_published';
    detail := '이미 발행된 차시입니다. 내용을 바꾸려면 새 버전으로 적재합니다.';
    return next;
  end if;

  -- 전사 여부 = 필수 섹션이 다 있는가. 「전사 완료」라는 별도 깃발을 두지
  -- 않는다 — 깃발과 실제 내용이 어긋나는 것이 가장 위험하다.
  select array_agg(req)
    into v_missing
  from unnest(private.required_lesson_sections()) req
  where not exists (
    select 1 from public.lesson_sections s
    where s.lesson_id = p_lesson_id and s.section_code = req
  );

  if v_missing is not null then
    blocker := 'not_transcribed';
    detail := '필수 섹션이 비어 있습니다: ' || array_to_string(v_missing, ', ');
    return next;
  end if;

  select count(*) into v_section_count
  from public.lesson_sections s where s.lesson_id = p_lesson_id;

  if v_section_count = 0 then
    blocker := 'not_transcribed';
    detail := '섹션이 하나도 없습니다.';
    return next;
  end if;

  select count(*) into v_unresolved
  from public.lesson_review_notes n
  where n.lesson_id = p_lesson_id and n.status = 'unresolved';

  if v_unresolved > 0 then
    blocker := 'unresolved_notes';
    detail := '미해결 대조 기록 ' || v_unresolved || '건이 남아 있습니다.';
    return next;
  end if;

  select count(*) into v_open_decisions
  from public.lesson_hq_decisions d
  where d.lesson_id = p_lesson_id and d.state = 'open';

  if v_open_decisions > 0 then
    blocker := 'open_hq_decisions';
    detail := '본사 결정 대기 ' || v_open_decisions || '건이 남아 있습니다.';
    return next;
  end if;

  -- 프로그램이 draft 면 차시만 published 로 바꿔도 교사에게 보이지 않는다
  -- (is_published_lesson 이 둘 다 본다). 조용히 성공한 것처럼 두지 않는다.
  if v_lesson.program_status <> 'published' then
    blocker := 'program_not_published';
    detail := '프로그램이 아직 게시되지 않았습니다 (현재: ' || v_lesson.program_status || ').';
    return next;
  end if;

  return;
end;
$$;

comment on function public.lesson_publish_blockers(uuid) is
  '발행을 막는 이유. 조회 전용 — 실제 발행은 publish_lesson 이 다시 판정한다.';

revoke execute on function public.lesson_publish_blockers(uuid) from public, anon;
grant execute on function public.lesson_publish_blockers(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 3. publish_lesson — 실제 발행
-- ---------------------------------------------------------------------
--
-- 호출자가 보낸 값은 **체크섬 하나뿐**이고, 그것도 「같은지」만 본다.
-- 상태·미해결건수·권한은 서버가 저장된 데이터에서 직접 읽는다.

create or replace function public.publish_lesson(
  p_lesson_id uuid,
  p_reviewed_checksum text
)
returns table (
  -- ★ OUT 이름을 컬럼 이름과 겹치지 않게 둔다. plpgsql 은 변수와 컬럼이 같은
  --   이름이면 모호하다고 거부하거나, 더 나쁘게는 변수를 집어넣는다.
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

  -- 권한을 서버가 직접 본다. 호출자가 역할을 보내지 않는다.
  if not (select private.is_hq_admin()) then
    raise exception '본사 관리자만 발행할 수 있습니다.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_reviewed_checksum is null or p_reviewed_checksum !~ '^[0-9a-f]{64}$' then
    raise exception '검수 시점 체크섬이 필요합니다 (sha256 16진 64자).'
      using errcode = 'check_violation';
  end if;

  -- ★ 행을 잠근다. 잠근 뒤에 체크섬을 계산해야 「계산과 변경 사이」가 없다.
  select l.status into v_status
  from public.curriculum_lessons l
  where l.id = p_lesson_id
  for update;

  if not found then
    raise exception '차시를 찾을 수 없습니다.' using errcode = 'no_data_found';
  end if;

  -- 막는 이유를 다시 센다. 조회 함수 결과를 믿지 않는다.
  for v_blocker in select * from public.lesson_publish_blockers(p_lesson_id) loop
    raise exception '발행할 수 없습니다 (%): %', v_blocker.blocker, v_blocker.detail
      using errcode = 'check_violation';
  end loop;

  -- ★ 검수한 내용과 지금 내용이 같은가. 다르면 다시 검수해야 한다.
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

comment on function public.publish_lesson(uuid, text) is
  '차시 발행. 서버가 상태·미해결건수·본사 결정·권한을 직접 조회해 판정하고, 검수 시점 체크섬과 지금 내용이 같을 때만 발행한다.';

revoke execute on function public.publish_lesson(uuid, text) from public, anon;
grant execute on function public.publish_lesson(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. 검수 상태 조회 (화면용)
-- ---------------------------------------------------------------------

create or replace function public.lesson_review_state(p_lesson_id uuid)
returns table (
  reviewed_lesson_id uuid,
  reviewed_week_no integer,
  lesson_status text,
  program_status text,
  section_count integer,
  scene_count integer,
  note_count integer,
  unresolved_count integer,
  open_decision_count integer,
  content_checksum text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not (select private.is_hq_admin()) then
    raise exception '본사 관리자만 검수 상태를 볼 수 있습니다.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    l.id,
    l.week_no,
    l.status,
    p.status,
    (select count(*)::integer from public.lesson_sections s where s.lesson_id = l.id),
    (select count(*)::integer from public.lesson_scenes sc where sc.lesson_id = l.id),
    (select count(*)::integer from public.lesson_review_notes n where n.lesson_id = l.id),
    (select count(*)::integer from public.lesson_review_notes n
      where n.lesson_id = l.id and n.status = 'unresolved'),
    (select count(*)::integer from public.lesson_hq_decisions d
      where d.lesson_id = l.id and d.state = 'open'),
    private.lesson_content_checksum(l.id)
  from public.curriculum_lessons l
  join public.curriculum_programs p on p.id = l.program_id
  where l.id = p_lesson_id;
end;
$$;

comment on function public.lesson_review_state(uuid) is
  '주차 검수 화면이 읽는 상태. 본사 전용. content_checksum 을 발행 요청에 그대로 되돌려 보낸다.';

revoke execute on function public.lesson_review_state(uuid) from public, anon;
grant execute on function public.lesson_review_state(uuid) to authenticated;
