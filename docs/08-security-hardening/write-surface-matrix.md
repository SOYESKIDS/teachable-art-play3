# PHASE 08 — Write Surface Matrix (authenticated · anon)

기준: 일반 migration 37개 적용(… `20261002095000`) = **PRE-CUTOVER**. anon 은 표 쓰기 grant 가 없다
(읽기 함수 `read_shared_growth_report` · `read_child_portal` 만).

## 0. PRE-COMMIT Issue 1 — 계약 lifecycle 별 쓰기 판정

원칙: **legacy 앱과 함께 쓰는 운영 쓰기 경로의 entitlement enforcement 는 G-1 에서만 켜진다.**
Step H 에서 계약을 만들거나 활성화해도 G-1 전까지 legacy 동작은 바뀌지 않는다.
SaaS 2.0 전용 경로(legacy 앱이 쓰지 않는 RPC · 형식)와 동의 판정은 처음부터 DB 가 판정한다.

| Write surface | 경로 | Before contract | Draft contract | Active contract before G-1 | After G-1 | After M5 |
|---|---|---|---|---|---|---|
| 출결 (RPC · 직접) | legacy · V2 공유 | legacy 그대로 | legacy 그대로 | **legacy 그대로** | 반 쓰기 필요 (EN003) | 그대로 (G-1 gate) |
| legacy 형식 관찰 (RPC · 직접) | legacy | legacy 그대로 | legacy 그대로 | **legacy 그대로** | 반 쓰기 필요 (EN003) | RPC 회수 · 작성/수정 OB008 |
| legacy 관찰영역 연결 | legacy | legacy 그대로 | legacy 그대로 | **legacy 그대로** | 반 쓰기 필요 (EN003) | 회수 |
| legacy 수업 직접 시작 · 예정→완료 | legacy | legacy 그대로 | legacy 그대로 | **legacy 그대로** | 반 쓰기 필요 (EN003) | 회수 (42501) |
| 사진 업로드 (Storage · metadata) | legacy · V2 공유 | 동의 declined 만 거부 | 같음 | **같음 (동의 declined 만)** | + 재원 원아 (MD005) · 반 쓰기 (EN003) | 그대로 |
| Growth5 관찰 (RPC · 직접) | V2 전용 | 반 쓰기 없음 → 거부 | 거부 | 반 쓰기 ∧ 진행/종료 수업 | 같음 | 같음 |
| Growth5 선택 INSERT · DELETE | V2 전용 | 거부 | 거부 | 반 쓰기 ∧ 진행/종료 수업 | 같음 | 같음 |
| Weekly 사진 선택 | V2 전용 | (리포트 불가) | (불가) | weekly 쓰기 ∧ consented ∧ stored | 같음 | 같음 |
| 빠른 메모 INSERT · UPDATE | V2 전용 | 거부 (QM004) | 거부 | 반 쓰기 | 같음 | 같음 |
| 사진 저장소 'deleted' 표시 | V2 전용 | Storage 객체 없을 때만 | 같음 | 같음 | 같음 | 같음 |
| 동의 운영 상태 기록 | V2 원장 화면 | 원장 | 원장 | 원장 | 원장 | 원장 |
| V2 수업 전환 RPC (start 등) | V2 전용 | 계약 필요 (SS005) | 거부 | 반 쓰기 ∧ 주차 ∧ **필수 섹션 (SS008)** | 같음 | 같음 |
| 프로그램 배정 INSERT | legacy · V2 | legacy 그대로 | legacy 그대로 | legacy 그대로 | 유효 · 시작 전 · 초안 계약 범위 (EN001 · D4) | 같음 |
| 수업 일정 INSERT | legacy · V2 | legacy 그대로 | legacy 그대로 | legacy 그대로 | 유효 범위 ∧ 주차 · before_start 준비 (EN002) | 같음 |
| legacy 성장 리포트 · 공유 발급 · legacy AI 초안 | legacy | legacy 그대로 | 그대로 | 그대로 | 그대로 (AI 저장은 G-2 에서 gate) | 회수 |
| legacy 공유 읽기 (anon) | legacy | 숨김 · 퇴소 원아 닫힘 | 같음 | + parent_portal 유효해야 (정지 = 유효) | 같음 | 유지 (발급만 중지) |

**PHASE 08 1차 구현에서 "Active contract before G-1" 열의 legacy 동작을 바꾸던 곳 (PRE-COMMIT 에서 G-1 로 이동):**

| 항목 | 1차 구현 | 수정 후 |
|---|---|---|
| 출결 | 계약 적용 기관이면 반 쓰기 필요 (EN003) | G-1 `trg_attendance_entitlement_gate` 로만 |
| legacy 형식 관찰 | 같음 | G-1 `trg_observations_entitlement_gate` 로만 |
| legacy 관찰영역 연결 | 같음 | G-1 `trg_observation_domains_g1_gate` (신규) |
| legacy 수업 직접 시작 · 예정→완료 | 같음 | G-1 `trg_class_sessions_status_g1_gate` (신규) |
| 사진 업로드 재원 · 반 쓰기 | 같음 | G-1 이 `observation_media_upload_block_reason` 를 다시 정의 |

남은 "Active contract before G-1" 변화: legacy 공유 읽기의 parent_portal 조건 (읽기 경로 · 모든 상품이 parent_portal 을 포함하므로
계약이 유효 · 정지인 동안은 변화 없음 · 계약 종료 · 기간 만료 후에만 닫힘). 운영 쓰기 동작 변화는 0.

## 1. 역할 · 권한

| 쓰기 | Authority | Actor | Audit | G-2 |
|---|---|---|---|---|
| organization_members | PHASE 08 trigger (self-grant · 마지막 원장 · 교사→원장 담당 반 · 불변) | PRE: RLS is_soyes_admin 직접 DML (HQ Admin + HQ Sales) + HQ Admin RPC | membership.* (모든 경로 · via) | 직접 INSERT/UPDATE 회수 → HQ Admin RPC 만 |
| class_teachers | RLS is_soyes_admin + 역할 trigger | HQ | 없음 (OPEN) | Admin 만 |
| children | RLS | HQ · 원장 | 초과 인원 경계 이벤트 | Admin 만 (HQ) |
| contracts · contract_classes | RLS HQ Admin + trigger | HQ Admin | contract.* | — (PHASE 08: 활성 계약 범위 추가 한도 CT009 · 재개 재확인 CT010) |
| 리포트 숨김 · Portal | trigger | 원장 · HQ Admin / 원장 | report.* · portal.* | — |
| legacy 리포트 숨김 (PHASE 08) | RPC (DEFINER) | 원장 · HQ Admin · 사유 | legacy_report.* | — |

## 2. 동의 운영 상태 (DEC-088 · 법적 효력은 판단하지 않는다)

| 상태 | 사진 업로드 (Storage · metadata) | Weekly 사진 선택 | 학부모 Portal 사진 |
|---|---|---|---|
| `declined` | 거부 (MD004) | 거부 (RP011) | 없음 (CO-9 · CO-10 · DB-9 OPEN) |
| `consented` | 허용 (운영상 사용 가능) | 허용 | 없음 (같은 OPEN) |
| `unknown` · 기록 없음 | 허용 (반 내부 기록) | 거부 (RP011 · 공개 산출물에 넣지 않음) | 없음 |

`evidence_ref` 는 사람이 넣은 값만 저장한다 (PHASE 08 은 채우지 않는다). 동의 철회 = 기존 사진 삭제 아님 (DEC-088) —
이미 올린 사진은 숨김 · 삭제 절차를 따른다.

## 3. M5 회수 인벤토리 (정확한 목록)

| # | 경로 | 종류 | 회수 방식 | 새 앱 사용 |
|---|---|---|---|---|
| A | `class_sessions.status` | column UPDATE | revoke update(status) · scheduled_date 유지 | 전환 RPC 사용 |
| B1~B4 | `create_or_refresh_child_growth_report` · `save_child_growth_report_atomic` · `save_child_growth_report_ai_draft` · `apply_child_growth_report_ai_draft` | RPC | revoke execute | 사용 안 함 (Weekly) |
| B5~B7 | `child_growth_reports` insert/update · `_sources` insert/delete · `_ai_drafts` insert/update | table | revoke | 사용 안 함 |
| C1~C2 | `create_child_growth_report_share` · `child_growth_report_shares` insert | RPC · table | revoke | Portal 사용 |
| D1~D2 | `save_class_session_observation_atomic` · `class_session_observation_domains` insert/delete | RPC · table | revoke | Growth5 사용 |
| E | legacy 형식 관찰 작성 · 수정 | 관찰 표 (SaaS 2.0 과 공유) | trigger OB008 (grant 유지) | Growth5 만 작성 |
| F1~F3 | `save_observation_ai_generated_atomic` · `save_observation_ai_review_atomic` · `class_session_observation_ai_drafts` insert/update | RPC · table | revoke | 사용 안 함 |
| 유지 | 모든 SELECT · `read_shared_growth_report` · `revoke_child_growth_report_share` + update(revoked_at) · 출결 RPC · scheduled_date | — | — | legacy historical read · DEC-041 |
