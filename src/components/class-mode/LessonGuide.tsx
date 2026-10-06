import { LESSON_SECTION_LABELS, type LessonSectionCode } from "@/lib/curriculum/lesson-sections";

/**
 * BEFORE — 수업 안내 (차시 원본 섹션 · 읽기 전용).
 *
 * ★ 교사가 수업 직전에 보는 순서로 놓는다 (원본 번호 순서가 아니다).
 *   오늘의 목표 → 준비물 → 공간 → 안전 → 시간표 → 진행안 → 마무리 대화
 *   → 관찰 포인트 → 가정연계 → 이런 상황이면
 * ★ 한 번에 다 펼치지 않는다 (<details>). 첫 칸(오늘의 목표)만 열어 둔다.
 * ★ 태블릿에서 멀리서도 누르도록 요약 줄은 56px · 본문은 큰 글자 + 줄바꿈 유지.
 * ★ 본문이 없는 섹션은 그리지 않는다 — 비어 있는 칸을 만들어 보이지 않는다.
 */
const GUIDE_ORDER: { code: LessonSectionCode; label: string }[] = [
  { code: "s15", label: "오늘의 목표" },
  { code: "s4a", label: "준비물" },
  { code: "s4b", label: "공간" },
  { code: "s4c", label: "안전" },
  { code: "s5", label: "권장 시간표" },
  { code: "s6", label: "단계별 진행 · 발문" },
  { code: "s11", label: "마무리 대화" },
  { code: "s12", label: "관찰 포인트" },
  { code: "s13", label: "가정연계" },
  { code: "s14", label: "이런 상황이면" },
];

export function LessonGuide({ sections }: { sections: Record<string, string> }) {
  const items = GUIDE_ORDER.filter(({ code }) => Boolean(sections[code]?.trim()));

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="lesson-guide-title" className="mb-6">
      <h2 id="lesson-guide-title" className="text-title-lg font-bold text-ink">
        수업 안내
      </h2>
      <p className="mt-1 text-body text-ink-muted">필요한 항목을 눌러 펼쳐 보세요.</p>

      <div className="mt-4 flex flex-col gap-2">
        {items.map(({ code, label }, index) => (
          <details
            key={code}
            open={index === 0}
            className="group rounded-2xl border border-hairline bg-white open:border-line-strong"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block text-title-sm font-bold text-ink">{label}</span>
                <span className="block text-label text-ink-muted">{LESSON_SECTION_LABELS[code]}</span>
              </span>
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="border-t border-hairline px-5 pb-5 pt-4">
              <p className="max-w-[72ch] whitespace-pre-line break-keep text-body-lg leading-relaxed text-ink">
                {sections[code]}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
