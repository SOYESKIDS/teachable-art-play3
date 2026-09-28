-- =====================================================================
-- PHASE 07 · M2 — fact-based backfill · reference seed
-- ---------------------------------------------------------------------
-- 근거: DEC-094 (No fake backfill) · DEC-005 · DEC-048 ~ DEC-055 · DEC-063
--
-- 하는 것 (사실 값만):
--   · class_sessions.week_no ← curriculum_lessons.week_no 복사
--   · Growth5 catalog 5행 (공식 명칭 · DEC-005)
--   · 상품 4종 + 초안(draft) 버전 + 공식 catalog 포함 기능
--   · platform_capabilities 행 (모두 미출시 · 정책 차단 표시)
--
-- 하지 않는 것:
--   · 구 5영역 → Growth5 자동 매핑 (금지)
--   · legacy 리포트 → Weekly/Monthly 변환 (금지)
--   · 기존 기관의 Contract 자동 생성 (금지 · DB-7 · 사람이 검증해 입력)
--   · 상품 버전 발행 (PROVISIONAL · UNKNOWN 항목이 있어 HQ 검토 후 발행)
--   · 가격 저장 (billing 없음 · 가격은 marketing source 에만 존재)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. class_sessions.week_no backfill
-- ---------------------------------------------------------------------
-- 완료 · 취소 세션도 사실 값이므로 채운다. 이 한 번의 backfill 동안만
-- 상태 검증 trigger 와 updated_at trigger 를 끈다 (동시성 토큰 보존).

alter table public.class_sessions disable trigger trg_class_sessions_update_check;
alter table public.class_sessions disable trigger trg_class_sessions_updated_at;

update public.class_sessions s
set week_no = l.week_no
from public.curriculum_lessons l
where l.id = s.lesson_id
  and s.week_no is null;

alter table public.class_sessions enable trigger trg_class_sessions_updated_at;
alter table public.class_sessions enable trigger trg_class_sessions_update_check;


-- ---------------------------------------------------------------------
-- 2. Growth5 catalog (DEC-005 · 가이드 문구: evidence-growth-model §2)
-- ---------------------------------------------------------------------

insert into public.growth_metrics (code, label, guide, sort_order)
values
  ('expression_variety', '표현 다양성',
   '색 · 재료 · 방법을 여러 갈래로 시도한 모습 (많을수록 좋다는 뜻 아님)', 1),
  ('form_space_composition', '형태·공간 구성',
   '형태를 배치하고 공간을 다룬 모습', 2),
  ('creative_attempt', '창의적 시도',
   '제시된 방법과 다른 방식을 꺼내 본 모습', 3),
  ('engagement_immersion', '활동 참여·몰입',
   '활동에 머문 방식 (시간 길이 아님)', 4),
  ('self_explanation', '자기 설명·소통',
   '자기 선택을 말 · 몸짓으로 전한 모습', 5)
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 3. Products · draft versions · features (product-catalog.md §2 · §4)
-- ---------------------------------------------------------------------
-- 버전은 draft 로 만든다. PROVISIONAL 포함 기능(bulk_print · content_playback)
-- 은 넣지 않았다 → HQ 가 확정 후 추가 · 발행 (implementation-status IB-2).

insert into public.products (code, offer_type, display_name)
values
  ('starter', 'regular', 'STARTER · 스타터 밸런스 팩'),
  ('standard', 'regular', 'STANDARD · 플레이 팩'),
  ('premium', 'regular', 'PREMIUM · 스마트 아트 & 플레이'),
  ('pilot', 'pilot', '4주 파일럿')
on conflict (code) do nothing;

insert into public.product_versions (product_id, version_label, week_from, week_to, children_per_class, max_classes)
select p.id, v.version_label, v.week_from, v.week_to, v.children_per_class, v.max_classes
from (
  values
    ('starter',  '2026.1', 1, 8,  15, null::integer),
    ('standard', '2026.1', 1, 16, 15, null::integer),
    ('premium',  '2026.1', 1, 24, 15, null::integer),
    ('pilot',    '2026.1', 1, 4,  15, 2)
) as v(product_code, version_label, week_from, week_to, children_per_class, max_classes)
join public.products p on p.code = v.product_code
on conflict (product_id, version_label) do nothing;

insert into public.product_version_features (product_version_id, feature_code, ai_capabilities)
select pv.id, f.feature_code, f.ai_capabilities
from (
  values
    ('starter',  'class_mode',         null::text[]),
    ('starter',  'weekly_report',      null::text[]),
    ('starter',  'parent_portal',      null::text[]),

    ('standard', 'class_mode',         null::text[]),
    ('standard', 'weekly_report',      null::text[]),
    ('standard', 'monthly_report',     null::text[]),
    ('standard', 'semester_report',    null::text[]),
    ('standard', 'director_dashboard', null::text[]),
    ('standard', 'parent_portal',      null::text[]),
    ('standard', 'ai_assist',          array['c1', 'c2', 'c3']::text[]),

    ('premium',  'class_mode',         null::text[]),
    ('premium',  'weekly_report',      null::text[]),
    ('premium',  'monthly_report',     null::text[]),
    ('premium',  'semester_report',    null::text[]),
    ('premium',  'director_dashboard', null::text[]),
    ('premium',  'parent_portal',      null::text[]),
    ('premium',  'ai_assist',          array['c1', 'c2', 'c3']::text[]),
    ('premium',  'branding',           null::text[]),

    ('pilot',    'class_mode',         null::text[]),
    ('pilot',    'weekly_report',      null::text[]),
    ('pilot',    'director_dashboard', null::text[]),
    ('pilot',    'parent_portal',      null::text[]),
    ('pilot',    'ai_assist',          array['c1']::text[])
) as f(product_code, feature_code, ai_capabilities)
join public.products p on p.code = f.product_code
join public.product_versions pv on pv.product_id = p.id and pv.version_label = '2026.1'
where pv.lifecycle = 'draft'
on conflict (product_version_id, feature_code) do nothing;


-- ---------------------------------------------------------------------
-- 4. platform_capabilities (모두 미출시로 시작 · DEC-063)
-- ---------------------------------------------------------------------
-- blocked_by 는 정책 미해결로 Production 출시가 막힌 이유다.
--   parent_portal : CO-12 (Portal 만료 · 재발급 정책)
--   ai_assist     : AR-8  (외부 AI 사용 전 자유 텍스트 개인정보 최소화)
--   branding      : CO-8  (브랜딩 범위 UNKNOWN)
-- 해결되면 HQ Admin 이 blocked_by 를 비우고 is_released 를 켠다 (audit 기록).

insert into public.platform_capabilities (code, is_released, blocked_by, note)
values
  ('class_mode',         false, '{}'::text[],           null),
  ('weekly_report',      false, '{}'::text[],           null),
  ('monthly_report',     false, '{}'::text[],           'P1'),
  ('semester_report',    false, '{}'::text[],           'P2'),
  ('director_dashboard', false, '{}'::text[],           null),
  ('parent_portal',      false, array['CO-12']::text[], 'Portal 만료 · 재발급 정책 미정'),
  ('bulk_print',         false, '{}'::text[],           'P1'),
  ('content_playback',   false, '{}'::text[],           'P1 · Content Delivery Layer'),
  ('ai_assist',          false, array['AR-8']::text[],  '외부 AI 사용 전 개인정보 최소화 미해결'),
  ('branding',           false, array['CO-8']::text[],  '브랜딩 범위 UNKNOWN')
on conflict (code) do nothing;
