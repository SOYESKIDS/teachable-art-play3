import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "교실 화면 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/**
 * 교실 화면 전용 레이아웃.
 *
 * ★ 업무 화면의 머리띠·메뉴·알림을 쓰지 않는다. 그것들이 교실 TV 에 뜨면
 *   원아 정보나 관리 기능이 아이들 앞에 노출될 수 있다. 그래서 라우트를
 *   `/class` 아래로 분리하고 레이아웃을 따로 둔다.
 */
export default function ClassLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stage">{children}</div>;
}
