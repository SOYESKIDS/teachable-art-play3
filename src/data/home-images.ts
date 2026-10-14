/** 홈페이지용 제공 이미지. 상품 구성·제공 상태는 기존 상품 데이터에서 읽는다. */
export const homeImages = {
  artPlay: {
    src: "/images/site/program/teacher-art-play.webp",
    alt: "선생님과 아이들이 색과 재료를 고르며 미술활동을 하는 교실 이미지",
  },
  classroom: {
    src: "/images/site/program/classroom-discovery.webp",
    alt: "선생님과 아이들이 함께 교실 공간을 둘러보는 이미지",
  },
  music: {
    src: "/images/site/program/music-and-movement.webp",
    alt: "아이들이 씨앗 마라카스를 흔들며 음악과 움직임을 즐기는 이미지",
  },
  materials: [
    {
      src: "/images/site/program/seed-storybook-ebook.webp",
      alt: "그림책과 태블릿 EBOOK 화면으로 보여 주는 콘텐츠 구성 예시",
      title: "그림책 · EBOOK",
      description: "그림책 이야기로 오늘의 주제를 만납니다.",
      width: 1672,
      height: 941,
    },
    {
      src: "/images/site/program/seed-vod-activity.webp",
      alt: "캐릭터 활동 영상과 네 곡의 음원 목록으로 보여 주는 콘텐츠 구성 예시",
      title: "영상 · 활동 음원",
      description: "이야기를 움직임과 놀이로 이어 갑니다.",
      width: 1672,
      height: 941,
    },
    {
      src: "/images/site/program/seed-workbook.webp",
      alt: "씨앗에서 숲까지의 흐름과 여러 활동지로 보여 주는 워크북 구성 예시",
      title: "워크북",
      description: "경험한 것을 자기 방식으로 표현합니다.",
      width: 1672,
      height: 941,
    },
    {
      src: "/images/site/program/seed-creative-kit.webp",
      alt: "씨앗과 꾸미기 재료로 구성된 씨앗 마라카스 창의활동 키트 이미지",
      title: "창의활동 키트",
      description: "손으로 만들고 함께 놀이하며 주제를 경험합니다.",
      width: 1448,
      height: 1086,
    },
  ],
} as const;
