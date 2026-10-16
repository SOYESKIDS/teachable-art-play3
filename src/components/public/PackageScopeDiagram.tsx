import { pricingPackages } from "@/data/packages";

/**
 * 상품 범위 그림 — 8 → 16 → 24주가 **누적**이라는 것을 한 장으로 보여 준다.
 *
 * ── 왜 그림이 필요한가 ───────────────────────────────────────────
 *
 * 글로 "16주는 8주를 포함합니다"라고 적어도, 값이 셋 나란히 있으면 원장은
 * 보통 「다른 상품 세 개」로 읽는다. 그래서 16주를 고르면 1~8주가 또
 * 따라오는 줄 알거나, 반대로 8주를 버리고 갈아타는 줄 안다.
 *
 * 막대가 서로를 덮고 있는 그림은 그 질문을 미리 끝낸다.
 *
 * ── 지키는 것 ────────────────────────────────────────────────────
 *
 * ★ 주차 수는 packages.ts 의 durationWeeks 에서 읽는다. 8·16·24 를 이 파일에
 *   적어 두지 않는다 — 상품이 바뀌면 그림이 먼저 틀려진다.
 * ★ 9주 이후가 「준비 중」인 것을 그림에서도 숨기지 않는다. 빗금으로 구분하고
 *   범례에 글자로 적는다. 색만으로 구분하면 색을 못 보는 사람에게 사라진다.
 * ★ 그림을 못 보는 경우를 위해 <title>·<desc> 와 아래 글 설명을 함께 둔다.
 */

/** 막대 한 줄의 색 — 제공 상태가 아니라 상품을 가리킨다 */
const TRACKS = [
  { id: "starter", fill: "var(--color-secondary-strong)" },
  { id: "standard", fill: "var(--color-accent-strong)" },
  { id: "premium", fill: "var(--color-navy)" },
];

/** 지금 교안이 준비된 마지막 주차 — packages.ts SC-4 (9주 이후 준비 중) */
const READY_THROUGH_WEEK = 8;

/**
 * 받침에 맞는 조사를 고른다. 화면 낭독기가 읽는 설명이라 "PREMIUM는"처럼
 * 어긋난 조사가 그대로 소리로 나간다.
 * 상품 이름이 로마자라 한글 발음의 받침을 직접 알 수 없으므로, 아는 이름만
 * 표에 적고 모르면 조사를 빼서 어색하게 읽히지 않게 한다.
 */
const TOPIC_PARTICLE: Record<string, string> = {
  STARTER: "는", // 스타터
  STANDARD: "는", // 스탠다드
  PREMIUM: "은", // 프리미엄 — 받침 ㅁ
};
function withTopic(name: string) {
  const particle = TOPIC_PARTICLE[name];
  return particle ? `${name}${particle}` : name;
}

export function PackageScopeDiagram({ className = "" }: { className?: string }) {
  const ordered = TRACKS.map((t) => pricingPackages.find((p) => p.id === t.id)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );
  if (ordered.length === 0) return null;

  const maxWeeks = Math.max(...ordered.map((p) => p.durationWeeks));
  // 좌표계 — 주차 1칸의 폭을 먼저 정하고 전체를 그 배수로 잡는다
  const labelW = 104;
  const weekW = 26;
  const rowH = 44;
  const barH = 26;
  const axisH = 26;
  const width = labelW + maxWeeks * weekW + 12;
  const height = axisH + ordered.length * rowH + 8;

  const readyX = labelW + READY_THROUGH_WEEK * weekW;

  return (
    <figure className={className}>
      {/*
        좁은 화면에서는 24주까지가 한 번에 들어가지 않아 옆으로 밀어야 한다.
        미는 것을 알리지 않으면 8주에서 끝나는 그림으로 읽는다.
      */}
      <p className="mb-2 text-caption text-ink-muted sm:hidden" aria-hidden="true">
        ← 옆으로 밀면 {maxWeeks}주까지 보입니다
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white p-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="scope-diagram-title scope-diagram-desc"
          className="h-auto w-full min-w-[520px]"
        >
          <title id="scope-diagram-title">상품별 운영 주차 범위</title>
          <desc id="scope-diagram-desc">
            {ordered
              .map((p) => `${withTopic(p.name)} 1주부터 ${p.durationWeeks}주까지`)
              .join(", ")}
            를 운영합니다. 긴 상품이 짧은 상품의 주차를 모두 포함합니다. 현재 수업 자료는{" "}
            {READY_THROUGH_WEEK}주까지 준비되어 있고, {READY_THROUGH_WEEK + 1}주 이후는 준비
            중입니다.
          </desc>

          <defs>
            {/* 준비 중 구간 — 색이 아니라 무늬로 구분한다 */}
            <pattern
              id="scope-pending"
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="7" height="7" fill="var(--color-ivory)" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="var(--color-line-strong)" strokeWidth="2.5" />
            </pattern>
          </defs>

          {/* 주차 눈금 — 8주마다 끊어 읽기 쉽게 */}
          {Array.from({ length: maxWeeks / 8 }, (_, i) => (i + 1) * 8).map((week) => (
            <g key={week}>
              <line
                x1={labelW + week * weekW}
                y1={axisH - 8}
                x2={labelW + week * weekW}
                y2={height - 4}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
              <text
                x={labelW + week * weekW}
                y={axisH - 13}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="var(--color-ink-muted)"
              >
                {week}주
              </text>
            </g>
          ))}

          {ordered.map((pkg, i) => {
            const track = TRACKS.find((t) => t.id === pkg.id);
            const y = axisH + i * rowH;
            const full = pkg.durationWeeks * weekW;
            const ready = Math.min(pkg.durationWeeks, READY_THROUGH_WEEK) * weekW;
            return (
              <g key={pkg.id}>
                <text
                  x="0"
                  y={y + barH / 2 + 4}
                  fontSize="13"
                  fontWeight="700"
                  fill="var(--color-navy)"
                >
                  {pkg.name}
                </text>

                {/* 준비 중 구간을 먼저 깔고, 준비된 구간을 그 위에 덮는다 */}
                <rect
                  x={labelW}
                  y={y}
                  width={full}
                  height={barH}
                  rx="6"
                  fill="url(#scope-pending)"
                  stroke={track?.fill}
                  strokeWidth="1.5"
                />
                <path
                  d={`M${labelW + 6} ${y} h${ready - 6} v${barH} h-${ready - 6} a6 6 0 0 1 -6 -6 v-${barH - 12} a6 6 0 0 1 6 -6 z`}
                  fill={track?.fill}
                />
                <text
                  x={labelW + 10}
                  y={y + barH / 2 + 4}
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--color-white, #fff)"
                >
                  1–{Math.min(pkg.durationWeeks, READY_THROUGH_WEEK)}주
                </text>
                {pkg.durationWeeks > READY_THROUGH_WEEK ? (
                  <text
                    x={labelW + ready + 8}
                    y={y + barH / 2 + 4}
                    fontSize="12"
                    fontWeight="600"
                    fill="var(--color-ink-muted)"
                  >
                    {READY_THROUGH_WEEK + 1}–{pkg.durationWeeks}주 준비 중
                  </text>
                ) : null}
              </g>
            );
          })}

          <line
            x1={readyX}
            y1={axisH - 8}
            x2={readyX}
            y2={height - 4}
            stroke="var(--color-secondary-strong)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        </svg>
      </div>

      {/* 범례 — 무늬의 뜻을 글자로 적는다 */}
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-ink-muted">
        <span className="inline-flex items-center gap-2">
          {/* 채워진 칸은 상품마다 색이 다르다 — 한 색만 보이면 그 상품만 가리키는 줄 읽는다 */}
          <span aria-hidden="true" className="inline-flex gap-0.5">
            <span className="inline-block h-3 w-2 rounded-l-sm bg-secondary-strong" />
            <span className="inline-block h-3 w-2 bg-accent-strong" />
            <span className="inline-block h-3 w-2 rounded-r-sm bg-navy" />
          </span>
          색이 채워진 칸 — 지금 수업할 수 있는 주차
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-6 rounded-sm border border-line-strong bg-ivory"
          />
          빗금 친 칸 — 준비 중인 주차
        </span>
        <span>긴 상품은 짧은 상품의 주차를 모두 포함합니다.</span>
      </figcaption>
    </figure>
  );
}
