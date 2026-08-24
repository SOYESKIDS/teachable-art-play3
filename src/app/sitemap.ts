import type { MetadataRoute } from "next";
import { publicRoutes, siteUrl } from "@/lib/seo/site";

/**
 * 공개 홈페이지는 현재 단일 랜딩페이지(/) 구조다.
 * 실제로 존재하는 공개 URL만 포함하고, 관리/인증 경로는 넣지 않는다.
 * 공개 페이지가 늘어나면 `@/lib/seo/site`의 publicRoutes에만 추가하면 된다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: route === "/" ? siteUrl : `${siteUrl}${route}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: route === "/" ? 1 : 0.7,
  }));
}
