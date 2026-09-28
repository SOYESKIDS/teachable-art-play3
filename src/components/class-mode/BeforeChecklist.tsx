"use client";

import { useActionState, useState } from "react";
import { classModeButtonPrimary, noticeDanger, noticeWarning } from "@/components/ui/app-button";
import { startClassSessionFromBeforeAction, type ClassModeActionState } from "@/lib/staff/class-mode-actions";
import { useOnlineStatus } from "./useOnlineStatus";

interface BeforeChecklistProps {
  sessionId: string;
  organizationId: string;
  materials: string[];
  photoNotSharedNames: string[];
  alreadyConfirmed: boolean;
  canStart: boolean;
  blockedReason: string | null;
}

const INITIAL: ClassModeActionState = { phase: "idle", message: null };

/**
 * BEFORE 필수 확인 (DEC-036 · DEC-098 · modal 아님 · 한 화면 체크리스트).
 *
 * · 준비물 체크는 선택 (편의 · 서버에 남기지 않는다)
 * · 안전 확인 · 사진/개인정보 확인은 필수 (서버 기록 · 수업 시작 조건)
 * · 필수 확인이 남아 있으면 [수업 시작] 비활성 + "필수 확인 N개 남음"
 * · 오프라인이면 서버 전환(수업 시작)을 하지 않는다
 */
export function BeforeChecklist({
  sessionId,
  organizationId,
  materials,
  photoNotSharedNames,
  alreadyConfirmed,
  canStart,
  blockedReason,
}: BeforeChecklistProps) {
  const online = useOnlineStatus();
  const [safety, setSafety] = useState(alreadyConfirmed);
  const [privacy, setPrivacy] = useState(alreadyConfirmed);
  const [state, formAction, pending] = useActionState(startClassSessionFromBeforeAction, INITIAL);

  const remaining = (safety ? 0 : 1) + (privacy ? 0 : 1);
  const disabled = !canStart || remaining > 0 || pending || !online;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="organizationId" value={organizationId} />

      {!online ? (
        <p role="status" className={noticeWarning}>
          인터넷 연결이 끊겼습니다. 연결되면 다시 시도해 주세요.
        </p>
      ) : null}

      {materials.length > 0 ? (
        <fieldset className="rounded-2xl border border-hairline bg-white p-5">
          <legend className="px-1 text-[17px] font-bold">준비물 (선택 확인)</legend>
          <ul className="mt-2 flex flex-col gap-1">
            {materials.map((item, index) => (
              <li key={`${index}-${item}`}>
                <label className="flex min-h-12 items-center gap-3 text-[17px]">
                  <input type="checkbox" className="h-6 w-6" />
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <fieldset className="rounded-2xl border border-hairline bg-white p-5">
        <legend className="px-1 text-[17px] font-bold">필수 확인</legend>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex min-h-14 items-start gap-3 text-[17px] leading-relaxed">
            <input
              type="checkbox"
              name="safetyConfirmed"
              checked={safety}
              disabled={alreadyConfirmed}
              onChange={(event) => setSafety(event.target.checked)}
              className="mt-1 h-6 w-6 shrink-0"
            />
            <span>
              <span className="mr-2 rounded-md bg-brand-sky px-2 py-0.5 text-[13px] font-bold text-info-text">필수</span>
              안전 확인 — 도구 · 재료 · 공간의 안전을 확인했습니다.
            </span>
          </label>
          <label className="flex min-h-14 items-start gap-3 text-[17px] leading-relaxed">
            <input
              type="checkbox"
              name="privacyConfirmed"
              checked={privacy}
              disabled={alreadyConfirmed}
              onChange={(event) => setPrivacy(event.target.checked)}
              className="mt-1 h-6 w-6 shrink-0"
            />
            <span>
              <span className="mr-2 rounded-md bg-brand-sky px-2 py-0.5 text-[13px] font-bold text-info-text">필수</span>
              사진·개인정보 확인 — 사진 촬영·공유는 기관의 보호자 동의 및 개인정보 운영 기준을 따릅니다.
            </span>
          </label>
          {alreadyConfirmed ? (
            <>
              {/* 이미 기록된 확인: 비활성 체크박스는 전송되지 않으므로 값을 함께 보낸다 */}
              <input type="hidden" name="safetyConfirmed" value="on" />
              <input type="hidden" name="privacyConfirmed" value="on" />
              <p className="text-[15px] text-success-text">필수 확인이 기록되어 있습니다.</p>
            </>
          ) : null}
        </div>
      </fieldset>

      <section className="rounded-2xl border border-hairline bg-white p-5" aria-labelledby="photo-note-title">
        <h2 id="photo-note-title" className="text-[17px] font-bold">
          오늘 사진을 공유하지 않는 원아
        </h2>
        {photoNotSharedNames.length === 0 ? (
          <p className="mt-2 text-[16px] text-ink-muted">해당 원아가 없습니다.</p>
        ) : (
          <p className="mt-2 text-[16px] leading-relaxed">
            {photoNotSharedNames.join(" · ")}
            <span className="mt-1 block text-[14px] text-ink-muted">
              사진 공유 기록이 &quot;공유 가능으로 기록됨&quot;이 아닌 원아입니다.
            </span>
          </p>
        )}
      </section>

      {blockedReason ? <p className={noticeWarning}>{blockedReason}</p> : null}

      {state.phase === "error" && state.message ? (
        <p role="alert" className={noticeDanger}>
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-5 border-t border-hairline bg-white/95 px-5 py-4">
        <div className="flex flex-wrap items-center justify-end gap-4">
          {remaining > 0 ? (
            <p aria-live="polite" className="text-[16px] font-semibold text-warning-text">
              필수 확인 {remaining}개 남음
            </p>
          ) : null}
          <button type="submit" disabled={disabled} className={classModeButtonPrimary}>
            {pending ? "시작하는 중…" : "수업 시작"}
          </button>
        </div>
      </div>
    </form>
  );
}
