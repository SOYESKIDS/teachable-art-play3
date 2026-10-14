# 쓰기 보호 범위 — 어디가 가드를 지나고 어디가 지나지 않는가

기준 커밋: `3ad5cbd` + 이번 보완분 · 작성 2026-10-14

> 목적: 비운영 배포(Preview · 로컬)가 **운영 Supabase 에 쓰는 것**을 막는다.
> 판정은 `src/lib/env/deployment-guard.ts`, 호출 지점은
> `src/lib/env/write-guard.ts` 의 `guardWrite()` / `tryGuardWrite()` 하나다.

---

## 1. 판정 규칙 (이번에 바뀐 것)

```
세트 불일치(project_mismatch)   → 배포 종류와 무관하게 막는다
URL·공개키 없음(incomplete)      → 막는다
BLOCK_WRITES_ON_PRODUCTION_DATA ≠ "1"  → 통과 (아무것도 바뀌지 않는다)
운영 배포(VERCEL_ENV=production)       → 통과 (실제 접수를 막지 않는다)
비운영 배포 + 차단 설정 "1" →
      운영이라고 확인됨        → block_non_production_on_production
      운영이 아니라고 확인됨   → 통과            ← 정상 스테이징 쓰기
      확인하지 못함            → block_target_unverified   ★ 새로 막는다
```

### 왜 「확인하지 못함」을 막나

이전에는 통과시켰다 (`nonProductionOnProductionData !== true` → allow).
그러면 `SUPABASE_PRODUCTION_PROJECT_REF` 를 빠뜨린 환경에서 차단 설정만 켜 두고
**막혀 있다고 믿게 된다.** 실제로는 운영에 그대로 쓴다.
보호 장치가 꺼져 있는 것보다 **켜져 있다고 착각하는 쪽**이 더 나쁘다.

대가: 차단 설정을 켜려면 운영 ref 도 같이 설정해야 한다. 빠뜨리면 쓰기가 전부
막히고, 막힌 이유는 `/admin/readiness` 의 `missingSettings` 에 변수 **이름**으로
나온다 (값은 담지 않는다).

---

## 2. 쓰기 경로 대조표

`src/` 전체에서 insert · update · upsert · delete · rpc · storage.upload ·
auth.admin 을 쓰는 파일 43개를 훑었다.

### 2-1. 가드를 지나는 경로 (26)

| 묶음 | 파일 | 비고 |
|---|---|---|
| 본사 운영 | `admin/.../curriculum/{actions,lesson-actions,activity-actions,section-actions}.ts` · `.../lessons/[lessonId]/asset-actions.ts` | `guardWrite()` |
| 본사 운영 | `admin/.../organizations/{actions,[id]/class-child-actions,[id]/class-program-actions,[id]/contract-actions,[id]/teacher-assignment-actions}.ts` | 원장 초대(`auth.admin`)도 여기서 지난다 |
| 본사 운영 | `admin/.../program-assignments/[assignmentId]/class-session-actions.ts` · `products/actions.ts` · `onboarding/onboarding-actions.ts` | |
| 상담 | `admin/.../leads/{actions,notification-actions}.ts` | 발송 모듈은 이 action 을 거친다 |
| 교직원 | `lib/staff/{attendance,class-mode,session,observation-v2,observation-media,observation-media-hide,weekly-report,period-report,growth-report-share,lesson-asset-download}-actions.ts` | |
| **공개 상담 폼** | `lib/public/lead-submit-actions.ts` | `tryGuardWrite()` → 화면 문구 |
| **차시 발행** | `lib/weeks/lesson-publish-actions.ts` | ★ 이번에 추가 |
| **보호자 공유 제한 기록** | `lib/share/portal-throttle.ts` | ★ 이번에 추가 |

### 2-2. 이번에 메운 구멍

| 경로 | 무엇이 샜나 | 어떻게 막았나 |
|---|---|---|
| `lib/weeks/lesson-publish-actions.ts` | `publish_lesson` RPC 가 가드 없이 나갔다. 발행은 교사·교실 화면에 내용을 **내보내는** 쓰기다 | `guardWrite("weeks/lesson:publish")` 를 첫 줄에 |
| `lib/share/portal-throttle.ts` | `register_portal_access_attempt` 는 읽기처럼 보이지만 **제한 기록을 쓴다.** 비운영 배포가 운영의 제한 기록을 더럽히면 실제 보호자 조회가 막힌다 | `tryGuardWrite()` → `reason: "write_blocked"` · 조회도 제공하지 않는다 (기존 fail-closed 와 같은 결) |
| `lib/staff/observation-media-actions.ts` 의 **prepare** | finalize 만 막혀 있었다. 파일은 브라우저가 Storage 로 직접 올리므로, DB 행이 안 생겨도 **사진은 이미 버킷에 들어간 뒤**였다 | prepare 에서 `tryGuardWrite()` → 저장 경로를 발급하지 않아 업로드가 시작되지 않는다 |

### 2-3. 가드가 없고, 없어도 되는 것 (읽기)

`rpc` 를 쓰지만 **읽기 전용**인 모듈들이다. 쓰기가 아니므로 가드를 걸지 않는다.

| 파일 | RPC |
|---|---|
| `lib/auth/admin.ts` | `has_soyes_admin_access` · `current_hq_role` |
| `lib/entitlement/queries.ts` | `organization_entitlements` · `class_entitlements` |
| `lib/ai/ai-assist-gate.ts` | `ai_assist_authorization` |
| `lib/curriculum/lesson-asset-queries.ts` · `lesson-asset-download.ts` | `list_lesson_assets_for_class` · `lesson_asset_download_status` |
| `lib/weeks/week-content-source.ts` | `list_lesson_scenes_for_class` |
| `lib/admin/{admin-dashboard,contract,readiness,lesson-asset-admin}-queries.ts` | `hq_*` · `contract_readiness` · `list_lesson_assets_for_admin` |
| `lib/admin/director-invite.ts` | `auth.admin.listUsers` · `getUserById` (조회만. 초대 자체는 가드를 지나는 action 에 있다) |
| `app/sales/organizations/page.tsx` | `hq_sales_organization_summary` |
| `app/api/share/*/resolve/route.ts` | `read_shared_growth_report` · `read_child_portal_guarded` (쓰기인 제한 기록은 위 2-2 에서 막는다) |
| `lib/admin/lead-notification-delivery.ts` | 쓰기 RPC 를 쓰지만 호출자(`notification-actions.ts`)가 가드를 지난다 |

### 2-4. 브라우저에서 직접 쓰는 경로

| 경로 | 지금 상태 |
|---|---|
| 공개 상담 폼 | **없다.** `LeadForm` 은 `submitLeadAction` (Server Action) 을 부른다. 예전의 client insert 는 남아 있지 않다 |
| 활동 사진 Storage 업로드 | 남아 있다 (8MiB 파일을 Server Action body 로 보내지 않기 위해서다). 다만 **prepare 가 막히면 시작되지 않는다** (2-2) |

---

## 3. 테스트로 확인한 것

`tests/write-guard.test.mjs` — 19건. 실제 DB 에 붙지 않는다.

- 판정: 운영 통과 · 차단 설정 꺼짐 통과 · 비운영+운영DB 차단 ·
  **정상 스테이징 통과** · **확인 불가 차단** · ref 파싱 실패 차단 ·
  로컬도 비운영 · 세트 불일치는 배포 종류 무관 차단 · 요약에 비밀값·URL·ref 없음
- **막혔을 때 호출이 나가지 않는 것**: Supabase 를 흉내 낸 가짜 클라이언트에
  `insert`/`update`/`upsert`/`delete`/`rpc`/`storage.upload`/`auth.admin` 호출 수를
  세어 **전부 0** 인지 본다
- 공개 상담 폼: 막히면 `blocked` + insert 0회 / 입력 오류는 가드보다 먼저 /
  허니팟은 성공처럼 보임 (기존 동작 유지)
- 보호자 공유 제한 기록: 막히면 RPC 0회 · **통과하면 1회** (막기만 하는 게 아니다)

> 테스트는 `next/headers` 를 스텁으로 바꿔 끼운다 (`tests/stubs/next-headers.mjs`).
> 그 스텁은 호출되면 **던진다** — 가드가 새어 Supabase 클라이언트를 만들면
> 그 자리에서 테스트가 깨지게 하기 위해서다.

---

## 4. CONTENT_SOURCE 는 배포 하나에 하나다

`contentSourceMode()` 는 `process.env.CONTENT_SOURCE` 를 읽는다. 서버 프로세스
하나에 값 하나이고, **요청·역할·사용자별로 나뉘지 않는다.**

### 그래서 「교사는 fixture · 본사는 database」는 한 배포에서 불가능하다

| 설정 | 교사 화면 | 본사 검수 화면 |
|---|---|---|
| `fixture` | 저장소 전사본 | 저장소 전사본 (DB 적재본을 못 본다) |
| `database` | **DB** — 발행 전이면 열리지 않는다 | DB 적재본 (draft 포함) |

`database` 로 두면 교사·교실 화면도 함께 DB 를 본다. 적재 직후는 전부 draft 이므로
정식 경로는 「수업 내용을 열지 못했습니다」가 된다. 그 상태를 피하려고 임의
발행하는 것은 **하지 않는다** — 검수하지 않은 내용이 아이들 화면에 뜬다.

### 검수용 환경을 분리하는 절차

같은 DB 를 보되 `CONTENT_SOURCE` 만 다른 **배포를 하나 더** 둔다.

```
1) Vercel 에서 검수 전용 브랜치를 하나 둔다 (예: review/content-20261014)
   — 코드는 개발 브랜치와 같게 유지한다. 다른 것은 환경변수뿐이다.
2) 그 브랜치 Preview 의 환경변수를 Branch 범위로 지정한다
     CONTENT_SOURCE=database
     NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY = 스테이징
     SUPABASE_PRODUCTION_PROJECT_REF = 운영 ref
     BLOCK_WRITES_ON_PRODUCTION_DATA = 1
   ★ Vercel 환경변수는 Environment(Production/Preview/Development) 범위가
     기본이고, Branch 를 지정하면 그 브랜치 배포에만 적용된다.
     지정하지 않으면 **모든 Preview 가 database 로 바뀐다** — 그러면 교사 화면
     검증이 함께 막힌다.
3) 업무 흐름 검증은 기존 Preview(CONTENT_SOURCE 미설정 = fixture)에서,
   콘텐츠 검수는 이 검수 전용 Preview 에서 한다.
4) 본사 검수가 끝나고 발행까지 마친 뒤에, 기존 Preview 의 CONTENT_SOURCE 를
   database 로 올린다. 그때는 교사 화면도 발행본을 본다.
```

브랜치 범위 환경변수를 쓸 수 없으면 **Vercel 프로젝트를 하나 더** 만들어 같은
저장소를 연결하고 그 프로젝트에만 `CONTENT_SOURCE=database` 를 둔다. 둘 중
어느 쪽이든, 한 배포 안에서 역할별로 나누는 방법은 없다.

> 코드로 나누는 길(예: 본사 경로만 항상 DB 를 보게 하기)도 가능하지만, 그러면
> 「무엇을 보고 있는가」가 경로마다 달라져 사고가 난 자리를 찾기 어려워진다.
> 지금은 **배포 하나 = 출처 하나** 라는 단순한 규칙을 유지한다.

---

## 5. 남은 제한

| 항목 | 상태 |
|---|---|
| Vercel Preview 의 실제 환경변수 | **확인 못 함** — Preview 가 SSO 뒤에 있고 저장소에 설정이 없다. 가드가 켜져 있는지도 거기서 확인해야 한다 |
| 로컬 `.env.local` | 운영을 보고 있고 가드 세 변수가 모두 비어 있다 ([staging-flow-readiness.md §6](./staging-flow-readiness.md)). 이번 변경으로 **차단 설정만 켜면** 운영 ref 없이도 막힌다 |
| Storage 직접 업로드 | prepare 에서 막지만, 이미 발급된 경로로 올리는 것까지 서버가 막지는 못한다. 최종 방어선은 Storage RLS 다 |
| 읽기 | 가드는 **쓰기만** 본다. 비운영 배포가 운영 데이터를 **읽는** 것은 막지 않는다 — 막으면 화면이 전부 깨져 원인 파악이 어려워진다. 읽기까지 막으려면 환경변수를 스테이징으로 바꾸는 것이 맞는 길이다 |
| `/admin/readiness` 의 환경변수 점검 | `PORTAL_THROTTLE_SALT` 는 표시되지 않는다 (`portal-throttle.ts` 주석이 앞서 나갔다). 이번에 고치지 않았다 |
