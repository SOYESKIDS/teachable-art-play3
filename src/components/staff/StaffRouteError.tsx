"use client";

import { appButtonPrimary } from "@/components/ui/app-button";

/**
 * 교직원 화면 공통 오류 경계 (DEC-111 · state-error-model).
 * 오류 원문 · 내부 코드 · 기록 내용은 표시하지 않는다.
 */
export function StaffRouteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[560px] flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-[20px] font-bold text-ink">화면을 불러오지 못했습니다.</h1>
      <p className="text-[15px] leading-relaxed text-ink-muted">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={() => retry()} className={appButtonPrimary}>
        다시 시도
      </button>
    </main>
  );
}
