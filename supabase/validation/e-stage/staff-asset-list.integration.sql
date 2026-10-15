-- Staging only. This harness must run inside BEGIN/ROLLBACK.
create temp table asset_list_checks(label text, passed boolean not null check(passed));
grant insert,select on asset_list_checks to authenticated;
do $$ begin
 if not exists(select 1 from public.classes where id='15100000-0000-4000-8000-000000000001' and name='소예 테스트반 (합성)') then
  raise exception 'Synthetic staging class is required';
 end if;
end $$;
insert into public.lesson_assets(id,lesson_id,asset_type,title,external_url,rights_note,rights_status,approval_status,sort_order)
select '15100000-0000-4000-8000-000000000061',lesson_id,'audio','Synthetic permission regression','https://example.invalid/private-source','private-regression-note','cleared','published',199
from public.class_sessions where id='15100000-0000-4000-8000-000000000043';
set local role authenticated;
select set_config('request.jwt.claim.sub','e6e1ab4f-2c30-41b0-8d3e-209a90b9c6d9',true);
insert into asset_list_checks select 'teacher list reads source presence',count(*)=1 and bool_and(has_source) from public.list_lesson_assets_for_class('15100000-0000-4000-8000-000000000001',(select lesson_id from public.class_sessions where id='15100000-0000-4000-8000-000000000043')) where asset_id='15100000-0000-4000-8000-000000000061';
insert into asset_list_checks select 'teacher response hides paths and rights note',coalesce(bool_and(row_to_json(r)::text not like '%private-source%' and row_to_json(r)::text not like '%private-regression-note%'),false) from public.list_lesson_assets_for_class('15100000-0000-4000-8000-000000000001',(select lesson_id from public.class_sessions where id='15100000-0000-4000-8000-000000000043')) r where asset_id='15100000-0000-4000-8000-000000000061';
do $$ begin
 begin perform storage_path from public.lesson_assets;raise exception 'raw path unexpectedly readable';
 exception when insufficient_privilege then insert into asset_list_checks values('raw path denied',true);end;
end $$;
insert into asset_list_checks select 'other class helper returns no row',count(*)=0 from private.lesson_asset_display_state('15100000-0000-4000-8000-000000000061','15100000-0000-4000-8000-000000000099');
insert into asset_list_checks select 'teacher cannot use HQ projection',count(*)=0 from public.list_lesson_assets_for_admin((select lesson_id from public.class_sessions where id='15100000-0000-4000-8000-000000000043'));
select set_config('request.jwt.claim.sub','30edc274-777a-4261-8160-b6518ea4a119',true);
insert into asset_list_checks select 'director own class allowed',count(*)=1 from public.list_lesson_assets_for_class('15100000-0000-4000-8000-000000000001',(select lesson_id from public.class_sessions where id='15100000-0000-4000-8000-000000000043')) where asset_id='15100000-0000-4000-8000-000000000061';
select set_config('request.jwt.claim.sub','15100000-0000-4000-8000-000000000099',true);
insert into asset_list_checks select 'nonmember helper returns no row',count(*)=0 from private.lesson_asset_display_state('15100000-0000-4000-8000-000000000061','15100000-0000-4000-8000-000000000001');
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from private.admin_users where is_active and role='admin' limit 1),true);
set local role authenticated;
insert into asset_list_checks select 'HQ receives its rights note without raw paths',count(*)=1 and bool_and(rights_note='private-regression-note') from public.list_lesson_assets_for_admin((select lesson_id from public.class_sessions where id='15100000-0000-4000-8000-000000000043')) where asset_id='15100000-0000-4000-8000-000000000061';
reset role;
insert into asset_list_checks values('anonymous execution remains denied',not has_function_privilege('anon','public.list_lesson_assets_for_class(uuid,uuid)','EXECUTE') and not has_function_privilege('anon','private.lesson_asset_display_state(uuid,uuid)','EXECUTE'));
insert into asset_list_checks values('list RPC stays invoker',not (select prosecdef from pg_proc where oid='public.list_lesson_assets_for_class(uuid,uuid)'::regprocedure));
insert into asset_list_checks values('protected columns remain denied',not has_column_privilege('authenticated','public.lesson_assets','storage_path','SELECT') and not has_column_privilege('authenticated','public.lesson_assets','external_url','SELECT') and not has_column_privilege('authenticated','public.lesson_assets','rights_note','SELECT'));
select json_build_object('passed',count(*),'checks',json_agg(label)) from asset_list_checks;
