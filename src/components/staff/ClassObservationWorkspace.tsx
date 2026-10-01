"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonGhost,
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import { saveClassObservationAction } from "@/lib/staff/observation-v2-actions";
import type {
  GrowthSelection,
  StaffObservationChild,
  StaffObservationPageData,
} from "@/types/staff-observation";
import { GrowthMetricSelector } from "./GrowthMetricSelector";
import { ObservationMediaSection } from "./ObservationMediaSection";

type AttendanceStatus = "present" | "absent" | "late" | "left_early";

interface ClassObservationWorkspaceProps {
  data: StaffObservationPageData;
  attendance: Record<string, AttendanceStatus>;
  canWrite: boolean;
  blockedReason: string | null;
  weeklyQueueHref: string;
  backHref: string;
}

interface ChildDraft {
  teacherNote: string;
  childVoice: string;
  growth: GrowthSelection[];
  pending: string[];
  updatedAt: string | null;
  recordStatus: "draft" | "complete" | null;
  saved: { teacherNote: string; childVoice: string; growth: string };
}

function growthKey(growth: GrowthSelection[]): string {
  return [...growth]
    .sort((a, b) => a.metricCode.localeCompare(b.metricCode))
    .map((item) => `${item.metricCode}:${item.stage}`)
    .join("|");
}

function draftFrom(child: StaffObservationChild): ChildDraft {
  const teacherNote = child.teacherNote ?? "";
  const childVoice = child.childVoice ?? "";
  return {
    teacherNote,
    childVoice,
    growth: child.growth,
    pending: [],
    updatedAt: child.updatedAt,
    recordStatus: child.recordStatus,
    saved: { teacherNote, childVoice, growth: growthKey(child.growth) },
  };
}

function isDirty(draft: ChildDraft): boolean {
  return (
    draft.teacherNote !== draft.saved.teacherNote ||
    draft.childVoice !== draft.saved.childVoice ||
    growthKey(draft.growth) !== draft.saved.growth ||
    draft.pending.length > 0
  );
}

/**
 * AFTER ② 관찰 (DEC-086 · DEC-099 · DEC-100 · class-mode-observation §7).
 *
 * · 아이 한 명씩 집중 작성: 교사 관찰 → 아이의 말 → 관찰 포인트 → 사진
 * · [관찰 완료하고 다음 아이] = complete + 다음 / [임시저장] = draft / [나중에 작성] = 이동만
 * · [관찰 마무리]는 일괄 완료가 아니다 — 미작성은 작성 중으로 남고 Weekly 대기열로 이동
 * · 입력 중인 내용은 이 화면 메모리에만 둔다 (localStorage 등 지속 저장 없음 · DEC-099)
 * · 충돌 시 last-write-wins 금지 · 내 입력은 복사할 수 있게 남긴다 (DEC-111)
 * · 이전 형식(구 관찰영역) 기록은 읽기만 한다 (DI-14)
 */
export function ClassObservationWorkspace({
  data,
  attendance,
  canWrite,
  blockedReason,
  weeklyQueueHref,
  backHref,
}: ClassObservationWorkspaceProps) {
  const router = useRouter();
  const children = data.children;

  const [drafts, setDrafts] = useState<Record<string, ChildDraft>>(() =>
    Object.fromEntries(children.map((child) => [child.childId, draftFrom(child)])),
  );
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "conflict"; text: string } | null>(null);
  const [conflictCopy, setConflictCopy] = useState<{ teacherNote: string; childVoice: string } | null>(null);
  const [reloadChildId, setReloadChildId] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  // 충돌 후 [최신 내용 불러오기]: 서버 새 값(props)이 오면 그 아이의 입력만 교체한다.
  // (prop 변화에 따른 state 조정은 렌더 중에 한다 — effect 로 하지 않는다)
  const [prevChildren, setPrevChildren] = useState(children);
  if (children !== prevChildren) {
    setPrevChildren(children);
    if (reloadChildId) {
      const fresh = children.find((item) => item.childId === reloadChildId);
      if (fresh) {
        setDrafts((prev) => ({ ...prev, [reloadChildId]: draftFrom(fresh) }));
        setReloadChildId(null);
        setNotice({ kind: "success", text: "최신 내용을 불러왔습니다. 아래 내 입력을 참고해 다시 작성해 주세요." });
      }
    }
  }

  const dirtyCount = useMemo(
    () => Object.values(drafts).filter((draft) => isDirty(draft)).length,
    [drafts],
  );

  // 브라우저 이탈 경고는 보조 수단이다 (주 경로는 [관찰 마무리] 확인).
  useEffect(() => {
    if (dirtyCount === 0) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyCount]);

  if (children.length === 0) {
    return (
      <p className="rounded-xl border border-hairline bg-white px-4 py-10 text-center text-body-sm text-ink">
        이 반에 관찰할 원아가 없습니다. 원아 등록은 원에서 관리합니다.
      </p>
    );
  }

  const child = children[Math.min(index, children.length - 1)];
  const draft = drafts[child.childId];
  const legacy = child.taxonomy === "legacy_domains";
  const editable = canWrite && !legacy;

  const presentCount = children.filter((item) => attendance[item.childId] && attendance[item.childId] !== "absent").length;
  const completeCount = children.filter((item) => drafts[item.childId]?.recordStatus === "complete").length;
  const incompletePresent = children.filter(
    (item) =>
      attendance[item.childId] &&
      attendance[item.childId] !== "absent" &&
      drafts[item.childId]?.recordStatus !== "complete",
  ).length;

  function statusLabel(item: StaffObservationChild): string {
    if (attendance[item.childId] === "absent") return "결석";
    const itemDraft = drafts[item.childId];
    if (itemDraft?.recordStatus === "complete") return "관찰 완료";
    if (itemDraft?.recordStatus === "draft") return "작성 중";
    return "미작성";
  }

  function update(patch: Partial<ChildDraft>) {
    setDrafts((prev) => ({ ...prev, [child.childId]: { ...prev[child.childId], ...patch } }));
  }

  function goNext() {
    setNotice(null);
    setConflictCopy(null);
    setIndex((value) => Math.min(children.length - 1, value + 1));
  }

  async function save(recordStatus: "draft" | "complete", moveNext: boolean) {
    if (!editable) return;

    if (draft.pending.length > 0) {
      setNotice({ kind: "error", text: "방식을 선택하거나 이 관찰 포인트 선택을 해제해 주세요." });
      return;
    }

    setSaving(true);
    const result = await saveClassObservationAction({
      sessionId: data.session.id,
      childId: child.childId,
      teacherNote: draft.teacherNote,
      childVoice: draft.childVoice,
      recordStatus,
      growth: draft.growth,
      expectedUpdatedAt: draft.updatedAt,
    });
    setSaving(false);

    if (!result.ok) {
      if (result.conflict) {
        setConflictCopy({ teacherNote: draft.teacherNote, childVoice: draft.childVoice });
        setNotice({ kind: "conflict", text: result.message ?? "다른 선생님이 먼저 내용을 변경했습니다." });
      } else {
        setNotice({ kind: "error", text: result.message ?? "저장하지 못했습니다." });
      }
      return;
    }

    update({
      updatedAt: result.updatedAt,
      recordStatus: result.recordStatus,
      saved: { teacherNote: draft.teacherNote, childVoice: draft.childVoice, growth: growthKey(draft.growth) },
    });
    setConflictCopy(null);

    if (moveNext && index < children.length - 1) {
      setIndex((value) => value + 1);
      setNotice({ kind: "success", text: "관찰 완료로 저장했습니다. 다음 아이로 이동했습니다." });
    } else {
      setNotice({ kind: "success", text: result.message ?? "저장했습니다." });
    }
  }

  function requestReload() {
    setReloadChildId(child.childId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm font-semibold text-ink">
          관찰 완료 {completeCount} / 출석 {presentCount}
        </p>
        <a href={backHref} className={appButtonGhost}>
          오늘의 수업으로
        </a>
      </div>

      {blockedReason ? <p className={noticeWarning}>{blockedReason}</p> : null}

      <nav aria-label="원아 선택" className="overflow-x-auto">
        <ul className="flex gap-2 pb-1">
          {children.map((item, itemIndex) => {
            const current = itemIndex === index;
            const dirty = drafts[item.childId] ? isDirty(drafts[item.childId]) : false;
            return (
              <li key={item.childId}>
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    setNotice(null);
                    setConflictCopy(null);
                    setIndex(itemIndex);
                  }}
                  className={`flex min-h-12 flex-col items-start rounded-lg border px-3 py-1.5 text-left ${
                    current ? "border-brand-navy bg-brand-sky" : "border-hairline bg-white"
                  }`}
                >
                  <span className="text-body-sm font-semibold text-ink">
                    {item.childName ?? "이름 없음"}
                    {dirty ? " *" : ""}
                  </span>
                  <span className="text-caption text-ink-muted">{statusLabel(item)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="child-heading" className="flex flex-col gap-5 rounded-2xl border border-hairline bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="child-heading" className="text-title-lg font-bold text-ink">
            {child.childName ?? "이름 없음"}
          </h2>
          <span className="text-label font-semibold text-ink-muted">{statusLabel(child)}</span>
        </div>

        {legacy ? (
          <div className="flex flex-col gap-3">
            <p className={noticeWarning}>이전 형식 관찰 기록입니다. 이 화면에서는 읽기만 할 수 있습니다.</p>
            <div>
              <p className={fieldLabel}>교사 관찰</p>
              <p className="mt-1 whitespace-pre-line text-body text-ink">{child.teacherNote ?? "—"}</p>
            </div>
            <div>
              <p className={fieldLabel}>아이의 말</p>
              <p className="mt-1 whitespace-pre-line text-body text-ink">{child.childVoice ?? "—"}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`note-${child.childId}`} className="text-body-lg font-bold text-ink">
                교사 관찰
              </label>
              <p id={`note-help-${child.childId}`} className="text-label text-ink-muted">
                관찰한 장면을 사실 그대로 적어 주세요.
              </p>
              <textarea
                id={`note-${child.childId}`}
                value={draft.teacherNote}
                maxLength={2000}
                disabled={!editable}
                aria-describedby={`note-help-${child.childId}`}
                onChange={(event) => update({ teacherNote: event.target.value })}
                className={`${fieldTextarea} min-h-[140px] text-body`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`voice-${child.childId}`} className="text-body-lg font-bold text-ink">
                아이의 말
              </label>
              <p id={`voice-help-${child.childId}`} className="text-label text-ink-muted">
                아이가 실제로 한 말만 그대로 적어 주세요. 없으면 비워 두세요.
              </p>
              <textarea
                id={`voice-${child.childId}`}
                value={draft.childVoice}
                maxLength={1000}
                disabled={!editable}
                aria-describedby={`voice-help-${child.childId}`}
                onChange={(event) => update({ childVoice: event.target.value })}
                className={`${fieldTextarea} min-h-[88px] text-body`}
              />
            </div>

            <GrowthMetricSelector
              metrics={data.growthMetrics}
              value={draft.growth}
              pendingMetrics={draft.pending}
              disabled={!editable}
              idPrefix={`growth-${child.childId}`}
              onChange={({ selections, pending }) => update({ growth: selections, pending })}
            />
          </>
        )}

        <ObservationMediaSection
          sessionId={data.session.id}
          childId={child.childId}
          childName={child.childName}
          media={child.media}
          canUpload={canWrite && data.session.status !== "cancelled"}
          uploadBlockedReason={canWrite ? null : blockedReason}
          canHide
        />

        {notice ? (
          <p
            role={notice.kind === "success" ? "status" : "alert"}
            className={notice.kind === "success" ? noticeSuccess : notice.kind === "conflict" ? noticeWarning : noticeDanger}
          >
            {notice.text}
          </p>
        ) : null}

        {conflictCopy ? (
          <div className="flex flex-col gap-2 rounded-xl border border-warning-soft bg-warning-soft p-4">
            <p className="text-label font-semibold text-warning-text">내 입력 (복사해서 다시 쓸 수 있습니다)</p>
            <textarea
              readOnly
              aria-label="충돌 전 내 교사 관찰 입력"
              value={conflictCopy.teacherNote}
              className={`${fieldTextarea} min-h-[88px] bg-white`}
            />
            {conflictCopy.childVoice ? (
              <textarea
                readOnly
                aria-label="충돌 전 내 아이의 말 입력"
                value={conflictCopy.childVoice}
                className={`${fieldTextarea} min-h-[60px] bg-white`}
              />
            ) : null}
            <button type="button" onClick={requestReload} className={appButtonSecondary}>
              최신 내용 불러오기
            </button>
          </div>
        ) : null}

        {editable ? (
          <div className="flex flex-col gap-2 border-t border-hairline pt-4 sm:flex-row-reverse sm:flex-wrap">
            <button type="button" onClick={() => save("complete", true)} disabled={saving} className={appButtonPrimary}>
              {saving ? "저장 중…" : "관찰 완료하고 다음 아이"}
            </button>
            <button type="button" onClick={() => save("draft", false)} disabled={saving} className={appButtonSecondary}>
              임시저장
            </button>
            <button type="button" onClick={goNext} disabled={saving || index === children.length - 1} className={appButtonGhost}>
              나중에 작성
            </button>
          </div>
        ) : null}
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => setFinishOpen(true)} className={appButtonSecondary}>
          관찰 마무리
        </button>
      </div>

      <Dialog open={finishOpen} onClose={() => setFinishOpen(false)} title="관찰 마무리">
        <div className="flex flex-col gap-4">
          {incompletePresent > 0 ? (
            <p className="text-body-sm leading-relaxed text-ink">
              미작성 {incompletePresent}명의 관찰은 작성 중으로 남습니다. 나중에 이어서 작성할 수 있습니다.
            </p>
          ) : (
            <p className="text-body-sm leading-relaxed text-ink">출석한 아이의 관찰을 모두 완료했습니다.</p>
          )}
          {dirtyCount > 0 ? (
            <p className={noticeWarning}>
              저장하지 않은 변경이 있는 아이 {dirtyCount}명이 있습니다. 이동하면 저장하지 않은 입력은 사라집니다.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <a href={weeklyQueueHref} className={`${appButtonPrimary} sm:flex-1`}>
              주간 리포트로 이동
            </a>
            <button type="button" onClick={() => setFinishOpen(false)} className={`${appButtonSecondary} sm:flex-1`}>
              계속 작성
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
