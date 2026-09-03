/**
 * 공개 홈페이지의 SEO / 링크공유(Open Graph) 메타데이터 단일 관리 지점.
 *
 * metadataBase, canonical, robots.txt, sitemap.xml, Open Graph URL이 모두 이 파일의
 * `siteUrl` 하나를 따른다. 자체 도메인으로 옮길 때는 아래 PRODUCTION_SITE_URL만 교체하면 된다.
 *
 * 인증 초대 링크에서 쓰는 `@/lib/env/app-url`의 getAppUrl()과는 의도적으로 분리했다.
 * getAppUrl()은 환경변수가 없으면 "조용히 잘못된 메일을 보내지 않도록" 예외를 던지지만,
 * 공개 페이지 메타데이터는 어떤 환경에서도 빌드가 깨지면 안 되기 때문이다.
 */

/** 현재 Production 도메인. 자체 도메인 확보 시 이 상수만 교체한다. */
const PRODUCTION_SITE_URL = "https://teachable-art-play3.vercel.app";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  // NEXT_PUBLIC_SITE_URL은 로컬 개발에서 http://localhost 값을 갖는다.
  // canonical / Open Graph / sitemap은 외부에 공개되는 절대 URL이므로
  // 공개 가능한 https 주소일 때만 환경변수를 신뢰하고, 그 외에는 Production 주소를 쓴다.
  const usable = configured && /^https:\/\//i.test(configured) ? configured : PRODUCTION_SITE_URL;

  return usable.replace(/\/+$/, "");
}

/** 공개 홈페이지의 절대 URL (뒤쪽 슬래시 없음) */
export const siteUrl = resolveSiteUrl();

/** 공개 홈페이지에서 실제로 존재하는 URL 경로 (sitemap 기준) */
export const publicRoutes = ["/"] as const;

/**
 * 검색 결과에 노출하지 않을 관리/인증 경로.
 * robots.txt는 보안장치가 아니라 색인 제어 수단이므로,
 * 실제 접근 차단은 기존 Proxy(src/proxy.ts) + Supabase RLS가 담당한다.
 * 각 페이지에도 metadata robots: { index: false } 가 이미 설정되어 있다.
 */
export const noIndexRoutes = [
  "/admin",
  "/director",
  "/teacher",
  "/login",
  "/auth",
  // SERVICE-13 학부모 공유 링크. 개인 문서라 색인 대상이 아니다.
  // 실제 차단은 링크의 비밀값 + DB 함수 조건이 담당한다.
  "/share",
] as const;

/** 사이트 공통 SEO 텍스트 */
export const seoCopy = {
  siteName: "TeachAble Art Play",
  title: "TeachAble Art Play | 유치원 AI 성장기록 교육 플랫폼",
  description:
    "누리과정 연계 수업 콘텐츠부터 교사 운영, AI 성장기록, 학부모 리포트, 원장 대시보드까지 연결하는 SOYESKIDS의 유치원 교육 운영 플랫폼입니다.",
  keywords: [
    "TeachAble Art Play",
    "소예키즈",
    "유치원 교육",
    "누리과정",
    "유아 예술교육",
    "AI 성장기록",
    "유치원 교육 플랫폼",
  ],
  /** 카카오톡 · 문자 · SNS 공유 미리보기 문구 */
  openGraph: {
    title: "TeachAble Art Play | 아이의 놀이를 성장 이야기로 기록합니다",
    description:
      "누리과정 연계 수업부터 AI 성장기록, 학부모 리포트, 원장 대시보드까지 하나로 연결합니다.",
  },
} as const;
