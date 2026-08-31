"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { saveObservationAction } from "@/lib/staff/observation-actions";
import {
  MAX_CHILD_VOICE,
  MAX_DOMAIN_CODES,
  MAX_TEACHER_NOTE,
  OBSERVATION_FORM_INITIAL_STATE,
  OBSERVATION_RECORD_STATUS_LABELS,
  type ObservationDomain,
  type ObservationFormState,
  type ObservationRecordStatus,
  type StaffObservationChild,
} from "@/types/staff-observation";

interface ObservationChildFormProps {
  sessionId: string;
  child: StaffObservationChild;
  /** 사용 중지된 영역까지 전부. code → label을 풀고 active 여부를 판정한다. */
  domains: ObservationDomain[];
}

/**
 * 이 form이 알고 있는 "서버에 저장된 값".
 *
 * token이 곧 낙관적 동시성 토큰(p_expected_updated_at)이다.
 * null이면 아직 기록이 없다는 뜻이고, RPC에는 null이 넘어간다.
 */
interface SavedSnapshot {
  token: string | null;
  recordStatus: ObservationRecordStatus | null;
  childVoice: string | null;
  teacherNote: string | null;
  /** 저장된 영역 전체(사용 중지 영역 포함) */
  codes: string[];
}

interface DraftValues {
  voice: string;
  note: string;
  /** 화면에서 토글 가능한(active) 영역만 담는다 */
  activeCodes: string[];
}

function snapshotFromProps(
  child: StaffObservationChild,
): SavedSnapshot {
  return {
    // ★ DB 문자열 그대로. Date로 바꿨다 되돌리면 마이크로초가 잘려 영구 stale이 된다.
    token: child.updatedAt,
    recordStatus: child.recordStatus,
    childVoice: child.childVoice,
    teacherNote: child.teacherNote,
    codes: child.domainCodes,
  };
}

function draftFromSnapshot(
  snapshot: SavedSnapshot,
  activeCodeSet: ReadonlySet<string>,
): DraftValues {
  return {
    voice: snapshot.childVoice ?? "",
    note: snapshot.teacherNote ?? "",
    activeCodes: snapshot.codes.filter((code) =>
      activeCodeSet.has(code),
    ),
  };
}

function sameCodes(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;

  const left = [...a].sort();
  const right = [...b].sort();

  return left.every((code, index) => code === right[index]);
}

/** PostgreSQL char_length와 같은 기준(code point)으로 센다. */
function characterCount(value: string): number {
  return [...value].length;
}

/**
 * SERVICE-08B-2 — 원아 1명 전용 관찰기록 form.
 *
 * 저장 단위는 원아 한 명이다. 여러 원아를 한 버튼으로 묶지 않는다 —
 * 낙관적 동시성 토큰(updated_at)이 원아마다 다르기 때문이다.
 *
 * 저장 경로는 saveObservationAction → save_class_session_observation_atomic RPC 하나뿐이다.
 *
 * ★ 이 화면은 아동을 평가하지 않는다. 점수·등급·발달단계 입력이 없다.
 */
export function ObservationChildForm({
  sessionId,
  child,
  domains,
}: ObservationChildFormProps) {
  const router = useRouter();

  const activeDomains = domains.filter(
    (domain) => domain.isActive,
  );

  const activeCodeSet = new Set(
    activeDomains.map((domain) => domain.code),
  );

  const domainByCode = new Map(
    domains.map((domain) => [domain.code, domain]),
  );

  const [saved, setSaved] = useState<SavedSnapshot>(() =>
    snapshotFromProps(child),
  );

  const [draft, setDraft] = useState<DraftValues>(() =>
    draftFromSnapshot(
      snapshotFromProps(child),
      activeCodeSet,
    ),
  );

  /**
   * ★ 사용자가 손대지 않은 form만 서버 값으로 다시 맞춘다.
   *
   *   저장에 성공하면 Server Action이 refresh()를 부르고,
   *   이 화면의 모든 원아 카드가 새 props를 받는다.
   *   그때 무조건 덮어쓰면 옆 원아에 작성 중이던 문단이 사라진다.
   *
   *   그래서 "저장하지 않은 편집이 없을 때"만 동기화한다.
   *   편집 중인 form은 그대로 두고, 토큰이 낡았다면 저장 시점에 OB004로 잡힌다.
   *
   *   렌더 중 setState는 React가 권장하는 prop 동기화 패턴이라
   *   useEffect를 쓰지 않는다(AttendanceEditor와 같은 방식).
   */
  const serverSignature = JSON.stringify([
    child.observationId,
    child.updatedAt,
    child.recordStatus,
    child.domainCodes,
    child.childVoice,
    child.teacherNote,
  ]);

  const [syncedSignature, setSyncedSignature] =
    useState(serverSignature);

  const savedActiveCodes = saved.codes.filter((code) =>
    activeCodeSet.has(code),
  );

  const isDirty =
    draft.voice !== (saved.childVoice ?? "") ||
    draft.note !== (saved.teacherNote ?? "") ||
    !sameCodes(draft.activeCodes, savedActiveCodes);

  const [state, formAction, isPending] = useActionState(
    async (
      prevState: ObservationFormState,
      formData: FormData,
    ) => {
      const result = await saveObservationAction(
        prevState,
        formData,
      );

      /**
       * ★ 성공하면 RPC가 방금 발급한 토큰으로 갈아끼운다.
       *   refresh() 결과를 기다리지 않고 바로 연속 저장이 된다.
       */
      if (result.phase === "success" && result.saved) {
        const next: SavedSnapshot = {
          token: result.saved.updatedAt,
          recordStatus: result.saved.recordStatus,
          childVoice: result.saved.childVoice,
          teacherNote: result.saved.teacherNote,
          codes: result.saved.domainCodes,
        };

        setSaved(next);
        setDraft(
          draftFromSnapshot(next, activeCodeSet),
        );
      }

      return result;
    },
    OBSERVATION_FORM_INITIAL_STATE,
  );

  if (
    syncedSignature !== serverSignature &&
    !isDirty &&
    !isPending
  ) {
    const next = snapshotFromProps(child);

    setSyncedSignature(serverSignature);
    setSaved(next);
    setDraft(draftFromSnapshot(next, activeCodeSet));
  }

  /**
   * 안내 문구를 사용자가 명시적으로 지운 시점을 기억한다.
   * useActionState의 state는 직접 비울 수 없어 "무시할 state"를 들고 있는다.
   */
  const [dismissedState, setDismissedState] =
    useState<ObservationFormState | null>(null);

  const noticeVisible =
    state.message !== null && state !== dismissedState;

  const isStale = state.phase === "stale";

  /**
   * ★ 자동 reload는 하지 않는다. 사용자가 눌러야만 실행된다.
   *
   *   stale은 "남이 먼저 저장했다"는 뜻이므로 화면이 마음대로
   *   최신 값을 가져와 입력 중인 문단을 지워 버리면 안 된다.
   *   이 버튼을 누르면 입력 중인 내용이 사라진다는 것을 문구로 먼저 알린다.
   */
  function reloadLatest() {
    const next = snapshotFromProps(child);

    setSaved(next);
    setDraft(draftFromSnapshot(next, activeCodeSet));
    setSyncedSignature(serverSignature);
    setDismissedState(state);

    router.refresh();
  }

  const preservedInactiveCodes = saved.codes.filter(
    (code) => !activeCodeSet.has(code),
  );

  /**
   * 사용 중지 영역이 자리를 차지하므로 새로 고를 수 있는 수는 그만큼 줄어든다.
   * (현재 활성 영역은 5개라 실제로 걸릴 일은 거의 없지만, RPC 상한과 어긋나지 않게 둔다.)
   */
  const remainingSlots =
    MAX_DOMAIN_CODES - preservedInactiveCodes.length;

  const voiceCount = characterCount(draft.voice);
  const noteCount = characterCount(draft.note);

  const hasContent =
    draft.voice.trim() !== "" || draft.note.trim() !== "";

  const childLabel =
    child.childName ?? "이름 확인 불가 원아";

  /**
   * ★ 저장 중에는 checkbox를 disabled로 만들지 않고 여기서 막는다.
   *
   *   disabled된 form control은 FormData에 아예 담기지 않는다.
   *   체크돼 있던 관찰영역을 저장 중에 disabled 처리하면
   *   그 요청의 domainCodes가 통째로 비어 전부 해제된 것처럼 저장된다.
   *   중복 submit 방지는 submit 버튼의 disabled가 담당한다.
   */
  function toggleDomain(code: string) {
    if (isPending) return;

    setDraft((current) => {
      if (current.activeCodes.includes(code)) {
        return {
          ...current,
          activeCodes: current.activeCodes.filter(
            (value) => value !== code,
          ),
        };
      }

      if (current.activeCodes.length >= remainingSlots) {
        return current;
      }

      return {
        ...current,
        activeCodes: [...current.activeCodes, code],
      };
    });
  }

  const fieldPrefix = `observation-${child.childId}`;

  return (
    <form action={formAction} className="mt-3">
      <input
        type="hidden"
        name="sessionId"
        value={sessionId}
      />

      <input
        type="hidden"
        name="childId"
        value={child.childId}
      />

      {/*
        ★ 낙관적 동시성 토큰. 서버가 준 문자열을 그대로 되돌려 보낸다.
          신규 작성이면 빈 문자열이고 Server Action이 null로 바꿔 넘긴다.
      */}
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={saved.token ?? ""}
      />

      <div className="flex flex-col gap-4">
        <div>
          <p
            className="text-[11px] font-bold text-navy/55"
            id={`${fieldPrefix}-domains-label`}
          >
            관찰영역
          </p>

          <div
            role="group"
            aria-labelledby={`${fieldPrefix}-domains-label`}
            aria-label={`${childLabel} 관찰영역 선택`}
            className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
          >
            {activeDomains.map((domain) => {
              const checked = draft.activeCodes.includes(
                domain.code,
              );

              const atLimit =
                !checked &&
                draft.activeCodes.length >= remainingSlots;

              return (
                <label
                  key={domain.code}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    checked
                      ? "border-trust-blue/50 bg-trust-blue/10"
                      : "border-navy/15 bg-white hover:border-trust-blue/30 hover:bg-trust-blue/5"
                  } ${
                    atLimit || isPending
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name="domainCodes"
                    value={domain.code}
                    checked={checked}
                    /*
                      atLimit은 "아직 선택되지 않은" 항목에만 붙는다.
                      선택된 항목은 어떤 경우에도 disabled로 만들지 않는다 —
                      disabled면 FormData에서 빠져 저장 시 해제되어 버린다.
                    */
                    disabled={atLimit}
                    onChange={() =>
                      toggleDomain(domain.code)
                    }
                    className="size-4 shrink-0 accent-[color:var(--color-navy,#1f2a44)]"
                  />

                  <span className="text-[13px] font-semibold text-navy">
                    {domain.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/*
            ★ 사용 중지된 영역은 화면에서 고를 수 없지만, 이미 붙어 있던 것은
              저장해도 그대로 남는다. 보존은 Server Action이 DB에서 다시 읽어
              최종 집합에 되돌리는 방식으로 이뤄진다 — 이 자리에는 체크박스도,
              hidden input도 두지 않는다(Client가 보존을 책임지지 않는다).
              새로 추가하는 경로는 어디에도 없다.
          */}
          {preservedInactiveCodes.length > 0 ? (
            <div className="mt-2">
              <ul className="flex flex-wrap gap-1.5">
                {preservedInactiveCodes.map((code) => (
                  <li
                    key={code}
                    className="rounded-md border border-navy/15 bg-navy/5 px-2 py-1 text-[12px] font-semibold text-navy/70"
                  >
                    {domainByCode.get(code)?.label ?? code}
                    <span className="ml-1 font-normal text-navy/45">
                      (사용 중지 · 기존 기록)
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-1 text-[11px] leading-relaxed text-navy/45">
                더 이상 사용하지 않는 관찰영역입니다. 저장해도 기존 기록 그대로 유지됩니다.
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={`${fieldPrefix}-voice`}
              className="text-[11px] font-bold text-navy/55"
            >
              아이의 말
            </label>

            <span
              className="text-[11px] tabular-nums text-navy/45"
              aria-hidden="true"
            >
              {voiceCount.toLocaleString("ko-KR")} /{" "}
              {MAX_CHILD_VOICE.toLocaleString("ko-KR")}
            </span>
          </div>

          <textarea
            id={`${fieldPrefix}-voice`}
            name="childVoice"
            value={draft.voice}
            onChange={(event) => {
              // 값은 updater 밖에서 먼저 읽는다.
              // updater는 렌더 단계에서 나중에(또는 두 번) 실행될 수 있어
              // 그 안에서 event.target.value를 읽으면 그 시점의 DOM 값에 의존하게 된다.
              const value = event.target.value;

              setDraft((current) => ({
                ...current,
                voice: value,
              }));
            }}
            /*
              ★ disabled가 아니라 readOnly다.
                disabled된 필드는 FormData에 담기지 않아, 저장 중 상태로 넘어간
                요청에서 childVoice 키 자체가 사라지고 서버는 ""로 읽어 null로 저장한다.
                readOnly는 입력만 막고 값은 그대로 전송된다.
                중복 submit 방지는 아래 submit 버튼의 disabled가 담당한다.
            */
            readOnly={isPending}
            maxLength={MAX_CHILD_VOICE}
            rows={3}
            placeholder="아이가 한 말을 그대로 적어주세요."
            /*
              scroll-mt-28 — 입력칸에 포커스가 가면 브라우저가 그 칸을 화면 안으로
              스크롤한다. StaffShell 헤더(상단 행 + nav, 약 107px)가 sticky라
              여백이 없으면 방금 누른 입력칸이 nav 아래로 들어간다.
            */
            className="mt-1.5 min-h-24 w-full scroll-mt-28 rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy placeholder:text-navy/30 read-only:cursor-not-allowed read-only:opacity-60 focus:border-trust-blue/60 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={`${fieldPrefix}-note`}
              className="text-[11px] font-bold text-navy/55"
            >
              교사 관찰
            </label>

            <span
              className="text-[11px] tabular-nums text-navy/45"
              aria-hidden="true"
            >
              {noteCount.toLocaleString("ko-KR")} /{" "}
              {MAX_TEACHER_NOTE.toLocaleString("ko-KR")}
            </span>
          </div>

          <textarea
            id={`${fieldPrefix}-note`}
            name="teacherNote"
            value={draft.note}
            onChange={(event) => {
              const value = event.target.value;

              setDraft((current) => ({
                ...current,
                note: value,
              }));
            }}
            /* childVoice와 같은 이유 — disabled가 아니라 readOnly다. */
            readOnly={isPending}
            maxLength={MAX_TEACHER_NOTE}
            rows={4}
            placeholder="관찰한 장면을 사실 그대로 적어주세요."
            className="mt-1.5 min-h-32 w-full scroll-mt-28 rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy placeholder:text-navy/30 read-only:cursor-not-allowed read-only:opacity-60 focus:border-trust-blue/60 focus:outline-none"
          />
        </div>

        {noticeVisible ? (
          <div
            role={
              state.phase === "success" ? "status" : "alert"
            }
            aria-live="polite"
            className={`scroll-mt-28 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed ${
              state.phase === "success"
                ? "border-soft-green/50 bg-soft-green/15 text-navy"
                : isStale
                  ? "border-yellow/50 bg-yellow-soft text-navy"
                  : "border-soft-coral/50 bg-soft-coral/10 text-navy"
            }`}
          >
            <p>{state.message}</p>

            {isStale ? (
              <div className="mt-2">
                <p className="text-[12px] leading-relaxed text-navy/60">
                  아래 버튼을 누르면 저장된 최신 기록을 다시 불러옵니다.
                  지금 입력 중인 내용은 사라지니, 필요하면 먼저 따로 복사해두세요.
                </p>

                <button
                  type="button"
                  onClick={reloadLatest}
                  disabled={isPending}
                  className="mt-2 min-h-11 rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  최신 기록 다시 불러오기
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-navy/50">
            {saved.recordStatus
              ? `저장됨 · ${OBSERVATION_RECORD_STATUS_LABELS[saved.recordStatus]}`
              : "아직 저장된 기록이 없습니다."}
            {isDirty ? " · 저장하지 않은 변경이 있습니다." : ""}
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              name="recordStatus"
              value="draft"
              disabled={isPending}
              className="min-h-12 flex-1 rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
            >
              {isPending ? "저장 중..." : "임시저장"}
            </button>

            {/*
              내용이 하나도 없으면 완료 저장은 DB CHECK와 RPC(OB001)가 거부한다.
              여기서 미리 막아 헛된 왕복을 줄일 뿐, 최종 판정은 서버다.
            */}
            <button
              type="submit"
              name="recordStatus"
              value="complete"
              disabled={isPending || !hasContent}
              title={
                hasContent
                  ? undefined
                  : "아이의 말 또는 교사 관찰 중 하나는 입력해야 합니다."
              }
              className="min-h-12 flex-1 rounded-lg bg-navy px-4 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
            >
              {isPending ? "저장 중..." : "작성완료"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
