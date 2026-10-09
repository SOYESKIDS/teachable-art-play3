import type { ReactNode } from "react";
import type {
  ProgramCurriculumWeek,
  ProgramJourneyGroup,
  ProgramProduct,
  StarterWeekDetail,
} from "@/data/program-products";
import { programPath } from "@/data/program-products";

/**
 * 8주 여정 — 세 묶음(시작 · 경험 · 표현 → 함께 자람 → 하나의 숲) 안의 주차 카드.
 *
 * ★ 목록에는 네 가지만 둔다: 주차 · 그림책 제목 · 성장키워드 · 한 줄 메시지.
 *   4~7주에는 "8주 숲으로 이어짐" 표시가 붙는다 (원본 cross_week 근거).
 *
 * ★ 상세는 열어야 보인다 (progressive disclosure).
 *   <details>/<summary> 를 쓴다 — 상태 훅 없이 서버에서 그대로 그려지고,
 *   화면 읽기 도구에 펼침 상태가 기본으로 전달되며, 키보드(Enter/Space)로 열린다.
 *
 * ★ 상세 데이터(details)는 /programs/[slug] 서버 페이지만 넘긴다.
 *   원본 manifest 를 클라이언트 번들(홈 오버레이)에 싣지 않기 위해서다.
 *   오버레이에서는 목록만 보이고, 주차 상세는 상세 페이지 링크로 안내한다.
 *
 * ★ 16주 · 24주는 승인된 주차 원본이 없어 curriculum 이 없다.
 *   그때는 curriculumNote 단락이 대신 그려진다.
 */
export function ProductCurriculum({
  product,
  details,
}: {
  product: ProgramProduct;
  /** 주차 상세 (서버 페이지에서만). 없으면 카드는 펼쳐지지 않는다. */
  details?: StarterWeekDetail[];
}) {
  const { curriculum, curriculumNote, theme } = product;

  if (!curriculum) {
    if (!curriculumNote) return null;
    return (
      <section className="border-t border-line pt-10 sm:pt-12">
        <p className={`eyebrow ${theme.accentText}`}>{curriculumNote.eyebrow}</p>
        <h2 className="mt-2 text-h3 font-bold text-navy">{curriculumNote.headline}</h2>
        <div className="mt-5 rounded-xl border border-line bg-white px-5 py-4">
          <StatusBadge label="준비 중" />
          <ul className="mt-3 flex flex-col gap-1.5">
            {curriculumNote.body.map((line) => (
              <li
                key={line}
                className="break-keep text-body-sm leading-relaxed text-navy/75"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const detailByWeek = new Map(details?.map((d) => [d.week, d]) ?? []);
  const groups: readonly ProgramJourneyGroup[] = curriculum.groups ?? [
    {
      key: "all",
      label: curriculum.headline,
      weeks: curriculum.weeks.map((w) => w.week),
      summary: "",
    },
  ];
  const forestWeeks = curriculum.weeks.filter((w) => w.feedsForest);

  return (
    <section className="border-t border-line pt-10 sm:pt-12">
      <p className={`eyebrow ${theme.accentText}`}>{curriculum.eyebrow}</p>
      <h2 className="mt-2 text-h3 font-bold text-navy">{curriculum.headline}</h2>
      <p className="mt-2 max-w-[54ch] break-keep text-body-sm leading-relaxed text-ink-muted">
        {curriculum.subCopy}
      </p>

      <ol className="mt-8 flex flex-col">
        {groups.map((group, groupIndex) => {
          const weeks = curriculum.weeks.filter((w) =>
            group.weeks.includes(w.week),
          );
          const isLast = groupIndex === groups.length - 1;
          const first = group.weeks[0];
          const last = group.weeks[group.weeks.length - 1];

          return (
            <li key={group.key} className="flex flex-col">
              {/* ── 묶음 머리 ─────────────────────────────────────── */}
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums ${
                    isLast
                      ? "bg-navy text-accent-on-dark"
                      : "border-2 border-line-strong bg-white text-navy"
                  }`}
                >
                  {groupIndex + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="break-keep text-title-sm font-bold text-navy">
                    {group.label}
                    <span className="ml-2 text-caption font-semibold tabular-nums text-ink-muted">
                      {first === last ? `${first}주` : `${first}~${last}주`}
                    </span>
                  </h3>
                  {group.summary ? (
                    <p className="mt-1 break-keep text-caption leading-relaxed text-ink-muted">
                      {group.summary}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* ── 묶음 안의 주차 — 왼쪽 세로선이 다음 묶음으로 이어진다 ── */}
              <div
                className={`ml-4 border-l-2 pl-5 pt-4 sm:pl-7 ${
                  isLast ? "border-transparent pb-0" : "border-line pb-6"
                }`}
              >
                <ol className="flex flex-col gap-2">
                  {weeks.map((entry) => (
                    <li key={entry.week}>
                      <WeekCard
                        entry={entry}
                        detail={detailByWeek.get(entry.week)}
                        forestWeeks={entry.finale ? forestWeeks : []}
                        accentText={theme.accentText}
                      />
                    </li>
                  ))}
                </ol>

                {/* 함께 자람 → 하나의 숲: 4~7주 결과물이 8주로 모인다는 연결 */}
                {group.weeks.some((n) =>
                  forestWeeks.some((w) => w.week === n),
                ) ? (
                  <p className="mt-3 flex items-center gap-2 break-keep text-micro font-semibold text-navy/60">
                    <ForestArrow />
                    {`${group.weeks.filter((n) => forestWeeks.some((w) => w.week === n)).join(" · ")}주 작품이 8주 숲 현수막에 붙습니다`}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {details?.length ? (
        <p className="mt-6 break-keep text-micro leading-relaxed text-ink-muted">
          교사용 수업가이드(STARTER 2026.1) 기준입니다. 세부 문구는 콘텐츠 승인 과정에서
          다듬어질 수 있습니다.
        </p>
      ) : (
        <a
          href={programPath(product.slug)}
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-label font-bold text-navy underline-offset-4 hover:underline"
        >
          주차별 목표 · 활동 · 관찰 포인트 보기
          <span aria-hidden="true">→</span>
        </a>
      )}
    </section>
  );
}

/* ───────────────────────────────────────────────────── 주차 카드 */

function WeekCard({
  entry,
  detail,
  forestWeeks,
  accentText,
}: {
  entry: ProgramCurriculumWeek;
  detail?: StarterWeekDetail;
  forestWeeks: ProgramCurriculumWeek[];
  accentText: string;
}) {
  const head = (
    <>
      <span
        className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-micro font-bold tabular-nums tracking-[0.1em] ${
          entry.finale ? "bg-navy text-accent-on-dark" : `bg-navy/[0.05] ${accentText}`
        }`}
      >
        {`W${String(entry.week).padStart(2, "0")}`}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="break-keep text-body-sm font-bold leading-snug text-navy sm:text-body">
            《{entry.storyTitle ?? entry.topic}》
          </span>
          {entry.growthKeyword ? (
            <span
              className={`rounded-full bg-navy/[0.05] px-2.5 py-0.5 text-micro font-bold ${accentText}`}
            >
              {entry.growthKeyword}
            </span>
          ) : null}
        </span>

        {entry.coreMessage ? (
          <span className="mt-1 block break-keep text-caption leading-relaxed text-ink-muted">
            {entry.coreMessage}
          </span>
        ) : null}

        {entry.feedsForest ? (
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-micro font-semibold text-secondary-strong">
            <ForestArrow />
            8주 숲으로 이어짐
          </span>
        ) : null}

        {/* 8주: 어떤 주의 작품이 모이는지 글자로 보인다 (색만으로 구분하지 않는다). */}
        {forestWeeks.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-1 text-micro font-semibold text-navy/70">
            {forestWeeks.map((w) => (
              <span
                key={w.week}
                className="rounded border border-line bg-white px-1.5 py-0.5 tabular-nums"
              >
                {`W${String(w.week).padStart(2, "0")} ${w.takeHome?.title ?? ""}`}
              </span>
            ))}
            <span aria-hidden="true" className="text-navy/35">
              →
            </span>
            <span>하나의 숲</span>
          </span>
        ) : null}
      </span>
    </>
  );

  const frame = `overflow-hidden rounded-xl border bg-white ${
    entry.finale ? "border-navy" : "border-line"
  }`;

  // 상세가 없으면(오버레이) 펼치지 않는 카드.
  if (!detail) {
    return <div className={`${frame} flex items-start gap-3 px-4 py-3.5 sm:px-5`}>{head}</div>;
  }

  return (
    <details className={`group ${frame}`}>
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 transition-colors hover:bg-navy/[0.03] sm:px-5 [&::-webkit-details-marker]:hidden">
        {head}
        <span className="sr-only">주차 상세 열기</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-1.5 shrink-0 text-navy/35 transition-transform duration-200 group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <WeekDetail detail={detail} accentText={accentText} />
    </details>
  );
}

/* ───────────────────────────────────────────────────── 주차 상세 */

/**
 * 원본 objective 는 "하지 않는 것 X · 하려는 것 O" 형식이다.
 * 목표(O)를 앞에, 하지 않는 것(X)을 뒤에 작게 둔다. 형식이 다르면 원문 그대로.
 */
function splitObjective(objective: string): { goal: string; avoid?: string } {
  const match = objective.match(/^(.*?)\s*X\s*·\s*(.*?)\s*O\s*$/);
  if (!match) return { goal: objective };
  return { avoid: match[1].trim(), goal: match[2].trim() };
}

function WeekDetail({
  detail,
  accentText,
}: {
  detail: StarterWeekDetail;
  accentText: string;
}) {
  const objective = splitObjective(detail.objective);

  const rows: { label: string; value: string }[] = [
    { label: "그림책", value: detail.storybook },
    { label: "신체 활동", value: detail.physicalActivity },
    {
      label: "미술·교구 활동",
      value: detail.kit ? `${detail.artActivity} · 교구: ${detail.kit}` : detail.artActivity,
    },
    { label: "워크북", value: detail.workbook },
    { label: "준비물", value: detail.materials },
    { label: "가정연계", value: detail.familyConnection },
  ];

  return (
    <div className="flex flex-col gap-5 border-t border-line px-4 py-5 sm:px-5">
      {detail.coverMessage ? (
        <div>
          <DetailLabel accentText={accentText}>이번 주 이야기</DetailLabel>
          <p className="mt-1.5 break-keep text-body-sm leading-relaxed text-navy/80">
            {detail.coverMessage}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-surface-soft px-4 py-3.5">
        <DetailLabel accentText={accentText}>활동 목표</DetailLabel>
        <p className="mt-1.5 break-keep text-body-sm font-semibold leading-relaxed text-navy">
          {objective.goal}
        </p>
        {objective.avoid ? (
          <p className="mt-2 break-keep text-caption leading-relaxed text-ink-muted">
            <span className="font-bold">하지 않는 것</span>
            <span className="mx-1.5 text-navy/20">|</span>
            {objective.avoid}
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className={`text-micro font-bold tracking-[0.08em] ${accentText}`}>
              {row.label}
            </dt>
            <dd className="mt-0.5 break-keep text-caption leading-relaxed text-navy/80">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChipList label="관찰 포인트" items={detail.observationFocus} accentText={accentText} />
        <ChipList label="누리과정" items={detail.nuriAreas} accentText={accentText} />
      </div>
    </div>
  );
}

function DetailLabel({
  children,
  accentText,
}: {
  children: ReactNode;
  accentText: string;
}) {
  return (
    <p className={`text-micro font-bold tracking-[0.08em] ${accentText}`}>{children}</p>
  );
}

function ChipList({
  label,
  items,
  accentText,
}: {
  label: string;
  items: string[];
  accentText: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <DetailLabel accentText={accentText}>{label}</DetailLabel>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="break-keep rounded-full border border-line bg-white px-2.5 py-1 text-micro font-semibold text-navy/75"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 상태 배지 — 색만으로 말하지 않는다. 항상 한국어 라벨과 점(모양)을 함께 둔다. */
export function StatusBadge({ label }: { label: "포함" | "준비 중" | "계약 범위" }) {
  const tone =
    label === "포함"
      ? "border-success-border bg-success-soft text-success-text"
      : label === "준비 중"
        ? "border-warning-border bg-warning-soft text-warning-text"
        : "border-dashed border-control-border bg-white text-ink"; // 계약 범위 = neutral (HomeSection TAG_TONES 와 같은 규칙)
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-bold ${tone}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ForestArrow() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M3 8h9M9 4.5L12.5 8 9 11.5" />
    </svg>
  );
}
