# PHASE 07 — Production-shaped Local Test Plan (M2 backfill · M3 gate compatibility)

| | |
|---|---|
| 문서 성격 | 구현 검증 계획 (Product Decision 아님 · 새 DEC 없음) |
| 작성 | 2026-09-28 |
| 상태 | **EXECUTED (local · 세션 6 · 2026-09-28) — 결과 §7** |
| 범위 | local Supabase 전용 · 가상(synthetic) 데이터만 · 운영 DB 연결 · 운영 데이터 export 없음 |

> 목적: 빈 DB 기준으로는 검증된 PHASE 07 migration(현재 일반 migration 10개 + cutover 1개)이 **이미 운영 데이터가 있는 DB** 위에서도
> 안전하게 적용되는지(M2 backfill · M1 제약 추가 · M3 권한 변경 · M3 write gate), 적용 직후 기존 기능이
> 어떻게 바뀌는지를 실제 child 데이터 없이 확인한다.

---

## 1. 실행 방식 (local only)

1. `npx supabase@2.113.0 db reset --local --version 20260904090000` — PHASE 07 이전 스키마 (파일 이동 없음)
2. `supabase/validation/production_shaped/01_legacy_seed.sql` 로 §2 가상 데이터 적재 (실명 없음) · `02_fingerprint.sql` 로 사실 해시 기록
3. `npx supabase@2.113.0 migration up --local` — PHASE 07 일반 migration 10개 적용 · `02_fingerprint.sql` 재실행 비교
4. §3 기대 결과를 SQL 로 확인 · 앱을 local 로 띄워 §4 화면 확인.
5. 결과를 `implementation-status.md` 에 기록. **remote link · db push 없음.**

## 2. 최소 가상 데이터셋

| # | 대상 | 구성 | 확인하려는 것 |
|---|---|---|---|
| D-1 | 기관 | 운영 중 3곳 (O1 · O2 · O3) + 정지 1곳 (O4 `suspended`) | 기관별 계약 mapping 전후 동작 |
| D-2 | 구성원 | 기관마다 원장 1 · 교사 2~3 · `invited` 1 · `disabled` 1 · HQ `admin` 1 · HQ `sales` 1 | M3 role split (`is_soyes_admin` = admin only) |
| D-3 | 반 | 기관마다 `active` 2~3 · `archived` 1 | class scope · archived 반 readiness |
| D-4 | 원아 | 반당 10~15명 · **O1 한 반은 18명 (정규 >15)** · `inactive` · `graduated` 몇 명 | capacity overage event (정규) |
| D-5 | Pilot 후보 | O3 한 반 15명 · 다른 반 16명 | Pilot 15 허용 · >15 활성화 차단 (`pilot_capacity`) |
| D-6 | 프로그램 · 차시 | 8주 · 16주 · 24주 프로그램 (published) · 일부 차시 draft · **lesson_sections 없음** | content readiness 가 자동 ready 되지 않음 |
| D-7 | 배정 | 반마다 active 배정 1 · 종료(ended) 배정 이력 1 | M1 unique `(id, org, class)` 추가 · `origin_contract_id` null 유지 |
| D-8 | 세션 | 반마다 `completed` 여러 주 · `scheduled` (미래) · `in_progress` (오늘 · 어제 = 방치) · `cancelled` | M2 `week_no` backfill · 방치 in_progress 복구 경로 |
| D-9 | 출결 | 완료 세션 대부분 · 일부 누락 | 기존 출결 조회 유지 · gate 후 수정 가능 여부 |
| D-10 | 관찰 | `complete` · `draft` · 교사 관찰 · 아이의 말 · 5영역 domain link (legacy taxonomy) | taxonomy 기본값 `legacy_domains` · Observation 2.0 화면에서 legacy 행 처리 (OB006) |
| D-11 | 사진 메타데이터 | 세션 · 아이별 0~5장 (storage object 없이 행만) | M1 media 컬럼 (`hidden_at` · `storage_status`) 추가 · unique `(id, org)` |
| D-12 | AI 초안 | 관찰 AI 초안 · 성장 리포트 AI 초안 | Director AI 초안 비노출 (M3) · 교사 유지 |
| D-13 | legacy 성장 리포트 | `draft` · `completed` · 기간형 · sources 연결 | legacy 조회 · HQ metadata RPC · M5 전까지 편집 유지 |
| D-14 | legacy 학부모 공유 | active · revoked · expired 링크 | legacy share route 유지 · 실패 문구 |
| D-15 | 리드 | `lead_submissions` 여러 상태 | Sales `/sales/leads` · Admin `/admin/leads` |
| D-16 | 계약 | **없음** (운영 현실: 아직 어떤 기관도 Contract 가 없다) | M3 gate 적용 직후 영향 (§3 G-1) |

## 3. 기대 결과 (검증 항목)

| # | 검증 | 기대 |
|---|---|---|
| V-1 | 11개 migration 적용 | 오류 없이 적용 · 소요 시간 기록 (G-5 lock 참고치) |
| V-2 | M2 `week_no` backfill | `class_sessions.week_no is null` 0건 (lesson 연결 세션 기준) · lesson week 와 일치 |
| V-3 | M1 unique 제약 3건 | PK 상위집합이라 **데이터로는 실패할 수 없음** — 인덱스 생성 시간만 측정 (G-5) |
| V-4 | Growth5 · 상품 · capability seed | 상품 버전 전부 `draft` · capability 전부 미출시 · `parent_portal`=CO-12 · `ai_assist`=AR-8 · `branding`=CO-8 |
| V-5 | M3 role split | HQ `sales` 가 `/admin` 불가 · children/observations/reports 0건 · leads 가능 |
| V-6 | HQ admin 민감 SELECT | 관찰 · 리포트 본문 0건 · 지원 열람만 사유 + audit |
| V-7 | Director AI 초안 | 원장 0건 · 담당 교사 유지 |
| V-8 | legacy 성장 리포트 · 공유 | 기존 조회 · 공유 링크 동작 유지 (M5 전) |
| V-9 | **G-1 gate 영향** | 115000 적용 직후 **계약 없는 모든 기관**: 새 배정(EN001) · 새 세션(EN002) · 출결 · 관찰 쓰기(EN003) 차단. 진행 중(in_progress) 세션의 출결 · 관찰도 막힘 → 운영 중단 범위를 수치로 기록 |
| V-10 | 계약 mapping 가능 여부 | HQ 가 버전 발행 → 계약 초안 → class scope → readiness. **모든 상품이 `parent_portal` 을 포함하고 CO-12 로 막혀 있어 `activate_contract` 는 CT005 로 실패할 것으로 예상** (§5) |
| V-11 | capacity | O1 18명 반: 정규 계약 active 시 `capacity.overage_started` audit · 등록 차단 없음 |
| V-12 | Pilot | 15명 반 readiness 통과 · 16명 반 `pilot_capacity_exceeded` |
| V-13 | 방치 in_progress | 원장 복구 처리(사유) 가능 · 교사 일반 완료 가능 · scheduled→completed RPC 불가 |
| V-14 | Observation 2.0 × legacy 관찰 | legacy taxonomy 행은 새 화면에서 편집 불가(OB006) → 교사 안내 문구 · 기존 데이터 손실 없음 |
| V-15 | 앱 화면 | 교사 오늘의 수업 · 원장 수업 운영 · HQ 대시보드 · Sales 현황 · 공개 사이트 · 리드 폼이 local 에서 오류 없이 렌더 |

## 4. 수동 화면 점검 (local app)

- `.env.local` 을 **local Supabase URL · anon/publishable key** 로만 구성 (운영 값 금지 · 값 출력 금지)
- 역할별 로그인: HQ admin · HQ sales · 원장(STARTER/STANDARD 가정) · 교사 · 계약 없는 기관 원장/교사
- 계약 없는 기관 화면: "계약 없음" 서비스 모드 안내 · 쓰기 버튼 비활성 · 서버 오류 문구 (EN 코드 문구)

## 5. 이 계획으로 드러나는 롤아웃 사실 (Decision 아님 · 보고용)

1. **G-1 은 현재 구조상 충족 불가능하다.** 모든 seed 상품(STARTER · STANDARD · PREMIUM · PILOT)이 `parent_portal` 을 포함하고,
   계약 활성화 Readiness 는 포함 기능 전부의 출시 + blocker 없음 을 요구한다 (DEC-063 · DEC-082).
   CO-12 가 OPEN 인 동안 어떤 계약도 정상 경로로 활성화할 수 없다 (STANDARD · PREMIUM · PILOT 은 AR-8, PREMIUM 은 CO-8 도).
2. `20261001115000_m3_entitlement_write_gates.sql` 은 **`supabase/migrations/` 안에 있어 remote 적용 시 다른 migration 과 함께 자동 적용된다.**
   적용되는 순간 계약이 없는 모든 운영 기관의 수업 기록 쓰기가 막힌다.
3. 따라서 remote 적용 전에 사람이 결정해야 한다 (Claude 가 정하지 않음):
   - (a) 115000 을 M5 처럼 `supabase/cutover/` 로 분리해 계약 mapping 이후 별도 적용할지
   - (b) CO-12 등 정책 결정 이후까지 remote 적용 자체를 미룰지
   - (c) 그 밖의 경로
4. `platform_capabilities` 출시 여부는 **활성화 시점 Readiness 입력**이다 (DEC-082). 이미 유효한 계약의 기능을 runtime 에
   끄는 kill switch 가 아니다 (AI 는 예외적으로 runtime 에도 확인).

## 5-1. 세션 6 갱신 (§5 의 처리)

- §5-2 · §5-3 은 **(a) 분리**로 처리했다: `20261001115000_m3_entitlement_write_gates.sql` → `supabase/cutover/M3_entitlement_write_gates.sql`
  (G-1 guard 포함 · cutover-runbook.md). 일반 migration 은 이제 계약 없는 기관의 legacy 쓰기를 막지 않는다.
- §5-1 (G-1 충족 불가) 은 그대로다 — policy blocker 해소 전까지 cutover guard 가 적용을 거부한다.

## 6. 금지 사항 (이 계획 실행 시)

- 운영 DB 연결 · `supabase link` · `db push` · `--linked` 없음
- 운영 데이터 dump · 실제 아동 이름 · 사진 사용 없음
- 검증 결과를 이유로 migration 의 제약 · RLS 를 완화하지 않는다 (결함이면 별도 보고)

---

## 7. 실행 결과 (local · 세션 6 · 2026-09-28)

**가상 데이터셋 (01_legacy_seed.sql)**: 기관 6 (o1 정규 후보 · o2 정규 후보 · o3 Pilot 후보 · o4 정지 기관 · o5 미등록 · o6 정지 계약 후보) ·
구성원 30 (원장 · 교사 2 · 초대 · 비활성) + HQ admin · HQ sales · 반 10 (archived 1) · 원아 143 (o1c1 18명 · o3c1 15명 · o3c2 16명 · 비활성 · 졸업 포함) ·
프로그램 3 (8 · 16 · 24주 · draft 차시 1 · lesson_sections 없음) · 배정 11 (active · completed 이력) · 세션 67 (completed · in_progress · 방치 in_progress · scheduled · cancelled) ·
출결 318 · 관찰 135 (complete · draft · legacy 5영역 216) · 사진 메타 72 · 관찰 AI 초안 18 · legacy 성장 리포트 4 (+ sources 2 · AI 초안 2) · legacy 공유 4 (active · revoked · expired) · 리드 3.

| # | 검증 | 결과 |
|---|---|---|
| V-1 | 일반 migration 10개를 데이터 위에 적용 | PASS · `migration up --local` 약 5.4초 (local · 소규모 · G-5 참고치일 뿐) |
| V-2 | M2 week_no backfill | PASS · null 0 · lesson week 와 불일치 0 · 재실행 0행 |
| 사실 보존 | 17개 테이블 fingerprint (id · 상태 · 본문 · 날짜 · `updated_at`) | **IDENTICAL** — 기존 행 · 동시성 토큰 변경 없음 |
| V-3 | M1 unique 제약 추가 | 오류 없음 (PK 상위집합) |
| V-4 | seed | 상품 버전 전부 draft · capability 전부 미출시 · CO-12 · AR-8 · CO-8 |
| V-5 · V-6 · V-7 | role split · HQ 민감 SELECT · 원장 AI 초안 | PASS (Sales 아동 0 · 리드 유지 · HQ 관찰 0 · 원장 AI 초안 0 · 교사 유지) |
| V-8 | legacy 리포트 · 공유 | PASS (active 조회 · expired · revoked 불가 · cutover 후에도 동일) |
| V-9 (pre) | 미등록 기관 legacy 쓰기 | PASS — 세션 등록 · 출결 RPC · legacy 관찰 RPC 동작. 새 경로는 SS005 · OB007 (설계대로) |
| V-9 (preflight) | G1_preflight.sql | **NOT SAFE — blocking 5** (o1 · o2 · o3 · o5 · o6 · o4 정지 기관 제외) · 읽기 전용 확인 |
| V-10 | 실제 HQ mapping 경로 | 버전 발행(HQ만 · 원장 CT008) · 발행 버전 불변(23514) · 계약 초안 · 범위 · 다른 기관 반 거부 · Readiness: STARTER=parent_portal(CO-12) · STANDARD=ai_assist(AR-8) · PREMIUM=branding(CO-8) · content 미준비 · **activate → CT005** · active 계약 0 |
| V-11 | 정규 기준 인원 초과 | 등록 허용 · 이벤트 1건 · 대량 이동 시 cleared 1건 · 청구 없음 |
| V-12 | Pilot 15 · 16 | 16명 반 readiness `pilot_capacity_exceeded` · 범위에서 빼면 15명 통과 · 16번째 등록 자체는 막지 않음 |
| V-13 | 방치 in_progress | 원장 복구(사유) · 교사 마치기 모두 계약 없이 가능 |
| V-14 | legacy 관찰 × M4 | legacy complete 관찰이 Weekly 근거로 쓰이고 snapshot 에 원문 보존 |
| SIM → CUTOVER | [SIMULATION] 활성 계약 (replica fixture) + o5 정지 처리 → preflight 0 → 실제 cutover 파일 적용 | PASS · 범위 안 쓰기 허용 · 범위 밖 EN003 · 배정 EN001 · STARTER 9주 EN002 · 정지 계약 EN003 · 정지 기관 AT002(기존 규칙) · origin_contract_id 기록 |
| V-15 | 앱 화면 (local 수동) | **NOT EXECUTED** (local `.env.local` 미구성) |

- pgTAP: `03_validation.test.sql` **74/74 PASS** (rollback · 실행 후 gate 0 · 계약 0)
- **발견 결함 (수정됨)**: 원아 대량 등록 · 이동 시 `capacity.overage_started/cleared` 가 행 수만큼 중복 기록 (row-level AFTER trigger 가
  statement 끝에서 최종 인원을 봄). `20261001111000` 의 trigger 를 statement-level + transition table 로 바꿔 반별 순증감 1회 판정.
  회귀 test 를 기본 suite(`p0_hardening`)와 이 suite 에 추가.
- 한계: 소규모 가상 데이터 · 운영 규모 lock 시간(G-5) · 실제 운영 데이터 분포는 여전히 미검증.

### 7-1. 세션 7 재실행 (G-2 분리 후)

- 일반 migration 이 10개(`…110000_m3_hq_role_foundation` 포함)로 바뀐 뒤 같은 흐름을 처음부터 다시 실행했다.
- `migration up --local` ≈5.3초 · 17개 테이블 사실 fingerprint **IDENTICAL** · G-1 preflight **NOT SAFE (5)**.
- `03_validation.test.sql` 순서: M2 → PRE(legacy 쓰기 · legacy 직접 세션 시작) → **PRE-G2**(legacy HQ 조회 유지) →
  **G-2 cutover**(실제 파일 · G-1 gate 미설치 확인 · Sales/HQ/원장 제한) → 실제 HQ mapping(CT005) → [SIMULATION] → G-1 cutover → POST.
- 결과 **83/83 PASS** (TODO 0 · SKIP 0 · rollback · 실행 후 gate 0 · 계약 0).
