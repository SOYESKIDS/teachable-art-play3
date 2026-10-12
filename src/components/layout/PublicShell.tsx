import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileStickyCta } from "@/components/layout/MobileStickyCta";
import { LeadFormProvider } from "@/components/forms/LeadFormContext";
import { LeadFormDialog } from "@/components/forms/LeadFormDialog";

/**
 * 공개 영업 페이지(홈 · /programs/* · /privacy · /terms) 공통 틀.
 *
 * ★ 상담 폼 Provider 는 이 틀 안에서만 감싼다.
 *   예전에는 홈에만 Provider 가 있어 상품 상세의 "도입 상담 신청"이 폼을 열지 못하고
 *   홈의 #contact 로 내려갔다. 공개 페이지는 모두 같은 폼을 바로 연다.
 *   로그인 · 앱 영역(/kindergarten, /teacher, /director, /admin, /sales)은 이 틀을 쓰지 않는다.
 *
 * ★ release/public-site: .public-v4 범위 — Warm Atelier V4 디자인 값(색 · 글자 크기 · 모서리)은
 *   이 틀 안에서만 적용된다 (globals.css). 업무 화면은 main 디자인 값 그대로다.
 *
 * ★ stickyCta — 모바일 하단 고정 버튼. 법적 고지처럼 읽기만 하는 문서는 끈다.
 *   Footer 는 고정 버튼 높이만큼 아래 여백을 늘 확보하므로 어느 쪽이든 겹치지 않는다.
 */
export function PublicShell({
  children,
  stickyCta = true,
}: {
  children: ReactNode;
  stickyCta?: boolean;
}) {
  return (
    <div className="public-v4 flex min-h-full flex-1 flex-col">
      <LeadFormProvider>
        <Header />
        {children}
        <Footer />
        {stickyCta ? <MobileStickyCta /> : null}
        <LeadFormDialog />
      </LeadFormProvider>
    </div>
  );
}
