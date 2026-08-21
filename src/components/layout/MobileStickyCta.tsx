import { ButtonLink } from "@/components/ui/Button";
import { ctaLabels } from "@/data/site-copy";

/**
 * Mobile 전용 하단 고정 CTA. Desktop(lg 이상)에서는 노출하지 않는다.
 * 공개 버전에서는 신청/구매 폼이 아닌 담당자 연락처(CONTACT Section)로 이동한다.
 */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-ivory/95 p-3 backdrop-blur lg:hidden">
      <ButtonLink
        href="#contact"
        variant="primary"
        data-cta="contact-mobile-sticky"
        className="flex w-full items-center justify-center px-6 py-3.5 text-base font-bold"
      >
        {ctaLabels.contact}
      </ButtonLink>
    </div>
  );
}
