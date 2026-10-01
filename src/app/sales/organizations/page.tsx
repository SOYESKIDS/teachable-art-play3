import { requireHqSales } from "@/lib/auth/admin";
import {
  CONTRACT_STATUS_LABELS,
  SERVICE_MODE_LABELS,
  contractPeriodLabel,
  formatDotDate,
  isContractStatus,
  isServiceMode,
  seoulToday,
} from "@/lib/entitlement/labels";

interface SalesOrganizationRow {
  organization_id: string;
  organization_name: string;
  organization_status: string;
  service_mode: string;
  contract_status: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  product_name: string | null;
  version_label: string | null;
  scoped_class_count: number;
  active_class_count: number;
  active_child_count: number;
  teacher_count: number;
  overage_child_count: number;
}

/**
 * HQ Sales 기관 영업 현황 (DEC-058 · DEC-106).
 * 아동 이름 · 상세 · 기록 없음. 숫자 집계와 계약 메타만.
 * 초과 인원은 운영 정보이며 청구 표현을 쓰지 않는다 (DEC-095).
 */
export default async function SalesOrganizationsPage() {
  const { supabase } = await requireHqSales();
  const { data, error } = await supabase.rpc("hq_sales_organization_summary");
  const today = seoulToday();

  if (error) {
    console.error("[sales] organization summary failed:", error.code ?? "unknown");
  }

  const rows = (Array.isArray(data) ? data : []) as SalesOrganizationRow[];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <h1 className="text-headline font-bold text-navy">기관 영업 현황</h1>
      <p className="mt-1 text-label text-ink-muted">
        계약 · 이용 현황 요약입니다. 원아 개인 정보와 기록은 표시하지 않습니다.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-label text-danger">
          영업 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-hairline bg-white px-6 py-12 text-center text-body-sm text-ink">
          등록된 기관이 없습니다.
        </p>
      ) : (
        <>
        {/* 좁은 화면: 기관별 카드. 표를 가로로 밀지 않는다. (읽기 전용 · 넓은 화면은 아래 표) */}
        <ul className="mt-6 flex flex-col gap-3 md:hidden">
          {rows.map((row) => (
            <li key={row.organization_id} className="rounded-xl border border-hairline bg-white p-4">
              <p className="break-words text-body-sm font-bold text-navy">{row.organization_name}</p>
              <p className="mt-0.5 text-caption text-ink-muted">
                {isServiceMode(row.service_mode) ? SERVICE_MODE_LABELS[row.service_mode] : "—"}
                {" · "}
                {row.product_name ? `${row.product_name} (${row.version_label ?? "—"})` : "상품 없음"}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-label">
                <div className="col-span-2">
                  <dt className="text-caption font-semibold text-ink-muted">계약 상태</dt>
                  <dd className="text-ink">
                    {isContractStatus(row.contract_status) ? CONTRACT_STATUS_LABELS[row.contract_status] : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-caption font-semibold text-ink-muted">이용 기간</dt>
                  <dd className="tabular-nums text-ink">
                    {row.contract_start_date
                      ? `${formatDotDate(row.contract_start_date)} ~ ${formatDotDate(row.contract_end_date)} · ${contractPeriodLabel(row.contract_start_date, row.contract_end_date, today)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold text-ink-muted">계약 반</dt>
                  <dd className="tabular-nums text-ink">
                    {row.scoped_class_count} / {row.active_class_count}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold text-ink-muted">원아 수</dt>
                  <dd className="tabular-nums text-ink">{row.active_child_count}</dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold text-ink-muted">교사 수</dt>
                  <dd className="tabular-nums text-ink">{row.teacher_count}</dd>
                </div>
                <div>
                  <dt className="text-caption font-semibold text-ink-muted">기준 초과</dt>
                  <dd className="tabular-nums text-ink">
                    {row.overage_child_count > 0 ? `${row.overage_child_count}명` : "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className="mt-6 hidden overflow-x-auto rounded-xl border border-hairline bg-white md:block">
          <table className="w-full min-w-[980px] border-collapse text-left text-label text-ink">
            <caption className="sr-only">기관별 계약 · 이용 요약</caption>
            <thead className="bg-brand-ivory text-caption text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">기관</th>
                <th scope="col" className="px-4 py-3 font-semibold">서비스</th>
                <th scope="col" className="px-4 py-3 font-semibold">상품</th>
                <th scope="col" className="px-4 py-3 font-semibold">계약 상태</th>
                <th scope="col" className="px-4 py-3 font-semibold">이용 기간</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">계약 반</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">원아 수</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">교사 수</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">기준 초과</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.organization_id} className="border-t border-hairline">
                  <th scope="row" className="px-4 py-3 font-semibold">
                    {row.organization_name}
                  </th>
                  <td className="px-4 py-3">
                    {isServiceMode(row.service_mode) ? SERVICE_MODE_LABELS[row.service_mode] : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.product_name ? `${row.product_name} (${row.version_label ?? "—"})` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isContractStatus(row.contract_status) ? CONTRACT_STATUS_LABELS[row.contract_status] : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.contract_start_date
                      ? `${formatDotDate(row.contract_start_date)} ~ ${formatDotDate(row.contract_end_date)} · ${contractPeriodLabel(row.contract_start_date, row.contract_end_date, today)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.scoped_class_count} / {row.active_class_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.active_child_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.teacher_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.overage_child_count > 0 ? `${row.overage_child_count}명` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
