import { COMPANY_FIELDS } from "@/data/legal";
import { contactInfo } from "@/data/site-copy";
import { siteUrl } from "./site";

/**
 * 검색엔진용 구조화 데이터(JSON-LD).
 *
 * ★ 확정된 사업자 정보(legal.ts COMPANY_FIELDS)와 연락처(site-copy.ts contactInfo)만 쓴다.
 *   대표자 · 통신판매업 신고번호 · 로고 표기처럼 아직 정하지 않은 값은 넣지 않는다.
 * ★ Product · FAQPage 는 아직 만들지 않는다 — 월 이용료 구조를 Product 가격으로 단정하기
 *   어렵고, 공개 FAQ 원문이 없다.
 */

function companyField(label: string): string | undefined {
  const value = COMPANY_FIELDS.find((f) => f.label === label)?.value.trim();
  return value ? value : undefined;
}

export function organizationJsonLd(): Record<string, unknown> {
  const address = companyField("주소");
  const service = companyField("서비스명");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: companyField("상호"),
    url: siteUrl,
    telephone: contactInfo.phone,
    email: contactInfo.email,
    ...(address && {
      address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "KR" },
    }),
    ...(service && { brand: { "@type": "Brand", name: service } }),
  };
}

/** <script type="application/ld+json"> 에 넣을 문자열 — "<" 를 이스케이프해 스크립트 주입을 막는다 */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
