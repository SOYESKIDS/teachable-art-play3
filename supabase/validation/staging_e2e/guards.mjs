// PHASE 09A — Staging E2E 안전장치 (모든 staging_e2e 스크립트가 먼저 부른다)
// ---------------------------------------------------------------------
// 원칙: positive allow-list + 알려진 Production · 다른 프로젝트 명시 deny. 조건이 하나라도 어긋나면 REFUSE TO RUN (fail closed).
// · Supabase project ref: supabase/.temp/project-ref 가 정확히 Staging(itcddooiuqsqingfhxkk) 일 때만
//   (supabase CLI `--linked` 도 같은 파일을 쓴다 · 그 대상을 바꾸는 env 가 있으면 거부)
// · App base URL: saas-v2 Preview alias **정확히 하나**만 (https · 기본 포트 · userinfo 없음)
//   Preview deployment 고유 URL 은 받지 않는다 — 같은 형식이 Production deployment 에도 쓰이기 때문
// · 앱 번들이 가리키는 Supabase ref 도 Staging 이어야 한다 (2중 확인)
// · 비밀 값은 존재 여부(PRESENT / MISSING)만 말한다 — 값은 출력 · 기록 · URL · 파일에 남기지 않는다
// · local-rehearsal: 127.0.0.1 / localhost 앱 + local Supabase 만 (harness 자체 검증용)

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const STAGING_PROJECT_REF = "itcddooiuqsqingfhxkk";
// Production · 기타 프로젝트 (supabase projects list 기준 · 명시 거부)
export const DENIED_PROJECT_REFS = ["vpppxuhodwauaclhybtg", "iwvxpbpqfwibghiwsjvz"];

export const PREVIEW_ALIAS = "https://teachable-art-play3-git-saas-v2-soyeskids-projects.vercel.app";
// 알려진 Production · 공개 host (명시 거부 · allow-list 밖이라 어차피 거부되지만 사유를 분명히 남긴다)
export const DENIED_HOSTS = ["teachable-art-play3.vercel.app", "teachable-art-play3-soyeskids-projects.vercel.app"];

// supabase CLI 의 대상 프로젝트 · DB 를 바꿀 수 있는 env (있으면 거부)
export const CLI_TARGET_ENV = ["SUPABASE_DB_URL", "SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_REF", "DATABASE_URL"];

export const SECRET_NAMES = {
  hqAdmin: "SOYE_STAGING_HQ_ADMIN_PASSWORD",
  hqSales: "SOYE_STAGING_HQ_SALES_PASSWORD",
  director: "SOYE_STAGING_DIRECTOR_PASSWORD",
  teacher: "SOYE_STAGING_TEACHER_PASSWORD",
};

// PHASE 09B: saas-v2 Preview alias 는 Vercel Deployment Protection Exception 으로 열린다 (그 alias 하나만 · Production 설정은 그대로).
// 자동화 bypass 비밀은 쓰지 않는다 — 여전히 SSO 로 가면 우회하지 않고 이 상태로 멈춘다.
export const PREVIEW_BLOCKED = "BLOCKED_BY_VERCEL_DEPLOYMENT_PROTECTION";
export const PASSWORDS_BLOCKED = "BLOCKED_PENDING_LOCAL_PASSWORDS";

/** Vercel SSO(Deployment Protection) 로그인 쪽으로 보내졌는지 */
export function isVercelSso(raw) {
  try {
    const url = new URL(raw);
    return url.hostname === "vercel.com" || url.hostname.endsWith(".vercel.com");
  } catch {
    return false;
  }
}

/**
 * Preview `/login` 접근 판정 (redirect 는 Preview origin 안에서만 따라간 결과).
 * vercel.com SSO → PREVIEW_BLOCKED (우회 시도 없음) · 그 밖의 외부 host → REFUSE · 앱 응답 200 → "REACHABLE"
 */
export function classifyPreviewAccess({ status, externalUrl = null }) {
  if (externalUrl) {
    if (isVercelSso(externalUrl)) return PREVIEW_BLOCKED;
    refuse(`Preview 가 허용 origin 밖으로 redirect 했다 (${new URL(externalUrl).host})`);
  }
  return status === 200 ? "REACHABLE" : `UNREACHABLE_STATUS_${status}`;
}

// remote 쓰기 E2E 가 소비할 수업 (사람이 승인한 합성 수업 1건 · 자동 선택 없음)
export const E2E_SESSION_ENV = "SOYE_STAGING_E2E_SESSION_ID";

export const ACCOUNTS = {
  hqAdmin: "staging-hq-admin@example.test",
  hqSales: "staging-hq-sales@example.test",
  director: "staging-director@example.test",
  teacher: "staging-teacher@example.test",
};

// 합성 데이터 표시 (기존 Staging seed: 이름에 "가상" · 새로 만드는 것: E2E_ 등)
export const SYNTHETIC_NAME = /(가상|STAGING_|PHASE09_|E2E_)/;
export const SYNTHETIC_EMAIL = /@example\.test$/i;
export const TEST_PREFIX = "E2E_";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RefuseToRun extends Error {
  constructor(reason) {
    super(reason);
    this.name = "RefuseToRun";
  }
}

export function refuse(reason) {
  throw new RefuseToRun(reason);
}

/** CLI 진입점: RefuseToRun → "REFUSE TO RUN" · exit 3 · 그 밖의 오류도 비밀을 가려 출력 */
export async function runMain(main) {
  try {
    await main();
  } catch (e) {
    if (e instanceof RefuseToRun) {
      console.error(`REFUSE TO RUN — ${redact(e.message)}`);
      process.exit(3);
    }
    console.error(`ERROR — ${redact(e?.message ?? String(e)).slice(0, 300)}`);
    process.exit(1);
  }
}

export function isUuid(value) {
  return typeof value === "string" && UUID.test(value);
}

/** supabase/.temp/project-ref 가 Staging 인지 · CLI 대상 env 가 없는지 (remote DB 조회 전 필수) */
export function assertStagingProjectRef({ root = ROOT, env = process.env } = {}) {
  for (const name of CLI_TARGET_ENV) {
    if (env[name]) refuse(`${name} 가 설정되어 있다 (supabase CLI 대상이 바뀔 수 있음)`);
  }
  const file = join(root, "supabase", ".temp", "project-ref");
  if (!existsSync(file)) refuse("supabase/.temp/project-ref 없음 (linked project 확인 불가)");
  const ref = readFileSync(file, "utf8").trim();
  if (!ref) refuse("linked project ref 가 비어 있다");
  if (DENIED_PROJECT_REFS.includes(ref)) refuse(`linked project ${ref} 는 Production · 다른 프로젝트다`);
  if (ref !== STAGING_PROJECT_REF) refuse(`linked project ref 가 Staging 이 아니다 (${ref})`);
  return ref;
}

function parseUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) refuse("base URL 이 비어 있다");
  try {
    return new URL(raw);
  } catch {
    return refuse("base URL 형식 오류");
  }
}

/** App base URL 이 saas-v2 Preview alias 인지 (정확히 일치 · origin 반환) */
export function assertPreviewBaseUrl(raw) {
  const url = parseUrl(raw);
  if (url.protocol !== "https:") refuse("https 가 아닌 base URL");
  if (url.username || url.password) refuse("userinfo 가 있는 base URL");
  if (DENIED_HOSTS.includes(url.hostname)) refuse(`Production · 공개 host 거부: ${url.hostname}`);
  if (url.origin !== PREVIEW_ALIAS) refuse(`허용되지 않은 host: ${url.host}`);
  return url.origin;
}

/** 현재 위치(redirect 이후)가 여전히 허용 origin 인지 — SSO · Production · 모르는 host 로 가면 거부 */
export function assertOnOrigin(currentUrl, expectedOrigin) {
  const url = parseUrl(currentUrl);
  if (url.origin !== expectedOrigin) refuse(`허용 origin 밖으로 이동했다 (${url.host})`);
  return true;
}

/** local-rehearsal: 127.0.0.1 / localhost 만 */
export function assertLocalBaseUrl(raw) {
  const url = parseUrl(raw);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) refuse(`local-rehearsal 은 localhost 만 허용 (${url.host})`);
  if (url.protocol !== "http:") refuse("local-rehearsal 은 http://127.0.0.1 만");
  return url.origin;
}

/** 앱 번들이 가리키는 Supabase project 가 기대와 같은지 (HTML · JS chunk 에서 *.supabase.co 탐색) */
export function assertBundleProjectRef(texts, { expectLocal = false } = {}) {
  const refs = new Set();
  for (const text of texts) {
    for (const m of String(text).matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/g)) refs.add(m[1]);
  }
  if (expectLocal) {
    if (refs.size > 0) refuse(`local-rehearsal 앱이 remote Supabase 를 가리킨다 (${[...refs].join(",")})`);
    return "local";
  }
  if (refs.size === 0) refuse("앱 번들에서 Supabase project ref 를 찾지 못했다");
  for (const ref of refs) {
    if (DENIED_PROJECT_REFS.includes(ref)) refuse(`앱이 Production · 다른 Supabase(${ref})를 가리킨다`);
    if (ref !== STAGING_PROJECT_REF) refuse(`앱이 Staging 이 아닌 Supabase(${ref})를 가리킨다`);
  }
  return STAGING_PROJECT_REF;
}

/**
 * remote 쓰기 대상 범위 판정 (sql/e2e_target_scope.sql 결과 1행).
 * 모두 만족해야 한다: 수업 존재 · scheduled (아직 소비 안 됨) · 기관 · 반 · 반의 모든 원아가 합성 표시 ·
 * 기관 구성원 전원 @example.test · DB 전체 비합성 사용자 0 · 반 쓰기 가능.
 */
export function assertSyntheticScope(row) {
  if (!row) refuse("대상 수업을 찾지 못했다");
  if (!row.session_found) refuse("대상 수업을 찾지 못했다");
  if (row.session_status !== "scheduled") refuse(`대상 수업이 이미 소비됐다 (status=${row.session_status}) — 새 합성 수업을 지정한다`);
  if (!row.org_synthetic) refuse("대상 기관 이름에 합성 표시가 없다");
  if (!row.class_synthetic) refuse("대상 반 이름에 합성 표시가 없다");
  if (row.children_total < 1 || row.children_synthetic !== row.children_total) refuse("대상 반에 합성 표시가 없는 원아가 있다");
  if (row.members_total < 1 || row.members_synthetic !== row.members_total) refuse("대상 기관에 합성 계정이 아닌 구성원이 있다");
  if (row.non_synthetic_users !== 0) refuse("DB 에 합성 계정이 아닌 사용자가 있다 (Staging 이 아닐 수 있음)");
  if (!row.class_mode_write) refuse("대상 반에 class_mode 쓰기 entitlement 가 없다");
  return true;
}

/** 비밀 값 존재 여부만 (값은 절대 반환하지 않는다) */
export function secretPresence(env = process.env) {
  return Object.fromEntries(Object.entries(SECRET_NAMES).map(([key, name]) => [key, env[name] ? "PRESENT" : "MISSING"]));
}

/** 비밀 값 (필요한 곳에서만 · fallback · 기본값 없음) */
export function getSecret(key, env = process.env) {
  return env[SECRET_NAMES[key]] ?? "";
}

/** 결과 · 로그에 비밀 · portal token 이 섞이지 않도록 마지막에 가린다 */
export function redact(text, env = process.env) {
  let out = String(text);
  for (const name of Object.values(SECRET_NAMES)) {
    const value = env[name];
    if (value && value.length >= 4) out = out.split(value).join("<redacted>");
  }
  return out
    .replace(/#[A-Za-z0-9_-]{32,}/g, "#<token>")
    .replace(/("token"\s*:\s*")[^"]+/g, "$1<token>");
}
