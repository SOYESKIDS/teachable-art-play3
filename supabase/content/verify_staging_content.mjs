// PHASE 10F — Staging 의 SOYE-STARTER-2026.1 콘텐츠 ↔ canonical 1:1 대조 (READ ONLY · 본문 출력 없음)
// ---------------------------------------------------------------------
// 실행: node supabase/content/verify_staging_content.mjs
// · 읽기 전용 runner(remote_readonly_query.mjs)의 경로 · 안전장치를 그대로 쓴다 (허용 SQL 파일 · read-only transaction · Staging ref · 합성 지문)
// · canonical section 본문 · 제목 · objective · source_ref 의 md5 를 로컬에서 계산해 Staging 행과 비교한다.

import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, runMain } from "../validation/staging_e2e/guards.mjs";
import { queryReadOnly } from "../validation/staging_e2e/remote_readonly_query.mjs";

const md5 = (text) => createHash("md5").update(String(text), "utf8").digest("hex");

export function expectedRows(build) {
  const { weeks } = build.loadPackage();
  const rows = [];
  for (const w of weeks) {
    for (const s of w.sections) {
      const origin = w.section_source_map[s.code];
      const ref = `${w.source.filename} ${origin} (sha256:${w.source.sha256.slice(0, 16)}) → ${s.code} · STARTER 2026.1 PHASE 10E`;
      rows.push({ week_no: w.week, title: w.title, objective_md5: md5(w.objective), section_code: s.code, body_md5: md5(s.body), body_chars: [...s.body].length, source_ref_md5: md5(ref) });
    }
  }
  return rows;
}

export function compare(expected, actual) {
  const key = (r) => `${r.week_no}:${r.section_code}`;
  const byKey = new Map(actual.map((r) => [key(r), r]));
  const mismatches = [];
  for (const e of expected) {
    const a = byKey.get(key(e));
    if (!a) { mismatches.push(`${key(e)} missing in Staging`); continue; }
    for (const f of ["title", "objective_md5", "body_md5", "body_chars", "source_ref_md5"]) {
      if (a[f] !== e[f]) mismatches.push(`${key(e)} ${f} differs`);
    }
    byKey.delete(key(e));
  }
  for (const k of byKey.keys()) mismatches.push(`${k} unexpected in Staging`);
  return mismatches;
}

async function main() {
  const build = await import(pathToFileURL(join(ROOT, "content", "starter", "2026.1", "build-sql.mjs")).href);
  const expected = expectedRows(build);
  const [res] = queryReadOnly("supabase/validation/staging_e2e/sql/p10f_starter_section_hashes.sql");
  if (!res || res.error) throw new Error(`query failed: ${res?.error ?? "no result"}`);
  const mismatches = compare(expected, res.rows);
  const statuses = [...new Set(res.rows.map((r) => r.lesson_status))];
  console.log(JSON.stringify({ expected_sections: expected.length, staging_sections: res.rows.length, lesson_statuses: statuses, mismatches: mismatches.slice(0, 20), mismatch_count: mismatches.length }));
  process.exit(mismatches.length === 0 ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runMain(main);
}
