"use client";

import { appButtonPrimary, appButtonSecondary } from "@/components/ui/app-button";

/**
 * 운영 화면(교사 · 원장 · 본사 · 영업) 공통 오류 경계 (DEC-111 · state-error-model).
 * 오류 원문 · 내부 코드 · 기록 내용은 표시하지 않는다.
 */
export function StaffRouteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-[70vh] w-full items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-[480px] animate-rise-in rounded-3xl border border-line bg-white p-8 text-center shadow-[var(--shadow-card)] sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
        </span>
        <h1 className="mt-5 text-title font-bold text-ink">화면을 불러오지 못했습니다.</h1>
        <p className="mt-2 text-body-sm text-ink-muted">
          잠시 후 다시 시도해 주세요. 같은 문제가 이어지면 SOYESKIDS 담당자에게 알려 주세요.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={() => retry()} className={appButtonPrimary}>
            다시 시도
          </button>
          <button type="button" onClick={() => window.history.back()} className={appButtonSecondary}>
            이전 화면으로
          </button>
        </div>
      </div>
    </main>
  );
}
