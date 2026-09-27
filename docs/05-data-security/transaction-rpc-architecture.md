# Transaction · RPC Architecture

| | |
|---|---|
| 문서 상태 | PHASE 05 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-082 · DEC-085 · DEC-088 · DEC-089 · DEC-091 · DEC-092 · DEC-093 · DEC-094 · DEC-095 · Invariant AI-6 |

> 함수 이름은 PROPOSED 개념 이름이다. 시그니처 · 반환 형식 · 에러 코드는 PHASE 07.

---

## 1. RPC 사용 원칙 (DEC-094)

RPC로 만드는 경우 (이 외에는 RLS가 걸린 단순 CRUD):

1. **다중 테이블 불변식** (예: 리포트 완료 = revision 상태 + 스냅샷 + 포인터).
2. **보안 민감 전환** (세션 상태 · Portal 발급 · 계약 활성화 · HQ 지원 접근).
3. **원자적 상태 변경** (조건부 전환 · 동시 효력 1개).
4. **범위가 정해진 일괄 쓰기** (출결 · 관찰 일괄 저장).

**동시성**: `clock_timestamp()` 기반 토큰 비교 (Invariant AI-6) · last-write-wins 금지.
**보안 모드**: Invariant AI-1(쓰기 RPC는 `SECURITY INVOKER`)을 유지한다. SECURITY DEFINER는 `private` 판정 헬퍼와 anon 전용 읽기 RPC(현재 `read_shared_growth_report` 패턴)에 한정한다. client의 status 직접 UPDATE 차단과 INVOKER 전환 RPC를 양립시키는 방식(트리거 판정 · 전환 기록 행 등)은 PHASE 07에서 정한다.
**멱등성**: 조건부 전환(`WHERE status = 기대값`) · unique 제약으로 중복 생성 방지.

---

## 2. Transaction Matrix

| RPC (PROPOSED) | 주체 | 한 트랜잭션 안 | 트랜잭션 밖 | 결정 |
|---|---|---|---|---|
| `activate_contract` | HQ Admin | 상태 · 기간 · class scope · published version · Readiness · Pilot 제약(반당 원아 ≤15 · 반 ≤2 · override 없음) · 동시 효력 1개 검사 · audit | — (결제는 조건 아님) | DEC-082 · DEC-063 |
| `publish_product_version` | HQ Admin | draft → published · `published_at` · audit | — | DEC-081 |
| `move_child_class` | Director · HQ Admin | `children.class_id` 변경 · audit · 초과 경계 이벤트 | — | DEC-080 · DEC-095 |
| `confirm_session_before` | 배정 Teacher | BEFORE 확인 행 기록 | — | DEC-036 |
| `start_session` | **배정 Teacher만** | BEFORE 확인 존재 · `scheduled → in_progress` · class entitlement · service mode | — | DEC-085 |
| `finish_session` | **배정 Teacher만** | `in_progress → completed` · 행위자 · 시각 | — | DEC-085 |
| `recover_complete_session` | Director · authorized HQ Admin | `in_progress → completed`만 · **reason 필수** · actor · timestamp · audit | — | DEC-085 |
| `cancel_session` | 현재 규칙 유지 | 현재 허용 전환 유지 · audit | — | DEC-085 |
| `save_attendance_atomic` | 배정 Teacher | [기존] 유지 + entitlement gate | — | — |
| `save_observation_atomic` | 배정 Teacher | 관찰 + Growth 5 선택 행 (행 없음 = 기록 없음) · 동시성 토큰 | — | DEC-086 |
| `hide_media` | Teacher (본인 반) · Director | metadata hidden/deleted · 즉시 조회 제외 · 삭제 요청 audit | **Storage 물리 삭제** (서버 orchestration / cleanup job) | DEC-088 |
| `record_media_consent` | Director | 동의 상태 · recorded_by · 증빙 참조 · audit | — | DEC-088 |
| `create_report_draft` | 배정 Teacher | 논리 리포트 upsert · draft revision (부분 unique) | — | DEC-089 |
| `complete_report_revision` | 배정 Teacher | 근거 스냅샷 복사 · 본문 JSONB 검증 · media ref · `draft → complete` · `latest_completed_revision_id` 갱신 · audit | — | DEC-089 · DEC-090 |
| `start_report_correction` | 배정 Teacher | 새 draft revision (정정 사유) | — | DEC-073 |
| `hide_report` / `unhide_report` | Director · HQ Admin | 숨김 상태 · 사유(해제 시 필수) · audit | — | DEC-043 · DEC-074 |
| `issue_child_portal` / `revoke_child_portal` | Director (발급 주체 세부는 PHASE 07) | 기존 활성 revoke + 신규 token hash 한 번에 · raw token은 응답으로 1회만 | — | DEC-092 |
| `read_child_portal` | anon | token 검증 · 공개 대상 최소 DTO | 사진 signed URL (**DB-9**) | DEC-092 |
| `hq_support_read_*` | authorized HQ Admin | reason/context 검증 · audit 기록 · 최소 반환 | — | DEC-093 |
| AI C1 (기존 경로) | 배정 Teacher | 결과 저장은 원자적 · 원 payload 저장 없음 | **외부 AI 호출** (서버 · 트랜잭션 밖) | DEC-091 · DEC-078 |

---

## 3. Session: 정상 vs Recovery

```text
정상 (Teacher)
scheduled ──BEFORE 확인──▶ start_session ──▶ in_progress ──finish_session──▶ completed

Recovery (Director · authorized HQ Admin · reason · audit · P0)
in_progress ──recover_complete_session──▶ completed

금지
scheduled ──▶ completed   (모든 역할)
client의 status 직접 UPDATE (M5에서 권한 회수)
```

Recovery는 일반 finish 버튼과 **UI · action 모두 분리**한다.

---

## 3-1. Report Revision Transactions

| 전환 | 조건 | 결과 |
|---|---|---|
| 생성 | 식별자별 논리 리포트 없음 또는 draft 없음 | 논리 리포트 upsert + draft revision (부분 unique로 중복 방지 · 멱등) |
| 저장 | 동시성 토큰 일치 · draft | 본문 draft 갱신 |
| 완료 | draft · 필수 항목 · 근거 = complete 관찰 · 토큰 일치 | 근거 · 사진 ref 스냅샷 복사 · `complete` · `latest_completed_revision_id` 갱신 · audit — **AI 참조 불필요** |
| 정정 | latest completed 존재 · draft 없음 · 사유 | 새 draft revision (revision_no + 1) |
| draft 폐기 | 완료된 적 없는 draft만 | 삭제 |
| AI 결과 적용 | 교사가 선택 · 서버가 sourceRefs 검증 | draft 본문에 반영 (AI는 선택적 외부 분기) |

---

## 4. Media 삭제 orchestration (DB ↔ Storage)

PostgreSQL 트랜잭션은 Storage 객체 삭제를 포함할 수 없다. 따라서:

1. `hide_media` RPC: metadata를 hidden/deleted로 전환 · **즉시 Teacher · Parent 조회에서 제외** · 신규 signed URL 발급 중지.
2. 서버 orchestration / cleanup job이 Storage 객체를 제거하고 제거 상태를 기록한다.
3. 실패 시 metadata는 hidden 유지 · 재시도 가능 (멱등).
4. 물리 삭제 시점 · 보존 기간은 **CO-2**.

동의 철회는 이 흐름이 아니다 — **표시 적격만 false**로 바뀌며 삭제가 아니다.

---

## 5. 초과 인원 (DEC-095)

- 현재 초과 = `max(계약 반의 활성 아동 수 − 반당 포함 인원, 0)` — 조회 시 계산.
- 아동 추가 · 반 이동 · 비활성 RPC가 경계를 넘으면 같은 트랜잭션에서 `overage_started` / `overage_cleared` 이벤트를 기록한다.
- Regular: 16번째 이상 허용 · 자동 청구 없음 · Billing Ledger 없음.
- Pilot: 16번째 등록은 경고 후 가능하나 child count > 15인 반이 있으면 **Pilot Ready = FALSE · `activate_contract` 차단 · override 없음** (DEC-051 · DEC-054). 서비스 반 최대 2 HARD.

---

## 6. 외부 호출 · 비밀값 경계

| 외부 작업 | 원칙 |
|---|---|
| AI 호출 | 서버 전용 · DB 트랜잭션 밖 · 원 payload · full prompt 저장 · 로그 금지 |
| Storage 삭제 | 서버 orchestration · 재시도 |
| Storage 서명 (Portal) | **DB-9 OPEN** — token 검증 후 · 서버가 path 결정 · 짧은 TTL |
| Auth Admin | service credential은 Invariant AI-1 범위 그대로 |
