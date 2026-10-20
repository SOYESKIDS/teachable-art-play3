import type { ExperienceImage } from "./types";

/**
 * 체험 화면 사진 · 그림 — 이미 사이트에서 쓰고 있는 자산만 쓴다 (public/images/site).
 *
 * ★ 주차 전용 사진이 없는 주차는 이미지를 지어내지 않는다. 화면은 주차 색과
 *   주제 그림(WeekArt · SVG)으로 대신 그린다. 새 사진이 확보되면 여기 한곳에만 더한다.
 */
export const MEDIA = {
  heroMusic: {
    src: "/images/site/program/music-and-movement.webp",
    alt: "아이들이 씨앗 마라카스를 흔들며 음악에 맞춰 즐겁게 움직이는 교실 그림",
    width: 1448,
    height: 1086,
  },
  classroom: {
    src: "/images/site/program/classroom-discovery.webp",
    alt: "선생님과 아이들이 함께 밝은 교실을 둘러보는 그림",
    width: 1448,
    height: 1086,
  },
  artPlay: {
    src: "/images/site/program/teacher-art-play.webp",
    alt: "선생님과 아이들이 색과 재료를 고르며 미술활동을 하는 교실 그림",
    width: 1448,
    height: 1086,
  },
  seedKit: {
    src: "/images/site/program/seed-creative-kit.webp",
    alt: "여러 가지 씨앗과 씨앗 마라카스 재료가 놓인 창작 키트 그림",
    width: 1448,
    height: 1086,
  },
  paintSplash: {
    src: "/images/site/program/paint-splash-play.webp",
    alt: "아이들이 커다란 종이 위에서 물감을 두드리며 색을 퍼뜨리는 그림",
    width: 941,
    height: 1672,
  },
  smartboard: {
    src: "/images/site/program/classroom-smartboard.webp",
    alt: "교실 전자칠판에 활동 화면과 발문이 떠 있는 그림",
    width: 1672,
    height: 941,
  },
  storybook: {
    src: "/images/site/program/seed-storybook-ebook.webp",
    alt: "그림책과 태블릿 전자책으로 수업 이야기를 만나는 그림",
    width: 1672,
    height: 941,
  },
  movementPhoto: {
    src: "/images/site/hero/hero-class-movement.webp",
    alt: "교실에서 선생님을 따라 아이들이 팔을 펼치며 몸으로 표현하는 수업 장면",
    width: 1800,
    height: 1200,
  },
} satisfies Record<string, ExperienceImage>;

/**
 * 사용권 미확인 캐릭터가 그려진 그림 — 캐릭터를 켜기 전(CHARACTERS_ENABLED=false)에는 공개 화면에 쓰지 않는다.
 * seedKit: 키트 스티커 · 병에 동물 캐릭터 얼굴 / storybook: 그림책 · 전자책 표지의 보라 고양이 캐릭터.
 * tests/experience-content.test.mjs 가 검사한다. (2026-10-20 이미지 점검)
 */
export const CHARACTER_BEARING_MEDIA = [MEDIA.seedKit.src, MEDIA.storybook.src] as const;

/** 주차 전용 이미지 — 확보된 주차만 (4주차 키트 그림은 캐릭터 스티커가 있어 빼고 주제 그림으로 대신한다) */
export const WEEK_MEDIA: Partial<Record<number, ExperienceImage>> = {
  1: MEDIA.classroom,
  17: MEDIA.paintSplash,
};
