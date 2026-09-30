// PHASE 10D — STARTER "8주 기록 모아보기" 앱 수락 테스트 (node:test · 새 npm 의존성 없음 · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase10d/starter_summary.test.mjs
//
// · 순수 계산(src/lib/staff/program-summary-window.ts)은 Node 의 TypeScript type stripping 으로 직접 import 해 실행한다.
// · loader · 화면 · page 는 정적 검사 (쓰기 · AI · 점수 표현 · 역할 · 기관 확인).
// · DB 범위(RLS · 완료본만 · 다른 반 · 다른 기관 · 지문 불변)는 supabase/tests/p0_phase10d_starter_summary.test.sql 이 판정한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const WINDOW = "src/lib/staff/program-summary-window.ts";
const LOADER = "src/lib/staff/program-summary-queries.ts";
const VIEW = "src/components/staff/ProgramSummaryView.tsx";
const PAGES = {
  teacher: "src/app/teacher/growth-reports/weekly/[reportId]/summary/page.tsx",
  director: "src/app/director/growth-reports/weekly/[reportId]/summary/page.tsx",
};
const SEED = "supabase/migrations/20261001100000_m2_fact_backfill_reference_seed.sql";

const W = await import(pathToFileURL(join(root, WINDOW)).href);

// ── 1. STARTER = 8주 ─────────────────────────────────────────
test("1. STARTER 2026.1 is seeded as week 1~8 and the summary block is 8 weeks", () => {
  assert.match(read(SEED), /\('starter',\s*'2026\.1',\s*1,\s*8,/);
  assert.equal(W.SUMMARY_WEEKS, 8);
  for (let anchor = 1; anchor <= 8; anchor += 1) {
    assert.deepEqual(W.summaryWindow(anchor, 1, 8), { from: 1, to: 8, inContract: true }, `anchor W${anchor}`);
  }
});

// ── 4. 구간 밖 주를 조용히 섞지 않는다 ────────────────────────
test("4. window never silently exceeds the contract range; out-of-range anchors are flagged", () => {
  // 계약 범위 안: 끝은 계약 끝을 넘지 않는다 (Pilot 1~4)
  assert.deepEqual(W.summaryWindow(3, 1, 4), { from: 1, to: 4, inContract: true });
  // STANDARD 1~24: 8주 단위 구간
  assert.deepEqual(W.summaryWindow(9, 1, 24), { from: 9, to: 16, inContract: true });
  assert.deepEqual(W.summaryWindow(24, 1, 24), { from: 17, to: 24, inContract: true });
  // 이전 계약보다 뒤 주차(계약 끝 밖) → 표시하되 inContract=false (화면 안내)
  assert.deepEqual(W.summaryWindow(10, 1, 8), { from: 9, to: 16, inContract: false });
  // 계약 시작보다 앞 주차 → 기준 주가 구간에 포함되고 inContract=false (이전 구현은 기준 주가 빠졌다)
  const before = W.summaryWindow(2, 5, 12);
  assert.equal(before.inContract, false);
  assert.ok(before.from <= 2 && 2 <= before.to);
  // 계약 정보 없음 → inContract=false
  assert.equal(W.summaryWindow(3, null, null).inContract, false);
  // 기준 주는 언제나 구간 안 · 구간 길이 ≤ 8
  for (const [a, f, t] of [[1, 1, 8], [8, 1, 8], [15, 1, 24], [30, 1, 8], [4, 9, 16], [5, null, null], [7, 1, 4]]) {
    const w = W.summaryWindow(a, f, t);
    assert.ok(w.from <= a && a <= w.to, `anchor ${a} inside ${w.from}~${w.to}`);
    assert.ok(w.to - w.from + 1 <= 8);
  }
  // 행 조립은 구간 밖 Weekly 를 버린다 (9주 · 0주)
  const weeks = W.buildSummaryWeeks({
    window: { from: 1, to: 8 },
    reports: [9, 0, 3].map((n) => ({ id: `r${n}`, week_no: n, hidden_at: null, latest_completed_revision_id: `v${n}` })),
    revisions: new Map([9, 0, 3].map((n) => [`v${n}`, { content: { topic: `T${n}` }, revision_no: 1 }])),
    photos: new Map(),
    sessions: [{ week_no: 9, scheduled_date: "2026-11-01" }],
  });
  assert.deepEqual(weeks.map((w) => w.weekNo), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(weeks.filter((w) => w.report).map((w) => w.report.id), ["r3"]);
  assert.ok(weeks.every((w) => w.dateFrom === null), "week 9 session date is not used");
});

// ── 5 · 6 · 7. 빈 주 · 텍스트만 · 점수 없음 ────────────────────
test("5-7. missing weeks stay empty; only teacher-completed text fields are carried (no Growth5 values · no scores)", () => {
  const weeks = W.buildSummaryWeeks({
    window: { from: 1, to: 8 },
    reports: [
      { id: "r1", week_no: 1, hidden_at: null, latest_completed_revision_id: "v1" },
      { id: "r2", week_no: 2, hidden_at: "2026-09-01T00:00:00Z", latest_completed_revision_id: "v2" },
      { id: "r5", week_no: 5, hidden_at: null, latest_completed_revision_id: "v5-missing" },
    ],
    revisions: new Map([
      ["v1", { content: { topic: "색 놀이", quote_choice: "파란색이 좋아요", growth5: { creative: "independent" }, score: 3 }, revision_no: 1 }],
      ["v2", { content: { topic: "  " }, revision_no: 2 }],
    ]),
    photos: new Map([["v1", "https://signed.example/1"]]),
    sessions: [{ week_no: 1, scheduled_date: "2026-09-01" }, { week_no: 1, scheduled_date: "2026-09-03" }],
  });
  assert.equal(weeks.length, 8);
  assert.deepEqual(weeks[0], {
    weekNo: 1,
    dateFrom: "2026-09-01",
    dateTo: "2026-09-03",
    report: { id: "r1", topic: "색 놀이", quoteChoice: "파란색이 좋아요", hidden: false, revised: false, photoUrl: "https://signed.example/1" },
  });
  assert.deepEqual(Object.keys(weeks[0].report).sort(), ["hidden", "id", "photoUrl", "quoteChoice", "revised", "topic"]);
  assert.deepEqual(weeks[1].report, { id: "r2", topic: null, quoteChoice: null, hidden: true, revised: true, photoUrl: null });
  // 완료 revision 을 읽지 못한 주 · 기록 없는 주 = null (내용을 만들지 않는다)
  assert.equal(weeks[4].report, null);
  for (const i of [2, 3, 5, 6, 7]) assert.deepEqual(weeks[i], { weekNo: i + 1, dateFrom: null, dateTo: null, report: null });
});

test("6-7 · 9. view has no score · ranking · diagnosis · evaluation wording and shows the out-of-contract notice", () => {
  const view = code(VIEW); // 주석(설계 설명)은 제외하고 화면 코드 · 문구만 검사
  for (const word of ["점수", "순위", "등수", "진단", "평가 결과", "발달 지연", "평균", "상위", "하위", "%", "등급", "레벨", "score", "rank"]) {
    assert.ok(!view.includes(word), `view must not contain "${word}"`);
  }
  assert.match(view, /완료된 주간 리포트가 없습니다\./, "neutral empty-week text");
  assert.match(view, /data\.inContract \? null :/, "out-of-contract notice rendered when inContract is false");
  assert.match(view, /현재 계약 주차 범위/);
  for (const field of ["growth5", "Growth5", "stage", "indicator"]) assert.ok(!code(VIEW).includes(field), `view reads no ${field}`);
});

// ── 8 · 10. AI 없음 · 쓰기 없음 ────────────────────────────────
test("8 · 10. loader and window module: no AI, no writes, only SELECT + the STABLE entitlement RPC + signed URLs", () => {
  for (const file of [WINDOW, LOADER, VIEW, ...Object.values(PAGES)]) {
    const src = code(file);
    assert.doesNotMatch(src, /@\/lib\/ai|openai|anthropic|generateText|ai_assist/i, `${file}: no AI`);
    assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/, `${file}: no table writes`);
    assert.doesNotMatch(src, /["']use server["']/, `${file}: no server action`);
  }
  const loader = code(LOADER);
  const rpcs = [...loader.matchAll(/\.rpc\(\s*["'`]([a-z_]+)/g)].map((m) => m[1]);
  assert.deepEqual(rpcs, [], "loader calls no RPC directly (entitlements via fetchOrganizationEntitlements)");
  assert.match(loader, /fetchOrganizationEntitlements\(supabase, anchor\.organization_id\)/);
  assert.match(read("src/lib/entitlement/queries.ts"), /rpc\("organization_entitlements"/);
  assert.doesNotMatch(read(WINDOW), /^import /m, "window module has no imports (pure)");
  // 완료본만: latest_completed_revision_id 가 있는 Weekly 만 · 구간 필터
  assert.match(loader, /\.not\("latest_completed_revision_id", "is", null\)/);
  assert.match(loader, /\.gte\("week_no", from\)/);
  assert.match(loader, /\.lte\("week_no", to\)/);
  assert.match(loader, /\.eq\("report_type", "weekly"\)/);
});

// ── 2 · 3. 역할 · 기관 범위 ────────────────────────────────────
test("2 · 3. teacher/director pages require their role and the anchor must belong to the selected organization", () => {
  assert.match(code(PAGES.teacher), /await requireTeacher\(\)/);
  assert.match(code(PAGES.director), /await requireDirector\(\)/);
  for (const page of Object.values(PAGES)) {
    assert.match(code(page), /fetchProgramSummary\(supabase, reportId, \{ includePhotos: true, organizationId: membership\.organizationId \}\)/);
    assert.match(code(page), /notFound\(\)/);
  }
  const loader = code(LOADER);
  assert.match(loader, /if \(anchor\.organization_id !== options\.organizationId\) return \{ ok: false, reason: "not_found" \};/);
  // 기관 확인은 entitlement 조회 · 데이터 질의보다 먼저
  assert.ok(loader.indexOf("anchor.organization_id !== options.organizationId") < loader.indexOf("fetchOrganizationEntitlements(supabase"));
  // 같은 아이 · 같은 배정만
  assert.match(loader, /\.eq\("child_id", anchor\.child_id\)/);
  assert.match(loader, /\.eq\("class_program_assignment_id", anchor\.class_program_assignment_id\)/);
  // 학부모 portal 에는 모아보기가 없다 (DEC-069 · staff 전용)
  assert.doesNotMatch(read("src/components/share/ChildPortalView.tsx"), /ProgramSummary|모아보기/);
});
