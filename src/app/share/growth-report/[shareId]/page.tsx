import type { Metadata } from "next";
import { ParentGrowthReportView } from "@/components/share/ParentGrowthReportView";

/**
 * SERVICE-13 — 학부모 공개 성장 리포트 페이지.
 *
 * ★ 로그인이 필요 없는 유일한 내부 화면이다.
 *   src/proxy.ts의 matcher는 /admin · /director · /teacher만 감시하므로
 *   이 경로는 원래부터 Proxy를 거치지 않는다. Proxy를 수정하지 않았다 —
 *   내부 경로의 보호를 건드리지 않기 위해서다.
 *
 * ★ shareId만으로는 아무것도 열리지 않는다.
 *   이 Server Component는 데이터를 전혀 읽지 않는다. 껍데기만 그린다.
 *   실제 조회는 주소창 #뒤의 비밀값을 읽은 Client Component가
 *   /api/share/growth-report/resolve로 POST해야 일어난다.
 *   비밀값이 없거나 틀리면 같은 "사용할 수 없습니다" 화면이 된다.
 *
 * ★ 검색엔진에 노출하지 않는다.
 *   아래 robots + robots.txt Disallow(/share) + sitemap 제외까지 세 겹이다.
 *   sitemap.ts는 lib/seo/site.ts의 publicRoutes만 넣으므로 이 경로는 애초에 없다.
 *
 * ★ 외부 링크를 넣지 않는다.
 *   referrer: no-referrer와 함께, 이 페이지에서 다른 사이트로 새어 나갈
 *   경로 자체를 만들지 않는다.
 *
 * ★ SERVICE-19 — 껍데기는 조용하게.
 *   기관 이름 · 아이 이름 · 기간은 안쪽 리포트의 표지가 말한다.
 *   껍데기에서 같은 말을 반복하면 "공문" 같은 인상이 된다.
 *   여기 남는 것은 브랜드 한 줄과 링크 취급 안내뿐이고, 둘 다 인쇄에서 빠진다.
 */
export const metadata: Metadata = {
  title: "성장 리포트 | TeachAble Art Play",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  },
};

/** 이 페이지는 절대 캐시하지 않는다. 개인 문서다. */
export const dynamic = "force-dynamic";

interface ParentSharePageProps {
  params: Promise<{ shareId: string }>;
}

export default async function ParentSharePage({ params }: ParentSharePageProps) {
  const { shareId } = await params;

  return (
    <div className="min-h-screen bg-surface-soft print:bg-white">
      <header className="border-b border-navy/10 bg-white print:hidden">
        <div className="mx-auto w-full max-w-[560px] px-5 py-3">
          <p className="text-[10px] font-bold tracking-[0.16em] text-navy/45">
            TEACHABLE ART PLAY
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-5 py-6 print:max-w-none print:px-0 print:py-0">
        <ParentGrowthReportView shareId={shareId} />

        <p className="mt-6 rounded-xl border border-navy/10 bg-white px-4 py-3 text-[12px] leading-relaxed text-navy/50 print:hidden">
          이 링크는 해당 보호자에게만 전달해주세요. 링크를 가진 사람은 유효기간
          동안 내용을 볼 수 있습니다.
        </p>
      </main>
    </div>
  );
}
