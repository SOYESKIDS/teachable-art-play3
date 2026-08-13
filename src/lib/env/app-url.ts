/**
 * 앱의 절대 URL 확인.
 *
 * 초대 메일의 redirect 링크를 만들 때 쓴다.
 * localhost를 코드에 하드코딩하지 않는다 — 환경변수로만 결정한다.
 *
 * 우선순위
 *   1. NEXT_PUBLIC_SITE_URL           (로컬/운영 모두 이 값을 명시하는 것을 권장)
 *   2. VERCEL_PROJECT_PRODUCTION_URL  (Vercel 운영 도메인)
 *   3. VERCEL_URL                     (Vercel Preview 배포)
 *
 * 셋 다 없으면 조용히 잘못된 링크를 보내는 대신 명시적으로 실패한다.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelPreview = process.env.VERCEL_URL?.trim();

  const raw =
    explicit ||
    (vercelProduction ? `https://${vercelProduction}` : "") ||
    (vercelPreview ? `https://${vercelPreview}` : "");

  if (!raw) {
    throw new Error(
      "App URL is not configured. Set NEXT_PUBLIC_SITE_URL in the environment.",
    );
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  // 뒤쪽 슬래시를 제거해 경로를 붙일 때 `//`가 생기지 않게 한다.
  return withProtocol.replace(/\/+$/, "");
}

/** 앱 내부 절대 URL 생성 (path는 반드시 "/"로 시작) */
export function buildAppUrl(path: string): string {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
