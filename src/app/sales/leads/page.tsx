import { requireHqSales } from "@/lib/auth/admin";
import { hasActiveFilters, parseLeadFilters } from "@/lib/admin/lead-filters";
import { fetchLeadKpis, fetchLeadList } from "@/lib/admin/lead-queries";
import { LeadFilterBar } from "@/app/admin/(dashboard)/leads/LeadFilterBar";
import { LeadKpiRow } from "@/app/admin/(dashboard)/leads/LeadKpiRow";
import { LeadsBrowser } from "@/app/admin/(dashboard)/leads/LeadsBrowser";
import { LeadsPagination } from "@/app/admin/(dashboard)/leads/LeadsPagination";

interface SalesLeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function PanelMessage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-white px-6 py-16 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 text-[14px] text-ink-muted">{description}</p> : null}
    </div>
  );
}

/** HQ Sales 문의 관리 — Admin 과 같은 문의 데이터 (lead_submissions RLS: admin · sales) */
export default async function SalesLeadsPage({ searchParams }: SalesLeadsPageProps) {
  const { supabase } = await requireHqSales();

  const filters = parseLeadFilters(await searchParams);
  const now = new Date();
  const [listResult, kpiResult] = await Promise.all([
    fetchLeadList(supabase, filters, now),
    fetchLeadKpis(supabase),
  ]);
  const filtered = hasActiveFilters(filters);
  const basePath = "/sales/leads";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <h1 className="text-[22px] font-bold text-ink">문의 관리</h1>
      <p className="mt-1 text-[14px] text-ink-muted">도입 문의 · 데모 · Pilot 문의를 관리합니다.</p>

      {!listResult.ok || !kpiResult.ok ? (
        <div className="mt-6">
          <PanelMessage title="문의 데이터를 불러오지 못했습니다." description="잠시 후 다시 시도해 주세요." />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <LeadKpiRow kpis={kpiResult.kpis} />
          <LeadFilterBar filters={filters} basePath={basePath} />
          {kpiResult.kpis.total === 0 ? (
            <PanelMessage title="아직 접수된 문의가 없습니다." />
          ) : listResult.total === 0 ? (
            <PanelMessage
              title="조건에 맞는 문의가 없습니다."
              description={filtered ? "검색어나 필터를 조정해 보세요." : undefined}
            />
          ) : (
            <>
              <LeadsBrowser leads={listResult.rows} />
              <LeadsPagination
                filters={filters}
                basePath={basePath}
                page={listResult.page}
                pageCount={listResult.pageCount}
                total={listResult.total}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
