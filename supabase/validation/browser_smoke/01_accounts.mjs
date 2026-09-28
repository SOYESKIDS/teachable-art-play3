// LOCAL ONLY — 브라우저 smoke 가상 계정 생성 (local GoTrue admin API)
// ---------------------------------------------------------------------
// 사용: node supabase/validation/browser_smoke/01_accounts.mjs
// · 가상 도메인(example.test) · local 전용 비밀번호 · 이메일 확인 완료 상태
// · 이미 있으면 건너뛴다 · 값(key)은 출력하지 않는다
// · 지우기: npx supabase@2.113.0 db reset

import { readLocalSupabase } from "./local-env.mjs";

import { SMOKE_PASSWORD, SMOKE_USERS } from "./accounts.mjs";

const local = readLocalSupabase();
const headers = {
  apikey: local.secretKey,
  Authorization: `Bearer ${local.secretKey}`,
  "Content-Type": "application/json",
};

for (const email of SMOKE_USERS) {
  const response = await fetch(`${local.apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: SMOKE_PASSWORD, email_confirm: true }),
  });
  if (response.ok) {
    console.log(`created  ${email}`);
  } else {
    const body = await response.text();
    if (/already|exists|registered/i.test(body)) console.log(`exists   ${email}`);
    else {
      console.error(`failed   ${email} status=${response.status}`);
      process.exitCode = 1;
    }
  }
}
