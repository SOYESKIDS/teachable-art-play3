import { LoadingPanel } from "@/components/ui/surface";

/**
 * 운영 화면 공통 불러오기 화면 (loading.tsx).
 *
 * 서버에서 데이터를 가져오는 동안 빈 화면 대신 화면의 뼈대를 먼저 보여 준다.
 * 제목(h1)은 그리지 않는다 — 실제 화면이 오면 그 화면의 제목 하나만 남는다.
 */
export function RouteLoading({ width = "max-w-[1100px]" }: { width?: string }) {
  return (
    <div className={`mx-auto w-full ${width} px-5 py-8 lg:px-8 lg:py-10`}>
      <LoadingPanel />
    </div>
  );
}
