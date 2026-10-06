# Final Design Audit (PHASE DESIGN-FINAL · 변경 전)

> 2026-10-06 · branch `design-final-polish` (from `content-final-polish` @ `257ee49`) · 작성 시점 코드 변경 0
> 근거: 로컬 production build 스크린샷(공개 화면 · 5 viewport) · 코드 검색 · [design-system-v3.md](./design-system-v3.md) · [final-content-system.md](./final-content-system.md)
> 로그인 화면(교사 · 원장 · 본사 · 영업)은 로컬에 Staging 인증 환경이 없어 **코드 기준으로만** 감사했다 (§7).

## 1. 현재 visual 문제 (요약)

| # | 문제 | 영향 |
|---|---|---|
| V-1 | **Navy 면이 홈에 12곳** — 문제 결론 상자 · 콘텐츠 "관찰 기록" · 수업 "교사 관찰 기록" · 여정 8주 · AI 상자 · 원장 예시 머리 · PREMIUM 카드 · 데모 상자 · Final CTA · Footer. 강조가 강조로 읽히지 않는다 | 리듬 · 위계 |
| V-2 | **Final CTA 와 Footer 가 같은 navy-deep** — 하나의 거대한 남색 덩어리 | 마감 · 분리 |
| V-3 | 타입 스케일이 지침보다 크다 — 섹션 h2 최대 42px, display 60px | 과한 무게 |
| V-4 | 섹션 세로 여백 lg 112px(`py-28`) — 4px 시스템 상한(96) 밖 · 빈 공간 과다 | 스크롤 길이 |
| V-5 | 상품 카드: PREMIUM 만 navy 면 → "추천 상품" 템플릿처럼 보임 · 가격이 28px 로 카드에서 가장 큼 | 가격표 템플릿 느낌 |
| V-6 | Growth5 "기록 없음" 칸이 점선 · 회색 글자 → 비활성/실패처럼 보인다 | 원칙 위반 소지 |
| V-7 | Hero 에 떠 있는 요소 3개(배지 · 보조 사진 · 수업안 카드) | 산만 |
| V-8 | 폼 성공 · 오류 메시지 41곳이 예전 `soft-coral` · `soft-green` — **Coral 을 오류 색으로 쓰고 있다** (DEC-109 위반) | 의미 색 혼동 |
| V-9 | 운영 화면 카드 hover 에 그림자(SessionCard · TodayFocusPanel) — 대시보드는 선 중심이어야 한다 | 대시보드 톤 |
| V-10 | 곡률: 카드 18 · 큰 면 24 — 운영 화면에는 조금 둥글다 | 절제 |

## 2. Public homepage (13 섹션)

| 섹션 | A 5초 | B 리듬 | C 카드 반복 | 판단 |
|---|---|---|---|---|
| Hero | ✓ | — | 떠 있는 카드 3 | 보조 사진 제거 · 수업안 카드 1개만 |
| Problem | ✓ | 원 배지 + navy 상자 | 4 | 편집형: 번호 · 선 · 문장. navy 상자 → 문장 + coral 선 |
| Flow | ✓ | 아이콘 5 | — | 유지 · 설명 줄 간격만 |
| Content | ✓ | 5행 리스트 | 5 | "관찰 기록" 행 navy → green(기록 = 성장 색) |
| Session | ✓ | 5카드 + 3카드 | 8 | 기록 카드 navy → green · 교사 지원 카드는 선 3단으로 가볍게 |
| Journey | ✓ | 3 그룹 | 8 | 유지 (8주 navy = 목적지 1곳) |
| Growth5 | ✓ | 칩 + 단계 + 가이드 + AI navy | — | 기록 없음 = 다른 단계와 같은 재질 · AI 상자 navy → soft blue |
| Roles | ✓ | 3 같은 카드 | 3 | 교사 = 하루 순서, 원장 = 상태 2×2, 학부모 = 준비 중 차분하게 |
| Dashboard | ✓ | 예시 화면 | — | 유지 |
| Product | ✓ | PREMIUM navy | 3 | 세 카드 같은 재질 · 가격 한 단계 작게 |
| Adoption | ✓ | 6박스 + navy 데모 | 6 | 한 줄 타임라인 · 데모 상자 ivory |
| Trust | ✓ | 선 목록 | — | 유지 |
| Final CTA | ✓ | navy-deep + footer 붙음 | — | ivory 바탕 위 navy 패널로 분리 |

## 3. Teacher (코드 기준)
- 위계: h1 오늘의 수업 → 오늘 먼저 할 수업 패널 → 현황 숫자 → 섹션별 카드. 패널이 KPI 보다 위에 있어 순서는 맞다.
- 개선: 패널 hover 그림자 제거 · "오늘의 수업"(h2) 섹션과 "진행 중인 다른 날 / 지난 예정"을 시각적으로 구분(지난 예정은 warning 선).
- **sticky nav 반복 현상**: `StaffShell` 머리글은 문서에 **1개**(`<header class="sticky top-0">`)다. `position: fixed` 아님. full-page 캡처 도구가 스크롤하며 이어 붙일 때 sticky 요소가 각 조각에 찍히는 **캡처 artifact** 로 판단 → 변경하지 않음.

## 4. Director (코드 기준)
- /director(대시보드 권한) = 오늘 운영 요약 → 확인이 필요한 기록 → 반별 오늘 수업 → 최근 리포트 (UI-02). 순서 유지.
- /director/sessions = 반별 오늘 현황 → 카드. 교사 화면 복사본처럼 보이지 않게 현황 표를 위로 (유지).

## 5. Admin
- 사이드바 248px · 활성 = primary-soft + coral 막대 (유지).
- 표: `table.ts` 공통 클래스가 3개 표에만. 숫자 · 날짜 열 정렬 · `tabular-nums` 가 표마다 다르다.

## 6. Sales
- 최대 폭 1440 · 문의 표 + 상세 패널. 넓은 화면에서 표가 비어 보이는 문제는 로컬에서 확인 불가 — 코드상 폭 제한 없음(1440).

## 7. Responsive
- 공개 4페이지 × 390/768/1024/1366/1440: 가로 넘침 0 · 콘솔 오류 0 (CONTENT-FINAL QA).
- 로그인 화면은 로컬 렌더 불가(Supabase env 없음 · `/admin/*` proxy 500) → 코드 기준 · Staging Preview 확인 필요.

## 8. Typography
- 임의 font-size 10곳(404 숫자 · 공유 리포트 제목 등). 스케일: display 34–60 · h1 30–44 · h2 28–42 · h3 19–24 → 지침(Display 48–56 · H2 30–36 · H3 22–26)보다 h2 가 크다.

## 9. Spacing
- 섹션 `py-20/24/28`(80/96/112) · compact `py-16/20/24`. 112 는 시스템 밖.
- 임의 margin 7곳(`mt-[3px]` 아이콘 정렬 등) — 아이콘 기준선 맞춤용이라 허용.

## 10. Button
- 마케팅 `buttonClasses`(primary · secondary · tertiary · inverse · inverse-outline) + 앱 `appButton`(primary · secondary · ghost · danger · danger-outline). 의미 중복: 마케팅 secondary 와 primary 가 같은 navy 면.
- loading 상태: 로그인 버튼에만 spinner. 다른 버튼은 문구로 표시("저장 중…") — 허용.

## 11. Form
- `field.ts` 공통 · 3.08:1 테두리 · focus 링 · aria-invalid. 성공/오류 메시지 색이 파일마다 soft-coral/soft-green (V-8).

## 12. Table
- `table.ts`: 머리 12px · 본문 14px · hover primary-soft. 3개 표만 사용, 나머지(원장 리포트 · 학부모 공유 · 영업 기관)는 각자 클래스.

## 13. Accessibility
- skip link · focus-visible · Dialog focus trap · 44px 목표 · heading 1개(h1) 유지.
- 리스크: 홈 Growth5 단계 `dl` 안 회색 글자 대비, 상품 카드 navy 위 white/55 라벨(4.6:1 경계).

## 14. Design debt
- 예전 토큰 `soft-coral` · `soft-green`(장식 전용으로 남겼으나 메시지 색으로 쓰임) · `trust-blue`(링크 · 정보 — 유지).
- `rounded-lg` 219 · `rounded-xl` 146 · `rounded-2xl` 61 — 의미 없이 섞임(토큰 값으로 정리).

## 15. 수정 우선순위

| P | 항목 |
|---|---|
| **P0** | V-8 Coral 오류 색 → danger/success 토큰 · V-6 기록 없음 표현 · V-2 Final CTA/Footer 분리 |
| **P1** | V-1 navy 면 정리 · V-5 상품 카드 같은 재질 · V-3 타입 스케일 · V-4 섹션 여백 · V-7 Hero 단순화 |
| **P2** | V-9 대시보드 그림자 · V-10 곡률 토큰 · Roles 역할별 위계 · Adoption 타임라인 |
| **P3** | 표 공통 클래스 확대 · 임의 font-size 10곳 · 마케팅 secondary 버튼 정리 |

## 16. P1 BUSINESS COPY DECISION (DESIGN-FINAL PATCH · 2026-10-06)

| 항목 | 내용 |
|---|---|
| 위치 | 공개 Footer 브랜드 마감 문장 · `src/data/site-copy.ts` `brandMessage.coreMessage` → `src/components/layout/Footer.tsx` |
| 현재 문구 | "활동은 남습니다. 성장은 남지 않습니다." |
| 문제 | 문제 제기(지금은 성장이 기록되지 않는다)로 쓰인 문장이 페이지 **마지막 브랜드 문장**으로 놓여, 핵심 메시지 "아이의 놀이를, 성장 이야기로 기록합니다."와 반대로 읽힐 수 있다 (방문자가 마지막에 "성장은 남지 않는다"를 읽고 떠난다). |
| 이번 patch 조치 | **변경하지 않음.** 공개 문구는 그대로 두고 결정만 요청한다 (CONTENT LOCK). |
| 결정 필요 | 1) 유지 · 2) Footer 에서 빼고 문제 섹션 문맥으로만 사용 · 3) 승인된 다른 브랜드 문장(예: Final CTA 위 "수업은 끝나도, 아이의 과정은 기록으로 남습니다.")으로 교체 — 셋 중 하나를 운영자가 정한다. |
| 영향 범위 | Footer 1곳 (`brandMessage.coreMessage` 는 다른 화면에서 쓰지 않음) |
