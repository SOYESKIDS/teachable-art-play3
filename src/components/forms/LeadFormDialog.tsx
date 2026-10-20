"use client";

import { useEffect, useRef } from "react";
import { useLeadForm } from "@/components/forms/LeadFormContext";
import { LeadForm } from "@/components/forms/LeadForm";

const TITLE_ID = "lead-form-dialog-title";

/** 라이브러리 없이 직접 구현한 접근성 Dialog: ESC/Backdrop 닫기, Focus Trap, 배경 스크롤 잠금 */
/**
 * @param previewNotice 검토용(Preview) 배포에서만 넘긴다 — 이 배포의 상담은 Staging(검토용 DB)에만 저장되어
 *   실제 영업 문의로 접수되지 않는다는 안내. 운영 배포에서는 넘기지 않는다 (PlayShell).
 */
export function LeadFormDialog({ previewNotice = false }: { previewNotice?: boolean } = {}) {
  const { isOpen, formType, packageCode, closeLeadForm } = useLeadForm();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const getFocusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((item) => item.offsetParent !== null);
    getFocusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLeadForm();
        return;
      }

      if (event.key !== "Tab") return;
      // 성공 화면으로 바뀌거나 제출 버튼이 비활성화돼도 현재 DOM의 초점을 사용한다.
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!panel?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, closeLeadForm]);

  if (!isOpen || !formType) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeLeadForm();
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-navy/50 backdrop-blur-sm" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className="relative flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-ivory p-6 shadow-[var(--shadow-elevated)] sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={closeLeadForm}
          aria-label="닫기"
          className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-navy/5 hover:text-navy"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>

        {previewNotice ? (
          <p role="note" className="mb-5 mr-12 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] font-semibold leading-relaxed text-amber-900">
            시연용 검토 화면입니다. 여기서 보낸 문의는 검토용 데이터베이스에만 저장되며 실제 상담으로 접수되지 않습니다.
            실제 도입 문의는 운영 사이트나 담당자에게 연락해 주세요.
          </p>
        ) : null}
        <LeadForm
          key={`${formType}:${packageCode ?? "general"}`}
          type={formType}
          titleId={TITLE_ID}
          defaultPackageCode={packageCode}
          onClose={closeLeadForm}
        />
      </div>
    </div>
  );
}
