# 직원 공지 문구 (카카오톡 · Slack · 이메일)

담당자가 `< >` 부분을 채워서 보낸다. 비밀번호 · Shareable Link token 은 이 문서에 넣지 않는다.

---

**[SOYE KIDS] TeachAble Art Play 직원 내부 테스트 시작 안내**

안녕하세요. TeachAble Art Play **직원 내부 테스트(Staging)** 를 시작합니다.
이 버전은 **실제 서비스(Production)가 아닌 테스트 버전**이며, 화면의 기관 · 반 · 아동은 모두 **가상(합성) 데이터**입니다.

▶ 테스트 주소: `<Preview URL 또는 공유 링크 — 개별 전달>`
▶ 기간: `<시작일> ~ <마감일>`

▶ 역할별 계정 (비밀번호는 담당자가 **개별로 따로** 전달합니다)
- 본사 관리자: staging-hq-admin@example.test  → `/admin/login`
- 본사 영업: staging-hq-sales@example.test  → `/admin/login`
- 원장: staging-director@example.test  → `/kindergarten`
- 교사: staging-teacher@example.test  → `/kindergarten`

▶ 꼭 지켜 주세요
- **실제 아동 · 학부모 이름 · 연락처 · 사진을 절대 입력하지 마세요.** (가상 데이터만)
- 수업 시작 · 마치기, 초대 메일, 링크 발급, 동의 변경은 담당자 안내가 있을 때만 해 주세요.
- 비밀번호를 단체방 · 문서 · 스크린샷에 남기지 마세요.

▶ 참고
- 일부 기능은 아직 준비 중입니다 (계약 기반 쓰기 제한 G-1 Staging 적용 보류 등). 자세한 내용: `docs/10-employee-uat/known-limitations.md`
- 체크리스트: `docs/10-employee-uat/role-test-matrix.md`

▶ 오류 제보: `<피드백 문서 · 시트 링크>` 에 아래 양식으로 남겨 주세요.
테스트 역할 / 페이지 / PC·모바일 / 정상·오류 / 무엇을 눌렀는지 / 기대한 결과 / 실제 결과 / 재현 가능 여부 / 스크린샷 / 긴급도(서비스 중단 · 주요 기능 문제 · 일반 오류 · UI/문구 개선)

감사합니다.
