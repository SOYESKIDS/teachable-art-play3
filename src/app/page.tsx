import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileStickyCta } from "@/components/layout/MobileStickyCta";
import { HeroSection } from "@/components/home/HeroSection";
import { WhySection } from "@/components/home/WhySection";
import { NeedsSection } from "@/components/home/NeedsSection";
import { CoreSolutionSection } from "@/components/home/CoreSolutionSection";
import { ClassTeacherSection } from "@/components/home/ClassTeacherSection";
import { ValueSection } from "@/components/home/ValueSection";
import { ContentSection } from "@/components/home/ContentSection";
import { NuriSection } from "@/components/home/NuriSection";
import { PlatformPreviewSection } from "@/components/home/PlatformPreviewSection";
import { AIPrincipleSection } from "@/components/home/AIPrincipleSection";
import { GrowthComparisonSection } from "@/components/home/GrowthComparisonSection";
import { ParentReportSection } from "@/components/home/ParentReportSection";
import { DirectorDashboardSection } from "@/components/home/DirectorDashboardSection";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { SafeOperationSection } from "@/components/home/SafeOperationSection";
import { PricingSection } from "@/components/home/PricingSection";
import { PilotSection } from "@/components/home/PilotSection";
import { AdoptionSection } from "@/components/home/AdoptionSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { LeadFormProvider } from "@/components/forms/LeadFormContext";
import { LeadFormDialog } from "@/components/forms/LeadFormDialog";

/**
 * FINAL V4 SALES SYNC (공개 영업 사이트)
 *
 * ★ 이 페이지의 Primary conversion은 하나뿐이다 — "20분 데모 신청".
 *   Hero · Header · Mobile Sticky · Pilot · Final CTA가 전부 같은 문구,
 *   같은 폼(submission_type = "demo")으로 모인다.
 *   "도입 상담"(consult)과 "4주 파일럿 문의"(pilot)는 그 아래 단계다.
 *
 * ★ 온라인 구매·결제는 여전히 공개하지 않는다.
 *   PurchaseSection은 향후 재사용을 위해 코드로만 남기고 렌더링하지 않는다.
 *   purchase_interest 타입도 홈페이지 전환 경로에서는 쓰지 않는다.
 *
 * ★ Provider를 이 페이지에서만 감싼다.
 *   Header/Footer/MobileStickyCta까지 안으로 넣는 이유는, 그 셋도 데모 CTA를
 *   갖고 있기 때문이다. /programs/*, /kindergarten처럼 Provider가 없는
 *   페이지에서는 LeadCtaButton이 #contact 앵커로 자동 대체된다.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <LeadFormProvider>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <WhySection />
        <NeedsSection />
        <CoreSolutionSection />
        <ClassTeacherSection />
        <ValueSection />
        <ContentSection />
        <NuriSection />
        <PlatformPreviewSection />
        <AIPrincipleSection />
        <GrowthComparisonSection />
        <ParentReportSection />
        <DirectorDashboardSection />
        <BenefitsSection />
        <SafeOperationSection />
        <PricingSection />
        <PilotSection />
        <AdoptionSection />
        <FinalCTASection />
      </main>
      <Footer />
      <MobileStickyCta />
      <LeadFormDialog />
    </LeadFormProvider>
  );
}
