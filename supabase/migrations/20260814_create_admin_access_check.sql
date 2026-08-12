-- SOYESKIDS Admin — public.has_soyes_admin_access() RPC wrapper
--
-- private.is_soyes_admin()는 private schema에 있어 Supabase Data API(RPC)로 직접 호출할 수 없습니다.
-- Next.js 코드가 "현재 로그인한 사용자가 SOYES 관리자인지"를 안전하게 물어볼 수 있도록
-- public schema에 boolean만 반환하는 최소 wrapper 함수를 추가합니다.
-- Lead 데이터 자체는 이 함수를 통해 전혀 노출되지 않습니다.
--
-- 이 파일은 20260812_create_lead_submissions.sql, 20260813_create_admin_access.sql이
-- 이미 적용된 프로젝트에 이어서 적용합니다. 두 파일 모두 수정하지 않았습니다.
-- 아직 Supabase 프로젝트에는 적용되지 않았습니다. 승인 후 1회 실행하세요.

create or replace function public.has_soyes_admin_access()
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select private.is_soyes_admin();
$$;

-- Postgres는 함수 생성 시 기본적으로 PUBLIC에 EXECUTE를 부여하므로 명시적으로 회수한다.
revoke execute on function public.has_soyes_admin_access() from public;
grant execute on function public.has_soyes_admin_access() to authenticated;
