import type { ReactNode } from "react";
import { LeadFormProvider } from "@/components/forms/LeadFormContext";
import { LeadFormDialog } from "@/components/forms/LeadFormDialog";
import { PlayFooter } from "./PlayFooter";
import { PlayHeader } from "./PlayHeader";

/**
 * 2026 공개 체험 틀 — 홈과 /experience/*.
 *
 * ★ `.play` 범위에서만 PLAYFUL 디자인 값이 적용된다. 업무 화면(teacher · director ·
 *   admin · sales)은 이 틀을 쓰지 않아 그대로다.
 * ★ `.public-v4` 를 함께 둔다 — 상담 폼 등 기존 공개 컴포넌트가 그 값을 쓴다.
 * ★ 바닥글은 2026 체험용 PlayFooter (사업자 표기 · 법적 고지는 기존 데이터 그대로).
 * ★ 상담 폼은 남긴다. 2026년에도 원장 문의는 받는다 (저장 경로 · 동의는 기존 그대로).
 * ★ 이 틀은 서버 데이터를 읽지 않는다. 로그인 · 세션 · DB 를 부르지 않는다.
 */
export function PlayShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-v4 play flex min-h-full flex-1 flex-col">
      <LeadFormProvider>
        <PlayHeader />
        {children}
        <PlayFooter />
        <LeadFormDialog />
      </LeadFormProvider>
    </div>
  );
}
