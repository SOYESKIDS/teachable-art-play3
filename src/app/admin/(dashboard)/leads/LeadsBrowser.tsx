"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  LEAD_STATUS_BADGE_CLASSES,
  LEAD_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  formatCount,
  formatLeadDate,
  formatPackage,
  toTelHref,
} from "@/lib/admin/lead-labels";
import type { LeadRow } from "@/types/lead";
import { LeadDetailPanel } from "./LeadDetailPanel";

interface LeadsBrowserProps {
  leads: LeadRow[];
}

const headerCellClasses =
  "whitespace-nowrap px-4 py-3 text-[11px] font-semibold tracking-wide text-navy/45";

const bodyCellClasses = "whitespace-nowrap px-4 py-3 text-navy/75";

function StatusBadge({ status }: { status: LeadRow["status"] }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[12px] font-semibold ${LEAD_STATUS_BADGE_CLASSES[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Desktop은 Table, Mobile은 Card List로 렌더한다.
 * (Table을 모바일에서 억지로 축소하지 않는다.)
 */
export function LeadsBrowser({ leads }: LeadsBrowserProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 필터/페이지가 바뀌어 해당 Lead가 목록에서 사라지면 상세도 자동으로 닫힌다
  const selectedLead = leads.find((lead) => lead.id === selectedId) ?? null;

  function handleRowKeyDown(event: KeyboardEvent, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  }

  /** 전화번호 링크 클릭이 행 클릭으로 번지지 않게 한다 */
  function stopRowActivation(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-navy/10 bg-white md:block">
        <table className="w-full min-w-[1040px] border-collapse text-left text-[13px]">
          <thead className="border-b border-navy/10 bg-surface-soft">
            <tr>
              <th scope="col" className={headerCellClasses}>
                접수일
              </th>
              <th scope="col" className={headerCellClasses}>
                신청 유형
              </th>
              <th scope="col" className={headerCellClasses}>
                기관명
              </th>
              <th scope="col" className={headerCellClasses}>
                담당자
              </th>
              <th scope="col" className={headerCellClasses}>
                연락처
              </th>
              <th scope="col" className={`${headerCellClasses} text-right`}>
                원아 수
              </th>
              <th scope="col" className={`${headerCellClasses} text-right`}>
                반 수
              </th>
              <th scope="col" className={headerCellClasses}>
                관심 상품
              </th>
              <th scope="col" className={headerCellClasses}>
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                tabIndex={0}
                role="button"
                aria-label={`${lead.institution_name} 문의 상세 보기`}
                onClick={() => setSelectedId(lead.id)}
                onKeyDown={(event) => handleRowKeyDown(event, lead.id)}
                className="cursor-pointer border-b border-navy/8 transition-colors last:border-b-0 hover:bg-yellow/8 focus-visible:bg-yellow/8"
              >
                <td className={bodyCellClasses}>
                  {formatLeadDate(lead.created_at)}
                </td>
                <td className={bodyCellClasses}>
                  {SUBMISSION_TYPE_LABELS[lead.submission_type]}
                </td>
                <th
                  scope="row"
                  className="max-w-[240px] truncate px-4 py-3 text-left text-[14px] font-bold text-navy"
                >
                  {lead.institution_name}
                </th>
                <td className={bodyCellClasses}>{lead.contact_name}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <a
                    href={toTelHref(lead.phone)}
                    onClick={stopRowActivation}
                    className="font-medium text-trust-blue hover:underline"
                  >
                    {lead.phone}
                  </a>
                </td>
                <td className={`${bodyCellClasses} text-right tabular-nums`}>
                  {formatCount(lead.child_count, "")}
                </td>
                <td className={`${bodyCellClasses} text-right tabular-nums`}>
                  {formatCount(lead.class_count, "")}
                </td>
                <td className={bodyCellClasses}>
                  {formatPackage(lead.package_code)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <ul className="flex flex-col gap-3 md:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <button
              type="button"
              onClick={() => setSelectedId(lead.id)}
              className="w-full rounded-xl border border-navy/10 bg-white p-4 text-left transition-colors hover:border-navy/25"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-navy">
                  {lead.institution_name}
                </p>
                <StatusBadge status={lead.status} />
              </div>

              <p className="mt-1 text-[12px] font-semibold text-trust-blue">
                {SUBMISSION_TYPE_LABELS[lead.submission_type]}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-navy/8 pt-3 text-[13px] text-navy/65">
                <span className="truncate">{lead.contact_name}</span>
                <span className="shrink-0 tabular-nums">
                  {formatLeadDate(lead.created_at)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedLead ? (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}
