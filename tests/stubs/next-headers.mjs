/**
 * `next/headers` 테스트 스텁.
 *
 * ── 왜 필요한가 ───────────────────────────────────────────────────
 *
 * 쓰기 가드 테스트는 `submitLeadAction` 을 그대로 불러 **막혔을 때 Supabase 를
 * 부르지 않는지** 본다. 그 모듈은 `@/lib/supabase/server` 를 import 하고, 그쪽이
 * `next/headers` 를 쓴다. Next 의 요청 컨텍스트가 없는 `node --test` 환경에서는
 * 그 패키지를 ESM 으로 해석하지 못한다 (ERR_MODULE_NOT_FOUND).
 *
 * ── 왜 스텁이어도 괜찮은가 ────────────────────────────────────────
 *
 * 검사하려는 경로에서는 `cookies()` 가 **불리지 않는다.** 가드가 먼저 막아
 * Supabase 클라이언트를 만들기 전에 돌아오기 때문이다.
 *
 * ★ 그래서 조용히 빈 쿠키를 돌려주지 않고 **던진다.** 빈 값을 돌려주면
 *   「안 불렸다」와 「불렸는데 비어 있었다」를 구분할 수 없다. 던지면 가드가
 *   새는 순간 테스트가 그 자리에서 깨진다.
 */
export function cookies() {
  throw new Error(
    "next/headers.cookies() 가 테스트에서 호출됐다 — 가드가 막기 전에 Supabase 클라이언트를 만들었다는 뜻이다.",
  );
}

export function headers() {
  throw new Error("next/headers.headers() 가 테스트에서 호출됐다.");
}

export function draftMode() {
  throw new Error("next/headers.draftMode() 가 테스트에서 호출됐다.");
}
