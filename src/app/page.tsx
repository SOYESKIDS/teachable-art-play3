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
import { PurchaseSection } from "@/components/home/PurchaseSection";
import { AdoptionSection } from "@/components/home/AdoptionSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { LeadFormProvider } from "@/components/forms/LeadFormContext";
import { LeadFormDialog } from "@/components/forms/LeadFormDialog";

export default function Home() {
  return (
    <LeadFormProvider>
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
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
        <PurchaseSection />
        <AdoptionSection />
        <FinalCTASection />
      </main>
      <Footer />
      <MobileStickyCta />
      <LeadFormDialog />
    </LeadFormProvider>
  );
}
