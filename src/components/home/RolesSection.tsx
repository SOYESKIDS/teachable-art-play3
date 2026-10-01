import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { rolesNarrative as copy } from "@/data/home-narrative";

/**
 * 08 FOR TEACHER / DIRECTOR / PARENT.
 *
 * ★ 역할마다 "무엇이 좋아지는가" 한 문장 + 실제로 받는 것 목록 + 제공 상태.
 *   학부모 화면은 CO-12 로 출시 전이라 "준비 중"으로 분명히 적는다.
 */
export function RolesSection() {
  return (
    <HomeSection id="benefits" tone="white" labelledBy="roles-title">
      <HomeHeading id="roles-title" eyebrow={copy.eyebrow} headline={copy.headline} />

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {copy.roles.map((role) => (
          <article key={role.key} className="flex flex-col rounded-3xl border border-line bg-ivory p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow-ko text-accent-strong">{role.label}</p>
              <AvailabilityTag value={role.availability} />
            </div>
            <h3 className="mt-4 whitespace-pre-line text-title font-bold text-navy">{role.title}</h3>
            <ul className="mt-5 flex flex-col gap-2">
              {role.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-label text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0 text-secondary">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            {role.note ? (
              <p className="mt-auto border-t border-line pt-4 text-caption text-ink-muted [margin-top:max(1.5rem,auto)]">
                {role.note}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </HomeSection>
  );
}
