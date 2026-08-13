import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import {
  hasActiveFilters,
  parseLeadFilters,
} from "@/lib/admin/lead-filters";
import { fetchLeadKpis, fetchLeadList } from "@/lib/admin/lead-queries";
import { LeadFilterBar } from "./LeadFilterBar";
import { LeadKpiRow } from "./LeadKpiRow";
import { LeadsBrowser } from "./LeadsBrowser";
import { LeadsPagination } from "./LeadsPagination";

export const metadata: Metadata = {
  title: "기관 문의 관리 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface AdminLeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function PanelMessage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
      <p className="text-[15px] font-semibold text-navy">{title}</p>
      {description ? (
        <p className="mt-1.5 text-[13px] text-navy/50">{description}</p>
      ) : null}
    </div>
  );
}

export default async function AdminLeadsPage({
  searchParams,
}: AdminLeadsPageProps) {
  // Layout에서도 검사하지만, 데이터를 다루는 페이지에서 독립적으로 다시 확인한다.
  const { supabase } = await requireAdmin();

  const filters = parseLeadFilters(await searchParams);
  const now = new Date();

  const [listResult, kpiResult] = await Promise.all([
    fetchLeadList(supabase, filters, now),
    fetchLeadKpis(supabase),
  ]);

  const filtered = hasActiveFilters(filters);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold text-navy">기관 문의 관리</h1>
        <p className="text-[14px] text-navy/55">
          TeachAble Art Play 도입 문의와 파일럿 신청 현황을 관리합니다.
        </p>
      </div>

      {!listResult.ok || !kpiResult.ok ? (
        <div className="mt-6">
          <PanelMessage
            title="문의 데이터를 불러오지 못했습니다."
            description="잠시 후 다시 시도해주세요."
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <LeadKpiRow kpis={kpiResult.kpis} />

          <LeadFilterBar filters={filters} />

          {kpiResult.kpis.total === 0 ? (
            <PanelMessage title="아직 접수된 문의가 없습니다." />
          ) : listResult.total === 0 ? (
            <PanelMessage
              title="조건에 맞는 문의가 없습니다."
              description={
                filtered ? "검색어나 필터를 조정해보세요." : undefined
              }
            />
          ) : (
            <>
              <LeadsBrowser leads={listResult.rows} />
              <LeadsPagination
                filters={filters}
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
