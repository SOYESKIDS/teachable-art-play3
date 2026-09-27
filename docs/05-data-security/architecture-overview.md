# Data / Security — Architecture Overview

| | |
|---|---|
| 문서 상태 | PHASE 05 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `1c7afe9` |
| 대상 독자 | DB Architect · 보안 검토자 · 개발자 · PM |
| 선행 문서 | [../00-project/decision-log.md](../00-project/decision-log.md) · [../00-project/project-charter.md](../00-project/project-charter.md) · [../02-ia/permission-matrix.md](../02-ia/permission-matrix.md) · [../03-commerce/entitlement-policy.md](../03-commerce/entitlement-policy.md) · [../04-ai-report/architecture-overview.md](../04-ai-report/architecture-overview.md) |
| PHASE 05 문서 | **architecture-overview.md** · [current-db-audit.md](./current-db-audit.md) · [target-data-model.md](./target-data-model.md) · [rls-security-architecture.md](./rls-security-architecture.md) · [transaction-rpc-architecture.md](./transaction-rpc-architecture.md) · [migration-cutover.md](./migration-cutover.md) · [open-items.md](./open-items.md) |
| 관련 결정 | DEC-079 ~ DEC-096 (및 DEC-021 · DEC-035 · DEC-041 · DEC-046 · DEC-047 · DEC-048 ~ DEC-051 · DEC-058 · DEC-059 · DEC-063 · DEC-071 · DEC-073 · DEC-074 · DEC-078) |

> 이 PHASE는 **데이터 구조 · 보안 경계 · 트랜잭션 경계 · 이전 순서(개념)**를 정한다. **SQL · migration 파일 · RLS 구현 · 코드 변경은 하지 않는다** (PHASE 07).
>
> 문서에 나오는 테이블 · 컬럼 · 함수 이름은 **PROPOSED 개념 이름**이다. 정확한 이름 · 타입 · FK 방식 · 제약 표현은 PHASE 07에서 확정한다.

---

## 1. Executive Summary

| 주제 | 확정 내용 | 결정 |
|---|---|---|
| 역할 · Sales | 전역 HQ 역할 + 기관 멤버십 역할 · **HQ Admin ≠ HQ Sales** · Sales는 기관 · 아동 테이블 SELECT 없음 (집계 RPC만) | DEC-079 |
| Tenant 격리 | `organization_id` 비정규화 + 복합 FK + `enforce_*` 트리거 (현재 패턴 유지) · client org_id 불신 | DEC-079 |
| 교사 · 원아 반 | 교사 권한 = 배정된 반 · 원아는 `children.class_id` 직접 연결 유지 · 반 이동 RPC + audit | DEC-080 |
| Product Version | draft · published(**immutable**) · retired · Contract는 published만 참조 | DEC-081 |
| Contract | `contract_classes` junction · **ONE EFFECTIVE CONTRACT AT A TIME (Pilot 포함)** · 활성화 RPC · exclusion constraint는 후보 | DEC-082 |
| Entitlement | **runtime derive · 저장 안 함** · `org_has_feature` (기관) + `class_has_feature` (반) — 다른 반의 계약으로 현재 반이 열리지 않음 | DEC-083 |
| Program Assignment | `class_program_assignments.id` = stable identity · `origin_contract_id` = provenance · 현재 권한은 effective contract 기준 | DEC-084 |
| 세션 | 정상: Teacher만 start · finish · **scheduled→completed 금지** · Recovery: Director · HQ Admin `in_progress→completed` + reason + audit (P0) | DEC-085 |
| 관찰 · Growth 5 | 기존 관찰 테이블 확장 · 지표 카탈로그 + 선택 행 · **행 없음 = 기록 없음** · stage NOT NULL · 코드 `together` · `after_modeling` · `independent` | DEC-086 |
| Quick Memo | **작성 교사 본인만** (Director · HQ · Parent · AI 접근 없음) | DEC-087 |
| Media · Consent | metadata hide ≠ Storage 물리 삭제 (서버 orchestration · 재시도) · 동의 철회 = 표시 불가 · **`consented` ≠ 법적 공개 허가** | DEC-088 |
| 리포트 | 논리 리포트 + revision · `latest_completed_revision_id` · working revision은 draft 부분 unique로 파생 · 완료 revision 불변 | DEC-089 |
| 스냅샷 | 근거 = 정규화 행 · 본문 = JSONB + template version · 사진 = reference 행 | DEC-090 |
| AI · Legacy | AI attempt 저장(원 payload 없음) · **신규 2.0 경로는 AI 무의존** · legacy는 Cutover까지 제약 유지 → read-only | DEC-091 |
| Child Portal | public id + token hash · anon은 RPC only · legacy share와 분리 · **사진 서명 주체는 DB-9 OPEN** | DEC-092 |
| Audit · HQ | domain 컬럼 + append-only `audit_events` · 민감 본문 미저장 · **HQ Admin 민감 교육 데이터 blanket SELECT 없음** (server/RPC + reason + audit) | DEC-093 |
| Migration | M0 ~ M6 · additive first · 가짜 Contract · 가짜 backfill 금지 · pgTAP | DEC-094 |
| 초과 인원 | 현재 초과 = 계산값 · 경계 변화만 이벤트 · 청구 원장 없음 | DEC-095 |
| 커리큘럼 | lesson × section 최소 구조 · Required Content Set · published silent edit 금지 | DEC-096 |

---

## 1-1. Current → Target

| 영역 | CURRENT (`1c7afe9`) | TARGET |
|---|---|---|
| HQ 역할 | `is_soyes_admin()` = admin ∪ sales | `is_hq_admin` · `is_hq_sales` 분리 · Sales 테이블 SELECT 없음 |
| HQ 민감 데이터 | admin 전 기관 client-side 조회 | 운영 메타만 직접 · 민감 본문은 support RPC + 사유 + audit |
| 상품 · 계약 | 없음 | Product · Version(불변) · Contract · class scope · capability registry |
| 권한 판정 | 멤버십 · 반 배정만 | + service mode · class-aware entitlement |
| 세션 상태 | client 직접 UPDATE · `scheduled → completed` 허용 | RPC 전용 · BEFORE 확인 · Recovery 분리 |
| 관찰 분류 | 구 5영역 태그 | Growth 5 카탈로그 + 선택 행 (stage) · 구 영역 legacy |
| Quick Memo | 없음 | author only |
| 사진 | SELECT · INSERT만 · 삭제 없음 · 동의 없음 | hide + Storage 삭제 orchestration · 운영 동의 상태 |
| 리포트 | legacy 단일 행 갱신 · accepted AI 필수 | 논리 리포트 + revision + 스냅샷 · AI 무의존 |
| 학부모 | 리포트 단위 공유 링크 (30일) | 아동 단위 Child Portal + legacy share 병존 |
| Audit | 행위자 컬럼 일부 | domain 컬럼 + append-only `audit_events` |
| 테스트 | 없음 | pgTAP 보안 회귀 |

## 1-2. P0 / P1 / P2

| 구분 | 범위 |
|---|---|
| **P0** | Sales/Admin 분리 · HQ 민감 접근 축소 · Product/Version/Contract/class scope · class-aware entitlement · 세션 RPC(start · finish · recovery) + BEFORE 확인 · Quick Memo · Growth 5 저장 · media hide/orchestration · consent 운영 상태 · Report 2.0 (Weekly) + 스냅샷 · Child Portal (사진 공개는 DB-9 · CO-9 · CO-10 이후) · audit_events · overage 계산/이벤트 · lesson section · pgTAP · legacy 동결 |
| **P1** | Monthly · `ai_generation_attempts` / sources 이전 (C2) · 제한된 Director audit 조회 |
| **P2** | Semester · C3 · Enrollment 이력 (DB-1) · 단체 사진 모델 (DB-5 · CO-9 의존) |

## 2. 설계 원칙

1. **DB가 최종 방어선이다.** UI · 서버 검사는 보조이며 권한 · 불변식은 RLS · 제약 · 트리거 · RPC에서 강제한다 (Invariant AI-2 · AI-3).
2. **저장하지 않고 계산할 수 있으면 계산한다.** Entitlement · 계약 날짜 상태 · 현재 초과 인원 · 리포트 visibility · working revision은 저장값이 아니라 파생값이다.
3. **불변이어야 하는 것은 불변으로 만든다.** published Product Version · 완료 revision · 스냅샷 · audit 이벤트.
4. **다중 테이블 불변식과 보안 민감 전환만 RPC.** 나머지는 RLS가 걸린 단순 CRUD (DEC-094). 쓰기 RPC는 `SECURITY INVOKER` (Invariant AI-1 유지).
5. **민감 본문은 이동 · 복제 · 로그를 최소화한다.** Audit · 로그 · AI 저장에 원문을 남기지 않는다 (DEC-078 · DEC-093).
6. **Additive first · forward-fix.** 적용된 migration 수정 금지 · 초기 destructive 단계 금지 · 가짜 backfill 금지 (DEC-094).
7. **운영 상태 ≠ 법적 결론.** 동의 상태 · 보존 · 삭제 시점은 운영 구조만 정하고 법적 판단은 CO-2 · CO-9 · CO-10으로 남긴다.

---

## 3. Domain Boundaries (계층 구조)

```text
[Identity]      auth.users ── profiles
                  ├─ private.admin_users (HQ: admin · sales · 향후 content)
                  └─ organization_members (director · teacher)
[Tenant]        organizations ── classes ── class_teachers
                                    └─ children (class_id 직접)
[Commerce]      products ── product_versions (draft/published/retired)
                  └─ product_version_features
                contracts ── contract_classes      (ONE EFFECTIVE AT A TIME)
                platform_capabilities (release registry · audit)
[Entitlement]   (저장 없음) org_has_feature · class_has_feature · org_service_mode
[Curriculum]    programs ── lessons ── lesson_sections
[Operation]     class_program_assignments (origin_contract_id)
                  └─ class_sessions ── session_before_confirmations
                        ├─ attendance
                        ├─ observations ── observation_growth_selections ── growth_metrics
                        ├─ observation_media (session × child)
                        └─ quick_memos (author only)
                child_media_consents
[Report 2.0]    reports ── report_revisions ── report_revision_evidence
                                          └─ report_revision_media
[AI]            ai_generation_attempts ── ai_generation_sources   (P0 C1은 기존 테이블)
[Parent]        child_portals (token hash · anon RPC)
[Audit]         audit_events (append-only) · commercial overage events
[Legacy 1.0]    child_growth_reports · sources · legacy AI drafts · parent_shares (Cutover 후 read-only)
```

상세 ERD는 [target-data-model.md](./target-data-model.md).

---

## 4. DBA → Decision 대응표

| DBA | 주제 | 결과 | Decision |
|---|---|---|---|
| DBA-1 | Membership / Role | 승인 | DEC-079 |
| DBA-2 | Tenant denormalization | 승인 | DEC-079 |
| DBA-3 | Teacher Class Assignment | 승인 | DEC-080 |
| DBA-4 | Child Enrollment | 승인 (이력은 DB-1) | DEC-080 |
| DBA-5 | Product / Version | 수정 승인 (draft/published/retired · locked_at 중복 없음) | DEC-081 |
| DBA-6 | Entitlement Derivation | 수정 승인 (class-aware) | DEC-083 |
| DBA-7 | Contract / Class Scope | 승인 (exclusion constraint는 후보) | DEC-082 |
| DBA-8 | Program Assignment Identity | 수정 승인 (origin_contract_id) | DEC-084 |
| DBA-9 | Session State Transaction | 수정 승인 (정상 vs Recovery) | DEC-085 |
| DBA-10 | Quick Memo | 수정 승인 (author only) | DEC-087 |
| DBA-11 | Observation 2.0 | 승인 | DEC-086 |
| DBA-12 | Growth5 Catalog | 승인 | DEC-086 |
| DBA-13 | Stage Absent Semantics (IA-3) | 수정 승인 (`together`) | DEC-086 |
| DBA-14 | Media / Observation | 수정 승인 (DB ↔ Storage 분리) | DEC-088 |
| DBA-15 | Consent Operational | 수정 승인 (≠ 법적 충분성) | DEC-088 |
| DBA-16 | Logical Report + Revision | 승인 | DEC-089 |
| DBA-17 | Working vs Latest | 수정 승인 (`latest_completed_revision_id`) | DEC-089 |
| DBA-18 | Report Snapshot | 승인 | DEC-090 |
| DBA-19 | AI Attempt Storage | 승인 | DEC-091 |
| DBA-20 | AI Source Refs | 승인 | DEC-091 |
| DBA-21 | Portal Token | 승인 | DEC-092 |
| DBA-22 | Audit | 수정 승인 (hybrid · Director 직접 조회 없음) | DEC-093 |
| DBA-23 | RLS Helper | 수정 승인 (신원 / 상태 헬퍼 분리) | DEC-079 · DEC-083 |
| DBA-24 | RPC / Transaction | 수정 승인 (Recovery · Storage orchestration · HQ audited access 구분) | DEC-094 |
| DBA-25 | Legacy Observation | 승인 | DEC-094 |
| DBA-26 | Legacy Report | 승인 | DEC-094 |
| DBA-27 | AI Dependency Removal | 수정 승인 (신규 경로 무의존 · legacy 동결) | DEC-091 |
| DBA-28 | Migration Cutover | 승인 | DEC-094 |
| DBA-29 | Regression Test Tool (AD-4) | 승인 (pgTAP) | DEC-094 |
| **DBA-30** | Portal Media Delivery (AD-1) | **CONDITIONALLY OPEN** — private bucket + 짧은 signed URL만 승인 · 서명 주체 미결정 | **없음 → DB-9** |
| DBA-31 | Curriculum Section + Required Content (AH-4) | 승인 | DEC-096 |
| DBA-32 | Regular Child Overage Tracking | 신규 승인 | DEC-095 |

---

## 5. DB Invariant 후보 (PHASE 07 구현 대상)

| ID | 불변식 | 근거 |
|---|---|---|
| DI-1 | 기관 범위 행의 모든 부모 참조는 같은 organization_id (복합 FK) | DEC-079 |
| DI-2 | Weekly · Monthly · Semester 논리 리포트는 식별자당 1개 | DEC-089 |
| DI-3 | 관찰 × 지표 1개 · stage NOT NULL · 코드는 고정 집합 | DEC-086 |
| DI-4 | 완료된 revision · 근거 · 사진 참조는 불변 · 삭제 불가 | DEC-089 · DEC-090 |
| DI-5 | 리포트당 draft revision은 최대 1개 | DEC-089 |
| DI-6 | `latest_completed_revision_id`는 **같은 리포트의 complete revision**만 가리킴 | DEC-089 |
| DI-7 | 숨김 리포트는 Portal 조회에서 반환되지 않음 | DEC-074 · DEC-092 |
| DI-8 | 신규 리포트 · 근거에 AI 필수 참조 없음 | DEC-091 |
| DI-9 | 인용 스냅샷 = 관찰 child_voice 원문 복사 | DEC-090 |
| DI-10 | 계약 반 범위의 반은 계약과 같은 기관 | DEC-082 |
| DI-11 | 같은 기관에 동시에 effective한 계약은 1개 (Pilot 포함) | DEC-082 |
| DI-12 | 계약이 참조하는 Product Version은 published · 이후 불변 | DEC-081 |
| DI-13 | 세션 in_progress 전환은 BEFORE 확인 행 필수 · scheduled→completed 금지 · Recovery는 in_progress→completed만 | DEC-085 |
| DI-14 | growth5 관찰에는 구 영역 링크 없음 · legacy 관찰에는 지표 선택 없음 | DEC-086 |
| DI-15 | AI 시도에 원 payload 컬럼 없음 · 대상은 정확히 하나 | DEC-091 |
| DI-16 | Quick Memo는 작성자만 조회 · 수정 · 삭제 | DEC-087 |
| DI-17 | 삭제 · 숨김 처리된 media에는 신규 signed URL을 발급하지 않음 | DEC-088 |
| DI-18 | audit_events는 append-only (UPDATE · DELETE 없음) | DEC-093 |

---

## 6. 이 PHASE에서 결정하지 않은 것

| 항목 | 위치 |
|---|---|
| Portal 사진 signed URL **발급 주체 · credential** (AI-1 예외 여부) | **DB-9** (Production Parent 사진 공개 전 필수) |
| Enrollment 이력 테이블 | DB-1 (P2) |
| 단체 사진 모델 | DB-5 (CO-9) |
| Legacy 교직원 조회 유지 기간 · 물리 삭제 시점 | DB-6 (CO-2) |
| 운영 DB 크기 · lock 시간 | DB-8 |
| 업그레이드 시 Assignment 연속성 | CO-7 |
| Portal 만료 · 재발급 | CO-12 |
| 정확한 SQL · FK · 제약 표현 · 함수 시그니처 | PHASE 07 |

**Architecture Invariant AI-1(service credential 사용 범위)은 이번 PHASE에서 수정하지 않는다** (DB-9 OPEN).

---

## 7. 문서 지도

| 문서 | 내용 |
|---|---|
| [current-db-audit.md](./current-db-audit.md) | 현재 21개 migration 기준 스키마 · RLS · 격차 감사 |
| [target-data-model.md](./target-data-model.md) | 목표 데이터 모델 · Mermaid ERD · 테이블별 개념 |
| [rls-security-architecture.md](./rls-security-architecture.md) | 헬퍼 · 역할별 접근 매트릭스 · RLS 우선순위 · 음성 테스트 |
| [transaction-rpc-architecture.md](./transaction-rpc-architecture.md) | RPC 목록 · 트랜잭션 경계 · 동시성 · Storage orchestration |
| [migration-cutover.md](./migration-cutover.md) | M0 ~ M6 · backfill 규칙 · Contract mapping gate · Cutover |
| [open-items.md](./open-items.md) | DB-1 ~ DB-9 · Production Blocker · PHASE 06 / 07 입력 |
