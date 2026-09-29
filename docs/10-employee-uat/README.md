# SOYE KIDS TeachAble Art Play — 직원 내부 테스트 (Employee UAT)

> **직원 내부 테스트 버전 · STAGING ONLY · Production 아님**
> **합성(가상) 데이터만 사용 · 실제 아동 개인정보 입력 금지**

| | |
|---|---|
| 테스트 대상 | saas-v2 Preview (Staging Supabase `itcddooiuqsqingfhxkk` · 합성 데이터) · 공유 주소: `https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app` (브랜치 고정 주소 · Vercel 보호) |
| 빌드 커밋 | `79ccbba` (saas-v2) — 문서 커밋 이후 Preview 가 다시 배포되면 해당 커밋 기준 |
| 테스트 일자 | `<테스트 기간 — 담당자 기입>` |
| 판정 | **EMPLOYEE UAT READY WITH KNOWN LIMITATIONS — STAGING ONLY** (2026-09-29 · 운영자 사람 확인 HQ Admin · HQ Sales · Teacher · Director = PASS · 쓰기 작업 없이 확인) |
| 상태 요약 | G-2 ACTIVE — VERIFIED · **G-1 미적용 (원격 rehearsal 보류 · P09F-AUTH-1)** · M5 미적용 · J/K/L 미시작 |

## 문서

| 파일 | 대상 | 내용 |
|---|---|---|
| [employee-uat-guide.md](./employee-uat-guide.md) | 직원 | 접속 방법 · 역할별 계정 · 테스트 규칙 |
| [role-test-matrix.md](./role-test-matrix.md) | 직원 | 역할별 체크리스트 (현재 확인 상태 포함) |
| [known-limitations.md](./known-limitations.md) | 직원 · 운영 | 이번 테스트 버전의 알려진 제한 |
| [feedback-template.md](./feedback-template.md) | 직원 | 오류 · 개선 제보 양식 |
| [employee-share-message.md](./employee-share-message.md) | 담당자 | 카카오톡 · Slack · 이메일 공지 문구 |

## 담당자 준비 사항 (공유 전)

1. ~~Staging DB 비밀번호 회전 (P09F-C1)~~ → **RESOLVED (2026-09-29 · 노출 후 회전 완료)**. 직원은 DB 비밀번호를 쓰지 않는다.
2. 역할별 **테스트 계정 비밀번호**는 저장소 · 공지 문구에 넣지 않고 담당자가 개별 전달한다.
3. 접속 방법 (Deployment Protection 은 끄지 않는다 · 자동화 bypass 비밀을 만들지 않는다):
   - Vercel 팀 · 프로젝트 권한이 있는 직원: 보호된 saas-v2 Preview 주소를 그대로 사용
   - 권한이 없는 직원: Vercel Dashboard → teachable-art-play3 → 해당 Preview Deployment → **Share** (Shareable Link) 로 만든 링크를 개별 전달
   - **Shareable Link · 그 token 은 Git · 문서에 넣지 않는다**
4. 피드백 수집 위치 (`<문서 · 시트 링크>`)와 마감일을 공지 문구에 채운다.
