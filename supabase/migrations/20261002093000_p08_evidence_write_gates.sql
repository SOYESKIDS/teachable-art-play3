-- =====================================================================
-- PHASE 08 · WS5 (D5) · WS9 (A4) — 동의 · SaaS 2.0 전용 쓰기 경로의 DB 최종 판정
-- ---------------------------------------------------------------------
-- 근거: DEC-052 · DEC-083 · DEC-088 · DEC-101 · PHASE 08 WS5 · WS9 · PRE-COMMIT REVIEW Issue 1
-- 전체 쓰기 표면 표: docs/08-security-hardening/write-surface-matrix.md
--
-- ★ 이 일반 migration 은 legacy 운영 쓰기(출결 · legacy 형식 관찰 · 관찰영역 연결 · 사진 업로드 ·
--   legacy 수업 직접 status 변경)의 entitlement 판정을 바꾸지 않는다. 계약이 없거나 · 초안뿐이거나 ·
--   Step H 에서 계약이 활성화된 뒤라도 그 경로는 G-1 cutover 전까지 기존 동작 그대로다.
--   legacy 공유 쓰기 표면의 entitlement enforcement 는 G-1 (M3_entitlement_write_gates.sql) 에서만 켜진다.
--
-- 여기서 지금부터 DB 가 판정하는 것 (legacy 앱이 쓰지 않는 경로 · 또는 동의):
--   1. Growth5 관찰 (SaaS 2.0 전용 형식): 진행 중 · 종료된 수업(OB003) ∧ 반 쓰기 class_mode(EN003)
--      — save_class_observation 의 OB003 · OB007 과 같은 규칙 · 직접 DML 우회 차단
--   2. Growth5 선택 INSERT · DELETE: 같은 규칙
--   3. 사진 업로드: 동의 운영 상태 declined 원아 거부 (Storage 정책 · metadata · 모든 기관)
--      — child_media_consents 는 PHASE 07 신규 표 · SaaS 2.0 원장 화면에서만 기록 (현재 Production 행 없음)
--   4. 저장소 상태 'deleted' 표시는 Storage 객체가 실제로 없을 때만
--   5. Weekly 사진 선택 자격 · 수정본 사진 복사
--   6. 빠른 메모 수정 (SaaS 2.0 전용)
-- 하지 않는 것: evidence_ref 채우기 (사실 증빙이 없으면 null 유지) · 학부모 사진 표시 (CO-9 · CO-10 · DB-9 OPEN) ·
--   legacy 쓰기 경로 회수 (M5)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. 계약 적용 기관 판정 (PHASE 08 공통 helper · legacy 공유 읽기 · M5 preflight 가 쓴다)
-- ---------------------------------------------------------------------
-- 활성화된 적이 있는 계약(active · suspended · ended)이 있는 기관. 쓰기 gate 에는 쓰지 않는다.

create or replace function private.org_contract_governed(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.contracts c
    where c.organization_id = p_organization_id
      and c.status in ('active', 'suspended', 'ended')
  );
$$;

revoke execute on function private.org_contract_governed(uuid) from public, anon;
grant execute on function private.org_contract_governed(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 1. Growth5 관찰 쓰기 (SaaS 2.0 전용 형식 · 모든 기관)
-- ---------------------------------------------------------------------
-- legacy 형식(legacy_domains) 관찰 · 출결은 판정하지 않는다 (G-1).
-- 내용 변경이 없는 UPDATE(FK ON DELETE SET NULL 로 created_by · updated_by 만 비는 경우)는 막지 않는다.

create or replace function private.gate_growth5_observation_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_status text;
begin
  if new.taxonomy is distinct from 'growth5' then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and (to_jsonb(new) - array['created_by', 'updated_by', 'updated_at'])
      = (to_jsonb(old) - array['created_by', 'updated_by', 'updated_at'])
  then
    return new;
  end if;

  select s.status into v_session_status
  from public.class_sessions s
  where s.id = new.class_session_id;

  if v_session_status is null or v_session_status not in ('in_progress', 'completed') then
    raise exception '진행 중이거나 종료된 수업에만 관찰을 기록할 수 있습니다.' using errcode = 'OB003';
  end if;

  if not private.class_write_allowed(new.class_id, 'class_mode') then
    raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 기록을 작성할 수 없습니다.'
      using errcode = 'EN003';
  end if;

  return new;
end;
$$;

revoke execute on function private.gate_growth5_observation_write() from public, anon, authenticated;

drop trigger if exists trg_observations_growth5_gate on public.class_session_observations;
create trigger trg_observations_growth5_gate
  before insert or update on public.class_session_observations
  for each row execute function private.gate_growth5_observation_write();


-- ---------------------------------------------------------------------
-- 2. Growth5 선택 INSERT · DELETE (SaaS 2.0 전용 · 모든 기관)
-- ---------------------------------------------------------------------
-- 기존 enforce_growth_selection_write 는 DELETE 를 검사 없이 통과시켰다.

create or replace function private.gate_growth_selection_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observation_id uuid := case when tg_op = 'DELETE' then old.observation_id else new.observation_id end;
  v_obs record;
begin
  -- 부모 관찰 삭제에 따른 cascade 는 사용자의 쓰기가 아니다
  if tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() > 1 then
    return old;
  end if;

  select o.class_id, s.status as session_status
  into v_obs
  from public.class_session_observations o
  join public.class_sessions s on s.id = o.class_session_id
  where o.id = v_observation_id;

  if found then
    if v_obs.session_status not in ('in_progress', 'completed') then
      raise exception '진행 중이거나 종료된 수업에만 관찰 포인트를 기록할 수 있습니다.' using errcode = 'OB003';
    end if;
    if not private.class_write_allowed(v_obs.class_id, 'class_mode') then
      raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 새 기록을 작성할 수 없습니다.'
        using errcode = 'EN003';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.gate_growth_selection_write() from public, anon, authenticated;

drop trigger if exists trg_growth_selections_write_gate on public.observation_growth_selections;
create trigger trg_growth_selections_write_gate
  before insert or delete on public.observation_growth_selections
  for each row execute function private.gate_growth_selection_write();


-- ---------------------------------------------------------------------
-- 3. 사진 업로드: 동의 운영 상태 declined (모든 기관)
-- ---------------------------------------------------------------------
-- 동의 운영 상태 (DEC-088 · 법적 효력은 판단하지 않는다):
--   declined            → 업로드 거부 (Storage 객체 · metadata) · Weekly 선택 거부
--   consented           → 운영상 사용 가능 (업로드 · Weekly 선택)
--   unknown · 기록 없음 → 업로드 허용 (반 내부 기록) · Weekly 선택 거부 · 학부모 Portal 사진 없음 (CO-9)
-- 반 쓰기 entitlement · 재원 원아 확인은 G-1 cutover 가 이 함수를 다시 정의해 켠다 (legacy 업로드 경로 공유).

create or replace function private.observation_media_upload_block_reason(
  p_organization_id uuid,
  p_class_id uuid,
  p_child_id uuid
)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when exists (
      select 1 from public.child_media_consents mc
      where mc.child_id = p_child_id and mc.status = 'declined'
    ) then 'consent_declined'
    else null
  end;
$$;

revoke execute on function private.observation_media_upload_block_reason(uuid, uuid, uuid) from public, anon, authenticated;


create or replace function private.can_upload_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_sessions s
    join public.children c
      on c.id = private.safe_uuid(split_part(p_name, '/', 3))
     and c.organization_id = s.organization_id
     and c.class_id = s.class_id
    where p_name ~ (
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            || '\.(jpg|png|webp)$'
          )
      and s.id = private.safe_uuid(split_part(p_name, '/', 2))
      and s.organization_id = private.safe_uuid(split_part(p_name, '/', 1))
      and private.is_class_teacher(s.class_id)
      and private.is_recordable_session(s.id)
      -- PHASE 08 WS9 (G-1 이 판정 범위를 넓힌다)
      and private.observation_media_upload_block_reason(s.organization_id, s.class_id, c.id) is null
  );
$$;

revoke execute on function private.can_upload_observation_media_object(text) from public, anon;
grant execute on function private.can_upload_observation_media_object(text) to authenticated;


create or replace function private.gate_observation_media_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := private.observation_media_upload_block_reason(new.organization_id, new.class_id, new.child_id);
begin
  if v_reason = 'consent_declined' then
    raise exception '사진 공유에 동의하지 않은 원아의 사진은 올릴 수 없습니다.' using errcode = 'MD004';
  elsif v_reason = 'child_inactive' then
    raise exception '현재 재원 중인 원아의 사진만 올릴 수 있습니다.' using errcode = 'MD005';
  elsif v_reason = 'not_entitled' then
    raise exception '현재 읽기 전용 상태이거나 이용 상품에 포함되지 않아 사진을 올릴 수 없습니다.'
      using errcode = 'EN003';
  end if;
  return new;
end;
$$;

revoke execute on function private.gate_observation_media_insert() from public, anon, authenticated;

drop trigger if exists trg_observation_media_upload_gate on public.class_session_observation_media;
create trigger trg_observation_media_upload_gate
  before insert on public.class_session_observation_media
  for each row execute function private.gate_observation_media_insert();


-- ---------------------------------------------------------------------
-- 4. 사진 저장소 상태: 'deleted' 표시는 Storage 객체가 실제로 없을 때만 (D10)
-- ---------------------------------------------------------------------

create or replace function private.guard_observation_media_storage_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.storage_status = 'deleted'
    and old.storage_status is distinct from 'deleted'
    and exists (
      select 1 from storage.objects so
      where so.bucket_id = 'observation-media' and so.name = new.storage_path
    )
  then
    raise exception '저장소에서 사진 파일이 아직 삭제되지 않았습니다. 잠시 후 다시 시도해 주세요.'
      using errcode = 'MD006';
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_observation_media_storage_status() from public, anon, authenticated;

drop trigger if exists trg_observation_media_storage_guard on public.class_session_observation_media;
create trigger trg_observation_media_storage_guard
  before update on public.class_session_observation_media
  for each row execute function private.guard_observation_media_storage_status();


-- ---------------------------------------------------------------------
-- 5. Weekly 사진 선택 자격 (0~3 · 선택 사항 · DEC-101 · DEC-088)
-- ---------------------------------------------------------------------
-- 기존 enforce_report_media_write: 초안 revision · 담당 교사 · 최대 3장 · 같은 원아 · 같은 배정 · 같은 주차 ·
-- 숨김 아님. 여기서 더한다:
--   · 사진 metadata storage_status = 'stored' (숨김 · 삭제 대기 · 삭제됨 제외)
--   · 취소된 수업의 사진 제외
--   · 원아 동의 운영 상태 = consented (unknown · declined 는 공개 산출물에 넣지 않는다 · DEC-088 안전 기본값)
--   · 반의 weekly_report 쓰기 가능 (직접 INSERT 우회 차단 · RP007)
-- 사진은 여전히 선택 사항이다 (0장 허용 · 완료 조건 아님).

create or replace function private.report_media_eligible(p_media_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_session_observation_media md
    join public.class_sessions s on s.id = md.class_session_id
    join public.child_media_consents mc on mc.child_id = md.child_id and mc.status = 'consented'
    where md.id = p_media_id
      and md.hidden_at is null
      and md.storage_status = 'stored'
      and s.status <> 'cancelled'
  );
$$;

revoke execute on function private.report_media_eligible(uuid) from public, anon;
grant execute on function private.report_media_eligible(uuid) to authenticated;


create or replace function private.gate_report_media_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
begin
  select r.class_id into v_class_id
  from public.report_revisions rv
  join public.reports r on r.id = rv.report_id
  where rv.id = new.revision_id;

  if v_class_id is not null and not private.class_write_allowed(v_class_id, 'weekly_report') then
    raise exception '현재 이용 상품 또는 이용 기간에서 리포트를 작성할 수 없습니다.' using errcode = 'RP007';
  end if;

  if not private.report_media_eligible(new.media_id) then
    raise exception '사진 공유 동의가 확인된 원아의 표시 가능한 사진만 리포트에 넣을 수 있습니다.'
      using errcode = 'RP011';
  end if;

  return new;
end;
$$;

revoke execute on function private.gate_report_media_insert() from public, anon, authenticated;

drop trigger if exists trg_report_media_eligibility_gate on public.report_revision_media;
create trigger trg_report_media_eligibility_gate
  before insert on public.report_revision_media
  for each row execute function private.gate_report_media_insert();


-- 수정본 시작 시 이전 revision 사진 복사: 지금도 자격이 있는 사진만 옮긴다
-- (동의 철회 · 숨김 이후의 사진이 수정본을 막지 않도록 · 나머지 본문은 20261001120000 과 같다)
create or replace function public.start_report_correction(
  p_report_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report record;
  v_latest record;
  v_revision_id uuid;
  v_updated_at timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '수정 사유를 500자 이내로 입력해 주세요.' using errcode = 'RP005';
  end if;

  select r.id, r.organization_id, r.latest_completed_revision_id
  into v_report
  from public.reports r
  where r.id = p_report_id;

  if not found then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'RP002';
  end if;

  if v_report.latest_completed_revision_id is null then
    raise exception '완료된 리포트가 있어야 수정본을 만들 수 있습니다.' using errcode = 'RP003';
  end if;

  if exists (select 1 from public.report_revisions rv where rv.report_id = v_report.id and rv.status = 'draft') then
    raise exception '이미 작성 중인 수정본이 있습니다.' using errcode = 'RP003';
  end if;

  select rv.id, rv.content into v_latest
  from public.report_revisions rv
  where rv.id = v_report.latest_completed_revision_id;

  insert into public.report_revisions (organization_id, report_id, correction_reason, content)
  values (v_report.organization_id, v_report.id, v_reason, v_latest.content)
  returning id, updated_at into v_revision_id, v_updated_at;

  insert into public.report_revision_media (organization_id, revision_id, media_id, sort_order)
  select m.organization_id, v_revision_id, m.media_id, m.sort_order
  from public.report_revision_media m
  join public.class_session_observation_media md on md.id = m.media_id
  where m.revision_id = v_latest.id
    and md.hidden_at is null
    and private.report_media_eligible(md.id)
  order by m.sort_order;

  return jsonb_build_object('report_id', v_report.id, 'revision_id', v_revision_id, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.start_report_correction(uuid, text) from public, anon;
grant execute on function public.start_report_correction(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. 빠른 메모 수정: 반 기능 ∧ 서비스 모드 active (삭제는 허용 · 작성자 본인 · 근거 아님)
-- ---------------------------------------------------------------------
-- 읽기 전용 기간에 작성자가 자기 메모를 지우는 것은 개인정보 최소화 방향이라 막지 않는다.

create or replace function private.gate_quick_memo_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.body is distinct from old.body
    and not private.class_write_allowed(new.class_id, 'class_mode')
  then
    raise exception '현재 이용 상품 또는 이용 기간에서 메모를 고칠 수 없습니다.' using errcode = 'QM004';
  end if;
  return new;
end;
$$;

revoke execute on function private.gate_quick_memo_update() from public, anon, authenticated;

drop trigger if exists trg_quick_memos_write_gate on public.quick_memos;
create trigger trg_quick_memos_write_gate
  before update on public.quick_memos
  for each row execute function private.gate_quick_memo_update();
