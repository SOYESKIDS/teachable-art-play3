# PHASE UAT-DB-GUARD — 미래 수업 쓰기 · 학부모 공유 신규 발급 DB 최종 판정

> 2026-10-06 · branch `design-final-polish` (local) · **PREP ONLY — Staging 미적용 · Production 무관**
> migration: `supabase/migrations/20261002110000_uat_db_guard.sql` · test: `supabase/tests/p0_uat_db_guard.test.sql`
> rollback: `supabase/rollback/20261002110000_uat_db_guard_rollback.sql` · 적용 후 확인: `supabase/validation/staging_e2e/sql/uat_db_guard_post_apply_verify.sql`

## 1. Write path audit (적용 전 → 적용 후)

| 경로 | 앱 가드 (UAT-STABILIZATION) | DB 가드 (적용 전) | DB 가드 (이 migration) |
|---|---|---|---|
| 수업 시작 `start_class_session` · 직접 transitions INSERT(start) | ✓ | ✗ (상태 · 담당 · 확인 · entitlement · 섹션만) | ✓ `trg_zz_future_session_guard` (transitions · start) + class_sessions status UPDATE |
| 수업 마치기 `finish_class_session` | ✓ | ✗ | ✓ (transitions · finish) |
| legacy 직접 status UPDATE (M5 전) | — | ✗ | ✓ class_sessions BEFORE UPDATE OF status (scheduled → in_progress/completed) |
| 시작 전 확인 `confirm_session_before` · 직접 INSERT | ✓ (시작 단계) | ✗ | ✓ session_before_confirmations |
| 빠른 메모 `save_quick_memo` · 직접 INSERT/UPDATE | ✓ | ✗ (취소만) | ✓ quick_memos |
| 출결 `save_class_session_attendance_atomic` · 직접 INSERT/UPDATE | ✓ | ✗ (취소만) | ✓ class_session_attendance |
| 관찰 Growth5 `save_class_observation` · 직접 DML | ✓ | 부분 (예정 상태면 OB003 · 미래 진행 중은 통과) | ✓ class_session_observations |
| 관찰 legacy `save_class_session_observation_atomic` · 직접 INSERT | — | ✗ | ✓ class_session_observations |
| Growth5 선택 · legacy 관찰영역 연결 INSERT | — | 부분 / ✗ | ✓ (관찰 → 수업 경유) |
| AI 초안 INSERT | — | ✗ | ✓ class_session_observation_ai_drafts |
| 사진 metadata INSERT | ✓ (prepare) | ✗ | ✓ class_session_observation_media (INSERT 만 · 숨김 · 저장상태 UPDATE 그대로) |
| 사진 Storage 직접 업로드 | ✓ (prepare) | ✗ | ✓ `private.can_upload_observation_media_object` 에 `not is_future_session` (정책 거부 42501) |
| 학부모 공유 신규 발급 `issue_child_portal` · 직접 child_portals INSERT | ✓ (`PARENT_SHARING_RELEASED`) | ✗ (org_has_feature 만) | ✓ `trg_zz_parent_sharing_release_lock` (PT004) |
| 학부모 공유 중지 `revoke_child_portal` · 조회 | 유지 | 유지 | **변경 없음** |
| 취소 `cancel_class_session` · 복구 처리 | 유지 | 유지 | **변경 없음** |

수업 무관 쓰기(주간 리포트 등)는 진행 중 · 완료 수업만 근거로 쓰므로 대상이 아니다.

## 2. 규칙
- **미래 수업** = `scheduled_date > private.local_today()` (기존 helper · `now() at time zone 'Asia/Seoul'` — 앱 `todayInSeoul()` 과 같은 의미). 예정일 NULL · 오늘 · 지난 수업은 기존 규칙 그대로.
- 오류: **SS009** "수업일에 열립니다." (기존 SS001~SS008 과 충돌 없음 · 앱 오류 표시 대상 `SS\d{3}`) · **PT004** "학부모 공유 기능은 현재 준비 중입니다. 공유 동의 및 보안 정책 확정 후 제공됩니다." (PT001~PT003 다음).
- 새 trigger 이름은 `trg_zz_*` — 같은 시점의 기존 trigger(권한 · 상태 · entitlement · 필수 섹션 · 동의 · 경로 · 파일 존재)가 먼저 판정하고 마지막에 미래 여부를 본다 → **기존 오류 코드 불변**.
- 학부모 공유 출시 판정은 기존 `private.capability_released('parent_portal')` (is_released ∧ blocked_by 비어 있음). 출시 = HQ 기능 출시 화면(capability release) — 별도 migration 불필요. CO-12 가 blocked_by 에 남아 있는 동안은 출시할 수 없다.

## 3. 권한 · 인증 영향 — **권한 확대 0**
- RLS 정책 · grant · role · auth 변경 없음. RLS disable · service_role 우회 없음.
- 새 함수 3개는 SECURITY DEFINER · `search_path = ''` · public/anon/authenticated EXECUTE **회수**(trigger 내부 전용). 범위는 "거부"만 — 어떤 쓰기도 새로 허용하지 않는다.
- Storage helper 는 같은 본문 + 조건 한 줄(`and not private.is_future_session(s.id)`) · 기존 grant 그대로(authenticated).
- DROP TABLE · DROP COLUMN · 데이터 변경 없음. STAGING-P8 · 기존 포털 · 동의 기록 그대로.

## 4. 테스트 (local Supabase · 하나의 transaction · rollback)

`p0_uat_db_guard.test.sql` **30/30** — 앱을 거치지 않는 직접 호출:
- DENIED (SS009): confirm RPC · start RPC · 직접 transitions INSERT · legacy 직접 status UPDATE · finish RPC · quick memo RPC · 직접 quick_memos INSERT · 출결 RPC · 직접 출결 INSERT · Growth5 관찰 RPC(미래 진행 중) · 직접 legacy 관찰 INSERT · 직접 사진 metadata INSERT · Storage helper false · 직접 storage.objects INSERT 42501
- DENIED (PT004): issue_child_portal RPC · 직접 child_portals INSERT
- ALLOWED: 기존 링크 revoke · 오늘 confirm/start · 오늘 출결 · 오늘 Storage helper · 지난 수업 출결 정정 · 관찰 · 메모 · 마치기 · 미래 수업 취소
- 기존 규칙: 취소 수업 출결 AT003 · 미배정 교사 출결 불가 · 교사 포털 발급 불가 · 거부 뒤 수업 상태 불변

기존 test 갱신 (새 규칙의 의도된 결과):
- `p0_phase08_security` #43 · `p0_hardening` #101: 미래 수업 legacy 직접 시작 `rows=1` → `SS009` (오늘 · 지난 수업 직접 시작은 기존대로 — 새 test 가 검증)
- `p0_hardening` F 묶음: "출시된 뒤" 발급 · 조회 · 중지 규칙을 검증하므로 fixture 로 parent_portal 출시 상태를 만들고, G 묶음 전에 CO-12 미출시로 되돌린다
- `M5_post_cutover` #31~32: 미래(+8)로 옮긴 예정 수업을 오늘로 다시 옮긴 뒤 시작 경로 확인 (plan 46 → 47)

## 5. Staging 적용 계획 (승인 후 · 운영자 실행)

```text
0. 확인
   git rev-parse HEAD                                  # 이 문서 커밋
   cat supabase/.temp/project-ref                      # itcddooiuqsqingfhxkk 여야 한다 (Production vpppxuhodwauaclhybtg 이면 중단)
   env | grep -E 'SUPABASE_DB_URL|DATABASE_URL|SUPABASE_PROJECT_(ID|REF)'   # 없어야 한다
1. 대기열 확인
   npx supabase@2.113.0 migration list --linked        # remote 마지막 = 20261002100000 · local 에만 20261002110000
2. 적용 (db push · db reset · repair 사용 안 함)
   npx supabase@2.113.0 migration up --linked
3. 확인 (READ ONLY)
   supabase/validation/staging_e2e/sql/uat_db_guard_post_apply_verify.sql
   → trigger 11 · 함수 3(DEFINER · search_path='') · 새 함수 EXECUTE 0 · Storage helper has_guard=t ·
     parent_portal is_released=f / {CO-12} · 데이터 건수 = 적용 전 · 마지막 migration 20261002110000
4. 앱 smoke (읽기 전용) — e2e_roles 4역할 · 쓰기 단계 실행 안 함
```

**되돌리기:** 데이터 변경이 없으므로 trigger · 함수만 되돌린다. `supabase/rollback/20261002110000_uat_db_guard_rollback.sql` 내용을 **새 migration**(예: `20261002120000_uat_db_guard_revert.sql`)으로 만들어 `migration up --linked` — 기록이 앞으로만 쌓인다. local 에서 rollback 실행 → trigger 0 · 함수 0 · Storage helper 원래 본문 확인 완료.

## 6. Production 영향 — 0
Production `vpppxuhodwauaclhybtg` 접근 · 적용 없음. migration 은 repo 에만 있다 (Production 적용은 별도 승인 · 별도 Phase).
