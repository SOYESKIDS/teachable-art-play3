import type { MetadataRoute } from "next";
import { noIndexRoutes, siteUrl } from "@/lib/seo/site";

/**
 * 공개 홈페이지(/)는 검색엔진 크롤링을 허용한다.
 *
 * 관리/인증 경로는 검색 결과에 노출되지 않도록 Disallow로 제외한다.
 * robots.txt는 접근을 막는 보안장치가 아니라 색인 제어 수단이므로,
 * 실제 접근 차단은 기존 Proxy(src/proxy.ts)와 Supabase RLS가 그대로 담당한다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...noIndexRoutes],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
