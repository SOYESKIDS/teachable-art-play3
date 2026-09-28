// LOCAL ONLY — 브라우저 smoke 가상 사진(1×1 PNG) 을 local Storage 에 올린다
// 사용: node supabase/validation/browser_smoke/03_media.mjs   (02_seed.sql 이후)
// 경로는 02_seed.sql 의 class_session_observation_media.storage_path 와 같다. 지우기: db reset

import { createHash } from "node:crypto";
import { readLocalSupabase } from "./local-env.mjs";

const u = (key) => {
  const hex = createHash("md5").update(`smoke:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// 1×1 PNG (가상 이미지 · 색만 다름)
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const local = readLocalSupabase();
for (let n = 1; n <= 4; n += 1) {
  const path = `${u("orgV")}/${u("s:V:w1")}/${u("V:ch1")}/${u(`mdV${n}`)}.png`;
  const response = await fetch(`${local.apiUrl}/storage/v1/object/observation-media/${path}`, {
    method: "POST",
    headers: {
      apikey: local.secretKey,
      Authorization: `Bearer ${local.secretKey}`,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: PNG,
  });
  console.log(`${response.ok ? "uploaded" : `failed(${response.status})`} photo ${n}`);
  if (!response.ok) process.exitCode = 1;
}
