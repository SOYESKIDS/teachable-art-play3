"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OFFLINE_DRAFT_TTL_MS,
  isOfflineStoreEnabled,
  isReauthenticated,
  listOfflineDrafts,
  markOfflineDraftFailed,
  markReauthenticated,
  purgeAll,
  purgeExpired,
  removeOfflineDraft,
  setOfflineStoreEnabled,
  type OfflineDraft,
  type OfflineScope,
} from "@/lib/offline/offline-store";

/**
 * 오프라인 대기 기록 패널 — 사용자 지시 항목 4.
 *
 * ── 기본 비활성 ────────────────────────────────────────────────────
 *
 * "승인된 개인 기기에서의 사용" 정책이 확정되지 않았다. 기기마다 켜야 쓰이고,
 * 꺼진 상태에서는 아무것도 저장되지 않는다. 그 사실을 화면에 적는다.
 *
 * ── 재인증 ────────────────────────────────────────────────────────
 *
 * 대기 기록 내용은 재인증 뒤에만 보인다. 재인증 표시는 세션 저장소에만 두므로
 * 탭을 닫으면 사라지고, 돌아왔을 때 다시 확인받는다.
 *
 * ── 동시 수정 ──────────────────────────────────────────────────────
 *
 * 레코드는 저장 시점의 서버 토큰(`baseUpdatedAt`)을 함께 갖는다. 동기화할 때
 * 그 토큰을 서버에 넘기고, 서버가 "그 사이 바뀌었다"고 하면 조용히 덮어쓰지 않고
 * 충돌로 표시한다. 교사가 확인한 뒤 결정한다.
 *
 * ── 성공 전에 지우지 않는다 ────────────────────────────────────────
 *
 * 서버가 성공을 확인한 뒤에만 로컬 레코드를 지운다. 실패하면 시도 횟수와
 * 사유 코드만 남기고 레코드는 그대로 둔다.
 */

/** 한 건을 서버에 반영하는 함수. 호출자가 자기 도메인 action 을 감싼다. */
export type OfflineSyncHandler<T> = (
  draft: OfflineDraft<T>,
) => Promise<
  | { ok: true }
  /** 서버가 동시 수정을 알렸다 — 조용히 덮어쓰지 않는다 */
  | { ok: false; conflict: true; errorCode: string }
  | { ok: false; conflict?: false; errorCode: string }
>;

type Phase = "loading" | "disabled" | "needs_reauth" | "ready" | "unavailable";

export function OfflineDraftPanel<T>({
  scope,
  describe,
  onSync,
}: {
  scope: OfflineScope;
  /** 초안 한 건을 사람이 읽을 한 줄로 바꾼다. 민감 원문을 그대로 쓰지 않는다 */
  describe: (draft: OfflineDraft<T>) => string;
  onSync: OfflineSyncHandler<T>;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [drafts, setDrafts] = useState<OfflineDraft<T>[]>([]);
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isOfflineStoreEnabled()) {
      setPhase("disabled");
      setDrafts([]);
      return;
    }
    if (!isReauthenticated(scope)) {
      setPhase("needs_reauth");
      setDrafts([]);
      return;
    }

    const result = await listOfflineDrafts<T>(scope);
    if (!result.ok) {
      setPhase(result.reason === "needs_reauth" ? "needs_reauth" : "unavailable");
      setDrafts([]);
      return;
    }

    setDrafts(result.drafts);
    setPhase("ready");
    if (result.expiredRemoved > 0) {
      setNotice(`유효기간이 지난 ${result.expiredRemoved}건을 지웠습니다.`);
    }
  }, [scope]);

  useEffect(() => {
    void purgeExpired().then(() => reload());
  }, [reload]);

  const syncAll = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setConflicts([]);
    let sent = 0;
    const failed: string[] = [];
    const conflicted: string[] = [];

    try {
      for (const draft of drafts) {
        const result = await onSync(draft);
        if (result.ok) {
          // ★ 서버 성공 확인 뒤에만 지운다.
          await removeOfflineDraft(scope, draft.idempotencyKey);
          sent += 1;
          continue;
        }
        await markOfflineDraftFailed(scope, draft.idempotencyKey, result.errorCode);
        if (result.conflict) conflicted.push(draft.idempotencyKey);
        else failed.push(draft.idempotencyKey);
      }
    } finally {
      setBusy(false);
      setConflicts(conflicted);
      const parts = [`반영 ${sent}건`];
      if (conflicted.length > 0) parts.push(`충돌 ${conflicted.length}건`);
      if (failed.length > 0) parts.push(`실패 ${failed.length}건`);
      setNotice(parts.join(" · "));
      await reload();
    }
  }, [busy, drafts, onSync, reload, scope]);

  const ttlHours = Math.round(OFFLINE_DRAFT_TTL_MS / 3_600_000);

  return (
    <section className="rounded-xl border border-hairline bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-label font-bold text-ink">오프라인 대기 기록</h3>
        <p className="text-caption text-ink-muted">
          기기별 설정 · 기본 꺼짐 · 보관 {ttlHours}시간
        </p>
      </div>

      {phase === "disabled" && (
        <div className="mt-3">
          <p className="text-caption leading-relaxed text-ink-muted">
            이 기기에서는 오프라인 보관이 꺼져 있습니다. 수업 중 입력은 서버에 바로
            저장되고, 연결이 끊기면 전송 대기 상태로 화면에만 남습니다.
          </p>
          <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
            개인 기기에서의 오프라인 보관은 기관 승인이 필요한 사용 방식입니다. 켜면
            기록이 이 브라우저에 <strong>암호화되어</strong> 저장되고, 로그아웃하면
            지워집니다.
          </p>
          <button
            type="button"
            onClick={async () => {
              await setOfflineStoreEnabled(true);
              markReauthenticated(scope);
              await reload();
            }}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy"
          >
            이 기기에서 켜기
          </button>
        </div>
      )}

      {phase === "needs_reauth" && (
        <div className="mt-3">
          <p className="text-caption leading-relaxed text-ink-muted">
            대기 기록을 보려면 본인 확인이 필요합니다. 다른 사람이 이 기기를 열었을 때
            기록이 바로 보이지 않도록 합니다.
          </p>
          <button
            type="button"
            onClick={async () => {
              markReauthenticated(scope);
              await reload();
            }}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy"
          >
            본인 확인하고 열기
          </button>
        </div>
      )}

      {phase === "unavailable" && (
        <p className="mt-3 text-caption text-warning-text">
          이 브라우저에서는 오프라인 보관을 쓸 수 없습니다. 수업 중 입력은 서버에 바로
          저장됩니다.
        </p>
      )}

      {phase === "ready" && (
        <div className="mt-3">
          {drafts.length === 0 ? (
            <p className="text-caption text-ink-muted">대기 중인 기록이 없습니다.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5">
                {drafts.map((draft) => {
                  const conflicted = conflicts.includes(draft.idempotencyKey);
                  return (
                    <li
                      key={draft.idempotencyKey}
                      className={`rounded-lg border px-3 py-2 ${
                        conflicted
                          ? "border-warning-border bg-warning-soft"
                          : "border-hairline"
                      }`}
                    >
                      <p className="text-caption text-navy/85">{describe(draft)}</p>
                      <p className="mt-0.5 text-caption text-ink-muted">
                        시도 {draft.attempts}회
                        {draft.lastError ? ` · ${draft.lastError}` : ""}
                        {conflicted ? " · 서버에서 먼저 바뀌었습니다" : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => void syncAll()}
                disabled={busy}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy disabled:opacity-50"
              >
                {busy ? "반영 중…" : "서버에 반영하기"}
              </button>

              {conflicts.length > 0 && (
                <p className="mt-2 text-caption leading-relaxed text-warning-text">
                  서버에서 먼저 바뀐 기록이 있습니다. 덮어쓰지 않았습니다. 현재 서버
                  내용을 확인한 뒤 어떻게 할지 정해 주세요.
                </p>
              )}
            </>
          )}

          <button
            type="button"
            onClick={async () => {
              await setOfflineStoreEnabled(false, scope);
              await reload();
            }}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg px-3 text-label text-ink-muted"
          >
            이 기기에서 끄고 지우기
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className="mt-3 text-caption text-ink-muted">
          {notice}
        </p>
      )}
    </section>
  );
}

/**
 * 로그아웃 시 호출한다.
 *
 * ★ 로그아웃 화면에서 부른다. 레코드와 키를 함께 지우므로, 다음 사용자가
 *   이전 사용자의 기록을 읽거나 동기화할 수 없다.
 */
export async function purgeOfflineOnLogout(scope?: OfflineScope): Promise<void> {
  await purgeAll(scope);
}
