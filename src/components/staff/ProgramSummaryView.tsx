import Link from "next/link";
import { formatDotDate } from "@/lib/entitlement/labels";
import type { ProgramSummaryData } from "@/lib/staff/program-summary-queries";

/**
 * "8주 기록 모아보기" 화면 (DEC-069 · DEC-104).
 * 평가 표현 · 점수 · 비교 없음. 빈 주는 사유 없이 비워 둔다.
 */
export function ProgramSummaryView({ data, weeklyHrefBase, orgQuery }: { data: ProgramSummaryData; weeklyHrefBase: string; orgQuery: string }) {
  return (
    <div>
      <h1 className="text-[24px] font-bold text-ink">8주 기록 모아보기 · {data.childName ?? "이름 없음"}</h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        {data.className ?? ""} · {data.weekFrom}~{data.weekTo}주 · 완료된 주간 리포트를 모아 보여 줍니다.
      </p>
      {data.inContract ? null : (
        <p role="note" className="mt-3 rounded-xl border border-hairline bg-surface-soft px-4 py-3 text-[14px] text-ink-muted">
          {data.contractWeekFrom !== null && data.contractWeekTo !== null
            ? `현재 계약 주차 범위(${data.contractWeekFrom}~${data.contractWeekTo}주) 밖의 기록입니다. 이전 기록을 그대로 보여 줍니다.`
            : "현재 유효한 계약 주차 범위를 확인할 수 없어 1주차부터 8주 단위로 나눈 구간을 보여 줍니다."}
        </p>
      )}

      <ol className="mt-6 flex flex-col gap-3">
        {data.weeks.map((week) => {
          const range = week.dateFrom
            ? week.dateTo && week.dateTo !== week.dateFrom
              ? `${formatDotDate(week.dateFrom)} ~ ${formatDotDate(week.dateTo)}`
              : formatDotDate(week.dateFrom)
            : null;
          return (
            <li key={week.weekNo} className="rounded-2xl border border-hairline bg-white p-5">
              <p className="text-[15px] font-semibold text-ink">
                Week {week.weekNo}
                {range ? <span className="ml-2 font-normal text-ink-muted">{range}</span> : null}
              </p>
              {week.report ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                  {week.report.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 짧은 수명의 서명 URL
                    <img
                      src={week.report.photoUrl}
                      alt={`Week ${week.weekNo} 대표 사진`}
                      className="h-28 w-28 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {week.report.topic ? <p className="text-[16px] font-semibold text-ink">{week.report.topic}</p> : null}
                    {week.report.quoteChoice ? (
                      <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{week.report.quoteChoice}</p>
                    ) : null}
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-ink-muted">
                      {week.report.revised ? <span>수정본</span> : null}
                      {week.report.hidden ? <span>학부모 화면에서 숨김</span> : null}
                      <Link href={`${weeklyHrefBase}/${week.report.id}${orgQuery}`} className="font-semibold text-brand-navy underline">
                        주간 리포트 보기
                      </Link>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[15px] text-ink-muted">완료된 주간 리포트가 없습니다.</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
