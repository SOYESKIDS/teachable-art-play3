import type { GrowthReportAttendanceContext } from "@/types/staff-growth-report";

interface GrowthReportAttendanceSummaryProps {
  attendance: GrowthReportAttendanceContext;
}

/**
 * SERVICE-11A — 기간 출결 맥락.
 *
 * ★ 이것은 평가 지표가 아니다.
 *   "그 기간에 몇 번 참여했는가"라는 사실만 보여 준다.
 *   비율 · 달성도 · 등급 · 색 경고로 가공하지 않는다.
 *   출석률(%)을 만들지 않는 것도 같은 이유다 — 결석에는 여러 사정이 있고,
 *   숫자 하나로 요약되는 순간 그것이 아이에 대한 평가처럼 읽힌다.
 *
 * ★ 이 숫자는 서버가 계산한 값이다.
 *   DB trigger가 class_session_attendance에서 직접 집계하므로
 *   화면이나 Client가 만든 숫자가 아니다.
 */
export function GrowthReportAttendanceSummary({
  attendance,
}: GrowthReportAttendanceSummaryProps) {
  const items = [
    { key: "present", label: "출석", value: attendance.presentCount },
    { key: "late", label: "지각", value: attendance.lateCount },
    { key: "left_early", label: "조퇴", value: attendance.leftEarlyCount },
    { key: "absent", label: "결석", value: attendance.absentCount },
  ] as const;

  return (
    <section className="mt-5 scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-navy">기간 출결</h2>
        <span className="text-[12px] tabular-nums text-navy/45">
          기간 내 수업 {attendance.sessionCount.toLocaleString("ko-KR")}회
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-navy/10 bg-white px-2 py-2 text-center"
          >
            <dt className="text-[12px] font-semibold text-navy/55">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-navy">
              {item.value.toLocaleString("ko-KR")}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-1.5 text-[11px] leading-relaxed text-navy/45">
        기록된 출결을 그대로 센 숫자입니다. 평가 점수가 아닙니다.
      </p>
    </section>
  );
}
