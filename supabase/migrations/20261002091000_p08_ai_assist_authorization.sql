-- =====================================================================
-- PHASE 08 · WS2 (A1) — AI provider 호출 전 서버 판정 (DB authority)
-- ---------------------------------------------------------------------
-- 근거: PHASE 08 고정 결정 2 (Legacy AI policy) · DEC-009 · DEC-070 · DEC-071 · AR-8
--
-- 문제: legacy 관찰 AI · legacy 성장 리포트 AI 는 OPENAI_API_KEY(env) 만 확인하고 provider 를 호출했다.
--       ai_assist entitlement · release registry(AR-8) 를 보지 않았다.
--
-- 이 migration 은 판정 함수만 추가한다 (additive · legacy 앱 동작 변경 없음).
--   · 앱(Server Action)은 provider 호출 **전에** public.ai_assist_authorization 을 부르고,
--     allowed = true 가 아니면 provider 를 호출하지 않는다 (fail closed).
--   · DB 쪽 저장 차단(AI 초안 INSERT · 재생성 gate)은 G-2 cutover 에 둔다 — 현재 Production legacy 앱은
--     provider 를 먼저 호출한 뒤 저장하므로, 저장만 막으면 전송은 그대로 일어나고 화면만 깨진다.
--     새 앱(이 판정을 먼저 부르는 앱)이 배포된 뒤에 DB gate 를 켠다 (G2_app_preflight 확인 항목).
--
-- 판정 순서 (사용자에게 보이는 사유):
--   not_authorized  : 대상이 없거나 담당 교사가 아님 (존재 여부를 구분하지 않는다)
--   policy_blocked  : platform_capabilities.ai_assist.blocked_by 가 비어 있지 않음 (예: AR-8)
--   not_released    : ai_assist 미출시
--   not_entitled    : 현재 유효 계약의 반 기능에 ai_assist · 해당 capability(또는 리포트 기능)가 없음
--   read_only       : 반 쓰기 불가 (서비스 모드 active 아님 · 반 보관)
-- capability 매핑 (docs/04-ai-report/ai-architecture.md §1):
--   observation_cleanup   = C1 Observation Cleanup
--   period_report_draft   = C2 Period Narrative Draft (+ monthly_report 리포트 기능 · 같은 문서 "C2 는
--                           monthly_report 가 없는 상품에서 쓸 수 없다")
-- AI 는 Growth5 · Stage 를 고르지 않는다 · 자동 공개하지 않는다 (이 함수는 판정만 한다).
-- =====================================================================


create or replace function private.ai_assist_block_reason(
  p_class_id uuid,
  p_capability text,
  p_report_feature text
)
returns text
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if exists (
    select 1 from public.platform_capabilities pc
    where pc.code = 'ai_assist' and cardinality(pc.blocked_by) > 0
  ) then
    return 'policy_blocked';
  end if;

  -- ai_assist 출시 ∧ (C2 는) 해당 리포트 기능 출시 (ai-architecture §1 "해당 기능 Service Ready")
  if not private.capability_released('ai_assist')
    or (p_report_feature is not null and not private.capability_released(p_report_feature))
  then
    return 'not_released';
  end if;

  if not exists (
    select 1
    from public.classes cl
    join public.contract_classes cc
      on cc.class_id = cl.id and cc.organization_id = cl.organization_id
    join public.contracts c on c.id = cc.contract_id
    join public.product_version_features f on f.product_version_id = c.product_version_id
    where cl.id = p_class_id
      and c.id = private.effective_contract_id(cl.organization_id)
      and f.feature_code = 'ai_assist'
      and p_capability = any (f.ai_capabilities)
  )
    or (p_report_feature is not null and not private.class_has_feature(p_class_id, p_report_feature))
  then
    return 'not_entitled';
  end if;

  if not private.class_ai_capability_allowed(p_class_id, p_capability)
    or (p_report_feature is not null and not private.class_write_allowed(p_class_id, p_report_feature))
  then
    return 'read_only';
  end if;

  return null;
end;
$$;

revoke execute on function private.ai_assist_block_reason(uuid, text, text) from public, anon, authenticated;


-- 저장 gate(G-2 cutover trigger)가 쓰는 boolean 판정
create or replace function private.ai_assist_allowed(
  p_class_id uuid,
  p_capability text,
  p_report_feature text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.ai_assist_block_reason(p_class_id, p_capability, p_report_feature) is null;
$$;

revoke execute on function private.ai_assist_allowed(uuid, text, text) from public, anon, authenticated;


create or replace function public.ai_assist_authorization(
  p_kind text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_class_id uuid;
  v_capability text;
  v_report_feature text;
  v_reason text;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authorized');
  end if;

  if p_kind = 'observation_cleanup' then
    v_capability := 'c1';
    v_report_feature := null;
    select o.class_id into v_class_id
    from public.class_session_observations o
    where o.id = p_target_id;
  elsif p_kind = 'period_report_draft' then
    v_capability := 'c2';
    v_report_feature := 'monthly_report';
    select r.class_id into v_class_id
    from public.child_growth_reports r
    where r.id = p_target_id;
  else
    raise exception '알 수 없는 AI 기능입니다.' using errcode = 'AG001';
  end if;

  -- 교사 권한: 대상 반의 담당 교사만 (원장 · HQ · 다른 반 교사 불가)
  if v_class_id is null or not private.is_assigned_class_teacher(v_class_id) then
    return jsonb_build_object('allowed', false, 'reason', 'not_authorized', 'capability', v_capability);
  end if;

  v_reason := private.ai_assist_block_reason(v_class_id, v_capability, v_report_feature);

  return jsonb_build_object(
    'allowed', v_reason is null,
    'reason', v_reason,
    'capability', v_capability
  );
end;
$$;

revoke execute on function public.ai_assist_authorization(text, uuid) from public, anon;
grant execute on function public.ai_assist_authorization(text, uuid) to authenticated;
