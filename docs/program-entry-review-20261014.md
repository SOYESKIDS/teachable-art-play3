# SOYESKIDS 수업하기 수정 패키지 — 다운로드 재발급

기준 커밋: 3231acb1c8b5472fe8a3cfc5435fc13d42d16739

이전 다운로드 링크의 파일이 사라져 대화의 구현 내용을 복원하고 다시 검사한 패키지입니다. 이전 패키지의 바이트 단위 복제본이라고 주장하지 않습니다. 적용 범위와 기능은 동일하며 검증 결과는 아래와 같습니다.

## 변경 내용

- 헤더 수업하기 → /learning → /login?entry=learning → 인증·소속 확인 → 프로그램 선택.
- STARTER /learning/starter: 1~8주.
- STANDARD /learning/standard: 1~16주.
- PREMIUM /learning/premium: 1~24주.
- /learning/[program]/weeks/[weekNo]: 기존 준비·가이드·수업·관찰·결과보고 5탭 공유.
- 기관 관리와 수업 입구 분리. 일반 기관 로그인은 기존 역할별 목적지 유지.
- 프로그램 선택으로 이용권·역할이 바뀌지 않음. 본문 조회 전에 서버에서 계약 범위 확인.
- 이용권 조회 오류와 계약 없음 구분. 기존 교사 주차 URL도 서버 검사.
- 발행된 내용만 service 경로로 읽음. draft 발행·internal_review 호출·DB 실패 시 fixture 대체 없음.
- class_sessions에는 week_no가 없으므로 curriculum_lessons.id → class_sessions.lesson_id로 회차 조회 수정. 정확한 lessonId가 있으면 다른 버전은 조회하지 않음.
- 교사·원장의 관찰/결과보고 링크를 실제 역할 경로로 연결. 미래 회차 가드·공유 잠금·쓰기 가드·RLS 유지.

## 앞선 작업의 읽기 전용 DB 확인 결과

- 운영의 요청된 테스트 계정은 활성 director 역할 1건. 같은 기관에 사용자당 역할 한 행을 저장하는 UNIQUE(organization_id,user_id) 제약 있음.
- 스테이징에 요청된 이메일 Auth 사용자 없음.
- 운영에 contracts/product_versions/organization_entitlements(uuid) 없음. 스테이징에 contracts/organization_entitlements(uuid) 있음.
- 운영 DB에서 차시→회차 JOIN SQL 실행은 성공했고, 요청된 계정 소속 기관의 1주차 회차 5건 집계.
- 이 결과는 앞선 작업에서 확인한 값이며 파일 재발급 중 원격 DB·계정을 다시 변경하지 않음. Preview의 연결 ref는 확인되지 않음.
- 동일 이메일로 두 로그인 입구를 만들더라도 독립 교사·관리자 계정 두 개가 되지 않음. 순수 교사 권한·담당 반 범위 검증에는 별도 교사 계정 필요.

## Claude Code 적용 지시

1. D:\소예키즈\tap3-integration-20261012의 feat/platform-finish-20261012에서 HEAD와 미커밋 변경 확인. 메인 작업 폴더 덮어쓰기 금지.
2. 첨부 SOYESKIDS-program-entry.patch에 git apply --check 후 적용. 이미 적용됐으면 중복 적용하지 말 것. 후속 커밋과 충돌하면 직접 대조할 것.
3. npm run lint, npm test, npm run build, npx tsc --noEmit 실행 후 개발 브랜치에 commit·push. Preview URL 보고.
4. Preview의 Supabase ref를 비밀값 없이 확인. 스테이징 연결·키 회전 상태·합성 계정이 확인된 환경에서 로그인 검증.
5. 수업 입구로 로그인한 교사와 원장이 프로그램 선택으로 가는지, 일반 기관 로그인은 기존 업무 화면으로 가는지 확인.
6. 375·768·1440·1536px에서 프로그램 카드·메뉴·5탭·빈 상태 확인.
7. 8주 계약으로 9·16·24주 본문 직접 URL 차단 확인. draft를 임의 발행하지 말 것.
8. 유효 계약·발행 콘텐츠·담당 반·실제 회차가 갖춰진 스테이징에서만 준비→수업→관찰→결과보고 검증. 미래 회차 가드 해제 금지.
9. UI 구현 완료 / 계정·DB 설정 대기 / 브라우저 검증 대기를 구분해 보고. 원격 migration·계정 변경·발행·main 병합·Production 승격은 이 파일 재발급에 포함되지 않음.

## 검증

재발급본 최종 검사 결과는 패키지 VALIDATION.txt 참조.
실제 계정 로그인·Preview 브라우저·기록 저장은 아직 검증 대기.
비밀번호·서버 키·원격 자격 증명은 포함하지 않음.
