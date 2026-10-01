import { HomeHeading, HomeSection } from "./HomeSection";
import { trustNarrative as copy } from "@/data/home-narrative";

/**
 * 12 TRUST — 승인된 운영 원칙만.
 *
 * ★ 신뢰를 숫자 · 후기 · 인증 마크로 만들지 않는다. 근거가 있는 원칙만 적는다.
 *   (DEC-009 · DEC-030 · DEC-058 · DEC-059 · DEC-065 · DEC-071 · DEC-074 · CO-2)
 * ★ 보관 기간처럼 계약에서 정해질 값은 홈페이지가 먼저 말하지 않는다.
 */
export function SafeOperationSection() {
  return (
    <HomeSection id="safe-operation" tone="ivory" labelledBy="trust-title" compact>
      <HomeHeading id="trust-title" eyebrow={copy.eyebrow} headline={copy.headline} />

      <ul className="mt-10 grid gap-x-10 gap-y-0 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {copy.principles.map((item, index) => (
          <li key={item.title} className="border-b border-line py-6">
            <p className="flex items-baseline gap-3">
              <span className="text-caption font-bold text-accent-strong tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-body-lg font-bold text-navy">{item.title}</span>
            </p>
            <p className="mt-2 pl-8 text-label text-ink-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
