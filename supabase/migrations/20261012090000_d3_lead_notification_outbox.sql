-- =====================================================================
-- 실행 묶음 D3 — 상담 알림 outbox
-- ---------------------------------------------------------------------
-- 근거: 통합 실행 지침 §8 D3 · 01_출시결정표 (문의 담당 백향은 · 1주일 이내 회신)
--
-- 문제:
--   공개 상담은 lead_submissions 에 저장되지만, 그 뒤에 누가 언제 그것을 알게 되는지가
--   시스템 안에 없다. 운영자가 주 1회 관리 화면을 직접 열어 보는 것이 유일한 경로다.
--
-- 이 migration 이 하는 것:
--   · 저장된 문의 1건에 알림 1건을 만드는 outbox 테이블
--   · 중복 방지 (lead 당 채널당 1건 — unique)
--   · 재시도 상태 관리 (pending → sending → sent / failed)
--   · 전달 상태 조회·갱신 RPC (HQ Admin 전용)
--   · lead_submissions INSERT 시 outbox 행을 만드는 트리거
--
-- 이 migration 이 하지 않는 것:
--   ★ 메일을 보내지 않는다. 수신자·provider 가 정해지지 않았고, 이번 단계에서는
--     외부 발송·스케줄 등록을 하지 않는다 (지침 §1 · §8 D3). 기본 상태는 'disabled' 다.
--   ★ 알림 본문에 문의 원문·연락처를 담지 않는다.
--     outbox 행은 lead_id 와 최소 메타데이터(문의 유형 · 기관명 길이 등)만 갖는다.
--     관리자는 링크를 따라 로그인한 뒤 상세를 본다.
--   ★ closed 를 파기 트리거로 쓰지 않는다. 보유기간 검토는 별도 목록(뷰)으로만 제공한다.
--
-- 적용 상태: **원격 미적용.** 로컬 파일로만 둔다.
-- 의존: 20260812_create_lead_submissions.sql · 20261001110000_m3_hq_role_foundation.sql
--       (private.is_hq_admin · private.is_hq_sales)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 알림 채널 — 지금은 운영자 메일 하나지만 열거형으로 둔다
-- ---------------------------------------------------------------------

create table if not exists public.lead_notification_channels (

  code text primary key
    constraint lead_notification_channels_code_check
    check (code ~ '^[a-z][a-z0-9_]{1,30}$'),

  label text not null
    constraint lead_notification_channels_label_check
    check (char_length(btrim(label)) between 1 and 60),

  -- 'disabled' : 수신자·provider 미설정. outbox 행은 쌓이지만 발송 시도를 하지 않는다.
  -- 'enabled'  : 운영자가 수신자와 provider 를 설정한 뒤에만 바뀐다.
  status text not null default 'disabled'
    constraint lead_notification_channels_status_check
    check (status in ('disabled', 'enabled')),

  -- 왜 비활성인지 / 무엇이 필요한지. 관리 화면이 그대로 보여 준다.
  blocked_note text
    constraint lead_notification_channels_blocked_note_check
    check (blocked_note is null or char_length(blocked_note) <= 300),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp()
);

comment on table public.lead_notification_channels is
  '상담 알림 채널. 수신자·provider 가 설정되기 전까지 status=disabled 로 두고 발송을 시도하지 않는다.';

insert into public.lead_notification_channels (code, label, status, blocked_note)
values (
  'operator_email',
  '운영자 메일',
  'disabled',
  '수신자 주소와 메일 provider 가 확정되지 않았습니다. 확정 후 status 를 enabled 로 바꿉니다.'
)
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 2. outbox
-- ---------------------------------------------------------------------

create table if not exists public.lead_notification_outbox (

  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null
    references public.lead_submissions (id) on delete restrict,

  channel_code text not null
    references public.lead_notification_channels (code) on delete restrict,

  -- pending : 보낼 차례를 기다린다 (채널이 disabled 면 영원히 여기 머문다)
  -- sending : 발송 시도 중 (claim 된 상태)
  -- sent    : 전달 확인
  -- failed  : 재시도 상한 도달
  -- skipped : 운영자가 보내지 않기로 한 건
  status text not null default 'pending'
    constraint lead_notification_outbox_status_check
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),

  attempt_count integer not null default 0
    constraint lead_notification_outbox_attempt_count_check
    check (attempt_count between 0 and 20),

  -- 다음 시도 가능 시각. 재시도 간격을 DB 에 둔다.
  next_attempt_at timestamptz not null default pg_catalog.clock_timestamp(),

  last_attempt_at timestamptz,

  -- 마지막 실패의 **코드만** 남긴다. provider 응답 본문·주소·문의 원문을 넣지 않는다.
  last_error_code text
    constraint lead_notification_outbox_last_error_code_check
    check (
      last_error_code is null
      or last_error_code ~ '^[A-Za-z0-9_.-]{1,60}$'
    ),

  /*
   * 알림이 담을 최소 정보.
   *
   * ★ 문의 원문 · 담당자명 · 연락처 · 이메일을 넣지 않는다.
   *   관리자는 이 메타데이터로 "무엇이 들어왔는지"만 알고, 상세는 로그인 후 본다.
   *   허용 키: submission_type · package_code · received_at · admin_path
   */
  payload jsonb not null default '{}'::jsonb
    constraint lead_notification_outbox_payload_check
    check (
      jsonb_typeof(payload) = 'object'
      and pg_column_size(payload) <= 2048
      and (
        select count(*) = 0
        from jsonb_object_keys(payload) as k(key)
        where k.key not in ('submission_type', 'package_code', 'received_at', 'admin_path')
      )
    ),

  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  -- 중복 방지: 같은 문의에 같은 채널 알림이 두 번 생기지 않는다.
  constraint lead_notification_outbox_lead_channel_key unique (lead_id, channel_code)
);

comment on table public.lead_notification_outbox is
  '상담 알림 outbox. 발송 대기·재시도·전달 상태를 관리한다. 문의 원문과 연락처는 담지 않는다.';

-- 발송 워커가 집어갈 대기 건을 찾는 경로
create index if not exists lead_notification_outbox_pending_idx
  on public.lead_notification_outbox (status, next_attempt_at)
  where status in ('pending', 'sending');

create index if not exists lead_notification_outbox_lead_idx
  on public.lead_notification_outbox (lead_id);


-- ---------------------------------------------------------------------
-- 3. updated_at
-- ---------------------------------------------------------------------

create or replace function private.set_lead_notification_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke execute on function private.set_lead_notification_updated_at() from public;
revoke execute on function private.set_lead_notification_updated_at() from anon;
revoke execute on function private.set_lead_notification_updated_at() from authenticated;

drop trigger if exists trg_lead_notification_outbox_updated_at
on public.lead_notification_outbox;

create trigger trg_lead_notification_outbox_updated_at
before update on public.lead_notification_outbox
for each row
execute function private.set_lead_notification_updated_at();

drop trigger if exists trg_lead_notification_channels_updated_at
on public.lead_notification_channels;

create trigger trg_lead_notification_channels_updated_at
before update on public.lead_notification_channels
for each row
execute function private.set_lead_notification_updated_at();


-- ---------------------------------------------------------------------
-- 4. 문의 저장 → outbox 행 생성 (AFTER INSERT)
-- ---------------------------------------------------------------------
-- ★ 알림 생성이 실패해도 상담 저장을 막지 않는다.
--   공개 상담 접수는 서비스의 입구다. outbox 는 운영 편의 기능이므로
--   여기서 예외를 올려 INSERT 를 되돌리지 않는다.
--   그래서 enabled 채널이 하나도 없어도, 이미 행이 있어도 조용히 넘어간다.
-- ★ SECURITY DEFINER 다. anon 이 lead_submissions 에 INSERT 할 때 실행되지만
--   anon 에게 outbox 권한을 주지 않기 위해서다. search_path 는 비운다.

create or replace function private.enqueue_lead_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel record;
begin
  for v_channel in
    select code
    from public.lead_notification_channels
    -- disabled 채널도 행을 만든다. 나중에 enabled 로 바뀌면 그때부터 보낼 수 있어야 한다.
    order by code
  loop
    begin
      insert into public.lead_notification_outbox (lead_id, channel_code, payload)
      values (
        new.id,
        v_channel.code,
        jsonb_build_object(
          'submission_type', new.submission_type,
          'package_code', new.package_code,
          'received_at', to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'admin_path', '/admin/leads'
        )
      )
      on conflict (lead_id, channel_code) do nothing;
    exception
      when others then
        -- 알림 생성 실패가 상담 접수를 막지 않는다.
        null;
    end;
  end loop;

  return null;
end;
$$;

revoke execute on function private.enqueue_lead_notifications() from public;
revoke execute on function private.enqueue_lead_notifications() from anon;
revoke execute on function private.enqueue_lead_notifications() from authenticated;

drop trigger if exists trg_lead_submissions_enqueue_notifications
on public.lead_submissions;

create trigger trg_lead_submissions_enqueue_notifications
after insert on public.lead_submissions
for each row
execute function private.enqueue_lead_notifications();


-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------
-- 읽기: HQ Admin · HQ Sales (업무상 "알림이 갔는가"를 알아야 한다)
-- 쓰기: HQ Admin 만, 그리고 RPC 를 통해서만 (직접 UPDATE 권한을 주지 않는다)

alter table public.lead_notification_channels enable row level security;
alter table public.lead_notification_outbox enable row level security;

drop policy if exists lead_notification_channels_select_hq
on public.lead_notification_channels;

create policy lead_notification_channels_select_hq
  on public.lead_notification_channels
  for select
  to authenticated
  using (
    (select private.is_hq_admin()) or (select private.is_hq_sales())
  );

drop policy if exists lead_notification_channels_update_admin
on public.lead_notification_channels;

create policy lead_notification_channels_update_admin
  on public.lead_notification_channels
  for update
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));

drop policy if exists lead_notification_outbox_select_hq
on public.lead_notification_outbox;

create policy lead_notification_outbox_select_hq
  on public.lead_notification_outbox
  for select
  to authenticated
  using (
    (select private.is_hq_admin()) or (select private.is_hq_sales())
  );

-- INSERT 정책을 두지 않는다. 행은 트리거(DEFINER)만 만든다.
-- DELETE 정책을 두지 않는다. 전달 이력은 지우지 않는다.

revoke all on public.lead_notification_channels from anon;
revoke all on public.lead_notification_channels from authenticated;
revoke all on public.lead_notification_outbox from anon;
revoke all on public.lead_notification_outbox from authenticated;

grant select on public.lead_notification_channels to authenticated;
grant update (status, blocked_note) on public.lead_notification_channels to authenticated;
grant select on public.lead_notification_outbox to authenticated;


-- ---------------------------------------------------------------------
-- 6. 전달 상태 기록 RPC (HQ Admin)
-- ---------------------------------------------------------------------
-- SECURITY INVOKER — RLS 가 최종 판정자다 (Invariant AI-1).
-- 발송 워커는 아직 없다. 이 RPC 는 워커가 생겼을 때 쓰는 경로이며,
-- 그때까지는 관리 화면에서 'skipped' 처리에만 쓰인다.

create or replace function public.record_lead_notification_result(
  p_outbox_id uuid,
  p_result text,
  p_error_code text default null,
  p_expected_updated_at timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.lead_notification_outbox;
  v_next_status text;
begin
  if p_result not in ('sent', 'failed', 'skipped', 'retry') then
    raise exception 'LN001 알 수 없는 결과값입니다.' using errcode = 'LN001';
  end if;

  select * into v_row
  from public.lead_notification_outbox
  where id = p_outbox_id
  for update;

  if not found then
    -- RLS 로 막혔거나 없는 id. 어느 쪽인지 구분해 알려 주지 않는다.
    raise exception 'LN002 알림 기록을 찾을 수 없습니다.' using errcode = 'LN002';
  end if;

  if p_expected_updated_at is not null
     and v_row.updated_at <> p_expected_updated_at then
    raise exception 'LN003 다른 사용자가 먼저 변경했습니다. 새로 불러온 뒤 다시 시도해 주세요.'
      using errcode = 'LN003';
  end if;

  if v_row.status in ('sent', 'skipped') then
    raise exception 'LN004 이미 종료된 알림입니다.' using errcode = 'LN004';
  end if;

  v_next_status := case p_result
    when 'retry' then 'pending'
    else p_result
  end;

  update public.lead_notification_outbox
  set
    status = v_next_status,
    attempt_count = least(v_row.attempt_count + 1, 20),
    last_attempt_at = pg_catalog.clock_timestamp(),
    last_error_code = p_error_code,
    -- 재시도 간격: 시도 횟수에 따라 늘린다 (분 단위). 상한 24시간.
    next_attempt_at = case
      when p_result = 'retry'
        then pg_catalog.clock_timestamp()
             + least(interval '24 hours',
                     (power(2, least(v_row.attempt_count + 1, 10))::int) * interval '1 minute')
      else v_row.next_attempt_at
    end
  where id = p_outbox_id;
end;
$$;

revoke execute on function public.record_lead_notification_result(uuid, text, text, timestamptz) from public;
revoke execute on function public.record_lead_notification_result(uuid, text, text, timestamptz) from anon;
grant execute on function public.record_lead_notification_result(uuid, text, text, timestamptz) to authenticated;


-- ---------------------------------------------------------------------
-- 7. 보유기간 검토 목록 (뷰)
-- ---------------------------------------------------------------------
-- ★ closed 를 자동 파기 트리거로 쓰지 않는다 (지침 §8 D3).
--   "검토 대상"만 모아 보여 주고, 실제 파기는 사람이 별도 승인으로 한다.
--   기준일 수는 정책 미확정이므로 DB 에 박지 않고 호출자가 넘긴다.

create or replace function public.lead_retention_review(p_days integer default 365)
returns table (
  lead_id uuid,
  submission_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  days_since_update integer
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    l.id,
    l.submission_type,
    l.status,
    l.created_at,
    l.updated_at,
    (extract(day from (pg_catalog.clock_timestamp() - l.updated_at)))::int
  from public.lead_submissions l
  where l.status in ('converted', 'closed')
    and l.updated_at < pg_catalog.clock_timestamp()
                       - (greatest(coalesce(p_days, 365), 0) * interval '1 day')
  order by l.updated_at asc
  limit 500;
$$;

revoke execute on function public.lead_retention_review(integer) from public;
revoke execute on function public.lead_retention_review(integer) from anon;
grant execute on function public.lead_retention_review(integer) to authenticated;


-- =====================================================================
-- 변경하지 않은 것 (명시)
-- ---------------------------------------------------------------------
--   public.lead_submissions 의 컬럼 · CHECK · RLS · GRANT     그대로
--     → anon INSERT 정책, status UPDATE 권한, 기존 행 전부 그대로다.
--   private.is_soyes_admin · is_hq_admin · is_hq_sales        그대로
--   storage.buckets / storage.objects                        그대로
--   기존 audit_events · platform_capabilities                그대로
--   어떤 기능도 출시 상태로 바꾸지 않는다.
--   메일을 보내지 않는다. operator_email 채널은 disabled 로 생성된다.
-- =====================================================================
