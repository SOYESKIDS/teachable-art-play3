import type { Metadata } from "next";
import { ParentGrowthReportView } from "@/components/share/ParentGrowthReportView";
/*
  인쇄 규칙. 이 route 에서만 불러오므로 @page 를 써도 다른 화면의
  인쇄에 영향을 주지 않는다.
*/
import "./report-print.css";

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
 *
 * ★ 보안 안내는 문서 바깥에 둔다.
 *   "이 링크는 해당 보호자에게만" 안내는 리포트의 내용이 아니라 링크를 다루는
 *   방법이다. 문서 안에 섞이면 저장하거나 인쇄한 성장 기록에 관리 문구가
 *   따라 붙는다. 그래서 시각적으로 떼어 놓고 인쇄에서는 숨긴다 —
 *   숨기는 것은 화면에서의 위치뿐이고, 문구 자체는 약화하지 않는다.
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
        <div className="mx-auto w-full max-w-[960px] px-4 py-3 sm:px-6">
          <p className="text-[10px] font-bold tracking-[0.16em] text-navy/45">
            TEACHABLE ART PLAY
          </p>
        </div>
      </header>

      {/*
        문서 폭 960px.
        본문 단락은 안에서 다시 두 칸으로 나뉘므로 한 줄이 지나치게
        길어지지 않고, A4 로 인쇄했을 때의 지면 비율과도 가깝다.
      */}
      <main className="gr-page mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6 sm:py-8">
        <ParentGrowthReportView shareId={shareId} />

        <aside className="mt-10 border-t border-navy/10 pt-5 print:hidden">
          <p className="text-[10px] font-bold tracking-[0.16em] text-navy/40">
            링크 안내
          </p>
          <p className="mt-2 max-w-[62ch] text-[12px] leading-relaxed text-navy/50">
            이 링크는 해당 보호자에게만 전달해주세요. 링크를 가진 사람은
            유효기간 동안 내용을 볼 수 있습니다.
          </p>
        </aside>
      </main>
    </div>
  );
}
