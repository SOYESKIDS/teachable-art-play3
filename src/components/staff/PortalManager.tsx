"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonDangerOutline,
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import { fieldControl } from "@/components/ui/field";
import {
  issueChildPortalAction,
  recordMediaConsentAction,
  revokeChildPortalAction,
} from "@/lib/staff/weekly-report-actions";
import type { PortalChildRow } from "@/lib/staff/director-report-queries";

/** 좁은 화면에서 카드로 바뀔 때만 보이는 칸 이름 (넓은 화면은 표 머리칸이 대신한다) */
const MOBILE_LABEL = "mb-0.5 block text-caption font-semibold text-ink-muted md:hidden";

const CONSENT_LABELS: Record<PortalChildRow["consentStatus"], string> = {
  unknown: "미확인",
  declined: "공유 안 함",
  consented: "공유 가능으로 기록됨",
};

/**
 * DR-08 학부모 공유 (DEC-040 · DEC-092 · DEC-103 · DEC-107 · DEC-112).
 *
 * · 아동별 공유 링크 1개 · 새로 발급하면 이전 링크는 즉시 중지
 * · 링크 주소는 발급 직후 이 화면에서 1회만 보여 준다 (token 은 저장하지 않는다)
 * · 공유 링크 중지: 확인 필수 · 사유 필수 아님 (DEC-111)
 * · 사진 공유 기록은 운영 기록이며 법적 동의 완료를 뜻하지 않는다 (CO-10)
 * · 만료 기간은 정해지지 않았다 (CO-12) — 기간을 안내하지 않는다
 */
export function PortalManager({
  rows,
  portalAvailable,
  issueLocked = false,
}: {
  rows: PortalChildRow[];
  portalAvailable: boolean;
  /** 출시 잠금 — 새 링크 발급 버튼 비활성 (서버도 같은 상수로 거절한다) */
  issueLocked?: boolean;
}) {
  const [issuedLink, setIssuedLink] = useState<{ childName: string; url: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PortalChildRow | null>(null);
  const [busyChild, setBusyChild] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function issue(row: PortalChildRow) {
    setBusyChild(row.childId);
    const result = await issueChildPortalAction({ childId: row.childId });
    setBusyChild(null);
    if (!result.ok || !result.sharePath) {
      setMessage({ ok: false, text: result.message ?? "링크를 만들지 못했습니다." });
      return;
    }
    setCopied(false);
    setIssuedLink({ childName: row.childName, url: `${window.location.origin}${result.sharePath}` });
    setMessage({ ok: true, text: result.message ?? "새 공유 링크를 만들었습니다." });
  }

  async function revoke() {
    if (!revokeTarget?.portalId) return;
    setBusyChild(revokeTarget.childId);
    const result = await revokeChildPortalAction({ portalId: revokeTarget.portalId });
    setBusyChild(null);
    setRevokeTarget(null);
    setMessage({ ok: result.ok, text: result.message });
  }

  async function changeConsent(row: PortalChildRow, status: PortalChildRow["consentStatus"]) {
    setBusyChild(row.childId);
    const result = await recordMediaConsentAction({ childId: row.childId, status });
    setBusyChild(null);
    setMessage({ ok: result.ok, text: result.message });
  }

  async function copyLink() {
    if (!issuedLink) return;
    try {
      await navigator.clipboard.writeText(issuedLink.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!portalAvailable ? (
        <p className={noticeWarning}>
          현재 이용 상품 또는 이용 기간에서 새 공유 링크를 만들 수 없습니다. 본사 담당자에게 문의해 주세요.
        </p>
      ) : null}

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? noticeSuccess : noticeDanger}>
          {message.text}
        </p>
      ) : null}

      {issuedLink ? (
        <section aria-labelledby="issued-link-title" className="rounded-xl border border-brand-mint bg-brand-mint p-4">
          <h2 id="issued-link-title" className="text-body font-bold text-success-text">
            {issuedLink.childName} 공유 링크
          </h2>
          <p className="mt-1 text-label text-ink">
            보안을 위해 이 주소는 지금만 확인할 수 있습니다. 해당 보호자에게만 전달해 주세요.
          </p>
          <input
            readOnly
            aria-label="공유 링크 주소"
            value={issuedLink.url}
            className={`${fieldControl} mt-2 w-full`}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={copyLink} className={appButtonSecondary}>
              {copied ? "복사했습니다" : "링크 복사"}
            </button>
            <button type="button" onClick={() => setIssuedLink(null)} className={appButtonSecondary}>
              닫기
            </button>
          </div>
        </section>
      ) : null}

      <div className="md:overflow-x-auto md:rounded-xl md:border md:border-hairline md:bg-white">
        <table className="block w-full border-collapse text-left text-body-sm text-ink md:table md:min-w-[820px]">
          <caption className="sr-only">아동별 학부모 공유 링크와 사진 공유 기록</caption>
          <thead className="hidden bg-brand-ivory text-label text-ink-muted md:table-header-group">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">원아</th>
              <th scope="col" className="px-4 py-3 font-semibold">반</th>
              <th scope="col" className="px-4 py-3 font-semibold">공유 링크</th>
              <th scope="col" className="px-4 py-3 font-semibold">사진 공유 기록</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">행동</span>
              </th>
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 md:table-row-group">
            {rows.map((row) => {
              const busy = busyChild === row.childId;
              return (
                <tr
                  key={row.childId}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-hairline bg-white p-4 md:table-row md:rounded-none md:border-0 md:border-t md:p-0"
                >
                  <th scope="row" className="col-span-2 text-body font-bold md:px-4 md:py-3 md:text-body-sm md:font-semibold">
                    {row.childName}
                  </th>
                  <td className="md:px-4 md:py-3">
                    <span className={MOBILE_LABEL}>반</span>
                    {row.className ?? "—"}
                  </td>
                  <td className="md:px-4 md:py-3">
                    <span className={MOBILE_LABEL}>공유 링크</span>
                    {row.portalId ? "공유 중" : "공유 안 함"}
                  </td>
                  <td className="col-span-2 md:px-4 md:py-3">
                    <span className={MOBILE_LABEL} aria-hidden="true">사진 공유 기록</span>
                    <label className="sr-only" htmlFor={`consent-${row.childId}`}>
                      {row.childName} 사진 공유 기록
                    </label>
                    <select
                      id={`consent-${row.childId}`}
                      value={row.consentStatus}
                      disabled={busy}
                      onChange={(event) => changeConsent(row, event.target.value as PortalChildRow["consentStatus"])}
                      className={`${fieldControl} w-full md:w-auto`}
                    >
                      {(Object.keys(CONSENT_LABELS) as PortalChildRow["consentStatus"][]).map((status) => (
                        <option key={status} value={status}>
                          {CONSENT_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className={`col-span-2 border-t border-hairline pt-3 md:table-cell md:border-t-0 md:px-4 md:py-3 ${
                      portalAvailable || row.portalId ? "" : "hidden"
                    }`}
                  >
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {portalAvailable ? (
                        <button
                          type="button"
                          disabled={busy || issueLocked}
                          aria-describedby={issueLocked ? "parent-sharing-lock" : undefined}
                          onClick={() => issue(row)}
                          className={row.portalId ? appButtonSecondary : appButtonPrimary}
                        >
                          {busy ? "처리 중…" : row.portalId ? "새 링크 발급" : "링크 만들기"}
                        </button>
                      ) : null}
                      {row.portalId ? (
                        <button type="button" disabled={busy} onClick={() => setRevokeTarget(row)} className={appButtonDangerOutline}>
                          공유 링크 중지
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="공유 링크 중지"
        description={revokeTarget?.childName}
        busy={busyChild !== null}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-sm leading-relaxed text-ink">
            이 링크는 즉시 열리지 않습니다. 다시 공유하려면 새 링크를 발급해야 합니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" onClick={revoke} className={`${appButtonDangerOutline} sm:flex-1`}>
              공유 링크 중지
            </button>
            <button type="button" onClick={() => setRevokeTarget(null)} className={`${appButtonSecondary} sm:flex-1`}>
              돌아가기
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
