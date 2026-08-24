import type { NextConfig } from "next";

/**
 * 공개 홈페이지 기본 보안 헤더.
 *
 * CSP는 이번 작업 범위에서 제외했다 — Next.js의 인라인 스크립트/스타일과
 * Supabase 인증 요청을 함께 허용하도록 정교하게 맞춰야 해서,
 * 잘못 설정하면 기존 /admin·/director 인증 흐름이 조용히 깨질 위험이 있다.
 * 여기서는 부작용 없이 안전한 헤더만 최소로 적용한다.
 *
 * clickjacking 방어는 CSP frame-ancestors가 상위 호환이지만,
 * CSP를 도입하지 않는 동안은 X-Frame-Options가 그 역할을 대신한다.
 * 나중에 CSP를 넣게 되면 frame-ancestors로 옮기고 이 헤더는 제거하면 된다.
 */
const securityHeaders = [
  // 선언된 Content-Type을 브라우저가 임의로 추측하지 않게 한다.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부 사이트로는 origin만 전달하고, https → http 강등 시에는 아예 보내지 않는다.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 공개 사이트에 필요 없는 위치정보와 광고 Topics만 차단한다.
  //
  // camera / microphone은 의도적으로 제한하지 않는다.
  // 향후 교사·원장 플랫폼에 사진 촬영/카메라 업로드를 붙일 때
  // 전역 차단이 걸려 있으면 기능이 조용히 막히기 때문이다.
  // (명시하지 않으면 기본 allowlist인 self가 적용되어 동일 출처에서는 사용 가능하다)
  {
    key: "Permissions-Policy",
    value: "geolocation=(), browsing-topics=()",
  },
  // 타 사이트 iframe 삽입 차단 (clickjacking 방어). 동일 출처 삽입은 허용.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  // 서버 스택 정보(X-Powered-By: Next.js) 노출 제거.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
