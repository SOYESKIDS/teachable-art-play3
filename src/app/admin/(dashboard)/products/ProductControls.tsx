"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import { FEATURE_LABELS, type FeatureCode } from "@/lib/entitlement/labels";
import { publishProductVersionAction, setCapabilityReleasedAction, type ProductActionState } from "./actions";

const IDLE: ProductActionState = { phase: "idle", message: null };

function Notice({ state }: { state: ProductActionState }) {
  if (state.phase === "idle" || !state.message) return null;
  return (
    <p role={state.phase === "error" ? "alert" : "status"} className={state.phase === "error" ? noticeDanger : noticeSuccess}>
      {state.message}
    </p>
  );
}

/** LEVEL 3 확인: 버전 이름을 직접 입력해야 발행된다 (되돌릴 수 없음) */
export function PublishVersionButton({
  versionId,
  versionLabel,
  productName,
  expectedUpdatedAt,
}: {
  versionId: string;
  versionLabel: string;
  productName: string;
  expectedUpdatedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(publishProductVersionAction, IDLE);
  const done = state.phase === "success";

  return (
    <>
      <button type="button" className={appButtonSecondary} onClick={() => setOpen(true)}>
        발행
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${productName} ${versionLabel} 버전을 발행할까요?`}
        description="발행한 버전은 포함 기능 · 기간 · 인원 기준을 수정할 수 없습니다. 변경이 필요하면 새 버전을 만들어야 합니다."
        busy={pending}
      >
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="versionId" value={versionId} />
          <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
          <input type="hidden" name="expectedLabel" value={versionLabel} />
          <p className={noticeWarning}>
            공식 확정된 값인지 확인한 뒤 발행해 주세요. 확인되지 않은 값이 있으면 발행하지 않습니다.
          </p>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
            확인을 위해 버전 이름 “{versionLabel}”을 입력해 주세요
            <input
              name="confirmLabel"
              autoComplete="off"
              required
              className="min-h-11 rounded-lg border border-control-border px-3 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            />
          </label>
          <Notice state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className={appButtonSecondary} onClick={() => setOpen(false)} disabled={pending}>
              {done ? "닫기" : "취소"}
            </button>
            {done ? null : (
              <button type="submit" className={appButtonPrimary} disabled={pending}>
                {pending ? "발행 중" : "발행"}
              </button>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function CapabilityToggle({
  code,
  released,
  blocked,
  expectedUpdatedAt,
}: {
  code: FeatureCode;
  released: boolean;
  blocked: boolean;
  expectedUpdatedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(setCapabilityReleasedAction, IDLE);
  const done = state.phase === "success";
  const label = FEATURE_LABELS[code] ?? code;

  if (blocked && !released) return null;

  return (
    <>
      <button type="button" className={appButtonSecondary} onClick={() => setOpen(true)}>
        {released ? "미출시로 변경" : "출시"}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={released ? `${label}을(를) 미출시로 바꿀까요?` : `${label}을(를) 출시할까요?`}
        description={
          released
            ? "미출시로 바꾸면 이 기능을 포함한 계약은 준비 상태를 충족하지 못해 새로 활성화하거나 정지 후 다시 시작할 수 없습니다. 현재 운영 중인 계약의 이용 권한은 바뀌지 않습니다."
            : "출시하면 이 기능을 포함한 계약의 준비 상태에서 이 항목이 충족됩니다. 계약 활성화는 별도로 진행합니다."
        }
        busy={pending}
      >
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="released" value={released ? "false" : "true"} />
          <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
            출시 · 미출시 변경 사유 (필수)
            <textarea
              name="reason"
              required
              maxLength={500}
              rows={3}
              className="min-h-11 w-full rounded-lg border border-control-border bg-white px-3 py-2 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            />
          </label>
          <Notice state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className={appButtonSecondary} onClick={() => setOpen(false)} disabled={pending}>
              {done ? "닫기" : "취소"}
            </button>
            {done ? null : (
              <button type="submit" className={appButtonPrimary} disabled={pending}>
                {pending ? "처리 중" : released ? "미출시로 변경" : "출시"}
              </button>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
}
