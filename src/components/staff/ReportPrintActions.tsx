"use client";

import { appButtonSecondary } from "@/components/ui/app-button";
import {
  PRINT_PDF_NOTICE,
  PRINT_PHOTO_NOTICE,
} from "@/lib/staff/report-print-queries";

/**
 * 인쇄 · PDF 저장 — 사용자 지시 항목 1.
 *
 * ★ PDF 는 브라우저 인쇄 대화상자의 "PDF로 저장"으로 만든다.
 *   서버에 PDF 생성 경로가 없다. 그래서 [PDF 내려받기] 버튼을 두지 않는다 —
 *   눌러도 파일이 생기지 않는 버튼은 만들지 않는다. 대신 어디서 바꾸는지 적는다.
 *
 * ★ 사진은 인쇄물에 담지 않는다. 그 사실을 여기서 알린다.
 *   빠진 것을 모르고 보내는 일이 없게 한다.
 *
 * ★ 인쇄 자체는 브라우저가 한다. 서버에 아무것도 남기지 않는다.
 */
export function ReportPrintActions({
  /** 한 명이 아니라 반 전체를 인쇄하는 화면인가 */
  bundle = false,
}: {
  bundle?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          type="button"
          onClick={() => window.print()}
          className={appButtonSecondary}
        >
          {bundle ? "이 묶음 인쇄 · PDF 저장" : "인쇄 · PDF 저장"}
        </button>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        {PRINT_PDF_NOTICE}
      </p>
      <p className="text-[13px] leading-relaxed text-ink-muted">{PRINT_PHOTO_NOTICE}</p>
    </div>
  );
}
