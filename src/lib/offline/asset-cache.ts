"use client";

/**
 * 수업 자료 사전 다운로드 보관소 — 사용자 지시 항목 1.
 *
 * ── service worker 를 쓰지 않는다 ──────────────────────────────────
 *
 * ★ 이것이 이 모듈의 핵심 결정이다.
 *   service worker 를 두면 fetch 를 가로채 **지나가는 응답을 통째로** 저장할 수
 *   있다. 그러면 관찰 원문 · 원아 이름 · 리포트 본문 · 사진 서명 URL 응답까지
 *   기기에 남는다. 수업 자료를 미리 받기 위해 그 위험을 지는 것은 맞지 않다.
 *
 *   그래서 **선생님이 고른 자료 파일만** Cache Storage 에 직접 넣는다. API
 *   응답은 들어오지 않는다. 가로채는 코드가 없기 때문이다.
 *
 * ── 사진을 받지 않는다 ────────────────────────────────────────────
 *
 * ★ 이 보관소에 들어오는 것은 `lesson_assets` 의 수업 자료뿐이다.
 *   원아 사진(`class_session_observation_media`)은 다른 버킷이고, 이 모듈은
 *   그 경로를 모른다. 사진 공유 기준(CO-9 · CO-10)이 확정되지 않았고,
 *   기기에 내려간 사진은 회수할 수 없다.
 *
 * ── 서버가 매번 다시 판정한다 ─────────────────────────────────────
 *
 * ★ 받을 때: 서버가 `download_allowed` 와 권한을 확인하고 단기 서명 URL 을
 *   만들어 준다. 화면이 "받아도 된다"고 판단하지 않는다.
 * ★ 받아 둔 뒤: 열 때마다 서버에 다시 물어본다. 서버가 "이제 아니다"라고
 *   하면 그 자리에서 지운다.
 * ★ 서버에 못 물어본 경우(오프라인)에는 지우지 않는다. 미리 받아 둔 이유가
 *   그것이기 때문이다. 대신 기기 쪽 유효기간이 따로 돌아간다.
 *
 * ── 로그아웃 ───────────────────────────────────────────────────────
 *
 * ★ 로그아웃하면 전부 지운다 (`purgeAllAssets`). 다음 사용자가 이전 기관의
 *   자료를 열 수 없게 한다.
 */

const CACHE_NAME = "soye-lesson-assets-v1";
const INDEX_KEY = "soye.asset-cache.index";

/**
 * 기기 보관 유효기간.
 *
 * ★ 7일이다. 보관 기간 정책이 확정되지 않았으므로 짧게 둔다. 한 주 수업을
 *   준비하는 데는 충분하고, 지난 자료가 기기에 쌓이지 않는다.
 */
export const ASSET_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 보관 메타데이터.
 *
 * ★ 자산 id · 반 id · 시각 · 크기만 담는다.
 *   제목 · 교안 문장 · 원아 정보를 담지 않는다. 제목도 콘텐츠다.
 */
export interface CachedAssetMeta {
  classId: string;
  assetId: string;
  savedAt: number;
  expiresAt: number;
  byteSize: number;
  contentType: string | null;
}

export type SaveResult =
  | { ok: true; meta: CachedAssetMeta }
  | { ok: false; reason: "unsupported" | "fetch_failed" | "quota" | "store_failed" };

export function isAssetCacheSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof caches !== "undefined" &&
    window.isSecureContext === true
  );
}

function requestPath(classId: string, assetId: string): string {
  // 같은 출처의 합성 경로. 실제로 이 주소를 네트워크로 요청하지 않는다.
  return `/__lesson-asset/${classId}/${assetId}`;
}

/* ─────────────────────────────────────────────── 색인 (localStorage) */

function readIndex(): CachedAssetMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CachedAssetMeta =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as CachedAssetMeta).classId === "string" &&
        typeof (row as CachedAssetMeta).assetId === "string" &&
        typeof (row as CachedAssetMeta).expiresAt === "number",
    );
  } catch {
    // 색인을 읽지 못하면 "보관된 것이 없다"로 본다. 캐시 쪽은 purge 가 정리한다.
    return [];
  }
}

function writeIndex(rows: CachedAssetMeta[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(rows));
  } catch {
    // 저장소가 막혀 있으면 색인을 남기지 않는다. 다음 조회에서 비어 보인다.
  }
}

/* ─────────────────────────────────────────────── 받기 */

/**
 * 서버가 만들어 준 서명 URL 로 파일을 받아 기기에 넣는다.
 *
 * ★ URL 을 색인에 남기지 않는다. 서명 URL 은 자격증명에 준한다.
 * ★ 응답이 2xx 가 아니면 넣지 않는다. 오류 본문을 자료로 저장하지 않는다.
 */
export async function saveAsset(
  classId: string,
  assetId: string,
  signedUrl: string,
  contentType: string | null,
): Promise<SaveResult> {
  if (!isAssetCacheSupported()) return { ok: false, reason: "unsupported" };

  let body: Blob;
  try {
    const response = await fetch(signedUrl, { cache: "no-store" });
    if (!response.ok) return { ok: false, reason: "fetch_failed" };
    body = await response.blob();
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }

  const now = Date.now();
  const meta: CachedAssetMeta = {
    classId,
    assetId,
    savedAt: now,
    expiresAt: now + ASSET_CACHE_TTL_MS,
    byteSize: body.size,
    contentType: contentType ?? body.type ?? null,
  };

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      requestPath(classId, assetId),
      new Response(body, {
        headers: {
          "content-type": meta.contentType ?? "application/octet-stream",
          "content-length": String(body.size),
        },
      }),
    );
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return { ok: false, reason: quota ? "quota" : "store_failed" };
  }

  const rows = readIndex().filter(
    (row) => !(row.classId === classId && row.assetId === assetId),
  );
  rows.push(meta);
  writeIndex(rows);

  return { ok: true, meta };
}

/* ─────────────────────────────────────────────── 목록 · 열기 */

/**
 * 이 반의 보관 목록. 유효기간이 지난 것은 지우고 돌려주지 않는다.
 */
export async function listCachedAssets(classId: string): Promise<CachedAssetMeta[]> {
  await purgeExpiredAssets();
  return readIndex()
    .filter((row) => row.classId === classId)
    .sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * 보관된 파일을 열 수 있는 blob URL 을 만든다.
 *
 * ★ 호출자가 다 쓰면 `URL.revokeObjectURL` 로 되돌린다.
 * ★ 유효기간이 지났으면 지우고 null 을 돌려준다.
 */
export async function openCachedAsset(
  classId: string,
  assetId: string,
): Promise<string | null> {
  if (!isAssetCacheSupported()) return null;

  const meta = readIndex().find(
    (row) => row.classId === classId && row.assetId === assetId,
  );
  if (!meta) return null;

  if (meta.expiresAt <= Date.now()) {
    await removeCachedAsset(classId, assetId);
    return null;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(requestPath(classId, assetId));
    if (!response) {
      // 색인에는 있으나 파일이 없다. 색인을 맞춘다.
      await removeCachedAsset(classId, assetId);
      return null;
    }
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────── 지우기 */

export async function removeCachedAsset(classId: string, assetId: string): Promise<void> {
  if (isAssetCacheSupported()) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(requestPath(classId, assetId));
    } catch {
      // 파일을 지우지 못해도 색인에서는 빼서 더 이상 제안하지 않는다.
    }
  }
  writeIndex(
    readIndex().filter((row) => !(row.classId === classId && row.assetId === assetId)),
  );
}

export async function purgeExpiredAssets(): Promise<number> {
  const now = Date.now();
  const rows = readIndex();
  const expired = rows.filter((row) => row.expiresAt <= now);
  for (const row of expired) {
    await removeCachedAsset(row.classId, row.assetId);
  }
  return expired.length;
}

/**
 * 서버가 "이제 허용되지 않는다"고 한 자산을 지운다.
 *
 * ★ 호출자는 서버 확인이 **성공했을 때만** 부른다. 실패를 거절로 바꾸지 않는다.
 */
export async function applyAssetRevocations(
  classId: string,
  revokedAssetIds: readonly string[],
): Promise<number> {
  let removed = 0;
  for (const assetId of revokedAssetIds) {
    await removeCachedAsset(classId, assetId);
    removed += 1;
  }
  return removed;
}

/** 로그아웃 시 전부 지운다. 어느 기관이었는지 모르므로 반 구분 없이 지운다. */
export async function purgeAllAssets(): Promise<void> {
  if (isAssetCacheSupported()) {
    try {
      await caches.delete(CACHE_NAME);
    } catch {
      // 캐시를 지우지 못하면 색인만 비운다. 색인이 없으면 열 수 없다.
    }
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(INDEX_KEY);
    } catch {
      // 저장소가 막혀 있으면 할 수 있는 것이 없다.
    }
  }
}

/* ─────────────────────────────────────────────── 화면 문구 */

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export const ASSET_SAVE_FAILURE_LABEL: Record<
  Exclude<SaveResult, { ok: true }>["reason"],
  string
> = {
  unsupported: "이 브라우저에서는 미리 받기를 쓸 수 없습니다. 수업 중에 재생으로 사용해 주세요.",
  fetch_failed: "파일을 받지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
  quota: "기기 저장 공간이 부족합니다. 받아 둔 자료를 지운 뒤 다시 시도해 주세요.",
  store_failed: "기기에 저장하지 못했습니다. 다시 시도해 주세요.",
};
