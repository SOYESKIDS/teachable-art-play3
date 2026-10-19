"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import { saveQuickMemoAction } from "@/lib/staff/class-mode-actions";
import { createQuickMemoSaveQueue } from "@/lib/staff/quick-memo-save-queue";

interface QuickMemoPanelProps {
  sessionId: string;
  initialBody: string;
  initialUpdatedAt: string | null;
  disabled?: boolean;
  onSaveReady?: (save: (() => Promise<boolean>) | null) => void;
  onSaveFailure?: () => void;
}

/** Author-only server memo. No persistent browser storage and no automatic sharing. */
export function QuickMemoPanel({ sessionId, initialBody, initialUpdatedAt, disabled = false, onSaveReady, onSaveFailure }: QuickMemoPanelProps) {
  const [queue] = useState(() => createQuickMemoSaveQueue({ initialBody, initialUpdatedAt,
    save: async (body, expectedUpdatedAt) => {
      try {
        const result = await saveQuickMemoAction({ sessionId, body, expectedUpdatedAt });
        if (!result.ok) onSaveFailure?.();
        return result;
      } catch (error) {
        onSaveFailure?.();
        throw error;
      }
    },
  }));
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const navigating = useRef(false);

  useEffect(() => {
    if (!snapshot.dirty || snapshot.status !== "pending") return;
    const timer = setTimeout(() => { void queue.flush(); }, 1200);
    return () => clearTimeout(timer);
  }, [snapshot.body, snapshot.dirty, snapshot.status, queue]);

  useEffect(() => {
    onSaveReady?.(queue.flush);
    return () => onSaveReady?.(null);
  }, [onSaveReady, queue]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!queue.getSnapshot().dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function beforeLink(event: MouseEvent) {
      if (!queue.getSnapshot().dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      if (navigating.current) return;
      navigating.current = true;
      void queue.flush().then(saved => {
        if (saved) window.location.assign(url.href);
      }).finally(() => { navigating.current = false; });
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [queue]);

  const labels = { idle: "", pending: "아직 저장되지 않음", saving: "저장 중", saved: "저장됨", failed: "저장 실패", conflict: "다른 기기 변경 확인 필요" };
  const statusText = snapshot.status === "pending" ? "아직 저장되지 않음" : labels[snapshot.status];
  return (
    <section aria-labelledby="quick-memo-title" className="rounded-2xl border border-hairline bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="quick-memo-title" className="text-[18px] font-bold">빠른 메모</h2>
        <span role="status" className="text-[14px] font-semibold text-ink-muted">{statusText}</span>
      </div>
      <p id="quick-memo-help" className="mt-1 text-[14px] leading-relaxed text-ink-muted">
        나만 보는 메모입니다. 리포트·학부모 화면·AI에 자동으로 사용되지 않습니다.
        입력 후 자동으로 저장하며, 수업을 마치거나 링크로 이동하기 전에 저장 결과를 확인합니다.
      </p>
      <label htmlFor="quick-memo-body" className={`${fieldLabel} sr-only`}>빠른 메모 내용</label>
      <textarea id="quick-memo-body" value={snapshot.body} maxLength={2000} disabled={disabled}
        aria-describedby="quick-memo-help" onChange={event => queue.setBody(event.target.value)}
        className={`${fieldTextarea} mt-3 min-h-[140px] w-full text-[17px]`} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] tabular-nums text-ink-muted">{snapshot.body.length.toLocaleString("ko-KR")} / 2,000자</p>
        <button type="button" onClick={() => { void queue.flush(); }}
          disabled={disabled || !snapshot.dirty || snapshot.status === "saving" || snapshot.status === "conflict"}
          className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-[15px] font-semibold disabled:opacity-50">
          {snapshot.status === "failed" ? "다시 저장" : snapshot.status === "saving" ? "저장 중…" : "지금 저장"}
        </button>
      </div>
      {snapshot.message ? <p role="alert" className="mt-2 text-[14px] leading-relaxed text-danger">{snapshot.message}</p> : null}
      {snapshot.status === "conflict" ? <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
        지금 입력한 내용은 이 화면에 남아 있습니다. 먼저 내용을 복사한 뒤 새로고침해 최신 메모와 대조해 주세요. 자동으로 덮어쓰지 않습니다.
      </p> : null}
    </section>
  );
}
