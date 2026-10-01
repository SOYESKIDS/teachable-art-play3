-- PHASE 10F — Staging STARTER 콘텐츠 활성화 전후 상태 (READ ONLY · SELECT/WITH · 본문 출력 없음)
-- ---------------------------------------------------------------------
-- 실행: node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/p10f_staging_content_state.sql
-- 각 문장은 runner 가 `begin transaction read only; … rollback;` 로 감싼다. 상태를 바꾸지 않는다.
-- 개인 정보 없음: 이름 · 이메일 · 본문을 출력하지 않는다 (id · 상태 · 개수 · md5 지문만).

-- 1. 업무 데이터 지문 (콘텐츠 적재 · 반 전환 전후 비교) — curriculum · 배정 표는 문장 3 · 4 에서 따로 본다
select
  (select count(*) from auth.users)::int as users_total,
  (select count(*) from auth.users where email not like '%@example.test')::int as non_synthetic_users,
  (select count(*) from public.organizations)::int as organizations_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.organizations t) as organizations_md5,
  (select count(*) from public.organization_members)::int as members_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.organization_members t) as members_md5,
  (select count(*) from public.classes)::int as classes_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.classes t) as classes_md5,
  (select count(*) from public.children)::int as children_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.children t) as children_md5,
  (select count(*) from public.contracts)::int as contracts_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.contracts t) as contracts_md5,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.contract_classes t) as contract_classes_md5,
  (select count(*) from public.class_sessions)::int as sessions_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.class_sessions t) as sessions_md5,
  (select count(*) from public.class_session_attendance)::int as attendance_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.class_session_id, t.child_id), '')) from public.class_session_attendance t) as attendance_md5,
  (select count(*) from public.class_session_observations)::int as observations_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.class_session_observations t) as observations_md5,
  (select count(*) from public.reports)::int as reports_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.reports t) as reports_md5,
  (select count(*) from public.report_revisions)::int as report_revisions_rows,
  (select count(*) from public.child_growth_reports)::int as child_growth_reports_rows,
  (select md5(coalesce(string_agg(t::text, '|' order by t.code), '')) from public.platform_capabilities t) as capabilities_md5,
  (select count(*) from public.audit_events)::int as audit_events_rows;

-- 2. UAT 계약 · 반 · 배정 (운영 메타데이터만)
select c.id as contract_id,
       c.status as contract_status,
       c.organization_id,
       o.status as organization_status,
       p.code as product_code,
       pv.version_label,
       cc.class_id,
       cl.status as class_status,
       (select jsonb_agg(jsonb_build_object('assignment_id', a.id, 'program_code', cp.code, 'program_status', cp.status,
                                            'assignment_status', a.status, 'updated_at', a.updated_at) order by a.created_at)
        from public.class_program_assignments a join public.curriculum_programs cp on cp.id = a.program_id
        where a.class_id = cc.class_id) as assignments,
       (select count(*) from public.class_sessions s where s.class_id = cc.class_id)::int as class_sessions
from public.contracts c
join public.organizations o on o.id = c.organization_id
join public.product_versions pv on pv.id = c.product_version_id
join public.products p on p.id = pv.product_id
join public.contract_classes cc on cc.contract_id = c.id
join public.classes cl on cl.id = cc.class_id
order by c.id, cc.class_id;

-- 3. 프로그램별 콘텐츠 지문 (STAGING-P8 불변 확인 · SOYE-STARTER-2026.1 적재 확인)
select cp.code,
       cp.id as program_id,
       cp.status,
       cp.duration_weeks,
       (select count(*) from public.curriculum_lessons l where l.program_id = cp.id)::int as lessons,
       (select count(*) from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = cp.id)::int as sections,
       md5(cp::text
           || coalesce((select string_agg(l::text, '|' order by l.id) from public.curriculum_lessons l where l.program_id = cp.id), '')
           || coalesce((select string_agg(s::text, '|' order by s.lesson_id, s.section_code)
                        from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = cp.id), '')) as content_md5,
       (select count(*) from public.class_program_assignments a where a.program_id = cp.id)::int as assignments
from public.curriculum_programs cp
order by cp.code;

-- 4. SOYE-STARTER-2026.1 차시별 검증 (본문 출력 없음 · 제목 · 상태 · section · source_ref · 금지 표시)
select l.week_no,
       l.session_no,
       l.title,
       l.status,
       l.duration_minutes,
       count(s.id)::int as sections,
       array(select unnest(private.required_lesson_sections())
             except select s2.section_code from public.lesson_sections s2 where s2.lesson_id = l.id) as missing_required,
       count(*) filter (where s.source_ref like 'SOYE_KIDS_' || l.week_no || '주차_교사용_수업가이드.pdf §%')::int as source_refs_ok,
       (select string_agg(distinct substring(s3.source_ref from '\(sha256:([0-9a-f]{16})\)'), ',')
        from public.lesson_sections s3 where s3.lesson_id = l.id) as source_sha_prefix,
       count(*) filter (where s.body ~ '(가상|샘플|TODO|임시|dummy|lorem|placeholder)')::int as placeholder_sections,
       count(*) filter (where s.body ~ 'https?://|www\.')::int as url_sections,
       count(*) filter (where s.body ~ '(진단|장애|발달 ?지연|점수|백분위|등급|IQ|인공지능)')::int as prohibited_term_sections,
       (select substring(s4.body from '성장키워드 — ([^\n]+)') from public.lesson_sections s4 where s4.lesson_id = l.id and s4.section_code = 's2') as growth_keyword,
       md5(coalesce(string_agg(s.section_code || ':' || s.body, '|' order by s.section_code), '')) as body_md5
from public.curriculum_lessons l
join public.curriculum_programs cp on cp.id = l.program_id and cp.code = 'SOYE-STARTER-2026.1'
left join public.lesson_sections s on s.lesson_id = l.id
group by l.id
order by l.week_no;

-- 5. 활성 계약 Readiness (content 포함 전체 항목)
select c.id as contract_id,
       e ->> 'code' as item,
       (e ->> 'ok')::boolean as ok,
       e ->> 'reason' as reason,
       e -> 'detail' as detail
from public.contracts c
cross join lateral jsonb_array_elements(private.contract_readiness_internal(c.id) -> 'items') e
where c.status = 'active'
order by c.id, e ->> 'code';

-- 6. 계약 상태 · 게시 section 보호 trigger
select
  (select count(*) from public.contracts where status = 'active')::int as active_contracts,
  (select count(*) from public.contracts where status = 'suspended')::int as suspended_contracts,
  (select count(*) from public.contracts where status = 'ended')::int as ended_contracts,
  exists (select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
          where not t.tgisinternal and t.tgenabled = 'O' and c.relname = 'lesson_sections'
            and t.tgname = 'trg_lesson_sections_write_check') as published_section_guard_enabled;

-- 7. UAT 반 수업 · 배정 상세 (id · 상태 · 날짜 · 주차만)
select a.id as assignment_id,
       cp.code as program_code,
       a.status as assignment_status,
       a.start_date,
       a.origin_contract_id,
       (select jsonb_agg(jsonb_build_object('session_id', s.id, 'status', s.status, 'scheduled_date', s.scheduled_date, 'week_no', s.week_no) order by s.week_no, s.scheduled_date)
        from public.class_sessions s where s.class_program_assignment_id = a.id) as sessions
from public.class_program_assignments a
join public.curriculum_programs cp on cp.id = a.program_id
order by a.created_at;
