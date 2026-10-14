# E단계 — 선행 migration 대조 · 화면 연결 상태 · 적용 순서

기준 커밋: `c081be8` + 이번 보완분
작성: 2026-10-14

---

## 1. 원격 적용 이력 대조

ChatGPT 가 읽기 전용으로 확인한 현재 원격 상태:

| 항목 | 값 |
|---|---|
| 프로젝트 | SOYESKIDS's Project |
| ref | `vpppxuhodwauaclhybtg` |
| 상태 | ACTIVE_HEALTHY |
| 적용 migration | **21건** |
| 없는 것 | `lesson_sections` · `lesson_assets` · `product_versions` · `contracts` 등 |

저장소에는 **48건**이 있다 (E1·E2·E3 포함). 없는 표가 전부 `m1_commerce_entitlement_foundation`
이후에 생기므로, 원격은 **#1~#21 (2026-09-04 `harden_admin_access_execute` 까지)** 로 보인다.

### 미적용 27건

| # | 파일 | E1·E2·E3 가 필요로 하나 |
|---:|---|---|
| 22 | `20261001090000_m1_hq_roles_audit_foundation` | **필수** — `private.is_hq_admin()` · `set_updated_at_clock()` |
| 23 | `20261001091000_m1_commerce_entitlement_foundation` | **필수** — `lesson_sections` · `products` · `product_versions` · `contracts` · `required_lesson_sections()` |
| 24 | `m1_class_operation_foundation` | 간접 — `contract_classes` (E3 범위 판정) |
| 25 | `m1_report_portal_foundation` | 아니오 |
| 26 | `m2_fact_backfill_reference_seed` | **적재에 필요** — starter/standard/premium 2026.1 상품 버전 seed |
| 27 | `m3_hq_role_foundation` | 아니오 |
| 28 | `m3_commerce_contract_readiness` | 아니오 (계약 활성화 게이트) |
| 29~31 | `m3_*_rpcs` · `m4_report_portal_rpcs` | 아니오 |
| 32 | `p08_membership_authority` | 간접 — E3 가 쓰는 `is_assigned_class_teacher` 는 #7 에 있다 |
| 33~38 | `p08_*` · `p10c_release_controls` | 아니오 |
| 39 | `d3_lead_notification_outbox` | 아니오 — **단, 적용 불가 상태였다 (아래)** |
| 40 | `c3_portal_expiry_rate_limit` | 아니오 |
| 41 | `b2_lesson_assets` | 아니오 (자료 등록) |
| 42~45 | `c3b` · `d3b` · `c2b` · `b2b` | 아니오 |
| 46 | `e1_lesson_content_structure` | — |
| 47 | `e2_lesson_publish_gate` | — |
| 48 | `e3_publish_lock_and_scope` | — |

### ⚠️ 적용을 막던 결함 (이번에 고침)

`20261012090000_d3_lead_notification_outbox.sql` 의 `payload` CHECK 제약 안에
**서브쿼리**가 있었다. PostgreSQL 은 이것을 거부한다 (`cannot use subquery in
check constraint`). 이 migration 은 원격에 적용된 적이 없어 드러나지 않았다.

→ 허용 키 검사를 `private.lead_outbox_payload_keys_allowed()` immutable 함수로
빼내 고쳤다. **이 줄이 고쳐지기 전에는 #39 이후를 하나도 적용할 수 없었다.**

같은 결함이 E1 에도 있었고(본사 결정 `affected_weeks` 범위 검사) 같은 방식으로 고쳤다.

### 최소 적용 순서

E1~E3 만 올리려 해도 아래가 먼저다. **검토 없이 일괄 적용하지 않는다** —
#23 은 상거래·권한 구조 전체를 들여오므로 그 자체로 검토 대상이다.

```
#22 m1_hq_roles_audit_foundation          (is_hq_admin · set_updated_at_clock)
#23 m1_commerce_entitlement_foundation    (lesson_sections · product_versions · contracts)
#24 m1_class_operation_foundation         (contract_classes — E3 범위 판정)
#26 m2_fact_backfill_reference_seed       (상품 버전 seed — 적재의 상품 연결)
#39 d3_lead_notification_outbox           (위 결함 수정본. 이후 migration 의 선행)
… (#25·#27~#38·#40~#45 는 E 단계와 무관하지만 순서상 사이에 있다)
#46 e1_lesson_content_structure
#47 e2_lesson_publish_gate
#48 e3_publish_lock_and_scope
--- 이후 (migration 아님) ---
supabase/content/tap24_2026_1_load.sql    (호출자가 begin/commit)
```

적재는 `product_versions` 행이 없으면 상품 연결만 건너뛰고 나머지는 적재된다
(`if found then` 으로 감쌌다). 그러나 #26 없이 적재하면 **상품 ↔ 프로그램 연결이
비어** 교사 경로가 교안을 찾지 못한다.

---

## 2. 화면 연결 상태

`CONTENT_SOURCE` 환경변수가 출처를 정한다. **기본값은 `fixture`** 다 —
부르는 쪽이 깜빡하면 지금 동작하는 쪽으로 떨어진다.

| 경로 | 지금 출처 | DB 연결 | 비고 |
|---|---|---|---|
| `/teacher/weeks/[weekNo]` | 게이트 | **완료** | `loadWeekContent()` · 계약 → 상품 버전 → 프로그램 |
| `/admin/curriculum/weeks/[weekNo]` | fixture + DB 상태 배너 | 부분 | 본문은 fixture, 적재 여부는 DB 에서 읽어 배너로 구분 |
| `/admin/curriculum/weeks` (목록) | fixture | **미연결** | 24주 지도는 메타만 — 본문이 아니다 |
| `/admin/.../[weekNo]/preview` | fixture | **미연결** | 검수 미리보기 |
| `/admin/.../[weekNo]/quick-guide` | fixture | **미연결** | 인쇄용 |
| `/teacher/weeks/[weekNo]/quick-guide` | fixture | **미연결** | 인쇄용 |
| `src/lib/class/stage-queries.ts` (교실 화면) | fixture | **미연결** | 장면은 `list_lesson_scenes_for_class` RPC 로 옮겨야 한다 |
| `/curriculum` (공개) | — | 해당 없음 | 본문을 내보내지 않는다 |

### 아직 연결하지 않은 이유

migration 이 원격에 없다. 연결해 두면 적용 전까지 모든 화면이 깨진다.
게이트를 둔 이유가 그것이고, 게이트가 열렸을 때 **실패가 드러나도록** 설계했다.

### 조용한 대체를 하지 않는다

`database` 모드에서 조회가 실패하면 fixture 로 넘어가지 않는다. 교사 화면은
「수업 내용을 열지 못했습니다 + 이유」를 보여주고 멈춘다.
이전 내용을 대신 보여주면 교사는 저장된 것과 다른 내용으로 수업한다.

---

## 3. 적용 뒤 전환 순서

```
1) 선행 migration 검토 후 적용 (#22·#23·#24·#26 ··· #39 수정본 ··· )
2) E1 → E2 → E3
3) supabase/content/tap24_2026_1_load.sql 적재
4) Preview 에서 CONTENT_SOURCE=database 로 확인
     · 교사 주차 화면이 DB 본문으로 뜨는가
     · 계약 범위 밖 주차가 보이지 않는가
     · 본사 검수 화면 배너가 「데이터베이스 적재본」으로 바뀌는가
5) 남은 경로(미리보기·퀵가이드·교실 화면) 연결
6) 운영 반영
```

---

## 4. 되돌리기

```
E3_publish_lock_and_scope_rollback.sql   ← 먼저
E2_lesson_publish_gate_rollback.sql
E1_lesson_content_structure_rollback.sql ← 마지막 (body_json 이 사라진다)
```

E3 를 되돌리면 **발행 우회·게시본 장면 수정·범위 밖 열람**이 다시 열린다.
되돌리기 전에 발행 기능을 먼저 내린다.
