"use client";

import { useActionState, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeInfo,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import { startCorrectionAction } from "@/lib/staff/weekly-report-actions";
import {
  completePeriodAction,
  savePeriodDraftAction,
  setPeriodSourcesAction,
} from "@/lib/staff/period-report-actions";
import {
  PERIOD_SECTIONS,
  type PeriodComposerData,
  type PeriodContent,
} from "@/lib/staff/period-report-composer-queries";
import {
  PERIOD_EMPTY_NOTICE,
  PERIOD_REPORT_LABEL,
  PERIOD_STALE_NOTICE,
} from "@/lib/staff/period-report-queries";
import { formatDotDate } from "@/lib/entitlement/labels";

/**
 * 월간 · 학기 리포트 구성 · 작성 — 사용자 지시 항목 1.
 *
 * ── 두 단계다 ──────────────────────────────────────────────────────
 *
 *   1. 모으기 — 어떤 주차 기록을 근거로 쓸지 고른다
 *   2. 쓰기   — 그 기록을 보고 교사가 본문을 쓴다
 *
 * 순서를 섞지 않는다. 모으지 않으면 완료되지 않는다 (DB 가 막는다).
 *
 * ── 빈 상태를 "제공"으로 바꾸지 않는다 ────────────────────────────
 *
 * 모을 주차가 없으면 빈 상태를 안내하고 작성란을 열지 않는다. 빈 템플릿을
 * 월간 요약이라고 부르지 않는다.
 *
 * ── 조용히 덮어쓰지 않는다 ────────────────────────────────────────
 *
 * 모으기 · 저장 · 완료 모두 같은 `updated_at` 토큰을 쓴다. 서버가 "그 사이
 * 바뀌었다"고 하면 충돌로 보여 주고 저장하지 않는다.
 *
 * ── 모은 뒤 주차가 정정되면 ────────────────────────────────────────
 *
 * 본문을 자동으로 바꾸지 않는다. 바뀐 주차를 표시하고, 다시 모을지는 교사가
 * 결정한다.
 */

interface PeriodComposerProps {
  data: PeriodComposerData;
  /** 계약 ∧ 출시 ∧ 담당. 서버가 다시 판정한다 */
  canWrite: boolean;
}

export function PeriodComposer({ data, canWrite }: PeriodComposerProps) {
  const draft = data.draft;
  const latest = data.latestCompleted;
  const label = PERIOD_REPORT_LABEL[data.report.kind];

  const [content, setContent] = useState<PeriodContent>(
    draft?.content ?? { overview: null, family_message: null, next_period_focus: null },
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(draft?.updatedAt ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<
    { kind: "success" | "error" | "conflict"; text: string } | null
  >(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionState, correctionAction, correctionPending] = useActionState(
    startCorrectionAction,
    { phase: "idle" as "idle" | "error", message: null as string | null },
  );

  /**
   * 체크 상태의 초기값.
   *
   * ★ 초안이 이미 모은 주차가 있으면 그것을 쓴다.
   * ★ 아직 모으지 않은 수정본이면, 완료본이 모았던 주차를 미리 체크해 둔다.
   *   그래도 저장은 교사가 [모으기] 를 눌러야 일어난다 — 자동으로 모으지 않는다.
   */
  const initialSelection = useMemo(() => {
    const collected = data.candidates.filter((c) => c.collected).map((c) => c.reportId);
    if (collected.length > 0) return collected;
    if (data.completedWeeks.length === 0) return [];
    return data.candidates
      .filter((c) => data.completedWeeks.includes(c.weekNo))
      .map((c) => c.reportId);
  }, [data.candidates, data.completedWeeks]);

  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [savedWeeks, setSavedWeeks] = useState<number[] | null>(null);

  const collectedWeeks =
    savedWeeks ??
    data.candidates.filter((c) => c.collected).map((c) => c.weekNo).sort((a, b) => a - b);

  const editing = Boolean(draft) && canWrite;
  const periodName =
    data.report.kind === "monthly"
      ? `${data.report.blockNo ?? "?"}번째 4주`
      : (data.report.termKey ?? "학기");

  function toggle(reportId: string) {
    setSelected((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId],
    );
  }

  async function collect() {
    if (!draft || !updatedAt) return;
    setBusy(true);
    const result = await setPeriodSourcesAction({
      revisionId: draft.id,
      sourceReportIds: selected,
      expectedUpdatedAt: updatedAt,
    });
    setBusy(false);
    if (!result.ok) {
      setNotice({
        kind: result.conflict ? "conflict" : "error",
        text: result.message ?? "모으지 못했습니다.",
      });
      return;
    }
    setUpdatedAt(result.updatedAt);
    setSavedWeeks(result.weeks);
    setNotice({ kind: "success", text: result.message ?? "모았습니다." });
  }

  async function save(): Promise<string | null> {
    if (!draft || !updatedAt) return null;
    setBusy(true);
    const result = await savePeriodDraftAction({
      revisionId: draft.id,
      content,
      expectedUpdatedAt: updatedAt,
    });
    setBusy(false);
    if (!result.ok) {
      setNotice({
        kind: result.conflict ? "conflict" : "error",
        text: result.message ?? "저장하지 못했습니다.",
      });
      return null;
    }
    setUpdatedAt(result.updatedAt);
    setNotice({ kind: "success", text: "임시저장했습니다." });
    return result.updatedAt;
  }

  async function complete() {
    if (!draft) return;
    const token = await save();
    if (!token) {
      setCompleteOpen(false);
      return;
    }
    setBusy(true);
    const result = await completePeriodAction({ revisionId: draft.id, expectedUpdatedAt: token });
    setBusy(false);
    setCompleteOpen(false);
    if (!result.ok) {
      setNotice({
        kind: result.conflict ? "conflict" : "error",
        text: result.message ?? "완료하지 못했습니다.",
      });
      return;
    }
    setNotice({ kind: "success", text: "리포트를 완료했습니다." });
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="period-state"
        className="rounded-2xl border border-hairline bg-white p-5"
      >
        <h2 id="period-state" className="text-[17px] font-bold text-ink">
          {label} 상태
        </h2>
        <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">기간</dt>
            <dd className="font-semibold text-ink">{periodName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">최근 완료본</dt>
            <dd className="font-semibold text-ink">
              {latest ? `${formatDotDate(latest.completedAt)} 완료` : "아직 없음"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">작성 중</dt>
            <dd className="font-semibold text-ink">{draft ? "작성 중" : "없음"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">모은 주차</dt>
            <dd className="font-semibold tabular-nums text-ink">
              {collectedWeeks.length === 0 ? "없음" : `${collectedWeeks.join(" · ")}주차`}
            </dd>
          </div>
        </dl>

        {data.report.hidden ? (
          <p className={`mt-3 ${noticeWarning}`}>
            학부모 화면에서 숨긴 기록입니다. 사유: {data.report.hiddenReason ?? "—"} (다시 공개는
            원장님이 합니다)
          </p>
        ) : null}

        {draft && latest ? (
          <p className={`mt-3 ${noticeInfo}`}>
            새 수정본을 작성 중입니다. 완료하기 전까지 학부모 화면에는 최근 완료본 기준으로
            표시됩니다.
          </p>
        ) : null}

        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          {label}은 같은 원아의 완료된 주간 기록을 모아 구성합니다. 기록에 없는 관찰·발화·사진을
          만들지 않고, 평균·성장률·서열을 계산하지 않습니다.
        </p>
      </section>

      {editing && draft ? (
        <>
          <section
            aria-labelledby="period-sources"
            className="rounded-2xl border border-hairline bg-white p-5"
          >
            <h2 id="period-sources" className="text-[17px] font-bold text-ink">
              1. 모을 주차 기록 고르기
            </h2>

            {data.empty ? (
              <p className="mt-2 text-[15px] leading-relaxed text-warning-text">
                {PERIOD_EMPTY_NOTICE[data.report.kind]}
              </p>
            ) : (
              <>
                <p className="mt-1 text-[13px] text-ink-muted">
                  완료되고 학부모 화면에 공개 중인 주차만 고를 수 있습니다. 숨긴 주차는 목록에
                  없습니다.
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {data.candidates.map((candidate) => {
                    const id = `period-source-${candidate.reportId}`;
                    const checked = selected.includes(candidate.reportId);
                    return (
                      <li key={candidate.reportId}>
                        <label
                          htmlFor={id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                            candidate.stale
                              ? "border-warning-border bg-warning-soft"
                              : checked
                                ? "border-brand-navy bg-brand-ivory"
                                : "border-hairline"
                          }`}
                        >
                          <input
                            id={id}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(candidate.reportId)}
                            className="mt-0.5 size-5 shrink-0"
                          />
                          <span className="text-[15px] text-ink">
                            <span className="font-bold tabular-nums">{candidate.weekNo}주차</span>
                            {candidate.collected ? (
                              <span className="ml-2 text-[13px] text-ink-muted">모은 기록</span>
                            ) : null}
                            {candidate.stale ? (
                              <span className="ml-2 text-[13px] font-semibold text-warning-text">
                                모은 뒤 정정됨
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {data.staleWeeks.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-warning-border bg-warning-soft px-4 py-3">
                    <p className="text-[14px] font-semibold text-warning-text">
                      재검토 필요 — {data.staleWeeks.join(" · ")}주차
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-warning-text">
                      {PERIOD_STALE_NOTICE}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-hairline pt-4">
                  <button
                    type="button"
                    onClick={collect}
                    disabled={busy}
                    className={appButtonSecondary}
                  >
                    {busy ? "처리 중…" : "이 주차로 모으기"}
                  </button>
                  <p className="mt-2 text-[13px] text-ink-muted">
                    모으면 그 시점의 주차 내용이 이 리포트의 근거로 고정됩니다.
                  </p>
                </div>
              </>
            )}
          </section>

          {!data.empty ? (
            <section
              aria-labelledby="period-write"
              className="flex flex-col gap-5 rounded-2xl border border-hairline bg-white p-5"
            >
              <h2 id="period-write" className="text-[17px] font-bold text-ink">
                2. {label} 작성
              </h2>

              {collectedWeeks.length === 0 ? (
                <p className={noticeWarning}>
                  아직 모은 주차가 없습니다. 먼저 주차 기록을 모아야 완료할 수 있습니다.
                </p>
              ) : null}

              {PERIOD_SECTIONS.map((section) => {
                const id = `period-${section.key}`;
                return (
                  <div key={section.key} className="flex flex-col gap-1.5">
                    <label htmlFor={id} className="text-[16px] font-bold text-ink">
                      {section.label}
                      {section.required ? "" : " (선택)"}
                    </label>
                    <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
                      {section.hint}
                    </p>
                    <textarea
                      id={id}
                      aria-describedby={`${id}-hint`}
                      value={content[section.key] ?? ""}
                      maxLength={section.limit}
                      rows={section.rows}
                      onChange={(event) =>
                        setContent((prev) => ({ ...prev, [section.key]: event.target.value }))
                      }
                      className={`${fieldTextarea} min-h-0 text-[16px]`}
                    />
                  </div>
                );
              })}

              {notice ? (
                <p
                  role={notice.kind === "success" ? "status" : "alert"}
                  className={
                    notice.kind === "success"
                      ? noticeSuccess
                      : notice.kind === "conflict"
                        ? noticeWarning
                        : noticeDanger
                  }
                >
                  {notice.text}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-hairline pt-4 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setCompleteOpen(true)}
                  disabled={busy || collectedWeeks.length === 0}
                  className={appButtonPrimary}
                >
                  리포트 완료
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className={appButtonSecondary}
                >
                  {busy ? "저장 중…" : "임시저장"}
                </button>
              </div>
            </section>
          ) : null}

          {data.empty && notice ? (
            <p role="alert" className={noticeDanger}>
              {notice.text}
            </p>
          ) : null}
        </>
      ) : latest ? (
        <section
          aria-labelledby="period-final"
          className="flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-5"
        >
          <h2 id="period-final" className="text-[17px] font-bold text-ink">
            최근 완료본
          </h2>
          <p className="text-[14px] tabular-nums text-ink-muted">
            모은 주차{" "}
            {data.completedWeeks.length === 0
              ? "기록 없음"
              : `${data.completedWeeks.join(" · ")}주차`}
          </p>
          {PERIOD_SECTIONS.map((section) =>
            latest.content[section.key] ? (
              <div key={section.key}>
                <h3 className="text-[15px] font-bold text-ink">{section.label}</h3>
                <p className="mt-1 whitespace-pre-line text-[16px] leading-relaxed text-ink">
                  {latest.content[section.key]}
                </p>
              </div>
            ) : null,
          )}
          <div className="flex flex-wrap gap-2 border-t border-hairline pt-4 print:hidden">
            {canWrite ? (
              <button
                type="button"
                onClick={() => setCorrectionOpen(true)}
                className={appButtonSecondary}
              >
                수정본 만들기
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-hairline bg-white px-4 py-8 text-center text-[15px] text-ink">
          {canWrite
            ? "작성 중인 리포트가 없습니다."
            : "이 기능은 현재 이용 상품 또는 출시 상태에서 사용할 수 없습니다."}
        </p>
      )}

      <Dialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title={`${label} 완료`}
        busy={busy}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed text-ink">
            완료하면 직접 수정할 수 없습니다. 수정이 필요하면 수정본을 만듭니다. 모은 주차 내용이
            이 리포트의 근거로 함께 저장됩니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={complete}
              disabled={busy}
              className={`${appButtonPrimary} sm:flex-1`}
            >
              {busy ? "처리 중…" : "리포트 완료"}
            </button>
            <button
              type="button"
              onClick={() => setCompleteOpen(false)}
              disabled={busy}
              className={`${appButtonSecondary} sm:flex-1`}
            >
              돌아가기
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        title="수정본 만들기"
        busy={correctionPending}
      >
        <form action={correctionAction} className="flex flex-col gap-4">
          <input type="hidden" name="reportId" value={data.report.id} />
          <p className="text-[15px] leading-relaxed text-ink">
            완료본은 그대로 두고 새 수정본을 만듭니다. 수정본에서는 모을 주차를 다시 확인해
            주세요 — 완료본이 모았던 주차가 미리 선택되지만, 저장은 [모으기] 를 눌러야 됩니다.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="period-correction-reason" className={fieldLabel}>
              수정 사유 (필수)
            </label>
            <textarea
              id="period-correction-reason"
              name="reason"
              required
              maxLength={500}
              className={`${fieldTextarea} min-h-[88px]`}
            />
          </div>
          {correctionState.phase === "error" && correctionState.message ? (
            <p role="alert" className={noticeDanger}>
              {correctionState.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={correctionPending}
              className={`${appButtonPrimary} sm:flex-1`}
            >
              {correctionPending ? "만드는 중…" : "수정본 만들기"}
            </button>
            <button
              type="button"
              onClick={() => setCorrectionOpen(false)}
              disabled={correctionPending}
              className={`${appButtonSecondary} sm:flex-1`}
            >
              돌아가기
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
