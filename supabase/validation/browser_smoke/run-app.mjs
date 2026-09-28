// LOCAL ONLY — local Supabase 값으로 앱 build / start (브라우저 smoke 용)
// 사용:
//   node supabase/validation/browser_smoke/run-app.mjs build
//   node supabase/validation/browser_smoke/run-app.mjs start legacy|saas-v2
// · .env.local 을 만들지 않고 이 프로세스의 env 로만 넘긴다 · 값은 출력하지 않는다
// · build 산출물(.next)에는 local URL · local publishable key 만 들어간다 (git ignore 대상)
//   smoke 후 `npm run build` 를 다시 실행하면 env 없는 기본 산출물로 돌아간다
// · 같은 프로젝트에 이미 `next dev` 가 떠 있어도 충돌하지 않도록 dev 대신 build + start(포트 3100)를 쓴다
// · SOYE_SAAS_V2_APP_CUTOVER 는 요청 시점에 서버가 읽으므로 build 한 번으로 두 모드를 모두 점검한다

import { spawn } from "node:child_process";
import { appEnv, readLocalSupabase } from "./local-env.mjs";

const [command, mode = "legacy"] = process.argv.slice(2);
if (!["build", "start"].includes(command) || !["legacy", "saas-v2"].includes(mode)) {
  console.error("usage: node supabase/validation/browser_smoke/run-app.mjs build | start legacy|saas-v2");
  process.exit(2);
}

const env = { ...process.env, ...appEnv(readLocalSupabase(), { saasV2: mode === "saas-v2" }) };
const cmd = command === "build" ? "npx next build" : "npx next start -p 3100 -H 127.0.0.1";
console.log(`[smoke] ${cmd} (mode=${mode}, local Supabase)`);
const child = spawn(cmd, { env, shell: true, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
