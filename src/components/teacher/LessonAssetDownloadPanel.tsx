"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ASSET_SAVE_FAILURE_LABEL,
  ASSET_CACHE_TTL_MS,
  applyAssetRevocations,
  formatByteSize,
  isAssetCacheSupported,
  listCachedAssets,
  openCachedAsset,
  removeCachedAsset,
  saveAsset,
  type CachedAssetMeta,
} from "@/lib/offline/asset-cache";
import {
  getLessonAssetDownloadUrlAction,
  verifyLessonAssetDownloadsAction,
} from "@/lib/staff/lesson-asset-download-actions";
import {
  ASSET_TYPE_LABEL,
  type LessonAsset,
} from "@/lib/curriculum/lesson-asset-queries";
import { DOWNLOAD_POLICY_PENDING_NOTICE } from "@/lib/curriculum/lesson-asset-download";

/**
 * 자료 사전 다운로드 패널 — 사용자 지시 항목 1.
 *
 * ── 목록에 무엇이 나오는가 ────────────────────────────────────────
 *
 * ★ `downloadAllowed` 이고 지금 쓸 수 있는(`playable`) 자료만 나온다.
 *   `download_allowed` 는 기본 false 이므로, 정책이 정해지기 전에는 목록이
 *   비어 있다. 빈 목록에 "미리 받기 가능"이라고 쓰지 않는다 — 왜 비어 있는지
 *   적는다.
 *
 * ── 받기 ───────────────────────────────────────────────────────────
 *
 * ★ 선생님이 자료마다 누른다. 자동으로 받지 않는다.
 *   무엇이 기기에 남는지 선생님이 알고 있어야 한다.
 * ★ 서버가 권한과 다운로드 정책을 확인하고 서명 URL 을 만든다. 화면이
 *   판단하지 않는다.
 *
 * ── 받아 둔 뒤 ─────────────────────────────────────────────────────
 *
 * ★ 화면이 열릴 때 서버에 다시 물어본다. 허용이 풀린 자료는 그 자리에서
 *   지운다.
 * ★ 못 물어본 경우(오프라인)에는 지우지 않는다. 미리 받아 둔 이유가 그것이다.
 *   대신 기기 유효기간이 지나면 지워진다.
 */

type Notice = { kind: "info" | "error"; text: string } | null;

export function LessonAssetDownloadPanel({
  classId,
  assets,
}: {
  classId: string;
  /** 이 차시의 자산 목록 (list_lesson_assets_for_class 결과) */
  assets: LessonAsset[];
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [cached, setCached] = useState<CachedAssetMeta[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // ★ 받을 수 있는 자료 = 다운로드 허용 ∧ 지금 쓸 수 있음.
  const downloadable = assets.filter((asset) => asset.downloadAllowed && asset.playable);

  const reload = useCallback(async () => {
    const rows = await listCachedAssets(classId);
    setCached(rows);
    return rows;
  }, [classId]);

  useEffect(() => {
    const supportedNow = isAssetCacheSupported();
    setSupported(supportedNow);
    if (!supportedNow) return;

    let cancelled = false;

    void (async () => {
      const rows = await reload();
      if (cancelled || rows.length === 0) return;

      // ★ 받아 둔 것을 서버에 다시 확인한다.
      const result = await verifyLessonAssetDownloadsAction(
        classId,
        rows.map((row) => row.assetId),
      );
      if (cancelled) return;

      if (!result.ok) {
        // 확인하지 못했다. 지우지 않는다.
        setNotice({
          kind: "info",
          text: "받아 둔 자료의 사용 허용을 지금 확인하지 못했습니다. 유효기간 안에는 그대로 쓸 수 있습니다.",
        });
        return;
      }

      if (result.revoked.length > 0) {
        const removed = await applyAssetRevocations(classId, result.revoked);
        if (cancelled) return;
        await reload();
        setNotice({
          kind: "info",
          text: `사용 허용이 끝난 자료 ${removed}건을 이 기기에서 지웠습니다.`,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classId, reload]);

  const download = useCallback(
    async (asset: LessonAsset) => {
      setBusyId(asset.assetId);
      setNotice(null);
      try {
        const url = await getLessonAssetDownloadUrlAction(classId, asset.assetId);
        if (!url.ok) {
          setNotice({
            kind: "error",
            text:
              url.reason === "download_not_allowed"
                ? "이 자료는 내려받기가 허용되지 않았습니다."
                : "주소를 받지 못했습니다. 다시 시도해 주세요.",
          });
          return;
        }

        const saved = await saveAsset(classId, asset.assetId, url.url, asset.contentType);
        if (!saved.ok) {
          setNotice({ kind: "error", text: ASSET_SAVE_FAILURE_LABEL[saved.reason] });
          return;
        }

        await reload();
        setNotice({
          kind: "info",
          text: `받아 두었습니다 (${formatByteSize(saved.meta.byteSize)}).`,
        });
      } finally {
        setBusyId(null);
      }
    },
    [classId, reload],
  );

  const open = useCallback(
    async (assetId: string) => {
      const blobUrl = await openCachedAsset(classId, assetId);
      if (!blobUrl) {
        await reload();
        setNotice({
          kind: "error",
          text: "받아 둔 파일을 열지 못했습니다. 다시 받아 주세요.",
        });
        return;
      }
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      // 새 탭이 읽을 시간을 준 뒤 되돌린다.
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
    [classId, reload],
  );

  const ttlDays = Math.round(ASSET_CACHE_TTL_MS / (24 * 60 * 60 * 1000));
  const cachedIds = new Set(cached.map((row) => row.assetId));

  return (
    <section className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-label font-bold text-ink">수업 전 미리 받기</h3>
        <p className="text-caption text-ink-muted">기기 보관 {ttlDays}일 · 로그아웃 시 삭제</p>
      </div>

      {supported === false ? (
        <p className="mt-2 text-caption leading-relaxed text-warning-text">
          이 브라우저에서는 미리 받기를 쓸 수 없습니다. 수업 중에는 재생으로 사용해 주세요.
        </p>
      ) : null}

      {supported !== false && downloadable.length === 0 ? (
        <p className="mt-2 text-caption leading-relaxed text-ink-muted">
          미리 받을 수 있는 자료가 없습니다. {DOWNLOAD_POLICY_PENDING_NOTICE}
        </p>
      ) : null}

      {supported !== false && downloadable.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {downloadable.map((asset) => {
            const saved = cached.find((row) => row.assetId === asset.assetId) ?? null;
            const busy = busyId === asset.assetId;
            return (
              <li
                key={asset.assetId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="rounded-full border border-line px-2 py-0.5 text-micro font-bold text-ink-muted">
                      {ASSET_TYPE_LABEL[asset.assetType]}
                    </span>
                    <span className="text-body-sm font-semibold text-navy">{asset.title}</span>
                  </div>
                  {saved ? (
                    <p className="mt-0.5 text-caption text-ink-muted">
                      받아 둠 · {formatByteSize(saved.byteSize)} ·{" "}
                      {new Date(saved.expiresAt).toLocaleDateString("ko-KR")}까지
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {saved ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void open(asset.assetId)}
                        className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-3 text-label font-semibold text-navy"
                      >
                        열기
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeCachedAsset(classId, asset.assetId);
                          await reload();
                          setNotice({ kind: "info", text: "이 기기에서 지웠습니다." });
                        }}
                        className="inline-flex min-h-11 items-center rounded-lg px-3 text-label text-ink-muted"
                      >
                        지우기
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void download(asset)}
                      disabled={busy}
                      className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-3 text-label font-semibold text-navy disabled:opacity-50"
                    >
                      {busy ? "받는 중…" : "미리 받기"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* 목록에서 사라진 자료가 기기에 남아 있는 경우 (차시를 옮겼거나 허용이 바뀌는 중) */}
      {cached.some((row) => !downloadable.some((a) => a.assetId === row.assetId)) ? (
        <p className="mt-3 text-caption leading-relaxed text-ink-muted">
          이 기기에 보관 중인 자료 {cached.length}건 중 일부는 이 차시 목록에 없습니다. 다른
          차시에서 받은 자료이거나, 사용 허용이 바뀌는 중입니다.
        </p>
      ) : null}

      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-3 text-caption leading-relaxed ${
            notice.kind === "error" ? "text-danger" : "text-ink-muted"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <p className="mt-3 text-caption leading-relaxed text-ink-muted">
        미리 받은 자료는 이 브라우저에만 보관됩니다. 원아 사진과 관찰 기록은 받지 않습니다.
        {cachedIds.size > 0 ? " 로그아웃하면 모두 지워집니다." : ""}
      </p>
    </section>
  );
}
