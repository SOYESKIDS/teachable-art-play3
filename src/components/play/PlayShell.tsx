import type { ReactNode } from "react";
import { LeadFormProvider } from "@/components/forms/LeadFormContext";
import { LeadFormDialog } from "@/components/forms/LeadFormDialog";
import { playDisplay, playSans } from "@/fonts/play";
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
 * ★ 글꼴은 이 틀에서만 싣는 서브셋이다 (src/fonts/play). 업무 화면은 원래 Pretendard 그대로다.
 * ★ 이 틀은 서버 데이터를 읽지 않는다. 로그인 · 세션 · DB 를 부르지 않는다.
 */
export function PlayShell({ children }: { children: ReactNode }) {
  return (
    <div className={`public-v4 play ${playSans.variable} ${playDisplay.variable} flex min-h-full flex-1 flex-col`}>
      <LeadFormProvider>
        <PlayHeader />
        {children}
        <PlayFooter />
        {/* 검토용(Preview) 배포의 상담은 Staging 에만 저장된다 — 실제 문의로 오인하지 않게 폼 위에 알린다 */}
        <LeadFormDialog previewNotice={process.env.VERCEL_ENV === "preview"} />
      </LeadFormProvider>
    </div>
  );
}
