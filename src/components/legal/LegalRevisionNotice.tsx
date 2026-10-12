import {
  draftRevisionOf,
  effectiveRevisionOf,
  historyOf,
  publishVerdictOf,
  scheduledRevisionOf,
  type LegalDocumentId,
} from "@/lib/legal/revisions";

/**
 * 법적 문서의 판본 표시 — 실행 묶음 D2.
 *
 * ★ 값이 없으면 그리지 않는다.
 *   시행 예정 판본이 없고 개정안도 없으면 이 컴포넌트는 아무것도 렌더하지 않는다.
 *   지금 운영 화면과 같은 모습이 된다.
 *
 * ★ 개정안을 현행본처럼 보여 주지 않는다.
 *   이 저장소의 본문이 개정안이면 그 사실과 "현행 운영본은 언제 시행본인지"를
 *   본문 위에 밝힌다. 숨기지 않는다.
 *
 * ★ 날짜를 만들지 않는다. 시행일·공지일이 null 이면 "미확정"으로 적는다.
 */
export function LegalRevisionNotice({ documentId }: { documentId: LegalDocumentId }) {
  const effective = effectiveRevisionOf(documentId);
  const scheduled = scheduledRevisionOf(documentId);
  const draft = draftRevisionOf(documentId);
  const history = historyOf(documentId);
  const verdict = publishVerdictOf(documentId);

  const showDraftNotice = draft?.textLocation === "repository";
  if (!scheduled && !showDraftNotice && history.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-3">
      {showDraftNotice && (
        <section
          aria-labelledby={`${documentId}-draft-notice`}
          className="rounded-xl border border-warning-border bg-warning-soft px-5 py-4"
        >
          <h2
            id={`${documentId}-draft-notice`}
            className="text-label font-bold text-warning-text"
          >
            이 화면의 본문은 개정안입니다
          </h2>
          <p className="mt-1.5 text-caption leading-relaxed text-warning-text">
            {effective?.effectiveDate ? (
              <>
                현행 운영본은 <strong>{effective.effectiveDate} 시행본</strong>입니다. 아래
                본문은 개정 준비본이며, 시행일과 공지 시작일이 아직 확정되지 않았습니다.
              </>
            ) : (
              <>
                아래 본문은 개정 준비본이며, 시행일과 공지 시작일이 아직 확정되지
                않았습니다.
              </>
            )}
          </p>

          {draft.reason.length > 0 && (
            <>
              <p className="mt-3 text-caption font-semibold text-warning-text">
                개정 사유 (초안)
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {draft.reason.map((line) => (
                  <li key={line} className="text-caption leading-relaxed text-warning-text">
                    {line}
                  </li>
                ))}
              </ul>
            </>
          )}

          <dl className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-caption text-warning-text/80">개정 시행일</dt>
              <dd className="text-caption font-semibold text-warning-text">
                {draft.effectiveDate ?? "미확정"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-caption text-warning-text/80">공지 시작일</dt>
              <dd className="text-caption font-semibold text-warning-text">
                {draft.noticeFrom ?? "미확정"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {scheduled && (
        <section
          aria-labelledby={`${documentId}-scheduled-notice`}
          className="rounded-xl border border-info-border bg-info-soft px-5 py-4"
        >
          <h2
            id={`${documentId}-scheduled-notice`}
            className="text-label font-bold text-info-text"
          >
            개정 예정 안내
          </h2>
          <p className="mt-1.5 text-caption leading-relaxed text-info-text">
            {scheduled.effectiveDate
              ? `${scheduled.effectiveDate}부터 개정본이 시행됩니다.`
              : "개정본 시행일이 확정되지 않았습니다."}
            {scheduled.noticeFrom ? ` 공지 시작 ${scheduled.noticeFrom}.` : ""}
          </p>
          {scheduled.reason.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {scheduled.reason.map((line) => (
                <li key={line} className="text-caption leading-relaxed text-info-text">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section
          aria-labelledby={`${documentId}-history`}
          className="rounded-xl border border-line bg-white px-5 py-4"
        >
          <h2 id={`${documentId}-history`} className="text-label font-bold text-ink">
            개정 이력
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {history.map((r) => (
              <li key={r.id} className="text-caption text-ink-muted">
                <span className="tabular-nums">{r.effectiveDate ?? "시행일 미확정"}</span>
                {" · "}
                {r.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {verdict.blocked && (
        // 운영자·개발자용 상태 표시. 본문을 숨기지 않고, 확정 게시가 아님을 밝힌다.
        <p className="text-caption text-ink-muted">
          이 문서는 아직 확정 게시 상태가 아닙니다. 시행일·공지 시작일 확정이 필요합니다.
        </p>
      )}
    </div>
  );
}
