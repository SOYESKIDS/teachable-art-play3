/**
 * 이전 형식(기간형) 성장 리포트 본문 — 읽기 전용 (PHASE 10B · M5 앱 준비).
 *
 * M5 는 legacy 성장 리포트 쓰기(생성 · 저장 · AI 초안)를 회수하고 조회는 유지한다 (DEC-041 · DEC-091).
 * 그래서 교사 · 원장 모두 이전 리포트는 이 컴포넌트로 읽기만 한다. 새 기록은 Weekly 리포트로 쓴다.
 */
export function GrowthReportReadOnlyContent({
  growthChanges,
  observationSummary,
  nextSupport,
}: {
  growthChanges: string | null;
  observationSummary: string | null;
  nextSupport: string | null;
}) {
  return (
    <section className="mt-6 scroll-mt-28">
      <h2 className="text-body-sm font-bold text-navy">리포트 내용</h2>

      <div className="mt-3 flex flex-col gap-4">
        <ReadOnlyBlock label="성장 변화" value={growthChanges} />
        <ReadOnlyBlock label="관찰 요약" value={observationSummary} />
        <ReadOnlyBlock label="다음 지원 방향" value={nextSupport} />
      </div>
    </section>
  );
}

function ReadOnlyBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-micro font-bold text-ink-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-line bg-white px-3 py-2.5 text-caption leading-relaxed text-navy">
        {value ?? "작성된 내용이 없습니다."}
      </p>
    </div>
  );
}
