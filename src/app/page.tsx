import type { Metadata } from "next";
import { PlayShell } from "@/components/play/PlayShell";
import { PlayHero } from "@/components/play/home/PlayHero";
import { AdventureMap, ClassFlow, PlayerPreview, TryFeatured } from "@/components/play/home/PlaySections";
import { AdoptionTimeline, GrowthPreview, PlayFinalCta } from "@/components/play/home/PlayClosing";
import { organizationJsonLd, toJsonLdScript } from "@/lib/seo/structured-data";

/**
 * 2026 공개 체험 홈 (PLAYFUL PREMIUM EDUCATION).
 *
 * ★ 설명보다 장면이 먼저다 — 큰 그림 · 24주 지도 · 수업 흐름 · 바로 체험.
 * ★ 이전 영업 홈(FINAL V4)의 섹션 컴포넌트는 src/components/home 에 그대로 있다.
 *   되돌리려면 이 파일만 backup/platform-before-redesign-20261020 의 것으로 바꾸면 된다.
 * ★ 푸터가 쓰는 홈 위치(#journey · #program · #growth-record · #adoption · #contact)를 유지한다.
 * ★ 이 페이지는 서버 데이터를 읽지 않는다 (정적 생성).
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PlayShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdScript(organizationJsonLd()) }} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <PlayHero />
        <AdventureMap />
        <ClassFlow />
        <TryFeatured />
        <PlayerPreview />
        <GrowthPreview />
        <AdoptionTimeline />
        <PlayFinalCta />
      </main>
    </PlayShell>
  );
}
