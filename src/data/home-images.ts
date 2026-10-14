/**
 * 홈페이지용 제공 이미지 — 경로 · 대체텍스트 · **실제 픽셀 크기**를 한곳에서 관리한다.
 *
 * ★ width · height 는 장식이 아니다. 칸의 비율을 이 값으로 잡아 자료 이미지의
 *   글자 · 도안이 잘리지 않게 한다 (예전에 네 칸을 16:9 로 고정했다가 4:3 키트
 *   사진만 좌우에 흰 띠가 남았다).
 * ★ 상품 구성 · 제공 상태 · 가격 · 수업 시간은 **여기서 정하지 않는다.**
 *   기존 상품 데이터(src/data/packages.ts · home-narrative.ts)가 단일 출처다.
 */
export const homeImages = {
  artPlay: {
    src: "/images/site/program/teacher-art-play.webp",
    alt: "선생님과 아이들이 색과 재료를 고르며 미술활동을 하는 교실 이미지",
    width: 1448,
    height: 1086,
  },
  classroom: {
    src: "/images/site/program/classroom-discovery.webp",
    alt: "선생님과 아이들이 함께 교실 공간을 둘러보는 이미지",
    width: 1448,
    height: 1086,
  },
  music: {
    src: "/images/site/program/music-and-movement.webp",
    alt: "아이들이 씨앗 마라카스를 흔들며 음악과 움직임을 즐기는 이미지",
    width: 1448,
    height: 1086,
  },
  /**
   * 한 번의 수업 — 단계와 이어지는 장면 세 가지.
   *
   * ★ 비율이 서로 다르다 (16:9 · 4:3 · 9:16). 한 칸에 맞춰 잘라내지 않고
   *   각자 실제 비율로 둔다 — 아이의 얼굴이나 활동의 핵심이 잘리면
   *   보여 주려던 것이 사라진다.
   */
  sessionScenes: [
    {
      src: "/images/site/program/classroom-smartboard.webp",
      alt: "교실 전자칠판에 활동 화면과 발문이 떠 있고 재생 버튼과 남은 시간이 보이는 이미지",
      step: "이야기 열기",
      caption: "교실 화면이 오늘의 발문을 띄웁니다.",
      width: 1672,
      height: 941,
    },
    {
      src: "/images/site/program/music-and-movement.webp",
      alt: "아이들이 씨앗 마라카스를 흔들며 음악에 맞춰 움직이는 이미지",
      step: "몸으로 느끼기",
      caption: "만든 교구로 음악과 움직임을 이어 갑니다.",
      width: 1448,
      height: 1086,
    },
    {
      src: "/images/site/program/paint-splash-play.webp",
      alt: "아이들이 바닥에 펼친 비닐 위에서 물감을 두드리고 튕기며 함께 노는 이미지",
      step: "나답게 표현하기 · 친구와 나누기",
      caption: "손으로 표현하고 친구와 함께 합니다.",
      width: 941,
      height: 1672,
    },
  ],
  /** 보호자가 받아 보는 주간 성장 이야기 — 화면 그대로 */
  growthReport: {
    src: "/images/site/program/weekly-growth-report.webp",
    alt: "주간 성장 이야기 화면 예시. 이번 주 주제, 아이의 말, 주요 성장 모습 네 가지, 활동 결과물 사진, 선생님 관찰 기록, 다음 주 안내가 차례로 있다",
    width: 853,
    height: 1844,
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
