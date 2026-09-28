-- PHASE 09A · Staging 수업 일정 분포 (READ ONLY · 교사 "오늘의 수업" 화면 전제 확인용 · 개수만)
select
  count(*) filter (where s.status = 'scheduled' and s.scheduled_date = private.local_today()) as scheduled_today,
  count(*) filter (where s.status = 'scheduled' and s.scheduled_date < private.local_today()) as scheduled_past,
  count(*) filter (where s.status = 'scheduled' and s.scheduled_date > private.local_today()) as scheduled_future,
  count(*) filter (where s.status = 'scheduled' and s.scheduled_date is null) as scheduled_undated,
  min(s.week_no) as min_week,
  max(s.week_no) as max_week,
  bool_and(private.class_write_allowed(s.class_id, 'class_mode')) as all_class_mode_write,
  bool_and(private.class_week_entitled(s.class_id, s.week_no)) as all_weeks_entitled,
  bool_and(exists (select 1 from public.class_teachers ct where ct.class_id = s.class_id)) as all_classes_have_teacher,
  private.local_today() as staging_local_today
from public.class_sessions s
