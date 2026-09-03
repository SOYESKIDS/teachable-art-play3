-- =====================================================================================
-- SERVICE-13  학부모 성장 리포트 안전 공유
-- =====================================================================================
--
--  이 마이그레이션이 여는 것은 하나뿐이다.
--    "원장이 만든 링크를 가진 사람이, 유효기간 동안, 작성 완료된 성장 리포트 하나를
--     로그인 없이 읽는다."
--
--  로그인하지 않은 외부 사용자가 접근하는 첫 기능이라 편의보다 차단을 앞세운다.
--
--  ★ 표(table)는 anon 에게 한 칸도 열지 않는다.
--    공개 읽기는 오직 아래 read_shared_growth_report() 하나로만 이루어진다.
--    그 함수가 반환하는 컬럼 목록이 곧 "부모가 볼 수 있는 것의 전부"다.
--
--  ★ 비밀값 원본을 저장하지 않는다.
--    DB 에는 SHA-256(token) 만 있다. 원본은 생성 응답에서 원장에게 한 번 전달되고
--    서버 메모리에서 사라진다. DB 에서 링크를 복원하는 경로가 존재하지 않는다.
--    링크를 잃으면 "새 링크 발급"(기존 중지 + 새 비밀값)만이 방법이다.
--
--  ★ 저장된 hash 는 credential 이 아니다 (pass-the-hash 방지)
--    공개 함수는 **원본 token 을 받아 함수 안에서 직접 SHA-256 을 계산**하고
--    저장된 hash 와 비교한다. 애플리케이션이 계산한 hash 를 인증값으로 받지 않는다.
--
--    그래서 DB dump · backup · 읽기 전용 유출로 (id, token_hash) 를 얻어도
--    그 hash 를 그대로 넣어서는 아무것도 열리지 않는다.
--    열려면 sha256(x) = 저장된 hash 인 x 를 찾아야 하고, 그것이 곧 원본 token 이다.
--
--  ★ 삭제가 없다.
--    공유 중지는 DELETE 가 아니라 revoked_at 기록이다. DELETE Policy 도,
--    DELETE GRANT 도 만들지 않는다. 언제 누가 공유를 열고 닫았는지는 남아야 한다.
--
--  ★ 아동을 평가하지 않는다.
--    점수 · 등급 · 발달단계 · 위험도 · 진단 컬럼이 없고, 공개 함수도 그런 값을
--    만들어 내지 않는다. 부모가 받는 것은 교사가 쓰고 작성 완료한 문장 그대로다.
--
--  ── 오류 코드 ────────────────────────────────────────────────────────────────
--    SH001 : 입력 형식 오류
--    SH002 : 대상을 찾을 수 없거나 권한이 없다
--    SH003 : 작성 완료된 리포트만 공유할 수 있다
--    SH004 : 이미 중지된 공유다
--    SH005 : 공유 링크의 구조 값은 바꿀 수 없다
--
--  ── 이 마이그레이션이 바꾸지 않는 것 ─────────────────────────────────────────
--    기존 표 · Policy · RPC · trigger 를 하나도 수정하거나 삭제하지 않는다.
--    child_growth_reports 에는 UNIQUE 제약 하나만 **추가**한다(아래 1번).
--    SERVICE-07 ~ 12 의 동작은 그대로다.
-- =====================================================================================


-- =========================================================
-- 1. child_growth_reports (id, organization_id) UNIQUE
-- =========================================================
-- 공유 행이 리포트와 **같은 기관**을 가리킨다는 것을 DB 가 보증하게 하려면
-- 복합 FK 가 필요하고, 복합 FK 는 부모 쪽에 같은 조합의 UNIQUE 를 요구한다.
--
-- ★ 순수 추가다. 기존 제약을 건드리지 않고 데이터도 바꾸지 않는다.
--   id 가 이미 PK 라 이 조합은 언제나 유일하므로 검증이 실패할 수 없다.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'child_growth_reports_id_org_key'
      and conrelid = 'public.child_growth_reports'::regclass
  ) then
    alter table public.child_growth_reports
      add constraint child_growth_reports_id_org_key unique (id, organization_id);
  end if;
end $$;


-- =========================================================
-- 2. 표
-- =========================================================
create table if not exists public.child_growth_report_shares (

  -- ★ 공개 URL 에 들어가는 값이다. 비밀값이 아니다.
  --   gen_random_uuid() 는 122bit 난수라 열거로 맞힐 수 있는 값이 아니지만,
  --   이것만으로는 아무것도 열리지 않는다 — token_hash 가 함께 맞아야 한다.
  id uuid primary key default gen_random_uuid(),

  -- ★ Client 가 정하지 않는다. 아래 INSERT trigger 가 리포트에서 읽어 채운다.
  organization_id uuid not null,
  report_id uuid not null,

  -- ★ 원본이 아니라 SHA-256 hex 다.
  --   INSERT GRANT 에는 있고 SELECT GRANT 에는 없는 유일한 컬럼이다 —
  --   쓸 수는 있어도 읽어 갈 수는 없다.
  token_hash text not null
    constraint child_growth_report_shares_token_hash_key unique
    constraint child_growth_report_shares_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),

  -- ★ 전부 서버가 정한다. 어느 GRANT 목록에도 없다.
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,

  -- 공유 중지. DELETE 대신 이 두 칸이 남는다.
  revoked_at timestamptz,
  revoked_by uuid,

  updated_at timestamptz not null default now(),

  -- ★ (1) 공유는 리포트와 반드시 같은 기관이어야 한다.
  --   기관이 다른 리포트를 가리키는 공유 행은 만들어질 수 없다.
  constraint child_growth_report_shares_report_fk
    foreign key (report_id, organization_id)
    references public.child_growth_reports (id, organization_id)
    on delete cascade,

  -- ★ (2) 사람 참조는 계정이 지워져도 기록을 남긴다 (08A~11B 와 같은 판단).
  constraint child_growth_report_shares_created_by_fk
    foreign key (created_by) references public.profiles (user_id) on delete set null,

  constraint child_growth_report_shares_revoked_by_fk
    foreign key (revoked_by) references public.profiles (user_id) on delete set null,

  -- ★ (3) 유효기간은 만든 시각보다 뒤여야 한다.
  constraint child_growth_report_shares_expiry_check
    check (expires_at > created_at)
);

comment on table public.child_growth_report_shares is
  'SERVICE-13 학부모 공유 링크. token 원본은 저장하지 않고 SHA-256 만 보관한다.';


-- 원장 화면이 "이 리포트의 활성 공유"를 찾는 경로.
create index if not exists child_growth_report_shares_report_idx
  on public.child_growth_report_shares (report_id);


-- =========================================================
-- 3. 한 리포트에 살아 있는 공유는 하나뿐
-- =========================================================
-- ★ 조건에 now() 같은 volatile 함수를 쓰지 않는다.
--   partial index 의 술어는 IMMUTABLE 이어야 하고, 시간 조건을 넣으면
--   같은 행이 시점에 따라 index 에 들었다 나왔다 하게 된다.
--   그래서 "만료"가 아니라 "중지"만 기준으로 삼는다.
--
-- ★ 만료됐지만 중지되지 않은 공유가 새 발급을 막는 문제는
--   create RPC 가 먼저 기존 행을 중지시키고 새로 넣는 순서로 해결한다.
create unique index if not exists child_growth_report_shares_active_key
  on public.child_growth_report_shares (report_id)
  where revoked_at is null;


-- =========================================================
-- 4. INSERT trigger — 서버가 정하는 값
-- =========================================================
create or replace function private.enforce_growth_report_share_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_status text;
begin
  -- ★ 부모 리포트를 서버가 직접 읽는다. Client 가 보낸 기관 값을 쓰지 않는다.
  select r.organization_id, r.status
  into v_org, v_status
  from public.child_growth_reports r
  where r.id = new.report_id;

  if not found then
    raise exception '공유할 성장 리포트를 찾을 수 없습니다.' using errcode = 'SH002';
  end if;

  -- ★ 작성 중인 리포트는 공유 대상이 아니다.
  --   원장의 SELECT Policy 가 draft 를 숨기지만, 여기서 한 번 더 끊는다 —
  --   이 trigger 는 DEFINER 라 draft 도 보이기 때문에 명시적으로 거부해야 한다.
  if v_status <> 'complete' then
    raise exception '작성 완료된 성장 리포트만 학부모에게 공유할 수 있습니다.'
      using errcode = 'SH003';
  end if;

  -- ★ 공유를 열 수 있는 사람은 그 기관의 원장뿐이다.
  --   교사는 리포트를 쓰지만 외부 공개 권한은 갖지 않는다.
  if not private.has_org_role(v_org, array['director']) then
    raise exception '학부모 공유 링크를 만들 권한이 없습니다.' using errcode = 'SH002';
  end if;

  new.organization_id := v_org;
  new.created_by := auth.uid();
  new.created_at := pg_catalog.clock_timestamp();

  -- 기본 유효기간 30일. Client 가 정할 수 없다(GRANT 에 없다).
  new.expires_at := pg_catalog.clock_timestamp() + interval '30 days';

  -- 새로 만든 공유는 언제나 살아 있는 상태로 시작한다.
  new.revoked_at := null;
  new.revoked_by := null;
  new.updated_at := pg_catalog.clock_timestamp();

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_share_insert()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_report_shares_insert_check
on public.child_growth_report_shares;

create trigger trg_child_growth_report_shares_insert_check
before insert on public.child_growth_report_shares
for each row
execute function private.enforce_growth_report_share_insert();


-- =========================================================
-- 5. UPDATE trigger — 중지만 허용한다
-- =========================================================
-- 이 표의 UPDATE 는 두 가지뿐이다.
--   중지    : revoked_at 이 처음으로 채워진다 (값은 서버가 정한다)
--   FK 정리 : created_by / revoked_by 가 NULL 로 비워진다 (계정 삭제)
-- 그 밖의 모든 변경은 거부한다. 되살리기도 없다.
create or replace function private.enforce_growth_report_share_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fk_cleanup boolean;
begin
  -- ---------------------------------------------------------------
  -- (0) metadata-only FK cleanup 인가? (SERVICE-10/11B 에서 얻은 교훈)
  --
  --   created_by / revoked_by 는 profiles 에 on delete set null 로 매달려 있다.
  --   계정이 삭제되면 PostgreSQL 이 이 행에 UPDATE ... SET x = NULL 을 실행하고
  --   그 UPDATE 도 이 trigger 를 발동시킨다. 일반 경로로 흘려보내면
  --   권한 검사에 걸려 계정 삭제 자체가 실패한다.
  --
  --   ★ 우회로가 되지 않는 이유
  --     ① 허용하는 변화가 "non-null → NULL" 뿐이다. NULL → UUID 도, A → B 도 아니다.
  --     ② 나머지 컬럼이 하나라도 다르면 아래 일반 경로로 내려간다.
  --     ③ created_by / revoked_by 는 어느 GRANT 목록에도 없어서
  --        authenticated 가 SET 목록에 넣는 것 자체가 42501 이다.
  --     ④ 이 분기는 revoked_at 을 채우지 않는다 —
  --        계정 삭제가 공유를 중지시키지도, 되살리지도 않는다.
  -- ---------------------------------------------------------------
  v_fk_cleanup :=
    (new.created_by is not distinct from old.created_by
      or (old.created_by is not null and new.created_by is null))
    and (new.revoked_by is not distinct from old.revoked_by
      or (old.revoked_by is not null and new.revoked_by is null))
    and (new.created_by is distinct from old.created_by
      or new.revoked_by is distinct from old.revoked_by)
    and new.id is not distinct from old.id
    and new.organization_id is not distinct from old.organization_id
    and new.report_id is not distinct from old.report_id
    and new.token_hash is not distinct from old.token_hash
    and new.created_at is not distinct from old.created_at
    and new.expires_at is not distinct from old.expires_at
    and new.revoked_at is not distinct from old.revoked_at;

  if v_fk_cleanup then
    new.updated_at := greatest(
      pg_catalog.clock_timestamp(),
      old.updated_at + interval '1 microsecond'
    );
    return new;
  end if;

  -- (1) 구조 값은 불변이다. 공유가 가리키는 리포트를 바꿔치기할 수 없고,
  --     token_hash 를 다른 값으로 바꿔 링크를 갈아끼울 수도 없다.
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.report_id is distinct from old.report_id
    or new.token_hash is distinct from old.token_hash
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at
  then
    raise exception '공유 링크의 대상과 유효기간은 변경할 수 없습니다.'
      using errcode = 'SH005';
  end if;

  -- (2) 이 기관의 원장인가.
  if not private.has_org_role(old.organization_id, array['director']) then
    raise exception '이 공유 링크를 변경할 권한이 없습니다.' using errcode = 'SH002';
  end if;

  -- (3) 되살리기는 없다. 이미 중지된 공유는 다시 열 수 없다.
  if old.revoked_at is not null then
    raise exception '이미 중지된 공유 링크입니다.' using errcode = 'SH004';
  end if;

  if new.revoked_at is null then
    raise exception '공유 링크에는 중지 외의 변경이 없습니다.' using errcode = 'SH005';
  end if;

  -- ★ 중지. 값은 서버가 정한다 — Client 가 보낸 시각을 쓰지 않는다.
  new.revoked_at := pg_catalog.clock_timestamp();
  new.revoked_by := auth.uid();

  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );

  return new;
end;
$$;

revoke execute on function private.enforce_growth_report_share_update()
from public, anon, authenticated;

drop trigger if exists trg_child_growth_report_shares_update_check
on public.child_growth_report_shares;

create trigger trg_child_growth_report_shares_update_check
before update on public.child_growth_report_shares
for each row
execute function private.enforce_growth_report_share_update();


-- =========================================================
-- 6. GRANT
-- =========================================================
-- ★ anon 에게는 이 표의 어떤 권한도 주지 않는다.
--   부모는 표를 읽지 않는다. read_shared_growth_report() 하나만 호출한다.
--
-- ★ token_hash 는 INSERT 목록에만 있고 SELECT 목록에는 없다.
--   원장도 자기가 만든 공유의 hash 를 읽어 갈 수 없다. 읽을 이유가 없고,
--   읽히면 offline 대입 시도의 출발점이 된다.
--
-- ★ DELETE 는 어디에도 없다.
--
-- ★ organization_id / created_by / created_at 은 SELECT 목록에 없다.
--   원장 화면에 필요한 것은 "언제 만들었고 언제까지이고 중지됐는가"뿐이다.
--   (created_at 은 화면에 보여 주므로 포함한다)
revoke all on public.child_growth_report_shares from anon, authenticated;

grant select (
  id,
  report_id,
  created_at,
  expires_at,
  revoked_at
) on public.child_growth_report_shares to authenticated;

grant insert (
  report_id,
  token_hash
) on public.child_growth_report_shares to authenticated;

grant update (
  revoked_at
) on public.child_growth_report_shares to authenticated;


-- =========================================================
-- 7. RLS
-- =========================================================
-- anon        : 0건 (GRANT 도 Policy 도 없다)
-- 교사        : ★ 분기 없음. 리포트는 쓰지만 외부 공개 권한은 없다.
-- SOYES 운영자 : 분기 없음. 이 표에 운영상 필요가 없다.
-- 원장        : 자기 기관 공유만 조회 · 생성 · 중지
alter table public.child_growth_report_shares enable row level security;


drop policy if exists "growth report shares readable by director"
on public.child_growth_report_shares;

create policy "growth report shares readable by director"
  on public.child_growth_report_shares
  for select
  to authenticated
  using (private.has_org_role(organization_id, array['director']));


drop policy if exists "growth report shares insert by director"
on public.child_growth_report_shares;

create policy "growth report shares insert by director"
  on public.child_growth_report_shares
  for insert
  to authenticated
  with check (private.has_org_role(organization_id, array['director']));


-- ★ USING 에 revoked_at is null 을 넣는 것이 "되살리기 없음"의 핵심이다.
--   중지된 행은 UPDATE 대상에서 사라진다.
drop policy if exists "growth report shares revoke by director"
on public.child_growth_report_shares;

create policy "growth report shares revoke by director"
  on public.child_growth_report_shares
  for update
  to authenticated
  using (
    private.has_org_role(organization_id, array['director'])
    and revoked_at is null
  )
  with check (
    private.has_org_role(organization_id, array['director'])
  );

-- DELETE Policy 는 만들지 않는다.


-- =========================================================
-- 8. RPC — 공유 링크 만들기 (원장)
-- =========================================================
-- ★ SECURITY INVOKER 다. 호출한 원장의 권한으로 실행되고 RLS 를 그대로 거친다.
--   권한 판정은 이 함수가 아니라 Policy 와 INSERT trigger 가 한다.
--
-- ★ token 원본은 이 함수에 오지 않는다. 서버가 계산한 SHA-256 hex 만 받는다.
--   DB 는 원본을 본 적이 없고, 로그에도 남을 수 없다.
--
-- ★ 기존 활성 공유를 먼저 중지하고 새로 만든다.
--   partial unique index 와 같은 transaction 안에서 처리되므로
--   동시에 두 번 눌러도 한쪽은 23505 로 실패한다(조용히 두 개가 생기지 않는다).
create or replace function public.create_child_growth_report_share(
  p_report_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_id uuid;
  v_expires timestamptz;
  v_created timestamptz;
begin
  if p_report_id is null or p_token_hash is null then
    raise exception '공유 링크를 만들 정보가 없습니다.' using errcode = 'SH001';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception '공유 토큰 형식이 올바르지 않습니다.' using errcode = 'SH001';
  end if;

  -- ★ RLS 로 다시 읽는다. 원장에게는 작성 완료된 리포트만 보인다 —
  --   작성 중 리포트는 여기서 not found 가 되어 SH002 로 끝난다.
  select r.status into v_status
  from public.child_growth_reports r
  where r.id = p_report_id;

  if not found then
    raise exception '성장 리포트를 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'SH002';
  end if;

  if v_status <> 'complete' then
    raise exception '작성 완료된 성장 리포트만 학부모에게 공유할 수 있습니다.'
      using errcode = 'SH003';
  end if;

  -- 기존 활성 공유를 먼저 중지한다 (만료된 것도 포함 — index 를 비운다).
  update public.child_growth_report_shares s
  set revoked_at = pg_catalog.clock_timestamp()
  where s.report_id = p_report_id
    and s.revoked_at is null;

  insert into public.child_growth_report_shares (report_id, token_hash)
  values (p_report_id, p_token_hash)
  returning id, expires_at, created_at into v_id, v_expires, v_created;

  return jsonb_build_object(
    'share_id', v_id,
    'expires_at', v_expires,
    'created_at', v_created
  );
end;
$$;

revoke execute on function public.create_child_growth_report_share(uuid, text)
from public, anon;

grant execute on function public.create_child_growth_report_share(uuid, text)
to authenticated;


-- =========================================================
-- 9. RPC — 공유 중지 (원장)
-- =========================================================
create or replace function public.revoke_child_growth_report_share(
  p_share_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revoked timestamptz;
begin
  if p_share_id is null then
    raise exception '중지할 공유 링크 정보가 없습니다.' using errcode = 'SH001';
  end if;

  update public.child_growth_report_shares s
  set revoked_at = pg_catalog.clock_timestamp()
  where s.id = p_share_id
    and s.revoked_at is null
  returning s.revoked_at into v_revoked;

  if not found then
    -- 없는 공유 · 다른 기관 공유 · 이미 중지된 공유를 구분해 알려 주지 않는다.
    raise exception '중지할 수 있는 공유 링크가 없습니다.' using errcode = 'SH004';
  end if;

  return jsonb_build_object('share_id', p_share_id, 'revoked_at', v_revoked);
end;
$$;

revoke execute on function public.revoke_child_growth_report_share(uuid)
from public, anon;

grant execute on function public.revoke_child_growth_report_share(uuid)
to authenticated;


-- =========================================================
-- 10. RPC — 부모 공개 읽기 (로그인 없음)
-- =========================================================
-- ★ 이 프로젝트에서 유일하게 anon 에게 EXECUTE 를 주는 함수다.
--   그래서 여기에만 SECURITY DEFINER 를 쓰고, 대신 다음을 모두 지킨다.
--
--     ① 읽기 전용이다. INSERT / UPDATE / DELETE 구문이 하나도 없다.
--     ② 동적 SQL 이 없다. EXECUTE · format() · quote_ident() 를 쓰지 않는다.
--     ③ language sql · stable 이다. 본문이 SELECT 하나뿐이라
--        나중에 누가 부수효과를 끼워 넣기 어렵다.
--     ④ set search_path = '' 이고 모든 object 를 스키마까지 적어 둔다.
--        search_path 를 조작해 다른 표를 읽히게 만들 수 없다.
--     ⑤ PUBLIC · authenticated 에서 EXECUTE 를 회수하고 anon 에만 준다.
--        부모 화면은 세션 없는 client(= anon)로만 이 함수를 부른다.
--        로그인한 교직원이 이 함수를 부를 경로가 앱 어디에도 없다.
--     ⑥ 반환 컬럼이 화이트리스트다. 아래 목록에 없는 값은 나갈 수 없다.
--     ⑦ ★ 인자가 raw token 이다. 해시는 이 함수 안에서만 만든다.
--        pg_catalog.sha256() 은 PostgreSQL 11 부터의 내장 함수라
--        extension 에 의존하지 않는다(pgcrypto 도, 그 스키마 위치도 알 필요가 없다).
--
-- ★ 반환하지 않는 것 (의도적으로 목록에 없다)
--     token_hash / share_id / report_id / child_id / organization_id / class_id / observation_id /
--     ai_draft_id / source_revision / reviewed_text / teacher_note /
--     child_voice / generated_text / provider / model / prompt_version /
--     storage path / signed URL / 파일명 / 교사 이메일 · UUID / 출결 수치
--
-- ★ 실패를 구분해 주지 않는다.
--   없는 공유 · 틀린 토큰 · 만료 · 중지 · 작성 중 리포트 —
--   전부 "0 rows" 하나로 끝난다. 열거 공격에 쓸 정보를 주지 않는다.
create or replace function public.read_shared_growth_report(
  p_share_id uuid,
  p_token text
)
returns table (
  organization_name text,
  class_name text,
  child_name text,
  report_title text,
  period_start date,
  period_end date,
  completed_at timestamptz,
  growth_changes text,
  observation_summary text,
  next_support text,
  activities jsonb
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    o.name,
    c.name,
    ch.name,
    r.title,
    r.period_start,
    r.period_end,
    r.completed_at,
    r.growth_changes,
    r.observation_summary,
    r.next_support,
    (
      -- 함께한 활동. 근거 snapshot 에서 세 가지만 꺼낸다.
      -- 관찰 원문(reviewed_text / teacher_note / child_voice)은 꺼내지 않는다.
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'observed_on', src.observed_on,
            'lesson_title', src.lesson_title_snapshot,
            'domain_labels', src.domain_labels_snapshot
          )
          order by src.observed_on, src.lesson_order_snapshot, src.id
        ),
        '[]'::jsonb
      )
      from public.child_growth_report_sources src
      where src.report_id = r.id
    )
  from public.child_growth_report_shares s
  join public.child_growth_reports r
    on r.id = s.report_id
   and r.organization_id = s.organization_id
  join public.organizations o
    on o.id = r.organization_id
  left join public.classes c
    on c.id = r.class_id
  left join public.children ch
    on ch.id = r.child_id
  where s.id = p_share_id
    -- ★ 형식이 아니면 더 볼 것도 없다. 예외가 아니라 0행으로 끝난다.
    --   randomBytes(32).toString('base64url') = 43자 [A-Za-z0-9_-]
    and p_token ~ '^[A-Za-z0-9_-]{43}$'
    -- ★ 저장된 hash 와 비교할 값을 여기서 만든다.
    --   호출자가 계산한 hash 를 받지 않으므로, 저장된 hash 를 그대로 넣어도
    --   sha256(hash) <> hash 라 통과할 수 없다.
    and s.token_hash = pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8')),
      'hex'
    )
    and s.revoked_at is null
    and s.expires_at > pg_catalog.clock_timestamp()
    and r.status = 'complete'
    and o.status = 'active';
$$;

-- ★ EXECUTE 를 anon 에게만 준다.
--   부모 resolve endpoint 는 세션 없는 client(createPublicClient)로 호출하므로
--   언제나 anon 이다. authenticated 가 이 함수를 부를 경로가 앱에 없으므로
--   권한도 주지 않는다 — 로그인 계정이 링크 없이 리포트를 여는 우회로를 만들지 않는다.
revoke execute on function public.read_shared_growth_report(uuid, text)
from public, authenticated;

grant execute on function public.read_shared_growth_report(uuid, text)
to anon;


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   child_growth_reports          : UNIQUE 제약 1개 추가 외에 변경 없음
--                                   (컬럼 · Policy · trigger · RPC 그대로)
--   child_growth_report_sources   : 변경 없음
--   child_growth_report_ai_drafts : 변경 없음 (11B AI 초안은 공유 대상이 아니다)
--   class_session_observations    : 변경 없음
--   class_session_observation_media / _ai_drafts : 변경 없음
--   class_session_attendance      : 변경 없음
--   storage.objects / buckets     : 변경 없음 (사진은 공유하지 않는다)
--
--   drop table / drop column / drop policy(기존) / alter column type — 0건.
-- =====================================================================================
