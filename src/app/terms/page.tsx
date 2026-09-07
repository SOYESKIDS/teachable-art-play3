import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { COMPANY_FIELDS, TERMS_OF_SERVICE } from "@/data/legal";

/**
 * 이용약관.
 *
 * ★ 현재 서비스에 없는 흐름을 만들지 않는다.
 *   공개 홈페이지에는 즉시 결제나 온라인 구독 신청이 없다. 그래서 약관도
 *   "웹에서 결제하면 구독이 시작된다"고 쓰지 않고, 요금·계약기간·결제조건은
 *   개별 계약이 우선한다고 적는다.
 *
 * ★ 가격을 약관 본문에 박지 않는다.
 *   가격은 상품 안내 화면(data/packages.ts)이 단일 출처다.
 *   약관에 숫자를 복사해 두면 둘이 갈라지는 날이 온다.
 */
export const metadata: Metadata = {
  title: "이용약관 | TeachAble Art Play",
  description: "TeachAble Art Play 서비스 이용약관",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <LegalDocumentView document={TERMS_OF_SERVICE} company={COMPANY_FIELDS} />
      <Footer />
    </>
  );
}
