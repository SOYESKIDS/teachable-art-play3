// Fail-closed build guard for the redesign Preview (feat/classroom-redesign-20261020).
//
// Runs before `next build` only through this branch's vercel.json buildCommand.
// It also checks the branch itself, so it is a no-op anywhere else (local builds,
// other branches, production) — it never blocks an existing deployment.
//
// For the guarded branch the build fails unless ALL of these hold:
//   · VERCEL_ENV is "preview" (this branch must never build as production)
//   · NEXT_PUBLIC_SUPABASE_URL points at the Staging project ref, never Production
//   · the publishable key is a publishable key and is accepted by Staging but rejected by Production
//   · CONTENT_SOURCE=database · BLOCK_WRITES_ON_PRODUCTION_DATA=1 · SUPABASE_PRODUCTION_PROJECT_REF set
//   · no server secret / OpenAI key is inherited (both must be empty)
//   · PORTAL_THROTTLE_SALT is present (share routes fail closed without it)
//
// Output lists check names and verdicts only — never values.

export const GUARDED_BRANCH = "feat/classroom-redesign-20261020";
export const STAGING_REF = "itcddooiuqsqingfhxkk";
export const PRODUCTION_REF = "vpppxuhodwauaclhybtg";

const refOf = (url) => {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

/** Pure checks (no network). Returns a list of { name, ok }. */
export function staticChecks(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  return [
    { name: "VERCEL_ENV is preview", ok: env.VERCEL_ENV === "preview" },
    { name: "Supabase URL is the Staging project", ok: refOf(url) === STAGING_REF },
    { name: "Supabase URL does not mention Production", ok: url !== "" && !url.includes(PRODUCTION_REF) },
    { name: "publishable key shape", ok: key.startsWith("sb_publishable_") && !key.startsWith("sb_secret_") },
    { name: "CONTENT_SOURCE=database", ok: env.CONTENT_SOURCE === "database" },
    { name: "BLOCK_WRITES_ON_PRODUCTION_DATA=1", ok: env.BLOCK_WRITES_ON_PRODUCTION_DATA === "1" },
    { name: "SUPABASE_PRODUCTION_PROJECT_REF declared", ok: env.SUPABASE_PRODUCTION_PROJECT_REF === PRODUCTION_REF },
    { name: "no inherited SUPABASE_SECRET_KEY", ok: !env.SUPABASE_SECRET_KEY },
    { name: "no inherited OPENAI_API_KEY", ok: !env.OPENAI_API_KEY },
    { name: "PORTAL_THROTTLE_SALT present", ok: (env.PORTAL_THROTTLE_SALT ?? "").length >= 32 },
    {
      name: "NEXT_PUBLIC_SITE_URL is this branch's alias (https://$VERCEL_BRANCH_URL)",
      ok: !!env.VERCEL_BRANCH_URL && env.NEXT_PUBLIC_SITE_URL === `https://${env.VERCEL_BRANCH_URL}`,
    },
  ];
}

async function status(url, key) {
  const r = await fetch(url, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
  return r.status;
}

/** Live check: the key must open Staging and be refused by Production. */
export async function keyChecks(env, probe = status) {
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  let staging = 0, production = 0;
  try {
    staging = await probe(`https://${STAGING_REF}.supabase.co/auth/v1/settings`, key);
    production = await probe(`https://${PRODUCTION_REF}.supabase.co/auth/v1/settings`, key);
  } catch {
    /* network failure → fail closed below */
  }
  return [
    { name: "key accepted by Staging", ok: staging === 200 },
    { name: "key refused by Production", ok: production === 401 || production === 403 },
  ];
}

export async function run(env = process.env, probe) {
  if (env.VERCEL !== "1" || env.VERCEL_GIT_COMMIT_REF !== GUARDED_BRANCH) {
    console.log("[preview-env-guard] not the guarded branch build — skipped");
    return true;
  }
  // 브랜치 주소는 비밀이 아니다 — 첫 빌드에서 NEXT_PUBLIC_SITE_URL 에 넣을 값을 알려 준다
  console.log(`[preview-env-guard] branch alias = https://${env.VERCEL_BRANCH_URL ?? "(unknown)"}`);
  const checks = [...staticChecks(env), ...(await keyChecks(env, probe))];
  for (const c of checks) console.log(`[preview-env-guard] ${c.ok ? "PASS" : "FAIL"} ${c.name}`);
  const ok = checks.every((c) => c.ok);
  console.log(`[preview-env-guard] ${ok ? "environment verified: Staging only" : "BLOCKED: refusing to build this Preview"}`);
  return ok;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/preview-env-guard.mjs")) {
  run().then((ok) => process.exit(ok ? 0 : 1));
}
