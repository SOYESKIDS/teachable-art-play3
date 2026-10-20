import type { MotifKey } from "@/data/experience/types";

/**
 * 24주 주제 그림 — 주차마다 한 장. 자체 제작 SVG (외부 이미지 없음).
 *
 * ★ 장식이다. 의미는 옆의 주차 제목이 전한다 (aria-hidden).
 * ★ 큰 면은 주차 색(c), 나머지는 고정 팔레트. 흰 외곽선으로 스티커처럼 보인다.
 */
const Y = "#ffc928", P = "#ff4f8b", S = "#4da3ff", L = "#9b7bff", O = "#ff8a3d", G = "#45c25a", INK = "#1b2547", W = "#fff";

const st = { stroke: W, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const MOTIFS: Record<MotifKey, (c: string) => React.ReactNode> = {
  school: (c) => (<g {...st}><path d="M10 30L32 12l22 18v22H10z" fill={c} /><rect x="27" y="38" width="10" height="14" fill={Y} /><circle cx="32" cy="26" r="5" fill={W} /><path d="M32 12V4h8" fill="none" stroke={P} strokeWidth="3" /></g>),
  medal: (c) => (<g {...st}><path d="M22 6l10 18 10-18" fill={S} /><circle cx="32" cy="38" r="17" fill={Y} /><path d="M32 28l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill={c} /></g>),
  heart: (c) => (<g {...st}><path d="M32 54S8 40 8 23a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 31-24 31z" fill={c} /><path d="M20 22a6 6 0 0 1 8-3" fill="none" stroke={W} strokeWidth="3" /></g>),
  seed: (c) => (<g {...st}><ellipse cx="32" cy="46" rx="20" ry="8" fill={O} /><path d="M32 44V24" fill="none" stroke={G} strokeWidth="5" /><path d="M32 28c-2-10-12-14-20-12 0 10 8 14 20 12z" fill={G} /><path d="M32 24c2-10 12-14 20-12 0 10-8 14-20 12z" fill={G} /><ellipse cx="32" cy="46" rx="8" ry="4" fill={c} /></g>),
  flower: (c) => (<g {...st}>{[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx="32" cy="16" rx="8" ry="11" fill={r % 120 ? c : P} transform={`rotate(${r} 32 30)`} />)}<circle cx="32" cy="30" r="8" fill={Y} /><path d="M32 40v18" stroke={G} strokeWidth="4" /></g>),
  house: (c) => (<g {...st}><path d="M6 34L32 10l26 24" fill={O} /><path d="M12 32h40v24H12z" fill={c} /><path d="M26 56V42h12v14" fill={Y} /><circle cx="20" cy="40" r="3" fill={W} /></g>),
  butterfly: (c) => (<g {...st}><path d="M32 30C20 10 6 14 8 28s14 12 24 4z" fill={c} /><path d="M32 30c12-20 26-16 24-2s-14 12-24 4z" fill={L} /><path d="M32 34c-8 4-16 12-10 18s10-4 10-12z" fill={P} /><path d="M32 34c8 4 16 12 10 18s-10-4-10-12z" fill={Y} /><path d="M32 22v24" stroke={INK} strokeWidth="4" /></g>),
  forest: (c) => (<g {...st}><path d="M14 46L24 18l10 28z" fill={G} /><path d="M30 50L42 12l12 38z" fill={c} /><path d="M6 52h52" stroke={O} strokeWidth="5" /></g>),
  blossom: (c) => (<g {...st}><circle cx="18" cy="22" r="10" fill={c} /><circle cx="44" cy="18" r="9" fill={P} /><circle cx="34" cy="40" r="11" fill={Y} />{[[14, 48], [50, 40], [24, 8]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill={P} />)}</g>),
  bug: (c) => (<g {...st}><ellipse cx="32" cy="36" rx="16" ry="18" fill={c} /><path d="M32 18v36" stroke={INK} strokeWidth="3" /><circle cx="32" cy="16" r="8" fill={INK} /><circle cx="24" cy="32" r="4" fill={INK} /><circle cx="40" cy="42" r="4" fill={INK} /><path d="M26 10l-4-6M38 10l4-6" stroke={INK} strokeWidth="3" /></g>),
  plane: (c) => (<g {...st}><path d="M6 36l52-22-14 30-10-10-12 14v-12z" fill={c} /><path d="M34 34l24-20" fill="none" stroke={W} strokeWidth="3" /><circle cx="14" cy="16" r="6" fill={Y} /></g>),
  leaf: (c) => (<g {...st}><path d="M10 50C10 24 28 8 54 10c2 26-14 42-44 40z" fill={c} /><path d="M12 50L46 18" stroke={W} strokeWidth="3" /><circle cx="48" cy="46" r="7" fill={O} /></g>),
  moon: (c) => (<g {...st}><circle cx="32" cy="32" r="22" fill={c} /><circle cx="24" cy="26" r="4" fill={Y} /><circle cx="38" cy="38" r="5" fill={Y} /><path d="M52 10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={Y} /></g>),
  chat: (c) => (<g {...st}><path d="M8 14h36v24H24l-10 10v-10H8z" fill={c} /><path d="M30 26h26v20h-6v8l-8-8H30z" fill={Y} /><circle cx="18" cy="26" r="3" fill={W} /><circle cx="28" cy="26" r="3" fill={W} /></g>),
  bell: (c) => (<g {...st}><path d="M16 44c0-6 2-8 2-16a14 14 0 0 1 28 0c0 8 2 10 2 16z" fill={c} /><circle cx="32" cy="50" r="5" fill={Y} /><path d="M12 44h40" stroke={W} strokeWidth="4" /><path d="M8 18c2-4 4-6 8-8M56 18c-2-4-4-6-8-8" fill="none" stroke={P} strokeWidth="3" /></g>),
  seasons: (c) => (<g {...st}><path d="M32 32V6a26 26 0 0 1 26 26z" fill={P} /><path d="M32 32h26a26 26 0 0 1-26 26z" fill={Y} /><path d="M32 32v26A26 26 0 0 1 6 32z" fill={O} /><path d="M32 32H6A26 26 0 0 1 32 6z" fill={c} /></g>),
  paint: (c) => (<g {...st}><path d="M14 18c8-10 30-10 38 2 6 10-2 14-8 12-6-2-8 6-2 10-6 8-26 6-32-6-4-8-2-12 4-18z" fill={c} /><circle cx="22" cy="24" r="4" fill={Y} /><circle cx="34" cy="20" r="4" fill={S} /><circle cx="22" cy="38" r="4" fill={P} /></g>),
  water: (c) => (<g {...st}><path d="M32 6C22 22 16 30 16 38a16 16 0 0 0 32 0c0-8-6-16-16-32z" fill={c} /><path d="M24 40a8 8 0 0 0 8 8" fill="none" stroke={W} strokeWidth="3" /><path d="M4 56c6-4 10-4 16 0s10 4 16 0 10-4 16 0 6 2 8 0" fill="none" stroke={S} strokeWidth="4" /></g>),
  drum: (c) => (<g {...st}><ellipse cx="32" cy="26" rx="20" ry="8" fill={Y} /><path d="M12 26v18c0 5 9 9 20 9s20-4 20-9V26" fill={c} /><path d="M18 30l8 20M46 30l-8 20" stroke={W} strokeWidth="2.5" /><path d="M40 6l-8 16M52 10L38 22" stroke={O} strokeWidth="4" /></g>),
  tomato: (c) => (<g {...st}><circle cx="32" cy="36" r="20" fill={c} /><path d="M22 18l10 6 10-6-4 8 8 2-14 2-14-2 8-2z" fill={G} /><ellipse cx="24" cy="32" rx="4" ry="6" fill={W} opacity="0.55" /></g>),
  balloon: (c) => (<g {...st}><path d="M32 4C18 4 10 14 10 24c0 12 14 22 22 26 8-4 22-14 22-26C54 14 46 4 32 4z" fill={c} /><path d="M32 4C26 12 24 30 32 50M32 4c6 8 8 26 0 46" fill="none" stroke={W} strokeWidth="3" /><path d="M24 50h16v10H24z" fill={O} /></g>),
  pumpkin: (c) => (<g {...st}><ellipse cx="20" cy="36" rx="12" ry="16" fill={c} /><ellipse cx="44" cy="36" rx="12" ry="16" fill={c} /><ellipse cx="32" cy="36" rx="12" ry="18" fill={O} /><path d="M32 18c0-6 4-10 8-10" fill="none" stroke={G} strokeWidth="4" /><path d="M24 34l4-4 4 4M36 34l4-4 4 4" fill="none" stroke={INK} strokeWidth="3" /></g>),
  gift: (c) => (<g {...st}><rect x="10" y="24" width="44" height="32" rx="4" fill={c} /><rect x="8" y="18" width="48" height="10" rx="3" fill={P} /><path d="M32 18v38" stroke={Y} strokeWidth="6" /><path d="M32 18c-8-12-18-6-12 0zM32 18c8-12 18-6 12 0z" fill={Y} /></g>),
  globe: (c) => (<g {...st}><circle cx="32" cy="32" r="24" fill={S} /><path d="M18 18c6 2 8 8 4 12s2 10 8 8 6 8 2 12M40 12c-2 6 4 8 8 6s6 6 2 10" fill="none" stroke={W} strokeWidth="3" /><path d="M20 22c6 4 4 10 0 12 4 6 12 4 12 10M38 30c6-2 10 2 12 6" fill={c} stroke={W} strokeWidth="2" /></g>),
};

export function Motif({ motif, color, className }: { motif: MotifKey; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      {MOTIFS[motif](color)}
    </svg>
  );
}
