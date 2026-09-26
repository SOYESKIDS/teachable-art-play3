# Permission Matrix — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | PHASE 02 승인본 (검토 반영) |
| 작성 기준일 | 2026-09-26 |
| Branch / 기준 commit | `saas-v2` / `0ceb8ad` |
| 관련 문서 | [screen-inventory.md](./screen-inventory.md) · [state-error-model.md](./state-error-model.md) · [../01-product/content-governance.md §4 · §7](../01-product/content-governance.md) |
| 관련 결정 | DEC-013 · DEC-016 · DEC-030 · DEC-031 · DEC-032 · DEC-035 · DEC-043 · DEC-044 · DEC-045 · DEC-046 · DEC-047 |

> 본 문서는 **제품 권한 경험**을 정의한다. RLS 정책 · helper · 게이팅 구현 위치는 PHASE 05 (open-items AD-2)에서 정한다.

범례: ✅ ALLOW · ⛔ DENY · ◐ CONDITIONAL
표시: **H** = HARD RULE (확정 결정) · **P** = PROVISIONAL (PHASE 03 확정 필요)

---

## 1. CURRENT 권한 기반 (기준 commit)

| 항목 | CURRENT |
|---|---|
| Proxy | `/admin/*` · `/director/*` · `/teacher/*`에서 **세션 존재만** 확인. 역할 판정은 각 페이지 · Server Action · RLS |
| HQ | `requireAdmin()` → `private.is_soyes_admin()` = `role in ('admin','sales')` → **sales가 admin과 동일 권한** (P0-15에서 분리) |
| Director / Teacher | `requireDirector()` · `requireTeacher()` = 활성 멤버십 ∧ 활성 기관. 기관 정지 시 `no_access` |
| 출결 쓰기 | `requireStaff()` — 원장도 정정 가능 |
| 관찰 · 리포트 쓰기 | `requireTeacher()` — 원장 불가 |
| 리포트 조회 | 교사: 담당 반 draft · complete / 원장: **complete만** |
| 공유 생성 · 중지 | `requireDirector()` — 원장만 |
| 상세 조회 실패 | "찾을 수 없거나 접근 권한이 없습니다" (존재 무구분) |

---

## 2. Role × Screen

| 화면 | HQ ADMIN | HQ SALES | DIRECTOR | TEACHER | PARENT SHARE |
|---|---|---|---|---|---|
| HQ 운영 대시보드 · 오픈 준비 | ✅ | ⛔ **P** | ⛔ | ⛔ | ⛔ |
| 문의 관리 | ✅ | ✅ | ⛔ | ⛔ | ⛔ |
| 기관 목록 · 기관 메타데이터 | ✅ | ◐ 메타데이터만 **H** | ⛔ | ⛔ | ⛔ |
| 기관 상세 — 원아 명단 | ✅ | ◐ **P** (IA-8) | ⛔ | ⛔ | ⛔ |
| 온보딩 · 반 · 원아 · 교사 · 프로그램 배정 · 세션 | ✅ | ⛔ **P** | ⛔ (위임 PH3-2) | ⛔ | ⛔ |
| Product / Contract (기관 상세 내부) | ✅ | ◐ 읽기 **P** | ⛔ | ⛔ | ⛔ |
| Curriculum 편집 · 검수 | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Director Dashboard | ⛔ (HQ는 `/admin`) | ⛔ | ◐ Entitlement **H** | ⛔ | ⛔ |
| 수업 운영 · 이력 · 출결 (원장) | — | ⛔ | ◐ **P** (STARTER 범위 IA-9) | ⛔ | ⛔ |
| Teacher Today | ⛔ | ⛔ | ⛔ | ✅ 담당 반 | ⛔ |
| Class Mode | ⛔ | ⛔ | ⛔ | ◐ 담당 반 · 발행 · 필수 데이터 · Entitlement · 이용 기간 | ⛔ |
| 세션 `scheduled → in_progress` (수업 시작) | ⛔ **H** (비상 강제 경로는 PHASE 05 검토 · P0 없음) | ⛔ **H** | ⛔ **H** | ◐ BEFORE 필수 확인 완료 후 Class Mode [수업 시작]만 **H** | ⛔ |
| 세션 취소 (`scheduled → cancelled` · `in_progress → cancelled`) | ✅ (CURRENT 유지) | ⛔ | ✅ (CURRENT 유지) | ✅ (CURRENT 유지) | ⛔ |
| 세션 `in_progress → completed` | ✅ (CURRENT) | ⛔ | ✅ (CURRENT) | ✅ DURING [수업 마치기] | ⛔ |
| 세션 `scheduled → completed` 직접 전환 | ⛔ **H** (Emergency Override는 PHASE 05 검토 · P0 없음) | ⛔ **H** | ⛔ **H** | ⛔ **H** | ⛔ |
| Quick Memo | ⛔ | ⛔ | ⛔ **H** | ✅ 본인 · 담당 반 **H** | ⛔ **H** |
| BEFORE 필수 확인 기록 | ◐ 조회 **P** | ⛔ | ◐ 조회 **P** | ✅ 작성 | ⛔ |
| Observation 작성 | ⛔ | ⛔ | ⛔ **H** | ✅ | ⛔ |
| Observation 조회 | ✅ (CURRENT admin) | ⛔ **H** | ◐ 읽기 | ✅ 담당 반 | ⛔ |
| Growth Report — draft · AI draft | ✅ (CURRENT admin) | ⛔ **H** | ⛔ **H** | ✅ | ⛔ |
| Growth Report — complete | ✅ | ⛔ **H** | ✅ | ✅ | ◐ Portal 경유 |
| 학부모 공유 관리 (Portal 링크 · 사진 동의) | ◐ **P** | ⛔ | ✅ | ⛔ | ⛔ |
| **Report Emergency Hide** | ✅ **H** | ⛔ **H** | ✅ **H** | ⛔ (상태 · 사유 조회만) | ⛔ |
| Child Portal | — | — | — | — | ◐ 유효 링크 · 해당 아동 · 노출 리포트만 |

- HQ SALES의 "아동 관찰기록 · 활동사진 접근 금지"는 **HARD** (project-charter §3-1 · P0-15).
- Parent Share는 계정이 아니라 링크 소지자다 (DEC-013).

---

## 3. Product Context × Feature

| Feature | STARTER | STANDARD | PREMIUM | PILOT |
|---|---|---|---|---|
| 콘텐츠 주차 범위 | Week 1~8 **H** | Week 1~16 **H** | Week 1~24 **H** | Week 1~4 **H** |
| Class Mode | ✅ **H** | ✅ **H** | ✅ **H** | ✅ **H** |
| Weekly Report | ✅ **H** | ◐ **P** (IA-15) | ✅ **H** | ✅ **H** |
| Monthly Report | ⛔ **H** | ✅ **H** | ✅ **H** | ⛔ **H** |
| Semester Report | ⛔ **H** | ✅ **H** | ✅ **H** | ⛔ **H** |
| Director Dashboard (`/director` 홈) | ⛔ **H** | ✅ **H** | ✅ **H** | ✅ **H** (검증용 별도 Entitlement) |
| 원장 수업 운영 · 리포트 조회 · 학부모 공유 | ◐ **P** (허용 권고, IA-9) | ✅ **P** | ✅ **P** | ✅ **P** |
| Child Portal | ✅ **P** | ✅ **P** | ✅ **P** | ✅ **P** |
| Report Emergency Hide | ✅ **H** (Portal이 있으면 반드시) | ✅ **H** | ✅ **H** | ✅ **H** |
| Branding | ⛔ | ⛔ | ✅ **H** (실체 BP-12) | ⛔ |
| 콘텐츠 인앱 재생 (P1) | ◐ **P** | ◐ **P** | ◐ **P** | ⛔ (P0 범위 밖) |

HARD RULE 출처: DEC-031 · DEC-032 · 사용자 PHASE 02 지시 §17.
정확한 Feature Code 목록은 PHASE 03 (BP-11).

---

## 4. Entitlement UX

| 상태 | 원장 · 교사 화면 | 메뉴 | 직접 URL 접근 | 다음 행동 |
|---|---|---|---|---|
| **ENTITLED** | 정상 | 상품 범위 전부 | 정상 | — |
| **NOT ENTITLED (기능)** 예: STARTER 대시보드 · Monthly | 기능 없음 | **숨김** | **SY-02 "현재 이용 상품에 포함되지 않은 기능"** — 상품명 · 포함 상품 · HQ 문의 경로 | 원장: HQ 문의 (업그레이드 경로는 PHASE 03) / 교사: 돌아가기 |
| **NOT ENTITLED (콘텐츠 주차)** 예: STARTER의 Week 9 | 없는 것으로 보인다 (0건) | — | SY-01 찾을 수 없음 | HQ 단계에서 배정 · 세션 생성이 막힌다 |
| **CONTRACT NOT STARTED** | 로그인 가능 · 오늘 화면에 "이용 시작일" | 수업 기능 비활성 | SY-02 "이용 기간이 아닙니다" | 시작일까지 대기 · HQ |
| **CONTRACT ENDED** | **P**: 기존 기록 읽기 전용 · 신규 수업 · Class Mode · 리포트 작성 차단 | 작성 기능 숨김 | SY-02 "이용 기간이 종료되었습니다" | HQ 갱신 문의 · 이관/파기 (IA-10 · BP-17) |
| **ORG SUSPENDED** | CURRENT 유지: `no_access` | — | `/login?error=no_access` | 원 → HQ. Portal 동작은 PHASE 05에서 확인 |
| **CONTENT NOT PUBLISHED / 필수 데이터 부족** | 세션 카드 "수업 내용 준비 중" · [수업 준비] 비활성 | — | SY-02 "수업 내용이 아직 준비되지 않았습니다" (DEC-037) | HQ |

---

## 5. 404 vs Not Entitled (DEC-044)

| 판정 | 화면 | 적용 대상 | 이유 |
|---|---|---|---|
| **찾을 수 없음** (SY-01 · 상세 화면의 무구분 메시지) | 존재 여부를 알려주지 않는다 | 다른 기관 · 다른 반 · 역할 밖 자원 · Entitlement 범위 밖 콘텐츠 · 존재하지 않는 id | 테넌트 경계에서 존재 탐지를 막는다 (AUDIT 2 방어 유지) |
| **포함되지 않은 기능** (SY-02) | 상품명 · 포함 상품 · 문의 경로 | 기관이 가진 역할 화면이지만 상품이 허용하지 않는 기능 | 숨길 이유가 없고, "고장"으로 오해받지 않게 영업 경로를 안내한다 |
| **학부모 단일 실패 화면** | 사유 없음 | Portal invalid · expired · revoked | Invariant AI-14 (실패 무구분). 사유는 원장 화면에서만 |

규칙: 메뉴 숨김은 편의다. **모든 판정은 서버가 하고, 직접 URL 접근도 같은 결론을 낸다** (AI-9 · DEC-016).
