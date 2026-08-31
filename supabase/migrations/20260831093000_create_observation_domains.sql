-- =========================================================
-- SERVICE-08A (1/4) — 관찰영역 참조 테이블 (Observation Domains)
-- =========================================================
--
-- 이 Migration이 저장하는 것은 한 문장이다.
--
--   "교사가 관찰기록에 붙일 수 있는 관찰영역의 목록"
--
-- ★ 왜 CHECK ENUM이 아니라 테이블인가
--
--   이 프로젝트의 CHECK ENUM 11개(status, role, attendance_status 등)는 전부
--   "코드가 분기하는 상태 기계"다. 값이 바뀌면 애플리케이션 로직도 함께 바뀐다.
--
--   관찰영역은 다르다. 상품안이 바뀌면 표기명만 바뀌고 코드는 아무것도 달라지지 않는다.
--   그리고 CHECK 제약을 바꾸려면 alter table drop/add constraint가 필요한데,
--   이는 전체 테이블 스캔 + ACCESS EXCLUSIVE 락이다.
--   "바뀔 가능성이 명시된 값"에 쓰기에는 비용이 잘못 잡혀 있다.
--
--   그래서 20260825의 curriculum_programs와 같은 계통으로 둔다 —
--   SOYES가 소유하는 전역 참조 테이블이고, 기관 사용자는 읽기만 한다.
--
-- ★ code와 label의 역할 분리 (이 파일의 핵심)
--
--   code   : 불변 업무 키. FK 대상이고, AI 프롬프트·리포트·통계가 이 값을 쓴다.
--   label  : 화면 표기명. 상품안이 바뀌면 이것만 고친다.
--
--   code를 immutable trigger로 잠그기 때문에, 연결 테이블 FK에
--   ON UPDATE CASCADE를 걸 필요가 없다(걸어서도 안 된다 — 08A 지시사항).
--   바뀌지 않는 값에 cascade를 걸면 "바뀔 수도 있다"는 잘못된 신호가 남는다.
--
-- ★ is_active가 필요한 이유
--
--   운영을 끝낸 영역을 DELETE하면 그 영역을 참조한 과거 관찰기록이
--   FK restrict에 막히거나 이력이 끊긴다.
--   은퇴한 영역은 is_active=false로 두어 신규 선택 목록에서만 빼고,
--   과거 기록은 그대로 읽힌다.
--
--   그래서 아래 SELECT Policy는 is_active를 강제하지 않는다.
--   "지금 고를 수 있는 영역"을 거르는 것은 애플리케이션 쿼리의 몫이고,
--   "과거 기록의 영역 이름을 읽는 것"은 언제나 가능해야 한다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260815 : private.set_updated_at()
--   20260813 : private.is_soyes_admin()
--   20260825 : private.is_active_org_member()
--
-- 새로 추가하는 것
--   private.enforce_observation_domain_update()  — code 불변 (trigger 전용)
--
-- 이 Migration이 만들지 않는 것
--   DELETE Policy · DELETE GRANT · 기관별 커스텀 영역 · 점수/등급/가중치 컬럼.


-- =========================================================
-- 1. public.observation_domains
-- =========================================================

create table if not exists public.observation_domains (

  id uuid primary key default gen_random_uuid(),

  -- ★ 불변 업무 키. lower snake_case만 허용한다.
  --   첫 글자는 소문자 알파벳, 이후 소문자·숫자·밑줄. 2~39자.
  --   대문자·하이픈·공백을 막아 두면 AI 프롬프트나 URL에 그대로 실어도 안전하다.
  code text not null
    constraint observation_domains_code_check
    check (code ~ '^[a-z][a-z0-9_]{1,38}$'),

  -- 화면 표기명. 상품안 변경 시 여기만 고친다.
  label text not null
    constraint observation_domains_label_check
    check (char_length(btrim(label)) between 1 and 40),

  -- 교사에게 보여 줄 짧은 설명. 없어도 된다.
  description text
    constraint observation_domains_description_check
    check (
      description is null
      or char_length(btrim(description)) between 1 and 500
    ),

  -- 화면은 이 번호 오름차순으로 정렬한다.
  -- UNIQUE로 묶지 않는다 — 중간 삽입 때 전체 번호를 다시 매기게 되기 때문이다.
  sort_order integer not null
    constraint observation_domains_sort_order_check
    check (sort_order between 1 and 100),

  -- false면 신규 선택 대상에서 빠진다. 과거 기록의 조회는 계속 가능하다.
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- FK 대상이자 업무 키. 전 영역에서 유일하다.
  constraint observation_domains_code_key unique (code)
);


-- 교사 화면의 "지금 고를 수 있는 영역" 질의를 덮는다.
-- 행 수가 수십 건 규모라 index가 없어도 동작하지만,
-- 이 목록은 관찰 화면을 열 때마다 조회되므로 정렬까지 index로 받는다.
create index if not exists observation_domains_active_sort_idx
  on public.observation_domains (is_active, sort_order);


-- updated_at — 20260815의 공용 함수를 그대로 쓴다. 같은 기능을 새로 만들지 않는다.
drop trigger if exists trg_observation_domains_updated_at
on public.observation_domains;

create trigger trg_observation_domains_updated_at
before update on public.observation_domains
for each row
execute function private.set_updated_at();


-- =========================================================
-- 2. code 불변 (BEFORE UPDATE)
-- =========================================================
-- 아래 GRANT에서도 code를 UPDATE 대상에서 빼 두지만,
-- GRANT는 authenticated에만 적용된다.
-- service_role이나 직접 SQL로 code를 바꿔 과거 관찰기록의 의미를
-- 통째로 뒤집는 경로까지 여기서 막는다.
--
-- ★ SECURITY INVOKER다.
--   이 함수는 NEW/OLD 두 값만 비교하고 어떤 테이블도 읽지 않는다.
--   읽지 않으므로 RLS를 우회할 이유가 없고, 권한을 올릴 이유도 없다.

create or replace function private.enforce_observation_domain_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    raise exception
      '관찰영역 코드는 변경할 수 없습니다. 표기명(label)을 수정해주세요.'
      using errcode = 'check_violation';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception
      '관찰영역의 생성 시각은 변경할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- trigger 전용이라 client가 직접 호출할 일이 없다. execute를 아무에게도 주지 않는다.
revoke execute on function private.enforce_observation_domain_update()
from public, anon, authenticated;

drop trigger if exists trg_observation_domains_update_check
on public.observation_domains;

create trigger trg_observation_domains_update_check
before update on public.observation_domains
for each row
execute function private.enforce_observation_domain_update();


-- =========================================================
-- 3. GRANT — 컬럼 단위 최소 권한
-- =========================================================
-- "어떤 컬럼을 만질 수 있는가"는 GRANT가, "어떤 행을 만질 수 있는가"는 RLS가 정한다.
-- SOYES 운영자도 authenticated role로 접속하므로 GRANT는 authenticated에 주고,
-- 실제 write 가능 여부는 아래 Policy(is_soyes_admin)가 판정한다.
-- 20260825 curriculum_programs와 같은 구조다.
--
-- ★ DELETE 권한을 주지 않는다. 아래에서 DELETE Policy도 만들지 않는다.
--   운영을 끝낸 영역은 is_active=false로 두고, 행은 남긴다.
--   지우면 그 영역을 참조한 과거 관찰기록이 갈 곳을 잃는다.

revoke all on public.observation_domains from anon, authenticated;

grant select on public.observation_domains to authenticated;

grant insert (code, label, description, sort_order, is_active)
on public.observation_domains to authenticated;

-- ★ code는 UPDATE 목록에 없다. 위 trigger가 한 번 더 막는다.
grant update (label, description, sort_order, is_active)
on public.observation_domains to authenticated;


-- =========================================================
-- 4. RLS
-- =========================================================
-- anon        : 0건 (위 revoke로 권한 자체가 없고, Policy도 authenticated 전용이다)
-- SOYES 운영자 : 조회 / 생성 / 수정
-- 원장·교사    : 조회만. is_active 여부와 무관하게 전부 읽는다.
--
-- ★ SELECT에서 is_active=true를 강제하지 않는 이유는 파일 상단에 적어 두었다.
--   과거 관찰기록이 참조하는 은퇴한 영역의 label을 읽지 못하면
--   교사 화면에 "알 수 없는 영역"이 뜨게 된다.
--
-- ★ 전역 콘텐츠라 organization_id가 없다. 그래서 has_org_role(org_id, ...)를 쓸 수 없고,
--   20260825가 같은 이유로 만든 is_active_org_member()를 그대로 쓴다.
--   기관이 suspended면 false가 되어 정지된 기관은 참조 목록도 볼 수 없다.

alter table public.observation_domains enable row level security;


drop policy if exists "observation domains readable by soyes admin and org members"
on public.observation_domains;

create policy "observation domains readable by soyes admin and org members"
  on public.observation_domains
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or (select private.is_active_org_member())
  );


drop policy if exists "observation domains insert by soyes admin"
on public.observation_domains;

create policy "observation domains insert by soyes admin"
  on public.observation_domains
  for insert
  to authenticated
  with check ((select private.is_soyes_admin()));


drop policy if exists "observation domains update by soyes admin"
on public.observation_domains;

create policy "observation domains update by soyes admin"
  on public.observation_domains
  for update
  to authenticated
  using ((select private.is_soyes_admin()))
  with check ((select private.is_soyes_admin()));


-- DELETE Policy 없음 — 은퇴한 영역은 is_active=false로 둔다.


-- =========================================================
-- 5. Seed — 현재 상품안의 관찰영역 5개
-- =========================================================
-- ★ on conflict (code) do nothing 이다. do update가 아니다.
--
--   운영 중에 SOYES 운영자가 label을 "색채 표현" → "색과 재료 표현"으로 고쳤다고 하자.
--   do update였다면 이 Migration을 다시 돌리는 순간 그 수정이 조용히 되돌아간다.
--   Migration은 재실행이 안전해야 하고, "안전"은 "덮어쓰지 않는다"를 포함한다.
--
--   영역을 추가할 때는 이 목록에 줄을 더하지 말고 새 Migration을 만든다.
--   그래야 언제 무엇이 추가됐는지 이력으로 남는다.

insert into public.observation_domains (code, label, description, sort_order)
values
  (
    'color_expression',
    '색채 표현',
    '아이가 고른 색과 색을 쓰는 방식에서 나타난 표현입니다.',
    1
  ),
  (
    'form_space',
    '형태·공간 구성',
    '화면이나 입체물 안에서 형태를 배치하고 공간을 다루는 모습입니다.',
    2
  ),
  (
    'detail_expression',
    '표현의 세밀도',
    '아이가 대상을 얼마나 자세히 살펴보고 표현했는지에 대한 관찰입니다.',
    3
  ),
  (
    'creative_extension',
    '창의적 확장',
    '제시된 활동에서 한 걸음 더 나아가 스스로 덧붙인 표현입니다.',
    4
  ),
  (
    'activity_completion',
    '활동 완결성',
    '활동을 시작해서 자기 방식으로 마무리하기까지의 과정입니다.',
    5
  )
on conflict (code) do nothing;


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.curriculum_programs / curriculum_lessons / lesson_activities — 그대로.
--   public.organizations / organization_members / profiles              — 그대로.
--   public.classes / children / class_teachers                          — 그대로.
--   public.class_sessions / class_session_attendance                    — 그대로.
--   private.set_updated_at() / is_soyes_admin() / is_active_org_member()
--     — 재사용만 한다. 정의를 바꾸지 않는다.
--
-- ※ 이 테이블에 force row level security를 켜지 마라.
--   후속 Migration의 SECURITY DEFINER helper가 소유자 RLS 우회에 의존한다
--   (20260828:56 · 20260829:72와 같은 주의사항).
