import { test } from "node:test";
import assert from "node:assert/strict";

import { WEEK_INDEX } from "../src/lib/weeks/week-index.ts";
import { getWeekContent } from "../src/lib/weeks/week-source.ts";
import { encodeSection, sectionPlan } from "../src/lib/weeks/section-mapping.ts";
import { decodeSections } from "../src/lib/weeks/week-db-source.ts";

/**
 * 적재 ↔ 조회 왕복 검사.
 *
 * ── 로컬 DB 없이 무엇을 확인할 수 있나 ────────────────────────
 *
 * 이 환경에는 Postgres 가 없다. 그래서 **DB 를 거친 왕복은 확인할 수 없다.**
 * 대신 적재가 만드는 봉투(body_json)와 조회가 쓰는 디코더를 직접 이어
 * 「담았다 꺼내면 같은가」를 확인한다. 실제 손실은 거의 다 여기에서 난다 —
 * 표의 열 순서, null 과 빈 배열, 소제목이 사라지는 것.
 *
 * DB 를 실제로 거치는 검사는 로컬 Postgres 가 생긴 뒤에 추가한다.
 */

/** 적재 SQL 이 만드는 것과 같은 섹션 행 */
function encodeWeekRows(blocks, weekNo) {
  const rows = [];
  for (const slot of sectionPlan(weekNo)) {
    const envelope = encodeSection(blocks, slot);
    if (envelope === null) continue;
    rows.push({
      section_code: slot.code,
      body: "(평문은 이 검사의 대상이 아니다)",
      // JSON 을 실제로 직렬화·역직렬화한다. jsonb 를 거치면 같은 일이 일어난다.
      body_json: JSON.parse(JSON.stringify(envelope)),
      source_ref: null,
    });
  }
  return rows;
}

test("24주 전 블록이 body_json 왕복에서 손실 없이 돌아온다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const rows = encodeWeekRows(content.blocks, week.weekNo);

    const decoded = decodeSections(rows);
    assert.ok(decoded.ok, `${week.weekNo}주차 디코딩 실패: ${decoded.ok ? "" : decoded.detail}`);

    assert.deepEqual(
      decoded.blocks,
      content.blocks,
      `${week.weekNo}주차 블록이 왕복에서 달라졌다`,
    );
  }
});

test("표의 열 제목과 행 순서가 왕복에서 유지된다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const decoded = decodeSections(encodeWeekRows(content.blocks, week.weekNo));
    assert.ok(decoded.ok);

    // 14번 — 가운데 칸의 뜻이 권마다 다르다. 순서가 바뀌면 교사가 거꾸로 읽는다.
    if (content.blocks.situations) {
      assert.deepEqual(decoded.blocks.situations.columns, content.blocks.situations.columns);
      assert.deepEqual(decoded.blocks.situations.rows, content.blocks.situations.rows);
    }
    // 5번 — 3권은 시간 칸이 없다.
    if (content.blocks.timetable) {
      assert.deepEqual(decoded.blocks.timetable.table.columns, content.blocks.timetable.table.columns);
      assert.equal(decoded.blocks.timetable.kind, content.blocks.timetable.kind);
    }
    // 7번 PLAY 안의 표
    for (const [i, play] of (content.blocks.coreActivity?.plays ?? []).entries()) {
      const got = decoded.blocks.coreActivity.plays[i];
      assert.deepEqual(got.stepTable, play.stepTable, `${week.weekNo}주차 PLAY ${i + 1} 표`);
    }
  }
});

test("null 과 빈 배열이 왕복에서 섞이지 않는다", () => {
  // ★ null = 원문에 없다 · [] = 원문이 「없음」이라고 밝혔다. 뜻이 다르다.
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const decoded = decodeSections(encodeWeekRows(content.blocks, week.weekNo));
    assert.ok(decoded.ok);

    // 3권은 현장 난이도표가 없다 (null). 빈 표로 바뀌면 안 된다.
    const gotAdapt = decoded.blocks.coreActivity?.adaptations ?? null;
    const wantAdapt = content.blocks.coreActivity?.adaptations ?? null;
    assert.equal(
      gotAdapt === null,
      wantAdapt === null,
      `${week.weekNo}주차 현장 난이도표의 null 여부가 달라졌다`,
    );
    assert.deepEqual(gotAdapt, wantAdapt, `${week.weekNo}주차 현장 난이도표 내용`);
    // 10·16주 미술은 steps·questions 가 빈 배열이다 (원문이 「별도 제작 활동 없음」).
    if (content.blocks.art) {
      assert.deepEqual(decoded.blocks.art.steps, content.blocks.art.steps);
      assert.deepEqual(decoded.blocks.art.questions, content.blocks.art.questions);
    }
    // 워크북 표 뒤 문장은 2권에만 있다.
    if (content.blocks.workbook) {
      assert.equal(decoded.blocks.workbook.outro, content.blocks.workbook.outro);
    }
  }
});

test("C항 제목과 「미정」 상태가 왕복에서 유지된다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const decoded = decodeSections(encodeWeekRows(content.blocks, week.weekNo));
    assert.ok(decoded.ok);

    assert.equal(
      decoded.blocks.preparation.safetyLabel,
      content.blocks.preparation.safetyLabel,
      `${week.weekNo}주차 C항 제목이 달라졌다`,
    );
    assert.equal(
      decoded.blocks.homeConnection.status,
      content.blocks.homeConnection.status,
      `${week.weekNo}주차 가정연계 상태가 달라졌다`,
    );
  }

  // 16주차는 「안전·개인정보 확인」, 19주차는 「미정」 — 이름을 박아 확인한다.
  const w16 = decodeSections(
    encodeWeekRows(getWeekContent(16, "internal_review").content.blocks, 16),
  );
  assert.ok(w16.ok);
  assert.equal(w16.blocks.preparation.safetyLabel, "안전·개인정보 확인");

  const w19 = decodeSections(
    encodeWeekRows(getWeekContent(19, "internal_review").content.blocks, 19),
  );
  assert.ok(w19.ok);
  assert.equal(w19.blocks.homeConnection.status, "undecided");
});

test("body_json 이 없는 옛 적재본은 빈 블록이 아니라 실패로 알린다", () => {
  // ★ 조용히 빈 화면을 보여주면 아무도 적재가 안 된 것을 모른다.
  const decoded = decodeSections([
    { section_code: "s1", body: "평문만 있는 옛 적재본", body_json: null, source_ref: null },
  ]);
  assert.equal(decoded.ok, false);
  assert.match(decoded.detail, /body_json/);
});

test("4번 조각이 하나라도 빠지면 실패로 알린다", () => {
  // 안전 안내가 사라진 준비물이 조용히 나가면 안 된다.
  const blocks = getWeekContent(1, "internal_review").content.blocks;
  const rows = encodeWeekRows(blocks, 1).filter((r) => r.section_code !== "s4c");

  const decoded = decodeSections(rows);
  assert.equal(decoded.ok, false);
  assert.match(decoded.detail, /safety/);
});

test("섹션 번호 매핑이 주차별 원문과 맞는다", () => {
  // 1·3~8주: 8=워크북 · 2주와 9~24주: 8=미술활동
  const codeOf = (weekNo, blockKey) =>
    sectionPlan(weekNo).find((s) => s.key === blockKey && !s.part)?.code;

  for (const week of WEEK_INDEX) {
    const artIsEight = week.weekNo === 2 || week.weekNo >= 9;
    assert.equal(codeOf(week.weekNo, "art"), artIsEight ? "s8" : "s9", `${week.weekNo}주차 미술`);
    assert.equal(
      codeOf(week.weekNo, "workbook"),
      artIsEight ? "s9" : "s8",
      `${week.weekNo}주차 워크북`,
    );
  }
});

test("적재 SQL 이 지금 fixture 에서 생성된 것과 같다", async () => {
  // ★ fixture 를 고치고 build-sql.mjs 를 안 돌리면, 저장소의 적재 SQL 은
  //   옛 내용을 담은 채로 남는다. 그 상태로 적재하면 화면과 DB 가 달라진다.
  const { execFileSync } = await import("node:child_process");
  try {
    execFileSync(
      process.execPath,
      [
        "--import",
        "./tests/register-hooks.mjs",
        "content/tap24/2026.1/build-sql.mjs",
        "--check",
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    assert.fail(
      `적재 SQL 이 fixture 와 다르다 — build-sql.mjs 를 다시 돌려야 한다.\n${
        error.stderr?.toString() ?? error.message
      }`,
    );
  }
});

test("적재 SQL 에 원문 PDF 가 들어가지 않는다", async () => {
  // 원문 파일은 저장소에 넣지 않는다. 이름·해시만 남긴다.
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync("supabase/content/tap24_2026_1_load.sql", "utf8");

  assert.ok(sql.includes("lesson_source_documents"), "원문 출처 적재가 들어 있다");
  assert.ok(!/%PDF-/.test(sql), "SQL 에 PDF 바이트가 들어 있다");
  // 해시는 들어가고 경로는 들어가지 않는다.
  assert.ok(/[0-9a-f]{64}/.test(sql), "원문 SHA-256 이 들어 있다");
  assert.ok(!sql.includes("D:/소예키즈/IR"), "SQL 에 원문 파일 경로가 들어 있다");
});
