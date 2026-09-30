-- PHASE 10D — STARTER 상품 정의 · W1~W8 콘텐츠 적재 상태 (READ ONLY · SELECT/WITH · 본문 출력 없음)
-- ---------------------------------------------------------------------
-- 실행: node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/p10d_starter_content.sql
-- 각 문장은 runner 가 `begin transaction read only; … rollback;` 로 감싼다. 상태를 바꾸지 않는다.
-- 본문(lesson_sections.body)은 읽지 않는다 — 길이 · 출처 표시(source_ref 유무) · 합성 표시만.
-- private.contract_readiness_internal · private.required_lesson_sections 는 STABLE 판정 함수다 (쓰기 없음).

-- 1. STARTER 상품 버전 · 주차 범위 · 포함 기능
select p.code as product_code,
       pv.version_label,
       pv.lifecycle,
       pv.week_from,
       pv.week_to,
       (pv.week_to - pv.week_from + 1) as weeks,
       (select array_agg(pf.feature_code order by pf.feature_code)
          from public.product_version_features pf where pf.product_version_id = pv.id) as features
from public.product_versions pv
join public.products p on p.id = pv.product_id
where p.code = 'starter'
order by pv.version_label;

-- 2. 프로그램 (합성 표시 판정용 제목 포함 · 원아 정보 없음)
select cp.code, cp.title, cp.duration_weeks, cp.status,
       (cp.title like '%가상%' or cp.code ilike '%smoke%' or cp.code ilike '%e2e%') as synthetic_marker,
       (select count(*) from public.class_program_assignments a where a.program_id = cp.id)::int as class_assignments
from public.curriculum_programs cp
order by cp.code;

-- 3. 주차별 차시 · 필수 section 충족 · 본문 길이 (본문 없음)
select cp.code as program_code,
       l.week_no,
       l.session_no,
       l.title,
       l.status,
       (l.title like '%가상%') as synthetic_marker,
       count(ls.id)::int as sections,
       array(select unnest(private.required_lesson_sections())
             except select ls2.section_code from public.lesson_sections ls2 where ls2.lesson_id = l.id) as missing_required,
       coalesce(sum(char_length(ls.body)), 0)::int as total_body_chars,
       bool_or(ls.source_ref is not null) as has_source_ref,
       l.updated_at
from public.curriculum_lessons l
join public.curriculum_programs cp on cp.id = l.program_id
left join public.lesson_sections ls on ls.lesson_id = l.id
group by cp.code, l.id
order by cp.code, l.week_no, l.session_no;

-- 4. 활성 계약 Readiness 의 content 항목 (missing_weeks)
select c.id as contract_id,
       e ->> 'code' as item,
       (e ->> 'ok')::boolean as ok,
       e ->> 'reason' as reason,
       e -> 'detail' as detail
from public.contracts c
cross join lateral jsonb_array_elements(private.contract_readiness_internal(c.id) -> 'items') e
where c.status = 'active'
order by c.id, e ->> 'code';
