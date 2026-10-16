import Link from "next/link";

export function ProgramEntryBanner({ organizationId }: { organizationId: string }) {
  return <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-secondary-strong/20 bg-secondary-soft p-5">
    <div>
      <h2 className="text-[18px] font-bold text-secondary-strong">다른 주차 수업을 찾으시나요?</h2>
      <p className="mt-1 text-[16px] leading-relaxed text-ink-muted">오늘 수업은 아래에서 준비하세요. 전체 과정과 다른 주차 교안도 확인할 수 있습니다.</p>
    </div>
    <Link href={`/learning?org=${encodeURIComponent(organizationId)}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-secondary-strong px-5 text-[16px] font-bold text-secondary-strong">전체 수업 보기</Link>
  </section>;
}
