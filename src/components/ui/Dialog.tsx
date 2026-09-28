"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 제목 아래 짧은 맥락 (예: 반 · 차시) */
  description?: string;
  children: ReactNode;
  /** 진행 중(제출 중)에는 닫기 · Esc 를 막아 중복 동작을 막는다 */
  busy?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 공통 대화상자 (DEC-110 · DEC-112).
 *
 * 간단한 확인 · 사유 입력 · 작은 편집에만 쓴다. 복잡한 작업은 page 로 둔다.
 * 접근성 baseline:
 *   · role="dialog" + aria-modal + aria-labelledby/aria-describedby
 *   · 열릴 때 첫 입력 요소로 초점 이동 · 닫힐 때 원래 요소로 초점 복귀
 *   · Tab 이 대화상자 밖으로 나가지 않는다 (focus trap)
 *   · Esc 로 닫기 (busy 가 아닐 때)
 *   · 배경 스크롤 잠금
 */
export function Dialog({ open, onClose, title, description, children, busy = false }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  // 최신 값을 ref 로 둔다: busy · onClose 가 바뀌어도 초점 설정을 다시 하지 않는다.
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  }, [busy, onClose]);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!panelRef.current) return;

      if (event.key === "Escape") {
        if (!busyRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div aria-hidden="true" className="absolute inset-0 bg-brand-navy/40" onClick={busy ? undefined : onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-elevated)] sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] font-bold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 break-words text-[13px] text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 shrink-0 rounded-lg border border-control-border px-3 text-[14px] font-semibold text-ink transition-colors hover:bg-brand-ivory disabled:opacity-60"
          >
            닫기
          </button>
        </header>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
