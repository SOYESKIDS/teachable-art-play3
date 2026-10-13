import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canPublish,
  canStartReview,
  publishBlockers,
} from "../src/lib/weeks/content-state.ts";
import { SECTION_TOTAL, weekCoverage } from "../src/lib/weeks/week-coverage.ts";
import {
  REVIEWED_ASSET_TYPES,
  findGuideMentions,
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
  assert.equal(canPublish(status), false);
  assert.deepEqual(publishBlockers(status), ["not_transcribed"]);
});

test("검수 중이어도 전사 전이면 여전히 막힌다", () => {
  // in_review 로 올려 두었다고 전사가 된 것이 아니다.
  const status = { transcription: "pending", publication: "in_review" };
  assert.equal(canPublish(status), false);
  assert.ok(publishBlockers(status).includes("not_transcribed"));
});

test("전사가 끝나면 발행 조건을 만족한다", () => {
  const status = { transcription: "done", publication: "draft" };
  assert.equal(canPublish(status), true);
  assert.deepEqual(publishBlockers(status), []);
});

test("이미 발행된 주차는 다시 발행하지 않는다", () => {
  const status = { transcription: "done", publication: "published" };
  assert.equal(canPublish(status), false);
  assert.deepEqual(publishBlockers(status), ["already_published"]);
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
        canPublish(week.status),
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
