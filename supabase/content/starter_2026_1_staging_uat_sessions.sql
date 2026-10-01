-- =====================================================================
-- PHASE 10G — Staging 합성 직원 UAT 반: SOYE-STARTER-2026.1 W1~W8 예정 수업 생성
-- ---------------------------------------------------------------------
-- STAGING ONLY (itcddooiuqsqingfhxkk) · 사람 승인 2026-10-01 ("너 추천대로 진행해줘" · PHASE 10G 1번)
-- 실행: node supabase/content/apply_staging_content.mjs uat-sessions --confirm-staging itcddooiuqsqingfhxkk
--       (적용기가 begin … commit 으로 감싼다 · 이 파일의 SHA-256 은 적용기에 고정되어 있다)
-- migration 이 아니다 · Production 금지.
--
-- HQ Admin 수업 예정 흐름(createClassSessionAction)과 같은 확인 · 같은 열만 쓴다:
--   배정 = 이 기관 · active / 반 active / 프로그램 published / 차시 = 이 프로그램 · published / 같은 배정 · 차시에 열린 수업 없음
--   INSERT (organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status='scheduled')
--   + 결정적 id (반복 실행 판정용). DB trigger(enforce_class_session_insert · week_no 채움)가 그대로 다시 판정한다.
--
-- 일정 (근거: 기존 합성 STAGING-P8 수업 = 2026-09-28 부터 매주 월요일 · class_sessions 에는 시각 열이 없다 = 날짜만):
--   W1 2026-10-01 (오늘 · 직원 UAT 즉시 시험용 — 유일한 예외) · W2~W8 = 기존 월요일 주기 10-05 · 10-12 · 10-19 · 10-26 · 11-02 · 11-09 · 11-16
--   (계약 기간 2026-08-29 ~ 2026-11-27 안)
-- 하지 않는 일: 기존 STAGING-P8 수업 4건 · 계약 · 출결 · 관찰 · 리포트 · 원아 변경 · 삭제 · 영구 함수 (pg_temp 만).
-- 반복 실행: 8건이 모두 같은 값으로 있으면 'already_scheduled' · 일부만 있으면 거부.
-- =====================================================================

create or replace function pg_temp.starter_2026_1_staging_uat_sessions()
returns text
language plpgsql
as $sessions$
declare
  c_org      constant uuid := 'dad40381-5965-c087-5462-23169a6e3971';
  c_class    constant uuid := '6169936b-c450-c53d-2f45-62ed03293221';
  c_contract constant uuid := '9b9eef88-6e5c-02ba-946a-1db2b34c06be';
  c_assign   constant uuid := '794fbfb1-97d5-3231-a4bf-67ce781bf92c';
  c_prog     constant uuid := '4f54cc7e-620f-374e-8937-e808e2afc1a9';
  c_old_assign constant uuid := '3c7d7ceb-0043-d005-45f5-018e8d5e4085';
  v_plan jsonb := '[
    {"week":1,"session":"14e4d75b-55b7-38cc-991a-b78df4921e7c","lesson":"0e412aa2-d8f4-3247-a8d8-7c79a8768646","date":"2026-10-01"},
    {"week":2,"session":"ca3f6fca-8a59-3c97-82a0-de0088f60f89","lesson":"5bad87d5-ea08-3223-afdc-fbbc65476779","date":"2026-10-05"},
    {"week":3,"session":"3a400701-7e00-3b29-9586-8cb7fbb48219","lesson":"e479b103-ed89-3db8-9b32-fe41b8e73e24","date":"2026-10-12"},
    {"week":4,"session":"d709af3e-6101-35cc-b496-8acc9f2c42da","lesson":"f66dcae9-5404-37be-9831-af52b7ff8e14","date":"2026-10-19"},
    {"week":5,"session":"97be97a4-6d49-39f3-919d-d14cc5584200","lesson":"54b89857-dcb8-326a-b913-b622c47df14d","date":"2026-10-26"},
    {"week":6,"session":"cbaef7fa-0087-39ae-9506-24c8afa77b0f","lesson":"3be90928-5f39-3456-b6b8-9f3a4eb396af","date":"2026-11-02"},
    {"week":7,"session":"adb1fb3f-b954-3000-8d9e-c2f730b4a1c2","lesson":"6f902050-036f-324f-b255-2eceacea4f73","date":"2026-11-09"},
    {"week":8,"session":"6c20f425-1d4d-32e0-b40b-b688e83bbe85","lesson":"8b00cc10-eb37-3143-960e-edf8208db5bd","date":"2026-11-16"}
  ]'::jsonb;
  p jsonb;
  v_existing int;
  v_matching int;
  v_old_before text;
  v_content jsonb;
begin
  -- 0. 합성 데이터만
  if (select count(*) from auth.users where email not like '%@example.test') <> 0 then
    raise exception 'UAT sessions refused: 합성 계정이 아닌 사용자가 있다';
  end if;

  -- 1. 계약 · 기관 · 반
  if not exists (select 1 from public.contracts where id = c_contract and organization_id = c_org and status = 'active') then
    raise exception 'UAT sessions refused: UAT 계약이 active 가 아니다';
  end if;
  if (select count(*) from public.contracts where status = 'active') <> 1 or (select count(*) from public.contracts where status = 'suspended') <> 0 then
    raise exception 'UAT sessions refused: 계약 수가 기대와 다르다 (active 1 · suspended 0)';
  end if;
  if not exists (select 1 from public.organizations where id = c_org and status = 'active') then
    raise exception 'UAT sessions refused: 기관이 active 가 아니다';
  end if;

  -- 2. 현재 배정 = SOYE-STARTER-2026.1 (createClassSessionAction D~K 와 같은 확인)
  if not exists (select 1 from public.class_program_assignments a
                 join public.classes cl on cl.id = a.class_id and cl.organization_id = c_org and cl.status = 'active'
                 join public.curriculum_programs cp on cp.id = a.program_id and cp.code = 'SOYE-STARTER-2026.1' and cp.status = 'published'
                 where a.id = c_assign and a.organization_id = c_org and a.class_id = c_class and a.program_id = c_prog and a.status = 'active') then
    raise exception 'UAT sessions refused: 반의 현재 배정이 published SOYE-STARTER-2026.1 active 배정이 아니다';
  end if;
  if (select count(*) from public.class_program_assignments where class_id = c_class and status = 'active') <> 1 then
    raise exception 'UAT sessions refused: 반의 active 배정이 하나가 아니다';
  end if;
  select e into v_content from jsonb_array_elements(private.contract_readiness_internal(c_contract) -> 'items') e where e ->> 'code' = 'content';
  if (v_content ->> 'ok')::boolean is not true then
    raise exception 'UAT sessions refused: content readiness 미충족 (%)', v_content;
  end if;

  select md5(coalesce(string_agg(s::text, '|' order by s.id), '')) into v_old_before
  from public.class_sessions s where s.class_program_assignment_id = c_old_assign;

  -- 3. 반복 판정
  select count(*) into v_existing from public.class_sessions s
  where s.id in (select (x ->> 'session')::uuid from jsonb_array_elements(v_plan) x);
  if v_existing = 8 then
    select count(*) into v_matching from public.class_sessions s
    join jsonb_array_elements(v_plan) x on (x ->> 'session')::uuid = s.id
    where s.class_program_assignment_id = c_assign and s.lesson_id = (x ->> 'lesson')::uuid
      and s.scheduled_date = (x ->> 'date')::date and s.week_no = (x ->> 'week')::int;
    if v_matching <> 8 then
      raise exception 'UAT sessions refused: 기존 UAT 수업 8건 중 기대와 다른 행이 있다 (%)', v_matching;
    end if;
    return 'already_scheduled';
  elsif v_existing <> 0 then
    raise exception 'UAT sessions refused: UAT 수업이 일부만 있다 (%/8)', v_existing;
  end if;

  -- 4. 생성 (차시마다 createClassSessionAction L~O 와 같은 확인 → 같은 열 INSERT)
  for p in select * from jsonb_array_elements(v_plan) loop
    if not exists (select 1 from public.curriculum_lessons l
                   where l.id = (p ->> 'lesson')::uuid and l.program_id = c_prog and l.status = 'published' and l.week_no = (p ->> 'week')::int) then
      raise exception 'UAT sessions refused: W% 차시가 이 프로그램의 published 차시가 아니다', p ->> 'week';
    end if;
    if exists (select 1 from public.class_sessions s
               where s.class_program_assignment_id = c_assign and s.lesson_id = (p ->> 'lesson')::uuid and s.status in ('scheduled', 'in_progress')) then
      raise exception 'UAT sessions refused: W% 에 이미 열린 수업이 있다', p ->> 'week';
    end if;
    insert into public.class_sessions (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
    values ((p ->> 'session')::uuid, c_org, c_class, c_assign, c_prog, (p ->> 'lesson')::uuid, (p ->> 'date')::date, 'scheduled');
  end loop;

  -- 5. 사후 확인
  if (select count(*) from public.class_sessions s where s.class_program_assignment_id = c_assign and s.status = 'scheduled'
        and s.week_no between 1 and 8) <> 8
     or (select count(distinct s.week_no) from public.class_sessions s where s.class_program_assignment_id = c_assign) <> 8 then
    raise exception 'UAT sessions post-check: W1~W8 예정 수업 8건이 아니다';
  end if;
  if (select md5(coalesce(string_agg(s::text, '|' order by s.id), '')) from public.class_sessions s where s.class_program_assignment_id = c_old_assign) <> v_old_before then
    raise exception 'UAT sessions post-check: 기존 STAGING-P8 수업이 바뀌었다';
  end if;
  if (select status from public.contracts where id = c_contract) <> 'active' then
    raise exception 'UAT sessions post-check: 계약이 active 가 아니다';
  end if;

  return 'scheduled';
end;
$sessions$;

select pg_temp.starter_2026_1_staging_uat_sessions() as uat_sessions_result;
