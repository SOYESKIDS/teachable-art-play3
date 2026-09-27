# RLS · Security Architecture

| | |
|---|---|
| 문서 상태 | PHASE 05 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-079 · DEC-080 · DEC-083 · DEC-085 · DEC-087 · DEC-088 · DEC-092 · DEC-093 · Invariant AI-1 ~ AI-3 |

> RLS **구현이 아니다.** 역할별 접근 경계 · 헬퍼 규칙 · 우선순위 · 음성 테스트 목록을 정한다. 정책 SQL은 PHASE 07.

---

## 1. 역할 모델

| 범위 | 역할 | 저장 | 비고 |
|---|---|---|---|
| 전역 HQ | **HQ Admin** | `private.admin_users` | 운영 메타 관리 · 민감 교육 콘텐츠는 audited support access만 |
| 전역 HQ | **HQ Sales** | `private.admin_users` | 기관 · 계약 · 집계만 · **기관 · 아동 테이블 SELECT 없음** |
| 전역 HQ | (향후) Content | `private.admin_users` | 커리큘럼 발행 · 범위는 PHASE 07 |
| 기관 | Director | `organization_members` | 자기 기관 |
| 기관 | Teacher | `organization_members` + `class_teachers` | **배정된 반만** |
| 외부 | Parent (anon) | 없음 (DEC-016) | `read_child_portal` RPC · legacy share RPC만 |

---

## 1-1. Tenant Integrity · Composite FK

- 모든 기관 범위 행은 `organization_id`를 가진다 (반 범위 행은 `class_id`도).
- 부모 참조는 `(id, organization_id[, class_id])` **복합 FK** — 다른 기관의 부모를 가리키는 행은 제약으로 불가 (Invariant AI-3 · DI-1).
- `enforce_*` BEFORE 트리거가 최종 판정자 (Invariant AI-4) — 상태 전환 · 소유 관계 · 불변 컬럼을 검사한다.
- 신규 테이블(contract_classes · observation_growth_selections · quick_memos · reports · report_revisions · child_portals · audit_events 등)도 같은 패턴을 따른다.
- RLS는 **이 무결성 위에** 역할별 가시성을 더한다. RLS만으로 tenant 무결성을 보장하지 않는다.

---

## 2. 헬퍼 규칙 (DEC-079 · DEC-083)

| 분류 | 헬퍼 (PROPOSED) | 용도 |
|---|---|---|
| 신원 | `is_hq_admin()` · `is_hq_sales()` | 현재 `is_soyes_admin()` 분리 |
| 신원 | `has_org_role(org, role)` | 기관 역할 |
| 신원 | `is_class_teacher(class)` · `is_assigned_class_teacher(class)` | 반 배정 |
| 상태 | `org_service_mode(org)` | 정상 · 읽기 전용 · 차단 |
| 상태 | `class_in_effective_contract_scope(class)` | 반이 현재 계약 범위인가 |
| 권한 | `org_has_feature(org, feature)` | 기관 단위 기능 |
| 권한 | `class_has_feature(class, feature)` / effective class entitlement | 반 단위 기능 |

**공통 규칙**

- `user_id`를 인자로 받지 않는다 — 내부에서 `auth.uid()`.
- SECURITY DEFINER는 `search_path` 고정 · `private` schema · EXECUTE는 필요한 역할에만.
- client가 보낸 `organization_id`를 권한 근거로 신뢰하지 않는다 (행의 부모 참조로 도출).
- service credential은 Auth Admin 용도(Invariant AI-1)만. **일반 HQ Admin 권한 대용으로 쓰지 않는다.**

---

## 3. 역할별 접근 매트릭스 (목표)

범례: ✅ 허용 · 🔒 RPC/서버 경유 + 사유 + audit · 📊 집계만 · ❌ 없음 · (R) 읽기 전용 모드에서는 읽기만

| 데이터 | Teacher (배정 반) | Director (자기 기관) | HQ Admin | HQ Sales | Parent (anon) |
|---|---|---|---|---|---|
| 기관 · 반 · 멤버십 메타 | 읽기 | ✅ | ✅ | 📊 | ❌ |
| 아동 운영 메타 (이름 · 반) | ✅ | ✅ | ✅ | ❌ | Portal 최소 표시 |
| Product · Version · Contract | ❌ | 자기 기관 요약 | ✅ (published 불변) | ✅ (계약 · 집계) | ❌ |
| 세션 조회 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 세션 start / finish | ✅ RPC | ❌ | ❌ | ❌ | ❌ |
| 세션 Recovery (in_progress→completed) | ❌ | 🔒 | 🔒 | ❌ | ❌ |
| 세션 cancel | 현재 규칙 유지 | 현재 규칙 유지 | 현재 규칙 유지 | ❌ | ❌ |
| 출결 | ✅ (R) | 읽기 | 읽기 | ❌ | ❌ |
| 관찰 본문 · 인용 · Growth 5 | ✅ (R) | 읽기 | 🔒 | ❌ | 리포트 스냅샷만 |
| Quick Memo | **작성자 본인만** | ❌ | ❌ | ❌ | ❌ |
| 사진 | ✅ 업로드 · 숨김 요청 | 읽기 · 숨김 | 🔒 | ❌ | 동의 · 공개 조건 충족 시 (DB-9 · CO-9 · CO-10 전 Production 공개 없음) |
| 동의 상태 | 읽기 | ✅ 기록 | 상태 확인만 (DEC-059 · 동의서 내용 없음) | ❌ | ❌ |
| 관찰 AI 초안 (C1) | ✅ 본인 반 | **❌** | 🔒 | ❌ | ❌ |
| 리포트 draft · revision | ✅ | 읽기 · 숨김 | 🔒 | ❌ | ❌ |
| 리포트 숨김 / 해제 | ❌ | ✅ (해제 사유 필수) | 🔒 | ❌ | ❌ |
| 공개 리포트 | — | — | — | ❌ | ✅ RPC (latest completed ∧ not hidden ∧ Portal 활성) |
| Portal 발급 · 폐기 | 정책은 PHASE 07 | ✅ | 🔒 | ❌ | ❌ |
| Director 대시보드 집계 | ❌ | ✅ `org_has_feature` | ✅ | 📊 | ❌ |
| audit_events | ❌ | ❌ (제한 RPC만 향후) | ✅ 조회 | ❌ | ❌ |
| 초과 인원 | ❌ | 자기 기관 수 | ✅ | 📊 (아동 식별 없음) | ❌ |

쓰기는 모두 `org_service_mode` · `class_has_feature` gate를 통과해야 한다 (반 단위 작업은 class-aware).

---

## 4. HQ Admin Sensitive Support Access (DB-2 해소)

- P0부터 HQ Admin에게 민감 교육 콘텐츠(교사 관찰 텍스트 · 인용 · Growth 5 상세 · 사진 · 리포트 본문 · AI draft)의 **blanket client-side SELECT 정책을 두지 않는다.**
- 지원 접근 = **server/RPC + authorized HQ Admin + reason/context + audit_events 기록.** 정확한 support UI는 PHASE 07.
- 기존 Admin UI가 해당 테이블을 직접 읽는지 **Cutover 계획에서 호환성을 확인**한다 ([migration-cutover.md](./migration-cutover.md) §5).

---

## 5. RLS 변경 우선순위

| 순위 | 변경 | 현재 격차 |
|---|---|---|
| 1 | **Sales ≠ Admin** (헬퍼 분리 · Sales 테이블 SELECT 제거) | G-1 |
| 2 | **HQ Admin 민감 데이터 blanket SELECT 축소** | G-2 |
| 3 | **세션 status 직접 UPDATE 제거** (RPC 전용) | G-3 |
| 4 | **Teacher class-scope entitlement + tenant** write gate | G-4 |
| 5 | **Director의 관찰 AI 초안 접근 제거** | G-5 |
| 6 | **Media 숨김 · 표시 차단** (hidden · 동의 미충족 제외 · signed URL 미발급) | G-6 |
| 7 | **Parent Portal 격리 RPC** (anon은 RPC only) | G-9 |
| 8 | **보안 회귀테스트** (M0 기준선 → 각 단계 확장) | G-12 |

적용 시점은 [migration-cutover.md](./migration-cutover.md)의 M-단계를 따른다 (예: 3은 M5에서 앱 Cutover와 동시).

---

## 5-1. Storage

| 항목 | 규칙 |
|---|---|
| Bucket | private 유지 · public bucket 없음 |
| 업로드 | 배정 Teacher · class entitlement · service mode 통과 · path는 서버 규칙(기관/반/세션/아동) |
| 교직원 조회 | metadata 행이 hidden/deleted가 아니고 RLS 통과 시에만 서명 |
| 삭제 | client DELETE 정책 대신 서버 orchestration (DEC-088) |
| Sales | Storage 접근 없음 |
| HQ Admin | support RPC 경유 (DEC-093) |
| Parent | DB-9 결정 전 Production 서명 없음 |

---

## 6. Parent Portal · Media 경계

- `read_child_portal(public_id, token)`: anon 전용 DEFINER RPC · token hash 비교 · 실패 사유 무구분 · 최소 DTO.
- raw token은 DB · 로그에 남기지 않는다.
- **사진 전달**: private bucket + 짧은 TTL signed URL 방향만 승인. **서명 주체 · credential은 DB-9 OPEN.** 다음은 이미 확정된 금지 규칙이다.
  - Portal token 검증 **전에** signed URL을 만들지 않는다.
  - client가 임의 Storage path를 지정할 수 없다 (서버가 리포트 media reference에서 path 결정).
  - service/secret credential을 일반 HQ Admin 권한으로 쓰지 않는다.
  - 숨김 · 삭제 · 동의 미충족 media에는 서명하지 않는다.
- **Production Parent 사진 공개는 DB-9 · CO-9 · CO-10 해결 전 불가.**

---

## 7. 음성 테스트 매트릭스 (M0 → 단계별 확장 · pgTAP)

| # | 시나리오 | 기대 |
|---|---|---|
| N-1 | A 기관 Director가 B 기관 아동 · 관찰 조회 | 0행 |
| N-2 | Teacher가 배정되지 않은 같은 기관 반의 관찰 쓰기 | 거부 |
| N-3 | HQ Sales가 children · observations · media · reports SELECT | 0행 |
| N-4 | HQ Admin이 관찰 본문 직접 SELECT (support RPC 미경유) | 0행 |
| N-5 | client가 `class_sessions.status` 직접 UPDATE | 거부 |
| N-6 | BEFORE 확인 없이 `start_session` | 거부 |
| N-7 | `scheduled → completed` 전환 시도 (어떤 역할이든) | 거부 |
| N-8 | Director가 사유 없이 Recovery | 거부 |
| N-9 | Director · HQ가 일반 `finish_session` | 거부 |
| N-10 | 계약 범위 밖 반에서 세션 · 관찰 쓰기 (같은 기관 다른 반은 계약 범위) | 거부 |
| N-11 | 읽기 전용 · 차단 모드에서 쓰기 | 거부 |
| N-12 | 다른 교사의 Quick Memo 조회 (같은 반 포함) · Director 조회 | 0행 |
| N-13 | Director가 관찰 AI 초안 SELECT | 0행 |
| N-14 | 완료 revision UPDATE · DELETE | 거부 |
| N-15 | 리포트당 두 번째 draft revision 생성 | 거부 |
| N-16 | `latest_completed_revision_id`가 draft 또는 다른 리포트 revision을 가리킴 | 거부 |
| N-17 | anon이 기관 테이블 직접 SELECT | 0행 |
| N-18 | 잘못된 · 폐기된 token으로 `read_child_portal` | 동일 실패 응답 |
| N-19 | 숨김 리포트가 Portal에 반환 | 반환 안 됨 |
| N-20 | 숨김 · 삭제 media에 signed URL 요청 | 발급 안 됨 |
| N-21 | 동의 `unknown` · `declined` 아동 사진의 Portal 표시 | 표시 안 됨 |
| N-22 | 반당 원아 16명 이상인 Pilot 계약 활성화 · 같은 기관에 두 계약 동시 effective (Pilot 포함) | 거부 |
| N-23 | draft Product Version을 참조하는 Contract · published version 수정 | 거부 |
| N-24 | audit_events UPDATE · DELETE · Director SELECT | 거부 / 0행 |
| N-25 | Cutover 후 legacy report write RPC 호출 | 거부 |
| N-26 | SECURITY DEFINER 함수가 client 제공 user_id · org_id로 권한 판정 | 해당 인자 없음 (정적 검사) |
