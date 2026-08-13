import type { LeadKpis } from "@/lib/admin/lead-queries";

interface LeadKpiRowProps {
  kpis: LeadKpis;
}

/** 모든 숫자는 실제 DB 집계 결과다 */
export function LeadKpiRow({ kpis }: LeadKpiRowProps) {
  const items: { label: string; value: number; accent?: boolean }[] = [
    { label: "전체 문의", value: kpis.total },
    { label: "신규", value: kpis.newCount, accent: true },
    { label: "4주 파일럿", value: kpis.pilot },
    { label: "대시보드 데모", value: kpis.demo },
    { label: "기관 상담", value: kpis.consult },
    { label: "상품 관심", value: kpis.purchaseInterest },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border bg-white px-4 py-3.5 ${
            item.accent ? "border-yellow/50" : "border-navy/10"
          }`}
        >
          <dt className="text-[11px] font-semibold text-navy/45">
            {item.label}
          </dt>
          <dd className="mt-1 text-[24px] font-bold tabular-nums text-navy">
            {item.value.toLocaleString("ko-KR")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
