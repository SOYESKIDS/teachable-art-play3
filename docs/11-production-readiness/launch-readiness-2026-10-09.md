# 서비스 오픈 준비 — 공개 사이트 · SaaS 분리 (2026-10-09)

> branch `design-final-polish` · 이 문서의 변경은 local (push · 배포 · main 병합 · Production DB 변경 없음)
> 근거 표기: **[직접]** 이번 세션 실행 · **[기록]** 저장소 문서 · **[운영자]** 운영자 전달 · **미확인**

## 1. 배포 단위는 둘이다

| 단위 | 내용 | DB 필요 | 지금 상태 |
|---|---|---|---|
| **A. 공개 사이트** | 홈 · `/programs/*` · `/privacy` · `/terms` · 상담 폼 | `lead_submissions` INSERT 만 (main 이후 이 테이블을 바꾼 migration 0개 [직접]) | 운영 도메인은 **main 시기 빌드** [직접 · HTTP] · 이 브랜치의 수정 미반영 |
| **B. 유치원 SaaS** | `/kindergarten` · `/teacher` · `/director` · `/admin` · `/sales` · 공유 | main 이후 migration 18개 + G-2 · G-1 · M5 · J/K/L cutover | Staging 만 (G-2 · 10C · UAT-DB-GUARD 적용 · G-1/M5 미적용) · Production DB **미확인** |

**현재 브랜치를 그대로 main 에 병합하면 A 와 B 가 함께 운영에 나간다.** 운영 DB 에 B 의 migration 이 없다면(미확인) 교사 · 원장 · 본사 화면이 새 RPC 를 찾지 못해 깨진다. 그래서:

- A 만 먼저 내보내려면 **main 기준 공개 사이트 전용 릴리스 브랜치**가 필요하다 (§4 계획).
- B 는 Production migration ledger 확인 → cutover runbook(G-2 → J/K/L) → 계약 활성화 순서로 별도 진행한다 (§5).

## 2. 이번 세션 공개 사이트 수정 (A 의 내용)

| # | 항목 | 수정 |
|---|---|---|
| ①③ | 상품 상세 메뉴 · Provider 범위 | 메뉴 7개 → 실제 섹션 id 7개 일치 확인(이미 `/#…` 형식 · 수정 없음). 상담 폼 Provider 를 `PublicShell` 로 옮겨 홈 · `/programs/*` · `/privacy` · `/terms` 에서만 감싼다 (로그인 · 앱 영역 제외) |
| ② | 상세 페이지 상담 버튼 | Header · 모바일 고정 · 하단 "N주 프로그램 도입 상담" 이 `/#contact` 로 이동하던 것을 **폼 바로 열기**로 (submission_type `consult`). 상세 페이지에 모바일 고정 CTA 추가 |
| ④ | 개발용 Placeholder | 이 브랜치 공개 화면에는 이미 없음 [직접 · 6쪽 × 2폭 렌더 텍스트 검사] — 운영(main)에만 남아 있다 |
| ⑤ | 상품 표현 | 비교표 "성장리포트" STANDARD · PREMIUM 의 "주간" 에 카드와 같은 "(출시 준비 중)" 표기 |
| ⑥ | 메시지 | 홈 히어로 설명: "그림책 이야기로 시작해 몸과 손으로 표현하는 … 관찰 · 기록해 성장 이야기로 이어 갑니다." (승인된 H1 은 유지) |
| ⑦ | Footer 문장 | "활동을 넘어, 성장을 남깁니다." (운영자 확정) |
| ⑧ | 가독성 | Footer 하단 글자 대비 white/50 → white/65 · 사업자 줄 white/75 · 번호 중간 줄바꿈 방지 |
| ⑨ | 사업자 정보 | Footer 에 상호 · 사업자등록번호 · 주소 (legal.ts 확정값 재사용 · 대표자 · 통신판매업 신고번호는 값 없음 → 미표기) |

## 3. 문의(리드) 운영 — 자동 알림 없음

- 흐름: 방문자 브라우저 → Supabase `lead_submissions` INSERT (anon · 12개 열 grant · RLS `privacy_agreed = true` · `status = 'new'`) → 본사 `/admin/leads` 조회 · 상태 변경.
- **Staging 시험 PASS** [직접 · 단일 DO 문장 · RAISE 롤백 · 잔여 0]: anon 제출 OK · 저장 확인 · anon 조회 불가(42501) · 동의 없는 제출 거부(42501) · HQ admin 조회 1 · 상태 `new → contacted` 1행 · 다른 열 수정 거부(42501) · HQ sales 조회 1 · 교사 조회 0.
- **알림 · 자동 회신 코드 없음** [직접] — 메일 · 웹훅 · 알림톡 연동 0.

**수동 운영 절차 (오픈일부터 · 운영자 확정 2026-10-09)**
- 문의 담당자: **백향은** (내부 문서에만 기록 — 공개 화면에 이름을 넣지 않는다)
- 확인 주기: **주 1회** `/admin/leads` 확인 (필터 `new`)
- 회신 기한: **접수 후 1주일 이내** 연락 — 상담 완료 화면 문구 "접수 후 1주일 이내에 연락드립니다."와 같다
1. 주 1회 `/admin/leads` 에서 `new` 문의를 확인한다.
2. 접수일 기준 1주일 안에 전화 · 이메일로 연락 → 상태를 `contacted` 로 바꾼다.
3. 데모 · 상담 진행에 따라 `qualified` → `converted` / `closed`.
4. 주 1회 확인 때 접수 후 1주일이 다 된 `new` 가 없는지 먼저 본다.
- ⚠ 확인이 주 1회이므로 접수 직후 확인한 문의가 아니면 회신까지 최대 약 1주일이 걸린다 — 회신 기한(1주일)을 지키려면 확인 요일을 고정한다.
- 자동 알림 · 자동 회신은 **구현되지 않았다** (화면 · 문서 어디에도 구현된 것으로 표시하지 않는다).

**후속 개발 (승인 후)**: 제출 직후 본사 메일 알림(서버 경유 · 발송 서비스 선택 · API 키는 Vercel env) · 신청자 자동 회신(이메일 입력 시) · 알림톡은 비용 · 심사 후.

## 4. 공개 사이트(A) 배포 후보 · 검증 · 복구 계획 — **실행하지 않음 · 승인 필요**

1. **범위 확정** — main 기준 새 브랜치에 공개 영역 파일만 옮긴다: `src/app/page.tsx` · `programs` · `privacy` · `terms` · `components/home|layout|programs|forms` · `data/*` · `lib/seo` · `lib/content/starter-journey.ts` + `content/starter/2026.1/manifest.json` · `components/ui/*` · `globals.css`.
   - **위험**: `components/ui/*` · `globals.css`(V4 토큰)는 main 의 교사 · 원장 · 본사 화면도 쓴다 → main 의 앱 화면 스타일 회귀 점검이 필요하다(로그인 화면 · 대시보드 렌더). 이 판단이 다음 작업이다.
2. **검증 (Preview)** — 공개 6쪽 × 390/1366 렌더 · 상담 폼 열기/제출(합성 · Staging) · lint · build · 앱 영역 로그인 화면 렌더.
3. **배포** — 운영자 승인 후 main 반영 → Vercel Production 자동 배포 (main 연결 여부는 **미확인** — Vercel Dashboard 확인 필요).
4. **복구** — Vercel Dashboard → Deployments → 직전 Production 배포(현재 main 빌드) **Promote to Production / Instant Rollback**. DB 변경이 없으므로 코드 되돌림만으로 끝난다.

## 5. SaaS(B) 오픈 — 차단 항목과 순서

1. **Production 상태 확인 (읽기 전용)** — Production migration ledger · G-2 여부 · 실제 사용 기관 유무. 현재 **BLOCKED** (Production 연결 정보 없음 · Vercel/GitHub CLI 미로그인).
2. **P09D-C2** — 새 키 생성 → Preview env 교체 → 이전 키 폐기 (모두 미확인).
3. **콘텐츠** — STARTER W1~W8 를 최신 v3.1 기준으로 재적재할지 결정 → Production 승인(BC-3 · J-1).
4. **Production cutover** — 18개 migration · G-2 → J/K/L(G-1 · M5) runbook · 각 단계 preflight · rollback.
5. **법무 · 정책** — CO-2(보존 · 삭제) · LB-1~LB-7 · CO-12(학부모 공유 — 출시 안 하면 차단 아님).
6. **출시 승인** — class_mode · weekly_report 체크리스트 사람 승인 · 첫 STARTER 계약 활성화.

## 6. 운영자 결정 목록 (임의로 정하지 않은 값)

| # | 결정 | 현재 저장소 | 첨부 · 근거 | 권장 |
|---|---|---|---|---|
| D-1 | 수업 시간 표기 | **확정 · 반영 (2026-10-09)** — "CORE 50분(워크북 포함) + 선택 연계활동 10~15분". 공개 화면의 단계별 분 숫자 · "워크북 별도 10분" · 주차별 "가이드 권장 시간"(50~70분) 표시는 제거 | W1 v3.1 · W17 | 완료 |
| D-2 | 권장 연령 | **확정 (2026-10-09) — "상담 시 안내" 유지** · 이전 값: "상담 시 안내" | 가이드 "만 4~7세" · 검토서 "만 3~5세" | 만 나이 표기는 유치원 재원 연령(만 3~5세)과 충돌 소지 → 실제 운영 반(5·6·7세반 등) 기준을 운영자가 확정하기 전까지 현행 유지 |
| D-3 | STARTER 콘텐츠 판 | canonical = 이전 9쪽 가이드 | W1 v3.1 FINAL (8단계 흐름 · 핵심 메시지 문장 변경) | v3.1 로 W1~W8 재적재 · 재승인 여부 결정 (Staging 먼저) |
| D-4 | PART 3 | 사이트 미표기 · 문서 정정 완료 | 「우리가 사는 세상」 · 17주 파일 v2.0 ↔ 본문 v1.0 | 판 번호를 하나로 정리한 파일을 원본으로 지정 |
| D-5 | 대표자 · 통신판매업 신고번호 | 없음 (Footer 미표기) | — | 값 전달 시 legal.ts `COMPANY_FIELDS` 에 추가 |
| D-6 | 15명 초과 요금 | "원아 1인당 월 6,600원부터" 문구만 | BP-6 미확정 | 계산 · 청구에 쓰지 않는다 (현행 유지) |
| D-7 | 공개 사이트 배포 방식 | — | §1 · §4 | 공개 전용 릴리스 브랜치 (main 전체 병합 금지) |
| D-8 | 문의 알림 방식 | **확정 (2026-10-09)** — 담당자 백향은 · 주 1회 확인 · 접수 후 1주일 이내 회신 (수동) | §3 | 자동 알림은 후속 개발(미구현) |
| J-1~J-6 · LB-1~LB-7 · CO-2 · CO-12 · P09D-C2 | 기존 열린 결정 | — | release-blocker-matrix §0 | — |
