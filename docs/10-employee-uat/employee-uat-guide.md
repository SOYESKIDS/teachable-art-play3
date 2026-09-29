# SOYE KIDS TeachAble Art Play — 직원 내부 테스트 안내

> **직원 내부 테스트 버전 · STAGING ONLY · Production(실제 서비스) 아님**
> **화면의 기관 · 반 · 아동은 모두 합성(가상) 데이터입니다. 실제 아동 · 학부모 개인정보를 절대 입력하지 마세요.**

## 1. 접속 주소

| 구분 | 주소 |
|---|---|
| 테스트 사이트 (Preview) | `<Preview URL — 담당자 전달>` |
| 본사 관리자 · 영업 로그인 | `<Preview URL>/admin/login` |
| 원장 · 교사 로그인 | `<Preview URL>/kindergarten` (안 되면 `<Preview URL>/login`) |

- 홈페이지 첫 화면에는 본사 관리자 로그인 버튼이 **일부러 없습니다**. 위 주소로 직접 들어가세요.
- Vercel 로그인 화면이 먼저 나오면: Vercel 팀 권한이 있는 분은 로그인, 없는 분은 담당자가 보내 준 **공유 링크**로 들어오세요.

## 2. 역할별 테스트 계정

| 역할 | 로그인 주소 | 계정 |
|---|---|---|
| 본사 관리자 (HQ Admin) | `/admin/login` | `staging-hq-admin@example.test` |
| 본사 영업 (HQ Sales) | `/admin/login` | `staging-hq-sales@example.test` |
| 원장 (Director · STARTER) | `/kindergarten` (또는 `/login`) | `staging-director@example.test` |
| 교사 (Teacher) | `/kindergarten` (또는 `/login`) | `staging-teacher@example.test` |

**테스트 비밀번호는 담당자가 별도 전달합니다.** 비밀번호를 채팅방 · 문서 · 스크린샷에 남기지 마세요.

## 3. 테스트 규칙

1. **실제 아동 · 학부모 이름 · 연락처 · 사진을 입력하지 않습니다.** 메모 · 관찰 · 리포트에 글을 쓸 때는 "테스트", "가상" 같은 문구만 씁니다.
2. **초대 메일 보내기 · 링크 발급 · 동의 변경 · 숨김 처리**는 담당자가 요청한 경우에만 합니다 (공용 테스트 데이터가 바뀝니다).
3. **수업 시작 · 수업 마치기**는 한 번 하면 되돌릴 수 없습니다. 담당자가 지정한 수업에서만 진행합니다. 그 밖에는 화면 확인 위주로 봅니다.
4. 오류 · 이상한 문구 · 깨진 화면을 보면 [feedback-template.md](./feedback-template.md) 양식으로 제보합니다. 스크린샷에 비밀번호가 보이지 않게 해 주세요.
5. PC · 태블릿 · 휴대폰에서 모두 한 번씩 확인해 주세요.

## 4. 무엇을 보면 되나요

역할별 체크리스트: [role-test-matrix.md](./role-test-matrix.md)
이번 버전에서 아직 안 되는 것: [known-limitations.md](./known-limitations.md)
