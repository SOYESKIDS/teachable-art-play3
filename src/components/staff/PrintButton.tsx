"use client";

import { ReportPrintActions } from "@/components/staff/ReportPrintActions";

/**
 * 단건 인쇄 (완료 · 숨김 아님일 때만 렌더한다 · DEC-102).
 *
 * ★ 인쇄 안내(사진 미포함 · PDF 저장 방법)를 함께 보여 주는 공통 컴포넌트로
 *   통일했다. 기존 호출부를 그대로 두기 위해 이름은 유지한다.
 */
export function PrintButton() {
  return <ReportPrintActions />;
}
