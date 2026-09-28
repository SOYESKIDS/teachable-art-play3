// LOCAL ONLY — local Supabase 값 읽기 (브라우저 smoke 용)
// ---------------------------------------------------------------------
// `npx supabase@2.113.0 status -o env` 결과에서 local 값만 메모리로 읽는다.
// · 값을 출력하거나 파일로 저장하지 않는다 (.env.local 을 만들지 않는다)
// · API URL 이 localhost / 127.0.0.1 이 아니면 즉시 중단한다 (remote 차단)
// · Docker 가 PATH 에 있어야 한다 (supabase CLI 가 local 컨테이너를 조회)

import { spawnSync } from "node:child_process";

export function readLocalSupabase() {
  const result = spawnSync("npx supabase@2.113.0 status -o env", { encoding: "utf8", shell: true });
  if (result.status !== 0) {
    throw new Error("supabase status failed (local stack running? docker on PATH?)");
  }

  const values = {};
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (match) values[match[1]] = match[2];
  }

  const apiUrl = values.API_URL ?? "";
  const host = (() => {
    try {
      return new URL(apiUrl).hostname;
    } catch {
      return "";
    }
  })();
  if (!["127.0.0.1", "localhost"].includes(host)) {
    throw new Error("refusing: Supabase API URL is not local");
  }
  for (const key of ["PUBLISHABLE_KEY", "SECRET_KEY"]) {
    if (!values[key]) throw new Error(`missing local ${key} in supabase status`);
  }

  return {
    apiUrl,
    publishableKey: values.PUBLISHABLE_KEY,
    secretKey: values.SECRET_KEY,
  };
}

/** next dev 에 넘길 env (앱이 읽는 이름으로 매핑 · 값은 local) */
export function appEnv(local, { saasV2 }) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: local.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
    SUPABASE_SECRET_KEY: local.secretKey,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
    SOYE_SAAS_V2_APP_CUTOVER: saasV2 ? "true" : "",
    // AI 는 설정하지 않는다 (AR-8 · 외부 호출 없음)
    OPENAI_API_KEY: "",
  };
}
