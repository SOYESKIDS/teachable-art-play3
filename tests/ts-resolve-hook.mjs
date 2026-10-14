/**
 * 테스트 전용 모듈 해석 훅.
 *
 * ── 왜 필요한가 ───────────────────────────────────────────────────
 *
 * 저장소의 TypeScript 는 `import { x } from "./y"` 처럼 확장자 없이 적는다
 * (Next.js · tsc 가 해석한다). 그런데 `node --test` 가 `.ts` 를 직접 실행할
 * 때는 Node 의 ESM 해석기를 쓰고, 그쪽은 확장자 없는 상대 경로를 찾지 못한다.
 *
 * ── 왜 소스를 고치지 않는가 ──────────────────────────────────────
 *
 * 테스트를 돌리려고 애플리케이션 코드의 import 스타일을 바꾸면, 테스트 사정이
 * 제품 코드에 번진다. 그래서 **테스트 쪽에서만** 확장자를 붙여 본다.
 *
 * ── 하는 일 ───────────────────────────────────────────────────────
 *
 * 상대 경로에 확장자가 없을 때만 `.ts` → `.tsx` → `/index.ts` 순으로 시도하고,
 * 모두 실패하면 원래 지정자로 넘긴다 (원래 오류를 그대로 보여 주기 위해).
 * `@/` 별칭은 tsconfig 와 같은 규칙으로 `src/` 로 바꾼다.
 * node_modules 패키지 이름은 건드리지 않는다.
 */

const HAS_EXTENSION = /\.[A-Za-z0-9]+$/;
const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * `@/` 경로 별칭.
 *
 * tsconfig 의 `paths` 가 `@/*` → `src/*` 로 두고 있고, Next 가 그것을 해석한다.
 * Node 는 모른다. 그래서 테스트에서만 같은 규칙으로 바꿔 준다.
 */
const ALIAS = "@/";
const SRC_URL = new URL("../src/", import.meta.url);

/**
 * Next 런타임 전용 모듈의 테스트 스텁.
 *
 * `next/headers` 는 요청 컨텍스트가 있어야 하고, `node --test` 는 ESM 으로
 * 해석하지도 못한다. 가드 테스트는 그 모듈에 닿기 **전에** 막히는 것을 보는
 * 것이므로, 불리면 던지는 스텁으로 바꿔 둔다 (tests/stubs/next-headers.mjs).
 *
 * ★ 제품 코드는 건드리지 않는다. 바꿔치기는 테스트 해석기 안에서만 일어난다.
 */
const RUNTIME_STUBS = new Map([
  ["next/headers", new URL("./stubs/next-headers.mjs", import.meta.url).href],
]);

export async function resolve(specifier, context, nextResolve) {
  const stub = RUNTIME_STUBS.get(specifier);
  if (stub) return { url: stub, shortCircuit: true };

  if (specifier.startsWith(ALIAS)) {
    const target = new URL(specifier.slice(ALIAS.length), SRC_URL).href;
    if (!HAS_EXTENSION.test(target)) {
      for (const suffix of CANDIDATES) {
        try {
          return await nextResolve(target + suffix, context);
        } catch {
          // 다음 후보를 시도한다.
        }
      }
    }
    return nextResolve(target, context);
  }

  const relative = specifier.startsWith("./") || specifier.startsWith("../");

  if (relative && !HAS_EXTENSION.test(specifier)) {
    for (const suffix of CANDIDATES) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // 다음 후보를 시도한다.
      }
    }
  }

  return nextResolve(specifier, context);
}
