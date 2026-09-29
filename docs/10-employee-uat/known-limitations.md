# 알려진 제한 (이번 직원 테스트 버전)

> **이 버전은 Production Ready 가 아닙니다.** STAGING ONLY · 합성 데이터만 · 실제 아동 개인정보 입력 금지.

## 1. 전환(cutover) 상태

| 항목 | 상태 | 직원에게 의미 |
|---|---|---|
| G-2 (본사 관리자 / 영업 권한 분리) | **ACTIVE — VERIFIED** (Staging) | 영업 계정에는 아동 · 관찰 · 리포트 · 사진이 보이지 않아야 한다 |
| G-1 (계약 기반 쓰기 제한) | **미적용** — 원격 Staging rehearsal 보류 (**P09F-AUTH-1**) | 계약 범위 밖 쓰기 차단은 이번 테스트에서 확인 대상이 아니다 (local 자동 테스트만 PASS) |
| M5 (legacy 직접 쓰기 회수) | **미적용 · 준비 안 됨** | — |
| J/K/L 전환 window | **시작 안 함** · full rehearsal 미완료 | — |

**P09F-AUTH-1**: Shared Pooler(Supavisor) DB 인증이 불안정해 G-1 Staging 단독 rehearsal 이 SQL 실행 전에 멈췄다 (연결 인증 실패 → transaction 미시작 · PRE-G1 상태 확인 · 부분 적용 없음).
**인프라 · rehearsal 차단 요인이며, G-1 SQL 결함의 증거가 아니다** (local: G-1 post-cutover 70/70 · G-2 위 G-1 rehearsal 24/24).
Staging G-1 을 단독 적용하게 되면, 이후 full J/K/L rehearsal 전에 다시 rollback 해야 한다 (P09E-O1).

## 2. 서비스 준비 (Production 활성화 전 해결 · DEC-063)

- `class_mode` — 출시 준비(release readiness) 미완료
- `weekly_report` — 출시 준비 미완료
- `parent_portal` — **CO-12** (Portal 만료 · 재발급 정책) 미해결
- AI 보조 — **AR-8** (외부 AI 사용 전 개인정보 최소화) 미해결 · 이번 버전에서 AI 는 필수가 아니다 · AI 는 진단 · 점수 · 자동 선택을 하지 않는다
- 학부모 화면 사진 표시 — **비활성** (CO-9 · CO-10 · DB-9 미해결)

## 3. 콘텐츠 (수업 자료)

| 주차 | 상태 |
|---|---|
| W1~8 | 운영 자료 (STARTER 8주) |
| W9~16 | 원천 자료 있음 (SOURCE EXISTS) · **MIXED** |
| W17~24 | 원천 자료 있음 (SOURCE EXISTS) · **DRAFT / PROPOSAL** |

W9~24 자료는 **존재한다.** 다만 저장소 운영 자료 · Production 준비 상태가 아니다.

## 4. 테스트 데이터 · 계정

- Staging 합성 기관 1 · 반 1 · 아동 3 · 예정 수업 4 (2026-09-29 읽기 전용 확인)
- 수업 시작 · 마치기는 되돌릴 수 없다 → 담당자가 지정한 수업에서만
- 초대 메일 · 링크 발급 · 동의 변경은 담당자 요청 시에만

## 5. 운영 보안 (담당자)

- **P09F-C1**: Staging DB 비밀번호가 운영자 스크린샷 · 대화에 노출됨 → 직원 공유 전 회전 필수
- **P09D-C2**: 이전에 노출된 Staging `SUPABASE_SECRET_KEY` → Production 서비스 활성화 전 회전 / 폐기
