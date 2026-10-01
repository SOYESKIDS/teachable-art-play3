-- PHASE 10F — SOYE-STARTER-2026.1 section 지문 (READ ONLY · 본문 출력 없음 · md5 · 길이만)
-- ---------------------------------------------------------------------
-- 실행: node supabase/validation/staging_e2e/remote_readonly_query.mjs supabase/validation/staging_e2e/sql/p10f_starter_section_hashes.sql
-- canonical(content/starter/2026.1/week-0N.txt) 의 section 별 md5 와 Staging 행을 1:1 대조한다 (supabase/content/verify_staging_content.mjs).

select l.week_no,
       l.title,
       l.status as lesson_status,
       l.objective is not null as has_objective,
       md5(l.objective) as objective_md5,
       s.section_code,
       md5(s.body) as body_md5,
       char_length(s.body) as body_chars,
       md5(coalesce(s.source_ref, '')) as source_ref_md5
from public.curriculum_lessons l
join public.curriculum_programs cp on cp.id = l.program_id and cp.code = 'SOYE-STARTER-2026.1'
join public.lesson_sections s on s.lesson_id = l.id
order by l.week_no, s.section_code;
