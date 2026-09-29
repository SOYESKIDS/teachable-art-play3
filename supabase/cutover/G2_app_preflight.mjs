// G-2 APPLICATION PREFLIGHT (READ ONLY) — HQ role / sensitive-access cutover 전 앱 점검
// ---------------------------------------------------------------------
// 사용:  node supabase/cutover/G2_app_preflight.mjs [--root <점검할 앱 소스 루트>]
//        --root 를 주지 않으면 이 저장소 루트를 점검한다 (M5_app_preflight.mjs 와 같은 방식).
//
// 배포하려는(또는 배포된) 앱 소스가 supabase/cutover/M3_hq_role_split_sensitive_access.sql 적용 후에도
// 동작하는지 정적으로 확인한다. 파일을 읽기만 하고 DB · 네트워크에 접근하지 않는다.
// 모든 항목이 PASS 일 때만 cutover 실행 시 `-v g2_app_preflight=passed` 를 줄 수 있다.
// 이 점검은 "코드가 준비됐는가"만 본다. 배포 상태 확인(/sales 동작 · 로그인)은 운영자가 따로 한다.
//
// ★ 수명 주기 (PHASE 10B.1): 이 gate 는 **G-2 적용 직전에 배포되는 PRE-G2 빌드** 용이다.
//   J-ready / M5-ready 빌드(PHASE 10B 이후)는 legacy 라우팅 스위치 · legacy AI 쓰기 Action 을 의도적으로 지웠으므로
//   이 gate 를 통과하지 않는 것이 정상이다 — 그때는 예외(ENOENT) 없이 "lifecycle" 사유로 FAIL 한다.
//   G-2 가 이미 ACTIVE 인 환경에서 이 gate 의 FAIL 을 G-2 재적용 근거로 쓰지 않는다 (J 용 앱 gate = M5_app_preflight · JKL_start_gate).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootArg = process.argv.indexOf("--root");
const root = rootArg >= 0
  ? resolve(process.argv[rootArg + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function walk(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((entry) => {
    const full = join(abs, entry);
    const rel = relative(root, full).replaceAll("\\", "/");
    if (statSync(full).isDirectory()) return walk(rel);
    return /\.(ts|tsx|mjs|js)$/.test(entry) ? [rel] : [];
  });
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// 이 cutover 가 HQ(Admin · Sales) 에게서 직접 SELECT 를 거두는 테이블
const SENSITIVE_TABLES = [
  "class_session_observations",
  "class_session_observation_domains",
  "class_session_observation_media",
  "class_session_observation_ai_drafts",
  "child_growth_reports",
  "child_growth_report_sources",
];
const tablePattern = new RegExp(`\\.from\\(\\s*["'\`](${SENSITIVE_TABLES.join("|")})["'\`]\\s*\\)`);

// 1. Sales Shell 존재
const salesFiles = ["src/app/sales/layout.tsx", "src/app/sales/page.tsx", "src/app/sales/leads/page.tsx", "src/app/sales/organizations/page.tsx"];
const missingSales = salesFiles.filter((file) => !existsSync(join(root, file)));
check("HQ Sales routes (/sales shell) exist", missingSales.length === 0, missingSales.join(", "));

// 2. 로그인 분기: Sales → /sales
const adminLogin = stripComments(read("src/app/admin/login/actions.ts"));
check(
  "HQ login routes Sales to /sales by current_hq_role",
  /getHqRole|current_hq_role/.test(adminLogin) && /["'`]\/sales["'`]/.test(adminLogin),
);

// 3. Sales 코드: Sales 가드만 · 허용된 데이터 경로만
const salesTree = walk("src/app/sales");
const salesSources = salesTree.map((file) => ({ file, src: stripComments(read(file)) }));
const salesWithoutGuard = salesSources.filter(
  ({ file, src }) => /\/(page|layout)\.tsx$/.test(file) && !/requireHqSales\(/.test(src) && !/redirect\(/.test(src),
);
check("every Sales page/layout uses requireHqSales", salesWithoutGuard.length === 0, salesWithoutGuard.map((s) => s.file).join(", "));

const salesAdminGuard = salesSources.filter(({ src }) => /requireAdmin\(|has_soyes_admin_access|hasSoyesAdminAccess/.test(src));
check("Sales code does not rely on is_soyes_admin (requireAdmin / has_soyes_admin_access)", salesAdminGuard.length === 0, salesAdminGuard.map((s) => s.file).join(", "));

const ALLOWED_SALES_RPC = new Set(["hq_sales_organization_summary", "current_hq_role"]);
const salesRpc = salesSources.flatMap(({ file, src }) =>
  [...src.matchAll(/\.rpc\(\s*["'`]([a-z_]+)["'`]/g)].map((m) => ({ file, rpc: m[1] })),
);
const badRpc = salesRpc.filter(({ rpc }) => !ALLOWED_SALES_RPC.has(rpc));
check("Sales uses only permitted aggregate/commercial RPCs", badRpc.length === 0, badRpc.map((b) => `${b.file}:${b.rpc}`).join(", "));

const salesTables = salesSources.flatMap(({ file, src }) =>
  [...src.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)].map((m) => ({ file, table: m[1] })),
);
const badSalesTables = salesTables.filter(({ table }) => table !== "lead_submissions");
check("Sales pages read no tables other than leads", badSalesTables.length === 0, badSalesTables.map((b) => `${b.file}:${b.table}`).join(", "));

const salesImports = salesSources.flatMap(({ file, src }) =>
  [...src.matchAll(/from\s+["'`](@\/lib\/[^"'`]+)["'`]/g)].map((m) => ({ file, mod: m[1] })),
);
const ALLOWED_SALES_LIB = /^@\/lib\/(auth\/admin|admin\/lead-[a-z-]+|entitlement\/labels)$/;
const badImports = salesImports.filter(({ mod }) => !ALLOWED_SALES_LIB.test(mod));
check("Sales imports only lead / label / auth helpers", badImports.length === 0, badImports.map((b) => `${b.file}:${b.mod}`).join(", "));

const leadQueries = stripComments(read("src/lib/admin/lead-queries.ts"));
const leadTables = [...leadQueries.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)].map((m) => m[1]);
check("lead queries touch only lead_submissions", leadTables.every((table) => table === "lead_submissions"), leadTables.join(", "));

const salesAdminLinks = salesSources.filter(({ src }) => /href=\{?["'`]\/admin(?!\/(login|logout))/.test(src));
check("Sales shell does not link into old /admin pages", salesAdminLinks.length === 0, salesAdminLinks.map((s) => s.file).join(", "));

// 4. HQ Admin 코드: 민감 테이블 직접 SELECT 없음 (메타데이터 RPC · 지원 열람만)
const hqTree = [...walk("src/app/admin"), ...walk("src/lib/admin")];
const hqSensitive = hqTree
  .map((file) => ({ file, src: stripComments(read(file)) }))
  .filter(({ src }) => tablePattern.test(src) || /from\(\s*["'`]observation-media["'`]\s*\)/.test(src));
check("HQ Admin code reads no sensitive tables / photos directly", hqSensitive.length === 0, hqSensitive.map((s) => s.file).join(", "));

const hqMeta = ["hq_completed_legacy_report_meta", "hq_completed_legacy_report_counts", "hq_observed_session_ids"];
const hqSources = hqTree.map((file) => stripComments(read(file))).join("\n");
check("HQ Admin dashboards use the metadata RPCs", hqMeta.every((name) => hqSources.includes(`"${name}"`)));

// 5. requireAdmin 은 Admin 만 · leads 는 Admin + Sales (역할 RPC)
const adminAuth = stripComments(read("src/lib/auth/admin.ts"));
check("requireHqSales / requireHqStaff use current_hq_role", /requireHqSales/.test(adminAuth) && /requireHqStaff/.test(adminAuth) && /current_hq_role/.test(adminAuth));
const leadActions = stripComments(read("src/app/admin/(dashboard)/leads/actions.ts"));
check("lead write actions accept Sales via requireHqStaff (not is_soyes_admin)", /requireHqStaff\(/.test(leadActions) && !/requireAdmin\(/.test(leadActions));

// 6. 원장 화면이 AI 초안에 의존하지 않음 (cutover 후 원장 AI 초안 SELECT 제거)
//    PASS = 원장 보드가 AI 초안 영역을 교사에게만 렌더하거나(PRE-G2 형태) · AI 초안 영역을 아예 참조하지 않음(더 엄격)
//    원장 보드 파일이 없으면 판단할 수 없으므로 FAIL (필수 화면)
const BOARD_FILE = "src/components/staff/ObservationBoard.tsx";
if (!existsSync(join(root, BOARD_FILE))) {
  check("director observation UI renders no AI draft section", false, `${BOARD_FILE} missing`);
} else {
  const board = stripComments(read(BOARD_FILE));
  const teacherOnly = /role\s*===\s*["'`]teacher["'`][\s\S]{0,200}ObservationAiDraftSection|ObservationAiDraftSection[\s\S]{0,400}role\s*===\s*["'`]teacher["'`]/.test(board) || /showAi/.test(board);
  const noAiSection = !/ObservationAiDraftSection/.test(board);
  check("director observation UI renders no AI draft section", teacherOnly || noAiSection);
}

// 7. 교사 · 원장 기본 화면 계열 switch: 기본 legacy · 서버 전용  — PRE-G2 배포 전용 조건
//    파일이 없으면 PASS 가 아니다: J-ready 이후 빌드로 보고 lifecycle 사유로 FAIL 한다 (스위치를 다시 만들지 않는다).
const ROUTING_FILE = "src/lib/rollout/staff-app-routing.ts";
const routingPresent = existsSync(join(root, ROUTING_FILE));
const routing = routingPresent ? stripComments(read(ROUTING_FILE)) : "";
check(
  "staff app routing switch defaults to legacy and is server-only",
  routingPresent && /SOYE_SAAS_V2_APP_CUTOVER\s*===\s*["'`]true["'`]/.test(routing) && !/NEXT_PUBLIC/.test(routing),
  routingPresent ? "" : "pre-G2 routing switch absent; this source appears to be a post-G2 / J-ready build (G-2 app preflight not applicable)",
);

// 8. (PHASE 08 · D2) 기관 구성원 쓰기 = audited RPC 만 (cutover §5 가 직접 INSERT/UPDATE 를 회수)
const appSources = walk("src").map((file) => ({ file, src: stripComments(read(file)) }));
const memberWrites = appSources
  .filter(({ src }) => /\.from\(\s*["'`]organization_members["'`]\s*\)\s*\.(insert|update|upsert|delete)\(/.test(src))
  .map(({ file }) => file);
check("app writes organization_members only through audited RPC (no direct DML)", memberWrites.length === 0, memberWrites.join(", "));
const orgActions = stripComments(read("src/app/admin/(dashboard)/organizations/actions.ts"));
check("director · teacher invites use hq_add_organization_member", (orgActions.match(/["'`]hq_add_organization_member["'`]/g) ?? []).length >= 2);

// 9. (PHASE 08 · A1) AI provider 호출 전 DB 판정 (cutover §6 이 판정 없는 AI 초안 저장을 거부)
//    PHASE 10B.1: legacy AI 쓰기 Action 은 J-ready 빌드에서 지워질 수 있다 (M5 가 그 RPC 를 회수).
//    · 파일이 있으면 원래대로: 그 파일 안에 provider 호출이 있고 authorizeAiAssist 가 먼저여야 한다
//    · 파일이 없으면 "legacy AI 쓰기 경로 없음" 으로 기록한다 (그 자체로 PRE-G2 자격이 되지는 않는다 — 7 이 FAIL)
//    · 추가로(더 엄격) src 전체에서 provider 를 호출하는 모든 파일을 찾아 같은 순서를 요구한다 (새 호출 경로 누락 방지)
const PROVIDERS = ["generateObservationDraft(", "generateGrowthReportDraft("];
const AI_ACTIONS = [
  { file: "src/lib/staff/observation-ai-actions.ts", provider: "generateObservationDraft(" },
  { file: "src/lib/staff/growth-report-ai-actions.ts", provider: "generateGrowthReportDraft(" },
];
const gatedBefore = (src, provider) => {
  const gate = src.indexOf("authorizeAiAssist(");
  const call = src.indexOf(provider);
  return gate >= 0 && call >= 0 && gate < call;
};
const aiAbsent = AI_ACTIONS.filter(({ file }) => !existsSync(join(root, file))).map(({ file }) => file);
const aiUngated = AI_ACTIONS.filter(({ file }) => existsSync(join(root, file)))
  .filter(({ file, provider }) => !gatedBefore(stripComments(read(file)), provider))
  .map(({ file }) => file);
const otherCallers = appSources
  .filter(({ file }) => !file.startsWith("src/lib/ai/") && !AI_ACTIONS.some((a) => a.file === file))
  .flatMap(({ file, src }) => PROVIDERS.filter((p) => src.includes(p)).map((provider) => ({ file, provider, src })))
  .filter(({ src, provider }) => !gatedBefore(src, provider))
  .map(({ file }) => file);
check(
  "AI actions authorize (ai_assist · AR-8) before calling the provider",
  aiUngated.length === 0 && otherCallers.length === 0,
  [...aiUngated, ...otherCallers].join(", "),
);
if (aiAbsent.length > 0) {
  console.log(`NOTE  legacy AI write actions absent (removed with the legacy write path): ${aiAbsent.join(", ")}`);
}

// 결과
let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  → ${detail}` : ""}`);
}
console.log(`\nG-2 application preflight: ${results.length - failed}/${results.length} PASS`);
if (!routingPresent) {
  console.log(
    "LIFECYCLE: 이 소스는 PRE-G2 빌드가 아니다 (legacy 라우팅 스위치 없음 · J-ready / M5-ready 빌드로 보인다).\n" +
      "           G-2 app preflight 는 G-2 적용 직전의 PRE-G2 빌드 전용이다. G-2 가 이미 ACTIVE 이면 이 FAIL 을 재적용 근거로 쓰지 않는다.\n" +
      "           J 용 앱 gate = supabase/cutover/M5_app_preflight.mjs · supabase/cutover/JKL_start_gate.mjs · role E2E",
  );
}
console.log(failed === 0 ? "VERDICT: PASS (코드 준비됨 · 배포 상태는 운영자가 별도 확인)" : "VERDICT: FAIL — cutover 를 적용하지 않는다");
process.exit(failed === 0 ? 0 : 1);
