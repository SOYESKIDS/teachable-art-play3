-- TeachAble Art Play — B2B Lead 접수 테이블
-- 4주 파일럿 / 대시보드 데모 / 기관 맞춤 상담 / 상품 도입 관심
--
-- 최초 신규 Supabase 프로젝트에 1회 적용하는 Migration입니다.

create extension if not exists pgcrypto;


create table if not exists public.lead_submissions (

  id uuid primary key default gen_random_uuid(),

  submission_type text not null
    constraint lead_submissions_submission_type_check
    check (
      submission_type in (
        'pilot',
        'demo',
        'consult',
        'purchase_interest'
      )
    ),

  institution_name text not null
    constraint lead_submissions_institution_name_check
    check (
      char_length(btrim(institution_name)) between 1 and 100
    ),

  contact_name text not null
    constraint lead_submissions_contact_name_check
    check (
      char_length(btrim(contact_name)) between 1 and 50
    ),

  position text
    constraint lead_submissions_position_check
    check (
      position is null
      or char_length(btrim(position)) <= 50
    ),

  phone text not null
    constraint lead_submissions_phone_check
    check (
      char_length(btrim(phone)) between 1 and 30
    ),

  email text
    constraint lead_submissions_email_check
    check (
      email is null
      or (
        char_length(email) <= 255
        and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      )
    ),

  child_count integer
    constraint lead_submissions_child_count_check
    check (
      child_count is null
      or child_count >= 0
    ),

  class_count integer
    constraint lead_submissions_class_count_check
    check (
      class_count is null
      or class_count >= 0
    ),

  package_code text
    constraint lead_submissions_package_code_check
    check (
      package_code is null
      or package_code in (
        'starter',
        'standard',
        'premium',
        'undecided'
      )
    ),

  message text
    constraint lead_submissions_message_check
    check (
      message is null
      or char_length(message) <= 2000
    ),

  privacy_agreed boolean not null
    constraint lead_submissions_privacy_agreed_check
    check (
      privacy_agreed = true
    ),

  marketing_agreed boolean not null default false,

  status text not null default 'new'
    constraint lead_submissions_status_check
    check (
      status in (
        'new',
        'contacted',
        'qualified',
        'converted',
        'closed'
      )
    ),

  source text not null default 'website',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- =========================================================
-- updated_at 자동 변경
-- =========================================================

create or replace function public.set_lead_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists trg_lead_submissions_updated_at
on public.lead_submissions;


create trigger trg_lead_submissions_updated_at
before update on public.lead_submissions
for each row
execute function public.set_lead_submissions_updated_at();


-- Trigger Function은 내부 용도이므로 외부 API에서 직접 실행할 수 없도록 차단
revoke execute
on function public.set_lead_submissions_updated_at()
from public, anon, authenticated;


-- =========================================================
-- Admin/CRM 조회 성능을 위한 기본 Index
-- =========================================================

create index if not exists lead_submissions_created_at_idx
on public.lead_submissions (created_at desc);


create index if not exists lead_submissions_status_idx
on public.lead_submissions (status);


create index if not exists lead_submissions_submission_type_idx
on public.lead_submissions (submission_type);


-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.lead_submissions
enable row level security;


-- 기존 공개 권한 제거
revoke all
on public.lead_submissions
from anon, authenticated;


-- 익명 방문자와 로그인 사용자 모두 동일한 Lead Form 컬럼만 작성 가능
grant insert (
  submission_type,
  institution_name,
  contact_name,
  position,
  phone,
  email,
  child_count,
  class_count,
  package_code,
  message,
  privacy_agreed,
  marketing_agreed
)
on public.lead_submissions
to anon, authenticated;


-- =========================================================
-- Public INSERT Policy
-- =========================================================

drop policy if exists
"public can insert lead submissions"
on public.lead_submissions;


create policy
"public can insert lead submissions"
on public.lead_submissions
for insert
to anon, authenticated
with check (
  privacy_agreed = true
  and status = 'new'
  and source = 'website'
);
