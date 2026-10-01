-- =====================================================================
-- PHASE 10F — Staging 합성 직원 UAT 반: STAGING-P8 (가상) → SOYE-STARTER-2026.1 배정 전환
-- ---------------------------------------------------------------------
-- STAGING ONLY (itcddooiuqsqingfhxkk) · 사람 승인 2026-10-01 (phase-10e-starter-content-approval.md §9)
-- 실행: node supabase/content/apply_staging_content.mjs uat-switch --confirm-staging itcddooiuqsqingfhxkk
--       (적용기가 begin … commit 으로 감싼다 · 이 파일의 SHA-256 은 적용기에 고정되어 있다)
-- migration 이 아니다 · Production 금지.
--
-- 하는 일 (앱의 배정 수명주기와 같다 — class-program-actions.ts close/create):
--   1. 기존 배정(STAGING-P8)을 status 'active' → 'completed' (앱 closeClassProgramAssignmentAction 과 같은 조건 · 삭제 없음)
--   2. 같은 반에 SOYE-STARTER-2026.1 배정을 'active' 로 추가 (앱 createClassProgramAssignmentAction 과 같은 열
--      + origin_contract_id = 현재 계약 · G-1 이 자동으로 채우는 값과 같은 출처 정보)
-- 하지 않는 일: 계약 · 기관 · 반 · 원아 · 수업 · 출결 · 관찰 · 리포트 · STAGING-P8 프로그램/차시 변경 · 삭제.
--   기존 STAGING-P8 수업(예정 4건)은 그대로 남는다 — 종료된 배정의 예정 수업은 시작할 수 없고(enforce_class_session_update)
--   완료 · 취소만 가능하다. 정리 · 새 수업 일정은 별도 단계.
--
-- 반복 실행: 이미 전환된 상태(기존 completed + 새 배정 active)면 아무것도 바꾸지 않고 'already_switched' 를 돌려준다.
-- 기대 상태와 다르면(id · 계약 상태 · 콘텐츠 준비 · 합성 아닌 사용자) 예외 → 적용기 트랜잭션 전체 취소.
-- 함수는 pg_temp (세션 임시) — Staging 에 영구 객체를 남기지 않는다.
-- =====================================================================

create or replace function pg_temp.starter_2026_1_staging_uat_switch()
returns text
language plpgsql
as $switch$
declare
  c_org        constant uuid := 'dad40381-5965-c087-5462-23169a6e3971';
  c_class      constant uuid := '6169936b-c450-c53d-2f45-62ed03293221';
  c_contract   constant uuid := '9b9eef88-6e5c-02ba-946a-1db2b34c06be';
  c_old_assign constant uuid := '3c7d7ceb-0043-d005-45f5-018e8d5e4085';
  c_old_prog   constant uuid := 'c66a3734-85aa-765a-c882-329f9b73ad4d';
  c_new_prog   constant uuid := '4f54cc7e-620f-374e-8937-e808e2afc1a9';
  c_new_assign constant uuid := '794fbfb1-97d5-3231-a4bf-67ce781bf92c';
  v_contract record;
  v_old record;
  v_new_found boolean;
  v_new_status text;
  v_new_prog uuid;
  v_new_class uuid;
  v_count int;
  v_content jsonb;
begin
  -- 0. 합성 데이터만 있는 환경
  if (select count(*) from auth.users where email not like '%@example.test') <> 0 then
    raise exception 'UAT switch refused: 합성 계정이 아닌 사용자가 있다';
  end if;

  -- 1. 계약: 존재 · 같은 기관 · ACTIVE (suspended · ended · draft 거부) · 반이 계약 범위
  select c.id, c.status, c.organization_id into v_contract from public.contracts c where c.id = c_contract for update;
  if not found or v_contract.organization_id <> c_org then
    raise exception 'UAT switch refused: 계약을 찾을 수 없거나 기관이 다르다';
  end if;
  if v_contract.status <> 'active' then
    raise exception 'UAT switch refused: 계약 상태가 active 가 아니다 (%)', v_contract.status;
  end if;
  if (select count(*) from public.contracts where status = 'active') <> 1 or (select count(*) from public.contracts where status = 'suspended') <> 0 then
    raise exception 'UAT switch refused: 계약 수가 기대와 다르다 (active 1 · suspended 0)';
  end if;
  if not exists (select 1 from public.contract_classes cc where cc.contract_id = c_contract and cc.class_id = c_class)
     or not exists (select 1 from public.classes cl where cl.id = c_class and cl.organization_id = c_org and cl.status = 'active') then
    raise exception 'UAT switch refused: 반이 계약 범위가 아니거나 active 가 아니다';
  end if;

  -- 2. 새 프로그램: SOYE-STARTER-2026.1 · published · W1~W8 published · 필수 section 전부
  if not exists (select 1 from public.curriculum_programs where id = c_new_prog and code = 'SOYE-STARTER-2026.1' and status = 'published') then
    raise exception 'UAT switch refused: SOYE-STARTER-2026.1 이 published 가 아니다';
  end if;
  select count(*) into v_count
  from public.curriculum_lessons l
  where l.program_id = c_new_prog and l.status = 'published' and l.week_no between 1 and 8
    and not exists (select 1 from unnest(private.required_lesson_sections()) r(code)
                    where not exists (select 1 from public.lesson_sections s where s.lesson_id = l.id and s.section_code = r.code));
  if v_count <> 8 then
    raise exception 'UAT switch refused: W1~W8 게시 · 필수 section 완비 차시가 8개가 아니다 (%)', v_count;
  end if;

  -- 3. 현재 배정 상태 판정 (기대 상태 · 이미 전환됨 · 그 밖 = 거부)
  select a.id, a.status, a.program_id, a.class_id, a.organization_id into v_old from public.class_program_assignments a where a.id = c_old_assign for update;
  if not found or v_old.program_id <> c_old_prog or v_old.class_id <> c_class or v_old.organization_id <> c_org then
    raise exception 'UAT switch refused: 기존 STAGING-P8 배정 id 가 기대와 다르다';
  end if;
  select a.status, a.program_id, a.class_id into v_new_status, v_new_prog, v_new_class from public.class_program_assignments a where a.id = c_new_assign;
  v_new_found := found;

  if v_old.status = 'completed' and v_new_found and v_new_status = 'active' and v_new_prog = c_new_prog and v_new_class = c_class then
    if (select count(*) from public.class_program_assignments where class_id = c_class and status = 'active') <> 1 then
      raise exception 'UAT switch refused: 전환 후 반의 active 배정이 1개가 아니다';
    end if;
    return 'already_switched';
  end if;

  if v_old.status <> 'active' or v_new_found then
    raise exception 'UAT switch refused: 배정 상태가 기대(기존 active · 새 배정 없음)와 다르다 (old=%, new=%)', v_old.status, coalesce(v_new_status, 'none');
  end if;
  if (select count(*) from public.class_program_assignments where class_id = c_class and status = 'active') <> 1 then
    raise exception 'UAT switch refused: 반의 active 배정이 STAGING-P8 하나가 아니다';
  end if;

  -- 4. 전환 (앱 수명주기와 같은 열만)
  update public.class_program_assignments
     set status = 'completed'
   where id = c_old_assign and organization_id = c_org and status = 'active';
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'UAT switch refused: 기존 배정 완료 처리 행 수 %', v_count;
  end if;

  insert into public.class_program_assignments (id, organization_id, class_id, program_id, start_date, status, origin_contract_id)
  values (c_new_assign, c_org, c_class, c_new_prog, private.local_today(), 'active', c_contract);

  -- 5. 사후 확인 (실패 = 예외 → 적용기 트랜잭션 전체 취소)
  if (select status from public.contracts where id = c_contract) <> 'active' then
    raise exception 'UAT switch post-check: 계약이 active 가 아니다';
  end if;
  if (select count(*) from public.class_program_assignments where class_id = c_class and status = 'active') <> 1
     or not exists (select 1 from public.class_program_assignments where id = c_new_assign and status = 'active') then
    raise exception 'UAT switch post-check: 반의 현재 배정이 SOYE-STARTER-2026.1 하나가 아니다';
  end if;
  select e into v_content from jsonb_array_elements(private.contract_readiness_internal(c_contract) -> 'items') e where e ->> 'code' = 'content';
  if (v_content ->> 'ok')::boolean is not true or (v_content -> 'detail' -> 'missing_weeks') <> '[]'::jsonb then
    raise exception 'UAT switch post-check: content readiness 미충족 (%)', v_content;
  end if;
  if not exists (select 1 from public.curriculum_programs where id = c_old_prog and status = 'published') then
    raise exception 'UAT switch post-check: STAGING-P8 이력 프로그램이 바뀌었다';
  end if;

  return 'switched';
end;
$switch$;

select pg_temp.starter_2026_1_staging_uat_switch() as uat_switch_result;
