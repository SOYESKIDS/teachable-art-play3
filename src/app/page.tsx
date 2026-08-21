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

/**
 * PUBLIC LAUNCH-01 (공개 홈페이지 1차 오픈)
 *
 * 이번 공개 버전에서는 온라인 구매/결제 흐름과 공개 신청 폼을 노출하지 않는다.
 * 관련 코드(PurchaseSection, LeadFormProvider, LeadFormDialog, LeadForm,
 * lead_submissions 서버 코드/관리자 문의 관리)는 향후 재사용을 위해 그대로 보존하고,
 * 이 페이지에서 렌더링만 하지 않는다.
 */
export default function Home() {
  return (
    <>
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
    </>
  );
}
