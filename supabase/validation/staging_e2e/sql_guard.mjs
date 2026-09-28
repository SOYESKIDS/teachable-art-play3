// PHASE 09A — remote 읽기 전용 SQL 판정 (순수 함수 · 네트워크 없음 · 단위 테스트 대상)
// ---------------------------------------------------------------------
// 1차: 허용 파일 · 문장 분리 · SELECT/WITH 시작 · 쓰기 키워드 거부 · 문자열/주석/dollar-quote 처리
// 2차: 실제 실행은 항상 `begin transaction read only; <문장>; rollback;` — 1차가 놓친 쓰기(예: 쓰기 함수 호출)도
//      Postgres 가 25006 으로 거부한다 (local 에서 검증: tests/harness_safety.test.mjs · docs/09 harness-safety-review.md)

import { isUuid, refuse } from "./guards.mjs";

export const ALLOWED_FILES = [
  /^supabase\/validation\/staging_e2e\/sql\/[a-z0-9_]+\.sql$/,
  /^supabase\/cutover\/(G1_preflight|G2_db_preflight|M5_preflight|JKL_window_preflight)\.sql$/,
];

export const WRITE_KEYWORDS =
  /\b(insert|update|delete|upsert|merge|create|alter|drop|truncate|grant|revoke|comment|copy|call|execute|prepare|vacuum|analyze|reindex|cluster|lock|listen|notify|unlisten|refresh|security|reset|discard|checkpoint|import|load|set_config|pg_advisory\w*|nextval|setval|dblink\w*|pg_terminate_backend|pg_cancel_backend|lo_\w+|pg_read_file|pg_write\w*|pg_sleep)\b|\bdo\b|\binto\b|\bset\b/i;

export function isAllowedFile(rel) {
  return ALLOWED_FILES.some((re) => re.test(rel));
}

/** 주석 · psql meta · 트랜잭션 제어를 빼고 문장 단위로 나눈다 (문자열 · dollar-quote 안의 ; 는 나누지 않는다) */
export function splitStatements(sql) {
  const src = String(sql)
    .split(/\r?\n/)
    .filter((l) => !/^\s*\\/.test(l))
    .join("\n");
  const out = [];
  let cur = "";
  let i = 0;
  let mode = null; // "'" | '"' | "--" | "/*" | "$tag$"
  let dollarTag = "";
  while (i < src.length) {
    const ch = src[i];
    const two = src.slice(i, i + 2);
    if (mode === null) {
      if (two === "--") { mode = "--"; i += 2; continue; }
      if (two === "/*") { mode = "/*"; i += 2; continue; }
      if (ch === "'" || ch === '"') { mode = ch; cur += ch; i += 1; continue; }
      const m = src.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) { mode = "$"; dollarTag = m[0]; cur += m[0]; i += m[0].length; continue; }
      if (ch === ";") { if (cur.trim()) out.push(cur.trim()); cur = ""; i += 1; continue; }
      cur += ch; i += 1; continue;
    }
    if (mode === "--") { if (ch === "\n") { mode = null; cur += "\n"; } i += 1; continue; }
    if (mode === "/*") { if (two === "*/") { mode = null; cur += " "; i += 2; } else i += 1; continue; }
    if (mode === "$") {
      if (src.startsWith(dollarTag, i)) { cur += dollarTag; i += dollarTag.length; mode = null; continue; }
      cur += ch; i += 1; continue;
    }
    // quoted string / identifier
    cur += ch;
    if (ch === mode) {
      if (src[i + 1] === mode) { cur += mode; i += 2; continue; }
      mode = null;
    }
    i += 1;
  }
  if (mode === "'" || mode === '"' || mode === "$" || mode === "/*") refuse("닫히지 않은 문자열 · 주석 · dollar-quote");
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => !/^(begin|commit|rollback|end|start\s+transaction|set\s+transaction)\b/i.test(s));
}

/** 문장 1개 판정 — 통과하면 true, 아니면 RefuseToRun */
export function validateStatement(statement, label = "sql") {
  const s = String(statement).trim();
  if (!s) refuse(`빈 문장 (${label})`);
  if (s.includes("$")) {
    // dollar-quote · 위치 파라미터 모두 허용하지 않는다 (preflight 에는 필요 없음)
    if (/\$[A-Za-z_]*\$/.test(s)) refuse(`dollar-quote 문장 (${label})`);
  }
  if (!/^(select|with)\b/i.test(s)) refuse(`SELECT/WITH 가 아닌 문장 (${label})`);
  const noLiterals = s.replace(/'([^']|'')*'/g, "''").replace(/"([^"]|"")*"/g, '""');
  if (WRITE_KEYWORDS.test(noLiterals)) refuse(`쓰기 · 세션 변경 키워드가 있는 문장 (${label})`);
  return true;
}

/** :'name' 자리표시자에 UUID 만 넣는다 (그 밖의 값 · 남은 자리표시자는 거부) */
export function bindUuidParams(statement, params) {
  let out = String(statement);
  for (const [name, value] of Object.entries(params ?? {})) {
    if (!/^[a-z_]+$/.test(name)) refuse(`파라미터 이름 오류 (${name})`);
    if (!isUuid(value)) refuse(`파라미터 ${name} 는 UUID 여야 한다`);
    out = out.split(`:'${name}'`).join(`'${value}'::uuid`);
  }
  if (/:'[a-z_]+'/.test(out)) refuse("채워지지 않은 파라미터");
  return out;
}

export function wrapReadOnly(statement) {
  return `begin transaction read only;\n${statement};\nrollback;\n`;
}
