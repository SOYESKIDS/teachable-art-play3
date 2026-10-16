import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { programAccessSummary, learningNav } from "../src/lib/learning/program-entry.ts";
import { legacyPanelRows, legacySectionTitle, legacySectionInitiallyOpen } from "../src/lib/weeks/legacy-week-layout.ts";
import { LESSON_SECTION_CODES } from "../src/lib/curriculum/lesson-sections.ts";
import { growthNarrative } from "../src/data/home-narrative.ts";

const active = (from = 1, to = 8, mode = "active") => ({ ok: true, entitlements: { weekFrom: from, weekTo: to, serviceMode: mode } });
test("8주 계약에서 16·24주 전체를 이용 중으로 표시하지 않는다", () => {
  assert.equal(programAccessSummary(active(), 8).state, "included");
  for (const weeks of [16, 24]) {
    const summary = programAccessSummary(active(), weeks);
    assert.equal(summary.state, "partial");
    assert.equal(summary.action, "과정 구성 보기");
    assert.match(summary.detail, /1~8주/);
  }
});
test("일부 기간 계약의 시작 주차를 1주로 지어내지 않는다", () => {
  assert.equal(programAccessSummary(active(9, 16), 8).state, "unavailable");
  assert.match(programAccessSummary(active(9, 16), 16).detail, /9~16주/);
});
test("계약 조회 실패·미시작·중지 상태를 이용 중으로 표시하지 않는다", () => {
  for (const result of [{ ok: false }, active(1, 8, "no_contract"), active(1, 8, "before_start"), active(1, 8, "org_suspended"), active(9, 8)]) {
    assert.equal(programAccessSummary(result, 8).state, "unavailable");
  }
});
test("읽기 전용 계약에서 수업 시작을 약속하지 않는다", () => {
  const summary = programAccessSummary(active(1, 8, "read_only"), 8);
  assert.equal(summary.readOnly, true);
  assert.equal(summary.action, "주차별 기록 보기");
  assert.match(summary.detail, /기록을 열람/);
});
test("수업 지도에서도 역할별 메뉴와 기관 선택을 유지한다", () => {
  const org = "org & test";
  for (const role of ["teacher", "director"]) {
    const nav = learningNav(role, org);
    assert.ok(nav.length >= 5);
    assert.ok(nav.every(item => new URL(item.href, "https://example.test").searchParams.get("org") === org));
    assert.ok(nav.every(item => !item.href.startsWith(role === "teacher" ? "/director" : "/teacher")));
    assert.ok(nav.every(item => !item.href.startsWith("/admin")));
  }
});
test("준비 탭은 퀵 가이드·준비물·안전부터 보여주고 본문을 수정하지 않는다", () => {
  const sections = LESSON_SECTION_CODES.map(code => Object.freeze({ code, body: `원문\n${code}  그대로` }));
  const before = JSON.stringify(sections);
  const rows = legacyPanelRows(Object.freeze(sections), "prep");
  assert.deepEqual(rows.slice(0, 3).map(row => row.code), ["s15", "s4a", "s4c"]);
  assert.ok(rows.every(row => sections.includes(row)));
  assert.equal(JSON.stringify(sections), before);
});
test("전체 가이드는 모든 저장 항목을 보존하고 준비 탭으로 관찰을 섞지 않는다", () => {
  const sections = [...LESSON_SECTION_CODES.map(code => ({ code })), { code: "future" }];
  assert.equal(legacyPanelRows(sections, "guide").length, sections.length);
  assert.equal(legacyPanelRows(sections, "prep").some(row => row.code === "s12"), false);
  for (const code of ["s15", "s4a", "s4c"]) assert.equal(legacySectionInitiallyOpen("prep", code), true);
  assert.equal(legacySectionInitiallyOpen("prep", "s2"), false);
});
test("앱의 s8·s9 의미를 원문 섹션 번호로 오독하지 않는다", () => {
  const manifest = JSON.parse(readFileSync(new URL("../content/starter/2026.1/manifest.json", import.meta.url)));
  assert.equal(manifest.weeks[0].section_source_map.s8, "§9");
  assert.match(legacySectionTitle("s8"), /미술/);
  assert.match(legacySectionTitle("s9"), /워크북/);
  assert.equal(legacySectionTitle("s4a"), "준비물");
});
test("홈페이지에서 미확정 미술 평가 축이나 도움 단계를 발달 척도로 소개하지 않는다", () => {
  assert.equal("domains" in growthNarrative.current, false);
  assert.equal("metrics" in growthNarrative.upcoming, false);
  assert.equal("stageNote" in growthNarrative.upcoming, false);
  assert.match(growthNarrative.upcoming.body, /교육 검수 후/);
});
