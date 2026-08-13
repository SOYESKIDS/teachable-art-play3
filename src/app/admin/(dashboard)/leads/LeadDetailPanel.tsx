"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { LEAD_STATUSES } from "@/lib/admin/lead-filters";
import {
  LEAD_STATUS_BADGE_CLASSES,
  LEAD_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  formatCount,
  formatLeadDateTime,
  formatPackage,
  toTelHref,
} from "@/lib/admin/lead-labels";
import type { LeadRow } from "@/types/lead";
import { updateLeadStatusAction } from "./actions";
import { STATUS_UPDATE_INITIAL_STATE } from "./status-state";

interface LeadDetailPanelProps {
  lead: LeadRow;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-navy/8 py-3">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="text-[14px] text-navy">{children}</dd>
    </div>
  );
}

function AgreementMark({ agreed }: { agreed: boolean }) {
  return (
    <span className={agreed ? "text-navy" : "text-navy/40"}>
      {agreed ? "동의" : "미동의"}
    </span>
  );
}

/**
 * Desktop에서는 우측 Drawer, Mobile에서는 하단 Sheet로 동작한다.
 * UUID 등 내부 식별자는 화면에 표시하지 않는다.
 */
export function LeadDetailPanel({ lead, onClose }: LeadDetailPanelProps) {
  const [state, formAction, isPending] = useActionState(
    updateLeadStatusAction,
    STATUS_UPDATE_INITIAL_STATE,
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-navy/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${lead.institution_name} 문의 상세`}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:max-h-none sm:h-full sm:max-w-[480px] sm:rounded-none sm:rounded-l-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-navy/45">
              {SUBMISSION_TYPE_LABELS[lead.submission_type]}
            </p>
            <h2 className="truncate text-[18px] font-bold text-navy">
              {lead.institution_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="상세 닫기"
            className="shrink-0 rounded-lg border border-navy/15 px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            닫기
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          <dl>
            <Field label="담당자">{lead.contact_name}</Field>
            <Field label="직책">{lead.position || "—"}</Field>
            <Field label="전화번호">
              <a
                href={toTelHref(lead.phone)}
                className="font-medium text-trust-blue hover:underline"
              >
                {lead.phone}
              </a>
            </Field>
            <Field label="이메일">
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="font-medium text-trust-blue hover:underline"
                >
                  {lead.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="원아 수">{formatCount(lead.child_count, "명")}</Field>
            <Field label="반 수">{formatCount(lead.class_count, "개")}</Field>
            <Field label="신청 유형">
              {SUBMISSION_TYPE_LABELS[lead.submission_type]}
            </Field>
            <Field label="관심 상품">{formatPackage(lead.package_code)}</Field>
            <Field label="문의 내용">
              {lead.message ? (
                <span className="block whitespace-pre-wrap leading-relaxed">
                  {lead.message}
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="개인정보 동의">
              <AgreementMark agreed={lead.privacy_agreed} />
            </Field>
            <Field label="마케팅 동의">
              <AgreementMark agreed={lead.marketing_agreed} />
            </Field>
            <Field label="접수일">{formatLeadDateTime(lead.created_at)}</Field>
          </dl>
        </div>

        <footer className="border-t border-navy/10 bg-surface-soft px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-navy/45">현재 상태</p>
            <span
              className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${LEAD_STATUS_BADGE_CLASSES[lead.status]}`}
            >
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>

          <form action={formAction} className="mt-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((status) => {
                const isCurrent = status === lead.status;

                return (
                  <button
                    key={status}
                    type="submit"
                    name="status"
                    value={status}
                    disabled={isPending || isCurrent}
                    className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border-navy bg-navy text-white opacity-100"
                        : "border-navy/20 bg-white text-navy hover:border-navy/40 hover:bg-navy/5 disabled:opacity-50"
                    }`}
                  >
                    {LEAD_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </form>

          {state.phase === "error" && state.message ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-soft-coral/50 bg-soft-coral/10 px-3 py-2 text-[13px] text-navy"
            >
              {state.message}
            </p>
          ) : null}

          {isPending ? (
            <p className="mt-3 text-[12px] text-navy/50">상태를 변경하는 중…</p>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
