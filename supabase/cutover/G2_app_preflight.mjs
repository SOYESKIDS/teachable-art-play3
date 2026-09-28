// G-2 APPLICATION PREFLIGHT (READ ONLY) — HQ role / sensitive-access cutover 전 앱 점검
// ---------------------------------------------------------------------
// 사용:  node supabase/cutover/G2_app_preflight.mjs
//
// 배포하려는(또는 배포된) 앱 소스가 supabase/cutover/M3_hq_role_split_sensitive_access.sql 적용 후에도
// 동작하는지 정적으로 확인한다. 파일을 읽기만 하고 DB · 네트워크에 접근하지 않는다.
// 모든 항목이 PASS 일 때만 cutover 실행 시 `-v g2_app_preflight=passed` 를 줄 수 있다.
// 이 점검은 "코드가 준비됐는가"만 본다. 배포 상태 확인(/sales 동작 · 로그인)은 운영자가 따로 한다.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
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
const board = stripComments(read("src/components/staff/ObservationBoard.tsx"));
check("director observation UI renders no AI draft section", /role\s*===\s*["'`]teacher["'`][\s\S]{0,200}ObservationAiDraftSection|ObservationAiDraftSection[\s\S]{0,400}role\s*===\s*["'`]teacher["'`]/.test(board) || /showAi/.test(board));

// 7. 교사 · 원장 기본 화면 계열 switch: 기본 legacy · 서버 전용
const routing = existsSync(join(root, "src/lib/rollout/staff-app-routing.ts")) ? stripComments(read("src/lib/rollout/staff-app-routing.ts")) : "";
check(
  "staff app routing switch defaults to legacy and is server-only",
  /SOYE_SAAS_V2_APP_CUTOVER\s*===\s*["'`]true["'`]/.test(routing) && !/NEXT_PUBLIC/.test(routing),
);

// 결과
let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  → ${detail}` : ""}`);
}
console.log(`\nG-2 application preflight: ${results.length - failed}/${results.length} PASS`);
console.log(failed === 0 ? "VERDICT: PASS (코드 준비됨 · 배포 상태는 운영자가 별도 확인)" : "VERDICT: FAIL — cutover 를 적용하지 않는다");
process.exit(failed === 0 ? 0 : 1);
