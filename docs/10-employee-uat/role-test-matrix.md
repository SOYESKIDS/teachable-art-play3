# 역할별 테스트 체크리스트 (직원 UAT)

> STAGING ONLY · 합성 데이터만 · 실제 아동 개인정보 입력 금지 · Production 아님

현재 상태 표기: **PASS (사람 확인)** = 운영자가 브라우저에서 확인 · **HUMAN UAT PENDING** = 아직 사람 확인 전 · 자동 테스트 결과는 사람 확인을 대신하지 않는다.

## 본사 영업 (HQ Sales) — `/admin/login` · `staging-hq-sales@example.test` — **HUMAN UAT PENDING**

- [ ] 로그인 후 영업 화면(`/sales/leads`)으로 이동
- [ ] 문의 관리 (`/sales/leads`) 목록 · 필터
- [ ] 기관 영업 현황 (`/sales/organizations`)
- [ ] `/admin/...` 주소를 직접 입력해도 본사 관리자 화면이 보이지 않음 (영업 화면으로 돌아가거나 권한 없음)
- [ ] 아동 이름 · 관찰 · 리포트 · 사진 · Growth5 가 보이지 않음

## 본사 관리자 (HQ Admin) — `/admin/login` · `staging-hq-admin@example.test` — **PASS (사람 확인 · 2026-09-29)**

- [x] 로그인
- [x] 운영 대시보드
- [x] 서비스 오픈 준비
- [x] 새 기관 도입
- [x] 기관 관리
- [x] 수업 프로그램
- [x] 상품 · 기능
- [x] 기관 문의 관리
- (초대 메일 보내기는 테스트하지 않습니다 — 실제 메일 발송)

## 교사 (Teacher) — `/kindergarten` · `staging-teacher@example.test` — **HUMAN UAT PENDING**

- [ ] 로그인
- [ ] 오늘의 수업
- [ ] 수업 이력
- [ ] 성장리포트 목록
- [ ] 수업 카드 → 수업 준비(BEFORE) 화면 진입 (**수업 시작은 담당자가 지정한 경우에만**)
- [ ] 버튼 · 레이아웃 정상
- 참고: G-1(계약 기반 쓰기 제한)이 Staging 에 아직 적용되지 않았다. **"계약 범위 밖 쓰기 차단"은 이번 UAT 로 확인된 것이 아니다** (local 자동 테스트만 PASS).

## 원장 (Director · STARTER) — `/kindergarten` · `staging-director@example.test` — **HUMAN UAT PENDING**

- [ ] 로그인 후 `/director/sessions` (수업 현황)
- [ ] 수업 이력
- [ ] 출결 확인 (조회)
- [ ] 관찰 기록 (읽기 전용)
- [ ] 성장리포트 (완료 Weekly)
- [ ] 학부모 공유 · 동의 화면 (발급 · 변경은 담당자 요청 시에만)
- [ ] STARTER 에서 원장 대시보드(집계 · 누락 자동 탐지 · 일괄 인쇄)가 **나오지 않음**

## 화면 · 공통

| 항목 | Desktop | Tablet | Mobile |
|---|---|---|---|
| 깨진 화면 없음 | [ ] | [ ] | [ ] |
| 500 오류 없음 | [ ] | [ ] | [ ] |
| 느린 화면 없음 | [ ] | [ ] | [ ] |
| 버튼 작동 | [ ] | [ ] | [ ] |
| 한글 오탈자 없음 | [ ] | [ ] | [ ] |
| 뒤로가기 정상 | [ ] | [ ] | [ ] |
| 로그아웃 정상 | [ ] | [ ] | [ ] |
| 권한 밖 화면 · 정보 노출 없음 | [ ] | [ ] | [ ] |

## 참고 — 자동 · DB 증거 (사람 확인을 대신하지 않음)

- Staging DB (읽기 전용 · 2026-09-29): G-2 ACTIVE — VERIFIED (HQ Sales 는 legacy 관리자 권한 · 민감 표 정책에서 제외) · 비합성 사용자 0
- local rehearsal (PHASE 09C · 로컬 Supabase · 합성 계정): 45 PASS · 1 CUTOVER_PENDING(Sales `/admin` — Staging 에서는 G-2 로 해소)
- PHASE 09D POST-G2 사람 확인 (Sales · Admin · Teacher · Director 읽기 화면) PASS — 이번 직원 UAT 는 그 이후 빌드 기준으로 다시 확인한다
