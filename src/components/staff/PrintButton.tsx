"use client";

import { appButtonSecondary } from "@/components/ui/app-button";

/** 단건 인쇄 (완료 · 숨김 아님일 때만 렌더한다 · DEC-102) */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={appButtonSecondary}>
      인쇄
    </button>
  );
}
