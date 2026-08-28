import { ButtonLink } from "@/components/ui/Button";
import { ctaLabels } from "@/data/site-copy";

/**
 * Mobile 전용 하단 고정 CTA. Desktop(lg 이상)에서는 노출하지 않는다.
 * 공개 버전에서는 신청/구매 폼이 아닌 담당자 연락처(CONTACT Section)로 이동한다.
 *
 * 아래 여백에 env(safe-area-inset-bottom)을 더하는 이유:
 * iPhone 홈 인디케이터 영역은 bottom-0 기준으로 화면 안쪽 약 34px을 차지한다.
 * 그대로 두면 버튼 하단이 인디케이터와 겹쳐 터치가 빗나간다.
 * 지원하지 않는 브라우저에서는 0px로 계산되어 기존과 동일하다.
 */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-ivory/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur lg:hidden">
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
