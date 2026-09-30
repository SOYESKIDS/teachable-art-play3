# STARTER 2026.1 — W1~W8 canonical lesson content (PHASE 10E)

> **HUMAN CONTENT APPROVAL REQUIRED** — 이 폴더는 원본 교사용 수업가이드를 저장소에 옮긴 **기술 적재본**이다. 교육 내용 승인이 아니다.
> 승인 카드 · 체크박스: [docs/11-production-readiness/phase-10e-starter-content-approval.md](../../../docs/11-production-readiness/phase-10e-starter-content-approval.md)

## 원본 (Source of Truth)

| 주차 | 원본 파일 | SHA-256 (채택본 A) |
|---|---|---|
| W1 | `SOYE_KIDS_1주차_교사용_수업가이드.pdf` | `66e2182a4c75b8597152abc4bc93caad81d2bbd0ed6fb1291157110ff1004bdd` |
| W2 | `SOYE_KIDS_2주차_교사용_수업가이드.pdf` | `9a3eb15a72d3a4a92d35fb3686aaa8d26557939b037cb5bfdc2fddbe2fc83ac6` |
| W3 | `SOYE_KIDS_3주차_교사용_수업가이드.pdf` | `adf553ba41f3adbd86e79e2f14d031ead6e7e1219e283e7f27c6df25e87fd29a` |
| W4 | `SOYE_KIDS_4주차_교사용_수업가이드.pdf` | `04a4372eb72f8d7f0b413e3c5615e03a90f62c53412ee3131226ca542f6097b5` |
| W5 | `SOYE_KIDS_5주차_교사용_수업가이드.pdf` | `984c16dbb717f51b1eae4841d663291aab5395a2d1cc923c4f937e46d667aa39` |
| W6 | `SOYE_KIDS_6주차_교사용_수업가이드.pdf` | `1d6f4aa607bccbd2d5c88fd58012f426ae21608368b4f41050921390de37acce` |
| W7 | `SOYE_KIDS_7주차_교사용_수업가이드.pdf` | `7e9a557ccc6eb46f52668260972c0a2a080a4970697c14878995d4352791bf88` |
| W8 | `SOYE_KIDS_8주차_교사용_수업가이드.pdf` | `317975742c3de601cae0e5003f3761ded3be1fb449b386100fdcccf32a0dae5f` |

원본 PDF 는 저장소 밖(OneDrive 수업프로그램 폴더)에 있다. 두 판본(A: 2026-09-11 `교사용 수업 가이드` 묶음 = `자료`·`카카오톡 받은 파일` 사본과 동일 / B: 2026-09-10 `스타터 강의계획안`)이 있으며 **주차마다 추출 텍스트가 동일**하다 (PDF 포장만 다름). 세부 표는 [manifest.json](./manifest.json).

## 파일

- `manifest.json` — 프로그램 · 주차 메타데이터 · 원본 해시 · 원본 구절 번호 → DB section 대응 · 기록된 원본 충돌
- `week-0N.txt` — 주차별 17개 section 본문 (`=== <code> | <원본 절>` 줄로 구분 · 평문 · 앱은 `whitespace-pre-line` 로 표시)
- `build-sql.mjs` — 이 폴더에서 결정적 SQL 을 만든다 (`supabase/content/starter_2026_1_load.sql` · `..._publish.sql`)

## 변환 규칙 (내용을 새로 쓰지 않는다)

1. 원본 문장은 그대로 옮긴다. 표는 평문으로 풀어 쓴다: 2열 = `• 항목 — 내용`, 3열 이상 = `• 첫 열 — 머리글: 값 / 머리글: 값` (머리글은 원본 표 머리글).
2. 원본 절 번호와 DB section 코드는 **의미로** 대응한다: `s8` = 미술(·교구) 활동, `s9` = 워크북 (앱 라벨 `LESSON_SECTION_LABELS` · product-definition §7-2). 원본이 §8 워크북 · §9 미술 순서인 주차(W1 · W3~W8)는 교차 대응하며 `source_ref` 에 원본 절 번호를 남긴다.
3. `s4a/s4b/s4c` = 원본 §4 의 A 준비물 · B 공간 세팅 · C 안전 확인.
4. 표지의 공통 안내문("이 문서는 교사가 실제 수업 전에…")은 옮기지 않는다. W8 표지의 주차 고유 안내 2문장은 `s1` 앞에 옮긴다.
5. 원본에 없는 값은 만들지 않는다: 음원 · 영상 · 워크북 파일 URL 없음, `duration_minutes` = NULL (원본은 범위 "약 50~60분"), `age_group` = NULL, 7주차 음원 곡명 = 원본 미기재.

## 원본 우선순위 (PHASE 10E)

1. 주차별 교사용 수업가이드 (사용자 화면 제목 · 내용)
2. 24주 구조 문서 — `TeachAble_ArtPlay_24주_강의교안_데이터구조` 는 **로컬에서 찾지 못함**. 교차 참조로 `SOYE_KIDS_24주_개발자료_통합본.pdf` (sha256 `eae6f5e9…a415d` · 2026-09-09 정리본)를 사용했다 — 교육 내용의 출처가 아니라 교차 확인용
3. 현재 DB 합성 차시(`STAGING-P8 (가상)`)는 권한 없음
