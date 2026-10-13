"use client";

/**
 * 지속 오프라인 보관 — 사용자 지시 항목 4.
 *
 * ── 기본은 비활성이다 ──────────────────────────────────────────────
 *
 * "승인된 개인 기기에서의 사용" 정책이 확정되지 않았다. 그래서 이 저장소는
 * 기기마다 명시적으로 켜야 동작하고, 켜지 않으면 아무것도 쓰지 않는다.
 * 정책이 미정이라는 사실이 구현을 멈출 이유는 아니므로, 켜졌을 때 필요한 것은
 * 전부 구현해 둔다 — 암호화 · 기관/사용자 분리 · 유효기간 · 로그아웃 정리 ·
 * 재인증 · 중복 방지 · 동시 수정 처리.
 *
 * ── localStorage 를 쓰지 않는다 ────────────────────────────────────
 *
 * 원아 이름 · 사진 · 관찰 원문을 평문으로 두지 않는다. IndexedDB 에 AES-GCM
 * 으로 암호화해 넣고, 키는 **추출 불가(non-extractable) CryptoKey** 로 저장한다.
 * 그래서 DevTools 로 값을 읽어도 암호문이고, 키 바이트를 꺼낼 수도 없다.
 *
 * 다만 이것이 기기 탈취를 막는다고 주장하지 않는다. 같은 브라우저 프로필을
 * 가진 사람은 키를 **사용**할 수 있다. 그래서 재인증 게이트와 유효기간을 함께 둔다.
 *
 * ── 기관/사용자 분리 ──────────────────────────────────────────────
 *
 * 키와 레코드가 `(organizationId, userId)` 로 갈라진다. 로그아웃 후 다른
 * 사용자가 로그인하면 그 사람의 scope 키로는 이전 사용자의 레코드를 열 수 없고,
 * 목록 조회도 scope 가 다르면 비어 있다.
 */

const DB_NAME = "soye-offline";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_KEYS = "keys";

/** 기기별 활성화 플래그. 이 값만 평문으로 둔다 (민감하지 않다) */
const ENABLE_FLAG = "soye.offline.enabled";

/** 기본 유효기간. 지나면 동기화하지 않고 지운다 */
export const OFFLINE_DRAFT_TTL_MS = 72 * 60 * 60 * 1000; // 72시간

/** 재인증 유효시간. 지나면 다시 확인받는다 */
export const OFFLINE_REAUTH_TTL_MS = 10 * 60 * 1000; // 10분

export interface OfflineScope {
  organizationId: string;
  userId: string;
}

function scopeKey(scope: OfflineScope): string {
  return `${scope.organizationId}:${scope.userId}`;
}

/** 저장되는 레코드. 민감 필드는 `cipher` 안에만 있다 */
interface StoredDraft {
  /** `${scopeKey}|${idempotencyKey}` — 중복 방지용 PK */
  id: string;
  scope: string;
  idempotencyKey: string;
  /** AES-GCM 암호문 */
  cipher: ArrayBuffer;
  /**
   * ★ `Uint8Array` 를 그대로 쓰지 않는다.
   *   TypeScript 5.7 부터 `Uint8Array` 는 버퍼 종류를 매개변수로 갖는다
   *   (`Uint8Array<ArrayBufferLike>`). `ArrayBufferLike` 에는
   *   `SharedArrayBuffer` 가 포함되는데 Web Crypto 의 `BufferSource` 는
   *   `ArrayBuffer` 만 받는다. 그래서 버퍼 종류를 좁혀 둔다.
   */
  iv: Uint8Array<ArrayBuffer>;
  createdAt: number;
  expiresAt: number;
  /** 서버에서 읽은 시점의 동시성 토큰. 동기화 때 비교한다 */
  baseUpdatedAt: string | null;
  /** 동기화 시도 횟수 */
  attempts: number;
  lastError: string | null;
}

/** 복호화된 초안 */
export interface OfflineDraft<T = unknown> {
  idempotencyKey: string;
  payload: T;
  createdAt: number;
  expiresAt: number;
  baseUpdatedAt: string | null;
  attempts: number;
  lastError: string | null;
}

/* ════════════════════════════════════════════════ 활성화 */

export function isOfflineStoreEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ENABLE_FLAG) === "1";
  } catch {
    // 사생활 보호 모드 등에서 접근이 막히면 꺼진 것으로 본다.
    return false;
  }
}

/**
 * 기기별 활성화.
 *
 * ★ 끌 때는 저장된 레코드와 키를 함께 지운다.
 *   "끄기"가 데이터를 남겨 두면 끈 의미가 없다.
 */
export async function setOfflineStoreEnabled(
  enabled: boolean,
  scope?: OfflineScope,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(ENABLE_FLAG, "1");
    } else {
      window.localStorage.removeItem(ENABLE_FLAG);
      await purgeAll(scope);
    }
  } catch {
    // 저장소에 쓸 수 없으면 꺼진 상태를 유지한다.
  }
}

/* ════════════════════════════════════════════════ IndexedDB */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        const store = db.createObjectStore(STORE_DRAFTS, { keyPath: "id" });
        store.createIndex("scope", "scope", { unique: false });
        store.createIndex("expiresAt", "expiresAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS, { keyPath: "scope" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = run(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ════════════════════════════════════════════════ 암호화 키 */

/**
 * scope 전용 AES-GCM 키를 얻는다. 없으면 만든다.
 *
 * ★ `extractable: false` 로 만든다. 키 바이트를 꺼낼 수 없다.
 * ★ scope 가 다르면 다른 키다 — 기관/사용자 분리가 암호 계층에서 이루어진다.
 */
async function getScopeKey(db: IDBDatabase, scope: OfflineScope): Promise<CryptoKey> {
  const id = scopeKey(scope);
  const existing = await tx<{ scope: string; key: CryptoKey } | undefined>(
    db,
    STORE_KEYS,
    "readonly",
    (s) => s.get(id) as IDBRequest<{ scope: string; key: CryptoKey } | undefined>,
  );
  if (existing?.key) return existing.key;

  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // extractable = false
    ["encrypt", "decrypt"],
  );
  await tx(db, STORE_KEYS, "readwrite", (s) => s.put({ scope: id, key }));
  return key;
}

async function encrypt(key: CryptoKey, value: unknown) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { cipher, iv };
}

async function decrypt<T>(
  key: CryptoKey,
  cipher: ArrayBuffer,
  iv: Uint8Array<ArrayBuffer>,
): Promise<T> {
  const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/* ════════════════════════════════════════════════ 재인증 */

/**
 * 재인증 확인 시각. **세션 저장소에만** 둔다.
 *
 * 탭을 닫으면 사라지므로, 돌아왔을 때 다시 확인받는다.
 * 여기에는 자격증명이 아니라 "확인했다"는 시각만 담긴다.
 */
const REAUTH_KEY = "soye.offline.reauth";

export function markReauthenticated(scope: OfflineScope): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${REAUTH_KEY}:${scopeKey(scope)}`,
      String(Date.now()),
    );
  } catch {
    // 쓸 수 없으면 재인증이 안 된 상태로 남는다 — 안전한 쪽이다.
  }
}

export function isReauthenticated(scope: OfflineScope): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(`${REAUTH_KEY}:${scopeKey(scope)}`);
    if (raw === null) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < OFFLINE_REAUTH_TTL_MS;
  } catch {
    return false;
  }
}

export function clearReauth(scope?: OfflineScope): void {
  if (typeof window === "undefined") return;
  try {
    if (scope) {
      window.sessionStorage.removeItem(`${REAUTH_KEY}:${scopeKey(scope)}`);
      return;
    }
    // scope 를 모르면 접두어가 같은 것을 모두 지운다.
    const remove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(REAUTH_KEY)) remove.push(k);
    }
    remove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // 무시한다
  }
}

/* ════════════════════════════════════════════════ 저장 · 조회 */

export type PutResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; reason: "disabled" | "unavailable" };

/**
 * 초안을 저장한다.
 *
 * ★ 중복 방지 — `idempotencyKey` 가 같으면 덮어쓰지 않고 duplicate 로 알린다.
 *   같은 기록을 두 번 쌓아 두 번 동기화하는 일을 막는다.
 */
export async function putOfflineDraft<T>(
  scope: OfflineScope,
  idempotencyKey: string,
  payload: T,
  baseUpdatedAt: string | null,
  ttlMs: number = OFFLINE_DRAFT_TTL_MS,
): Promise<PutResult> {
  if (!isOfflineStoreEnabled()) return { ok: false, reason: "disabled" };
  if (typeof window === "undefined" || !window.indexedDB || !window.crypto?.subtle) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const db = await openDb();
    const id = `${scopeKey(scope)}|${idempotencyKey}`;

    const existing = await tx<StoredDraft | undefined>(db, STORE_DRAFTS, "readonly", (s) =>
      s.get(id) as IDBRequest<StoredDraft | undefined>,
    );
    if (existing) {
      db.close();
      return { ok: true, duplicate: true };
    }

    const key = await getScopeKey(db, scope);
    const { cipher, iv } = await encrypt(key, payload);
    const now = Date.now();

    const record: StoredDraft = {
      id,
      scope: scopeKey(scope),
      idempotencyKey,
      cipher,
      iv,
      createdAt: now,
      expiresAt: now + ttlMs,
      baseUpdatedAt,
      attempts: 0,
      lastError: null,
    };

    await tx(db, STORE_DRAFTS, "readwrite", (s) => s.put(record));
    db.close();
    return { ok: true, duplicate: false };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export type ListResult<T> =
  | { ok: true; drafts: OfflineDraft<T>[]; expiredRemoved: number }
  | { ok: false; reason: "disabled" | "needs_reauth" | "unavailable" };

/**
 * 대기 중인 초안을 읽는다.
 *
 * ★ 재인증 없이는 내용을 돌려주지 않는다.
 *   로그아웃 후 다른 사용자가 열어도 평문을 보지 못한다.
 * ★ 만료된 레코드는 돌려주지 않고 지운다.
 * ★ 다른 scope 의 레코드는 조회 대상이 아니다.
 */
export async function listOfflineDrafts<T>(scope: OfflineScope): Promise<ListResult<T>> {
  if (!isOfflineStoreEnabled()) return { ok: false, reason: "disabled" };
  if (!isReauthenticated(scope)) return { ok: false, reason: "needs_reauth" };
  if (typeof window === "undefined" || !window.indexedDB) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const db = await openDb();
    const all = await tx<StoredDraft[]>(db, STORE_DRAFTS, "readonly", (s) =>
      s.index("scope").getAll(scopeKey(scope)) as IDBRequest<StoredDraft[]>,
    );

    const now = Date.now();
    const expired = all.filter((r) => r.expiresAt <= now);
    for (const r of expired) {
      await tx(db, STORE_DRAFTS, "readwrite", (s) => s.delete(r.id));
    }

    const key = await getScopeKey(db, scope);
    const drafts: OfflineDraft<T>[] = [];
    for (const r of all.filter((x) => x.expiresAt > now)) {
      try {
        const payload = await decrypt<T>(key, r.cipher, r.iv);
        drafts.push({
          idempotencyKey: r.idempotencyKey,
          payload,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt,
          baseUpdatedAt: r.baseUpdatedAt,
          attempts: r.attempts,
          lastError: r.lastError,
        });
      } catch {
        // 복호화 실패 — 다른 사용자의 키로 만든 레코드이거나 손상됐다.
        // 내용을 읽을 수 없으므로 돌려주지 않는다. 지우지도 않는다
        // (원래 사용자가 돌아오면 열 수 있어야 한다).
      }
    }

    db.close();
    return { ok: true, drafts, expiredRemoved: expired.length };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/* ════════════════════════════════════════════════ 동기화 결과 반영 */

/**
 * 동기화 성공 — 레코드를 지운다.
 *
 * ★ 성공 전에는 지우지 않는다. 호출자는 서버가 성공을 확인한 뒤에만 부른다.
 */
export async function removeOfflineDraft(
  scope: OfflineScope,
  idempotencyKey: string,
): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDb();
    await tx(db, STORE_DRAFTS, "readwrite", (s) =>
      s.delete(`${scopeKey(scope)}|${idempotencyKey}`),
    );
    db.close();
  } catch {
    // 무시한다 — 다음 조회에서 다시 보인다
  }
}

/** 동기화 실패 — 시도 횟수와 사유 코드만 남긴다 */
export async function markOfflineDraftFailed(
  scope: OfflineScope,
  idempotencyKey: string,
  errorCode: string,
): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDb();
    const id = `${scopeKey(scope)}|${idempotencyKey}`;
    const record = await tx<StoredDraft | undefined>(db, STORE_DRAFTS, "readonly", (s) =>
      s.get(id) as IDBRequest<StoredDraft | undefined>,
    );
    if (record) {
      record.attempts += 1;
      record.lastError = errorCode;
      await tx(db, STORE_DRAFTS, "readwrite", (s) => s.put(record));
    }
    db.close();
  } catch {
    // 무시한다
  }
}

/* ════════════════════════════════════════════════ 정리 */

/**
 * 로그아웃 정리.
 *
 * ★ scope 를 알면 그 scope 만, 모르면 전부 지운다.
 *   로그아웃 후 다른 사용자가 대기 기록을 읽거나 동기화하지 못하게 한다.
 * ★ 키도 함께 지운다. 키가 남으면 암호문이 열릴 수 있다.
 */
export async function purgeAll(scope?: OfflineScope): Promise<void> {
  clearReauth(scope);
  if (typeof window === "undefined" || !window.indexedDB) return;

  try {
    const db = await openDb();

    if (scope) {
      const id = scopeKey(scope);
      const rows = await tx<StoredDraft[]>(db, STORE_DRAFTS, "readonly", (s) =>
        s.index("scope").getAll(id) as IDBRequest<StoredDraft[]>,
      );
      for (const r of rows) {
        await tx(db, STORE_DRAFTS, "readwrite", (s) => s.delete(r.id));
      }
      await tx(db, STORE_KEYS, "readwrite", (s) => s.delete(id));
    } else {
      await tx(db, STORE_DRAFTS, "readwrite", (s) => s.clear());
      await tx(db, STORE_KEYS, "readwrite", (s) => s.clear());
    }

    db.close();
  } catch {
    // 무시한다
  }
}

/** 만료 레코드만 지운다. 화면 진입 때 부른다 */
export async function purgeExpired(): Promise<number> {
  if (typeof window === "undefined" || !window.indexedDB) return 0;
  try {
    const db = await openDb();
    const now = Date.now();
    const all = await tx<StoredDraft[]>(db, STORE_DRAFTS, "readonly", (s) =>
      s.getAll() as IDBRequest<StoredDraft[]>,
    );
    const expired = all.filter((r) => r.expiresAt <= now);
    for (const r of expired) {
      await tx(db, STORE_DRAFTS, "readwrite", (s) => s.delete(r.id));
    }
    db.close();
    return expired.length;
  } catch {
    return 0;
  }
}
