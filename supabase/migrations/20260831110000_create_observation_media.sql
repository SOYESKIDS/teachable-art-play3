-- =========================================================
-- SERVICE-09A — 관찰기록 활동사진 (private Storage + metadata)
-- =========================================================
--
-- 무엇을 만드는가
--   storage bucket  observation-media                      (private)
--   table           public.class_session_observation_media (metadata)
--   helper          private.safe_uuid()
--                   private.can_upload_observation_media_object()
--                   private.can_read_observation_media_object()
--   trigger         private.enforce_observation_media_insert()
--
-- ★ 사진은 원본 관찰자료(source evidence)다. AI 산출물이 아니다.
--   점수·등급·발달단계·위험도·진단 어떤 것도 이 Migration에 없다.
--   얼굴/감정 분석용 컬럼도 만들지 않는다.
--
-- ★ observation_id를 FK로 두지 않는다.
--   교사는 수업 중에 사진을 먼저 찍고 서술은 나중에 쓴다.
--   observation을 필수 부모로 만들면 "글을 써야 사진을 올릴 수 있는" 구조가 되어
--   현장 순서와 어긋난다. 그래서 이 테이블은 관찰 텍스트가 아니라
--   (수업 · 반 · 원아)에 직접 매달린다.
--   화면에서 둘을 합치는 것은 child_id 기준 grouping으로 충분하다.
--
-- ★ 아이 사진은 민감한 교육 데이터다. 그래서
--   bucket public = false / signed URL만 / public URL 경로 없음 /
--   original filename을 URL에 노출하지 않음 / org·session·child 경계를 RLS로 강제.
--
-- ★ service_role을 쓰지 않는다. 업로드도 조회도 사용자 세션 + RLS로만 이뤄진다.
--
-- 사용자 정의 SQLSTATE
--   OM006 : storage에 실제 파일이 없는데 metadata를 등록하려 했다
--
--   나머지 trigger 거부는 기존 08A와 같은 check_violation(23514)을 쓴다.
--   OM006만 따로 두는 이유: 이 경우만 사용자가 할 일이 분명히 다르기 때문이다
--   ("다시 선택해서 업로드하세요" — 권한 문제도 입력 오류도 아니다).
--   Server Action이 이 코드를 보고 사용자 문구를 고른다.
--
-- 재사용하는 기존 자산 (새로 만들지 않는다)
--   20260813 : private.is_soyes_admin()
--   20260815 : private.has_org_role()
--   20260824 : private.is_class_teacher()          — 반 active를 요구한다(신규 업로드용)
--   20260826 : private.is_assigned_class_teacher() — 보관된 반의 과거 자료 조회용
--   20260828 : private.is_recordable_session()     — cancelled 제외
--   20260828 : class_sessions_id_org_class_key     — 복합 FK 대상
--
-- 이 Migration이 건드리지 않는 것
--   class_session_attendance / class_session_observations /
--   class_session_observation_domains / observation_domains / children /
--   class_sessions / classes 의 컬럼·GRANT·Policy·trigger — 전부 그대로.
--   기존 storage 정책은 존재하지 않는다(이 프로젝트의 첫 Storage 사용이다).


-- =========================================================
-- 0. Storage bucket — observation-media (PRIVATE)
-- =========================================================
-- ★ public = false. 이 값은 아래 on conflict에서도 매번 false로 되돌린다.
--   누군가 대시보드에서 실수로 공개로 바꿔도 이 Migration을 다시 돌리면 닫힌다.
--
-- file_size_limit / allowed_mime_types는 Storage가 업로드 시점에 강제한다.
-- 같은 값을 애플리케이션 상수(src/types/staff-observation-media.ts)와
-- 아래 테이블 CHECK에도 둔다 — 세 곳이 같은 숫자를 쓴다.
--
-- HEIC/HEIF는 이번 단계에서 제외한다(브라우저·서버 디코딩 호환 문제).

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'observation-media',
  'observation-media',
  false,
  6291456,                                             -- 6 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public             = false,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- =========================================================
-- 1. private.safe_uuid — 경로 조각을 예외 없이 uuid로 바꾼다
-- =========================================================
-- storage.objects Policy는 사용자가 보낸 임의의 문자열(name)을 받는다.
-- 거기서 곧바로 ::uuid를 하면 '../etc' 같은 값에 22P02 예외가 나고,
-- Policy 평가 중 예외는 요청 전체를 실패시킨다 —
-- 즉 "거부"가 아니라 "오류"가 되어 원인 파악이 어려워진다.
--
-- CASE는 조건이 맞는 분기만 평가하므로, 형식이 맞을 때만 cast가 실행된다.
-- 형식이 아니면 NULL을 돌려주고, NULL은 아래 join/where에서 조용히 0건이 된다.

create or replace function private.safe_uuid(p_value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p_value::uuid
    else null
  end;
$$;

revoke execute on function private.safe_uuid(text) from public, anon;
grant execute on function private.safe_uuid(text) to authenticated;


-- =========================================================
-- 2. public.class_session_observation_media
-- =========================================================

create table if not exists public.class_session_observation_media (

  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  class_session_id uuid not null,

  -- ★ 기록 당시의 반. 아래 복합 FK가 수업의 class_id와 일치하도록 강제한다.
  --   원아가 나중에 반을 옮겨도 이 값은 그대로 남는다
  --   (20260831094000의 class_session_observations와 같은 규칙).
  class_id uuid not null,

  child_id uuid not null,

  -- ── Storage 연결 ─────────────────────────────────────────────
  -- storage.objects.name과 정확히 같은 값이다. bucket은 observation-media 하나뿐이라
  -- 컬럼으로 두지 않는다(값이 하나뿐인 컬럼은 잘못된 값이 들어갈 자리만 만든다).
  --
  -- ★ 형식을 DB가 못박는다.
  --   {organization_id}/{class_session_id}/{child_id}/{uuid}.{ext}
  --   - 경로 traversal('..'), 공백, 한글, 확장자 위장이 어느 것도 통과하지 못한다.
  --   - original filename은 경로에 들어가지 않는다(아래 별도 컬럼에만 보관).
  --   - 아래 storage Policy가 이 경로를 파싱해 권한을 판정하므로,
  --     형식이 흔들리면 권한 판정도 흔들린다. 그래서 CHECK로 고정한다.
  storage_path text not null
    constraint class_session_observation_media_storage_path_key unique
    constraint class_session_observation_media_storage_path_format_check
    check (
      char_length(storage_path) <= 300
      and storage_path ~ (
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        || '\.(jpg|png|webp)$'
      )
    ),
  -- ─────────────────────────────────────────────────────────────

  -- 이번 단계는 이미지만이다. 동영상·음성은 09 이후에 별도 설계로 다룬다.
  -- 값이 하나뿐이지만 컬럼을 두는 이유: 나중에 종류가 늘 때
  -- 기존 행의 의미를 다시 해석하지 않아도 되게 하기 위해서다.
  media_type text not null default 'image'
    constraint class_session_observation_media_media_type_check
    check (media_type = 'image'),

  -- bucket의 allowed_mime_types와 같은 목록이다. 한쪽만 바뀌면 안 된다.
  mime_type text not null
    constraint class_session_observation_media_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),

  -- bucket의 file_size_limit(6 MiB)과 같은 상한이다.
  --
  -- ★ standard upload(단일 요청) 기준으로 정한 값이다.
  --   더 큰 파일은 TUS resumable upload가 필요하고 그것은 09A 범위가 아니다.
  byte_size bigint not null
    constraint class_session_observation_media_byte_size_check
    check (byte_size > 0 and byte_size <= 6291456),

  -- 교사가 파일을 다시 찾을 때의 단서로만 쓴다. URL 경로에는 절대 들어가지 않는다.
  original_filename text
    constraint class_session_observation_media_original_filename_check
    check (
      original_filename is null
      or (
        char_length(original_filename) <= 255
        and btrim(original_filename) <> ''
      )
    ),

  -- 09A에는 caption 입력 UI가 없다(항상 NULL). 컬럼만 미리 둔다.
  -- ★ UPDATE Policy도 UPDATE GRANT도 만들지 않으므로,
  --   지금 이 값은 INSERT 시점 외에는 바뀔 수 없다. 수정 표면을 넓히지 않는다.
  caption text
    constraint class_session_observation_media_caption_check
    check (
      caption is null
      or (
        char_length(caption) <= 500
        and btrim(caption) <> ''
      )
    ),

  -- ★ Client가 보내는 값이 아니다. 아래 trigger가 auth.uid()로 채운다.
  --   GRANT의 INSERT 컬럼 목록에도 들어 있지 않다.
  --   on delete set null 이유는 20260831094000의 created_by와 같다 —
  --   퇴사한 교사의 계정이 지워져도 자료는 남고 작성자만 빈다.
  created_by uuid,

  created_at timestamptz not null default now(),

  -- updated_at이 없다. 이 행은 만들어지거나(그리고 09B에서 지워지거나) 할 뿐
  -- 수정되지 않는다. UPDATE Policy도 GRANT도 만들지 않았다.

  -- ★ (1) 경로와 행이 서로를 증명한다.
  --   storage_path의 앞 세 조각이 이 행의 organization/session/child와 다르면 저장되지 않는다.
  --   trigger뿐 아니라 CHECK로도 걸어 두는 이유:
  --   RLS와 trigger는 우회 경로가 있어도 CHECK는 어떤 경로로도 우회되지 않는다.
  constraint class_session_observation_media_path_binding_check
    check (
      storage_path like (
        organization_id::text || '/' ||
        class_session_id::text || '/' ||
        child_id::text || '/%'
      )
    ),

  -- ★ (2) 기관·반이 그 수업의 것과 반드시 같아야 한다.
  --   20260828이 만든 class_sessions_id_org_class_key를 참조한다.
  constraint class_session_observation_media_session_fk
    foreign key (class_session_id, organization_id, class_id)
    references public.class_sessions (id, organization_id, class_id)
    on delete restrict,

  -- ★ (3) 원아는 반드시 같은 기관의 원아여야 한다.
  --   (child_id, class_id)로 걸지 않는 이유는 20260831094000과 같다 —
  --   그렇게 걸면 원아의 반 이동이 과거 자료 때문에 막힌다.
  constraint class_session_observation_media_child_fk
    foreign key (child_id, organization_id)
    references public.children (id, organization_id)
    on delete restrict,

  -- ★ (4) 업로더. 계정이 지워져도 자료는 남는다.
  constraint class_session_observation_media_created_by_fk
    foreign key (created_by)
    references public.profiles (user_id)
    on delete set null
);


-- 조회 index — 실제 화면 질의만 덮는다.
--   (class_session_id, child_id, created_at)
--     : 관찰 상세 화면이 "이 수업의 사진 전부"를 1회 조회해 child로 묶는다.
--       세션 단독 조회와 원아별 정렬을 이 하나가 함께 받는다.
--   (child_id)
--     : 원아별 성장 이력(향후 리포트). 08A가 같은 이유로 만든 index와 짝을 맞춘다.
create index if not exists class_session_observation_media_session_child_idx
  on public.class_session_observation_media (class_session_id, child_id, created_at);

create index if not exists class_session_observation_media_child_idx
  on public.class_session_observation_media (child_id);


-- =========================================================
-- 3. 신규 자료의 도메인 조건 (BEFORE INSERT)
-- =========================================================
-- 아래 INSERT Policy에도 겹치는 조건이 있지만, 이 trigger가 최종 판정자다.
-- RLS는 service_role과 superuser를 통과시키는 반면 trigger는 통과시키지 않는다.
-- (20260828 / 20260831094000과 같은 구조·같은 이유)

create or replace function private.enforce_observation_media_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_org_id uuid;
  v_session_class_id uuid;
  v_session_status text;
begin
  -- (1) 수업이 실제로 있어야 한다.
  select s.organization_id, s.class_id, s.status
  into v_session_org_id, v_session_class_id, v_session_status
  from public.class_sessions s
  where s.id = new.class_session_id;

  if not found then
    raise exception
      '수업을 찾을 수 없거나 접근 권한이 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (2) 취소된 수업에는 새 사진을 올리지 않는다.
  --     하지 않은 수업의 "활동 사진"은 성립하지 않는다.
  --     이미 올라간 사진의 조회는 아래 SELECT Policy가 계속 허용한다.
  if v_session_status = 'cancelled' then
    raise exception
      '취소된 수업에는 활동 사진을 추가할 수 없습니다.'
      using errcode = 'check_violation';
  end if;

  -- (3) 구조값이 그 수업의 것과 같아야 한다.
  --     복합 FK가 이미 강제하지만, FK 위반 메시지는 제약 이름만 알려 준다.
  --     BEFORE ROW trigger는 FK 검사보다 먼저 실행되므로 여기서 먼저 끝낸다.
  if new.organization_id is distinct from v_session_org_id
    or new.class_id is distinct from v_session_class_id
  then
    raise exception
      '활동 사진의 기관·반은 그 수업의 값과 같아야 합니다.'
      using errcode = 'check_violation';
  end if;

  -- (4) ★ 이 원아가 "지금" 이 반 소속인가 — 시점 검사다.
  --     children.status는 보지 않는다. 장기 결석(inactive) 상태의 원아도
  --     그날 활동에 참여했다면 사진의 대상이다
  --     (20260828 / 20260831094000이 같은 판단을 했다).
  if not exists (
    select 1
    from public.children c
    where c.id = new.child_id
      and c.class_id = v_session_class_id
  ) then
    raise exception
      '이 수업의 반에 속한 원아만 활동 사진을 추가할 수 있습니다.'
      using errcode = 'check_violation';
  end if;

  -- (5) ★ 경로가 이 행의 구조값과 정확히 맞아야 한다.
  --     CHECK 제약이 prefix를 이미 강제하지만, 여기서 한 번 더 확인해
  --     "왜 거부됐는지"를 사람이 읽을 수 있는 문구로 남긴다.
  if new.storage_path is distinct from (
       new.organization_id::text || '/' ||
       new.class_session_id::text || '/' ||
       new.child_id::text || '/' ||
       split_part(new.storage_path, '/', 4)
     )
  then
    raise exception
      '활동 사진의 저장 경로가 수업·원아 정보와 일치하지 않습니다.'
      using errcode = 'check_violation';
  end if;

  -- (6) ★ 실제 Storage 객체가 이미 존재해야 한다.
  --
  --     Client가 prepare로 유효한 경로를 받은 뒤 업로드를 건너뛰고 finalize만
  --     호출하면 "metadata는 있는데 파일이 없는" 행이 남는다. 그 행은 화면에서
  --     깨진 사진 자리가 되고, signed URL도 만들어지지 않는다.
  --     Server Action의 호출 순서만 믿으면 이 경로를 막을 수 없다.
  --     그래서 DB가 직접 확인한다 — 이 trigger를 통과했다면 파일은 반드시 있다.
  --
  --     ★ 허용/금지의 방향이 다르다는 점이 핵심이다.
  --       허용: storage 객체는 있는데 metadata가 없다  → 아무도 읽을 수 없는 고아
  --       금지: metadata는 있는데 storage 객체가 없다  → 화면에 깨진 사진
  --       이 검사는 두 번째만 막는다. 고아 정리는 09B에서 삭제 설계와 함께 다룬다.
  --
  --     ★ 이 조회가 임의 탐색 통로가 되지 않는 이유
  --       - 이 함수는 SECURITY DEFINER + search_path = '' 이고
  --         EXECUTE가 public / anon / authenticated 모두에서 회수되어 있다.
  --         trigger를 통해서만 실행된다.
  --       - 돌려주는 것이 없다. 조건이 맞으면 진행, 아니면 예외뿐이다.
  --       - 조회 대상이 "지금 INSERT하는 행의 storage_path" 하나로 고정되어 있고,
  --         그 경로는 위 (5)에서 이미 이 기관·수업·원아의 것으로 못박혔다.
  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'observation-media'
      and o.name = new.storage_path
  ) then
    raise exception
      '업로드된 사진 파일을 찾을 수 없습니다.'
      using errcode = 'OM006';
  end if;

  -- (7) 업로더는 Client가 정하지 않는다. 언제나 지금 로그인한 사용자다.
  --     auth.uid()는 스키마가 붙은 이름이라 search_path = ''에서도 해석된다.
  new.created_by := auth.uid();

  return new;
end;
$$;

-- trigger 전용이라 client가 직접 호출할 일이 없다.
revoke execute on function private.enforce_observation_media_insert()
from public, anon, authenticated;

drop trigger if exists trg_class_session_observation_media_insert_check
on public.class_session_observation_media;

create trigger trg_class_session_observation_media_insert_check
before insert on public.class_session_observation_media
for each row
execute function private.enforce_observation_media_insert();


-- =========================================================
-- 4. GRANT — public.class_session_observation_media
-- =========================================================
-- ★ UPDATE도 DELETE도 주지 않는다.
--   09A에는 caption 수정 UI도 삭제 UI도 없다. 없는 기능의 권한을 미리 열지 않는다.
--   삭제는 09B에서 "무엇을 지우고 Storage 객체는 어떻게 함께 정리하는가"를
--   따로 설계한 뒤에 연다.
--
-- ★ created_by / created_at / id는 어느 목록에도 없다.
--   전부 trigger 또는 default가 채운다. Client가 보낸 값은 쓰이지 않는다.

revoke all on public.class_session_observation_media from anon, authenticated;

grant select on public.class_session_observation_media to authenticated;

grant insert (
  organization_id,
  class_session_id,
  class_id,
  child_id,
  storage_path,
  media_type,
  mime_type,
  byte_size,
  original_filename,
  caption
) on public.class_session_observation_media to authenticated;


-- =========================================================
-- 5. RLS — public.class_session_observation_media
-- =========================================================
-- anon        : 0건 (위 revoke로 권한 자체가 없고, Policy도 authenticated 전용이다)
-- SOYES 운영자 : 조회만
-- 원장        : 자기 활성 기관 범위에서 조회만  ★ write 분기 없음
-- 교사        : 조회는 배정된 반, 업로드는 운영 중인 반의 기록 가능한 수업
--
-- 20260831094000의 관찰기록 Policy와 완전히 같은 기준이다.
-- 사진도 "그 자리에 있었던 교사가 남긴 것"이므로 원장이 대신 올리지 않는다.

alter table public.class_session_observation_media enable row level security;


-- ★ SELECT에는 수업 상태 조건도 반 상태 조건도 없다.
--   취소된 수업·보관된 반의 과거 사진도 "그때 이런 활동이 있었다"는 자료이므로 계속 보인다.
drop policy if exists "observation media readable by org staff and soyes admin"
on public.class_session_observation_media;

create policy "observation media readable by org staff and soyes admin"
  on public.class_session_observation_media
  for select
  to authenticated
  using (
    (select private.is_soyes_admin())
    or private.has_org_role(organization_id, array['director'])
    or private.is_assigned_class_teacher(class_id)
  );


-- ★ 신규 업로드 = 담당 교사 + 운영 중인 반 + 기록 가능한 수업
--   is_class_teacher()가 반 active를 요구하므로 보관된 반에는 새 사진을 올릴 수 없다.
--   is_recordable_session()이 cancelled를 제외한다.
--   원아-반 소속은 위 trigger가 강제한다.
drop policy if exists "observation media insert by assigned teacher"
on public.class_session_observation_media;

create policy "observation media insert by assigned teacher"
  on public.class_session_observation_media
  for insert
  to authenticated
  with check (
    private.is_class_teacher(class_id)
    and private.is_recordable_session(class_session_id)
  );


-- UPDATE Policy 없음 — 09A에 수정 기능이 없다.
-- DELETE Policy 없음 — 09A에 삭제 기능이 없다(09B 후보).


-- =========================================================
-- 6. Storage 권한 helper
-- =========================================================
-- storage.objects Policy 안에서 public.* 테이블을 읽어야 하는데,
-- 그 테이블들에는 RLS가 걸려 있다. SECURITY INVOKER로 두면
-- 판정에 필요한 행이 RLS에 가려 false negative가 난다.
-- 그래서 두 helper 모두 SECURITY DEFINER다 — 20260829/20260831095000과 같은 판단이다.
--
-- ★ DEFINER이지만 권한을 넓히지 않는다.
--   두 함수는 boolean 하나만 돌려주고, 내부 판정을 전부 기존 helper
--   (is_soyes_admin / has_org_role / is_class_teacher /
--    is_assigned_class_teacher / is_recordable_session)에 위임한다.
--   그 helper들은 모두 auth.uid()를 기준으로 판정한다.
--   즉 "누구인가"는 여전히 세션이 정하고, 이 함수는 대신 조회만 해 준다.


-- ── 업로드 가능한가 ──────────────────────────────────────────
-- 아직 metadata 행이 없는 시점이라 경로를 직접 파싱해 판정한다.
--
-- 검증 항목
--   ① 경로 형식이 정확한가 (regex — traversal·특수문자·확장자 위장 차단)
--   ② 1번째 조각이 그 수업의 organization_id와 같은가
--   ③ 2번째 조각이 실재하는 class_session인가
--   ④ 3번째 조각이 그 수업 반의 "현재" 원아인가
--   ⑤ 호출자가 그 반의 담당 교사인가 (반 active 요구)
--   ⑥ 그 수업이 기록 가능한 상태인가 (cancelled 제외)
--
-- safe_uuid()가 형식이 틀린 조각을 NULL로 만들므로 cast 예외가 발생하지 않는다.
create or replace function private.can_upload_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_sessions s
    join public.children c
      on c.id = private.safe_uuid(split_part(p_name, '/', 3))
     and c.organization_id = s.organization_id
     and c.class_id = s.class_id
    where p_name ~ (
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            || '\.(jpg|png|webp)$'
          )
      and s.id = private.safe_uuid(split_part(p_name, '/', 2))
      and s.organization_id = private.safe_uuid(split_part(p_name, '/', 1))
      and private.is_class_teacher(s.class_id)
      and private.is_recordable_session(s.id)
  );
$$;

revoke execute on function private.can_upload_observation_media_object(text)
from public, anon;
grant execute on function private.can_upload_observation_media_object(text)
to authenticated;


-- ── 조회 가능한가 ────────────────────────────────────────────
-- ★ 판정 기준을 "metadata 행이 존재하는가"로 둔다.
--
--   경로를 다시 파싱하지 않는 이유가 둘 있다.
--   (1) 조회 권한 규칙이 metadata 테이블의 SELECT Policy와 한 곳에서만 정의된다.
--       두 곳에 적으면 언젠가 어긋난다.
--   (2) 업로드는 됐지만 metadata 등록이 실패한 고아 객체는 아무도 읽을 수 없게 된다.
--       개인정보 관점에서 이쪽이 안전한 기본값이다.
create or replace function private.can_read_observation_media_object(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.class_session_observation_media m
    where m.storage_path = p_name
      and (
        (select private.is_soyes_admin())
        or private.has_org_role(m.organization_id, array['director'])
        or private.is_assigned_class_teacher(m.class_id)
      )
  );
$$;

revoke execute on function private.can_read_observation_media_object(text)
from public, anon;
grant execute on function private.can_read_observation_media_object(text)
to authenticated;


-- =========================================================
-- 7. Storage RLS — storage.objects
-- =========================================================
-- ★ bucket_id 조건을 반드시 먼저 건다.
--   이 조건이 없으면 다른 bucket의 객체까지 이 Policy가 판정하게 된다.
--
-- ★ 다른 bucket을 위한 기존 정책은 이 프로젝트에 존재하지 않는다.
--   아래 두 정책은 observation-media 이름을 붙여, 나중에 다른 bucket이 생겨도
--   이름과 조건이 겹치지 않게 한다.

drop policy if exists "observation media objects readable by org staff and soyes admin"
on storage.objects;

create policy "observation media objects readable by org staff and soyes admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'observation-media'
    and private.can_read_observation_media_object(name)
  );


drop policy if exists "observation media objects insert by assigned teacher"
on storage.objects;

create policy "observation media objects insert by assigned teacher"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'observation-media'
    and private.can_upload_observation_media_object(name)
  );


-- UPDATE Policy 없음 — 같은 경로를 덮어쓰는(upsert) 경로를 열지 않는다.
--   경로마다 새 uuid를 쓰므로 덮어쓸 일이 없고,
--   열어 두면 "이미 올린 사진을 다른 이미지로 바꿔치기"가 가능해진다.
--
-- DELETE Policy 없음 — 09A에 삭제 기능이 없다.
--   ★ 그 결과 metadata 등록이 실패한 고아 객체는 사용자 권한으로 지울 수 없다.
--     대신 위 SELECT helper 때문에 아무도 읽을 수 없고, 목록에도 나오지 않는다
--     (화면은 storage 디렉터리 목록이 아니라 metadata 테이블만 읽는다).
--     정리 방법은 09B에서 삭제 설계와 함께 결정한다.


-- =========================================================
-- 변경하지 않은 것 (명시)
-- =========================================================
--   public.class_sessions / classes / children / profiles
--     — 컬럼·GRANT·Policy·trigger 그대로. 이 Migration은 SELECT만 한다.
--   public.class_session_attendance                — 그대로. 사진과 결합하지 않는다.
--   public.class_session_observations              — 그대로.
--     ★ observation_id FK를 만들지 않았으므로 관찰기록 쪽 구조가 전혀 바뀌지 않는다.
--   public.class_session_observation_domains       — 그대로.
--   public.observation_domains                     — 그대로.
--   private.* 기존 helper                          — 재정의하지 않는다.
--   기존 Storage 정책                              — 존재하지 않았고, 만들지도 삭제하지도 않았다.
--   drop table / drop column / alter column type / drop policy(기존 것) — 0건.
