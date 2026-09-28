"use client";

import { useActionState, useState } from "react";
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
import { completeWeeklyAction, saveWeeklyDraftAction, startCorrectionAction } from "@/lib/staff/weekly-report-actions";
import type { WeeklyComposerData, WeeklyContent } from "@/lib/staff/weekly-report-queries";
import { formatDotDate } from "@/lib/entitlement/labels";

interface WeeklyComposerProps {
  data: WeeklyComposerData;
  canWrite: boolean;
}

const SECTIONS: {
  key: keyof WeeklyContent;
  label: string;
  source: string;
  editable: boolean;
  rows: number;
  limit: number;
}[] = [
  { key: "topic", label: "이번 주 활동 주제", source: "수업 자료", editable: false, rows: 2, limit: 200 },
  { key: "quote_choice", label: "아이의 말과 선택", source: "관찰 기록에서 선택 · 없으면 비워 두세요", editable: true, rows: 3, limit: 1000 },
  { key: "teacher_observation", label: "교사 관찰 기록", source: "관찰 기록에서 가져옴 · 확인 후 수정", editable: true, rows: 6, limit: 2000 },
  { key: "family_conversation", label: "가정에서 나눌 이야기", source: "수업 자료", editable: false, rows: 3, limit: 2000 },
  { key: "next_week_preview", label: "다음 주 예고", source: "수업 자료 · 선택 사항", editable: false, rows: 2, limit: 300 },
];

/** 서울 날짜로 표시 (완료 시각은 timestamptz) */
function formatDot(value: string | null): string {
  return formatDotDate(value);
}

/**
 * TC-08 Weekly Composer (DEC-066 · DEC-101 · DEC-102).
 *
 * · 출처와 수정 가능 여부를 섹션마다 표시 (AUTO 같은 기술 용어 쓰지 않음)
 * · 아이의 말과 선택: 실제 기록이 있을 때만 · 문장을 만들어 넣지 않는다
 * · 사진 0~3장 선택 · 선택 사항 (DEC-039)
 * · [리포트 완료] 는 저장과 별개 · AI 는 완료 조건이 아니다
 * · 완료본은 직접 수정하지 않고 [수정본 만들기] (사유 필수)
 */
export function WeeklyComposer({ data, canWrite }: WeeklyComposerProps) {
  const draft = data.draft;
  const [content, setContent] = useState<WeeklyContent>(
    draft?.content ?? {
      topic: null,
      quote_choice: null,
      teacher_observation: null,
      family_conversation: null,
      next_week_preview: null,
    },
  );
  const [mediaIds, setMediaIds] = useState<string[]>(data.selectedMediaIds);
  const [updatedAt, setUpdatedAt] = useState<string | null>(draft?.updatedAt ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "conflict"; text: string } | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionState, correctionAction, correctionPending] = useActionState(startCorrectionAction, {
    phase: "idle" as "idle" | "error",
    message: null as string | null,
  });

  const latest = data.latestCompleted;
  const editing = Boolean(draft) && canWrite;

  function toggleMedia(id: string) {
    if (mediaIds.includes(id)) {
      setMediaIds(mediaIds.filter((item) => item !== id));
      return;
    }
    if (mediaIds.length >= 3) {
      setNotice({ kind: "error", text: "사진은 3장까지 선택할 수 있습니다." });
      return;
    }
    setMediaIds([...mediaIds, id]);
  }

  async function save(): Promise<string | null> {
    if (!draft || !updatedAt) return null;
    setBusy(true);
    const result = await saveWeeklyDraftAction({ revisionId: draft.id, content, mediaIds, expectedUpdatedAt: updatedAt });
    setBusy(false);
    if (!result.ok) {
      setNotice({ kind: result.conflict ? "conflict" : "error", text: result.message ?? "저장하지 못했습니다." });
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
    const result = await completeWeeklyAction({ revisionId: draft.id, expectedUpdatedAt: token });
    setBusy(false);
    setCompleteOpen(false);
    if (!result.ok) {
      setNotice({ kind: result.conflict ? "conflict" : "error", text: result.message ?? "완료하지 못했습니다." });
      return;
    }
    setNotice({ kind: "success", text: "리포트를 완료했습니다." });
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="revision-state" className="rounded-2xl border border-hairline bg-white p-5">
        <h2 id="revision-state" className="text-[17px] font-bold text-ink">
          리포트 상태
        </h2>
        <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">최근 완료본</dt>
            <dd className="font-semibold text-ink">{latest ? `${formatDot(latest.completedAt)} 완료` : "아직 없음"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">작성 중인 {latest ? "수정본" : "리포트"}</dt>
            <dd className="font-semibold text-ink">{draft ? "작성 중" : "없음"}</dd>
          </div>
        </dl>
        {data.report.hidden ? (
          <p className={`mt-3 ${noticeWarning}`}>
            학부모 화면에서 숨긴 기록입니다. 사유: {data.report.hiddenReason ?? "—"} (다시 공개는 원장님이 합니다)
          </p>
        ) : null}
        {draft && latest ? (
          <p className={`mt-3 ${noticeInfo}`}>
            새 수정본을 작성 중입니다. 완료하기 전까지 학부모 화면에는 최근 완료본 기준으로 표시됩니다.
          </p>
        ) : null}
      </section>

      {editing && draft ? (
        <>
          <section aria-labelledby="evidence-heading" className="rounded-2xl border border-hairline bg-white p-5">
            <h2 id="evidence-heading" className="text-[17px] font-bold text-ink">
              이번 주 관찰 기록 (근거)
            </h2>
            {data.evidence.length === 0 ? (
              <p className="mt-2 text-[15px] text-warning-text">완료된 관찰 기록이 1건 이상 필요합니다.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {data.evidence.map((item) => (
                  <li key={item.observationId} className="rounded-xl bg-brand-ivory p-4 text-[15px]">
                    <p className="text-[13px] text-ink-muted">{formatDot(item.sessionDate)}</p>
                    {item.teacherNote ? <p className="mt-1 whitespace-pre-line">{item.teacherNote}</p> : null}
                    {item.childVoice ? <p className="mt-1">아이의 말: &ldquo;{item.childVoice}&rdquo;</p> : null}
                    {item.growthLabels.length > 0 ? (
                      <p className="mt-1 text-ink-muted">관찰 포인트: {item.growthLabels.join(" · ")}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="composer-heading" className="flex flex-col gap-5 rounded-2xl border border-hairline bg-white p-5">
            <h2 id="composer-heading" className="text-[17px] font-bold text-ink">
              주간 리포트 작성
            </h2>
            {SECTIONS.map((section) => {
              const id = `weekly-${section.key}`;
              return (
                <div key={section.key} className="flex flex-col gap-1.5">
                  <label htmlFor={id} className="text-[16px] font-bold text-ink">
                    {section.label}
                  </label>
                  <p id={`${id}-source`} className="text-[13px] text-ink-muted">
                    {section.source}
                  </p>
                  {section.editable ? (
                    <textarea
                      id={id}
                      aria-describedby={`${id}-source`}
                      value={content[section.key] ?? ""}
                      maxLength={section.limit}
                      rows={section.rows}
                      onChange={(event) => setContent((prev) => ({ ...prev, [section.key]: event.target.value }))}
                      className={`${fieldTextarea} min-h-0 text-[16px]`}
                    />
                  ) : (
                    <p id={id} className="whitespace-pre-line rounded-lg bg-brand-ivory px-3 py-2 text-[15px] text-ink">
                      {content[section.key] ?? "수업 자료에 내용이 없습니다."}
                    </p>
                  )}
                </div>
              );
            })}

            <fieldset>
              <legend className={fieldLabel}>작품 · 활동 장면 — 사진 0~3장 선택 · 선택 사항</legend>
              {data.mediaOptions.length === 0 ? (
                <p className="mt-2 text-[14px] text-ink-muted">선택할 수 있는 사진이 없습니다. 사진 없이도 완료할 수 있습니다.</p>
              ) : (
                <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {data.mediaOptions.map((media, mediaIndex) => {
                    const checked = mediaIds.includes(media.id);
                    return (
                      <li key={media.id}>
                        <label className={`block cursor-pointer overflow-hidden rounded-lg border-2 ${checked ? "border-brand-navy" : "border-hairline"}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleMedia(media.id)}
                            aria-label={`사진 ${mediaIndex + 1} ${checked ? "선택 해제" : "선택"}`}
                          />
                          {media.signedUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- 요청마다 발급되는 임시 서명 URL
                            <img src={media.signedUrl} alt={`활동 사진 ${mediaIndex + 1}`} className="aspect-square w-full object-cover" />
                          ) : (
                            <span className="flex aspect-square items-center justify-center text-[13px] text-ink-muted">불러오지 못함</span>
                          )}
                          <span className="block bg-white px-2 py-1 text-center text-[13px] font-semibold text-ink">
                            {checked ? `선택 ${mediaIds.indexOf(media.id) + 1}` : "선택 안 함"}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-[13px] text-ink-muted">
                학부모 화면의 사진 표시는 사진 공유 기록과 기관 운영 기준에 따라 결정됩니다.
              </p>
            </fieldset>

            {notice ? (
              <p
                role={notice.kind === "success" ? "status" : "alert"}
                className={notice.kind === "success" ? noticeSuccess : notice.kind === "conflict" ? noticeWarning : noticeDanger}
              >
                {notice.text}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-hairline pt-4 sm:flex-row-reverse">
              <button type="button" onClick={() => setCompleteOpen(true)} disabled={busy} className={appButtonPrimary}>
                리포트 완료
              </button>
              <button type="button" onClick={save} disabled={busy} className={appButtonSecondary}>
                {busy ? "저장 중…" : "임시저장"}
              </button>
            </div>
          </section>
        </>
      ) : latest ? (
        <section aria-labelledby="final-heading" className="flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-5">
          <h2 id="final-heading" className="text-[17px] font-bold text-ink">
            최근 완료본
          </h2>
          {SECTIONS.map((section) =>
            latest.content[section.key] ? (
              <div key={section.key}>
                <h3 className="text-[15px] font-bold text-ink">{section.label}</h3>
                <p className="mt-1 whitespace-pre-line text-[16px] leading-relaxed text-ink">{latest.content[section.key]}</p>
              </div>
            ) : null,
          )}
          <div className="flex flex-wrap gap-2 border-t border-hairline pt-4 print:hidden">
            {canWrite ? (
              <button type="button" onClick={() => setCorrectionOpen(true)} className={appButtonSecondary}>
                수정본 만들기
              </button>
            ) : null}
            {!data.report.hidden ? (
              <button type="button" onClick={() => window.print()} className={appButtonSecondary}>
                인쇄
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-hairline bg-white px-4 py-8 text-center text-[15px] text-ink">
          작성 중인 리포트가 없습니다.
        </p>
      )}

      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} title="리포트 완료" busy={busy}>
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed text-ink">
            완료하면 직접 수정할 수 없습니다. 수정이 필요하면 수정본을 만듭니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" onClick={complete} disabled={busy} className={`${appButtonPrimary} sm:flex-1`}>
              {busy ? "처리 중…" : "리포트 완료"}
            </button>
            <button type="button" onClick={() => setCompleteOpen(false)} disabled={busy} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={correctionOpen} onClose={() => setCorrectionOpen(false)} title="수정본 만들기" busy={correctionPending}>
        <form action={correctionAction} className="flex flex-col gap-4">
          <input type="hidden" name="reportId" value={data.report.id} />
          <p className="text-[15px] leading-relaxed text-ink">
            완료본은 그대로 두고 새 수정본을 만듭니다. 수정본을 완료하기 전까지 학부모 화면에는 최근 완료본 기준으로 표시됩니다.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="correction-reason" className={fieldLabel}>
              수정 사유 (필수)
            </label>
            <textarea id="correction-reason" name="reason" required maxLength={500} className={`${fieldTextarea} min-h-[88px]`} />
          </div>
          {correctionState.phase === "error" && correctionState.message ? (
            <p role="alert" className={noticeDanger}>
              {correctionState.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="submit" disabled={correctionPending} className={`${appButtonPrimary} sm:flex-1`}>
              {correctionPending ? "만드는 중…" : "수정본 만들기"}
            </button>
            <button type="button" onClick={() => setCorrectionOpen(false)} disabled={correctionPending} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
