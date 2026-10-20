import Image from "next/image";
import { cx } from "@/components/ui/cx";
import { characterGroupImage, characterImage } from "@/data/experience/characters";
import type { CharacterKey } from "@/data/experience/types";

/**
 * 캐릭터 자리 대체 일러스트 — 자체 제작 SVG (외부 이미지 · 다른 브랜드 캐릭터 없음).
 *
 * ★ SOYE KIDS 캐릭터 사용권이 확인되기 전에는 CHARACTERS_ENABLED = false 다.
 *   그 자리를 비워 두지 않고, 수업 소품(물감 팔레트 · 무지개 · 크레용 · 새싹 화분 ·
 *   별 연 · 작은 북)으로 채운다. 캐릭터의 얼굴 · 모양을 흉내 내지 않는다.
 * ★ 장식이다 (aria-hidden). 사용권이 확인되어 켜지면 같은 자리에 캐릭터가 다시 들어간다.
 */
export type DoodleKind = "palette" | "rainbow" | "crayons" | "sprout" | "kite" | "drum" | "parade";

const BY_CHARACTER: Record<CharacterKey, DoodleKind> = {
  pupu: "palette",
  bukgeuki: "kite",
  cat: "sprout",
  maru: "crayons",
  ubi: "drum",
  ella: "rainbow",
};

const W = "#fff";
const s = { stroke: W, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const ART: Record<DoodleKind, { viewBox: string; body: React.ReactNode }> = {
  palette: {
    viewBox: "0 0 200 200",
    body: (
      <g {...s}>
        <path d="M100 28c46 0 78 30 78 66 0 26-20 32-36 28-14-4-22 8-14 20 10 16-4 34-30 34-44 0-76-32-76-72s32-76 78-76z" fill="#ffe1ec" />
        <circle cx="64" cy="74" r="14" fill="#ff4f8b" />
        <circle cx="104" cy="58" r="14" fill="#ffc928" />
        <circle cx="144" cy="80" r="13" fill="#22c3b5" />
        <circle cx="62" cy="118" r="14" fill="#4da3ff" />
        <circle cx="94" cy="148" r="12" fill="#9b7bff" />
        <path d="M150 128l36-60 10 6-28 64z" fill="#ff8a3d" />
        <path d="M150 128l18 14-24 10z" fill="#1b2547" />
      </g>
    ),
  },
  rainbow: {
    viewBox: "0 0 220 170",
    body: (
      <g {...s}>
        <path d="M20 140a90 90 0 0 1 180 0" fill="none" stroke="#ff4f8b" strokeWidth="18" />
        <path d="M44 140a66 66 0 0 1 132 0" fill="none" stroke="#ffc928" strokeWidth="18" />
        <path d="M68 140a42 42 0 0 1 84 0" fill="none" stroke="#22c3b5" strokeWidth="18" />
        <path d="M10 150h40a16 16 0 0 0 0-32 22 22 0 0 0-40 4 14 14 0 0 0 0 28z" fill="#e1efff" />
        <path d="M170 150h40a14 14 0 0 0 0-28 22 22 0 0 0-40-2 16 16 0 0 0 0 30z" fill="#e1efff" />
      </g>
    ),
  },
  crayons: {
    viewBox: "0 0 200 200",
    body: (
      <g {...s}>
        {[
          ["#ff4f8b", -18, 62],
          ["#ffc928", -6, 86],
          ["#22c3b5", 6, 110],
          ["#4da3ff", 18, 134],
        ].map(([c, r, x]) => (
          <g key={String(c)} transform={`rotate(${r} ${x} 150)`}>
            <path d={`M${Number(x) - 12} 170V64l12-26 12 26v106z`} fill={String(c)} />
            <path d={`M${Number(x) - 12} 64h24`} />
            <path d={`M${Number(x) - 12} 150h24`} />
          </g>
        ))}
        <path d="M40 176h120" stroke="#1b2547" strokeWidth="0" />
      </g>
    ),
  },
  sprout: {
    viewBox: "0 0 200 220",
    body: (
      <g {...s}>
        <path d="M100 120V70" stroke="#45c25a" strokeWidth="10" />
        <path d="M100 82c-6-30-34-42-58-36 0 28 24 42 58 36z" fill="#45c25a" />
        <path d="M100 74c6-30 34-42 58-36 0 28-24 42-58 36z" fill="#7bd88a" />
        <path d="M52 120h96l-12 80H64z" fill="#ff8a3d" />
        <path d="M44 112h112v16H44z" fill="#ffb37a" />
        <circle cx="80" cy="160" r="6" fill={W} />
        <circle cx="120" cy="166" r="6" fill={W} />
      </g>
    ),
  },
  kite: {
    viewBox: "0 0 200 220",
    body: (
      <g {...s}>
        <path d="M100 14l54 64-54 70-54-70z" fill="#4da3ff" />
        <path d="M100 14v134M46 78h108" />
        <path d="M100 148c-10 18 10 24 0 40s10 24 0 30" fill="none" stroke="#ff4f8b" strokeWidth="5" />
        <path d="M84 176l-12 6 12 6zM116 196l12 6-12 6z" fill="#ffc928" />
      </g>
    ),
  },
  drum: {
    viewBox: "0 0 200 200",
    body: (
      <g {...s}>
        <ellipse cx="100" cy="94" rx="64" ry="22" fill="#ffc928" />
        <path d="M36 94v56c0 14 28 26 64 26s64-12 64-26V94" fill="#ff4f8b" />
        <path d="M50 104l22 64M150 104l-22 64M100 116v60" />
        <path d="M128 24l-30 58M164 36l-48 50" stroke="#ff8a3d" strokeWidth="9" />
        <path d="M30 40l6 12 12 4-12 4-6 12-6-12-12-4 12-4z" fill="#9b7bff" />
      </g>
    ),
  },
  parade: {
    viewBox: "0 0 320 200",
    body: (
      <g {...s}>
        <path d="M30 170c40-60 90-80 130-40s90 20 130-30" fill="none" stroke="#ffc928" strokeWidth="14" />
        <circle cx="60" cy="70" r="26" fill="#ff4f8b" />
        <path d="M60 96c-4 30 6 50-6 74" fill="none" stroke="#1b2547" strokeWidth="3" />
        <circle cx="130" cy="46" r="22" fill="#22c3b5" />
        <path d="M130 68c4 26-6 46 6 66" fill="none" stroke="#1b2547" strokeWidth="3" />
        <circle cx="250" cy="60" r="28" fill="#9b7bff" />
        <path d="M250 88c-6 30 8 46-4 72" fill="none" stroke="#1b2547" strokeWidth="3" />
        <path d="M190 120l8 16 18 3-13 12 3 18-16-8-16 8 3-18-13-12 18-3z" fill="#ffc928" />
      </g>
    ),
  },
};

export function Doodle({ kind, className }: { kind: DoodleKind; className?: string }) {
  const a = ART[kind];
  return (
    <svg viewBox={a.viewBox} aria-hidden="true" focusable="false" className={cx("drop-shadow-[0_8px_10px_rgba(27,37,71,0.16)]", className)}>
      {a.body}
    </svg>
  );
}

/**
 * 캐릭터 자리 — 사용권이 확인되면 캐릭터, 아니면 같은 자리에 소품 일러스트.
 * 호출하는 쪽은 자리(위치 · 크기)만 정한다.
 */
export function Buddy({
  character,
  group = false,
  className,
  sizes = "160px",
}: {
  character: CharacterKey;
  group?: boolean;
  className?: string;
  sizes?: string;
}) {
  const img = group ? characterGroupImage() : characterImage(character);
  if (img) {
    return <Image src={img.src} alt="" width={img.width} height={img.height} sizes={sizes} className={cx("h-auto drop-shadow-[0_10px_12px_rgba(27,37,71,0.22)]", className)} />;
  }
  return <Doodle kind={group ? "parade" : BY_CHARACTER[character]} className={cx("h-auto", className)} />;
}
