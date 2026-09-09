import { LeadCtaButton } from "@/components/forms/LeadCtaButton";
import { ctaLabels } from "@/data/site-copy";

/**
 * Mobile 전용 하단 고정 CTA. Desktop(lg 이상)에서는 노출하지 않는다.
 *
 * ★ 홈페이지의 Primary conversion과 같은 행동을 가리킨다 — 20분 데모 신청.
 *   Hero의 데모 버튼은 스크롤하면 사라지지만 이 버튼은 계속 남는다.
 *   두 버튼이 다른 말을 하면 방문자는 무엇이 본 행동인지 판단해야 한다.
 *   LeadFormProvider가 없는 페이지에서는 #contact 앵커로 자동 대체된다.
 *
 * 아래 여백에 env(safe-area-inset-bottom)을 더하는 이유:
 * iPhone 홈 인디케이터 영역은 bottom-0 기준으로 화면 안쪽 약 34px을 차지한다.
 * 그대로 두면 버튼 하단이 인디케이터와 겹쳐 터치가 빗나간다.
 * 지원하지 않는 브라우저에서는 0px로 계산되어 기존과 동일하다.
 */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-ivory/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur lg:hidden">
      <LeadCtaButton
        type="demo"
        variant="primary"
        dataCta="demo-mobile-sticky"
        className="flex w-full items-center justify-center px-6 py-3.5 text-base font-bold"
      >
        {ctaLabels.demo}
      </LeadCtaButton>
    </div>
  );
}
