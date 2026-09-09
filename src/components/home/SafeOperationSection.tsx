import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  safeOperationCopy,
  safeOperationNote,
  safeOperationPrinciples,
} from "@/data/site-copy";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-6 w-6",
  "aria-hidden": true,
};

/**
 * safeOperationPrinciples 순서와 반드시 일치해야 하는 아이콘.
 * 01 사전 합의(문서) · 02 공개 범위(잠금) · 03 교사 승인(체크) · 04 이관·파기(보관함)
 */
const principleIcons: ReactNode[] = [
  <svg key="agreement" {...iconProps}>
    <path d="M6.5 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
    <path d="M13.5 3.5V8h4.5" />
    <path d="M9 13h6M9 16.5h4" />
  </svg>,
  <svg key="scope" {...iconProps}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>,
  <svg key="approval" {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.3 2.3 2.3 5-5.4" />
  </svg>,
  <svg key="retention" {...iconProps}>
    <path d="M4.5 7.5h15v11a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-11Z" />
    <path d="M3.5 4.5h17v3h-17z" />
    <path d="M10 12h4" />
  </svg>,
];

export function SafeOperationSection() {
  return (
    <section
      id="safe-operation"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeader
          headline={safeOperationCopy.headline}
          subCopy={safeOperationCopy.subCopy}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {safeOperationPrinciples.map((principle, index) => (
            <div
              key={principle.order}
              className="flex flex-col items-start gap-4 rounded-2xl border border-navy/10 bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/[0.06] text-navy">
                {principleIcons[index]}
              </span>
              <p className="text-base font-bold leading-snug text-navy sm:text-lg">
                {principle.text}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm font-medium text-navy/45">
          {safeOperationCopy.reconnect}
        </p>

        {/*
          ★ 보관기간·인증 규격 같은 확정되지 않은 값을 여기에 쓰지 않는다.
            계약서에서 정해질 값을 홈페이지가 먼저 말하면 나중에 어긋난다.
            원칙만 말하고 조건은 서면으로 넘긴다.
        */}
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-navy/40">
          {safeOperationNote}
        </p>
      </Container>
    </section>
  );
}
