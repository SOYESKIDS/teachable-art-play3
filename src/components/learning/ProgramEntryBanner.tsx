import Link from "next/link";

export function ProgramEntryBanner({ organizationId }: { organizationId: string }) {
  return <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-secondary-strong/20 bg-secondary-soft p-5">
    <div>
      <h2 className="text-[18px] font-bold text-secondary-strong">8주·16주·24주 수업 프로그램</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">오늘의 일정과 별도로 프로그램과 주차별 수업 구성을 확인하세요.</p>
    </div>
    <Link href={`/learning?org=${encodeURIComponent(organizationId)}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-secondary-strong px-5 text-[14px] font-bold text-white">수업하기</Link>
  </section>;
}
