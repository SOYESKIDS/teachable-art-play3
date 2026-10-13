"use client";

/**
 * 인쇄 버튼.
 *
 * ★ 사용자가 눌러야 인쇄 창이 뜬다. 페이지를 열자마자 `window.print()` 를
 *   부르지 않는다 — 인쇄할 생각 없이 들어온 교사의 화면을 막아 버린다.
 * ★ 인쇄물에는 이 버튼이 남지 않는다 (`print:hidden`).
 * ★ 브라우저 인쇄 창을 쓰므로 종이 크기·여백은 사용자가 바꿀 수 있다. 기본값은
 *   시트의 `@page` 가 A4 로 정해 둔다.
 */
export function PrintButton({ label = "인쇄하기" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
    >
      {label}
    </button>
  );
}
