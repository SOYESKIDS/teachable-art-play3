import Link from "next/link";
import {
  ORGANIZATION_STATUS_BADGE_CLASSES,
  ORGANIZATION_STATUS_LABELS,
  formatInstitutionType,
  formatOrganizationDate,
} from "@/lib/admin/organization-labels";
import type { OrganizationRow } from "@/types/organization";

interface OrganizationsTableProps {
  organizations: OrganizationRow[];
}

const headerCellClasses =
  "whitespace-nowrap px-4 py-3 text-[11px] font-semibold tracking-wide text-navy/45";

const bodyCellClasses = "whitespace-nowrap px-4 py-3 text-navy/75";

function StatusBadge({ status }: { status: OrganizationRow["status"] }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${ORGANIZATION_STATUS_BADGE_CLASSES[status]}`}
    >
      {ORGANIZATION_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Desktop은 Table, Mobile은 Card List.
 *
 * 행 전체를 Link로 감싸는 대신 기관명 셀에 Link를 두고 `after:absolute`로
 * 행 전체를 클릭 영역으로 확장한다. 중첩 인터랙티브 요소 없이 접근성을 유지한다.
 */
export function OrganizationsTable({ organizations }: OrganizationsTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-navy/10 bg-white md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead className="border-b border-navy/10 bg-surface-soft">
            <tr>
              <th scope="col" className={headerCellClasses}>
                기관명
              </th>
              <th scope="col" className={headerCellClasses}>
                기관 유형
              </th>
              <th scope="col" className={headerCellClasses}>
                상태
              </th>
              <th scope="col" className={headerCellClasses}>
                등록일
              </th>
              <th scope="col" className={headerCellClasses}>
                수정일
              </th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((organization) => (
              <tr
                key={organization.id}
                className="relative border-b border-navy/8 transition-colors last:border-b-0 hover:bg-yellow/8 focus-within:bg-yellow/8"
              >
                <th
                  scope="row"
                  className="max-w-[320px] truncate px-4 py-3 text-left text-[14px] font-bold text-navy"
                >
                  <Link
                    href={`/admin/organizations/${organization.id}`}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {organization.name}
                  </Link>
                </th>
                <td className={bodyCellClasses}>
                  {formatInstitutionType(organization.institution_type)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={organization.status} />
                </td>
                <td className={`${bodyCellClasses} tabular-nums`}>
                  {formatOrganizationDate(organization.created_at)}
                </td>
                <td className={`${bodyCellClasses} tabular-nums`}>
                  {formatOrganizationDate(organization.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <ul className="flex flex-col gap-3 md:hidden">
        {organizations.map((organization) => (
          <li key={organization.id}>
            <Link
              href={`/admin/organizations/${organization.id}`}
              className="block rounded-xl border border-navy/10 bg-white p-4 transition-colors hover:border-navy/25"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-navy">
                  {organization.name}
                </p>
                <StatusBadge status={organization.status} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-navy/8 pt-3 text-[13px] text-navy/65">
                <span>{formatInstitutionType(organization.institution_type)}</span>
                <span className="shrink-0 tabular-nums">
                  {formatOrganizationDate(organization.created_at)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
