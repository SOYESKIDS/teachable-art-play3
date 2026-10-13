/**
 * 테스트 실행 전에 해석 훅을 등록한다.
 *
 * `node --import ./tests/register-hooks.mjs --test ...` 로 쓴다.
 * 제품 코드에는 아무 영향이 없다 — 테스트 실행에만 등록된다.
 */
import { register } from "node:module";

register("./ts-resolve-hook.mjs", import.meta.url);
