-- =====================================================================
-- 실행 묶음 C3 — Child Portal 만료 적용 · 공개 조회 rate limit
-- ---------------------------------------------------------------------
-- 근거: 통합 실행 지침 §7 C3 · PHASE 10A SEC-NEW-3 · IB-5 / AD-14
--
-- 문제 1 — 공개 설명과 실제 동작이 다르다 (SEC-NEW-3)
--   공개 법적 문서는 보호자 공유 링크가 30일 후 만료된다고 설명한다.
--   기존 legacy 공유(child_growth_report_shares)는 실제로 30일 만료가 맞다.
--   그런데 새 Child Portal 은 발급 시 expires_at 을 null 로 두어 무기한이다
--   (20261001120000_m4 의 발급 trigger). read_child_portal 은 null 을
--   "만료 없음"으로 읽으므로, 한 번 나간 링크가 영구히 열린다.
--
-- 문제 2 — 공개 조회에 횟수 제한이 없다 (IB-5 / AD-14)
--   /api/share/portal/resolve 는 anon 이 호출한다. token 은 고엔트로피지만
--   제한이 없으면 남용·과금 경로가 열려 있다.
--
-- 이 migration 이 하는 것
--   · 발급 시 expires_at 을 공유 정책 기간(30일)으로 설정
--   · 그 기간을 DB 한 곳(private.portal_share_window())에 둔다
--   · 기존 무기한 링크를 **자동으로 바꾸지 않는다.** 소급 적용은 운영자가
--     별도 RPC 로 실행하고, 영향 건수를 먼저 읽어 볼 수 있게 한다.
--   · 분산 환경에서 동작하는 rate limit 을 DB 에 둔다 (in-memory 아님)
--
-- 이 migration 이 하지 않는 것
--   ★ 기존 링크를 끊지 않는다. 소급 변경은 사람이 결정한다.
--   ★ IP·token 원문을 저장하지 않는다. 호출자가 만든 해시만 받는다.
--   ★ parent_portal 기능을 출시하지 않는다 (CO-12 blocker 그대로).
--   ★ 아동 기록 보유기간과 혼동하지 않는다 — 이것은 **공유 링크** 정책이다.
--
-- 적용 상태: **원격 미적용.** 로컬 파일로만 둔다.
-- 의존: 20261001093000_m1_report_portal_foundation.sql
--       20261001120000_m4_report_portal_rpcs.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 공유 링크 유효기간 — 한 곳에서 정한다
-- ---------------------------------------------------------------------
-- 공개 법적 문서가 설명하는 값과 같아야 한다. 바뀌면 이 함수와 문서를 함께 고친다.

create or replace function private.portal_share_window()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '30 days';
$$;

comment on function private.portal_share_window() is
  '보호자 공유 링크 유효기간. 공개 법적 문서의 "30일" 설명과 같은 값이어야 한다. 아동 기록 보유기간이 아니다.';

revoke execute on function private.portal_share_window() from public;
revoke execute on function private.portal_share_window() from anon;
grant execute on function private.portal_share_window() to authenticated;


-- ---------------------------------------------------------------------
-- 2. 발급 시 만료 설정
-- ---------------------------------------------------------------------
-- m4 의 발급 trigger 는 status 가 'active' 로 들어올 때 expires_at 을 null 로 두었다.
-- 여기서는 **그 trigger 를 바꾸지 않고**, 뒤에 붙는 BEFORE INSERT trigger 하나로
-- null 인 경우에만 기본 만료를 채운다. 운영자가 명시적으로 넣은 값은 건드리지 않는다.
--
-- 기존 trigger 를 수정하지 않는 이유: 이미 적용된 migration 을 덮어쓰지 않는다는 규칙
-- (통합 실행 지침 §5 A1).

create or replace function private.set_portal_default_expiry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'active' and new.expires_at is null then
    new.expires_at := pg_catalog.clock_timestamp() + private.portal_share_window();
  end if;
  return new;
end;
$$;

revoke execute on function private.set_portal_default_expiry() from public;
revoke execute on function private.set_portal_default_expiry() from anon;
revoke execute on function private.set_portal_default_expiry() from authenticated;

-- 이름 앞에 z_ 를 붙여 m4 의 발급 trigger 보다 **나중에** 실행되게 한다.
-- PostgreSQL 은 같은 시점의 trigger 를 이름 순으로 실행한다.
drop trigger if exists z_trg_child_portals_default_expiry on public.child_portals;

create trigger z_trg_child_portals_default_expiry
before insert on public.child_portals
for each row
execute function private.set_portal_default_expiry();


-- ---------------------------------------------------------------------
-- 3. 소급 적용 — 읽기 먼저, 변경은 별도 호출
-- ---------------------------------------------------------------------
-- ★ 자동으로 바꾸지 않는다. 기존 링크를 끊는 변경이기 때문이다.
--   운영자가 (1) 영향 건수를 읽고 (2) 결정한 뒤 (3) 명시적으로 실행한다.

create or replace function public.portal_unlimited_access_count()
returns integer
language sql
security invoker
set search_path = ''
stable
as $$
  select count(*)::int
  from public.child_portals p
  where p.status = 'active'
    and p.expires_at is null;
$$;

comment on function public.portal_unlimited_access_count() is
  '만료가 없는 활성 공유 링크 수. 소급 적용 전에 영향 범위를 확인하는 용도.';

revoke execute on function public.portal_unlimited_access_count() from public;
revoke execute on function public.portal_unlimited_access_count() from anon;
grant execute on function public.portal_unlimited_access_count() to authenticated;


create or replace function public.apply_portal_share_window(p_confirm_count integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actual integer;
  v_changed integer;
begin
  -- HQ Admin 만. 원장에게 소급 변경 권한을 주지 않는다.
  if not (select private.is_hq_admin()) then
    raise exception 'PT401 권한이 없습니다.' using errcode = 'PT401';
  end if;

  select public.portal_unlimited_access_count() into v_actual;

  -- 호출자가 읽은 건수와 지금 건수가 다르면 멈춘다.
  -- "몇 건이 바뀌는지 모르고 실행"하는 것을 막는다.
  if p_confirm_count is distinct from v_actual then
    raise exception
      'PT409 대상 건수가 달라졌습니다. 다시 확인한 뒤 실행해 주세요. (확인값 %, 현재 %)',
      p_confirm_count, v_actual
      using errcode = 'PT409';
  end if;

  update public.child_portals
  set expires_at = pg_catalog.clock_timestamp() + private.portal_share_window()
  where status = 'active'
    and expires_at is null;

  get diagnostics v_changed = row_count;

  insert into public.audit_events (
    organization_id, actor_user_id, event_type, target_type, target_id, reason, metadata
  )
  values (
    null,
    auth.uid(),
    'portal.share_window_applied',
    'child_portal',
    null,
    '무기한 공유 링크에 공유 정책 기간을 소급 적용',
    jsonb_build_object('changed', v_changed)
  );

  return v_changed;
end;
$$;

comment on function public.apply_portal_share_window(integer) is
  '만료 없는 활성 공유 링크에 유효기간을 소급 적용한다. HQ Admin 전용. 대상 건수를 인자로 확인받는다.';

revoke execute on function public.apply_portal_share_window(integer) from public;
revoke execute on function public.apply_portal_share_window(integer) from anon;
grant execute on function public.apply_portal_share_window(integer) to authenticated;


-- ---------------------------------------------------------------------
-- 4. 공개 조회 rate limit
-- ---------------------------------------------------------------------
-- 분산 환경(여러 서버 함수 인스턴스)에서도 동작해야 하므로 DB 에 둔다.
-- in-memory 카운터는 인스턴스마다 따로 세기 때문에 전역 제한이 되지 않는다.
--
-- ★ IP·token 원문을 저장하지 않는다.
--   호출자(route handler)가 서버 비밀값을 섞어 만든 sha256 hex 만 넘긴다.
--   이 테이블만 보고 누가 접속했는지 되짚을 수 없다.

create table if not exists public.portal_access_throttle (

  -- sha256 hex. 원문(IP · token)은 서버 밖으로도 DB 로도 나오지 않는다.
  bucket_key text not null
    constraint portal_access_throttle_bucket_key_check
    check (bucket_key ~ '^[0-9a-f]{64}$'),

  -- 분 단위 창. truncate 된 시작 시각.
  window_start timestamptz not null,

  attempt_count integer not null default 0
    constraint portal_access_throttle_attempt_count_check
    check (attempt_count >= 0),

  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint portal_access_throttle_pkey primary key (bucket_key, window_start)
);

comment on table public.portal_access_throttle is
  '보호자 공유 링크 공개 조회 횟수 창. IP·token 원문을 담지 않고 서버가 만든 해시만 담는다.';

create index if not exists portal_access_throttle_window_idx
  on public.portal_access_throttle (window_start);

alter table public.portal_access_throttle enable row level security;

-- 테이블 직접 접근은 누구에게도 주지 않는다. 아래 RPC 만 쓴다.
revoke all on public.portal_access_throttle from anon;
revoke all on public.portal_access_throttle from authenticated;


/*
 * 창 설정.
 *
 * 분당 20회 · 시간당 120회. token 이 43자 base64url(256bit) 이므로
 * 추측 공격은 비현실적이고, 이 제한은 남용·과금 쪽을 막는 것이다.
 * 값은 한 곳에서 정하고, 바뀌면 이 함수만 고친다.
 */
create or replace function private.portal_throttle_limits()
returns table (window_seconds integer, max_attempts integer)
language sql
immutable
set search_path = ''
as $$
  select * from (values (60, 20), (3600, 120)) as t(window_seconds, max_attempts);
$$;

revoke execute on function private.portal_throttle_limits() from public;
revoke execute on function private.portal_throttle_limits() from anon;


/**
 * 조회 1회를 기록하고 허용 여부를 돌려준다.
 *
 * SECURITY DEFINER 다 — anon 이 테이블에 쓰기 권한을 갖지 않게 하기 위해서다.
 * 입력은 sha256 hex 형식만 받는다. 형식이 아니면 조용히 거부한다.
 *
 * 반환 true  = 허용
 *      false = 제한 초과
 */
create or replace function public.register_portal_access_attempt(p_bucket_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit record;
  v_window_start timestamptz;
  v_bucket text;
  v_count integer;
begin
  if p_bucket_key is null or p_bucket_key !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  for v_limit in select * from private.portal_throttle_limits() loop
    -- 창 시작 시각으로 내림한다. 같은 창 안의 호출이 한 행에 모인다.
    v_window_start := to_timestamp(
      floor(extract(epoch from pg_catalog.clock_timestamp()) / v_limit.window_seconds)
      * v_limit.window_seconds
    );

    /*
     * 창 크기별로 다른 행을 써야 한다. 분당 창과 시간당 창이 같은 키를 쓰면
     * 서로의 카운터를 더해 버린다. bucket_key 는 CHECK 로 64자 hex 로 묶여 있어
     * 접미사를 붙일 수 없으므로, 창 크기를 섞어 다시 해시한다.
     */
    v_bucket := encode(
      sha256(convert_to(p_bucket_key || ':' || v_limit.window_seconds::text, 'UTF8')),
      'hex'
    );

    insert into public.portal_access_throttle as t (bucket_key, window_start, attempt_count)
    values (v_bucket, v_window_start, 1)
    on conflict (bucket_key, window_start)
    do update set
      attempt_count = t.attempt_count + 1,
      updated_at = pg_catalog.clock_timestamp()
    returning t.attempt_count into v_count;

    if v_count > v_limit.max_attempts then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

comment on function public.register_portal_access_attempt(text) is
  '공개 공유 링크 조회 1회를 기록하고 허용 여부를 돌려준다. 해시만 받고 원문을 저장하지 않는다.';

revoke execute on function public.register_portal_access_attempt(text) from public;
revoke execute on function public.register_portal_access_attempt(text) from authenticated;
grant execute on function public.register_portal_access_attempt(text) to anon;


/**
 * 오래된 창 정리.
 *
 * cron 을 등록하지 않는다 (이번 단계에서 외부 스케줄 등록을 하지 않는다).
 * 운영자나 후속 작업이 호출한다.
 */
create or replace function public.purge_portal_access_throttle(p_older_than_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not (select private.is_hq_admin()) then
    raise exception 'PT401 권한이 없습니다.' using errcode = 'PT401';
  end if;

  delete from public.portal_access_throttle
  where window_start < pg_catalog.clock_timestamp()
                       - (greatest(coalesce(p_older_than_hours, 48), 1) * interval '1 hour');

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.purge_portal_access_throttle(integer) from public;
revoke execute on function public.purge_portal_access_throttle(integer) from anon;
grant execute on function public.purge_portal_access_throttle(integer) to authenticated;


-- =====================================================================
-- 변경하지 않은 것 (명시)
-- ---------------------------------------------------------------------
--   20261001120000_m4 의 발급 trigger 본문                   그대로
--     → 새 trigger(z_ 접두어)가 뒤에 붙어 null 인 경우만 채운다.
--   public.read_child_portal                                 그대로
--     → 이미 (expires_at is null or expires_at > now()) 를 본다.
--       이 migration 은 "null 로 남는 경우"를 줄이는 것이다.
--   기존 child_portals 행                                    **그대로**
--     → 소급 적용은 apply_portal_share_window() 를 사람이 실행해야 일어난다.
--   child_growth_report_shares (legacy 30일 만료)             그대로
--   platform_capabilities.parent_portal                      그대로 (CO-12 blocker 유지)
--   아동 기록 보유기간                                        이 migration 과 무관
-- =====================================================================
