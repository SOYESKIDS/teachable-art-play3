import type { MetadataRoute } from "next";
import { publicRoutes, siteUrl } from "@/lib/seo/site";

/**
 * 공개 sitemap.
 *
 * ★ 목록을 여기에 적지 않는다.
 *   실제로 존재하는 공개 URL 은 @/lib/seo/site 의 publicRoutes 하나가 정한다.
 *   페이지가 늘거나 줄면 그 배열만 고치면 된다 — 두 곳이 갈라질 자리를 만들지 않는다.
 *
 * ★ 관리·인증·학부모 공유 경로는 들어오지 않는다.
 *   publicRoutes 에 없기 때문이다. robots.txt 의 Disallow 와 각 페이지의
 *   robots metadata 가 그 위에 한 겹 더 있다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: route.path === "/" ? siteUrl : `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
