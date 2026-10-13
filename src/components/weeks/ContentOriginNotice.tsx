import type { ContentOrigin } from "@/lib/weeks/week-source";
import {
  REVIEW_STATE_LABEL,
  REVIEW_STATE_NOTE,
  type ReviewState,
} from "@/lib/weeks/week-types";

/**
 * 콘텐츠 출처와 검수 상태 안내 — B·D단계.
 *
 * ── 두 가지를 구분해 적는다 ──────────────────────────────────────
 *
 * ★ 출처(origin): 이 내용이 저장소 전사본에서 왔는가, 실제 DB 조회 결과인가.
 *   개발 중에만 보여 준다. 운영 화면에서 개발 사정을 설명하지 않는다.
 *
 * ★ 검수(reviewState): 본사가 원문과 대조했는가. 이것은 **운영에서도** 보여
 *   준다. 교사가 인쇄본과 함께 봐야 하는지 알아야 하기 때문이다.
 *
 * 둘을 한 문장으로 합치면 "가상 데이터"와 "검수 전 원문"이 섞여 보인다.
 * 그래서 상자를 따로 둔다.
 */

export function ReviewStateNotice({ state }: { state: ReviewState }) {
  if (state === "published") return null;

  const warn = state === "pending_transcription";

  return (
    <p
      role="note"
      className={`rounded-[10px] border px-4 py-3 text-[14px] leading-relaxed ${
        warn
          ? "border-warning-border bg-warning-soft text-warning-text"
          : "border-[color:var(--color-crayon)] bg-crayon-soft text-forest"
      }`}
    >
      <strong className="font-bold">{REVIEW_STATE_LABEL[state]}</strong> —{" "}
      {REVIEW_STATE_NOTE[state]}
    </p>
  );
}

/**
 * 개발 환경 전용 출처 배지.
 *
 * ★ `shouldMarkFixture()` 가 false 면 아무것도 그리지 않는다.
 *   운영 빌드에서 이 문구가 교사에게 보이지 않는다.
 */
export function ContentOriginBadge({
  origin,
  show,
}: {
  origin: ContentOrigin;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <p className="inline-flex items-center gap-2 rounded-[4px] border border-dashed border-rule-strong bg-white px-2.5 py-1 text-[12px] text-muted-ink">
      <span className="font-bold">개발 표시</span>
      {origin === "fixture"
        ? "저장소 전사 데이터 — 아직 데이터베이스에서 읽지 않습니다"
        : "데이터베이스 조회 결과"}
    </p>
  );
}
