import Link from "next/link";
import type { OrganizationEntitlementResult } from "@/lib/entitlement/queries";
import { contractWeekAccess } from "@/lib/learning/program-entry";
import { WEEK_INDEX, isIntegrationWeek } from "@/lib/weeks/week-index";
import { PARTS } from "@/lib/weeks/week-types";

/** A topic outline, not a claim about the linked DB version's publication/media state. */
export function LearningWeekMap({ entitlement, organizationId, durationWeeks = 24, program }: {
  entitlement: OrganizationEntitlementResult;
  organizationId: string;
  durationWeeks?: number;
  program?: string;
}) {
  const org = `org=${encodeURIComponent(organizationId)}`;
  const weeks = WEEK_INDEX.filter(week => week.weekNo <= durationWeeks);
  const included = weeks.filter(week => contractWeekAccess(entitlement, week.weekNo).allowed).length;
  const parts = PARTS.filter(part => part.weekFrom <= durationWeeks);

  return <>
    <div className="mt-5 rounded-xl border border-line bg-white p-5">
      <p className="text-[16px] font-semibold text-navy">
        {entitlement.ok ? `전체 ${weeks.length}주 중 ${included}주가 기관 이용 범위에 포함됩니다.` : "기관 이용 범위를 확인하지 못했습니다."}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
        아래는 주제와 활동 구성 안내입니다. 교안 본문은 기관에 연결된 발행본으로 열립니다.
        이용 범위에 포함되어도 교안 발행·자료 등록·수업 일정은 각각 확인해야 합니다.
      </p>
      <nav aria-label="주차 구간 바로가기" className="mt-3 flex flex-wrap gap-2">
        {parts.map(part => <a key={part.partNo} href={`#learning-part-${part.partNo}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-[14px] font-semibold text-navy">
          {part.weekFrom}~{Math.min(part.weekTo, durationWeeks)}주
        </a>)}
      </nav>
    </div>
    {parts.map(part => <section key={part.partNo} id={`learning-part-${part.partNo}`}
      className="mt-8 scroll-mt-40" aria-labelledby={`learning-part-title-${part.partNo}`}>
      <h2 id={`learning-part-title-${part.partNo}`} className="text-[20px] font-bold text-navy">
        PART {part.partNo} · {part.weekFrom}~{Math.min(part.weekTo, durationWeeks)}주
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {weeks.filter(week => week.partNo === part.partNo).map(week => {
          const access = contractWeekAccess(entitlement, week.weekNo);
          const path = program ? `/learning/${program}/weeks/${week.weekNo}` : `/teacher/weeks/${week.weekNo}`;
          return <li key={week.weekNo}><Link href={`${path}?${org}`} prefetch={false}
            aria-label={`${week.weekNo}주차 ${week.title} · ${access.allowed ? "교안과 준비 상태 확인" : access.label}`}
            className="flex h-full gap-4 rounded-xl border border-line bg-white p-5 transition-colors hover:border-secondary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px] font-bold ${access.allowed ? "bg-secondary-soft text-secondary-strong" : "bg-surface-soft text-ink-muted"}`}>{week.weekNo}</span>
            <span className="min-w-0">
              <span className="block text-[17px] font-bold text-navy">{week.title}</span>
              <span className="mt-1 block text-[14px] text-ink-muted">성장키워드 · {week.growthKeyword}</span>
              <span className="mt-2 block text-[15px] leading-relaxed text-ink-muted">{week.activitySummary}</span>
              {isIntegrationWeek(week.weekNo) ? <span className="mt-2 block text-[13px] text-ink-muted">앞선 주차 결과물을 모으는 수업</span> : null}
              <span className={`mt-3 block text-[14px] font-semibold ${access.allowed ? "text-secondary-strong" : "text-ink-muted"}`}>
                {access.allowed ? "교안과 준비 상태 확인 →" : `${access.label} · 안내 보기`}
              </span>
            </span>
          </Link></li>;
        })}
      </ul>
    </section>)}
  </>;
}
