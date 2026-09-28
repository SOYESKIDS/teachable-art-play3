# PHASE 08 — Open Items

미확정 사항은 Decision 이 아니다 (decision-log R-6). PHASE 08 에서 **해석으로 구현했지만 사람 확인이 필요한 것**,
**남은 transitional risk**, **이월**을 적는다. 기존 blocker 는 해소하지 않았다.

## 1. 사람 확인 필요 (구현된 해석)

| ID | 항목 | 현재 구현 | 확인할 것 |
|---|---|---|---|
| P08-OPEN-4 | 동의 운영 상태별 사진 처리 | `declined` = 업로드 · Weekly 사용 거부 · `consented` = 운영상 사용 가능 · `unknown`/기록 없음 = 업로드 허용(반 내부 기록) · Weekly 선택 거부 · Portal 사진은 모든 상태에서 없음 | `unknown` 업로드 허용 · `declined` 업로드 거부를 운영 규칙으로 유지할지 (법적 효력 판단은 이 항목의 범위가 아니다 · CO-9 · CO-10 · DB-9 OPEN) |
| P08-OPEN-6 | legacy 공유 링크의 원아 상태 | 퇴소(`inactive`) = 닫힘 · 졸업(`graduated`) = 열림 (새 Portal 과 같게) | 졸업 · 퇴소 원아의 링크 · Portal 처리 정책 (감사 D13) |
| P08-OPEN-8 | G-1 이후 before_start 에서 **수업 일정 등록** 허용 | 시작 전 계약의 반 · 주차 범위 안에서 일정 등록 가능 · 수업 진행 · 기록 불가 | contract-policy "준비(반 · 원아 · 배정) 가능 · 수업 불가" 의 "수업" 에 일정 등록이 포함되는가 |
| P08-OPEN-7 | 구성원 등록 사유 | 초대 화면에 입력칸이 없어 "HQ 원장/교사 초대 (기관 관리 화면)" 를 사유로 남김 · 역할/상태 변경 RPC 는 UI 없음 | 사람 입력 사유칸 · 구성원 변경 UI 시점 (HQ UI 는 PHASE 08 범위 밖) |

## 2. 남은 transitional risk (솔직한 목록)

| ID | 항목 | 설명 | 줄이는 방법 · 닫는 시점 |
|---|---|---|---|
| P08-OPEN-1 | J → L 사이 직접 status UPDATE | saas_v2 모드 서버 Action 은 거부하지만, PostgREST 직접 UPDATE 는 G-1 전에는 판정 없이 · G-1 후에는 반 쓰기 가능 반에서 BEFORE · 교사 전용 · audit 없이 상태를 바꿀 수 있다. DB 는 배포 env 를 읽지 않는다 | J/K/L 을 한 controlled window 에서 연속 수행 (start gate · window preflight) · M5 에서 회수. **현재 Staging Preview(saas_v2 · M5 미적용)에도 해당** |
| P08-OPEN-2 | D2 PRE G-2 | HQ Sales · HQ Admin 의 구성원 직접 DML 이 G-2 전까지 남는다 (현재 Production legacy 초대 호환) | G-2 · `G2_db_preflight.sql` active Sales ≥ 1 이면 G-2 escalation |
| P08-OPEN-3 | 수업 시작 예정일 정책 | 예정일 전 · 후 시작 허용 여부가 문서에 없다. DB 는 판정하지 않음 | 정책 결정 후 |
| P08-OPEN-5 | G-1 적용 창 | G1001 은 적용 순간 onboarding 중(초안뿐 · 시작 전)이면서 운영 중 반이 있는 기관도 차단한다 (cutover-time guard · 적용 후 onboarding 에는 관여 안 함) | 적용 창에서 mapping · 정지 정리 |
| P08-OPEN-9 | AI 식별자 검사의 한계 | 원아 이름(2자 이상) · 이메일 · 전화 · UUID 만 본다. 자유 텍스트 비식별화를 보장하지 않는다 | AR-8 정책 결정 |
| P08-OPEN-10 | legacy AI 의 실제 효과 | PHASE 08 앱이 배포되면 계약 · ai_assist 가 없는 모든 현재 기관에서 legacy AI 가 꺼진다 (DEC-114 결과). 배포 전에는 이전 앱이 env 만 본다 | Production 배포 결정 (사람) |
| P08-OPEN-11 | D7 계정 삭제 | 출결 · 관찰 gate 는 FK 정리 UPDATE 를 통과시키지만, 다른 불변 trigger(리포트 등)의 계정 삭제 영향은 다루지 않았다 | 이월 |
| P08-OPEN-12 | audit 공백 | PHASE 08 은 구성원 변경 · legacy 리포트 숨김 · cutover 적용만 추가. class_teachers · 기관 status · 원아 이동 · 커리큘럼 · 세션 start/finish · 리포트 완료 · AI 생성 · 출결은 audit 없음 | 이월 |
| P08-OPEN-13 | 앱 모드 검사의 테스트 | legacy 수업 Action 의 saas_v2 거부는 정적 검사(node:test)로만 확인. Next 런타임 E2E 없음 | local · remote E2E 단계 |

## 3. 적용 · 실행하지 않은 것 (의도)

- PHASE 08 일반 migration 6개: Staging 미적용 · Production 미적용 (local 만)
- G-2 · G-1 · M5: 어디에도 적용하지 않음 (local transaction · local 실행으로만 검증)
- Remote Staging role-by-role E2E: 실행하지 않음 (GAP 유지)
- Production active HQ Sales 계정 수: 원격 조회하지 않음 → G-2 DB preflight 필수 항목
- 앱 배포 · Vercel 변경 · git stage/commit/push: 하지 않음

## 4. 해소하지 않은 기존 blocker (그대로 OPEN)

CO-2 · CO-8 · CO-9 · CO-10 · CO-12 · DB-9 · AR-8 · IB-1~7 · BC-* · BP-* · PH3-2 (원장 교사 초대) ·
Portal 사진 비공개 유지 · W9~24 콘텐츠 승인 없음 · legal 문구 변경 없음.
