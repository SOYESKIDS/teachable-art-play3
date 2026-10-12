"use client";

import { useCallback, useRef, useState } from "react";
import {
  ASSET_TYPE_LABEL,
  ASSET_UNAVAILABLE_LABEL,
  ASSET_USAGE_LABEL,
  type LessonAsset,
  type LessonAssetUnavailableReason,
} from "@/lib/curriculum/lesson-asset-queries";

/**
 * 수업 자산 패널 — 실행 묶음 B2.
 *
 * ★ 자동 재생하지 않는다.
 *   브라우저 정책 때문에 소리 있는 자동 재생은 차단된다. 선생님이 재생 버튼을
 *   누르면 그때 서명 URL 을 받아 재생한다. 그 사실을 화면에 적는다.
 *
 * ★ 한 번에 하나만 재생한다.
 *   단계를 옮기거나 다른 자산을 누르면 이전 음원·영상을 멈춘다 (지침 §6 B1).
 *
 * ★ 빈 링크에 재생을 표시하지 않는다.
 *   `playable` 이 아니면 버튼을 비활성화하고 왜 못 쓰는지 적는다.
 *   "준비 중" 하나로 뭉개지 않는다.
 *
 * ★ 경로를 다루지 않는다.
 *   서버가 돌려준 단기 서명 URL 만 쓰고, 상태에 담아 두지 않는다
 *   (만료되면 다시 받는다).
 */

export interface AssetUrlResponse {
  ok: boolean;
  url?: string;
  reason?: LessonAssetUnavailableReason;
}

/**
 * 서명 URL 을 받아 오는 함수. **서버 action 참조를 그대로 넘긴다.**
 *
 * ★ 서버 컴포넌트에서 인라인 화살표 함수를 넘기지 않는다. 그것은
 *   클라이언트로 직렬화되지 않는다. 그래서 `classId` 를 첫 인자로 받는 모양으로
 *   두고, 호출부가 action 자체를 넘긴다.
 */
export type AssetUrlResolver = (
  classId: string,
  assetId: string,
) => Promise<AssetUrlResponse>;

type PlaybackState =
  | { kind: "idle" }
  | { kind: "loading"; assetId: string }
  | { kind: "ready"; assetId: string; url: string }
  | { kind: "error"; assetId: string; reason: LessonAssetUnavailableReason };

function isMediaType(asset: LessonAsset): boolean {
  return (
    asset.assetType === "vod" ||
    asset.assetType === "music_video" ||
    asset.assetType === "audio"
  );
}

function isDocumentType(asset: LessonAsset): boolean {
  return (
    asset.assetType === "ebook" ||
    asset.assetType === "story" ||
    asset.assetType === "workbook" ||
    asset.assetType === "teacher_guide" ||
    asset.assetType === "activity_material"
  );
}

function durationLabel(seconds: number | null): string | null {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LessonAssetPanel({
  classId,
  assets,
  ok,
  notInstalled,
  resolveUrl,
}: {
  classId: string;
  assets: LessonAsset[];
  ok: boolean;
  notInstalled: boolean;
  resolveUrl: AssetUrlResolver;
}) {
  const [playback, setPlayback] = useState<PlaybackState>({ kind: "idle" });
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  /** 재생 중인 미디어를 멈춘다. 단계 이동·다른 자산 선택 때 부른다. */
  const stopCurrent = useCallback(() => {
    const node = mediaRef.current;
    if (node) {
      node.pause();
      node.removeAttribute("src");
      node.load();
    }
  }, []);

  const open = useCallback(
    async (asset: LessonAsset) => {
      stopCurrent();
      setPlayback({ kind: "loading", assetId: asset.assetId });

      const result = await resolveUrl(classId, asset.assetId);

      if (!result.ok || !result.url) {
        setPlayback({
          kind: "error",
          assetId: asset.assetId,
          reason: result.reason ?? "playback_failed",
        });
        return;
      }

      setPlayback({ kind: "ready", assetId: asset.assetId, url: result.url });
    },
    [classId, resolveUrl, stopCurrent],
  );

  const close = useCallback(() => {
    stopCurrent();
    setPlayback({ kind: "idle" });
  }, [stopCurrent]);

  if (notInstalled) {
    return (
      <section className="rounded-xl border border-warning-border bg-warning-soft px-5 py-4">
        <h3 className="text-label font-bold text-warning-text">수업 자산</h3>
        <p className="mt-1.5 text-caption leading-relaxed text-warning-text">
          자산 테이블이 아직 적용되지 않았습니다. 수업 진행과 기록은 그대로
          동작합니다.
        </p>
      </section>
    );
  }

  if (!ok) {
    return (
      <section className="rounded-xl border border-danger-border bg-danger-soft px-5 py-4">
        <h3 className="text-label font-bold text-danger">수업 자산</h3>
        <p className="mt-1.5 text-caption text-danger">
          자산 목록을 불러오지 못했습니다. 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  if (assets.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white px-5 py-4">
        <h3 className="text-label font-bold text-ink">수업 자산</h3>
        <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
          이 차시에 등록된 자산이 없습니다. 교사용 가이드의 연계 콘텐츠 목록을
          참고해 주세요.
        </p>
      </section>
    );
  }

  const current = playback.kind === "ready" ? playback : null;

  return (
    <section className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-label font-bold text-ink">수업 자산</h3>
        <p className="text-caption text-ink-muted">
          재생 버튼을 누르면 시작합니다 (자동 재생하지 않습니다)
        </p>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {assets.map((asset) => {
          const busy = playback.kind === "loading" && playback.assetId === asset.assetId;
          const failed = playback.kind === "error" && playback.assetId === asset.assetId;
          const reason = failed ? playback.reason : asset.unavailableReason;
          const duration = durationLabel(asset.durationSeconds);

          return (
            <li
              key={asset.assetId}
              className="rounded-lg border border-line px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="rounded-full border border-line px-2 py-0.5 text-micro font-bold text-ink-muted">
                  {ASSET_TYPE_LABEL[asset.assetType]}
                </span>
                <span className="text-body-sm font-semibold text-navy">
                  {asset.title}
                </span>
                {asset.usagePoint && (
                  <span className="text-caption text-ink-muted">
                    · {ASSET_USAGE_LABEL[asset.usagePoint]}
                  </span>
                )}
                {duration && (
                  <span className="text-caption tabular-nums text-ink-muted">
                    · {duration}
                  </span>
                )}
                {asset.pageCount !== null && (
                  <span className="text-caption tabular-nums text-ink-muted">
                    · {asset.pageCount}면
                  </span>
                )}
              </div>

              {asset.usageNote && (
                <p className="mt-1 text-caption leading-relaxed text-navy/70">
                  {asset.usageNote}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void open(asset)}
                  disabled={!asset.playable || busy}
                  className="inline-flex min-h-11 items-center rounded-lg border border-control-border px-4 text-label font-semibold text-navy transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy
                    ? "준비 중…"
                    : isMediaType(asset)
                      ? "재생"
                      : "열기"}
                </button>

                {reason && (
                  <span className="text-caption text-warning-text">
                    {ASSET_UNAVAILABLE_LABEL[reason]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {current && (
        <div className="mt-4 rounded-lg border border-line bg-primary-soft/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label font-semibold text-ink">
              {assets.find((a) => a.assetId === current.assetId)?.title ?? "자산"}
            </p>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-label text-ink-muted transition-colors hover:text-ink"
            >
              닫기
            </button>
          </div>

          <div className="mt-3">
            {(() => {
              const asset = assets.find((a) => a.assetId === current.assetId);
              if (!asset) return null;

              if (asset.assetType === "audio") {
                return (
                  <audio
                    ref={(node) => {
                      mediaRef.current = node;
                    }}
                    controls
                    preload="none"
                    src={current.url}
                    className="w-full"
                  />
                );
              }

              if (isMediaType(asset)) {
                return (
                  <video
                    ref={(node) => {
                      mediaRef.current = node;
                    }}
                    controls
                    preload="none"
                    playsInline
                    src={current.url}
                    className="aspect-video w-full rounded-md bg-black"
                  />
                );
              }

              if (isDocumentType(asset)) {
                return (
                  <div className="flex flex-col gap-2">
                    {/*
                      PDF · 이미지는 브라우저 기본 뷰어로 연다.
                      iframe 안에서 열면 모바일에서 동작이 제각각이라, 선생님이
                      확실히 볼 수 있는 새 탭을 기본으로 둔다.
                    */}
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 w-fit items-center rounded-lg bg-primary px-4 text-label font-semibold text-on-primary transition-colors hover:bg-primary-hover"
                    >
                      새 탭에서 보기
                    </a>
                    {asset.downloadAllowed ? (
                      <a
                        href={current.url}
                        download
                        className="text-caption text-info-text underline"
                      >
                        내려받기
                      </a>
                    ) : (
                      <p className="text-caption text-ink-muted">
                        이 자산은 내려받기가 허용되지 않았습니다.
                      </p>
                    )}
                    <p className="text-caption text-ink-muted">
                      이 주소는 잠시 뒤 만료됩니다. 만료되면 다시 열어 주세요.
                    </p>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
