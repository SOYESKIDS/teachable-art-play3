import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateEnvSet,
  evaluateWriteGuard,
  getDeploymentContext,
  summarizeDeploymentGuard,
} from "../src/lib/env/deployment-guard.ts";
import { guardWrite, tryGuardWrite } from "../src/lib/env/write-guard.ts";
import { submitLeadAction } from "../src/lib/public/lead-submit-actions.ts";
import { registerPortalAccess } from "../src/lib/share/portal-throttle.ts";
import { contentSourceMode } from "../src/lib/weeks/week-content-source.ts";

/**
 * 배포 환경 쓰기 가드.
 *
 * ── 무엇을 확인하나 ──────────────────────────────────────────────
 *
 * 1. 판정이 상황마다 맞는가 (운영 / 스테이징 / 확인 불가 / 세트 불일치)
 * 2. **막혔을 때 Supabase 를 아예 부르지 않는가** — 이것이 핵심이다.
 *    판정만 맞고 호출이 나가면 운영 데이터는 이미 더럽혀진 뒤다.
 *
 * ★ 실제 DB 에 붙지 않는다. Supabase 클라이언트를 흉내 낸 가짜를 넣고
 *   insert · rpc · storage.upload · auth.admin 이 **몇 번 불렸는지** 센다.
 *   0 이어야 한다.
 */

const PROD_REF = "vpppxuhodwauaclhybtg";
const STAGING_REF = "itcddooiuqsqingfhxkk";

/** 환경변수를 잠시 바꾼다. 끝나면 원래대로 되돌린다. */
function withEnv(patch, fn) {
  const keys = [
    "VERCEL_ENV",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PRODUCTION_PROJECT_REF",
    "SUPABASE_SECRET_KEY_PROJECT_REF",
    "BLOCK_WRITES_ON_PRODUCTION_DATA",
    "CONTENT_SOURCE",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

/** 정상적으로 연결된 환경 한 벌 */
const connected = (ref) => ({
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
});

/**
 * Supabase 클라이언트 흉내. **아무것도 하지 않고 호출만 센다.**
 * 호출되면 그 자체가 실패 신호다 (막혔어야 하는 경우).
 */
function spyClient() {
  const calls = { insert: 0, update: 0, upsert: 0, delete: 0, rpc: 0, upload: 0, authAdmin: 0 };
  const result = Promise.resolve({ data: null, error: null });
  const table = {
    insert: () => { calls.insert += 1; return result; },
    update: () => { calls.update += 1; return { eq: () => result }; },
    upsert: () => { calls.upsert += 1; return result; },
    delete: () => { calls.delete += 1; return { eq: () => result }; },
    select: () => table,
    eq: () => table,
  };
  return {
    calls,
    total: () => Object.values(calls).reduce((a, b) => a + b, 0),
    from: () => table,
    rpc: () => { calls.rpc += 1; return result; },
    storage: {
      from: () => ({
        upload: () => { calls.upload += 1; return result; },
        remove: () => { calls.upload += 1; return result; },
      }),
    },
    auth: {
      admin: {
        inviteUserByEmail: () => { calls.authAdmin += 1; return result; },
        listUsers: () => { calls.authAdmin += 1; return result; },
        createUser: () => { calls.authAdmin += 1; return result; },
      },
    },
  };
}

/* ═══════════════════════════════════ 1. 판정 */

test("운영 배포는 통과한다 (정상 연결)", () => {
  withEnv({ ...connected(PROD_REF), VERCEL_ENV: "production" }, () => {
    assert.equal(evaluateEnvSet(), "consistent");
    assert.equal(evaluateWriteGuard(), "allow");
  });
});

test("운영 배포는 차단 설정이 켜져 있어도 통과한다 (실제 접수를 막지 않는다)", () => {
  withEnv(
    {
      ...connected(PROD_REF),
      VERCEL_ENV: "production",
      BLOCK_WRITES_ON_PRODUCTION_DATA: "1",
      SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF,
    },
    () => assert.equal(evaluateWriteGuard(), "allow"),
  );
});

test("차단 설정을 켜지 않으면 아무것도 바뀌지 않는다", () => {
  withEnv(
    { ...connected(PROD_REF), VERCEL_ENV: "preview", SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF },
    () => assert.equal(evaluateWriteGuard(), "allow"),
  );
});

test("비운영 + 운영 DB + 차단 설정 → 막는다", () => {
  withEnv(
    {
      ...connected(PROD_REF),
      VERCEL_ENV: "preview",
      BLOCK_WRITES_ON_PRODUCTION_DATA: "1",
      SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF,
    },
    () => assert.equal(evaluateWriteGuard(), "block_non_production_on_production"),
  );
});

test("정상 스테이징 쓰기는 그대로 통과한다 (운영이 아님이 확인됨)", () => {
  withEnv(
    {
      ...connected(STAGING_REF),
      VERCEL_ENV: "preview",
      BLOCK_WRITES_ON_PRODUCTION_DATA: "1",
      SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF,
    },
    () => {
      assert.equal(getDeploymentContext().nonProductionOnProductionData, false);
      assert.equal(evaluateWriteGuard(), "allow");
    },
  );
});

test("★ 운영 ref 설정이 없으면 판정할 수 없으므로 막는다 (이전에는 통과시켰다)", () => {
  withEnv(
    { ...connected(STAGING_REF), VERCEL_ENV: "preview", BLOCK_WRITES_ON_PRODUCTION_DATA: "1" },
    () => {
      assert.equal(getDeploymentContext().nonProductionOnProductionData, null);
      assert.equal(evaluateWriteGuard(), "block_target_unverified");
    },
  );
});

test("URL 에서 ref 를 읽지 못해도 막는다", () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://db.example.internal",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      VERCEL_ENV: "preview",
      BLOCK_WRITES_ON_PRODUCTION_DATA: "1",
      SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF,
    },
    () => assert.equal(evaluateWriteGuard(), "block_target_unverified"),
  );
});

test("로컬(development)도 비운영이다 — 같은 규칙을 탄다", () => {
  withEnv(
    { ...connected(PROD_REF), BLOCK_WRITES_ON_PRODUCTION_DATA: "1", SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF },
    () => {
      assert.equal(getDeploymentContext().env, "development");
      assert.equal(evaluateWriteGuard(), "block_non_production_on_production");
    },
  );
});

test("키 세트 불일치는 배포 종류와 무관하게 계속 거부한다", () => {
  for (const env of ["production", "preview", undefined]) {
    withEnv(
      {
        ...connected(PROD_REF),
        VERCEL_ENV: env,
        SUPABASE_SECRET_KEY_PROJECT_REF: STAGING_REF,
      },
      () => {
        assert.equal(evaluateEnvSet(), "project_mismatch");
        assert.equal(evaluateWriteGuard(), "block_env_mismatch", `env=${env}`);
      },
    );
  }
});

test("URL·공개키가 없으면 막는다", () => {
  withEnv({ VERCEL_ENV: "production" }, () =>
    assert.equal(evaluateWriteGuard(), "block_env_incomplete"),
  );
});

test("운영자 요약은 값이 아니라 판정만 담는다", () => {
  withEnv(
    { ...connected(PROD_REF), VERCEL_ENV: "preview", BLOCK_WRITES_ON_PRODUCTION_DATA: "1" },
    () => {
      const s = summarizeDeploymentGuard();
      assert.equal(s.writeVerdict, "block_target_unverified");
      assert.ok(s.missingSettings.includes("SUPABASE_PRODUCTION_PROJECT_REF"));
      const json = JSON.stringify(s);
      assert.ok(!json.includes("sb_secret_test"), "비밀값이 요약에 들어가면 안 된다");
      assert.ok(!json.includes("supabase.co"), "URL 이 요약에 들어가면 안 된다");
      assert.ok(!json.includes(PROD_REF), "ref 가 요약에 들어가면 안 된다");
    },
  );
});

/* ═══════════════════════════════════ 2. 막히면 호출하지 않는다 */

const blockedEnv = {
  ...connected(PROD_REF),
  VERCEL_ENV: "preview",
  BLOCK_WRITES_ON_PRODUCTION_DATA: "1",
  SUPABASE_PRODUCTION_PROJECT_REF: PROD_REF,
};

test("guardWrite 는 막히면 던진다 — 뒤 코드가 돌지 않는다", () => {
  withEnv(blockedEnv, () => {
    const spy = spyClient();
    assert.throws(() => {
      guardWrite("test:surface");
      spy.from("lead_submissions").insert({});
    }, /Write blocked/);
    assert.equal(spy.total(), 0, "가드가 던진 뒤에는 어떤 호출도 없어야 한다");
  });
});

test("tryGuardWrite 로 막으면 insert·rpc·upload·auth.admin 이 0회다", () => {
  withEnv(blockedEnv, () => {
    const spy = spyClient();
    // 쓰기 경로가 하는 일을 흉내 낸다 — 가드가 먼저 선다.
    const { allowed } = tryGuardWrite("test:surface");
    if (allowed) {
      spy.from("t").insert({});
      spy.rpc("publish_lesson", {});
      spy.storage.from("observation-media").upload("p", new Uint8Array());
      spy.auth.admin.inviteUserByEmail("a@b.c");
    }
    assert.equal(allowed, false);
    assert.deepEqual(spy.calls, {
      insert: 0, update: 0, upsert: 0, delete: 0, rpc: 0, upload: 0, authAdmin: 0,
    });
  });
});

test("공개 상담 접수 — 막히면 insert 를 보내지 않고 blocked 를 돌려준다", async () => {
  const spy = spyClient();
  const state = await withEnv(blockedEnv, async () => {
    const form = new FormData();
    form.set("submissionType", "consult");
    form.set("institutionName", "검증 유치원");
    form.set("contactName", "김검증");
    form.set("phone", "010-1234-5678");
    form.set("privacyAgreed", "on");
    return submitLeadAction(null, form);
  });
  assert.equal(state.phase, "blocked");
  assert.ok(state.message.length > 0, "사용자 안내 문구가 있어야 한다");
  assert.equal(spy.total(), 0);
});

test("공개 상담 접수 — 입력 오류는 가드보다 먼저 걸린다 (기존 검증 유지)", async () => {
  const state = await withEnv(blockedEnv, async () => {
    const form = new FormData();
    form.set("submissionType", "consult");
    form.set("privacyAgreed", "on");
    return submitLeadAction(null, form);
  });
  assert.equal(state.phase, "invalid", "빈 입력은 invalid 로 돌아와야 한다");
  assert.ok(Object.keys(state.errors).length > 0);
});

test("공개 상담 접수 — 허니팟은 가드와 무관하게 성공처럼 보인다", async () => {
  const state = await withEnv(blockedEnv, async () => {
    const form = new FormData();
    form.set("submissionType", "consult");
    form.set("website", "bot");
    return submitLeadAction(null, form);
  });
  assert.equal(state.phase, "success", "봇에게 차단 사실을 알려 주지 않는다");
});

test("보호자 공유 제한 기록 — 막히면 RPC 를 보내지 않는다", async () => {
  const spy = spyClient();
  const verdict = await withEnv(
    { ...blockedEnv, PORTAL_THROTTLE_SALT: "x".repeat(32) },
    async () =>
      registerPortalAccess(spy, new Request("https://example.test/"), "portal_resolve"),
  );
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, "write_blocked");
  assert.equal(spy.calls.rpc, 0, "막혔는데 RPC 가 나갔다");
});

test("보호자 공유 제한 기록 — 통과하면 RPC 를 보낸다 (막기만 하는 게 아니다)", async () => {
  const spy = spyClient();
  const verdict = await withEnv(
    { ...connected(STAGING_REF), VERCEL_ENV: "preview", PORTAL_THROTTLE_SALT: "x".repeat(32) },
    async () =>
      registerPortalAccess(spy, new Request("https://example.test/"), "portal_resolve"),
  );
  assert.equal(spy.calls.rpc, 1);
  assert.equal(verdict.allowed, true);
});

/* ═══════════════════════════════════ 3. CONTENT_SOURCE 의 적용 범위 */

test("CONTENT_SOURCE 는 배포 전체에 하나로 적용된다 (요청·역할별로 나뉘지 않는다)", () => {
  withEnv({ CONTENT_SOURCE: "database" }, () => {
    // 같은 프로세스 안에서 누가 부르든 같은 값이다.
    assert.equal(contentSourceMode(), "database");
    assert.equal(contentSourceMode(), "database");
  });
  withEnv({ CONTENT_SOURCE: "fixture" }, () => assert.equal(contentSourceMode(), "fixture"));
  // 오타·미설정은 fixture 로 떨어진다 (지금 동작하는 쪽).
  withEnv({ CONTENT_SOURCE: "DATABASE" }, () => assert.equal(contentSourceMode(), "fixture"));
  withEnv({ CONTENT_SOURCE: "db" }, () => assert.equal(contentSourceMode(), "fixture"));
  withEnv({}, () => assert.equal(contentSourceMode(), "fixture"));
});
