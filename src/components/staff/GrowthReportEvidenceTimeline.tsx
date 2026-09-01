import type { GrowthReportSource } from "@/types/staff-growth-report";

interface GrowthReportEvidenceTimelineProps {
  sources: GrowthReportSource[];
}

/**
 * SERVICE-11A — 근거 타임라인.
 *
 * ★ 여기 보이는 문장은 전부 "교사가 검토·확정한" 것이다.
 *   AI 원문(generated_text)은 리포트에 저장되지도, 표시되지도 않는다.
 *   교사가 읽지 않은 문장이 성장 리포트의 근거로 보이면 이 제품의 전제가 무너진다.
 *
 * ★ 이 값들은 근거 채택 시점의 스냅샷이다.
 *   원본 관찰기록이나 차시 제목이 나중에 바뀌어도 여기 문장은 변하지 않는다.
 *   "그때 무엇을 근거로 이렇게 썼는가"를 남기는 것이 이 화면의 목적이다.
 *
 * ★ 사진은 표시하지 않는다. 활동사진은 별도 private 자산으로만 보호된다.
 */
export function GrowthReportEvidenceTimeline({
  sources,
}: GrowthReportEvidenceTimelineProps) {
  return (
    <section className="mt-6 scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-navy">근거 관찰기록</h2>
        <span className="text-[12px] tabular-nums text-navy/45">
          {sources.length.toLocaleString("ko-KR")}건
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-navy/45">
        교사가 검토 완료한 기록만 근거로 사용합니다. 채택 시점의 내용이 그대로
        보관됩니다.
      </p>

      {sources.length === 0 ? (
        <p className="mt-3 rounded-xl border border-navy/10 bg-white px-4 py-8 text-center text-[13px] leading-relaxed text-navy/50">
          아직 근거로 모인 관찰기록이 없습니다.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {sources.map((source) => (
            <li
              key={source.id}
              className="scroll-mt-28 rounded-xl border border-navy/10 bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12px] tabular-nums font-semibold text-navy/55">
                  {source.observedOn
                    ? source.observedOn.replaceAll("-", ".")
                    : "날짜 정보 없음"}
                  {source.lessonOrder ? ` · ${source.lessonOrder}` : ""}
                </p>
              </div>

              <p className="mt-0.5 break-words text-[14px] font-bold leading-snug text-navy">
                {source.lessonTitle ?? "차시 정보 없음"}
              </p>

              {source.domainLabels.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {source.domainLabels.map((label) => (
                    <li
                      key={label}
                      className="rounded-md border border-trust-blue/30 bg-trust-blue/5 px-2 py-1 text-[12px] font-semibold text-navy"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex flex-col gap-3">
                {source.childVoice ? (
                  <div>
                    <p className="text-[11px] font-bold text-navy/55">
                      아이의 말
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-navy">
                      {source.childVoice}
                    </p>
                  </div>
                ) : null}

                {source.teacherNote ? (
                  <div>
                    <p className="text-[11px] font-bold text-navy/55">
                      교사 관찰
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-navy">
                      {source.teacherNote}
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="text-[11px] font-bold text-navy/55">
                    교사 검토 완료 기록
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-soft-green/40 bg-soft-green/10 px-3 py-2.5 text-[13px] leading-relaxed text-navy">
                    {source.reviewedText}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
