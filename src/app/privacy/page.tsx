import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { COMPANY_FIELDS, PRIVACY_OFFICER, PRIVACY_POLICY } from "@/data/legal";

/**
 * 개인정보처리방침.
 *
 * ★ 내용은 코드와 스키마에서 확인한 사실만 담는다.
 *   처리 항목은 supabase/migrations 의 실제 컬럼에서, AI 전송 항목은
 *   src/lib/ai 의 실제 payload 구성에서 확인했다(src/data/legal.ts 주석 참조).
 *
 * ★ 검색 결과에 노출한다.
 *   법적 고지는 이용자가 찾을 수 있어야 하므로 색인을 막지 않는다.
 */
export const metadata: Metadata = {
  title: "개인정보처리방침 | TeachAble Art Play",
  description: "TeachAble Art Play 개인정보처리방침",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <LegalDocumentView
        document={PRIVACY_POLICY}
        officer={PRIVACY_OFFICER}
        company={COMPANY_FIELDS}
      />
      <Footer />
    </>
  );
}
