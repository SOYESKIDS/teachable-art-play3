import { Motif } from "../Motif";

/**
 * 홈 첫 화면 큰 그림 — 자체 제작 일러스트 (SVG · 외부 이미지 없음).
 *
 * ★ 2026-10-21 교체: 예전 사진(media.ts heroMusic)에는 사용권을 확인하지 못한
 *   캐릭터 스티커가 그려져 있어 외부 시연 화면에서 뺐다 (media.ts EXCLUDED_PUBLIC_MEDIA).
 * ★ 내용은 공식 지도의 사실만 — 24주 · PART 3개(1~8 · 9~16 · 17~24주)와 각 PART 의 주차 주제 그림.
 *   씨앗(PART 1) → 사계절(PART 2) → 세계(PART 3)로 이어지는 모험 길.
 * ★ 사람 · 캐릭터를 그리지 않는다. 글자는 주차 범위 칩만 (화면 읽기 프로그램은 aria-label 로 읽는다).
 * ★ 그림 파일을 받지 않으므로 첫 화면(LCP)이 그림 다운로드를 기다리지 않는다.
 */
const STATIONS = [
  // chip = 글자 바탕색 (흰 글자 대비 4.5:1 이상 — globals.css 의 *-deep 토큰)
  { motif: "seed", color: "#22c3b5", chip: "#0b766d", label: "1~8주", x: "16%", y: "64%", size: "h-[26%]" },
  { motif: "seasons", color: "#4da3ff", chip: "#1b5fc4", label: "9~16주", x: "50%", y: "44%", size: "h-[24%]" },
  { motif: "globe", color: "#ff4f8b", chip: "#c21d58", label: "17~24주", x: "82%", y: "24%", size: "h-[24%]" },
] as const;

const SMALL = [
  { motif: "flower", color: "#ff4f8b", x: "32%", y: "80%" },
  { motif: "leaf", color: "#ff8a3d", x: "64%", y: "64%" },
  { motif: "paint", color: "#9b7bff", x: "66%", y: "28%" },
  { motif: "drum", color: "#22c3b5", x: "88%", y: "52%" },
] as const;

export function HeroScene() {
  return (
    <div
      role="img"
      aria-label="씨앗 화분에서 사계절 나무를 지나 세계 지구까지 이어지는 24주 모험 길 그림"
      className="absolute inset-0 overflow-hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9ecff" />
            <stop offset="0.7" stopColor="#fff6dc" />
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#hero-sky)" />
        {/* 해 */}
        <g transform="translate(660 110)">
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x="-6" y="-92" width="12" height="28" rx="6" fill="#ffc928" opacity="0.7" transform={`rotate(${i * 36})`} />
          ))}
          <circle r="54" fill="#ffc928" />
          <circle r="54" fill="none" stroke="#fff" strokeWidth="6" />
        </g>
        {/* 구름 */}
        <g fill="#fff">
          <path d="M120 120c0-22 18-38 40-36 8-20 40-24 54-4 22-2 36 14 34 34 0 14-12 24-26 24H146c-16 0-26-8-26-18z" />
          <path d="M430 76c0-16 14-28 30-26 6-14 30-18 40-2 16-2 26 10 24 24 0 10-8 18-18 18h-56c-12 0-20-6-20-14z" opacity="0.9" />
        </g>
        {/* 언덕 세 겹 — PART 색 */}
        <path d="M0 330c120-60 240-70 360-30s260 40 440-40v340H0z" fill="#e2f7e4" />
        <path d="M0 420c140-50 280-40 400 0s250 30 400-20v200H0z" fill="#c9eee9" />
        <path d="M0 500c120-30 260-30 400 0s280 20 400-10v110H0z" fill="#ffe8b8" />
        {/* 모험 길 */}
        <path d="M60 560C160 520 160 420 130 390S240 320 400 290 520 220 650 150" fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round" />
        <path d="M60 560C160 520 160 420 130 390S240 320 400 290 520 220 650 150" fill="none" stroke="#ffc928" strokeWidth="6" strokeDasharray="2 22" strokeLinecap="round" />
        {/* 음표 */}
        <g fill="#1b2547" opacity="0.75">
          <path d="M260 170v-46l34-8v40" fill="none" stroke="#1b2547" strokeWidth="6" strokeLinecap="round" />
          <circle cx="252" cy="172" r="10" />
          <circle cx="286" cy="164" r="10" />
          <path d="M540 380v-36" stroke="#1b2547" strokeWidth="6" strokeLinecap="round" />
          <circle cx="532" cy="382" r="10" />
        </g>
      </svg>

      {SMALL.map((s) => (
        <div key={s.motif} aria-hidden="true" className="absolute flex h-[13%] aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow-pop" style={{ left: s.x, top: s.y }}>
          <Motif motif={s.motif} color={s.color} className="h-[70%] w-auto" />
        </div>
      ))}
      {STATIONS.map((s) => (
        <div key={s.motif} aria-hidden="true" className={`absolute flex ${s.size} aspect-square -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white shadow-pop-lg ring-[6px]`} style={{ left: s.x, top: s.y, ["--tw-ring-color" as string]: s.color }}>
          <Motif motif={s.motif} color={s.color} className="h-[64%] w-auto" />
          <span className="absolute -bottom-3 whitespace-nowrap rounded-full px-3 py-0.5 text-[12px] font-extrabold text-white sm:text-[14px]" style={{ backgroundColor: s.chip }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
