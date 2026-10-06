import { AvailabilityTag, HomeHeading, HomeSection } from "./HomeSection";
import { rolesNarrative as copy } from "@/data/home-narrative";

type Role = (typeof copy.roles)[number];

/**
 * 08 VALUE BY ROLE — 같은 기록을 각자 필요한 만큼.
 *
 * ★ V4: 세 장을 같은 기능 목록 카드로 두지 않는다. 역할마다 "하루에서 무엇이 달라지는가"를
 *   다른 모양으로 보여 준다.
 *     교사   — 하루의 순서 (번호 + 세로 선)
 *     원장   — 한눈에 보는 상태 (2열 칸)
 *     학부모 — 준비 중인 경험 (차분한 면 · 상태 배지 먼저)
 *   문구는 home-narrative.ts 그대로 (CONTENT LOCK).
 */
function RoleHeader({ role }: { role: Role }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow-ko text-accent-strong">{role.label}</p>
        <AvailabilityTag value={role.availability} />
      </div>
      <h3 className="mt-4 whitespace-pre-line text-title font-bold text-navy">{role.title}</h3>
    </>
  );
}

export function RolesSection() {
  const [teacher, director, parent] = copy.roles;

  return (
    <HomeSection id="benefits" tone="white" labelledBy="roles-title">
      <HomeHeading id="roles-title" eyebrow={copy.eyebrow} headline={copy.headline} />

      <div className="mt-12 grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.9fr]">
        {/* 교사 — 하루의 순서 */}
        <article className="flex flex-col rounded-3xl border border-line bg-ivory p-6 sm:p-7">
          <RoleHeader role={teacher} />
          <ol className="relative mt-6 flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line-strong">
            {teacher.items.map((item, index) => (
              <li key={item} className="relative flex items-center gap-3 text-label text-ink">
                <span
                  aria-hidden="true"
                  className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-micro font-bold text-navy tabular-nums"
                >
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </article>

        {/* 원장 — 상태 칸 */}
        <article className="flex flex-col rounded-3xl border border-line bg-white p-6 sm:p-7">
          <RoleHeader role={director} />
          <ul className="mt-6 grid grid-cols-2 gap-2">
            {director.items.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-xl bg-surface-soft px-3 py-2.5 text-caption font-semibold text-navy">
                <span aria-hidden="true" className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                {item}
              </li>
            ))}
          </ul>
          {director.note ? (
            <p className="mt-auto border-t border-line pt-4 text-caption text-ink-muted [margin-top:max(1.25rem,auto)]">
              {director.note}
            </p>
          ) : null}
        </article>

        {/* 학부모 — 준비 중 */}
        <article className="flex flex-col rounded-3xl border border-info-border bg-info-soft/60 p-6 sm:p-7">
          <RoleHeader role={parent} />
          <ul className="mt-6 flex flex-col gap-2">
            {parent.items.map((item) => (
              <li key={item} className="border-l-2 border-info-border pl-3 text-label text-ink">
                {item}
              </li>
            ))}
          </ul>
          {parent.note ? (
            <p className="mt-auto border-t border-info-border pt-4 text-caption text-ink-muted [margin-top:max(1.25rem,auto)]">
              {parent.note}
            </p>
          ) : null}
        </article>
      </div>
    </HomeSection>
  );
}
