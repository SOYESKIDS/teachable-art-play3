# Sales & Privacy Boundary — TeachAble Art Play SaaS Platform 2.0

| | |
|---|---|
| 문서 상태 | PHASE 03 승인본 (검토 반영) |
| 작성 기준일 | 2026-09-27 |
| Branch / 기준 commit | `saas-v2` / `b31fdc9` |
| 관련 문서 | [entitlement-policy.md](./entitlement-policy.md) · [open-items.md](./open-items.md) · [../02-ia/permission-matrix.md](../02-ia/permission-matrix.md) |
| 관련 결정 | DEC-013 · DEC-014 · DEC-036 · DEC-043 · DEC-044 · DEC-058 · DEC-059 · DEC-060 |

> **이 문서는 법적 판단을 하지 않는다.** 제품 운영 책임과 노출 경계만 정한다. 동의의 법적 요건 · 문구 · 보존 기간은 법무 검토 대상이며 [open-items.md](./open-items.md)에서 관리한다.

---

## 1. HQ Admin / Sales Boundary (DEC-058)

| 영역 | HQ ADMIN | HQ SALES |
|---|---|---|
| Lead | ✅ | ✅ |
| Institution metadata · Contact | ✅ | ✅ |
| Product / Contract metadata | ✅ 조회 · 변경 | ✅ **조회만** |
| Contract dates / status | ✅ 조회 · 변경 | ✅ 조회만 |
| Class count · Child count aggregate · Teacher count aggregate · Overage aggregate | ✅ | ✅ |
| Readiness summary | ✅ | ✅ |
| **Child name list** | ✅ | **⛔** |
| Child detail | ✅ | ⛔ |
| Observation · Child Voice · Growth 5 · Stage | ◐ **blanket 조회 없음** — server/RPC + 사유 + audit (*DEC-093* · CURRENT는 전체 조회) | ⛔ |
| Photo · Report | ◐ **blanket 조회 없음** — server/RPC + 사유 + audit (*DEC-093* · CURRENT는 전체 조회) | ⛔ |
| Portal token / link | ⛔ (원장이 발급) | ⛔ |
| Consent per child | ✅ 상태 확인만 (§2) | ⛔ |
| Emergency Hide | ✅ (DEC-043) | ⛔ |
| Contract state mutation (활성화 · 정지 · 종료 · 범위 변경) | ✅ | ⛔ |
| 온보딩 쓰기 (반 · 원아 · 교사 · 배정 · 세션) | ✅ | ⛔ |

**근거**: 영업에는 규모(수치)가 필요하고 아동 신원은 필요하지 않다. project-charter §3-1의 원칙을 원아 명단까지 확장한다.

**CURRENT와의 차이**: 현재 `private.is_soyes_admin()`이 `role in ('admin','sales')`로 판정해 sales가 admin과 동일 권한이다. 분리는 P0-15 (구조 DEC-079 · 구현 PHASE 07). *PHASE 05 추가 확정(DEC-093)*: HQ Admin도 민감 교육 콘텐츠를 client-side로 직접 조회하지 않는다.

---

## 2. Photo Consent Operational Ownership (DEC-059)

| 주체 | 제품 운영 책임 |
|---|---|
| **Director** | 아동별 **Consent State**를 시스템에 기록한다 (DR-08). 동의서 원본은 기관이 관리한다 (P0 시스템은 상태만 보관) |
| **Teacher** | BEFORE에서 상태를 확인한다 (DEC-036 필수 확인). Weekly에서 **공개 가능한 사진만** 선택한다 |
| **HQ Admin** | 운영상 필요한 Consent State 확인만 한다 (Pilot Ready G-8 · 지원). 동의서 내용은 열람하지 않는다 |
| **HQ Sales** | **접근 금지** |
| **Parent** | Portal에 Consent State 자체를 **노출하지 않는다** |

| 상황 | Product Requirement |
|---|---|
| 동의 미확인 · 비동의 | 해당 아동 사진은 리포트 선택 불가 · Portal 사진 영역 미표시 (사유 비노출) |
| **Consent withdrawal** | 향후 해당 아동의 **공개 사진 노출 중단을 지원**해야 한다. 이미 공개된 리포트의 처리 범위 · 방식은 PHASE 05 (법무 검토 결과 반영) · *DEC-088: 철회 = 표시 적격 false (조회 시 계산 · 완료 리포트의 사진 reference도 표시 중단) · 삭제가 아님 · 물리 삭제는 CO-2 · CO-9 · CO-10* |
| 기록 | 상태 변경의 who · when (구조는 DEC-088: 아동별 상태 · recorded_by · recorded_at · 증빙 참조 · audit) |
| *운영 상태의 의미 (DEC-088)* | `consented`는 운영 기록이며 **법적 공개 허가를 의미하지 않는다.** `unknown` · `declined`는 공개 불가. 외부 학부모 사진 공개의 Production 활성화는 **CO-9 · CO-10 · DB-9 해결 후** |

---

## 3. Parent Exposure Boundary

| 학부모에게 보이는 것 | 보이지 않는 것 |
|---|---|
| 공개된 리포트 (complete ∧ Portal 활성 ∧ 숨김 아님) | draft · AI draft · Quick Memo (DEC-030 · DEC-035) |
| 선택된 사진 (동의 전제) | Consent State · 동의 여부 사유 |
| 실제 week · date (DEC-060) | 결석 · 교사 미작성 · 미공개 사유 (DEC-060) |
| 아동 · 반 · 기관명 (CURRENT DTO) | 숨김 리포트 · 숨김 사유 (DEC-043) |
| — | 링크 실패 사유 (invalid · expired · revoked 무구분 · DEC-044) |
| — | 계약 상태 · 상품 정보 |

---

## 4. Legal Review Separation

제품 문서가 **법적 결론을 사실처럼 만들지 않도록** 다음을 분리한다.

| 항목 | 제품이 정한 것 | 법무 검토 대상 (미확정) | Open |
|---|---|---|---|
| 동의의 법적 단위 | 아동별 상태를 원장이 기록 | 아동 단위 충분 여부 · 촬영과 공유 분리 필요 여부 | CO-10 |
| 동의 문구 | — | 문구 · 보호자 고지 방식 | CO-10 |
| 개인정보처리방침 정합 | 현재 문구와 설계의 차이를 식별 (L-1 사진 · L-2 30일) | 개정 문구 · 개정 시점 | CO-10 · CO-12 |
| 단체 사진 | 교사가 공개 가능한 사진만 선택 | 다른 아동이 식별되는 사진의 처리 | CO-9 |
| 데이터 보관 · 파기 · Export | 자동 삭제 없음 · 파기는 별도 절차 (DEC-052) | 보관 기간 · 파기 시점 · Export 형식 | CO-2 |
| Portal 링크 만료 | 아동 1명 = 링크 1개 (DEC-040) | 장기 링크 보안 · 계약 종료 후 유지 | CO-12 |

위 CO-2 · CO-9 · CO-10 · CO-12는 **Production Blocker**다 ([open-items.md §1](./open-items.md#1-production-blocker)).
