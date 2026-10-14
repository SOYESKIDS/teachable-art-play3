import Link from "next/link";
import {
  SESSION_STATUS_LABEL,
  formatSessionDate,
  nextActionFor,
  type WeekSessionItem,
} from "@/lib/weeks/week-session-queries";

/**
 * 주차 화면 위에 붙는 회차 띠 — 반·날짜별로 **따로** 보여 준다.
 *
 * ── 왜 합치지 않는가 ─────────────────────────────────────────────
 *
 * 같은 17주차라도 햇살반 목요일과 바다반 금요일은 다른 수업이다. 진행 상태를
 * 하나로 합쳐 "17주차 진행 중"이라고 쓰면 교사가 어느 반 이야기인지 모른다.
 * 그래서 회차를 한 줄씩 늘어놓고, 각 줄이 자기 상태와 자기 다음 행동을 갖는다.
 *
 * ── 선택한 반을 기억한다 ─────────────────────────────────────────
 *
 * `selectedClassId` 가 있으면 그 반을 먼저 세우고 나머지는 접어 둔다. 담당 반이
 * 여럿인 교사가 매번 자기 반을 찾지 않도록 한다.
 *
 * ── 모르는 것을 적지 않는다 ──────────────────────────────────────
 *
 * ★ 준비 체크 몇 개 · 결과 보고 제출 여부는 아직 저장되는 곳이 없다. 그래서
 *   「준비 2/3」 같은 숫자를 쓰지 않는다. 회차가 실제로 갖고 있는 상태만 쓴다.
 */
export function WeekSessionBand({
  sessions,
  ok,
  orgQuery,
  weekNo,
  selectedClassId,
  actorRole = "teacher",
  weekPath,
}: {
  sessions: WeekSessionItem[];
  ok: boolean;
  /** `org=...` 형태 */
  orgQuery: string;
  weekNo: number;
  selectedClassId?: string;
  actorRole?: "teacher" | "director";
  weekPath?: string;
}) {
  if (!ok) {
    return (
      <section className="rounded-[10px] border border-danger-border bg-danger-soft px-4 py-3">
        <p className="text-[14px] text-danger">
          이 주차의 수업 회차를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  if (sessions.length === 0) {
    return (
      <section className="rounded-[10px] border border-rule bg-paper px-4 py-4">
        <h2 className="text-[15px] font-bold text-forest">{weekNo}주차 수업 회차가 없습니다</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-ink">
          회차는 반과 날짜에 묶인 실제 수업입니다. 원장님이 반에 프로그램을 배정하고 일정을
          잡으면 여기에 나타납니다. 그때까지 아래 수업 내용은 미리 읽어 두실 수 있습니다.
        </p>
      </section>
    );
  }

  // 선택한 반을 먼저 세운다. 나머지 순서는 날짜 그대로 둔다.
  const ordered = selectedClassId
    ? [
        ...sessions.filter((s) => s.classId === selectedClassId),
        ...sessions.filter((s) => s.classId !== selectedClassId),
      ]
    : sessions;

  return (
    <section aria-labelledby="week-sessions" className="rounded-[10px] border border-rule bg-white">
      <div className="border-b border-rule-soft px-4 py-3">
        <h2 id="week-sessions" className="text-[15px] font-bold text-forest">
          {weekNo}주차 수업 회차 {sessions.length}건
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-ink">
          반과 날짜마다 따로 진행됩니다. 회차를 골라 들어가면 그 반의 수업으로 이어집니다.
        </p>
      </div>

      <ul className="flex flex-col">
        {ordered.map((session) => {
          const action = nextActionFor(session.status, actorRole);
          const isSelected = selectedClassId === session.classId;

          return (
            <li
              key={session.sessionId}
              className={`flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-4 py-3 last:border-b-0 ${
                isSelected ? "bg-sprout/40" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-forest">
                  {session.className ?? "반 이름 없음"}
                  {isSelected ? (
                    <span className="ml-2 text-[12px] font-normal text-leaf">선택한 반</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[13px] tabular-nums text-muted-ink">
                  {formatSessionDate(session.scheduledDate)} ·{" "}
                  {SESSION_STATUS_LABEL[session.status]}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {action ? (
                  <Link
                    href={action.href(session.sessionId, orgQuery)}
                    className="inline-flex min-h-11 items-center rounded-[10px] bg-forest px-4 text-[14px] font-semibold text-white"
                  >
                    {action.label}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-[14px] text-muted-ink">
                    취소된 회차
                  </span>
                )}
                <Link
                  href={`${weekPath ?? `/teacher/weeks/${weekNo}`}?${orgQuery}&class=${session.classId}&tab=prep`}
                  className="inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
                >
                  이 반으로 보기
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
