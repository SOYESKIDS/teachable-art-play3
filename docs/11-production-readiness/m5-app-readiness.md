# M5 Application Readiness (PHASE 10A · `node supabase/cutover/M5_app_preflight.mjs` 재실행 · 2026-09-29)

**결과: 2/7 PASS · VERDICT FAIL** (M5 를 적용하지 않는다 · Step J 를 시작하지 않는다). M5 는 적용하지 않았다.

| # | 확인 | 결과 | 원인 (파일 · 함수) |
|---|---|---|---|
| 0 | app source found | **PASS** | — |
| 1 | M5 가 회수하는 RPC 소비자 없음 | **FAIL** | `src/lib/staff/growth-report-actions.ts` (`create_or_refresh_child_growth_report` · `save_child_growth_report_atomic`) · `growth-report-ai-actions.ts` (`save_child_growth_report_ai_draft` · `apply_child_growth_report_ai_draft`) · `growth-report-share-actions.ts` (`create_child_growth_report_share`) · `observation-actions.ts` (`save_class_session_observation_atomic`) · `observation-ai-actions.ts` (`save_observation_ai_generated_atomic` · `save_observation_ai_review_atomic`) |
| 2 | M5 가 회수하는 표 직접 쓰기 없음 | **PASS** | — |
| 3 | `class_sessions.status` 직접 UPDATE 없음 | **FAIL** | `src/lib/staff/legacy-session-actions.ts` |
| 4 | legacy 화면 계열 파일 · 라우팅 스위치 제거 | **FAIL** | `src/lib/staff/legacy-session-actions.ts` · `src/components/staff/LegacySessionActions.tsx` · `src/lib/rollout/staff-app-routing.ts` |
| 5 | Legacy* 화면 · 컴포넌트 import 없음 | **FAIL** | `src/app/teacher/growth-reports/page.tsx` · `src/app/teacher/sessions/[sessionId]/observations/page.tsx` · `src/components/staff/SessionCard.tsx` |
| 6 | legacy Action · 라우팅 스위치 의존 없음 | **FAIL** | `src/app/director/nav.ts` · `director/page.tsx` · `director/sessions/page.tsx` · `src/app/login/actions.ts` · `teacher/growth-reports/page.tsx` · `teacher/page.tsx` · `teacher/sessions/[sessionId]/observations/page.tsx` · `LegacySessionActions.tsx` · `SessionCard.tsx` · `TodaySessionBoard.tsx` · `staff-app-routing.ts` · `legacy-session-actions.ts` |

규모 (참고): legacy Action · UI 모듈 7개 ≈ 2,614 줄 (`legacy-session-actions` 242 · `LegacySessionActions` 229 · `growth-report-actions` 367 · `growth-report-ai-actions` 373 · `growth-report-share-actions` 189 · `observation-actions` 644 · `observation-ai-actions` 570) · 라우팅 스위치 소비 파일 14.

## 질문별 답

1. **통과 수**: 2/7 (0 · 2).
2. **실패**: 1 · 3 · 4 · 5 · 6.
3. **필요한 코드 변경** — "legacy 화면 계열이 없는 교사 · 원장 빌드" (runbook Step J 빌드):
   - `staffAppRouting()` 분기 제거 → SaaS 2.0 화면만 (교사 오늘 · 관찰 2.0 · Weekly · 원장 계약 기능 메뉴 · 로그인 착지)
   - `LegacySessionActions` · `legacy-session-actions` · `LegacyTeacher*Page` 삭제
   - legacy 쓰기 Action(관찰 · 성장 리포트 · AI 초안 · 공유 발급) 호출 경로 제거. **단 legacy 성장 리포트 · 공유 "조회"는 M5 후에도 유지되어야 한다** (runbook §2-1 post-M5 검증: "legacy 조회 · 공유 읽기 유지") → 원장 legacy 리포트 상세(`src/app/director/growth-reports/[reportId]/page.tsx`)는 읽기 · 숨김(`legacy_growth_report_hides`)만 남기고 쓰기 import 를 끊는다
   - `observation-actions` 를 import 하는 원장 관찰 화면(`src/app/director/sessions/[sessionId]/observations/page.tsx` · `ObservationChildForm`) → 읽기 전용 V2 경로로
   - 테스트: M5 앱 preflight 7/7 · 교사 · 원장 local role E2E(PHASE 09C 45 PASS 기준) 유지 · `M5_post_cutover` 46/46
4. **G-1 에 의존하는 실패**: **없음** (다섯 실패 모두 정적 코드 조건). 다만 **배포 순서**는 runbook §2-1 대로 J(이 빌드 배포) → 즉시 K(G-1) → 즉시 L(M5) 한 window 다.
5. **G-1 전에 안전하게 끝낼 수 있는 것**: 코드 준비 전부. Production 은 `main` 브랜치에서 배포된다 (Vercel 프로젝트 설정 · 읽기 전용 확인) → `saas-v2` 계열 브랜치 작업은 Production 에 영향 없음.
   **주의**: 직원 UAT 는 `saas-v2` Preview 를 쓰고 있다. UAT 중 화면 · 데이터를 흔들지 않으려면 **별도 브랜치**에서 준비하고 UAT 종료 후 합친다 (JUDGEMENT · UAT 는 이미 saas_v2 모드라 화면 차이는 작을 것으로 예상하지만 검증 전).
