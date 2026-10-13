import Link from "next/link";
import type { SessionReportData } from "@/lib/staff/session-report-queries";
import { SESSION_STATUS_LABEL, formatSessionDate } from "@/lib/weeks/week-session-queries";
import type { ClassSessionStatus } from "@/types/class-session";

/**
 * 결과 보고 4단계 — 진행 확인 → 출석 → 관찰 보충 → 수업 메모.
 *
 * ── 앞 세 단계는 확인이지 입력이 아니다 ──────────────────────────
 *
 * 회차 상태 · 출결 · 관찰은 이미 각자의 화면에서 저장된다. 여기서는 그 값을
 * 불러와 **맞는지 확인**하고, 빠진 것이 있으면 그 화면으로 보낸다. 같은 값을
 * 두 번 입력하게 하지 않는다.
 *
 * ── 4단계는 아직 저장되지 않는다 ─────────────────────────────────
 *
 * ★ 수업 메모와 제출은 저장될 테이블이 아직 없다. 그래서 **입력란을 열어 두지
 *   않는다.** 글을 쓰게 해 놓고 저장하지 않으면 교사가 쓴 내용을 잃는다.
 *   무엇이 필요한지만 적는다.
 * ★ 「제출」 버튼을 만들어 두지 않는다. 눌러도 아무 일이 없는 버튼은 성공으로
 *   읽힌다.
 *
 * ── 모르는 값을 0 으로 쓰지 않는다 ───────────────────────────────
 *
 * ★ 출결 미입력과 0명 참석은 다르다. 관찰 조회 실패와 관찰 0건도 다르다.
 *   각각 다른 문구로 적는다.
 */

const stepBox = "rounded-[10px] border px-4 py-4";

function StepHeader({
  no,
  title,
  state,
}: {
  no: number;
  title: string;
  state: "done" | "todo" | "blocked";
}) {
  const label =
    state === "done" ? "확인됨" : state === "todo" ? "확인 필요" : "연결 대기";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-[16px] font-bold text-forest">
        <span className="tabular-nums text-leaf">{no}</span> {title}
      </h3>
      <span
        className={`rounded-[4px] px-2 py-0.5 text-[12px] font-semibold ${
          state === "done"
            ? "bg-sprout text-leaf"
            : state === "todo"
              ? "bg-crayon-soft text-forest"
              : "border border-rule text-muted-ink"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function SessionReportWizard({
  data,
  orgQuery,
}: {
  data: SessionReportData;
  orgQuery: string;
}) {
  const attendance = data.attendance;
  const observation = data.observation;

  const progressDone = data.status === "completed";
  const attendanceDone = attendance !== null && attendance.unrecordedCount === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. 진행 확인 ── */}
      <section className={`${stepBox} border-rule bg-white`}>
        <StepHeader no={1} title="진행 확인" state={progressDone ? "done" : "todo"} />
        <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-muted-ink">반 · 날짜</dt>
            <dd className="font-semibold text-forest">
              {data.className ?? "반 이름 없음"} · {formatSessionDate(data.scheduledDate)}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-ink">회차 상태</dt>
            <dd className="font-semibold text-forest">
              {SESSION_STATUS_LABEL[data.status as ClassSessionStatus] ?? data.status}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-ink">주차</dt>
            <dd className="font-semibold text-forest">
              {data.weekNo ? `${data.weekNo}주차` : "주차 미지정"}
              {data.weekTitle ? ` · ${data.weekTitle}` : ""}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-ink">
          진행한 활동과 실제 시간은 교실 화면의 진행 기록에서 채워질 값입니다. 아직 그 기록이
          서버에 저장되지 않아 이 자리에 쓸 수 없습니다.
        </p>
      </section>

      {/* ── 2. 출석 ── */}
      <section className={`${stepBox} border-rule bg-white`}>
        <StepHeader no={2} title="출석" state={attendanceDone ? "done" : "todo"} />
        {attendance === null ? (
          <p className="mt-2 text-[14px] text-muted-ink">출결을 불러오지 못했습니다.</p>
        ) : !attendance.recorded ? (
          <p className="mt-2 text-[14px] leading-relaxed text-forest/90">
            아직 출결을 입력하지 않았습니다. 명단 {attendance.rosterCount}명 중 기록된 원아가
            없습니다. (0명 참석과는 다릅니다)
          </p>
        ) : (
          <p className="mt-2 text-[15px] tabular-nums text-forest">
            명단 {attendance.rosterCount}명 · 참석 {attendance.presentCount}명 · 결석{" "}
            {attendance.absentCount}명
            {attendance.unrecordedCount > 0 ? (
              <span className="text-warning-text"> · 미입력 {attendance.unrecordedCount}명</span>
            ) : null}
          </p>
        )}
        <Link
          href={`/teacher/sessions/${data.sessionId}/attendance?${orgQuery}`}
          className="mt-3 inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
        >
          출결 화면 열기
        </Link>
      </section>

      {/* ── 3. 관찰 보충 ── */}
      <section className={`${stepBox} border-rule bg-white`}>
        <StepHeader no={3} title="관찰 보충" state="todo" />
        {observation === null ? (
          <p className="mt-2 text-[14px] text-muted-ink">
            관찰 기록을 불러오지 못했습니다. 건수를 0으로 적지 않습니다.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[15px] tabular-nums text-forest">
              명단 {observation.rosterCount}명 · 기록 {observation.recordedCount}명
              {observation.draftCount > 0 ? ` · 작성 중 ${observation.draftCount}명` : ""}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-ink">
              관찰은 필수가 아닙니다. 미기록 {observation.unrecordedCount}명은 모자란 것이 아니라
              이번에 보지 못했다는 뜻입니다.
            </p>
          </>
        )}
        <Link
          href={`/teacher/sessions/${data.sessionId}/observations?${orgQuery}`}
          className="mt-3 inline-flex min-h-11 items-center rounded-[10px] border border-rule px-4 text-[14px] font-semibold text-forest"
        >
          관찰 화면 열기
        </Link>
      </section>

      {/* ── 4. 수업 메모 ── */}
      <section className={`${stepBox} border-rule bg-paper`}>
        <StepHeader no={4} title="수업 메모" state="blocked" />
        <p className="mt-2 text-[14px] leading-relaxed text-forest/90">
          수업 메모와 결과 보고 제출은 저장될 곳이 아직 없습니다. 입력란을 열어 두면 쓰신 내용이
          사라지므로 열지 않았습니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-ink">
          필요한 것: 회차별 결과 보고 테이블과 제출·재제출 이력. 데이터베이스 연결 단계에서
          만들고 이 화면에 잇습니다.
        </p>
      </section>

      <p
        role="note"
        className="rounded-[10px] border border-warning-border bg-warning-soft px-4 py-3 text-[14px] leading-relaxed text-warning-text"
      >
        이 화면은 아직 <strong>제출 기능이 없습니다</strong>. 위 1~3단계는 이미 저장된 값을 모아
        보여 주는 것이고, 4단계와 제출은 연결되지 않았습니다. 원장님께 전달되는 결과보고서도 아직
        생성되지 않습니다.
      </p>
    </div>
  );
}
