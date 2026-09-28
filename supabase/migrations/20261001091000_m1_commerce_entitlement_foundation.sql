-- =====================================================================
-- PHASE 07 · M1 (additive only) — Product · Version · Contract · Scope ·
--                                 Capability registry · Lesson sections ·
--                                 Runtime entitlement helpers
-- ---------------------------------------------------------------------
-- 근거: DEC-048 ~ DEC-056 · DEC-063 · DEC-081 · DEC-082 · DEC-083 · DEC-096
--
-- · Entitlement 는 저장하지 않는다. 계약 · class scope · version feature 에서
--   매번 계산한다 (DEC-083). 수동 편집할 entitlement 행은 없다.
-- · Product Version: draft → published(불변) → retired (DEC-081).
-- · Contract 는 published version 만 참조한다.
-- · 같은 기관에 동시에 effective 한 계약은 1개 (Pilot 포함 · DEC-082).
--   강제 수단: 계약 행 쓰기 trigger + 기관 단위 advisory lock.
-- · 결제는 활성화 조건이 아니다 (DEC-050 · DEC-061).
-- · 기존 테이블 · 정책은 바꾸지 않는다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Feature code catalog (DEC-055 · 정책 코드 · enum 아님)
-- ---------------------------------------------------------------------

create or replace function private.is_known_feature_code(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code in (
    'class_mode',
    'weekly_report',
    'monthly_report',
    'semester_report',
    'director_dashboard',
    'parent_portal',
    'bulk_print',
    'content_playback',
    'ai_assist',
    'branding'
  );
$$;

revoke execute on function private.is_known_feature_code(text) from public;
grant execute on function private.is_known_feature_code(text) to authenticated;


-- ---------------------------------------------------------------------
-- 1. products
-- ---------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  code text not null
    constraint products_code_key unique
    constraint products_code_check
    check (code in ('starter', 'standard', 'premium', 'pilot')),

  -- Pilot 은 정규 Tier 가 아닌 별도 Offer (DEC-054)
  offer_type text not null
    constraint products_offer_type_check
    check (offer_type in ('regular', 'pilot')),

  display_name text not null
    constraint products_display_name_check
    check (char_length(btrim(display_name)) between 1 and 100),

  created_at timestamptz not null default now(),

  constraint products_pilot_offer_check
    check ((code = 'pilot') = (offer_type = 'pilot'))
);

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to authenticated;

drop policy if exists "products readable by hq and org members" on public.products;
create policy "products readable by hq and org members"
  on public.products
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_hq_sales())
    or (select private.is_active_org_member())
  );


-- ---------------------------------------------------------------------
-- 2. product_versions (draft · published · retired)
-- ---------------------------------------------------------------------

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products (id) on delete restrict,

  version_label text not null
    constraint product_versions_version_label_check
    check (char_length(btrim(version_label)) between 1 and 30),

  lifecycle text not null default 'draft'
    constraint product_versions_lifecycle_check
    check (lifecycle in ('draft', 'published', 'retired')),

  -- 약속한 program week 범위 (예: STARTER 1~8 · Pilot 1~4)
  week_from integer not null
    constraint product_versions_week_from_check
    check (week_from between 1 and 52),

  week_to integer not null,

  -- 반당 포함 원아 수 (정규 초과는 ALLOW · Pilot 초과는 Ready 불가 · DEC-051)
  children_per_class integer not null default 15
    constraint product_versions_children_per_class_check
    check (children_per_class between 1 and 100),

  -- 계약 가능한 최대 반 수 (Pilot 2 · 정규는 계약별 scope 로 관리 → null)
  max_classes integer
    constraint product_versions_max_classes_check
    check (max_classes is null or max_classes between 1 and 100),

  published_at timestamptz,
  retired_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint product_versions_week_range_check
    check (week_to between week_from and 52),

  constraint product_versions_product_label_key
    unique (product_id, version_label),

  constraint product_versions_lifecycle_timestamps_check
    check (
      (lifecycle = 'draft' and published_at is null and retired_at is null)
      or (lifecycle = 'published' and published_at is not null and retired_at is null)
      or (lifecycle = 'retired' and published_at is not null and retired_at is not null)
    )
);

drop trigger if exists trg_product_versions_updated_at on public.product_versions;
create trigger trg_product_versions_updated_at
  before update on public.product_versions
  for each row execute function private.set_updated_at_clock();


create or replace function private.enforce_product_version_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.lifecycle <> 'draft' then
      raise exception '발행된 상품 버전은 삭제할 수 없습니다.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.lifecycle <> 'draft' then
      raise exception '상품 버전은 초안으로만 만들 수 있습니다.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.product_id is distinct from old.product_id then
    raise exception '상품 버전의 상품은 바꿀 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  if old.lifecycle = 'draft' and new.lifecycle = 'draft' then
    return new;
  end if;

  if old.lifecycle = 'draft' and new.lifecycle = 'published' then
    if not exists (
      select 1 from public.product_version_features f
      where f.product_version_id = old.id
    ) then
      raise exception '포함 기능이 없는 상품 버전은 발행할 수 없습니다.'
        using errcode = 'check_violation';
    end if;
    new.published_at := pg_catalog.clock_timestamp();
    new.retired_at := null;
    return new;
  end if;

  -- 발행 이후: 버전 내용은 불변 (DEC-081). published → retired 만 허용.
  if new.version_label is distinct from old.version_label
    or new.week_from is distinct from old.week_from
    or new.week_to is distinct from old.week_to
    or new.children_per_class is distinct from old.children_per_class
    or new.max_classes is distinct from old.max_classes
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
  then
    raise exception '발행된 상품 버전은 수정할 수 없습니다. 새 버전을 만들어 주세요.'
      using errcode = 'check_violation';
  end if;

  if old.lifecycle = 'published' and new.lifecycle = 'retired' then
    new.retired_at := pg_catalog.clock_timestamp();
    return new;
  end if;

  if old.lifecycle = new.lifecycle then
    return new;
  end if;

  raise exception '허용되지 않는 상품 버전 상태 변경입니다. (% -> %)',
    old.lifecycle, new.lifecycle
    using errcode = 'check_violation';
end;
$$;

revoke execute on function private.enforce_product_version_write() from public;

drop trigger if exists trg_product_versions_write_check on public.product_versions;
create trigger trg_product_versions_write_check
  before insert or update or delete on public.product_versions
  for each row execute function private.enforce_product_version_write();

alter table public.product_versions enable row level security;
revoke all on public.product_versions from anon, authenticated;
grant select on public.product_versions to authenticated;
grant insert (product_id, version_label, week_from, week_to, children_per_class, max_classes)
  on public.product_versions to authenticated;
grant update (version_label, week_from, week_to, children_per_class, max_classes, lifecycle)
  on public.product_versions to authenticated;
grant delete on public.product_versions to authenticated;

drop policy if exists "product versions readable by hq and org members" on public.product_versions;
create policy "product versions readable by hq and org members"
  on public.product_versions
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_hq_sales())
    or (lifecycle <> 'draft' and (select private.is_active_org_member()))
  );

drop policy if exists "product versions insert by hq admin" on public.product_versions;
create policy "product versions insert by hq admin"
  on public.product_versions
  for insert
  to authenticated
  with check ((select private.is_hq_admin()));

drop policy if exists "product versions update by hq admin" on public.product_versions;
create policy "product versions update by hq admin"
  on public.product_versions
  for update
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));

drop policy if exists "product versions delete draft by hq admin" on public.product_versions;
create policy "product versions delete draft by hq admin"
  on public.product_versions
  for delete
  to authenticated
  using ((select private.is_hq_admin()) and lifecycle = 'draft');


-- ---------------------------------------------------------------------
-- 3. product_version_features
-- ---------------------------------------------------------------------

create table if not exists public.product_version_features (
  id uuid primary key default gen_random_uuid(),

  product_version_id uuid not null
    references public.product_versions (id) on delete cascade,

  feature_code text not null
    constraint product_version_features_feature_code_check
    check (private.is_known_feature_code(feature_code)),

  -- ai_assist 전용 capability 집합 (C1 · C2 · C3). free text 아님 (DEC-081).
  ai_capabilities text[],

  created_at timestamptz not null default now(),

  constraint product_version_features_version_feature_key
    unique (product_version_id, feature_code),

  constraint product_version_features_ai_capabilities_check
    check (
      (feature_code = 'ai_assist') = (ai_capabilities is not null)
      and (
        ai_capabilities is null
        or (
          cardinality(ai_capabilities) between 1 and 3
          and array_ndims(ai_capabilities) = 1
          and ai_capabilities <@ array['c1', 'c2', 'c3']::text[]
        )
      )
    )
);

create or replace function private.enforce_product_version_feature_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_lifecycle text;
begin
  v_version_id := case when tg_op = 'DELETE' then old.product_version_id
                       else new.product_version_id end;

  select pv.lifecycle into v_lifecycle
  from public.product_versions pv
  where pv.id = v_version_id;

  -- 부모 버전 삭제(cascade) 중이면 이미 draft 확인이 끝났다.
  if v_lifecycle is not null and v_lifecycle <> 'draft' then
    raise exception '발행된 상품 버전의 포함 기능은 바꿀 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.product_version_id is distinct from old.product_version_id then
    raise exception '포함 기능의 상품 버전은 바꿀 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function private.enforce_product_version_feature_write() from public;

drop trigger if exists trg_product_version_features_write_check on public.product_version_features;
create trigger trg_product_version_features_write_check
  before insert or update or delete on public.product_version_features
  for each row execute function private.enforce_product_version_feature_write();

alter table public.product_version_features enable row level security;
revoke all on public.product_version_features from anon, authenticated;
grant select, delete on public.product_version_features to authenticated;
grant insert (product_version_id, feature_code, ai_capabilities)
  on public.product_version_features to authenticated;
grant update (ai_capabilities) on public.product_version_features to authenticated;

drop policy if exists "product version features readable" on public.product_version_features;
create policy "product version features readable"
  on public.product_version_features
  for select
  to authenticated
  using (
    exists (
      select 1 from public.product_versions pv
      where pv.id = product_version_features.product_version_id
    )
  );

drop policy if exists "product version features write by hq admin" on public.product_version_features;
create policy "product version features write by hq admin"
  on public.product_version_features
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));


-- ---------------------------------------------------------------------
-- 4. platform_capabilities (코드 기능 출시 registry · 유일한 수동 registry)
-- ---------------------------------------------------------------------
-- DEC-063: 약속한 기능이 모두 Ready 여야 활성화할 수 있다.
-- blocked_by: 정책 미해결로 Production 출시가 막힌 이유 (예: CO-12).
--             비어 있지 않으면 is_released 여도 Ready 가 아니다.

create table if not exists public.platform_capabilities (
  code text primary key
    constraint platform_capabilities_code_check
    check (private.is_known_feature_code(code)),

  is_released boolean not null default false,

  blocked_by text[] not null default '{}'::text[]
    constraint platform_capabilities_blocked_by_check
    check (
      cardinality(blocked_by) = 0
      or (
        array_ndims(blocked_by) = 1
        and cardinality(blocked_by) <= 10
      )
    ),

  note text
    constraint platform_capabilities_note_check
    check (note is null or char_length(note) <= 500),

  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default pg_catalog.clock_timestamp()
);

drop trigger if exists trg_platform_capabilities_updated_at on public.platform_capabilities;
create trigger trg_platform_capabilities_updated_at
  before update on public.platform_capabilities
  for each row execute function private.set_updated_at_clock();


create or replace function private.audit_platform_capability_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_audit_event(
    null,
    'capability.changed',
    'platform_capability',
    null,
    null,
    jsonb_build_object(
      'code', new.code,
      'is_released', new.is_released,
      'blocked_by', to_jsonb(new.blocked_by)
    )
  );
  return new;
end;
$$;

revoke execute on function private.audit_platform_capability_change() from public;

drop trigger if exists trg_platform_capabilities_audit on public.platform_capabilities;
create trigger trg_platform_capabilities_audit
  after update on public.platform_capabilities
  for each row
  when (old.is_released is distinct from new.is_released
        or old.blocked_by is distinct from new.blocked_by)
  execute function private.audit_platform_capability_change();

alter table public.platform_capabilities enable row level security;
revoke all on public.platform_capabilities from anon, authenticated;
grant select on public.platform_capabilities to authenticated;
grant update (is_released, blocked_by, note) on public.platform_capabilities to authenticated;

drop policy if exists "platform capabilities readable" on public.platform_capabilities;
create policy "platform capabilities readable"
  on public.platform_capabilities
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_hq_sales())
    or (select private.is_active_org_member())
  );

drop policy if exists "platform capabilities update by hq admin" on public.platform_capabilities;
create policy "platform capabilities update by hq admin"
  on public.platform_capabilities
  for update
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));


-- ---------------------------------------------------------------------
-- 5. contracts
-- ---------------------------------------------------------------------

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations (id) on delete restrict,

  product_version_id uuid not null
    references public.product_versions (id) on delete restrict,

  status text not null default 'draft'
    constraint contracts_status_check
    check (status in ('draft', 'active', 'suspended', 'ended')),

  start_date date not null,
  end_date date not null,

  -- 상태 변경 · 날짜 조정 사유 (민감 본문 금지)
  status_reason text
    constraint contracts_status_reason_check
    check (
      status_reason is null
      or (char_length(status_reason) <= 500 and btrim(status_reason) <> '')
    ),

  activated_at timestamptz,
  activated_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint contracts_date_range_check check (end_date >= start_date),
  constraint contracts_id_org_key unique (id, organization_id)
);

create index if not exists contracts_org_status_idx
  on public.contracts (organization_id, status, start_date);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function private.set_updated_at_clock();


-- ---------------------------------------------------------------------
-- 6. contract_classes (class scope junction)
-- ---------------------------------------------------------------------

create table if not exists public.contract_classes (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  contract_id uuid not null,
  class_id uuid not null,

  created_at timestamptz not null default now(),

  constraint contract_classes_contract_fk
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id)
    on delete restrict,

  constraint contract_classes_class_fk
    foreign key (class_id, organization_id)
    references public.classes (id, organization_id)
    on delete restrict,

  constraint contract_classes_contract_class_key
    unique (contract_id, class_id)
);

create index if not exists contract_classes_class_idx
  on public.contract_classes (class_id);


-- ---------------------------------------------------------------------
-- 7. lesson_sections (DEC-096 · CMS 아님 · 최소 구조)
-- ---------------------------------------------------------------------

create or replace function private.is_known_lesson_section(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code in (
    's1', 's2', 's3', 's4a', 's4b', 's4c', 's5', 's6', 's7', 's8',
    's9', 's10', 's11', 's12', 's13', 's14', 's15'
  );
$$;

revoke execute on function private.is_known_lesson_section(text) from public;
grant execute on function private.is_known_lesson_section(text) to authenticated;


-- Required Content Set (DEC-096): §1 · §2 · §3 · §4-A · §4-C · §5 · §6 · §11 · §12 · §13 · §15
create or replace function private.required_lesson_sections()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['s1', 's2', 's3', 's4a', 's4c', 's5', 's6', 's11', 's12', 's13', 's15']::text[];
$$;

revoke execute on function private.required_lesson_sections() from public;
grant execute on function private.required_lesson_sections() to authenticated;


create table if not exists public.lesson_sections (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.curriculum_lessons (id) on delete restrict,

  section_code text not null
    constraint lesson_sections_section_code_check
    check (private.is_known_lesson_section(section_code)),

  body text not null
    constraint lesson_sections_body_check
    check (char_length(body) between 1 and 10000 and btrim(body) <> ''),

  -- 원본 출처 메모 (파일 · 페이지 등). SOURCE EXISTS ≠ READY.
  source_ref text
    constraint lesson_sections_source_ref_check
    check (source_ref is null or char_length(source_ref) <= 300),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),

  constraint lesson_sections_lesson_section_key
    unique (lesson_id, section_code)
);

drop trigger if exists trg_lesson_sections_updated_at on public.lesson_sections;
create trigger trg_lesson_sections_updated_at
  before update on public.lesson_sections
  for each row execute function private.set_updated_at_clock();


-- 발행된 차시의 섹션은 조용히 수정하지 않는다 (DEC-096).
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

revoke execute on function private.enforce_lesson_section_write() from public;

drop trigger if exists trg_lesson_sections_write_check on public.lesson_sections;
create trigger trg_lesson_sections_write_check
  before insert or update or delete on public.lesson_sections
  for each row execute function private.enforce_lesson_section_write();

alter table public.lesson_sections enable row level security;
revoke all on public.lesson_sections from anon, authenticated;
grant select, delete on public.lesson_sections to authenticated;
grant insert (lesson_id, section_code, body, source_ref) on public.lesson_sections to authenticated;
grant update (body, source_ref) on public.lesson_sections to authenticated;

drop policy if exists "lesson sections readable" on public.lesson_sections;
create policy "lesson sections readable"
  on public.lesson_sections
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (
      (select private.is_active_org_member())
      and private.is_published_lesson(lesson_id)
    )
  );

drop policy if exists "lesson sections write by hq admin" on public.lesson_sections;
create policy "lesson sections write by hq admin"
  on public.lesson_sections
  for all
  to authenticated
  using ((select private.is_hq_admin()))
  with check ((select private.is_hq_admin()));


-- ---------------------------------------------------------------------
-- 8. Runtime entitlement helpers (DEC-083)
-- ---------------------------------------------------------------------

-- 기관의 현재 effective 계약 (active 또는 suspended · 오늘이 기간 안).
-- 동시 effective 계약은 1개로 강제되므로 최대 1행.
create or replace function private.effective_contract_id(p_organization_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select c.id
  from public.contracts c
  where c.organization_id = p_organization_id
    and c.status in ('active', 'suspended')
    and private.local_today() between c.start_date and c.end_date
  order by c.start_date desc
  limit 1;
$$;

revoke execute on function private.effective_contract_id(uuid) from public;
grant execute on function private.effective_contract_id(uuid) to authenticated;


-- 기관 서비스 모드:
--   active        : 정상 (효력 계약 active · 기간 중)
--   read_only     : 계약 정지 · 종료 · 기간 만료 (기존 기록 조회만 · CO-1 기간 미정)
--   before_start  : 계약 시작 전 (준비 가능 · 수업 · 리포트 불가)
--   org_suspended : 기관 정지
--   no_contract   : 계약 기록 없음 (신규 경로 사용 불가 · M3 contract mapping gate)
create or replace function private.org_service_mode(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_today date := private.local_today();
  v_org_status text;
  v_status text;
begin
  select o.status into v_org_status
  from public.organizations o
  where o.id = p_organization_id;

  if v_org_status is null then
    return 'no_contract';
  end if;

  if v_org_status <> 'active' then
    return 'org_suspended';
  end if;

  select c.status into v_status
  from public.contracts c
  where c.organization_id = p_organization_id
    and c.status in ('active', 'suspended')
    and v_today between c.start_date and c.end_date
  order by c.start_date desc
  limit 1;

  if v_status = 'active' then
    return 'active';
  elsif v_status = 'suspended' then
    return 'read_only';
  end if;

  if exists (
    select 1 from public.contracts c
    where c.organization_id = p_organization_id
      and c.status = 'active'
      and c.start_date > v_today
  ) then
    return 'before_start';
  end if;

  if exists (
    select 1 from public.contracts c
    where c.organization_id = p_organization_id
      and c.status in ('active', 'suspended', 'ended')
  ) then
    return 'read_only';
  end if;

  return 'no_contract';
end;
$$;

revoke execute on function private.org_service_mode(uuid) from public;
grant execute on function private.org_service_mode(uuid) to authenticated;


-- 기관 단위 기능 (예: director_dashboard)
create or replace function private.org_has_feature(
  p_organization_id uuid,
  p_feature_code text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.contracts c
    join public.product_version_features f
      on f.product_version_id = c.product_version_id
    where c.id = private.effective_contract_id(p_organization_id)
      and f.feature_code = p_feature_code
  );
$$;

revoke execute on function private.org_has_feature(uuid, text) from public;
grant execute on function private.org_has_feature(uuid, text) to authenticated;


create or replace function private.class_in_effective_contract_scope(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.classes cl
    join public.contract_classes cc
      on cc.class_id = cl.id
     and cc.organization_id = cl.organization_id
    where cl.id = p_class_id
      and cc.contract_id = private.effective_contract_id(cl.organization_id)
  );
$$;

revoke execute on function private.class_in_effective_contract_scope(uuid) from public;
grant execute on function private.class_in_effective_contract_scope(uuid) to authenticated;


-- 반 단위 기능. 다른 반의 계약으로 이 반의 기능이 열리지 않는다 (DEC-083).
create or replace function private.class_has_feature(
  p_class_id uuid,
  p_feature_code text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.classes cl
    join public.contract_classes cc
      on cc.class_id = cl.id
     and cc.organization_id = cl.organization_id
    join public.contracts c
      on c.id = cc.contract_id
    join public.product_version_features f
      on f.product_version_id = c.product_version_id
    where cl.id = p_class_id
      and c.id = private.effective_contract_id(cl.organization_id)
      and f.feature_code = p_feature_code
  );
$$;

revoke execute on function private.class_has_feature(uuid, text) from public;
grant execute on function private.class_has_feature(uuid, text) to authenticated;


-- 새 작업(쓰기) 허용: 반 기능 + 기관 서비스 모드 active
create or replace function private.class_write_allowed(
  p_class_id uuid,
  p_feature_code text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.class_has_feature(p_class_id, p_feature_code)
    and exists (
      select 1 from public.classes cl
      where cl.id = p_class_id
        and cl.status = 'active'
        and private.org_service_mode(cl.organization_id) = 'active'
    );
$$;

revoke execute on function private.class_write_allowed(uuid, text) from public;
grant execute on function private.class_write_allowed(uuid, text) to authenticated;


-- 콘텐츠 주차 entitlement (계약 version 의 week 범위)
create or replace function private.class_week_entitled(
  p_class_id uuid,
  p_week_no integer
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.classes cl
    join public.contract_classes cc
      on cc.class_id = cl.id
     and cc.organization_id = cl.organization_id
    join public.contracts c
      on c.id = cc.contract_id
    join public.product_versions pv
      on pv.id = c.product_version_id
    where cl.id = p_class_id
      and c.id = private.effective_contract_id(cl.organization_id)
      and p_week_no between pv.week_from and pv.week_to
  );
$$;

revoke execute on function private.class_week_entitled(uuid, integer) from public;
grant execute on function private.class_week_entitled(uuid, integer) to authenticated;


-- 기능이 Production 출시 상태인가 (registry 출시 ∧ 정책 차단 없음)
create or replace function private.capability_released(p_feature_code text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.platform_capabilities pc
    where pc.code = p_feature_code
      and pc.is_released = true
      and cardinality(pc.blocked_by) = 0
  );
$$;

revoke execute on function private.capability_released(text) from public;
grant execute on function private.capability_released(text) to authenticated;


-- AI capability (C1 · C2 · C3) 사용 가능 여부:
-- ai_assist ∧ 해당 capability ∧ 쓰기 가능 ∧ 출시 (DEC-070 · DEC-071)
create or replace function private.class_ai_capability_allowed(
  p_class_id uuid,
  p_capability text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.class_write_allowed(p_class_id, 'ai_assist')
    and private.capability_released('ai_assist')
    and exists (
      select 1
      from public.classes cl
      join public.contract_classes cc
        on cc.class_id = cl.id
       and cc.organization_id = cl.organization_id
      join public.contracts c
        on c.id = cc.contract_id
      join public.product_version_features f
        on f.product_version_id = c.product_version_id
      where cl.id = p_class_id
        and c.id = private.effective_contract_id(cl.organization_id)
        and f.feature_code = 'ai_assist'
        and p_capability = any (f.ai_capabilities)
    );
$$;

revoke execute on function private.class_ai_capability_allowed(uuid, text) from public;
grant execute on function private.class_ai_capability_allowed(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 9. contracts · contract_classes RLS (쓰기 경로 RPC 는 M3)
-- ---------------------------------------------------------------------

alter table public.contracts enable row level security;
revoke all on public.contracts from anon, authenticated;
grant select on public.contracts to authenticated;

-- HQ Admin · HQ Sales (계약 메타) · 자기 기관 원장 (요약)
drop policy if exists "contracts readable by hq and director" on public.contracts;
create policy "contracts readable by hq and director"
  on public.contracts
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_hq_sales())
    or private.has_org_role(organization_id, array['director'])
  );

alter table public.contract_classes enable row level security;
revoke all on public.contract_classes from anon, authenticated;
grant select on public.contract_classes to authenticated;

drop policy if exists "contract classes readable by hq and director" on public.contract_classes;
create policy "contract classes readable by hq and director"
  on public.contract_classes
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or (select private.is_hq_sales())
    or private.has_org_role(organization_id, array['director'])
  );
