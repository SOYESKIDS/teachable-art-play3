# Parent Portal · CO-12 (PHASE 10A · 읽기 전용)

## 정확한 blocker

**CO-12 — Child Secure Portal 만료 · 재발급 정책** (`docs/03-commerce/open-items.md:51` · P0 Portal Production 전 · Production Blocker YES · DEC-092 "expires_at 은 nullable 확장 지점").
미결정: 계약 기간과 링크 만료 관계 · 학기 내 유효 기간 · 계약 종료 후 portal 유지 · 재발급 시 이전 링크 · 분실 · 장기 링크 보안 · 기존 30일 정책 전환.
`parent_portal.blocked_by = {CO-12}` 이고 **STARTER · STANDARD · PREMIUM · PILOT 모두 parent_portal 포함** (seed `20261001100000_m2…:91,98,106,113,138`) → **어떤 계약도 활성화할 수 없다.**

## 현재 구현 (코드 확인)

| 항목 | 상태 |
|---|---|
| 경로 | `/share/portal/[portalId]` · token 은 **URL fragment** (`#token`) · 클라이언트가 읽고 `history.replaceState` 로 제거 · no-referrer · noindex · no-store |
| 해석 | `POST /api/share/portal/resolve` → anon RPC `public.read_child_portal(p_public_id, p_token)` (SECURITY DEFINER · `search_path=''` · anon 만 실행) · service role 미사용 |
| token | 서버 생성 `randomBytes(32)` base64url 43자 (256-bit) · DB 에는 SHA-256 hex 만 · 클라이언트가 `token_hash` 를 읽을 수 없음 (test) |
| 발급 · 재발급 | 원장만 · 아동 active · `parent_portal` ∧ 서비스 모드 active · 재발급 = 이전 링크 즉시 중지 + 새 링크 · audit `portal.issued` / `portal.revoked` |
| 중지 | 원장 `revoke_child_portal` · 다시 활성화 불가 |
| **만료** | `read_child_portal` 은 만료를 확인하지만 **`expires_at` 을 설정할 방법이 없다** (INSERT 시 `new.expires_at := null` · 변경 금지 · m4 `:1140,1150`) → **중지 전까지 영구** · test "no expiry imposed (CO-12 open)" |
| 동의 | `declined` 업로드 거부 · `unknown` 업로드 허용 · Weekly 선택 거부 · `consented` 선택 허용 · **portal 발급 · 글 표시는 동의와 무관** |
| 사진 | portal RPC · DTO · 화면 어디에도 사진 없음 (구조적 · 플래그 아님) · 켜려면 DB-9 signer 설계 필요 · **활성화하지 않음** |
| 보기 조건 | 기관 active ∧ `parent_portal` 계약 기능 · **서비스 모드는 보지 않음** (read_only · 정지 계약도 열람 · IB-3 사후 보존 미결) |
| 오류 | 모든 실패 동일 (`{ok:false}` · HTTP 200) · 사유 비공개 |

## 테스트

pgTAP `p0_hardening` (발급 hash · token_hash 비공개 · 만료 null · 유효 · 잘못된 · 형식 오류 · 숨김 · 사유 비공개 · 다시 공개 · 중지 · anon 표 접근 불가) · `p0_security_baseline` N-18 · `G2_post_cutover` (Sales 거부) · Staging e2e (잘못된 · 유효 · 사진 · stage 없음 · 숨김 사유 비노출 · 중지).
없음: 만료 경로(도달 불가) · rate limit · 동의와 portal 의 관계.

## 보안 영향 (그대로 출시할 경우)

- 강점: 256-bit token · hash 저장 · fragment · 일관된 실패 · 최소 DTO → 추측 공격 비현실적
- **약점**: ① 만료 없음 — 유출된 링크는 중지 전까지 아동 이름 · 기관 · 반 · Weekly 글 열람 ② **rate limit 없음** (IB-5 / AD-14 · `src/app/api/share/portal/resolve/route.ts:15`) — DoS · 비용 증폭 ③ **공개 법적 문구는 "기본 30일 만료"** (`src/data/legal.ts:216,371,571`) — 현재 Production 의 legacy 공유 링크는 실제로 30일 만료(`20260903090000…:189`)라 지금은 맞지만, **새 portal 출시 시 문구와 동작이 어긋난다** ④ 정지 · 종료 계약에서도 열람 (IB-3)

## 언제 풀어야 하나

| 시점 | 필요 여부 | 근거 |
|---|---|---|
| A. 직원 UAT 완료 | **아니오** | 알려진 제한으로 명시 (`docs/10-employee-uat/known-limitations.md:22`) · 합성 데이터 |
| B. Production RC | **예 (사실상)** | parent_portal 이 모든 상품에 포함 → 활성화 불가 · runbook Step F 가 J/K/L 앞 |
| C. 학부모 공개 | **예 (명시)** | P0 Portal Production 전 · 사진은 추가로 CO-9 · CO-10 · DB-9 |

대안(사람 결정 · JUDGEMENT): 상품 정의에서 parent_portal 을 빼거나 비활성으로 두는 STARTER 변형은 DEC-063 · 상품 약속 변경이므로 이 audit 가 판단하지 않는다.
