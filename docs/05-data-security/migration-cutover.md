# Migration · Cutover

| | |
|---|---|
| 문서 상태 | PHASE 05 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-094 · DEC-091 · DEC-021 · DEC-041 · DEC-076 · Invariant AI-16 · AI-17 |

> Migration 파일을 만들지 않는다. **단계 · 순서 · 게이트**만 정한다.

---

## 1. 원칙

- **Additive first · backward compatible · forward-fix.**
- **이미 적용된 migration은 수정하지 않는다.** 변경은 새 migration으로.
- **초기 단계 destructive migration 금지** (drop · rename · 타입 축소 · NOT NULL 부분 완화 없음).
- **가짜 backfill 금지**: 구 5영역 → Growth 5 · legacy period → Weekly/Monthly · legacy AI text → Teacher Final · 미확인 계약 → 임의 Product Version 모두 하지 않는다.
- 각 단계는 **pgTAP 회귀 통과**가 진입 조건이다.

---

## 2. 단계

| 단계 | 내용 | 진입 게이트 | 되돌리기 |
|---|---|---|---|
| **M0** | pgTAP (`supabase test db`) · 현재 보안 기준선 테스트 (현재 동작 기록 · 격차 테스트는 expected-fail로 표시) | 없음 | 테스트만 |
| **M1** | **Additive schema only**: 신규 테이블 · nullable 컬럼 · 헬퍼 추가. 기존 정책 · 제약 변경 없음 | M0 통과 | 신규 객체만 (앱 미사용) |
| **M2** | **사실 기반 backfill**: 관찰 `taxonomy = legacy_domains` · 세션 `week_no` 복사 · Growth 5 카탈로그 seed · **사람이 검증한 Contract mapping 입력** | M1 · 운영 데이터 읽기 확인 | backfill 컬럼 초기화 |
| **M3** | Sales/Admin 헬퍼 분리 · HQ Admin 민감 SELECT 축소 · Director AI 초안 접근 제거 · **entitlement write gate** · 신규 운영 write 경로 (세션 RPC · Growth 5 저장 · media hide · consent · Quick Memo) | **Contract mapping gate (§3)** · 음성 테스트 통과 | forward-fix |
| **M4** | 신규 Report 2.0 read/write · Child Portal · legacy read adapter | M3 · 신규 경로 E2E (AI 없이 Weekly 완주) | 앱 플래그 |
| **M5** | **앱 Cutover와 동시에**: legacy report write RPC 중지 · 세션 status 직접 UPDATE 권한 회수 · legacy tables read-only | M4 · 앱 배포 준비 · Admin UI 호환 확인 (§5) | forward-fix |
| **M6** | cleanup (legacy 객체 정리 · 물리 삭제) | **CO-2 확정 + 별도 승인** | — |

---

## 3. Contract Mapping Gate (DB-7 해소)

- **영구 legacy bypass service mode를 만들지 않는다.**
- M3 전에 모든 **active production Organization**은 다음 중 하나여야 한다.
  1. 사람이 검증한 **explicit valid Contract mapping** (published Product Version · class scope · 기간), 또는
  2. **service disabled** 또는 **non-production** 분류.
- **미등록 production org가 하나라도 있으면 M3를 강행하지 않는다.**
- **가짜 Contract 자동 생성 금지.**

---

## 4. Legacy 처리

| 대상 | Cutover 전 | Cutover (M5) | 이후 |
|---|---|---|---|
| 관찰 (구 5영역) | 보존 · taxonomy legacy | 구 영역 inactive · 신규는 growth5만 | 조회 유지 |
| `child_growth_reports` 계열 | **현재 제약 유지** (`ai_draft_id` NOT NULL · GR003 · `reviewed_text_snapshot` · `source_ai_updated_at`) | write RPC 중지 · read-only | read adapter · 신규 Portal 미편입 (DEC-076) |
| legacy share | DEC-041 유지 | 신규 발급 정책은 PHASE 07 | 기존 링크 만료까지 |
| 관찰 AI 초안 | P0 C1 경로 | Director 접근 제거 (M3) | P1 attempt 이전 |

**Clarified by PHASE 05 DB architecture (DEC-091)**: PHASE 04의 "GR003 · `ai_draft_id` 필수 의존 제거"는 **신규 2.0 경로가 AI 무의존으로 만들어짐으로써 달성**된다. 운영 중 legacy 컬럼을 nullable로 바꾸거나 GR003만 부분 제거하지 않는다.

Legacy 교직원 조회 유지 기간 · 물리 삭제는 **DB-6 (CO-2)**.

---

## 4-1. Rollback · Lock 고려

| 항목 | 원칙 |
|---|---|
| Rollback | DB는 **forward-fix**가 기본. 앱은 기능 플래그 · 배포 되돌리기로 신규 경로를 끈다. 신규 객체는 M1 단계에서 앱이 쓰지 않으므로 방치 가능 |
| 큰 테이블 변경 | NOT NULL 추가 · 타입 변경 · 전체 재작성 DDL은 초기 단계에서 하지 않는다. nullable 컬럼 추가 → backfill → 검증 → (별도 승인 시) 제약 |
| Backfill | 배치 단위 · 재실행 가능(멱등) · 사실 값만 |
| 인덱스 | 운영 중 lock 영향이 큰 인덱스 생성 방식은 PHASE 07에서 데이터 크기 확인 후 결정 (DB-8) |
| 정책 교체 | 새 정책 추가 → 테스트 → 기존 정책 제거를 같은 migration 안에서 수행해 권한 공백 · 중복 허용 구간을 만들지 않는다 |
| Cutover 시간 | M5는 앱 배포와 동시 · 운영 사용이 적은 시간대 · 운영 DB 크기 · lock 시간은 **DB-8 UNKNOWN** |

---

## 5. Cutover 체크리스트

- [ ] M0 기준선 · M3 음성 테스트 전부 통과
- [ ] Contract mapping gate 완료 (미등록 production org 0)
- [ ] **기존 Admin UI가 민감 테이블을 client-side로 직접 읽는 화면 목록 확인** · support RPC로 전환 또는 비활성
- [ ] 세션 화면이 status 직접 UPDATE 대신 RPC 사용
- [ ] legacy report 작성 화면 비활성 · 조회 adapter 동작
- [ ] AI 없이 Weekly create → Teacher Final → Complete → Portal 완주 확인
- [ ] 운영 DB 크기 · lock 시간 확인 (DB-8)
- [ ] 롤백이 아닌 forward-fix 계획 준비

---

## 6. PHASE 07 구현 순서 (권장)

1. M0 pgTAP 기준선
2. 헬퍼 분리 (`is_hq_admin` · `is_hq_sales`) + Sales SELECT 제거
3. Commerce 테이블 (Product · Version · Contract · class scope · capability registry) + 활성화 RPC
4. Entitlement 헬퍼 (`org_service_mode` · `org_has_feature` · `class_has_feature`)
5. Contract mapping 입력 · 검증 (M2 · gate)
6. 세션 RPC (BEFORE · start · finish · recovery) + Quick Memo
7. Growth 5 카탈로그 · 선택 · 관찰 taxonomy
8. Media hide · consent · cleanup orchestration
9. Report 2.0 (논리 리포트 · revision · 스냅샷) + audit_events
10. Child Portal (token · RPC) — 사진 공개는 DB-9 · CO-9 · CO-10 이후
11. HQ support access RPC · Admin UI 호환
12. Cutover (M5)
