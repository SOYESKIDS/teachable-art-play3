# Design System · Accessibility

| | |
|---|---|
| 문서 상태 | PHASE 06 승인본 (문서 검토 대기) |
| 작성 기준일 | 2026-09-27 |
| 상위 문서 | [architecture-overview.md](./architecture-overview.md) |
| 관련 결정 | DEC-109 · DEC-110 · DEC-111 · DEC-112 · DEC-098 |

> 개념 token과 권장 이름까지만 정한다. 실제 CSS 변수 · Tailwind `@theme` 구현은 PHASE 07.
>
> **이 문서의 파생 색 hex와 대비 수치는 PROPOSED다.** PHASE 06 분석의 대비 계산은 인증된 사실이 아니며 PHASE 07에서 실제 contrast tool로 검증한다.

---

## 1. Direction — Warm Premium Education SaaS

| DO | DON'T |
|---|---|
| 따뜻한 중립 바탕 (Ivory) 위 흰 surface | 보라 · 인디고 AI gradient |
| 명확한 상태 (글자 + 색 + 필요 시 아이콘) | glass card · backdrop-blur 남용 |
| 근거 중심 문구 | neon · glow |
| 큰 Class Mode action | 모든 AI 기능에 sparkle 아이콘 |
| 역할별 정보 밀도 | 유아용 무지개 · 캐릭터 UI |
| 화면당 강조 1개 | Growth5 score gauge · 진행바 · 순위 |
| 짧고 조용한 transition | 발달 순위를 암시하는 progress bar |
| Pretendard 단일 계열 | 리포트 완료 confetti · bounce · gradient animation |
| visible focus | serif italic 장식 |

---

## 2. Brand Palette (DEC-109)

| 이름 | Hex | 역할 |
|---|---|---|
| Navy | #142B4A | App primary · 제목 · 주 버튼 |
| Green | #2F8F6B | positive · brand secondary |
| Coral | #F1644B | accent (마케팅 강조 · 일러스트) — **오류 색으로 자동 사용하지 않음** |
| Ivory | #F8F5EE | canvas |
| Mint | #EDF7F2 | success surface |
| Soft Blue | #EDF5FA | info surface |
| Text | #263238 | 본문 |
| Border | #E7E9EC | 장식 구분선 |

**Yellow는 Target token이 아니다.** 현재 legacy Marketing의 yellow(#f3ba18 등)는 PHASE 07 visual refactor에서 정리한다.

---

## 3. Semantic Tokens (PROPOSED naming)

| Token | 값 | 상태 |
|---|---|---|
| `--color-brand-primary` | Navy #142B4A | brand |
| `--color-brand-secondary` | Green #2F8F6B | brand · 큰 면 · 큰 글자 위주 |
| `--color-brand-secondary-text` | 진한 Green (예: ≈#257A5A) | **PROPOSED** · 본문 크기 초록 글자용 |
| `--color-accent` | Coral #F1644B | brand · 장식 |
| `--color-accent-text` | 진한 Coral (예: ≈#C2412B) | **PROPOSED** |
| `--color-surface-canvas` | Ivory #F8F5EE | brand |
| `--color-surface` | #FFFFFF | — |
| `--color-surface-success` | Mint #EDF7F2 | brand |
| `--color-surface-info` | Soft Blue #EDF5FA | brand |
| `--color-text` | #263238 | brand |
| `--color-text-muted` | 예: ≈#5B6770 | **PROPOSED** · 현재 `text-navy/45~60` 대체 |
| `--color-text-inverse` | #FFFFFF | — |
| `--color-border` | #E7E9EC | brand · 장식 |
| `--color-border-control` | 예: ≈#8A949E | **PROPOSED** · 입력칸 경계 |
| `--color-success` | Green 계열 | semantic |
| `--color-info` | 진한 Blue 계열 | **PROPOSED** |
| `--color-warning` | Amber 계열 (surface + 진한 text) | **PROPOSED** · palette 외 추가 |
| `--color-danger` | Red 계열 (예: ≈#B42318) | **PROPOSED** · Coral과 분리 |
| `--color-focus` | 명확한 focus ring 색 | **PROPOSED** |

Brand color와 semantic color를 분리한다. 색상만으로 상태를 전달하지 않는다.

**검증 목표 (PHASE 07):** 본문 텍스트는 WCAG AA 실무 baseline(일반 글자 4.5:1 수준) · UI 경계 · focus는 충분히 보이는 대비(3:1 수준). 계산 추정값을 문서 사실로 쓰지 않는다.

---

## 4. Typography

- **Pretendard 중심** (현재 `next/font/local`로 로드 중). 새 font asset 추가 없음.
- **serif italic 제거** (현재 9곳 · serif 미로드).
- 권장 scale (PROPOSED · PHASE 07 조정):

| Token | 크기 | 용도 |
|---|---|---|
| display | 40 | 마케팅 hero |
| h1 | 28 | 페이지 제목 |
| h2 | 22 | 섹션 |
| h3 | 18 | 카드 제목 |
| body | 16 | Parent · 마케팅 본문 |
| body-app | 15 | 교직원 앱 본문 |
| label | 14 | 폼 label · 버튼 |
| caption | 13 | 보조 정보 (최소 기준) |
| class-mode base | 18+ | Class Mode 본문 · 버튼 |

- 임의 px(`text-[13px]` 등) 대신 scale을 사용한다. 표의 숫자는 tabular numerals.

---

## 5. Spacing · Density · Radius · Shadow · Z-index · Motion

| 항목 | 기준 |
|---|---|
| Spacing | 4px 단위 |
| Density | Marketing 여유 · Parent 편안한 읽기 · Class Mode 큰 action · Director/HQ 고밀도. 하나의 density를 모든 역할에 강제하지 않는다 |
| Radius | control 8 · card 12 · sheet 16 · pill(full)은 칩 · 마케팅 CTA만 |
| Shadow | 카드는 테두리로 구분 · 그림자는 dialog · popover · 하단 고정 bar에만 |
| Z-index | base · sticky · header · drawer · dialog · toast 순서 |
| Motion | 150~200ms · ease-out · bounce · confetti · gradient animation 없음 · `prefers-reduced-motion` 존중 (현재 전역 대응 유지) |
| Touch target | 기본 44px 수준 · Class Mode 더 크게 (PHASE 07 확정) |

---

## 6. Components

### 6-1. Button

| 종류 | 용도 |
|---|---|
| Primary | 화면당 하나 원칙 · 핵심 비파괴 action (수업 시작 · 관찰 완료하고 다음 아이 · 리포트 완료) |
| Secondary | 보조 (임시저장) |
| Tertiary / Ghost | 낮은 우선 (나중에 작성 · 돌아가기) |
| Danger | 숨김 · 사진 삭제 · 공유 링크 중지 |
| Link | 이동 |

상태: Default · Hover · Focus · Active · Disabled · Loading. Loading 중 중복 클릭 방지. 터치 기기에서 hover에 기능을 맡기지 않는다. 현재 두 버튼 언어(마케팅 pill · 앱 직접 작성 35곳)를 하나의 token 체계로 통합한다.

### 6-2. Forms

label 항상 표시 · placeholder로 설명 대체 금지 · 필수 표시 명확 · inline validation · `aria-invalid` + 오류 문구 연결 · 저장 상태 표시 · Observation/Report는 explicit save (DEC-099).

### 6-3. Cards

종류: Summary · Action · Status · Evidence · Report Section · Metric. **카드 안에 카드를 중첩하지 않는다.** 클릭 가능한 카드는 링크/버튼 semantics와 키보드 조작을 갖춘다.

### 6-4. Tables

Director · HQ 전용. P0: responsive overflow · sort · filter · empty · loading · row actions · `<caption>` · `scope`. Sticky header는 HQ 대형 표만. Teacher · Parent mobile은 카드 목록으로 전환 (현재 패턴 유지).

### 6-5. Badge · Chip

상태 · 분류에만. **Growth5 Stage를 Parent에게 badge로 보여주지 않으며, Teacher 화면에서도 경쟁적 ranking chip처럼 보이게 하지 않는다.** 상태 badge 매핑을 하나로 통합한다 (현재 8벌 중복).

### 6-6. Dialog · Drawer (DEC-112)

- Modal: 간단 확인 · reason 입력 · 작은 편집.
- Page / Drawer: Report composer · Contract · Readiness · Observation · Support access.
- 필수: focus trap · 초기 초점 · 닫을 때 초점 복귀 · Esc · 배경 스크롤 잠금 · `aria-labelledby`.
- Confirmation 단계 (DEC-111):
  - LEVEL 1 결과 설명 + 명시적 action (사진 숨김/삭제)
  - LEVEL 2 결과 설명 + reason 필수 (Report Hide · Unhide · Session Recovery · Contract Suspend · Contract End)
  - LEVEL 3 강한 확인 (Product Version Publish) — **typed-name 확인은 P0 필수 아님**
  - Portal revoke: 확인 필수 · reason 필수 아님
  - "정말 하시겠습니까?" 남발 금지

### 6-7. Icons

기능 중심 · 장식 최소 · AI sparkle 남용 금지 · 아이콘만 있는 버튼은 accessible label 필수 · 새 icon dependency는 이번 PHASE에서 결정하지 않는다 (현재 inline SVG).

---

## 7. Responsive (DEC-110)

| 구간 | Tailwind | 대상 |
|---|---|---|
| mobile | 기본 ~ sm (<768) | Parent · Teacher 일부 |
| tablet | md (768~1023) | Class Mode · Teacher |
| desktop | lg · xl (≥1024) | Director · HQ |

- 새 custom breakpoint를 만들지 않는다.
- **Class Mode는 별도 immersive layout이며 "lg = desktop 고밀도" 규칙을 적용하지 않는다.** tablet portrait · landscape · desktop 모두 큰 action 유지.
- Parent: 단일 열 · 가로 표 없음 · 사진 responsive · 큰 글자.
- Marketing: 가격 비교표는 mobile에서 상품별 카드 + 같은 항목 순서로 변환. PILOT은 비교표의 네 번째 Tier 열이 아니라 별도 블록.

### 7-1. Page Templates

| Template | Max width | Nav | 주 행동 위치 |
|---|---|---|---|
| Marketing | 1280 | header + mobile 하단 CTA | hero · 하단 고정 |
| Teacher Task | 1100 | 탭 | 우상단 또는 하단 고정 |
| Class Mode | 전체 화면 (내용 폭 제한) | 없음 | 하단 고정 bar |
| Director Operations | 1200 | 사이드 | 머리글 우측 |
| HQ Data Table | 1440 | 사이드 | 머리글 우측 + row action |
| Parent Reading | 640 단일 열 | 탭 2개 | 인쇄는 하단 |
| Report Composer | 1100 · 두 열 | 탭 | 하단 고정 [리포트 완료] |

---

## 8. Accessibility Baseline (DEC-110)

**WCAG 2.2 AA 수준을 실무 Target baseline으로 한다. "인증 완료" · "WCAG 준수 인증" 같은 표현을 쓰지 않는다.**

| 항목 | 기준 |
|---|---|
| Keyboard | 모든 기능 키보드 조작 · Tab 순서 · Enter/Space · Esc · 표 row action · dropdown |
| Focus | 모든 조작 요소에 visible focus (현재 `focus:outline-none` 제거 필요) |
| Dialog | focus trap · 초점 복귀 · Esc · label |
| Headings | 의미 있는 heading 구조 · skip link |
| Forms | label · 오류 연결(`aria-describedby`) · `aria-invalid` |
| Touch | 충분한 target · Class Mode 더 크게 |
| Contrast | 본문 AA 실무 baseline · UI 경계 · focus 충분 대비 (PHASE 07 측정) |
| Status | 색에만 의존하지 않음 (글자 병기) · live region |
| Tables | caption · scope |
| Motion | reduced motion 존중 |
| Language | `lang="ko"` (현재 적용) |

Class Mode는 touch 우선이지만 keyboard로도 끝까지 조작할 수 있어야 한다.

---

## 9. Component Matrix

| Component | Purpose | Roles | Variants | States | Responsive | Existing |
|---|---|---|---|---|---|---|
| AppShell | 역할별 틀 | 전체 | Teacher · ClassMode · Director · HQ Admin · HQ Sales · Parent | — | 사이드 ↔ 탭 ↔ 하단 탭 | StaffShell · AdminNav → Adapt |
| RoleNav / ContextSwitcher | 메뉴 · context | 교직원 · HQ | — | current | 가로 스크롤 → 하단 탭 | OrganizationPicker → Adapt |
| Button | 행동 | 전체 | Primary · Secondary · Tertiary · Danger · Link · size | Default · Hover · Focus · Active · Disabled · Loading | touch target | Button(마케팅) + 35곳 직접 작성 → 통합 |
| StatusBadge | 상태 | 교직원 · HQ | 상태 사전 | — | — | StatusPill + 매핑 8벌 → 통합 |
| EmptyState · InlineAlert · ErrorState | 상태 안내 | 전체 | info · warning · danger · success | — | — | surface.tsx → Adapt |
| PermissionState / EntitlementState (SY-01 · SY-02) | 접근 불가 | 교직원 | 유형별 | — | — | New |
| ReadOnlyBanner · OfflineBanner | 모드 안내 | 교직원 | — | — | 상단 | New |
| ClassModeHeader · SessionPhaseBar | 단계 | Teacher | BEFORE · DURING · AFTER | — | tablet 가로 · 세로 | New |
| BeforeChecklist | 필수 확인 | Teacher | 선택 · 필수 | 남은 N | — | New |
| QuickMemo | 빠른 메모 | Teacher | — | 저장 중 · 저장됨 · 저장 실패 | side panel · bottom sheet | New |
| ObservationEditor | 관찰 | Teacher | — | 작성 중 · 관찰 완료 · 충돌 · offline | tablet | ObservationChildForm → Replace |
| GrowthMetricSelector | 관찰 포인트 | Teacher | 5 지표 × 3 방식 | 미선택 · 선택 · 방식 미선택 | 단일 열 | New |
| AiAssistPanel | C1 | Teacher | 원문 · 제안 · 확정 | 요청 중 · 실패 · 근거 부족 | 쌓기 | ObservationAiDraftSection → Replace |
| ReportComposer | Weekly | Teacher | 섹션 출처 표시 | 필수 누락 · 충돌 | 두 열 → 쌓기 | GrowthReportEditor → Replace |
| RevisionBanner | 수정본 · 최근 완료본 | Teacher · Director | — | 작성 중 · 표시 중(계산) | — | New |
| HideDialog · ConfirmDialog | 위험 행동 | Director · HQ | LEVEL 1~3 | reason 필수 여부 | mobile 전체 화면 | 모달 18개 → 공통 Dialog New |
| RecoveryDialog | 복구 처리 | Director · HQ | — | reason 필수 | — | New |
| PortalState / ShareManager | 학부모 공유 | Director | 미발급 · 공유 중 · 공유 중지 | — | — | GrowthReportShareSection → Adapt |
| ParentReportView / ParentReportCard | 아이 기록 | Parent | 이번 주 · 지난 기록 · 상세 | 로딩 · 실패 · 빈 · 업데이트됨 | 단일 열 | ParentGrowthReportView → Adapt |
| ReadinessChecklist | 활성화 | HQ | 요구사항별 | Ready · 이유 · 해결 링크 | — | AdminReadinessView → Adapt |
| ContractStatus | 계약 두 축 | HQ · Director | — | — | — | New |
| SensitiveAccessDialog | 지원 열람 | HQ Admin | — | reason 필수 | — | New |
| DataTable | 목록 | Director · HQ | sort · filter | loading · empty | mobile 카드 | 개별 표 15개 → 공통화 |
