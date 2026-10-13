import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PublishBlockedError,
  assertPublishable,
  canPublish,
  canStartReview,
  publishBlockers,
} from "../src/lib/weeks/content-state.ts";
import { hqDecisionNotes, unresolvedNotes } from "../src/lib/weeks/week-types.ts";
import { SECTION_TOTAL, weekCoverage } from "../src/lib/weeks/week-coverage.ts";
import {
  ASSET_ACCESS_NOTE,
  REVIEWED_ASSET_TYPES,
  findGuideMentions,
  registrationOf,
} from "../src/lib/weeks/week-asset-queries.ts";
import { getWeekContent } from "../src/lib/weeks/week-source.ts";
import { WEEK_INDEX } from "../src/lib/weeks/week-index.ts";

/**
 * 본사 검수 화면이 기대는 규칙을 고정한다.
 *
 * ★ 가장 중요한 것: **전사하지 않은 주차는 발행할 수 없다.** 화면에서 버튼을
 *   숨기는 것은 규칙이 아니다. 판정 함수가 거부해야 한다.
 */

test("전사하지 않은 주차는 발행할 수 없다", () => {
  const status = { transcription: "pending", publication: "draft" };
  assert.equal(canPublish(status, 0), false);
  assert.deepEqual(publishBlockers(status, 0), ["not_transcribed"]);
});

test("검수 중이어도 전사 전이면 여전히 막힌다", () => {
  // in_review 로 올려 두었다고 전사가 된 것이 아니다.
  const status = { transcription: "pending", publication: "in_review" };
  assert.equal(canPublish(status, 0), false);
  assert.ok(publishBlockers(status, 0).includes("not_transcribed"));
});

test("전사가 끝나면 발행 조건을 만족한다", () => {
  const status = { transcription: "done", publication: "draft" };
  assert.equal(canPublish(status, 0), true);
  assert.deepEqual(publishBlockers(status, 0), []);
});

test("이미 발행된 주차는 다시 발행하지 않는다", () => {
  const status = { transcription: "done", publication: "published" };
  assert.equal(canPublish(status, 0), false);
  assert.deepEqual(publishBlockers(status, 0), ["already_published"]);
});

test("검수 시작은 전사된 draft 에서만 가능하다", () => {
  assert.equal(canStartReview({ transcription: "done", publication: "draft" }), true);
  assert.equal(canStartReview({ transcription: "pending", publication: "draft" }), false);
  assert.equal(canStartReview({ transcription: "done", publication: "in_review" }), false);
  assert.equal(canStartReview({ transcription: "done", publication: "published" }), false);
});

test("24주 전체에서 전사 전 주차는 하나도 발행 가능하지 않다", () => {
  for (const week of WEEK_INDEX) {
    if (week.status.transcription === "pending") {
      assert.equal(
        canPublish(week.status, 0),
        false,
        `${week.weekNo}주차가 전사 전인데 발행 가능으로 판정됐다`,
      );
    }
  }
});

test("전사된 주차의 섹션 범위를 센다", () => {
  const result = getWeekContent(1, "internal_review");
  assert.ok(result, "1주차 내부 검수 조회가 비었다");

  const coverage = weekCoverage(result.content);
  assert.equal(coverage.sections.length, SECTION_TOTAL);
  assert.ok(coverage.filledCount > 0, "1주차는 전사됐는데 채워진 섹션이 0이다");
  assert.ok(coverage.sceneCount > 0, "1주차 장면이 없다");
  assert.equal(typeof coverage.sourceFile, "string");
});

test("전사되지 않은 주차는 섹션이 비고 출처 파일도 없다", () => {
  const pending = WEEK_INDEX.find((w) => w.status.transcription === "pending");
  assert.ok(pending, "전사 전 주차가 하나도 없다 — 이 테스트의 전제가 바뀌었다");

  const result = getWeekContent(pending.weekNo, "internal_review");
  const coverage = weekCoverage(result.content);
  assert.equal(coverage.filledCount, 0);
  assert.equal(coverage.sceneCount, 0);
  assert.equal(coverage.sourceFile, null);
});

test("정식 서비스 경로는 발행 전 주차의 섹션을 내보내지 않는다", () => {
  // 1주차는 전사됐지만 검수 전이다. 서비스 경로에서는 본문이 비어야 한다.
  const service = getWeekContent(1, "service");
  assert.equal(service.bodyVisible, false);
  assert.equal(weekCoverage(service.content).filledCount, 0);
});

test("자료 언급은 전사된 원문 문구를 그대로 돌려준다", () => {
  const result = getWeekContent(1, "internal_review");
  const mentions = findGuideMentions(result.content, "teacher_guide");

  assert.ok(mentions.length > 0, "교안 근거(원문 파일)를 찾지 못했다");
  for (const mention of mentions) {
    assert.equal(typeof mention.quote, "string");
    assert.ok(mention.quote.length > 0);
    assert.equal(typeof mention.section, "string");
  }
});

test("전사 전 주차에서는 자료 언급을 찾을 수 없다", () => {
  const pending = WEEK_INDEX.find((w) => w.status.transcription === "pending");
  const result = getWeekContent(pending.weekNo, "internal_review");

  for (const assetType of REVIEWED_ASSET_TYPES) {
    assert.deepEqual(
      findGuideMentions(result.content, assetType),
      [],
      `${pending.weekNo}주차는 전사 전인데 ${assetType} 근거가 나왔다`,
    );
  }
});

test("검수 자료 다섯 종이 유지된다", () => {
  assert.deepEqual([...REVIEWED_ASSET_TYPES], [
    "teacher_guide",
    "ebook",
    "audio",
    "music_video",
    "workbook",
  ]);
});

test("registrationOf 는 없는 종류를 0건으로 돌려준다 (undefined 로 터지지 않는다)", () => {
  const reg = registrationOf([], "audio");
  assert.equal(reg.assetType, "audio");
  assert.equal(reg.rowCount, 0);
  assert.equal(reg.withPathCount, 0);
  assert.equal(reg.publishedCount, 0);
  assert.equal(reg.rightsClearedCount, 0);
  assert.equal(reg.downloadAllowedCount, 0);
});

test("경로 등록과 실제 재생을 구분하는 문구가 있다", () => {
  // 화면이 「경로 N건」을 「재생 가능 N건」으로 읽지 않도록 함께 내보낸다.
  assert.match(ASSET_ACCESS_NOTE, /확인하지 않았습니다/);
});

/* ══════════════════════════════════ 미해결 대조 주의 */

test("미해결 대조 주의가 있으면 전사가 끝나도 발행할 수 없다", () => {
  const status = { transcription: "done", publication: "draft" };
  assert.equal(canPublish(status, 0), true);
  assert.equal(canPublish(status, 1), false);
  assert.ok(publishBlockers(status, 1).includes("unresolved_notes"));
});

test("해결된 기록은 발행을 막지 않는다 (이력은 남는다)", () => {
  const notes = [
    { section: "a", page: 1, issue: "x", status: "resolved", evidence: "확인함" },
    { section: "b", page: 2, issue: "y", status: "resolved", evidence: "확인함" },
  ];
  assert.equal(unresolvedNotes(notes).length, 0);
  assert.equal(canPublish({ transcription: "done", publication: "draft" }, 0), true);
  // ★ 기록 자체는 지워지지 않는다. 지워야 발행되는 구조를 만들지 않는다.
  assert.equal(notes.length, 2);
});

test("서버 판정은 막히면 던진다 (조용히 false 를 돌려주지 않는다)", () => {
  assert.throws(
    () => assertPublishable({ transcription: "done", publication: "draft" }, 2),
    (err) => err instanceof PublishBlockedError && err.blockers.includes("unresolved_notes"),
  );
  assert.doesNotThrow(() =>
    assertPublishable({ transcription: "done", publication: "draft" }, 0),
  );
});

test("해결로 표시한 기록에는 확인 근거가 반드시 있다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    for (const note of content.transcriptionNotes) {
      if (note.status === "resolved") {
        assert.equal(
          typeof note.evidence,
          "string",
          `${week.weekNo}주차 「${note.section}」이 근거 없이 해결로 표시됐다`,
        );
        assert.ok(note.evidence.length > 0);
      } else {
        assert.equal(
          note.evidence,
          null,
          `${week.weekNo}주차 「${note.section}」은 미해결인데 근거가 적혀 있다`,
        );
      }
    }
  }
});

test("미해결 기록이 남은 주차는 24주 어디서도 발행 가능으로 판정되지 않는다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const open = unresolvedNotes(content.transcriptionNotes).length;
    if (open > 0) {
      assert.equal(
        canPublish(week.status, open),
        false,
        `${week.weekNo}주차에 미해결 ${open}건이 있는데 발행 가능으로 판정됐다`,
      );
    }
  }
});

/* ══════════════════════════════════ 기록 분류와 본사 결정 목록 */

test("미해결 건수를 빠뜨린 발행 판정은 통과하지 않고 던진다", () => {
  // ★ 세지 않은 것이 「0건」으로 읽히면 판정이 없는 것과 같다.
  const status = { transcription: "done", publication: "draft" };
  assert.throws(() => publishBlockers(status), TypeError);
  assert.throws(() => publishBlockers(status, -1), TypeError);
  assert.throws(() => publishBlockers(status, 1.5), TypeError);
  assert.doesNotThrow(() => publishBlockers(status, 0));
});

test("모든 기록에 분류가 있고 세 종류 안에 든다", () => {
  const allowed = new Set(["extraction", "structure", "decision"]);
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    for (const note of content.transcriptionNotes) {
      assert.ok(
        allowed.has(note.category),
        `${week.weekNo}주차 「${note.section}」의 분류가 없거나 알 수 없다: ${note.category}`,
      );
    }
  }
});

test("본사 결정 목록은 decision 분류의 미해결만 모은다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    for (const note of hqDecisionNotes(content.transcriptionNotes)) {
      assert.equal(note.category, "decision");
      assert.equal(note.status, "unresolved");
    }
  }
});

test("핵심활동과 같은 미술활동은 장면을 두 벌 만들지 않는다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    if (content.blocks.art?.sameAsCoreActivity !== true) continue;

    // ★ 같은 활동이면 create 장면을 따로 두지 않는다. 두 번 하는 것으로 읽힌다.
    const createScenes = content.scenes.filter((s) => s.sceneType === "create");
    assert.equal(
      createScenes.length,
      0,
      `${week.weekNo}주차는 미술이 핵심활동과 같은 활동인데 create 장면이 ${createScenes.length}개 있다`,
    );

    // ★ 권장 시간표에도 미술 단계가 따로 있으면 시간이 두 번 세어진다.
    const artRows = (content.blocks.timetable?.rows ?? []).filter((r) =>
      r.stage.includes("미술"),
    );
    assert.equal(
      artRows.length,
      0,
      `${week.weekNo}주차 권장 시간표에 미술 단계가 따로 있어 시간이 중복 계산된다`,
    );
  }
});

test("가정연계 마무리 문단은 진행 방법 목록에 섞이지 않는다", () => {
  // ★ 원문은 「부모님께 전달할 핵심 문장」 뒤에 별도 문단을 둔다 (9~16주차).
  //   목록의 한 줄로 적으면 교사가 그것을 할 일로 읽는다.
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const home = content.blocks.homeConnection;
    if (!home) continue;

    for (const step of home.steps) {
      assert.ok(
        !step.startsWith("숨은 성장"),
        `${week.weekNo}주차 가정연계 진행 방법에 「숨은 성장」 문단이 섞여 있다`,
      );
    }
  }
});

test("워크북 표 뒤 마무리 문장은 2권에만 있고 1권에는 없다", () => {
  // ★ 원문을 쪽으로 확인한 결과다. 자리가 없어 전사에서 빠졌던 문장이다.
  //   null 과 「원문에 없다」를 구분하기 위해 주차별로 기대값을 고정한다.
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const workbook = content.blocks.workbook;
    if (!workbook) continue;

    if (week.weekNo <= 8) {
      assert.equal(
        workbook.outro,
        null,
        `${week.weekNo}주차(1권) 워크북에는 표 뒤 문장이 없어야 한다`,
      );
    } else if (week.weekNo <= 16) {
      assert.ok(
        typeof workbook.outro === "string" && workbook.outro.length > 0,
        `${week.weekNo}주차(2권) 워크북의 표 뒤 문장이 비어 있다`,
      );
    }
  }
});

test("수업 전 준비 C항 제목은 주차의 원문 제목을 그대로 쓴다", () => {
  // ★ 16주차만 「안전·개인정보 확인」이다. 화면이 제목을 고정하면 원문과 달라진다.
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const prep = content.blocks.preparation;
    if (!prep) continue;

    assert.ok(
      prep.safetyLabel.length > 0,
      `${week.weekNo}주차 C항 제목이 비어 있다`,
    );
    if (week.weekNo === 16) {
      assert.equal(prep.safetyLabel, "안전·개인정보 확인");
    }
  }
});

test("원문이 표로 둔 묶음은 표로 남는다 (한 줄로 이어 적지 않는다)", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    for (const play of content.blocks.coreActivity?.plays ?? []) {
      if (play.stepTable) {
        assert.ok(play.stepTable.columns.length >= 2, `${week.weekNo}주차 「${play.title}」 표의 열이 모자란다`);
        for (const row of play.stepTable.rows) {
          assert.equal(
            row.length,
            play.stepTable.columns.length,
            `${week.weekNo}주차 「${play.title}」 표의 행과 열 개수가 다르다`,
          );
        }
      }

      // ★ 표를 한 줄로 이어 붙인 흔적이 points 에 남아 있으면 안 된다.
      for (const pt of play.points) {
        assert.ok(
          !/^\d+\.\s.+\u2014/.test(pt),
          `${week.weekNo}주차 「${play.title}」 설명에 표 한 행이 한 줄로 들어 있다: ${pt.slice(0, 40)}`,
        );
      }
    }
  }
});
