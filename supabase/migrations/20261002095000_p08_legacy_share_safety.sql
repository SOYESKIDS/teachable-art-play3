-- =====================================================================
-- PHASE 08 · WS10 (D8) — legacy 성장 리포트 공유 링크 읽기 안전장치
-- ---------------------------------------------------------------------
-- 근거: DEC-041 (기존 share 는 만료 · 중지까지 유지 · 신규 발급 중단은 Portal Production Cutover = M5) ·
--       DEC-043 · DEC-074 (학부모 공개 리포트 숨김) · DEC-088
--
-- 문제: public.read_shared_growth_report(anon · SECURITY DEFINER)는 token · 만료 · 중지 · 완료 · 기관 status 만
--       확인했다. 숨김 · 원아 상태 · 서비스 entitlement(parent_portal)를 우회했다.
--
-- 최소 안전장치 (legacy 데이터 삭제 없음 · retention 결정 전 historical compatibility 유지):
--   1. 숨김: legacy 리포트에는 숨김 상태가 없었다. 별도 표 legacy_growth_report_hides 에 현재 숨김만 둔다
--      (legacy 리포트 행 · 완료 불변 trigger 를 건드리지 않는다). 숨긴 리포트는 링크로 열리지 않는다.
--      원장(자기 기관) · HQ Admin 이 사유와 함께 숨기고 다시 공개한다 (audit).
--   2. 중지 · 만료 · 형식 · hash: 기존 그대로.
--   3. 원아 상태: 퇴소(inactive) 원아의 리포트는 링크로 열리지 않는다. 졸업(graduated)은 기존처럼 열린다
--      (졸업 원아 처리 정책은 OPEN · docs/08-security-hardening/open-items.md P08-OPEN-6).
--   4. 서비스 정책: 계약 적용 기관(활성화된 계약이 있는 기관)은 parent_portal 기능이 현재 유효 계약에 있어야 열린다
--      (정지 = 유효 · 종료 · 기간 만료 = 닫힘 · 새 Portal 과 같은 기준). 계약이 없거나 초안뿐인 legacy 기관은
--      기존 동작 유지 (G-1 에서 모든 운영 기관이 계약 적용 기관이 된다).
--   · 신규 legacy 공유 발급은 개발 중 유지 (DEC-041) — M5 cutover 에서 RPC 와 직접 INSERT 를 함께 회수한다.
-- =====================================================================


create table if not exists public.legacy_growth_report_hides (
  report_id uuid primary key
    references public.child_growth_reports (id) on delete restrict,

  organization_id uuid not null
    references public.organizations (id) on delete restrict,

  hidden_at timestamptz not null default pg_catalog.clock_timestamp(),

  -- FK 를 두지 않는다: 계정 삭제 시 SET NULL 갱신이 필요 없고, 행위자는 audit_events 에 남는다
  hidden_by uuid,

  reason text not null
    constraint legacy_growth_report_hides_reason_check
    check (char_length(reason) <= 500 and btrim(reason) <> '')
);

alter table public.legacy_growth_report_hides enable row level security;
revoke all on public.legacy_growth_report_hides from anon, authenticated;
grant select on public.legacy_growth_report_hides to authenticated;

drop policy if exists "legacy report hides readable by director and hq admin" on public.legacy_growth_report_hides;
create policy "legacy report hides readable by director and hq admin"
  on public.legacy_growth_report_hides
  for select
  to authenticated
  using (
    (select private.is_hq_admin())
    or private.has_org_role(organization_id, array['director'])
  );


create or replace function public.set_legacy_growth_report_hidden(
  p_report_id uuid,
  p_hidden boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_org uuid;
begin
  if p_report_id is null or p_hidden is null then
    raise exception '리포트 정보가 필요합니다.' using errcode = 'SH006';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception '사유를 500자 이내로 입력해 주세요.' using errcode = 'SH006';
  end if;

  select r.organization_id into v_org
  from public.child_growth_reports r
  where r.id = p_report_id;

  if v_org is null
    or not (private.is_hq_admin() or private.has_org_role(v_org, array['director']))
  then
    raise exception '리포트를 찾을 수 없거나 권한이 없습니다.' using errcode = 'SH002';
  end if;

  if p_hidden then
    insert into public.legacy_growth_report_hides (report_id, organization_id, hidden_by, reason)
    values (p_report_id, v_org, (select auth.uid()), v_reason)
    on conflict (report_id) do nothing;

    if found then
      perform private.record_audit_event(
        v_org, 'legacy_report.hidden', 'child_growth_report', p_report_id, v_reason, '{}'::jsonb
      );
    end if;
  else
    delete from public.legacy_growth_report_hides h where h.report_id = p_report_id;

    if found then
      perform private.record_audit_event(
        v_org, 'legacy_report.unhidden', 'child_growth_report', p_report_id, v_reason, '{}'::jsonb
      );
    end if;
  end if;

  return jsonb_build_object(
    'report_id', p_report_id,
    'hidden', exists (select 1 from public.legacy_growth_report_hides h where h.report_id = p_report_id)
  );
end;
$$;

revoke execute on function public.set_legacy_growth_report_hidden(uuid, boolean, text) from public, anon;
grant execute on function public.set_legacy_growth_report_hidden(uuid, boolean, text) to authenticated;


-- 반환 컬럼 · 형태는 20260903090000 과 같다. WHERE 에 PHASE 08 조건만 더한다.
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
  join public.children ch
    on ch.id = r.child_id
  where s.id = p_share_id
    and p_token ~ '^[A-Za-z0-9_-]{43}$'
    and s.token_hash = pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8')),
      'hex'
    )
    and s.revoked_at is null
    and s.expires_at > pg_catalog.clock_timestamp()
    and r.status = 'complete'
    and o.status = 'active'
    -- PHASE 08 WS10
    and not exists (select 1 from public.legacy_growth_report_hides h where h.report_id = r.id)
    and ch.status in ('active', 'graduated')
    and (
      not private.org_contract_governed(o.id)
      or private.org_has_feature(o.id, 'parent_portal')
    );
$$;

revoke execute on function public.read_shared_growth_report(uuid, text)
from public, authenticated;

grant execute on function public.read_shared_growth_report(uuid, text)
to anon;
