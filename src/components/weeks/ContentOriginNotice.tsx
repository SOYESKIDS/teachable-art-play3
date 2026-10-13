import {
  HIDDEN_REASON_NOTE,
  PUBLICATION_LABEL,
  PUBLICATION_NOTE,
  TRANSCRIPTION_LABEL,
  type ContentOrigin,
  type ContentStatus,
  type HiddenReason,
} from "@/lib/weeks/content-state";

/**
 * 콘텐츠 상태 안내 — 세 축을 각각 보여 준다.
 *
 * ── 왜 한 상자에 합치지 않는가 ───────────────────────────────────
 *
 * 「저장소에서 온 데이터」와 「검수 전 원문」은 다른 문제다. 한 문장으로 합치면
 * 개발 사정과 콘텐츠 사정이 섞여 교사가 무엇을 믿어야 할지 모른다.
 *
 *   · 출처 배지     — 개발·Preview 에서만. 운영에서는 그리지 않는다.
 *   · 상태 배지     — 전사·발행을 각각. 운영에서도 보여 준다.
 *   · 비공개 안내   — 본문을 열지 않은 이유.
 */

/**
 * 전사·발행 상태를 각각 배지로.
 *
 * ★ `span` 으로 그린다. 이 배지는 링크(`a`) 안에도 들어가는데, 그 자리는
 *   phrasing content 만 허용한다. `p` 를 쓰면 유효하지 않은 HTML 이 된다.
 */
export function ContentStatusBadges({ status }: { status: ContentStatus }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-[4px] border border-rule px-2 py-0.5 text-[12px] text-muted-ink">
        전사 · {TRANSCRIPTION_LABEL[status.transcription]}
      </span>
      <span
        className={`rounded-[4px] px-2 py-0.5 text-[12px] ${
          status.publication === "published"
            ? "bg-sprout font-semibold text-leaf"
            : "border border-rule text-muted-ink"
        }`}
      >
        검수 · {PUBLICATION_LABEL[status.publication]}
      </span>
    </span>
  );
}

/** 발행 전이면 그 뜻을 문장으로 */
export function PublicationNotice({ status }: { status: ContentStatus }) {
  if (status.publication === "published") return null;

  return (
    <p
      role="note"
      className="rounded-[10px] border border-[color:var(--color-crayon)] bg-crayon-soft px-4 py-3 text-[14px] leading-relaxed text-forest"
    >
      <strong className="font-bold">{PUBLICATION_LABEL[status.publication]}</strong> —{" "}
      {PUBLICATION_NOTE[status.publication]}
    </p>
  );
}

/** 정식 경로에서 본문을 열지 않은 이유 */
export function HiddenBodyNotice({ reason }: { reason: HiddenReason }) {
  return (
    <section
      role="note"
      className="rounded-[10px] border border-warning-border bg-warning-soft px-5 py-6"
    >
      <h2 className="text-[16px] font-bold text-warning-text">수업 내용이 아직 열리지 않았습니다</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-warning-text">
        {HIDDEN_REASON_NOTE[reason]}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-warning-text">
        주차 정보(수업명 · 성장키워드 · 권장 시간)는 위에서 확인하실 수 있습니다.
      </p>
    </section>
  );
}

/**
 * 개발 환경 전용 출처 배지.
 *
 * ★ `show` 는 `showsDevelopmentMarkers()` 로 서버에서 계산해 넘긴다.
 *   운영 배포(VERCEL_ENV=production)에서는 그리지 않는다.
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
