import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import {
  hasActiveOrganizationFilters,
  parseOrganizationFilters,
} from "@/lib/admin/organization-filters";
import {
  fetchOrganizationKpis,
  fetchOrganizationList,
} from "@/lib/admin/organization-queries";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { OrganizationFilterBar } from "./OrganizationFilterBar";
import { OrganizationsPagination } from "./OrganizationsPagination";
import { OrganizationsTable } from "./OrganizationsTable";

export const metadata: Metadata = {
  title: "기관 관리 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface AdminOrganizationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOrganizationsPage({
  searchParams,
}: AdminOrganizationsPageProps) {
  // Layout에서도 검사하지만, 데이터를 다루는 페이지에서 독립적으로 다시 확인한다.
  const { supabase } = await requireAdmin();

  const filters = parseOrganizationFilters(await searchParams);

  const [listResult, kpiResult] = await Promise.all([
    fetchOrganizationList(supabase, filters),
    fetchOrganizationKpis(supabase),
  ]);

  const filtered = hasActiveOrganizationFilters(filters);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline font-bold text-navy">기관 관리</h1>
          <p className="text-label text-ink-muted">
            TeachAble Art Play를 사용하는 유치원 및 교육기관을 관리합니다.
          </p>
        </div>

        <div className="shrink-0">
          <CreateOrganizationDialog />
        </div>
      </div>

      {!listResult.ok || !kpiResult.ok ? (
        <div className="mt-6 rounded-xl border border-line bg-white px-6 py-16 text-center">
          <p className="text-body-sm font-semibold text-navy">
            기관 데이터를 불러오지 못했습니다.
          </p>
          <p className="mt-1.5 text-caption text-ink-muted">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {/* 규모는 한 줄로 작게 — 화면의 주인공은 아래 목록이다 */}
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line-soft">
            {[
              { label: "전체 기관", value: kpiResult.kpis.total, warn: false },
              { label: "운영중", value: kpiResult.kpis.active, warn: false },
              {
                label: "이용중지",
                value: kpiResult.kpis.suspended,
                warn: kpiResult.kpis.suspended > 0,
              },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-3">
                <dt
                  className={`text-micro font-semibold ${
                    item.warn ? "text-warning-text" : "text-ink-muted"
                  }`}
                >
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-title font-bold tabular-nums text-navy">
                  {item.value.toLocaleString("ko-KR")}
                </dd>
              </div>
            ))}
          </dl>

          <OrganizationFilterBar filters={filters} />

          {kpiResult.kpis.total === 0 ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
              <p className="text-body-sm font-semibold text-navy">
                아직 등록된 기관이 없습니다.
              </p>
              <p className="mt-1.5 text-caption text-ink-muted">
                첫 기관을 등록해 서비스 운영을 시작하세요.
              </p>
              <div className="mt-5 flex justify-center">
                <CreateOrganizationDialog variant="outline" />
              </div>
            </div>
          ) : listResult.total === 0 ? (
            <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
              <p className="text-body-sm font-semibold text-navy">
                조건에 맞는 기관이 없습니다.
              </p>
              {filtered ? (
                <p className="mt-1.5 text-caption text-ink-muted">
                  검색어나 상태 필터를 조정해보세요.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <OrganizationsTable organizations={listResult.rows} />
              <OrganizationsPagination
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
