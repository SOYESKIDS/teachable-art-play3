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
 * node_modules 패키지 이름은 건드리지 않는다.
 */

const HAS_EXTENSION = /\.[A-Za-z0-9]+$/;
const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
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
