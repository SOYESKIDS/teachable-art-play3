export interface MemoSaveResult {
  ok: boolean;
  updatedAt: string | null;
  message: string | null;
  conflict: boolean;
}

export interface MemoSaveSnapshot {
  body: string;
  dirty: boolean;
  status: "idle" | "pending" | "saving" | "saved" | "failed" | "conflict";
  message: string | null;
}

/** Accept only the RPC's documented saved/deleted acknowledgement. Keep microseconds intact. */
export function quickMemoSaveAcknowledgement(value: unknown, body: string): MemoSaveResult {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (row?.deleted === true && row.updated_at === null && body.trim() === "") {
    return { ok: true, updatedAt: null, message: null, conflict: false };
  }
  if (row?.deleted === false && typeof row.updated_at === "string" && row.updated_at.length > 0) {
    return { ok: true, updatedAt: row.updated_at, message: null, conflict: false };
  }
  return { ok: false, updatedAt: null, conflict: false,
    message: "저장 결과를 확인하지 못했습니다. 입력을 유지하고 다시 저장해 주세요." };
}

/** In-memory only. Serialize writes and preserve the exact server concurrency token. */
export function createQuickMemoSaveQueue(options: {
  initialBody: string;
  initialUpdatedAt: string | null;
  save: (body: string, expectedUpdatedAt: string | null) => Promise<MemoSaveResult>;
}) {
  let savedBody = options.initialBody;
  let updatedAt = options.initialUpdatedAt;
  let snapshot: MemoSaveSnapshot = { body: savedBody, dirty: false, status: "idle", message: null };
  let running: Promise<boolean> | null = null;
  let needsVerification = false;
  const listeners = new Set<() => void>();

  function publish(next: MemoSaveSnapshot) {
    snapshot = next;
    listeners.forEach(listener => listener());
  }

  function setBody(body: string) {
    if (body === snapshot.body) return;
    const dirty = body !== savedBody || running !== null || needsVerification;
    publish({ body, dirty,
      status: snapshot.status === "conflict" ? "conflict" : running ? "saving" : dirty ? "pending" : "saved",
      message: snapshot.status === "conflict" ? snapshot.message : null });
  }

  function flush(): Promise<boolean> {
    if (running) return running;
    if (snapshot.status === "conflict") return Promise.resolve(false);
    if (!snapshot.dirty) return Promise.resolve(true);

    async function drain() {
      while (snapshot.body !== savedBody || needsVerification) {
        const body = snapshot.body;
        publish({ ...snapshot, dirty: true, status: "saving", message: null });
        let result: MemoSaveResult;
        try {
          result = await options.save(body, updatedAt);
        } catch {
          needsVerification = true;
          publish({ ...snapshot, dirty: true, status: "failed",
            message: "메모를 저장하지 못했습니다. 입력은 이 화면에 남아 있습니다. 연결을 확인하고 다시 저장해 주세요." });
          return false;
        }
        if (!result.ok) {
          needsVerification = true;
          publish({ ...snapshot, dirty: true, status: result.conflict ? "conflict" : "failed",
            message: result.message ?? "메모를 저장하지 못했습니다. 다시 저장해 주세요." });
          return false;
        }
        needsVerification = false;
        savedBody = body;
        updatedAt = result.updatedAt;
      }
      publish({ ...snapshot, dirty: false, status: "saved", message: null });
      return true;
    }

    // The finally handler runs on rejection too; an exception must never leave the queue locked.
    running = drain().finally(() => { running = null; });
    return running;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setBody,
    flush,
  };
}
