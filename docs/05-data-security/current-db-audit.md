# Current DB Audit (READ-ONLY)

| | |
|---|---|
| 문서 상태 | PHASE 05 승인본 (문서 검토 대기) |
| 감사 기준 | `saas-v2` / `1c7afe9` · `supabase/migrations/` 21개 파일 · `src/lib/supabase/` |
| 감사 방식 | **소스 정적 읽기만.** 운영 DB 접속 · 쿼리 · 데이터 크기 확인은 하지 않았다 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |

> 이 문서는 **현재 소스에 존재하는 것**을 기록한다. 운영 DB에 실제로 적용된 상태 · 데이터 규모는 확인하지 않았으며 **UNKNOWN**이다 (DB-8).

---

## 1. Migration 목록 (21)

| # | 파일 | 요지 |
|---|---|---|
| 1 | `20260812_create_lead_submissions` | 영업 리드 · anon INSERT |
| 2 | `20260813_create_admin_access` | `private.admin_users` · `is_soyes_admin()` |
| 3 | `20260814_create_admin_access_check` | `has_soyes_admin_access()` |
| 4 | `20260815_create_organization_foundation` | profiles · organizations · organization_members · 신규 사용자 트리거 |
| 5 | `20260824_create_class_child_foundation` | classes · class_teachers · children (`class_id` 직접) |
| 6 | `20260825_create_curriculum_foundation` | curriculum_programs · curriculum_lessons · lesson_activities · class_program_assignments |
| 7 | `20260826_create_class_sessions_foundation` | class_sessions · 상태 트리거 |
| 8 | `20260827_staff_session_history_read_access` | 교직원 과거 세션 조회 |
| 9 | `20260828_create_class_session_attendance` | 출결 |
| 10 | `20260829_children_attendance_history_read_access` | 출결 이력 조회 |
| 11 | `20260830_save_attendance_atomic_rpc` | 출결 일괄 저장 RPC |
| 12 | `20260831093000_create_observation_domains` | 구 5영역 카탈로그 (seed 5행) |
| 13 | `20260831094000_create_class_session_observations` | 관찰 · 관찰 × 영역 |
| 14 | `20260831095000_children_observation_history_read_access` | 관찰 이력 조회 |
| 15 | `20260831100000_save_observation_atomic_rpc` | 관찰 저장 RPC |
| 16 | `20260831110000_create_observation_media` | 관찰 사진 metadata · Storage bucket `observation-media` |
| 17 | `20260901090000_create_observation_ai_drafts` | 관찰 AI 초안 |
| 18 | `20260901160000_create_child_growth_reports` | legacy 성장 리포트 · 근거 |
| 19 | `20260901190000_create_growth_report_ai_drafts` | legacy 리포트 AI 초안 |
| 20 | `20260903090000_create_growth_report_parent_shares` | 학부모 공유 링크 (token hash) |
| 21 | `20260904090000_harden_admin_access_execute` | admin 헬퍼 EXECUTE 강화 |

---

## 2. 존재하는 테이블 (23)

`private.admin_users` · `profiles` · `organizations` · `organization_members` · `classes` · `class_teachers` · `children` · `curriculum_programs` · `curriculum_lessons` · `lesson_activities` · `class_program_assignments` · `class_sessions` · `class_session_attendance` · `observation_domains` · `class_session_observations` · `class_session_observation_domains` · `class_session_observation_media` · `class_session_observation_ai_drafts` · `child_growth_reports` · `child_growth_report_sources` · `child_growth_report_ai_drafts` · `child_growth_report_shares` · `lead_submissions`

**존재하지 않는 것**: product · product version · contract · contract class scope · entitlement · capability registry · enrollment 이력 · consent · guardian · quick memo · BEFORE 확인 · Growth 5 카탈로그 · 논리 리포트 / revision · child portal · audit 이벤트 · lesson section.

기타: enum 타입 없음 (CHECK 제약 사용) · **생성된 Supabase TypeScript DB 타입 없음** (`src/types/*.ts`는 수동 작성 타입) · `create policy` 73개 (Storage 포함).

---

## 2-1. RLS 요약

| 항목 | 현재 |
|---|---|
| 정책 대상 역할 | 거의 모두 `authenticated`. anon은 `lead_submissions` INSERT 1개 |
| HQ 판정 | 대부분의 테이블 정책이 `private.is_soyes_admin()` OR 기관 · 반 조건 — **admin · sales 모두 전 기관 통과** |
| 교사 판정 | `is_class_teacher` · `is_assigned_class_teacher` · `is_recordable_session` 등 반 · 세션 기준 |
| 원장 판정 | `has_org_role` · `is_active_org_member` 기준 자기 기관 |
| Entitlement · 서비스 모드 | **판정 없음** |
| DELETE 정책 | `children` · `child_growth_report_ai_drafts`에만 존재. 관찰 · 사진 · 리포트는 DELETE 정책 없음 |
| 사진 metadata | `class_session_observation_media` SELECT 정책만 (INSERT는 RPC/트리거 경로) · UPDATE / DELETE 없음 |
| 컬럼 GRANT | 일부 테이블은 컬럼 단위 UPDATE GRANT (예: `class_sessions`의 `scheduled_date` · `status`) |

## 2-2. 함수 · RPC · 트리거

| 구분 | 현재 |
|---|---|
| `private` 헬퍼 | `is_soyes_admin` · `has_org_role` · `is_org_member` · `is_active_org_member` · `is_class_teacher` · `is_assigned_class_teacher` · `is_active_class` · `is_active_assignment` · `is_published_program` · `is_published_lesson` · `is_recordable_session` · `can_read_*_history` · `can_read_observation_media_object` · `can_upload_observation_media_object` · `owns_org_membership` · `is_director_of_user_org` · `safe_uuid` 등 |
| `enforce_*` 트리거 함수 | 세션 · 출결 · 관찰 · 관찰 영역 · 관찰 AI 초안 · 사진 · 리포트 · 근거 · 리포트 AI 초안 · 공유 · 반 교사 18개 |
| public RPC | `save_class_session_attendance_atomic` · `save_class_session_observation_atomic` · `save_observation_ai_generated_atomic` · `save_observation_ai_review_atomic` · `create_or_refresh_child_growth_report` · `save_child_growth_report_atomic` · `save_child_growth_report_ai_draft` · `apply_child_growth_report_ai_draft` · `create_child_growth_report_share` · `revoke_child_growth_report_share` · `read_shared_growth_report` (anon) · `has_soyes_admin_access` |
| 보안 모드 | 소스 기준 `security definer` 39회 · `security invoker` 15회 선언 (public 쓰기 RPC 10개는 모두 INVOKER — Invariant AI-1 · anon 읽기 RPC `read_shared_growth_report`는 DEFINER) |
| 트리거 | `create trigger` 34개 (updated_at · enforce_* · 신규 사용자 · 근거 revision bump) |

## 2-3. Storage

| 항목 | 현재 |
|---|---|
| Bucket | `observation-media` · **private** |
| 정책 | `storage.objects` **SELECT · INSERT만** (`can_read_observation_media_object` · `can_upload_observation_media_object`) |
| 삭제 | UPDATE · DELETE 정책 없음 · 앱 삭제 경로 없음 |
| anon | Storage 접근 없음 · legacy 공유 RPC는 사진을 반환하지 않음 |
| 서명 | 교직원 화면이 인증 사용자 세션으로 `createSignedUrls()` 발급 (`src/lib/staff/observation-queries.ts`) · anon용 서명 경로 없음 → DB-9 |

## 2-4. 실제 Legacy AI Dependency (migration `20260901160000_create_child_growth_reports`)

| 위치 | 내용 |
|---|---|
| :259-261 | `child_growth_report_sources.ai_draft_id` **NOT NULL** + FK `on delete restrict` → 관찰 AI 초안 |
| :271 | `source_ai_updated_at` NOT NULL (AI 초안 갱신 시각 스냅샷) |
| :287-289 | `reviewed_text_snapshot` NOT NULL (검토된 AI 텍스트 스냅샷) |
| :697-715 | 근거 INSERT 트리거 — accepted AI 초안이 아니면 **GR003** |
| :1088-1116 | 리포트 생성 RPC — accepted AI 초안이 있는 관찰만 근거로 선택 · 없으면 GR003 |

즉 현재 legacy 리포트는 **교사가 수락한 AI 초안 없이는 생성할 수 없다.** 처리 전략은 DEC-091 ([migration-cutover.md §4](./migration-cutover.md)).

---

## 3. 현재 잘 되어 있는 것 (유지)

| 항목 | 내용 |
|---|---|
| Tenant 복합 FK | `(id, organization_id[, class_id])` 복합 FK + `enforce_*` 트리거로 기관 · 반 일치 강제 |
| 헬퍼 위치 | 권한 헬퍼는 `private` schema · SECURITY DEFINER · `auth.uid()` 내부 사용 |
| 원자적 저장 | 출결 · 관찰 · AI 초안 · 리포트 저장이 RPC 트랜잭션 |
| 동시성 | `updated_at` 기반 낙관적 동시성 토큰 사용 |
| 공유 토큰 | `child_growth_report_shares.token_hash` SHA-256 · raw token 미저장 · 30일 만료 · anon은 `read_shared_growth_report` RPC만 |
| Storage | `observation-media` bucket private |
| Service key | `SUPABASE_SECRET_KEY`는 `src/lib/supabase/admin.ts` 한 곳 (Auth Admin 용도)에서만 사용 |
| anon 표면 | `lead_submissions` INSERT · `read_shared_growth_report` 두 가지뿐 |

---

## 4. 격차 · 위험 (심각도순)

| # | 격차 | 근거 (소스) | 목표 | 결정 |
|---|---|---|---|---|
| G-1 | **Sales = Admin.** `private.is_soyes_admin()`이 `role in ('admin', 'sales')`를 동일하게 판정 → Sales가 모든 기관의 관찰 · 인용 · 사진 · 리포트 조회 가능 | migration 2 | 헬퍼 분리 · Sales 테이블 SELECT 없음 | DEC-079 |
| G-2 | **HQ Admin blanket SELECT.** admin이 모든 기관의 민감 교육 콘텐츠를 client-side로 직접 조회 | 각 테이블 admin SELECT 정책 | server/RPC + reason + audit | DEC-093 |
| G-3 | **세션 상태 직접 UPDATE.** admin · director · 배정 교사에게 `UPDATE(scheduled_date, status)` · 트리거가 `scheduled → in_progress / completed / cancelled` 허용 | migration 7 | RPC 전용 · BEFORE 확인 · scheduled→completed 금지 · Recovery 분리 | DEC-085 |
| G-4 | **Entitlement 없음.** 기능 · 반 범위 · 서비스 모드 판정 없이 멤버십만으로 쓰기 가능 | 전체 | class-aware entitlement · write gate | DEC-083 |
| G-5 | **Director가 관찰 AI 초안 조회 가능** | migration 17 | Director 접근 제거 | DEC-093 · rls-security §5 |
| G-6 | **Media 삭제 경로 없음.** Storage 정책은 SELECT · INSERT만 · metadata 숨김 · 동의 개념 없음 | migration 16 | hide + 서버 orchestration 삭제 · 동의 기반 표시 | DEC-088 |
| G-7 | **Legacy 리포트의 AI 필수 의존.** `ai_draft_id` NOT NULL + FK restrict (0901160 :259-261) · `source_ai_updated_at` (:271) · `reviewed_text_snapshot` (:287-289) · GR003 트리거 (:697-715) · RPC (:1088-1116) | migration 18 | 신규 2.0 경로는 무의존 · legacy는 동결 후 read-only | DEC-091 |
| G-8 | **리포트 revision · 불변성 없음.** 리포트 행을 갱신(refresh)하는 구조 · Weekly/Monthly 식별자 없음 | migration 18 | 논리 리포트 + revision | DEC-089 |
| G-9 | **공유가 리포트 삭제에 cascade** · 아동 단위 Portal 없음 | migration 20 | child_portals 신규 · legacy share 유지 | DEC-092 |
| G-10 | **Audit 없음.** 행위자 컬럼 일부만 존재 | 전체 | hybrid audit | DEC-093 |
| G-11 | **원아 반 이동 이력 없음** (`children.class_id` 직접 nullable) | migration 5 | P0 유지 · 반 이동 RPC + audit · 이력은 DB-1 | DEC-080 |
| G-12 | **보안 회귀테스트 없음** | 저장소 | pgTAP 기준선 (M0) | DEC-094 |

---

## 5. 데이터 · 운영 현황 (UNKNOWN)

| 항목 | 상태 |
|---|---|
| 운영 기관 수 · 반 수 · 아동 수 | UNKNOWN |
| 관찰 · 사진 · 리포트 행 수 · Storage 용량 | UNKNOWN |
| 운영 중인 legacy 공유 링크 수 | UNKNOWN |
| 각 기관의 실제 계약 조건 (Contract mapping 원천) | UNKNOWN — M2에서 **사람이 검증** |
| Seed | `observation_domains` 5행 · profiles backfill |

이 값은 M0 전에 운영자가 **읽기 전용 확인**으로 채운다 (DB-7 · DB-8).
