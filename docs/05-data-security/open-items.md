# Data / Security — Open Items

| | |
|---|---|
| 문서 상태 | PHASE 05 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-079 ~ DEC-096 |

---

## 0. 규칙

| # | 규칙 |
|---|---|
| 1 | ID 접두어 `DB-` = PHASE 05 DB · Security 미결정. `DBA-` = PHASE 05 분석의 결정 후보 번호 (결정되면 DEC로 이동). `DI-` = DB 불변식 후보 ([architecture-overview.md §5](./architecture-overview.md)) |
| 2 | Architecture Invariant(`AI-1` ~ `AI-17`, project-charter §5)와 섞지 않는다 |
| 3 | 운영 상태 · 구조를 정할 뿐 **법적 결론을 내리지 않는다** (CO-2 · CO-9 · CO-10은 법무 확인) |
| 4 | 결정되면 decision-log에 DEC-097부터 부여하고 여기서 RESOLVED로 표시한다 |

---

## 1. DB Open Items

| ID | 항목 | 상태 | 필요 시점 · 연계 |
|---|---|---|---|
| **DB-1** | 원아 반 이동 · Enrollment 이력 테이블 | **OPEN** | P2 · 현재는 `children.class_id` + audit (DEC-080) |
| DB-2 | HQ Admin 민감 데이터 접근 범위 | ✅ **RESOLVED by DEC-093** — blanket SELECT 없음 · server/RPC + reason + audit | — |
| DB-3 | Director · HQ의 진행 중 세션 완료 | ✅ **RESOLVED by DEC-085** — 별도 Recovery · reason · audit · P0 | — |
| DB-4 | Quick Memo 공유 범위 | ✅ **RESOLVED by DEC-087** — author only | — |
| **DB-5** | 단체 사진 (여러 아동 포함) 모델 | **OPEN** | CO-9 결정 후 · 현재 사진은 세션 × 아동 1명 |
| **DB-6** | Legacy 데이터 교직원 조회 유지 기간 · 물리 삭제 시점 | **OPEN** | CO-2 결정 후 · M6 |
| DB-7 | 계약 미등록 운영 기관 처리 | ✅ **RESOLVED by DEC-094** — 영구 bypass 없음 · M3 전 explicit mapping 또는 disabled/non-production · 가짜 Contract 금지 | — |
| **DB-8** | 운영 DB 크기 · migration lock 시간 | **OPEN** | M1 전 읽기 전용 확인 |
| **DB-9** | **Portal Media Privileged Signer / AI-1 Exception** | **OPEN (NEW)** | **Production Parent 사진 공개 전 필수** · CO-9 · CO-10 연계 |

---

## 2. DB-9 · Portal Media Privileged Signer / AI-1 Exception

**승인된 것 (DBA-30 일부)**: private bucket 유지 · 짧은 TTL signed URL로 전달.

**결정되지 않은 것**: 누가 · 어떤 credential로 서명하는가. anon 요청에 대해 Storage 서명을 하려면 특권 credential이 필요할 수 있고, 이는 **Invariant AI-1(service credential 사용 범위)의 예외**가 될 수 있다. 따라서 **AI-1은 이번 PHASE에서 수정하지 않는다.**

DB-9에서 정할 것:

| # | 항목 |
|---|---|
| 1 | Credential 종류 (전용 제한 credential · 기존 service credential · 기타) |
| 2 | 권한 범위 — **Storage 서명 전용**인가, DB 접근이 가능한가 |
| 3 | DB 접근 필요 여부 및 최소화 방식 |
| 4 | Token authorization 순서 — **Portal token 검증이 반드시 먼저** |
| 5 | Path binding — 서버가 리포트 media reference에서 path 결정 · **client가 임의 path 선택 불가** |
| 6 | 짧은 TTL 값 |
| 7 | Audit / 로그 (token · path secret 미기록) |
| 8 | Secret 격리 (배포 환경 · 접근 코드 범위) |
| 9 | 회귀 테스트 (검증 전 서명 없음 · 숨김/삭제/동의 미충족 서명 없음 · 다른 아동 path 서명 없음) |

**확정된 금지 규칙**: service/secret credential을 일반 HQ Admin 권한으로 사용 금지 · token 검증 전 signed URL 생성 금지 · client 임의 path 금지.

---

## 3. PHASE 05에서 처리된 이전 항목

| ID | 원 위치 | 결과 |
|---|---|---|
| IA-3 | 02-ia | ✅ RESOLVED by DEC-086 (행 없음 = 기록 없음 · stage NOT NULL · 코드 `together`) |
| AH-1 | 02-ia | ✅ DEC-087 (저장 단위 · author only) · 보존 기간은 CO-2 |
| AH-2 | 02-ia | ✅ DEC-085 (BEFORE 확인 행 · RPC 전환 · Recovery) |
| AH-3 | 02-ia | ✅ DEC-089 · DEC-092 (숨김은 논리 리포트 단위 · Portal 조회 제외) · 사진 서명은 DB-9 |
| AH-4 | 02-ia | ✅ DEC-096 (Required Content Set) |
| AH-5 | 02-ia | ✅ DEC-092 (token hash · anon RPC · 최소 DTO) · 만료는 CO-12 |
| AD-1 | 01-product | ◐ 부분 — private bucket + signed URL만 승인 · **서명 주체 → DB-9** |
| AD-2 | 01-product | ✅ DEC-083 (쓰기 RLS/RPC gate + 서버 이중) |
| AD-3 | 01-product | ✅ DEC-086 |
| AD-4 | 01-product | ✅ DEC-094 (pgTAP) |
| AD-9 | 01-product | ◐ `private.admin_users` 역할 확장 방향 (DEC-079) · Content 역할 세부는 PHASE 07 |
| AD-10 | 01-product | ✅ DEC-090 |
| AD-11 | 01-product | ✅ DEC-085 (`week_no` 생성 시 복사) |
| AD-5 · AD-6 · AD-7 · AD-8 · AD-12 · AD-13 · AD-14 | 01-product | 이번 PHASE 미처리 — PHASE 07 (또는 콘텐츠 트랙) |
| PH3-2 | 03-commerce | 미처리 — 배정 기반 권한 구조만 확정 (DEC-080) · 위임 여부는 PHASE 07 전 |
| CO-7 | 03-commerce | OPEN 유지 — identity · provenance 구조는 DEC-084 |

---

## 4. Production Blockers (변경 없음)

| ID | 항목 | PHASE 05 관련 |
|---|---|---|
| **CO-2** | 데이터 보관 · 파기 · Export | Media 물리 삭제 시점 · Quick Memo TTL · DB-6 · M6 |
| **CO-9** | 단체 사진 내 다른 아동 식별 | DB-5 · Parent 사진 공개 |
| **CO-10** | Consent 법적 단위 · 문구 · Privacy 고지 정합 | `consented` ≠ 법적 허가 (DEC-088) · Parent 사진 공개 |
| **CO-12** | Portal 만료 · 재발급 | `child_portals.expires_at` 확장 지점 (DEC-092) |

추가 Production 조건: **External Parent Photo Publication = CO-9 · CO-10 · DB-9 해결 후.**

---

## 4-1. AR Dependencies (04-ai-report)

| ID | 항목 | DB 영향 |
|---|---|---|
| **AR-8** | 자유 텍스트 개인정보 최소화 | External P0 AI 사용 전 필수 · 미해결 시 Pilot AI OFF — 신규 리포트 경로는 AI 없이 완주 (DEC-091) |
| AR-1 | Monthly · Semester 최소 Evidence 기준 | 완료 RPC 검증 규칙 입력 (P1 · P2) |
| AR-2 | Semester Portfolio · Reporting Term boundary | `reports` 기간 discriminator (P2) |
| AR-5 | 다국어 | `growth_metrics` label · template version 확장 지점 |
| AR-10 | AI usage limit | `ai_generation_attempts` 집계로 측정 가능 · 한도 저장 구조는 P1+ |

## 4-2. 남은 IA / AD / AH 항목

| ID | 상태 |
|---|---|
| IA-* | IA-3 RESOLVED (DEC-086) · IA 기준 Open 없음 (IA-13 Copy는 PHASE 06) |
| AH-1 ~ AH-5 | 구조 확정 · 잔여: 보존 기간 CO-2 · Portal 만료 CO-12 · 사진 서명 DB-9 · rate limit AD-14 |
| AD-1 | 잔여 = DB-9 |
| AD-5 · AD-6 · AD-7 · AD-8 · AD-12 · AD-13 · AD-14 | PHASE 07 또는 콘텐츠 트랙 |
| AD-9 | Content 역할 세부 PHASE 07 |
| PH3-2 | PHASE 07 전 |
| CO-7 | OPEN |

---

## 5. PHASE 06 Inputs (UX / Copy)

| # | 입력 | 근거 |
|---|---|---|
| 1 | Growth 5 **no-row UI** — 기본 상태 = 기록 없음 · "기록 없음" 버튼 없음 · 지표 선택 후 방식 미선택 시 저장 불가 안내 | DEC-086 · DEC-038 |
| 2 | **Stage labels** 함께 · 보고 나서 · 스스로 (코드 노출 금지) | DEC-086 |
| 3 | Observation **draft / complete** 상태 표시 | DEC-086 |
| 4 | **Weekly readiness** (근거 부족 · 작성 가능 · 완료) | DEC-066 |
| 5 | Report **draft / revision / latest completed** 구분 표시 (교사) | DEC-089 |
| 6 | 학부모 **Updated label** "업데이트됨 YYYY.MM.DD" | DEC-075 |
| 7 | **Hidden** 상태 (원장 · 교사 · Portal 무구분 실패) | DEC-074 |
| 8 | **Portal state** (활성 · 폐기 · 만료 — 만료 정책 CO-12) | DEC-092 |
| 9 | **Photo unavailable state** (숨김 · 삭제 처리 중 · 동의 미충족 — 사유 비노출) | DEC-088 |
| 10 | **Consent operational state** 표시 · 입력 문구 (법적 표현 금지) | DEC-088 · DEC-059 |
| 11 | **4-week label** (Monthly = Program 4-Week Block) | DEC-067 |
| 12 | **8-week derived summary** (STARTER Summary View) | DEC-069 |
| 13 | **Legacy marker** (1.0 리포트 · 구 5영역 관찰) | DEC-076 · DEC-094 |
| 14 | **Entitlement unavailable** (계약 범위 밖 반 · 기능 미포함) | DEC-083 |
| 15 | **Read-only mode** · 차단 모드 안내 | DEC-052 · DEC-083 |
| 16 | **Recovery / admin status** — Recovery 완료 action · 사유 입력 · 일반 [수업 마치기]와 분리 · HQ support access 사유 입력 | DEC-085 · DEC-093 |
| 17 | Quick Memo "나만 보는 메모" 안내 | DEC-087 |

---

## 6. PHASE 07 Inputs (Implementation)

| # | 입력 | 근거 |
|---|---|---|
| 1 | **pgTAP baseline** (M0) · 음성 테스트 N-1 ~ N-26 | DEC-094 · [rls-security-architecture.md §7](./rls-security-architecture.md) |
| 2 | **RLS helper split** (`is_hq_admin` · `is_hq_sales` · 상태 · 권한 헬퍼) | DEC-079 · DEC-083 |
| 3 | **Sales policy removal** | DEC-079 |
| 4 | **HQ Admin sensitive support RPC** · 기존 Admin UI 호환 | DEC-093 |
| 5 | **class-aware entitlement** (`class_has_feature`) + write gate | DEC-083 |
| 6 | **product / version / contract migrations** · 동시 효력 1개 강제 방식 (exclusion 후보 vs RPC 잠금) · `ai_assist` scope 저장 표현 | DEC-081 · DEC-082 |
| 7 | **session start / finish / recovery RPC** · 직접 UPDATE 회수와 INVOKER RPC 양립 방식 | DEC-085 |
| 8 | **Growth5 storage** (카탈로그 · 선택 · taxonomy) | DEC-086 |
| 9 | **Quick Memo author-only** | DEC-087 |
| 10 | **reports / revisions / snapshots** · `latest_completed_revision_id` FK 방식 | DEC-089 · DEC-090 |
| 11 | **AI-independent Weekly** (create → Teacher Final → Complete → Portal) | DEC-091 |
| 12 | **legacy adapter** (read-only) | DEC-094 |
| 13 | **Portal** (token hash · `read_child_portal`) | DEC-092 |
| 14 | **DB-9 security decision before photo signer implementation** | DB-9 |
| 15 | **Storage delete orchestration** (cleanup job · 재시도) | DEC-088 |
| 16 | **keyset pagination** (리포트 · 관찰 목록 서버 페이징) | 04-ai-report Blockers |
| 17 | **generated Supabase types** | current-db-audit §2 |
| 18 | **audit** (`audit_events` · 금지 필드) | DEC-093 |
| 19 | **optimistic concurrency** (`clock_timestamp()` 토큰) | Invariant AI-6 |
| 20 | **overage aggregate / event** | DEC-095 |
| 21 | 정확한 테이블 · 컬럼 · 타입 · FK · 제약 · 인덱스 | [target-data-model.md](./target-data-model.md) |

---

## 7. Implementation Order (권장)

1. M0 pgTAP 기준선
2. 헬퍼 분리 + Sales SELECT 제거 + HQ Admin 민감 SELECT 축소 · support RPC
3. Commerce (Product · Version · Contract · class scope · capability registry) + 활성화 RPC
4. Entitlement 헬퍼 (`org_service_mode` · `org_has_feature` · `class_has_feature`)
5. Contract mapping 입력 · 검증 (M2 gate — 미등록 production org 0)
6. 세션 RPC (BEFORE · start · finish · recovery) + Quick Memo
7. Growth 5 저장 · 관찰 taxonomy
8. Media hide · consent · Storage cleanup orchestration
9. Report 2.0 (논리 리포트 · revision · 스냅샷 · AI 무의존 Weekly) + audit_events · overage 이벤트
10. Child Portal (token · RPC) — 사진 서명은 **DB-9 결정 후**
11. legacy read adapter · Admin UI 호환
12. Cutover M5 → (CO-2 · 별도 승인 후) M6

상세 단계 게이트는 [migration-cutover.md](./migration-cutover.md).
