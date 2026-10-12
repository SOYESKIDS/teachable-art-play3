import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell, InfoSection } from "@/components/public/InfoPageShell";
import { faqGroups } from "@/data/public-info";

/**
 * 자주 묻는 질문 — 실행 묶음 D1.
 *
 * ★ 확정된 사실만 답한다.
 *   가격·기간·수업 시간·연락처는 data/packages.ts · site-copy.ts 를 읽는다.
 *   미확정 정책(환불 · 자동갱신 · 결제주기 · 해지)은 "확정되지 않았다"고 적는다.
 *
 * ★ 없는 약속을 만들지 않는다. 출시월·분기·무료 조건을 쓰지 않는다.
 */
export const metadata: Metadata = {
  title: "자주 묻는 질문 | TeachAble Art Play",
  description:
    "TeachAble Art Play 도입 전에 많이 받는 질문과 답변입니다. 프로그램 운영, 기록과 리포트, 도입 절차를 안내합니다.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <PublicShell>
      <InfoPageShell
        eyebrow="FAQ"
        headline={"자주 묻는 질문"}
        subCopy="확인된 내용만 적었습니다. 아직 정해지지 않은 조건은 정해지지 않았다고 안내드립니다."
      >
        {faqGroups.map((group) => (
          <InfoSection key={group.id} id={group.id} title={group.title}>
            <dl className="flex flex-col gap-6">
              {group.items.map((item) => (
                <div key={item.id} id={item.id} className="scroll-mt-28">
                  <dt className="text-body font-bold leading-snug text-navy">
                    {item.question}
                  </dt>
                  <dd className="mt-2 flex flex-col gap-2">
                    {item.answer.map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-body-sm leading-[1.9] text-navy/80"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </InfoSection>
        ))}

        <p className="mt-12 border-t border-line pt-6 text-caption leading-relaxed text-ink-muted">
          여기에 없는 질문은 도입 상담으로 보내 주세요. 담당자가 확인한 뒤 1주일 이내에
          회신드립니다.
        </p>
      </InfoPageShell>
    </PublicShell>
  );
}
