# 공개 사이트 배포 후보 — release/public-site-20261010

> 2026-10-10 작성 · **push · Preview 배포 · Production 배포 · main 병합 · Production DB 변경 모두 실행하지 않음**
> 근거 표기: **[직접]** 이번 세션 실행 결과 · **[기록]** 저장소 문서 · **미검증** 증거 없음

## 1. 커밋 · 브랜치 · 기준

| 항목 | 값 |
|---|---|
| 원본 변경 보존 커밋 | `fe6e108` fix: public site lead form scope, footer and launch readiness records (18파일) · `f5c97b8` fix: prevent same-tick double submit on consult form (1파일) — 둘 다 `design-final-polish` · local · push 안 함 |
| 후보 브랜치 | `release/public-site-20261010` @ **`1ead0a1`** (64파일 · local · push 안 함) |
| 후보 worktree | `D:\소예키즈\tap3-release-public` (원본 폴더 `D:\소예키즈\teachable-art-play3` 는 `design-final-polish` 그대로) |
| 기준 커밋 | `origin/main` **`faa8f9a`** |
| 실제 운영 커밋 대조 | **확인 완료** [직접 · `vercel inspect` · API 읽기 전용] — Production `dpl_66UH84P7f64DNWgTs2KkwSnh4RLq` · Ready · 2026-09-09 · branch **main** · commit **faa8f9a** = 기준 커밋. 별칭 `teachable-art-play3.vercel.app` 외 2개 |
| 운영 사이트 DB 연결 | 운영 번들의 공개 Supabase 주소 = **Production `vpppxuhodwauaclhybtg`** [직접 · 공개 JS] — Staging 과 분리됨 |

## 2. 반영 범위

**들어간 것 (공개 영역만 · import 그래프 추적)**
- 페이지: `/` · `/programs/[slug]` · `/privacy` · `/terms` · `not-found`
- 상담 폼: `LeadForm` · `LeadFormDialog` · `LeadCtaButton` (+ 연타 중복 제출 방지)
- 공개 컴포넌트 · 데이터: `components/home/*`(13개 섹션) · `components/layout`(Header · Footer · MobileStickyCta · BrandMark · PublicShell) · `components/programs/*` · `components/legal/LegalDocumentView` · `data/{site-copy, packages, program-products, home-narrative}` · `lib/seo/*` · `lib/content/starter-journey.ts` · `content/starter/2026.1/manifest.json` · `types/content.ts` · `ui/{Card, DemoBadge, cx}`
- 이미지: 새 파일 없음 — 쓰는 6개 모두 main `public/` 에 이미 있음 [직접]
- 삭제: main 의 쓰지 않는 홈 섹션 13개 (import 0 확인 · "사진 Placeholder" 가 있던 `GrowthComparisonSection` 포함)

**들어가지 않은 것**: 교사 · 원장 · 본사 · 영업 화면, `src/lib/{staff,admin,entitlement,supabase}`, migration, RLS · 계약 · 권한, `proxy.ts`, `package.json`. [직접 · staged 파일 검사]

**공용 파일 처리 — 업무 화면 불변**

| 공용 파일 | main 업무 화면 사용 | 처리 |
|---|---|---|
| `ui/Button.tsx` | 1곳 | **그대로** · 공개용 `ui/PublicButton.tsx`(V4) 추가 |
| `ui/field.ts` | 19곳 | **그대로** · 공개용 `ui/field-public.ts` 추가 |
| `ui/surface.tsx` | 4곳 | **그대로** · 공개 원장 화면 예시용 `home/status-tone.ts` 추가 |
| `types/staff-observation.ts` | 6곳 | **그대로** · 공개 성장기록용 `home/growth-stages.ts` 추가 |
| `globals.css` | 전체 | **병합** — 전역 `:root` · base · `eyebrow` = main 값. V4 값(색 · 글자 크기 · 모서리 · 그림자 · V4 base)은 `.public-v4` 안에서만. 값이 다른 type scale 12개는 `var(--rel--*)` 로 범위별 분리. V4 신규 토큰 · utility 는 추가만 |

## 3. 검증 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| 후보 lint · tsc · 운영용 build | **PASS** (build 시 STARTER 사본 ↔ manifest 대조 assert 통과) | [직접] |
| 원본 lint · tsc · 테스트 | **PASS** · node 테스트 105/105 | [직접] (후보 기준 main 에는 테스트 파일 없음) |
| 업무 화면 회귀 (로그인 없이 열리는 6 경로 × 390 · 1440) — `/login` `/kindergarten` `/admin/login` `/auth/forgot-password` `/teacher`→`/login` `/admin`→`/admin/login` | **PASS — 요소별 계산 스타일 차이 0** (main 빌드 vs 후보 빌드, 14개 속성 · 18~55 요소) · 비교 방법 감지력 확인(공개 홈은 1,560 차이) | [직접 · headless] |
| 업무 화면이 새 V4 class 를 새로 갖게 되는지 (정적 검사 · 728 class) | **PASS** — 해당 0 (일치 23건은 모두 `var(--shadow-*)` = main 값 유지) | [직접] |
| 로그인 후 업무 화면(교사 · 원장 · 본사 대시보드) 렌더 | **미검증** — 계정 비밀번호 없음. 위 두 검사로 간접 확인만 | — |
| 공개 6쪽 × 360 · 390 · 768 · 1440 (24회) | **PASS** — 가로 넘침 0 · Placeholder/lorem 0 · 옛 Footer 문장 0 · "만 4~" · "40~50분" 0 · 사업자번호 표시 · `.public-v4` 적용 · 12px 미만 본문 0 · 콘솔 오류 0 · 응답 실패 0 · 모바일 하단 버튼과 Footer 겹침 0 (768 이하 표시) | [직접] |
| 메뉴 7개 (상품 상세 → 홈 섹션) | **PASS 7/7** — `/` + 해당 id 존재 | [직접] |
| 상담 폼 | **PASS** — 상세 하단 · 모바일 고정 버튼에서 열림 · Esc · 닫기 버튼 · 필수 4개 안내 · 동의 없이 제출 거부 · 저장 실패 안내(Supabase 차단 시 `role=alert`) · 제출 중 "제출 중..." + 비활성 | [직접] |
| 중복 제출 방지 | **1차 FAIL → 수정 → PASS** — 같은 틱 두 번 클릭 시 2행 저장 → ref 가드 추가(`f5c97b8` · 후보 포함) → 요청 1 · 저장 1 | [직접] |
| 실제 브라우저 제출 (후보 → Staging) | **PASS** — 식별 합성값 `[TEST-RC-20261010]` · `lead-rc-20261010@example.test` → `status=new` · `source=website` · `privacy=true` 저장 · 성공 화면 | [직접] |
| HQ 조회 · 상태 변경 | **DB 권한 PASS / 화면 미검증** — HQ admin · sales 가 해당 행 조회, admin `new→contacted` 변경 OK, 교사 조회 0 (권한 시험은 롤백). `/admin/leads` 화면 조작은 HQ 비밀번호 없어 **미검증** | [직접] |
| 시험 데이터 정리 | **PASS** — 시험 행 3건만 삭제(조건: 이메일 + 기관명 + 메시지 표지 · 정확히 3건 아니면 취소) → 전체 2건(시험 전과 같음) · 시험 행 0 | [직접] |
| 내부 교안 원문 노출 | **PASS** — 빌드 산출물에 manifest 의 원본 경로(OneDrive) · 해시 · 충돌 메모 · 파일명 없음. 주차 상세는 요약 필드만 서버에서 렌더 | [직접] |
| 상담 저장 경로 호환성 | **코드 호환 PASS / 운영 DB 미검증** — 저장 payload · 검증 · client 파일이 운영 커밋과 **동일**(12개 열), main 이후 `lead_submissions` 를 바꾼 migration 0. 운영 DB 실제 구조 · RLS 는 접근하지 않아 **PASS 판정 안 함** | [직접] |

## 4. 운영 반영 전 결정 · 필요한 접근

1. **STARTER 주차 상세 공개 승인** — `/programs/starter` 는 `content/starter/2026.1`(Staging 승인 · **Production 미승인** · BC-3 · J-1) 요약을 보여 준다. 운영 공개 = 이 요약의 대외 공개 승인이 필요하다. (교안 v3.1 재적재 여부 D-3 와 별개)
2. 수업 시간 · 연령 — 현행 표기 유지("주 1회 · 50분 (워크북 별도 10분)" · "상담 시 안내"). 최신 교안과의 충돌은 [launch-readiness §6](./launch-readiness-2026-10-09.md) D-1 · D-2.
3. 17주 파일 판 번호(v2.0 ↔ v1.0) · 대표자 · 통신판매업 신고번호 — 미정 (값 만들지 않음).
4. 문의 알림 — 자동 알림 · 자동 회신 **없음**. 오픈 전 **담당자 1명 지정** · 영업일 2회 `/admin/leads` 확인 · 1영업일 내 연락 후 `contacted` ([launch-readiness §3](./launch-readiness-2026-10-09.md)).
5. 접근 정보 — 운영 DB 읽기 전용 확인(필요 시) · HQ 테스트 계정(화면 확인용) · GitHub push 권한(운영자).
6. **P09D-C2** — 새 키 생성 · Preview 반영 · 옛 키 폐기 **모두 미확인 · OPEN**. 공개 사이트 배포와 무관하지만 **직원 UAT 배포 차단은 유지**.

## 5. Preview 검증 방법 (운영자 승인 후)

1. `git -C D:\소예키즈\tap3-release-public push origin release/public-site-20261010` → Vercel 이 Preview 를 만든다.
2. ⚠ **Preview 는 운영 DB 에 연결된다 (확인됨)** [직접 · `vercel env ls` 이름 · 범위만] — Supabase 변수가 브랜치 전용으로 있는 것은 `design-final-polish` · `ui-brand-renewal` · `saas-v2` 뿐이고, 그 밖의 브랜치 Preview 는 **"Production, Preview" 공유 값**(운영 Supabase · 운영 secret key)을 쓴다. 따라서 이 브랜치 Preview 에서는 **상담 폼 제출 금지**(운영 `lead_submissions` 에 기록됨) — 화면 · 폼 열기까지만 확인한다. Staging 으로 시험하려면 운영자가 먼저 `release/public-site-20261010` 전용 Preview env(Staging URL · publishable key)를 추가해야 한다 (Vercel env 변경 = 별도 승인).
3. 확인: 공개 6쪽 × 모바일 · PC · 메뉴 · 상담 폼 열기/닫기 · 로그인 화면 3개가 운영과 같은지.

## 6. Production 반영 · 복구

**반영** (승인 후 · 운영자)
1. `release/public-site-20261010` → `main` PR (fast-forward 가능: 기준 = 현재 main `faa8f9a`). 그 사이 main 이 바뀌었으면 다시 대조.
2. 병합 → Vercel 이 main 으로 Production 자동 배포 (현재 운영이 `main` 연결임을 확인함).
3. 배포 직후: 홈 · 상품 3 · 법적 고지 열람 · 상담 폼 열기 · 로그인 화면 3개 열람. 실제 제출 시험은 하지 않거나, 했다면 즉시 HQ 가 확인 후 정리.

**복구** (DB 변경이 없으므로 코드만)
- Vercel Dashboard → Project `teachable-art-play3` → Deployments → 직전 Production `dpl_66UH84P7f64DNWgTs2KkwSnh4RLq`(faa8f9a) → **Instant Rollback / Promote to Production**.
- 또는 CLI: `vercel rollback dpl_66UH84P7f64DNWgTs2KkwSnh4RLq` (운영자 권한).
- 이후 main 을 `faa8f9a` 로 되돌리는 revert 커밋으로 저장소와 운영을 맞춘다.

## 7. 하지 않은 것
push · Preview/Production 배포 · main 병합 · Production DB 접속/변경 · 키 생성/폐기 · 계약 활성화 · 기능 출시.

## 8. Preview 배포 · 검증 (2026-10-09 22시경 KST)

| 항목 | 결과 |
|---|---|
| 원격 저장 | `origin/release/public-site-20261010` = **`1ead0a1`** (push 완료 · main 은 그대로 `faa8f9a`) |
| 브랜치 생성 순서 | 브랜치를 먼저 운영 커밋 `faa8f9a` 로 만들고(배포 생성 없음 확인) → 브랜치 전용 Preview env 추가 → `1ead0a1` push. 이 브랜치의 배포는 **env 추가 뒤 1건뿐** |
| Preview 배포 | `dpl_7d3hpGHDy3ch9ZLjfrE6ueCxufXH` · **Ready** · `https://teachable-art-play3-a3xfu1mpc-soyeskids-projects.vercel.app` · 브랜치 alias `https://teachable-art-play3-git-release-publi-81b815-soyeskids-projects.vercel.app` |
| 브랜치 전용 Preview env (이 브랜치만 · 값은 기록하지 않음) | `NEXT_PUBLIC_SUPABASE_URL` = Staging · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Staging publishable(공개 키 · Management API 에서 바로 전달) · `SUPABASE_SECRET_KEY` · `OPENAI_API_KEY` = **동작하지 않는 자리값** (공유 Production 비밀 상속 차단 · P09D-C2 대상 Staging secret 재사용 안 함). Production · 다른 브랜치 env 변경 없음 |
| **Preview 실제 DB** | **Staging `itcddooiuqsqingfhxkk`** — ① Preview 번들의 Supabase 주소 ② Preview 에서 제출한 행이 Staging 에 저장됨(실행 결과) |
| 접근 보호 | 프로젝트 `ssoProtection = all_except_custom_domains` → Preview 는 Vercel 로그인(팀) 필요 · 익명 302. 자동 검증용으로 **이 배포 URL 한정 공유 링크**(4시간)를 만들었고 검증 후 **폐기** — 폐기 뒤 옛 토큰 302 확인. 프로젝트 bypass · 예외 설정 변경 없음 |
| 화면 (6쪽 × 360 · 390 · 768 · 1440 = 24) | **PASS** — 가로 넘침 0 · 응답 오류 0 · 콘솔 오류 0 · 하단 버튼/Footer 겹침 0 · Placeholder 0 · `.public-v4` 적용 |
| 메뉴 7 · 상담 폼 열기/닫기(Esc · 닫기 버튼) · 필수 4 · 동의 · 저장 실패 안내 | **PASS** |
| 기존 로그인 화면 디자인 (운영 vs Preview · `/login` `/kindergarten` `/admin/login` `/auth/forgot-password` × 390 · 1440) | **PASS — 계산 스타일 차이 0** (첫 측정 1회 로딩 타이밍 차이 → 재측정 0) |
| 실제 Preview 제출 | **PASS** — `[TEST-PV-20261010]` · `lead-pv-20261010@example.test` · "제출 중..." + 비활성 · 동시 2클릭 → 요청 1 · Staging 저장 1 (`new` · `website` · 동의 true) |
| HQ 조회 · 상태 변경 | **DB 권한 PASS** (admin · sales 조회 1 · admin `new→contacted` · 교사 0 · 롤백) / **`/admin/leads` 화면 미검증** — HQ 비밀번호 없음 |
| 시험 데이터 정리 | **PASS** — PV 1건만 삭제(정확히 1건 조건) → 전체 2건(시험 전과 같음) |
| 로그인 후 업무 화면 | **미검증** (계정 없음) — 로컬 정적 · 로그인 전 화면 비교로 간접 확인만 |

**`/admin/leads` 화면 — 운영자 직접 확인 절차 (Preview · Staging)**
1. Vercel 팀 계정으로 로그인한 브라우저에서 `https://teachable-art-play3-git-release-publi-81b815-soyeskids-projects.vercel.app/` 를 연다.
2. 아무 공개 페이지에서 "도입 상담 신청" → 기관명 `[TEST-OP-20261010] 확인용`, 담당자 · 연락처 아무 값, 이메일 `lead-op-20261010@example.test`, 개인정보 동의 → 신청하기.
3. `…/admin/login` 에서 `staging-hq-admin@example.test` 로 로그인 → `/admin/leads` → 방금 건이 "신규"로 보이는지 확인 → 상태를 "연락함"으로 바꾸고 새로고침 후 유지되는지 확인.
4. 확인 후 정리 요청 — 표지 `[TEST-OP-20261010]` 행만 삭제한다.

## 9. 출시 전 최종 확인 (2026-10-09 밤)

### 9-1. 관리자 화면의 환경 의존성 — 코드 확인 [직접]
- `/admin/login` → `signInAction` → `createClient()`(server · `NEXT_PUBLIC_SUPABASE_URL` + publishable key) → `signInWithPassword` → `has_soyes_admin_access` RPC.
- `/admin/leads` 조회 · `updateLeadStatus` → `requireAdmin()` → **로그인 세션 client** + RLS(`lead_submissions` admin SELECT · UPDATE(status)).
- `SUPABASE_SECRET_KEY`(`createAdminClient`)를 쓰는 곳은 `admin/(dashboard)/organizations/actions.ts` · `lib/admin/director-invite.ts` 두 곳뿐(기관 생성 · 원장/교사 초대).
- **결론**: Preview 의 자리값 secret 은 로그인 · 문의 조회 · 상태 변경에 **영향 없음**. 영향 = 기관 생성 · 초대(공개 사이트 범위 밖). 새 키 필요 없음 → 키 생성 · 폐기 · Production 설정 변경 없음. P09D-C2 OPEN 유지.

### 9-2. 관리자 문의 화면 — **미완료 (사용자 직접 확인 필요)**
- Staging 시험 계정 비밀번호가 이 PC 환경 변수에 있으나(존재만 확인 · 값 미열람), 원격 페이지 · 외부 인증 서버로 비밀번호를 입력하는 일은 자동화 범위 밖이라 **로그인하지 않았다**. 비밀번호 초기화도 하지 않았다.
- DB 권한 시험(§8)은 화면 검증을 대신하지 않는다.
- 확인 절차는 §8 "운영자 직접 확인 절차" (최신 Preview 주소는 §9-5).

### 9-3. 기존 업무 화면 영향 — 코드 · CSS 대조 완료 / 로그인 후 화면 미확인
| 확인 | 방법 | 결과 |
|---|---|---|
| 업무 화면 코드 | `git diff faa8f9a 1ead0a1` — 공개 영역 밖 변경 파일 | `globals.css` 1개 + 공개 전용 새 파일(PublicButton · field-public · cx · Card · DemoBadge · types/content — 업무 화면 import 0) |
| 업무 화면 CSS | 운영 CSS(1,203 규칙) vs 후보 CSS 선택자 단위 대조 | 업무 화면 소스가 쓰는 규칙 **전부 동일**. 다른 것: 추가 규칙 · 폰트 파일 해시 · `text-display/h1/h2/h3/lead` 가 `var(--rel--*)` 경유(전역 값 = 운영 literal 과 같음) · 운영 `:root` 38개 변수 전부 동일. 운영에만 있던 256 규칙 = 삭제한 홈 섹션 전용(업무 화면 사용 0 — `sm:px-9` 등 변형은 양쪽 존재) |
| 로그인 전 화면 4개 (운영 vs Preview) | 계산 스타일 요소별 비교 | 차이 0 (§8) |
| 로그인 후 교사 · 원장 · 본사 화면 | — | **실제 화면 미확인** (계정 로그인 안 함) — 위 코드 · CSS 대조로만 판단 |

### 9-4. 운영 상담 호환성
| 항목 | 결과 |
|---|---|
| 저장 경로 | 운영 · 후보 동일 — 브라우저 Supabase client → `lead_submissions` INSERT (12개 열 · `buildLeadSubmissionPayload` · `types/leadForm` · `lib/supabase/client` 파일 동일). 후보 추가분 = 연타 방지 ref · 접근성 속성 |
| `submission_type` | 운영 사이트는 주로 `demo`(8곳) · 후보는 주로 `consult`(7곳). 저장소 migration 의 check 는 `consult` 허용 — **운영 DB 의 실제 제약은 미확인** |
| **운영 Supabase 상태** | **`vpppxuhodwauaclhybtg` = INACTIVE(일시정지)** [직접 · `supabase projects list` 메타데이터] · 주소 DNS 없음(8.8.8.8 · 1.1.1.1 NXDOMAIN). → **지금 운영 사이트의 상담 폼은 저장할 수 없다**(후보와 무관 · 현재 운영 그대로의 상태). 테이블 · 권한 · 제약 확인 불가 |
| 판정 | **미완료 (BLOCKED)** — 운영 Supabase 복구 전에는 공개 사이트를 배포해도 상담 저장이 동작하지 않는다 |

**운영 Supabase 복구 후 운영자가 SQL Editor(Production)에서 읽기 전용으로 확인할 것**
```sql
select pg_get_constraintdef(oid) from pg_constraint where conname = 'lead_submissions_submission_type_check';
select grantee, privilege_type, column_name from information_schema.column_privileges
 where table_name = 'lead_submissions' and grantee in ('anon','authenticated') order by 1,2,3;
select polname, polcmd, pg_get_expr(polwithcheck, polrelid) from pg_policy where polrelid = 'public.lead_submissions'::regclass;
```
기대: check 에 `consult` 포함 · anon INSERT 12개 열 · `privacy_agreed = true and status = 'new' and source = 'website'` 정책.

### 9-5. 최종 후보 · Preview
- 이 문서 반영 커밋이 최종 후보다(코드 = `1ead0a1` 과 동일 · 문서만 추가). 커밋 해시와 Preview 는 운영자 보고에 기록한다(같은 커밋 안에 자기 해시를 적을 수 없다).
- 코드가 같으므로 화면 시험은 반복하지 않았다.

### 9-6. 출시 판단표
| 항목 | 상태 | 구분 |
|---|---|---|
| 관리자 문의 화면(`/admin/leads`) | **미완료** — 화면 확인 필요 | 사용자 확인 |
| 기존 업무 화면 영향 | **코드 · CSS 대조 완료 · 로그인 전 화면 완료 / 로그인 후 화면 미완료** | 기술 |
| 운영 상담 호환성 | **미완료 — 운영 Supabase INACTIVE** | 사용자 결정(복구) + 기술 확인 |
| STARTER 주차별 요약 공개 승인 | **완료 — 운영자 승인 (2026-10-09)** · 범위: 공개 사이트의 1~8주 소개 요약만 (전체 교안 PDF 공개 · SaaS 콘텐츠 Production 승인 · BC-3 아님) | 사용자 결정 |
| 수업 시간 · 연령 표시 | **완료 — 확정 · 반영 (2026-10-09)**: 수업 "CORE 50분(워크북 포함) + 선택 연계활동 10~15분" · 연령 "상담 시 안내" 유지 | 사용자 결정 |
| 문의 담당자 · 확인 주기 | **완료 — 확정 (2026-10-09)**: 담당자 백향은(내부 기록만) · 주 1회 확인 · 접수 후 1주일 이내 회신 · 상담 완료 문구 반영 · 자동 알림 없음 | 사용자 결정 |
| 기존 법적 표기 미해결(LB-1~LB-7 · 대표자 · 통신판매업 신고번호) | **미완료** | 사용자 결정 · 법무 |

### 9-7. 운영자 확정 사항 반영 (2026-10-09)
| 확정 | 반영 |
|---|---|
| STARTER 1~8주 소개 요약 대외 공개 승인 | 기록만 (공개 범위 = 상품 상세의 주차 요약 · 전체 교안 PDF · SaaS 콘텐츠 Production 승인으로 확대하지 않음) |
| 수업 시간 "CORE 50분(워크북 포함) + 선택 연계활동 10~15분" | `packages.ts` `CLASS_TIME_STANDARD` 한 곳 → 상품 카드 · 비교표 · 상세 "수업" · SEO 설명 · 홈 신뢰 칩 "주 1회 · CORE 50분(워크북 포함)" · 홈 "한 번의 수업" 설명 · 상세 "한 회차 흐름" 안내. **제거**: "워크북 별도 10분" · "50분 밖 별도 10분" · 단계별 분 숫자(예전 배분은 워크북 제외 값 · 새 배분 미확정이라 순서만 표시) · 홈 분 비율 막대 · 주차별 "가이드 권장 시간"(이전 가이드 50~70분) |
| 권장 연령 "상담 시 안내" 유지 | 변경 없음 |
| 문의 담당자 · 확인 주기 · 회신 기한 | [launch-readiness §3](./launch-readiness-2026-10-09.md) · 상담 완료 화면 "접수 후 1주일 이내에 연락드립니다." · 담당자 이름은 공개 화면에 없음 · 자동 알림 미구현 표기 유지 |

검증: lint · tsc · build PASS · 공개 4쪽 × 360 · 1440 에서 표준 문구 표시 · 옛 문구(워크북 별도 · 50분 밖 · 13분/22분 · 50분 6단계 · 가이드 권장 시간 · 50~70분 범위) 0 · 가로 넘침 0 [직접 · local 후보 빌드]. 원본 `design-final-polish` 도 같은 변경 · lint · tsc · 테스트 105/105.
