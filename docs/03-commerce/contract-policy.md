# Contract Policy — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | PHASE 03 승인본 (검토 반영 · Pilot 15명 HARD 명확화 2026-09-27) |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `b31fdc9` |
| 관련 문서 | [commerce-overview.md](./commerce-overview.md) · [entitlement-policy.md](./entitlement-policy.md) · [admin-flow.md](./admin-flow.md) · [open-items.md](./open-items.md) |
| 관련 결정 | DEC-018 · DEC-032 · DEC-049 ~ DEC-054 · DEC-063 |

> Contract State는 제품 상태 정의이며 DB enum이 아니다 (PHASE 05). 기간 숫자 · 보관 · 파기 · 결제 정책은 확정하지 않는다.

---

## 1. Contract Unit (DEC-049)

**Contract Unit = Organization × Product Version × Contract Class Scope × Contract Period**

| 후보 | 평가 |
|---|---|
| A. 기관 단위 | ✖ 가격이 "1개 반 · 15명 기준"이라 반 수를 표현하지 못함 |
| B. 기관 × 반 | ✖ 반 수만큼 계약 · 갱신. 기관 기능(원장 대시보드)과 불일치 |
| C. 기관 × Program | ✖ 상품(기능)과 프로그램(콘텐츠) 혼동 |
| **D. 기관 × Product Version × Class Scope × Period** | **채택** — 가격 근거와 일치 · 추가 반은 범위 변경 · 대시보드는 기관 기능 · 향후 B2G는 Offer 유형으로 확장 |

### 1-1. ONE EFFECTIVE CONTRACT AT A TIME

한 기관에는 **같은 시점에 효력이 발생하는 정규 계약이 최대 1개**만 존재할 수 있다.

| 함께 존재 가능 | 이유 |
|---|---|
| `draft` 계약 | 효력 없음 |
| 미래 시작일의 **Renewal** Contract | 현재 계약 종료일 다음부터 효력 |
| 미래 시작일의 **Upgrade** Contract | 적용일부터 효력. 현재 계약은 적용일에 종료 |

```
2027-03 ──────────── 2027-04-30 │ 2027-05-01 ─────────── 2027-08-31
[ STARTER · active · in_service ]│[ STANDARD · active · before_start ]  ← 병존 가능
                                  └ 같은 날 효력 발생하는 계약은 항상 1개
```

- 효력 기간이 겹치는 두 정규 계약은 허용하지 않는다 (날짜 조정으로 해소).
- Pilot Offer는 별도 유형이다 (§9). Pilot과 정규 계약의 효력 기간 겹침 허용 여부는 PHASE 05에서 명시한다 (권고: 겹침 불가 — 전환일에 Pilot 종료). *→ DEC-082: **Pilot도 같은 기관에서 정규 Contract와 동시에 effective하지 않는다** (ONE EFFECTIVE CONTRACT AT A TIME · 강제 방식은 PHASE 07)*
- 한 기관 안에서 반별로 다른 상품을 동시에 계약하는 구조는 미결정 → **CO-6**.
- **기존 1.0 운영 기관**은 Contract Record가 없다. Entitlement 기능 제한을 적용하기 전에 HQ가 기존 기관마다 계약을 소급 등록해야 한다 (PHASE 05 · 07 전환 과제). *→ DEC-094: 영구 bypass 모드 없음 · M3 전 모든 active production 기관은 사람이 검증한 Contract mapping 또는 service disabled / non-production 분류 · **가짜 Contract 자동 생성 금지***

---

## 2. Contract Status (DEC-050)

| 상태 | 의미 |
|---|---|
| `draft` | HQ 작성 중. 서명 · 발주 확인 전. 효력 없음 |
| `active` | HQ가 확인 · 활성화. 효력은 날짜 파생 상태에 따름 |
| `suspended` | 상업적 사유로 정지 (미납 · 분쟁 · 계약 위반 등) |
| `ended` | 종료 (기간 만료 · 해지 · 후속 계약으로 대체) |

| 날짜 파생 상태 (개념 · *DEC-082: 저장하지 않고 계산*) | 조건 | 서비스 |
|---|---|---|
| `before_start` | `active` ∧ 오늘 < Start Date | 로그인 · 준비(반 · 원아 · 배정) 가능. **수업 · Class Mode · 리포트 작성 불가** |
| `in_service` | `active` ∧ Start Date ≤ 오늘 ≤ End Date | 정상 |
| `expired` | `active` ∧ 오늘 > End Date | `ended`와 동일하게 취급. HQ가 종료 사유를 기록해 `ended`로 확정 |

**Contract active ≠ Organization active**

| | Organization Status | Contract Status |
|---|---|---|
| 성격 | 테넌트 존재 · **보안 · 전면 차단** 스위치 (CURRENT) | **상업적 권한** |
| 정지 시 교직원 | 로그인 불가 (`no_access`) | 로그인 가능 · Read-only |
| 정지 시 학부모 | Portal 실패 화면 | 기존 공개 리포트 유지 (§4) |
| 우선순위 | **Organization suspended가 우선** (DEC-052) | — |

---

## 3. Activation (DEC-050 · DEC-063)

**서비스 활성화 = HQ 확인 AND Start Date 도래** (C안)

| 조건 | 내용 |
|---|---|
| HQ 확인 | 서명 · 발주 등 계약 체결 사실을 HQ admin이 확인하고 `active`로 전환 |
| Start Date | 시작일 도래 시 `in_service`. 즉시 시작은 시작일을 오늘로 둔다 |
| **DEC-063 Service Ready** | 상품의 필수 콘텐츠 · 기능이 Service Ready가 아니면 **활성화 불가** |
| **Payment Status** | **조건이 아니다.** B2B/B2G에서 입금 전 서비스 개시는 정상 관행. 미납 시 정지 여부는 HQ 운영 판단이며 시스템이 자동 정지하지 않는다 |

- 온보딩 준비(반 · 원아 · 배정)를 `draft`에서도 허용할지는 PHASE 05에서 정한다. 권고: `before_start`에서 허용.

---

## 4. Suspension (DEC-052)

| | Contract `suspended` | Organization `suspended` |
|---|---|---|
| 용도 | 미납 · 분쟁 · 계약 위반 | 보안 사고 · 법적 요청 · 전면 차단 |
| 교직원 | 로그인 가능 · **Read-only** · "이용이 일시 정지되었습니다" (사유 비노출) | 로그인 불가 |
| 새 작업 (Class Mode · Observation · Report 작성 · 새 Publish) | **차단** | 차단 |
| 학부모 | 이미 공개된 리포트 표시 유지 · 새 공개 · 새 링크 발급 없음 | Portal 실패 화면 (무구분) |
| 재개 | HQ가 사유와 함께 `active` 복귀 · 권한 즉시 복원 | HQ |

- 학부모 Portal을 계약 정지와 함께 끊지 않는다. 기관과 회사 사이의 상업적 사유로 보호자가 이미 받은 기록을 잃지 않게 하기 위해서다. 링크 자체의 만료는 CO-12 정책을 따른다.

---

## 5. End / Read-only (DEC-052)

| 대상 | 종료 즉시 | Read-only 유예 중 | 유예 종료 후 |
|---|---|---|---|
| 새 수업 · Class Mode · Observation · Report 작성 · 새 Publish | **차단** | 차단 | 차단 |
| 기존 Attendance · Observation · Complete Report 조회 · 인쇄 | 가능 (Read-only) | 가능 (Read-only) | 교직원 로그인 시 이용 종료 안내 |
| Parent Portal | **기존 공개 링크 별도 정책** — 새 공개 · 새 링크 · 재발급 없음 | 동일 | 링크 정책(CO-12)에 따름 |
| 데이터 | 보존 | 보존 | 보존 → **자동 삭제 없음.** 파기는 별도 확인 절차 |
| Export | 요청 시 HQ 처리 (P0 수동) | 동일 | 동일 · 형식은 CO-2 |

| 모델 비교 | 평가 |
|---|---|
| A. 종료 즉시 전체 차단 | ✖ 마지막 주 확인 · 인쇄 불가 |
| B. Staff Read-only 유예 | ○ |
| **C. B + Parent Portal 별도 정책** | **채택 (P0 기본값)** |
| D. 기관별 계약 조건 | P0 기본값 위에 계약서로 조정 가능 (현재 약관: 개별 계약 우선) |

**확정하지 않는 것**

| 항목 | 관리 |
|---|---|
| Read-only 유예 기간 길이 | **CO-1** |
| Data Retention · 삭제 · 파기 시점 · Export 형식 | **CO-2 · Production Blocker** |
| 법적 보존 기간 | 법무 확인 대상. 추측하지 않는다 |

운영 안내: 마지막 주 리포트 작성을 위해 **계약 종료일은 마지막 수업 이후로 설정**하는 것을 HQ 체크리스트에 둔다. 시스템에 별도 마감 기간을 만들지 않는다.

---

## 6. Upgrade (DEC-053)

**후속 Contract** 생성 → 적용일에 효력 · 기존 계약은 적용일에 `ended` (사유: 업그레이드).

| 질문 | 답 |
|---|---|
| 기존 Contract 수정? | 아니오. 후속 Contract |
| Entitlement 확장 | 적용일에 즉시 (당일 가능) |
| Content 주차 확장 | 적용일부터 확장 범위 배정 가능 · 프로그램 구조 **CO-7** |
| Dashboard | 적용일에 활성 · 기존 기록으로 즉시 계산 |
| 과거 리포트 · Portal | **변경 없음** · 링크 유지 |
| 기록 | **삭제 · 재생성 없음** |
| 가격 차액 | 견적 · 계약서로 처리. **P0 일할 계산 · 청구 로직 없음** |

STARTER → STANDARD · STANDARD → PREMIUM · STARTER → PREMIUM 모두 같은 절차. 대상 상품은 DEC-063 Service Ready여야 한다.

---

## 7. Downgrade (DEC-053 · DEC-055)

**Renewal 시점에서만 허용** (기간 중 불가).

| 기존 자산 | 다운그레이드 후 |
|---|---|
| 작성된 Monthly · Semester Report | 조회 · 인쇄 · Portal 표시 유지. **새 작성만 불가** |
| Dashboard | 화면 접근 불가 (NOT ENTITLED 안내). 데이터 그대로 · 재업그레이드 시 즉시 복원 |
| Week 17~24 등 범위 밖 주차 기록 | 이력에서 조회 가능 · 해당 주차 새 세션 불가 |
| Branding | 새 화면 미적용 · 이미 발행된 산출물 불변 (P2) |
| Portal | 유지 |

**Access 감소 ≠ Data 삭제.** 삭제는 파기 절차(CO-2)에서만 일어난다.

---

## 8. Renewal (DEC-053)

| 유형 | 처리 |
|---|---|
| Renew Same Product | **후속 Contract** · 기존 계약은 종료일에 `ended` (사유: 갱신) |
| Upgrade · Downgrade 갱신 | 후속 Contract (상품 변경) |
| End | 갱신 없음 → §5 |
| 단순 날짜 조정 (휴원 · 일정 변경) | **현재 Contract 수정** · reason · audit 필수 |

신규 Contract를 만드는 이유: 기간마다 상품 버전 · 반 범위 · 가격 근거가 독립 기록으로 남아 감사 추적이 가능하다. 학기 전환 절차(반 재편성 · 원아 진급 · 프로그램 재배정)는 PH3-8 이월 항목과 함께 정한다.

---

## 9. Pilot Offer (DEC-054)

| 항목 | 정의 |
|---|---|
| Offer 유형 | `pilot` — 정규 Product 등급이 아니며 **STARTER 할인판이 아니다** |
| Entitlement (고정) | `class_mode` · `weekly_report` · `parent_portal` · `director_dashboard` · Content Week 1~4 |
| 한도 | 반 최대 2 · 반당 15명 · 교사 2~4 · 4주 (DEC-032) |
| 가격 · 무료 여부 | **UNKNOWN** — 공개 문구 "파일럿 운영 조건은 담당자 상담을 통해 안내드립니다" → **CO-3** |
| 정규 전환 | 후속 정규 Contract. **organization · class · child · teacher · record · report · portal 유지.** STARTER 전환 시 같은 프로그램으로 Week 5부터 이어서 운영 가능 (프로그램 구조 CO-7) |
| 미전환 | §5 End 모델 → 롤백 · 파기 계획 (Pilot Go G-12) |
| STARTER 할인판이 아닌 이유 | STARTER에 없는 대시보드가 포함되고, 한도가 가격 조건이 아니라 검증 조건이다 |

---

## 10. Class / Child Limits (DEC-051)

| 대상 | 정규 상품 | Pilot |
|---|---|---|
| **서비스 반 수** (프로그램 배정 활성 반) | Contract Class Scope 초과 불가 → **프로그램 배정 HARD BLOCK**. 반 자체 생성은 가능 (준비 · 보관) | 최대 2 · HARD |
| **반당 원아** | 16번째 이상 등록 허용 → **ALLOW + OVERAGE RECORD** (*DEC-095: 현재 초과 = 계산값 · 15→16 · 16→15 경계만 이벤트 기록 · Billing Ledger 없음*) | 준비 과정에서 16명 이상 등록은 가능(경고). 그러나 child count > 15이면 **Pilot Ready = FALSE · Pilot Activation BLOCK** — **P0에서 HQ reason으로 override 불가.** 15명 초과 Pilot 허용은 향후 별도 Business Decision 필요 |
| 교사 수 | 제한 없음 (근거 없음) | 2~4 · Pilot Ready 점검 |
| 청구 | **자동 청구 없음** (DEC-018) · 산정 시점 · 방식은 BP-6 | — |

| 상황 | 처리 |
|---|---|
| 16번째 원아 등록 | 정규: 등록 + 초과 1명 기록 · HQ와 기관 화면에 표시 / Pilot: 등록은 경고 후 가능하나 **Pilot Ready 불가 · Activation 차단 · override 없음** (DEC-051) |
| 추가 반 | Class Scope 안이면 배정 가능. 초과 시 **계약 범위 변경 먼저** (reason · audit) |
| 반 이동 | 인원 재계산 · 과거 기록은 원래 반에 유지 (CURRENT 비대칭 권한) |
| 퇴소 | 원아 비활성 · 인원 감소 · **기록 유지** |
| 재등록 | 같은 원아 기록 재활성화 · 중복 생성 금지 · 기록 연속 |
| 계약 좌석 감소 | 현재 서비스 반 수 미만으로 줄일 수 없음 → 배정 먼저 종료 · 데이터 삭제 없음 |
| 계약 좌석 증가 | 변경 적용일부터 배정 가능 |
