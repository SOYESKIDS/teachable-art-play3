"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonDangerOutline,
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
} from "@/components/ui/app-button";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import { setReportVisibilityAction } from "@/lib/staff/weekly-report-actions";

interface ReportVisibilityControlProps {
  reportId: string;
  hidden: boolean;
  label: string;
}

const HIDE_REASONS = ["사진 오류", "개인정보", "내용 오류", "기타"] as const;

/**
 * 학부모 화면에서 숨기기 · 다시 공개 (DEC-043 · DEC-074 · DEC-102 · LEVEL 2 확인).
 * 둘 다 사유 필수 · 삭제가 아니다 · 숨김 중 새 완료로 자동 공개하지 않는다.
 */
export function ReportVisibilityControl({ reportId, hidden, label }: ReportVisibilityControlProps) {
  const [open, setOpen] = useState(false);
  const [reasonKind, setReasonKind] = useState<string>(HIDE_REASONS[0]);
  const [state, formAction, pending] = useActionState(
    async (prev: { phase: "idle" | "success" | "error"; message: string | null }, formData: FormData) => {
      const result = await setReportVisibilityAction(prev, formData);
      if (result.phase === "success") setOpen(false);
      return result;
    },
    { phase: "idle", message: null },
  );

  const action = hidden ? "unhide" : "hide";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={hidden ? appButtonSecondary : appButtonDangerOutline}>
        {hidden ? "학부모 화면에 다시 공개" : "학부모 화면에서 숨기기"}
      </button>
      {state.phase === "success" && state.message && !open ? (
        <span role="status" className={`ml-2 ${noticeSuccess}`}>
          {state.message}
        </span>
      ) : null}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={hidden ? "학부모 화면에 다시 공개" : "학부모 화면에서 숨기기"}
        description={label}
        busy={pending}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="reportId" value={reportId} />
          <input type="hidden" name="action" value={action} />
          <p className="text-[15px] leading-relaxed text-ink">
            {hidden
              ? "가장 최근에 완료된 기록을 학부모 화면에 다시 표시합니다."
              : "학부모 화면에서 이 기록을 즉시 숨깁니다. 내부 기록은 삭제되지 않습니다."}
          </p>

          {!hidden ? (
            <fieldset className="flex flex-col gap-1">
              <legend className={fieldLabel}>숨김 사유</legend>
              {HIDE_REASONS.map((kind) => (
                <label key={kind} className="flex min-h-11 items-center gap-2 text-[15px]">
                  <input type="radio" name="reasonKind" checked={reasonKind === kind} onChange={() => setReasonKind(kind)} />
                  {kind}
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`visibility-reason-${reportId}`} className={fieldLabel}>
              {hidden ? "다시 공개 사유 (필수)" : "메모 (필수)"}
            </label>
            <textarea
              id={`visibility-reason-${reportId}`}
              name="reasonMemo"
              required
              maxLength={450}
              className={`${fieldTextarea} min-h-[80px]`}
            />
            <p className="text-[13px] text-ink-muted">아이의 이름이나 기록 내용은 적지 말아 주세요.</p>
          </div>

          {state.phase === "error" && state.message ? (
            <p role="alert" className={noticeDanger}>
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="submit" disabled={pending} className={`${hidden ? appButtonPrimary : appButtonDangerOutline} sm:flex-1`}>
              {pending ? "처리 중…" : hidden ? "다시 공개" : "숨기기"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
