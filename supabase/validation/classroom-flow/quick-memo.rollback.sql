-- Manual staging check only: predefined synthetic teacher/director and completed week 2.
-- This simulates authenticated DB roles, not browser sign-in. All test writes roll back.
begin;
select set_config('request.jwt.claim.sub', 'e6e1ab4f-2c30-41b0-8d3e-209a90b9c6d9', true);
set local role authenticated;
do $$
declare
  v_token timestamptz;
  v_saved jsonb;
  v_stale_denied boolean := false;
begin
  if auth.uid() is distinct from 'e6e1ab4f-2c30-41b0-8d3e-209a90b9c6d9'::uuid then
    raise exception 'Wrong teacher context';
  end if;
  if not exists (select 1 from public.class_sessions where id='15100000-0000-4000-8000-000000000042'
    and organization_id='dad40381-5965-c087-5462-23169a6e3971' and status='completed') then
    raise exception 'Expected completed synthetic staging session is missing';
  end if;
  select updated_at into v_token from public.quick_memos
    where class_session_id='15100000-0000-4000-8000-000000000042' and author_user_id=auth.uid();
  v_saved := public.save_quick_memo('15100000-0000-4000-8000-000000000042', '[rollback validation: private memo]', v_token);
  if v_saved->>'deleted' is distinct from 'false' or v_saved->>'updated_at' is null then
    raise exception 'RPC did not acknowledge persistence';
  end if;
  if not exists (select 1 from public.quick_memos where class_session_id='15100000-0000-4000-8000-000000000042'
    and author_user_id=auth.uid() and body='[rollback validation: private memo]') then
    raise exception 'Author cannot read back the saved memo';
  end if;
  begin
    perform public.save_quick_memo('15100000-0000-4000-8000-000000000042', '[must not overwrite]', v_token);
  exception when sqlstate 'QM005' then v_stale_denied := true;
  end;
  if not v_stale_denied then raise exception 'Stale overwrite was accepted'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '30edc274-777a-4261-8160-b6518ea4a119', true);
set local role authenticated;
do $$
declare v_denied boolean := false;
begin
  if exists (select 1 from public.quick_memos where class_session_id='15100000-0000-4000-8000-000000000042') then
    raise exception 'Director can see a teacher private memo';
  end if;
  begin
    perform public.save_quick_memo('15100000-0000-4000-8000-000000000042', '[director must not write]', null);
  exception when sqlstate 'QM002' or insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'Director can write a teacher memo'; end if;
end $$;
reset role;
set local role anon;
do $$
declare v_denied boolean := false;
begin
  begin
    perform public.save_quick_memo('15100000-0000-4000-8000-000000000042', '[anon must not write]', null);
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'Anonymous can call the memo RPC'; end if;
end $$;
reset role;
rollback;
select 7 as checks_passed, true as transaction_rolled_back;
