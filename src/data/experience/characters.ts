import type { CharacterKey, ExperienceImage } from "./types";

/**
 * SOYE KIDS 캐릭터 그림 — 한곳에서만 관리한다.
 *
 * ★ 출처: 사용자가 제공한 디자인 참고 자료(SOYE KIDS 자체 캐릭터 렌더)의 배경을
 *   지워 WebP 로 만든 것 (scripts/cutout-characters.mjs).
 * ★ 사용권 최종 확인 전이다. 확인이 늦어지면 `CHARACTERS_ENABLED` 를 false 로 바꾸면
 *   사이트 전체에서 캐릭터가 빠지고 도형 장식만 남는다 (한 줄로 되돌릴 수 있다).
 * ★ 이름은 제공 자료에 적힌 것만 쓴다. 이름이 확인되지 않은 고양이는 이름을 붙이지 않는다.
 */
// ★ 2026-10-20 사용자 지시: 사용권 확인 전 공개 Preview 에서는 끈다.
//   자리마다 자체 제작 소품 일러스트(Doodles.tsx)가 대신 들어간다.
export const CHARACTERS_ENABLED = false;

export interface CharacterAsset extends ExperienceImage {
  name: string | null;
}

export const CHARACTERS: Record<CharacterKey, CharacterAsset> = {
  pupu: { src: "/images/characters/pupu.webp", alt: "", name: "푸푸", width: 504, height: 640 },
  bukgeuki: { src: "/images/characters/bukgeuki.webp", alt: "", name: "북극이", width: 467, height: 640 },
  cat: { src: "/images/characters/cat.webp", alt: "", name: null, width: 460, height: 640 },
  maru: { src: "/images/characters/maru.webp", alt: "", name: "마루", width: 435, height: 640 },
  ubi: { src: "/images/characters/ubi.webp", alt: "", name: "우비", width: 570, height: 640 },
  ella: { src: "/images/characters/ella.webp", alt: "", name: "엘라", width: 639, height: 640 },
};

export const CHARACTER_GROUP: CharacterAsset = {
  src: "/images/characters/friends.webp",
  alt: "",
  name: null,
  width: 640,
  height: 437,
};

export function characterImage(key: CharacterKey): CharacterAsset | null {
  return CHARACTERS_ENABLED ? CHARACTERS[key] : null;
}

export function characterGroupImage(): CharacterAsset | null {
  return CHARACTERS_ENABLED ? CHARACTER_GROUP : null;
}
