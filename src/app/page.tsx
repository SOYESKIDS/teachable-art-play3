import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";
import { HeroSection } from "@/components/home/HeroSection";
import { ProblemSection } from "@/components/home/ProblemSection";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { SessionSection } from "@/components/home/SessionSection";
import { ContentStorySection } from "@/components/home/ContentStorySection";
import { JourneySection } from "@/components/home/JourneySection";
import { GrowthRecordSection } from "@/components/home/GrowthRecordSection";
import { RolesSection } from "@/components/home/RolesSection";
import { DirectorDashboardSection } from "@/components/home/DirectorDashboardSection";
import { PricingSection } from "@/components/home/PricingSection";
import { AdoptionSection } from "@/components/home/AdoptionSection";
import { SafeOperationSection } from "@/components/home/SafeOperationSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";

/**
 * FINAL V4 SALES SYNC (공개 영업 사이트)
 *
 * ★ 이 페이지의 Primary conversion은 하나뿐이다 — "20분 데모 신청".
 *   Hero · Header · Mobile Sticky · 도입 안내 · Final CTA가 전부 같은 문구,
 *   같은 폼(submission_type = "demo")으로 모인다.
 *   "도입 상담"(consult)과 "4주 파일럿 문의"(pilot)는 그 아래 단계다.
 *
 * ★ 온라인 구매·결제는 여전히 공개하지 않는다.
 *   PurchaseSection은 향후 재사용을 위해 코드로만 남기고 렌더링하지 않는다.
 *   purchase_interest 타입도 홈페이지 전환 경로에서는 쓰지 않는다.
 *
 * ★ 상담 폼 Provider · Header · Footer · 모바일 고정 CTA 는 PublicShell 이 감싼다.
 *   /programs/* · /privacy · /terms 도 같은 틀이라 어디서든 같은 폼이 바로 열린다.
 *   /kindergarten 등 로그인 · 앱 영역은 이 틀 밖이다.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PublicShell>
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* PHASE CONTENT-FINAL — 13개 내러티브 (final-content-system.md §3) */}
        <HeroSection />
        <ProblemSection />
        <WorkflowSection />
        <ContentStorySection />
        <SessionSection />
        <JourneySection />
        <GrowthRecordSection />
        <RolesSection />
        <DirectorDashboardSection />
        <PricingSection />
        <AdoptionSection />
        <SafeOperationSection />
        <FinalCTASection />
      </main>
    </PublicShell>
  );
}
