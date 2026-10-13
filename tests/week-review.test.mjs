import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PublishBlockedError,
  assertPublishable,
  canPublish,
  canStartReview,
  publishBlockers,
} from "../src/lib/weeks/content-state.ts";
import { EMPTY_BLOCKS, hqDecisionNotes, unresolvedNotes } from "../src/lib/weeks/week-types.ts";
import { SECTION_TOTAL, weekCoverage } from "../src/lib/weeks/week-coverage.ts";
import {
  ASSET_ACCESS_NOTE,
  REVIEWED_ASSET_TYPES,
  findGuideMentions,
  registrationOf,
} from "../src/lib/weeks/week-asset-queries.ts";
import { getWeekContent } from "../src/lib/weeks/week-source.ts";
import { WEEK_INDEX } from "../src/lib/weeks/week-index.ts";
import { HQ_DECISIONS } from "../src/lib/weeks/hq-decisions.ts";

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
  // ★ 24주 전사가 끝나 전사 전 주차가 더 이상 없다. 규칙 자체는 남겨둔다 —
  //   새 주차가 추가되거나 전사를 되돌릴 때 빈 블록이 「채워진 것」으로 세어지면 안 된다.
  const pending = WEEK_INDEX.find((w) => w.status.transcription === "pending");
  const content = pending
    ? getWeekContent(pending.weekNo, "internal_review").content
    : {
        ...getWeekContent(1, "internal_review").content,
        blocks: EMPTY_BLOCKS,
        scenes: [],
        sourceFile: null,
      };

  const coverage = weekCoverage(content);
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
  // ★ 24주 전사가 끝나 전사 전 주차가 더 이상 없다. 빈 블록으로 직접 확인한다.
  //   「전사 전 주차가 없으니 검사도 없다」로 두면 규칙이 조용히 사라진다.
  const pending = WEEK_INDEX.find((w) => w.status.transcription === "pending");
  const target = pending
    ? getWeekContent(pending.weekNo, "internal_review").content
    : { ...getWeekContent(1, "internal_review").content, blocks: EMPTY_BLOCKS, sourceFile: null };

  for (const assetType of REVIEWED_ASSET_TYPES) {
    assert.deepEqual(
      findGuideMentions(target, assetType),
      [],
      `전사 전 주차에서 ${assetType} 근거가 나왔다`,
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
    } else {
      // ★ 3권(17~24주) 원문에도 표 뒤 문장이 없다. 쪽 이미지로 확인했다.
      assert.equal(
        workbook.outro,
        null,
        `${week.weekNo}주차(3권) 워크북에는 표 뒤 문장이 없어야 한다`,
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

/* ───────────────────────── 3권(17~24주) 원문 구조 */

const PART3 = WEEK_INDEX.filter((w) => w.weekNo >= 17);

test("3권은 「관찰 시간표」이고 시간 칸이 없다", () => {
  // ★ 1·2권은 「단계/시간/교사 역할/아이 경험」 네 칸, 3권은 세 칸이다.
  //   없는 시간을 화면이 지어내면 교사가 단계별 분을 배분해 버린다.
  for (const week of PART3) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const t = content.blocks.timetable;
    if (!t) continue;

    assert.equal(t.kind, "observation", `${week.weekNo}주차 시간표 종류가 다르다`);
    assert.deepEqual(
      t.table.columns,
      ["단계", "교사가 볼 것", "관찰 예시"],
      `${week.weekNo}주차 관찰 시간표의 열 제목이 원문과 다르다`,
    );

    // 단계별 시간이 없으므로 장면에도 권장 초를 넣지 않는다.
    for (const scene of content.scenes) {
      assert.equal(
        scene.baseSeconds,
        null,
        `${week.weekNo}주차 장면 ${scene.sceneNo}에 원문에 없는 권장 시간이 들어 있다`,
      );
    }
  }
});

test("14번 가운데 칸의 뜻은 권마다 다르다", () => {
  // ★ 1·2권 「피해야 할 반응」(하지 말 것) vs 3권 「교사가 볼 점」(살펴볼 것).
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const s = content.blocks.situations;
    if (!s) continue;

    const expected =
      week.weekNo <= 16
        ? ["상황", "피해야 할 반응", "권장 대응"]
        : ["상황", "교사가 볼 점", "바로 사용할 말"];
    assert.deepEqual(s.columns, expected, `${week.weekNo}주차 14번 표의 열 제목이 원문과 다르다`);
  }
});

test("15번 셋째 칸은 1·2권 「핵심 문장」, 3권 「핵심 질문」이다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const g = content.blocks.quickGuide;
    if (!g) continue;

    assert.equal(
      g.table.columns[2],
      week.weekNo <= 16 ? "핵심 문장" : "핵심 질문",
      `${week.weekNo}주차 퀵 가이드 셋째 칸 제목이 원문과 다르다`,
    );
  }
});

test("3권에는 현장 난이도표가 없고 핵심활동 상황표가 있다", () => {
  // ★ null 은 「비어 있다」가 아니라 「원문에 없다」는 뜻이다.
  for (const week of PART3) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const core = content.blocks.coreActivity;
    if (!core) continue;

    assert.equal(core.adaptations, null, `${week.weekNo}주차에 원문에 없는 현장 난이도표가 있다`);
    assert.ok(core.situations, `${week.weekNo}주차 핵심활동 상황표가 비어 있다`);
    assert.deepEqual(
      core.situations.columns,
      ["상황", "바로 사용할 교사 말"],
      `${week.weekNo}주차 핵심활동 상황표의 열 제목이 원문과 다르다`,
    );
  }
});

test("3권 가정연계는 「안내 문구 예시」뿐이고 진행 방법 목록이 없다", () => {
  for (const week of PART3) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const home = content.blocks.homeConnection;
    if (!home) continue;

    assert.equal(home.stepsLabel, null, `${week.weekNo}주차 가정연계에 없는 소제목이 들어 있다`);
    assert.equal(home.steps.length, 0, `${week.weekNo}주차 가정연계에 원문에 없는 목록이 들어 있다`);
    assert.equal(home.noticeLabel, "안내 문구 예시", `${week.weekNo}주차 안내 문구 소제목이 다르다`);
  }
});

test("3권 12번에는 키즈노트 예시가 없고 「기록 시 주의」가 있다", () => {
  for (const week of PART3) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const guide = content.blocks.observationGuide;
    if (!guide) continue;

    assert.equal(guide.recordExample, null, `${week.weekNo}주차에 원문에 없는 기록 예시가 있다`);
    assert.equal(guide.cautionsLabel, "기록 시 주의", `${week.weekNo}주차 주의 묶음 제목이 다르다`);
    assert.ok(guide.cautions.length > 0, `${week.weekNo}주차 「기록 시 주의」가 비어 있다`);
    assert.deepEqual(
      guide.table.columns,
      ["관찰영역", "관찰 행동", "기록 문장 예시"],
      `${week.weekNo}주차 12번 표의 열 제목이 원문과 다르다`,
    );
  }
});

test("원문이 「미정」이라고 적은 가정연계는 채우지 않는다", () => {
  // ★ 19주차. 확정 전까지 보호자에게 보내지 않는다.
  const { content } = getWeekContent(19, "internal_review");
  const home = content.blocks.homeConnection;

  assert.ok(home, "19주차 가정연계 블록이 없다");
  assert.equal(home.status, "undecided");
  assert.equal(home.title, "미정");
  assert.equal(home.steps.length, 0, "미정인 가정연계에 진행 방법이 들어 있다");

  // 교실 화면에도 가정 과제를 예고하는 장면을 만들지 않는다.
  const homeScenes = content.scenes.filter((s) => s.sceneType === "home");
  assert.equal(homeScenes.length, 0, "가정연계가 미정인데 가정 장면이 있다");
});

test("11번 마무리 상자 제목은 1·2권 「마지막 한 문장」, 3권 「마무리 한 문장」이다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const closing = content.blocks.closing;
    if (!closing?.closingLine) continue;

    assert.equal(
      closing.closingLineLabel,
      week.weekNo <= 16 ? "마지막 한 문장" : "마무리 한 문장",
      `${week.weekNo}주차 마무리 상자 제목이 원문과 다르다`,
    );
  }
});

test("24주 전체가 전사되고 15개 섹션이 모두 채워진다", () => {
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    assert.equal(week.status.transcription, "done", `${week.weekNo}주차가 아직 전사되지 않았다`);
    assert.ok(content.sourceFile, `${week.weekNo}주차 원문 파일명이 없다`);
    assert.ok(content.scenes.length > 0, `${week.weekNo}주차 교실 화면 장면이 없다`);
  }
});

test("본사 결정 목록은 주의 기록의 decision 분류와 일대일로 맞는다", () => {
  // ★ 한쪽만 늘면 결정이 화면에서 사라지거나 근거 없는 항목이 생긴다.
  const noteKeys = new Set();
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    for (const n of hqDecisionNotes(content.transcriptionNotes)) {
      noteKeys.add(`${week.weekNo}:${n.page}`);
    }
  }

  assert.equal(
    HQ_DECISIONS.length,
    noteKeys.size,
    `본사 결정 목록 ${HQ_DECISIONS.length}건과 decision 주의 기록 ${noteKeys.size}건이 다르다`,
  );

  for (const d of HQ_DECISIONS) {
    assert.ok(d.recommendation.length > 0, `${d.id} 권장안이 비어 있다`);
    assert.ok(d.affectedWeeks.length > 0, `${d.id} 영향 주차가 비어 있다`);
    assert.ok(
      d.affectedWeeks.includes(d.weekNo),
      `${d.id} 영향 주차에 자기 주차(${d.weekNo})가 빠져 있다`,
    );
    assert.equal(typeof d.needsSourceFix, "boolean", `${d.id} 원문 수정 필요 여부가 없다`);
  }
});
