-- =====================================================================
-- 실행 묶음 D3 보완 — 알림 전달 처리 경로
-- ---------------------------------------------------------------------
-- 근거: 사용자 지시 항목 6 — "outbox 뿐 아니라 실제 전달 처리, 재시도·중복 방지·
--       실패 상태 확인까지 연결됐는지 확인하고 보완" ·
--       "실제 메일 발송과 외부 스케줄 등록은 하지 마"
--
-- 20261012090000 이 만든 것: 채널 · outbox · 상태 · 재시도 간격 · 결과 기록 RPC
-- 빠진 것:
--   1. pending → sending 으로 **원자적으로 집어가는** 경로가 없었다.
--      그래서 전달 처리기를 두 개 돌리면 같은 알림을 두 번 보낼 수 있다.
--   2. sending 에서 멈춘 행(처리기가 죽은 경우)을 되돌릴 경로가 없었다.
--      영원히 sending 으로 남아 다시 집어가지 못한다.
--   3. 실패 목록을 운영자가 확인할 조회 경로가 없었다.
--
-- 이 migration 이 하는 것
--   · lease 컬럼 (누가 · 언제까지 집어갔는가)
--   · claim RPC — `for update skip locked` 로 중복 집어가기 방지
--   · 만료 lease 회수 RPC
--   · 실패·대기 목록 조회 RPC
--
-- 이 migration 이 하지 않는 것
--   ★ 메일을 보내지 않는다. 전달은 앱의 adapter 가 하고, 기본 adapter 는 비활성이다.
--   ★ cron · queue 를 등록하지 않는다. 처리기는 사람이 호출한다.
--   ★ 채널을 활성화하지 않는다 (`operator_email` = disabled 유지).
--
-- 적용 상태: **원격 미적용.** 로컬 파일로만 둔다.
-- 의존: 20261012090000_d3_lead_notification_outbox.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. lease 컬럼
-- ---------------------------------------------------------------------
-- ★ 기존 컬럼·제약을 바꾸지 않고 추가만 한다 (additive).

alter table public.lead_notification_outbox
  add column if not exists claimed_at timestamptz;

alter table public.lead_notification_outbox
  add column if not exists claimed_by uuid references auth.users (id) on delete set null;

/*
 * lease 가 만료되는 시각.
 *
 * 처리기가 claim 한 뒤 이 시각까지 결과를 기록하지 않으면, 죽은 것으로 보고
 * 다른 처리기가 다시 집어갈 수 있게 pending 으로 되돌린다.
 */
alter table public.lead_notification_outbox
  add column if not exists lease_expires_at timestamptz;

comment on column public.lead_notification_outbox.lease_expires_at is
  'claim lease 만료 시각. 지나면 reclaim_stale_lead_notifications() 가 pending 으로 되돌린다.';

-- claim 대상을 찾는 경로
create index if not exists lead_notification_outbox_claimable_idx
  on public.lead_notification_outbox (status, next_attempt_at)
  where status = 'pending';

create index if not exists lead_notification_outbox_lease_idx
  on public.lead_notification_outbox (lease_expires_at)
  where status = 'sending';

-- lease 컬럼을 직접 쓰지 못하게 한다. 아래 RPC 만 바꾼다.
revoke update on public.lead_notification_outbox from authenticated;


-- ---------------------------------------------------------------------
-- 2. lease 기간
-- ---------------------------------------------------------------------

create or replace function private.lead_notification_lease_window()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '5 minutes';
$$;

revoke execute on function private.lead_notification_lease_window() from public;
revoke execute on function private.lead_notification_lease_window() from anon;


-- ---------------------------------------------------------------------
-- 3. claim — 중복 집어가기 방지
-- ---------------------------------------------------------------------
-- ★ `for update skip locked` 를 쓴다.
--   두 처리기가 동시에 돌아도 같은 행을 집지 않는다. 잠긴 행은 건너뛴다.
--
-- ★ 활성 채널만 집는다.
--   `operator_email` 이 disabled 인 동안 claim 결과는 항상 0건이다.
--   채널을 켜지 않고 발송이 시작되는 일이 없다.
--
-- ★ 본문을 돌려주지 않는다.
--   payload(4키)와 lead_id 만 돌려준다. 문의 원문·연락처는 여기에 없다.

create or replace function public.claim_lead_notifications(p_limit integer default 10)
returns table (
  outbox_id uuid,
  lead_id uuid,
  channel_code text,
  attempt_count integer,
  payload jsonb,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lease_until timestamptz;
begin
  if not (select private.is_hq_admin()) then
    raise exception 'LN401 권한이 없습니다.' using errcode = 'LN401';
  end if;

  v_lease_until := pg_catalog.clock_timestamp() + private.lead_notification_lease_window();

  return query
  with due as (
    select o.id
    from public.lead_notification_outbox o
    join public.lead_notification_channels c on c.code = o.channel_code
    where o.status = 'pending'
      and o.next_attempt_at <= pg_catalog.clock_timestamp()
      -- ★ 비활성 채널은 집지 않는다
      and c.status = 'enabled'
    order by o.next_attempt_at asc
    limit greatest(least(coalesce(p_limit, 10), 100), 1)
    for update of o skip locked
  )
  update public.lead_notification_outbox t
  set
    status = 'sending',
    claimed_at = pg_catalog.clock_timestamp(),
    claimed_by = auth.uid(),
    lease_expires_at = v_lease_until,
    updated_at = pg_catalog.clock_timestamp()
  from due
  where t.id = due.id
  returning t.id, t.lead_id, t.channel_code, t.attempt_count, t.payload, t.updated_at;
end;
$$;

comment on function public.claim_lead_notifications(integer) is
  '보낼 차례의 알림을 원자적으로 집어간다. 활성 채널만. 문의 원문·연락처를 반환하지 않는다.';

revoke execute on function public.claim_lead_notifications(integer) from public;
revoke execute on function public.claim_lead_notifications(integer) from anon;
grant execute on function public.claim_lead_notifications(integer) to authenticated;


-- ---------------------------------------------------------------------
-- 4. 만료 lease 회수
-- ---------------------------------------------------------------------
-- 처리기가 결과를 기록하지 못하고 죽은 행을 pending 으로 되돌린다.
-- ★ attempt_count 를 올리지 않는다 — 시도는 결과 기록 때 센다.
--   올리면 처리기가 죽을 때마다 재시도 상한이 줄어든다.

create or replace function public.reclaim_stale_lead_notifications()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not (select private.is_hq_admin()) then
    raise exception 'LN401 권한이 없습니다.' using errcode = 'LN401';
  end if;

  update public.lead_notification_outbox
  set
    status = 'pending',
    claimed_at = null,
    claimed_by = null,
    lease_expires_at = null,
    last_error_code = 'lease_expired',
    updated_at = pg_catalog.clock_timestamp()
  where status = 'sending'
    and lease_expires_at is not null
    and lease_expires_at < pg_catalog.clock_timestamp();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.reclaim_stale_lead_notifications() from public;
revoke execute on function public.reclaim_stale_lead_notifications() from anon;
grant execute on function public.reclaim_stale_lead_notifications() to authenticated;


-- ---------------------------------------------------------------------
-- 5. 결과 기록 — lease 를 함께 정리한다
-- ---------------------------------------------------------------------
-- 20261012090000 의 함수를 같은 이름으로 다시 만든다 (create or replace).
-- 이 파일이 그 migration 뒤에 오므로 최종 정의가 된다.
-- 바뀐 것: sending 상태 허용 · lease 컬럼 정리 · 재시도 상한 도달 시 failed 확정.

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
  v_attempts integer;
  v_max_attempts constant integer := 8;
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

  v_attempts := least(v_row.attempt_count + 1, 20);

  -- 재시도 상한에 닿으면 retry 요청이라도 failed 로 확정한다.
  v_next_status := case
    when p_result = 'retry' and v_attempts >= v_max_attempts then 'failed'
    when p_result = 'retry' then 'pending'
    else p_result
  end;

  update public.lead_notification_outbox
  set
    status = v_next_status,
    attempt_count = v_attempts,
    last_attempt_at = pg_catalog.clock_timestamp(),
    last_error_code = p_error_code,
    -- lease 는 결과를 기록하는 순간 끝난다
    claimed_at = null,
    claimed_by = null,
    lease_expires_at = null,
    next_attempt_at = case
      when v_next_status = 'pending'
        then pg_catalog.clock_timestamp()
             + least(interval '24 hours',
                     (power(2, least(v_attempts, 10))::int) * interval '1 minute')
      else v_row.next_attempt_at
    end
  where id = p_outbox_id;
end;
$$;

revoke execute on function public.record_lead_notification_result(uuid, text, text, timestamptz) from public;
revoke execute on function public.record_lead_notification_result(uuid, text, text, timestamptz) from anon;
grant execute on function public.record_lead_notification_result(uuid, text, text, timestamptz) to authenticated;


-- ---------------------------------------------------------------------
-- 6. 운영자 확인용 목록
-- ---------------------------------------------------------------------
-- 실패·대기 상태를 사람이 확인할 수 있게 한다.
-- 문의 원문·연락처를 돌려주지 않는다 — payload 4키와 상태만.

create or replace function public.list_lead_notification_issues(p_limit integer default 50)
returns table (
  outbox_id uuid,
  lead_id uuid,
  channel_code text,
  status text,
  attempt_count integer,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  last_error_code text,
  lease_expires_at timestamptz,
  payload jsonb,
  updated_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    o.id, o.lead_id, o.channel_code, o.status, o.attempt_count,
    o.last_attempt_at, o.next_attempt_at, o.last_error_code,
    o.lease_expires_at, o.payload, o.updated_at
  from public.lead_notification_outbox o
  where o.status in ('failed', 'sending')
     or (o.status = 'pending' and o.attempt_count > 0)
  order by o.updated_at desc
  limit greatest(least(coalesce(p_limit, 50), 200), 1);
$$;

revoke execute on function public.list_lead_notification_issues(integer) from public;
revoke execute on function public.list_lead_notification_issues(integer) from anon;
grant execute on function public.list_lead_notification_issues(integer) to authenticated;


-- =====================================================================
-- 변경하지 않은 것 (명시)
-- ---------------------------------------------------------------------
--   lead_notification_outbox 의 기존 컬럼 · CHECK · unique       그대로 (추가만)
--   lead_notification_channels                                  그대로 (disabled 유지)
--   private.enqueue_lead_notifications 트리거                    그대로
--   lead_submissions                                            그대로
--   lead_retention_review                                       그대로
--   메일을 보내지 않는다. cron · queue 를 등록하지 않는다.
-- =====================================================================
