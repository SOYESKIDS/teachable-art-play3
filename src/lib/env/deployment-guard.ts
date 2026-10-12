/**
 * 배포 환경 가드 — 실행 묶음 E.
 *
 * 세 가지를 서버에서만 판정한다.
 *
 *   1. URL · 공개키 · 서버키가 **같은 Supabase 프로젝트 한 세트**인지
 *   2. 지금 실행 중인 배포가 운영(Production)인지 비운영(Preview · 로컬)인지
 *   3. 비운영 배포가 운영 프로젝트를 쓰고 있는지 (= 쓰기 보호가 필요한 상태인지)
 *
 * ★ 값을 밖으로 내보내지 않는다.
 *   프로젝트 ref 와 key 의 prefix 만 비교에 쓰고, 어떤 함수도 키·URL 전문을
 *   반환하지 않는다. 화면·로그·보고서에 나가는 것은 판정 결과(enum · boolean)뿐이다.
 *
 * ★ 기존 동작을 막지 않는다.
 *   `assertWriteAllowed()` 는 **옵트인**이다. 호출하지 않는 경로는 지금과 똑같이 동작한다.
 *   운영 배포에서는 어떤 경우에도 통과시킨다 — 실제 운영 상담 접수를 막으면 안 된다.
 *
 * ★ 이 파일은 판정만 한다.
 *   Preview 가 운영 DB 를 쓰는지 여부는 Vercel 환경변수 설정에 달려 있고,
 *   그 설정은 아직 확인 대기 상태다(04_원격확인기록 U-1). 가드는 "그런 상태라면
 *   쓰기를 막을 수 있다"는 경로를 준비해 두는 것이고, 설정 자체를 바꾸지 않는다.
 *
 * ★ 서버 전용이다. `server-only` 패키지는 이 프로젝트에 설치되어 있지 않으므로
 *   (의존성을 늘리지 않는다) `src/lib/supabase/admin.ts` 와 같은 런타임 가드를 쓴다.
 *   `SUPABASE_SECRET_KEY` 등은 NEXT_PUBLIC_ 접두어가 없어 브라우저 번들에
 *   인라인되지 않지만, 클라이언트에서 호출되면 조용히 오판하지 않고 즉시 멈춘다.
 */

function assertServerRuntime(fn: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`deployment-guard.${fn} must never run in the browser.`);
  }
}

/** 배포 환경. Vercel 이 주는 VERCEL_ENV 를 그대로 쓰고, 없으면 로컬로 본다. */
export type DeploymentEnv = "production" | "preview" | "development";

/** 환경변수 한 세트가 서로 맞는지에 대한 판정 */
export type EnvSetVerdict =
  /** URL · 공개키 · 서버키가 같은 프로젝트를 가리킨다 */
  | "consistent"
  /** 서버키가 없다 — 공개 화면만 쓰는 배포에서는 정상일 수 있다 */
  | "secret_absent"
  /** 서버키가 다른 프로젝트의 것으로 보인다 */
  | "project_mismatch"
  /** URL 또는 공개키가 없다 */
  | "incomplete";

export interface DeploymentContext {
  env: DeploymentEnv;
  envSet: EnvSetVerdict;
  /** 비운영 배포인가 */
  isNonProduction: boolean;
  /**
   * 비운영 배포가 "운영으로 보이는" 프로젝트에 붙어 있는가.
   *
   * 판정 근거는 `SUPABASE_PRODUCTION_PROJECT_REF` 환경변수 하나다.
   * 그 값이 설정되지 않으면 판정하지 않고 `null` 을 돌려준다 —
   * 추측으로 "운영이다"라고 단정하지 않는다.
   */
  nonProductionOnProductionData: boolean | null;
}

/**
 * Supabase URL 에서 프로젝트 ref 만 뽑는다.
 * `https://<ref>.supabase.co` 형태를 전제하고, 아니면 null.
 * ref 는 공개 식별자지만 이 모듈 밖으로 내보내지 않는다.
 */
function projectRefOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const [ref] = host.split(".");
    return ref && /^[a-z0-9]{16,32}$/.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

/**
 * 서버키가 어느 프로젝트의 것인지 확인한다.
 *
 * Supabase 의 새 secret key 는 프로젝트 ref 를 문자열 안에 담지 않는다.
 * 그래서 "다른 프로젝트 키"를 키 자체로 판정할 수는 없다. 대신 운영자가
 * `SUPABASE_SECRET_KEY_PROJECT_REF` 를 함께 설정하면 그 값으로 대조한다.
 * 설정이 없으면 대조를 건너뛴다 — 없는 근거로 불일치를 주장하지 않는다.
 */
function secretKeyRefOf(): string | null {
  const declared = process.env.SUPABASE_SECRET_KEY_PROJECT_REF;
  return declared && /^[a-z0-9]{16,32}$/.test(declared) ? declared : null;
}

export function readDeploymentEnv(): DeploymentEnv {
  const raw = process.env.VERCEL_ENV;
  if (raw === "production" || raw === "preview" || raw === "development") {
    return raw;
  }
  return "development";
}

export function evaluateEnvSet(): EnvSetVerdict {
  assertServerRuntime("evaluateEnvSet");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !publishable) return "incomplete";
  if (!secret) return "secret_absent";

  const urlRef = projectRefOf(url);
  const secretRef = secretKeyRefOf();

  // 대조할 근거가 없으면 불일치라고 하지 않는다.
  if (!urlRef || !secretRef) return "consistent";

  return urlRef === secretRef ? "consistent" : "project_mismatch";
}

export function getDeploymentContext(): DeploymentContext {
  assertServerRuntime("getDeploymentContext");
  const env = readDeploymentEnv();
  const envSet = evaluateEnvSet();
  const isNonProduction = env !== "production";

  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;
  const currentRef = projectRefOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

  let nonProductionOnProductionData: boolean | null = null;
  if (isNonProduction && productionRef && currentRef) {
    nonProductionOnProductionData = productionRef === currentRef;
  }

  return { env, envSet, isNonProduction, nonProductionOnProductionData };
}

/** 쓰기 보호가 켜져 있는지. 기본값은 꺼짐 — 기존 동작을 바꾸지 않는다. */
export function isNonProductionWriteGuardEnabled(): boolean {
  return process.env.BLOCK_WRITES_ON_PRODUCTION_DATA === "1";
}

export class NonProductionWriteBlockedError extends Error {
  constructor(
    readonly surface: string,
    /** 왜 막혔는가. 사용자 화면에 그대로 쓰지 않는다 */
    readonly verdict: Exclude<WriteGuardVerdict, "allow"> = "block_non_production_on_production",
  ) {
    super(`Write blocked (${verdict}): ${surface}`);
    this.name = "NonProductionWriteBlockedError";
  }
}

/** 쓰기 허용 판정 결과 */
export type WriteGuardVerdict =
  /** 써도 된다 */
  | "allow"
  /** 환경변수 한 세트가 서로 다른 프로젝트를 가리킨다 — 어느 배포에서든 막는다 */
  | "block_env_mismatch"
  /** URL 또는 공개키가 없다 */
  | "block_env_incomplete"
  /** 비운영 배포가 운영 데이터에 쓰려 한다 */
  | "block_non_production_on_production";

/**
 * 쓰기를 허용할지 판정한다.
 *
 * ── 운영 배포라는 이유만으로 통과시키지 않는다 ─────────────────────
 *
 * 이전 구현은 `env === "production"` 이면 곧바로 통과했다. 그러면 운영 배포가
 * 다른 프로젝트의 서버키를 들고 있어도 그대로 쓴다. 잘못된 세트는 운영에서
 * **더** 위험하므로, 세트 불일치는 배포 종류와 무관하게 막는다.
 *
 * ── 근거 없이 막지도 않는다 ────────────────────────────────────────
 *
 * `project_mismatch` 는 운영자가 `SUPABASE_SECRET_KEY_PROJECT_REF` 를 선언했을
 * 때만 나온다. 선언이 없으면 `evaluateEnvSet()` 이 `consistent` 를 돌려주므로
 * 기존 운영 상담은 정상 연결 조건에서 그대로 통과한다.
 *
 * ── 비운영 쓰기 차단은 옵트인이다 ──────────────────────────────────
 *
 * `BLOCK_WRITES_ON_PRODUCTION_DATA` 가 "1" 일 때만 적용되고, 판정 근거
 * (`SUPABASE_PRODUCTION_PROJECT_REF`)가 없으면 추측하지 않는다.
 */
export function evaluateWriteGuard(): WriteGuardVerdict {
  assertServerRuntime("evaluateWriteGuard");

  const envSet = evaluateEnvSet();

  // ★ 배포 종류와 무관하게 막는다. 잘못된 세트는 운영에서 더 위험하다.
  if (envSet === "project_mismatch") return "block_env_mismatch";
  if (envSet === "incomplete") return "block_env_incomplete";

  if (!isNonProductionWriteGuardEnabled()) return "allow";

  const { isNonProduction, nonProductionOnProductionData } = getDeploymentContext();
  if (!isNonProduction) return "allow";
  if (nonProductionOnProductionData !== true) return "allow";

  return "block_non_production_on_production";
}

/**
 * 쓰기가 막히면 예외를 던진다.
 *
 * @param surface 어떤 쓰기 경로인지. 오류 메시지에만 쓰이고 사용자 화면에는 나가지 않는다.
 */
export function assertWriteAllowed(surface: string): void {
  assertServerRuntime("assertWriteAllowed");

  const verdict = evaluateWriteGuard();
  if (verdict === "allow") return;

  throw new NonProductionWriteBlockedError(surface, verdict);
}

/**
 * 운영자 화면에 띄울 요약. **값이 아니라 판정만 담는다.**
 * `/admin/readiness` 같은 내부 화면에서 쓴다.
 */
export interface DeploymentGuardSummary {
  env: DeploymentEnv;
  envSet: EnvSetVerdict;
  /** 지금 쓰기가 허용되는가 */
  writeVerdict: WriteGuardVerdict;
  writeGuardEnabled: boolean;
  /** null = 판정 근거(운영 ref 설정)가 없다 */
  nonProductionOnProductionData: boolean | null;
  /** 운영자가 추가로 설정해야 하는 변수 이름 (값은 담지 않는다) */
  missingSettings: string[];
}

export function summarizeDeploymentGuard(): DeploymentGuardSummary {
  assertServerRuntime("summarizeDeploymentGuard");
  const ctx = getDeploymentContext();
  const missing: string[] = [];

  if (!process.env.SUPABASE_PRODUCTION_PROJECT_REF) {
    missing.push("SUPABASE_PRODUCTION_PROJECT_REF");
  }
  if (process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SECRET_KEY_PROJECT_REF) {
    missing.push("SUPABASE_SECRET_KEY_PROJECT_REF");
  }

  return {
    env: ctx.env,
    envSet: ctx.envSet,
    writeVerdict: evaluateWriteGuard(),
    writeGuardEnabled: isNonProductionWriteGuardEnabled(),
    nonProductionOnProductionData: ctx.nonProductionOnProductionData,
    missingSettings: missing,
  };
}
