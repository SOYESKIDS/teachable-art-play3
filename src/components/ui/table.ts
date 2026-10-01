/**
 * 운영 화면 표 — 머리칸 · 본문 칸 · 행 · 감싸는 틀.
 *
 * ★ 표 세 개가 같은 문자열을 각자 갖고 있었다. 여기 한 곳에서 정한다.
 * ★ 머리칸은 옅은 바탕 + 12px 굵은 글자, 본문은 14px. 행 높이는 칸 여백으로 52px 안팎.
 * ★ 숫자 열에는 tabular 를 더해 자리를 맞춘다 (사용처에서).
 */
export const tableWrap = "overflow-hidden rounded-2xl border border-line bg-white";

export const tableHead = "border-b border-line bg-surface-warm text-left";

export const tableHeadCell =
  "whitespace-nowrap px-4 py-3 text-micro font-semibold tracking-wide text-ink-muted";

export const tableCell = "whitespace-nowrap px-4 py-3.5 text-label text-ink";

export const tableRow =
  "border-b border-line-soft transition-colors last:border-b-0 hover:bg-primary-soft/50";
