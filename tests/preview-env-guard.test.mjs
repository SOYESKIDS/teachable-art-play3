/**
 * 새 디자인 Preview 빌드 보호장치 (scripts/preview-env-guard.mjs).
 *
 * ★ 대상 브랜치가 아니면 아무것도 막지 않는다 (로컬 · 다른 브랜치 · 운영).
 * ★ 대상 브랜치는 Staging 만 · 상속 비밀키 없음 · 쓰기 가드 켜짐 · 사이트 주소 일치일 때만 통과한다.
 * ★ 키 확인(네트워크)은 가짜 probe 로 대신한다 — 테스트는 외부에 요청하지 않는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GUARDED_BRANCH, PRODUCTION_REF, STAGING_REF, run } from "../scripts/preview-env-guard.mjs";

const good = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: GUARDED_BRANCH,
  VERCEL_BRANCH_URL: "teachable-art-play3-git-feat-classroom-abc123-soyeskids-projects.vercel.app",
  NEXT_PUBLIC_SITE_URL: "https://teachable-art-play3-git-feat-classroom-abc123-soyeskids-projects.vercel.app",
  NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  CONTENT_SOURCE: "database",
  BLOCK_WRITES_ON_PRODUCTION_DATA: "1",
  SUPABASE_PRODUCTION_PROJECT_REF: PRODUCTION_REF,
  SUPABASE_SECRET_KEY: "",
  OPENAI_API_KEY: "",
  PORTAL_THROTTLE_SALT: "x".repeat(43),
};
const probe = async (url) => (url.includes(STAGING_REF) ? 200 : 401);
const quiet = async (fn) => {
  const log = console.log;
  console.log = () => {};
  try { return await fn(); } finally { console.log = log; }
};

test("대상 브랜치가 아니면 건너뛴다 (다른 브랜치 · 로컬 · 운영 배포를 막지 않는다)", async () => {
  assert.equal(await quiet(() => run({ ...good, VERCEL_GIT_COMMIT_REF: "main", NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` }, probe)), true);
  assert.equal(await quiet(() => run({}, probe)), true);
});

test("올바른 Staging 설정이면 통과한다", async () => {
  assert.equal(await quiet(() => run(good, probe)), true);
});

const bad = {
  "Production URL": { NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` },
  "URL 누락": { NEXT_PUBLIC_SUPABASE_URL: "" },
  "production 빌드": { VERCEL_ENV: "production" },
  "상속된 서버 비밀키": { SUPABASE_SECRET_KEY: "fake-inherited-server-key" },
  "상속된 OpenAI 키": { OPENAI_API_KEY: "sk-inherited" },
  "쓰기 가드 꺼짐": { BLOCK_WRITES_ON_PRODUCTION_DATA: "" },
  "fixture 콘텐츠": { CONTENT_SOURCE: "fixture" },
  "운영 ref 미선언": { SUPABASE_PRODUCTION_PROJECT_REF: "" },
  "throttle salt 없음": { PORTAL_THROTTLE_SALT: "" },
  "비밀키를 공개 키 자리에": { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_oops" },
  "다른 브랜치 사이트 주소(상속)": { NEXT_PUBLIC_SITE_URL: "https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app" },
};
for (const [label, patch] of Object.entries(bad)) {
  test(`막는다 — ${label}`, async () => {
    assert.equal(await quiet(() => run({ ...good, ...patch }, probe)), false);
  });
}

test("공개 키가 Production 에서도 열리면(운영 키) 막는다 · 네트워크 실패도 막는다", async () => {
  assert.equal(await quiet(() => run(good, async () => 200)), false);
  assert.equal(await quiet(() => run(good, async () => { throw new Error("offline"); })), false);
});

test("vercel.json 은 빌드 앞에 보호장치를 두고, 다른 브랜치 배포 설정을 건드리지 않는다", () => {
  const cfg = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  // 첫 push 때만 이 브랜치 자동 배포를 껐다 (브랜치 전용 Staging 환경변수 등록 전). 등록 뒤에는 켠다.
  const dep = cfg.git?.deploymentEnabled;
  assert.ok(dep === undefined || (typeof dep === "object" && Object.keys(dep).every((k) => k === GUARDED_BRANCH)));
  assert.match(cfg.buildCommand, /^node scripts\/preview-env-guard\.mjs && npm run build$/);
});
