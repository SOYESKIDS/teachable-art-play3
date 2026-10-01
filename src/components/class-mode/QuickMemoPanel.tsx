"use client";

import { useEffect, useRef, useState } from "react";
import { fieldLabel, fieldTextarea } from "@/components/ui/field";
import { saveQuickMemoAction } from "@/lib/staff/class-mode-actions";

interface QuickMemoPanelProps {
  sessionId: string;
  initialBody: string;
  initialUpdatedAt: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "failed";

/**
 * 빠른 메모 (DEC-035 · DEC-087 · DEC-099).
 *
 * · 작성 교사 본인만 · server autosave (Source of Truth = server)
 * · 상태: 저장 중 · 저장됨 · 저장 실패 (offline queue 가 없으므로 "전송 대기" 같은 표현을 쓰지 않는다)
 * · 브라우저 지속 저장소(localStorage 등)에 남기지 않는다
 */
export function QuickMemoPanel({ sessionId, initialBody, initialUpdatedAt }: QuickMemoPanelProps) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const updatedAtRef = useRef<string | null>(initialUpdatedAt);
  const lastSavedRef = useRef(initialBody);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef(initialBody);
  // 저장은 한 번에 하나만 보낸다. 진행 중에 또 바뀌면 끝난 뒤 최신 내용으로 한 번 더 저장한다
  // (겹쳐 보내면 두 번째 요청이 옛 updated_at 으로 가서 거짓 충돌이 난다).
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);

  useEffect(() => {
    bodyRef.current = body;
    if (body === lastSavedRef.current) return;

    async function flush() {
      if (inFlightRef.current) {
        queuedRef.current = true;
        return;
      }
      const snapshot = bodyRef.current;
      if (snapshot === lastSavedRef.current) return;

      inFlightRef.current = true;
      setStatus("saving");
      const result = await saveQuickMemoAction({
        sessionId,
        body: snapshot,
        expectedUpdatedAt: updatedAtRef.current,
      });
      inFlightRef.current = false;

      if (result.ok) {
        updatedAtRef.current = result.updatedAt;
        lastSavedRef.current = snapshot;
        setStatus("saved");
        setMessage(null);
        if (queuedRef.current) {
          queuedRef.current = false;
          void flush();
        }
      } else {
        queuedRef.current = false;
        setStatus("failed");
        setMessage(result.message);
      }
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [body, sessionId]);

  const statusText =
    status === "saving" ? "저장 중" : status === "saved" ? "저장됨" : status === "failed" ? "저장 실패" : "";

  return (
    <section aria-labelledby="quick-memo-title" className="rounded-2xl border border-hairline bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="quick-memo-title" className="text-title-sm font-bold">
          빠른 메모
        </h2>
        <span aria-live="polite" className="text-label font-semibold text-ink-muted">
          {statusText}
        </span>
      </div>
      <p id="quick-memo-help" className="mt-1 text-label leading-relaxed text-ink-muted">
        나만 보는 메모입니다. 리포트·학부모 화면·AI에 자동으로 사용되지 않습니다.
      </p>
      <label htmlFor="quick-memo-body" className={`${fieldLabel} sr-only`}>
        빠른 메모 내용
      </label>
      <textarea
        id="quick-memo-body"
        value={body}
        maxLength={2000}
        aria-describedby="quick-memo-help"
        onChange={(event) => setBody(event.target.value)}
        className={`${fieldTextarea} mt-3 min-h-[140px] w-full text-body-lg`}
      />
      {status === "failed" && message ? (
        <p role="alert" className="mt-2 text-label text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
