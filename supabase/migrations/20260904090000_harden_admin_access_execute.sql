-- =====================================================================================
-- SERVICE-15  public.has_soyes_admin_access() 최소권한 정리
-- =====================================================================================
--
--  하는 일은 한 줄로 요약된다.
--    "로그인하지 않은 역할(anon)에게서 관리자 판별 함수의 EXECUTE 를 회수한다."
--
--  ★ 권한 상승 취약점을 고치는 것이 아니다.
--    이 함수는 SECURITY INVOKER 이고 본문은 private.is_soyes_admin() 하나다.
--    그 함수는 auth.uid() = private.admin_users.user_id 를 찾으므로,
--    anon 이 호출해도 auth.uid() 가 null 이라 언제나 false 다.
--    즉 지금도 anon 이 이 함수로 얻을 수 있는 것은 false 뿐이다.
--    관리자 우회(admin bypass)가 아니며, 심각도는 최소권한 정리(P2) 수준이다.
--
--  ★ 그런데도 정리하는 이유
--    앱에서 이 함수를 부르는 곳은 lib/auth/admin.ts 한 곳이고,
--    그 함수를 부르는 두 경로 모두 **인증을 통과한 뒤에만** 도달한다.
--      requireAdmin()      : getClaims() 가 claims 를 돌려준 뒤에만 호출
--      admin/login action  : signInWithPassword() 성공 뒤에만 호출
--    익명 호출이 필요한 기능적 이유가 없으므로 권한도 두지 않는다.
--
--  ★ anon 권한이 어떻게 생겼는가 (과거 migration 의 실수가 아니다)
--    20260814 는 이미 다음을 실행했다.
--      revoke execute on function public.has_soyes_admin_access() from public;
--      grant  execute on function public.has_soyes_admin_access() to authenticated;
--
--    그런데 Supabase 프로젝트는 부트스트랩에서 다음을 걸어 둔다.
--      alter default privileges in schema public
--        grant all on functions to postgres, anon, authenticated, service_role;
--
--    이 때문에 public 스키마에 함수를 만들면 anon 에게 **개별 GRANT** 가 자동으로
--    붙는다. `revoke ... from public` 은 PUBLIC 유사 역할의 권한만 지우므로
--    개별 anon GRANT 는 그대로 남는다. anon 을 명시적으로 회수해야 사라진다.
--
--    같은 프로젝트의 다른 사실들이 이 설명을 뒷받침한다.
--      private.is_soyes_admin        anon=false  ← private 스키마에는 그 기본권한이 없다
--      public.read_shared_growth_report
--                                    authenticated=false ← 명시적으로 회수했기 때문
--    20260830 이후의 public RPC 는 전부 `from public, anon` 으로 회수하고 있고,
--    이 함수(20260814)만 그 관행보다 앞서 만들어져 anon 이 남아 있었다.
--
--  ★ 이 migration 이 하지 않는 것
--    함수 본문 변경 없음 (create or replace 를 쓰지 않는다)
--    private.is_soyes_admin() 권한 변경 없음
--    private.admin_users 변경 없음 (행도, RLS 도, GRANT 도)
--    RLS Policy 변경 없음
--    다른 RPC 권한 변경 없음
--    과거 migration 파일 수정 없음 — 적용된 이력은 불변으로 다룬다
--
--  ★ 수렴성
--    revoke / grant 는 현재 상태와 무관하게 목표 상태로 수렴한다.
--    여러 번 실행해도 결과가 같다.
--      anon          = false
--      authenticated = true
--      PUBLIC        = false
-- =====================================================================================

-- 함수 시그니처는 인자가 없다 (20260814 기준, Production catalog 와 일치).
--   public.has_soyes_admin_access() returns boolean

-- (1) PUBLIC 유사 역할 회수. 이미 회수돼 있어도 오류가 아니다.
revoke execute on function public.has_soyes_admin_access() from public;

-- (2) ★ 이번 정리의 핵심. Supabase 기본권한이 붙여 둔 개별 anon GRANT 를 회수한다.
revoke execute on function public.has_soyes_admin_access() from anon;

-- (3) 로그인한 사용자에게는 그대로 열어 둔다.
--     이 함수를 호출하는 앱 경로는 전부 인증 이후이므로 이것만 있으면 충분하다.
grant execute on function public.has_soyes_admin_access() to authenticated;
