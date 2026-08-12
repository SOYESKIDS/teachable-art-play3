"use client";

import { Button } from "@/components/ui/Button";
import { ctaLabels } from "@/data/site-copy";
import { useLeadForm } from "@/components/forms/LeadFormContext";

/** Mobile 전용 하단 고정 CTA. Desktop(lg 이상)에서는 노출하지 않는다. */
export function MobileStickyCta() {
  const { openLeadForm } = useLeadForm();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-ivory/95 p-3 backdrop-blur lg:hidden">
      <Button
        type="button"
        variant="primary"
        data-cta="pilot-mobile-sticky"
        onClick={() => openLeadForm("pilot")}
        className="flex w-full items-center justify-center px-6 py-3.5 text-base font-bold"
      >
        {ctaLabels.primary}
      </Button>
    </div>
  );
}
