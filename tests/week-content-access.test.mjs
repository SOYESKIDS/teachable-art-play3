import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hiddenReason,
  isVisibleTo,
  showsDevelopmentMarkers,
} from "../src/lib/weeks/content-state.ts";
import { getWeekContent, listWeeks } from "../src/lib/weeks/week-source.ts";
import { WEEK_INDEX } from "../src/lib/weeks/week-index.ts";

/**
 * 주차 콘텐츠 접근 규칙 테스트.
 *
 * 화면이 아니라 **데이터 계층**을 검사한다. 화면에서 숨기는 것은 HTML 에 그대로
 * 실려 나가므로, 검수 전 원문이 정식 경로의 반환값 자체에 들어오지 않는지 본다.
 */

const published = { transcription: "done", publication: "published" };
const transcribedOnly = { transcription: "done", publication: "draft" };
const inReview = { transcription: "done", publication: "in_review" };
const notTranscribed = { transcription: "pending", publication: "draft" };

test("정식 서비스 경로는 발행된 콘텐츠만 통과시킨다", () => {
  assert.equal(isVisibleTo(published, "service"), true);
  assert.equal(isVisibleTo(transcribedOnly, "service"), false);
  assert.equal(isVisibleTo(inReview, "service"), false);
  assert.equal(isVisibleTo(notTranscribed, "service"), false);
});

test("내부 검수 경로는 전사된 것까지 보되 미전사는 못 본다", () => {
  assert.equal(isVisibleTo(published, "internal_review"), true);
  assert.equal(isVisibleTo(transcribedOnly, "internal_review"), true);
  assert.equal(isVisibleTo(inReview, "internal_review"), true);
  assert.equal(isVisibleTo(notTranscribed, "internal_review"), false);
});

test("감춘 이유를 전사 전과 검수 전으로 구분한다", () => {
  assert.equal(hiddenReason(notTranscribed), "not_transcribed");
  assert.equal(hiddenReason(transcribedOnly), "not_published");
  assert.equal(hiddenReason(inReview), "not_published");
  assert.equal(hiddenReason(published), null);
});

test("검수 전 주차는 정식 경로의 반환값에 본문이 들어오지 않는다", () => {
  // 1주차는 전사했지만 아직 발행 전이다.
  const summary = WEEK_INDEX.find((w) => w.weekNo === 1);
  assert.equal(summary.status.transcription, "done");
  assert.notEqual(summary.status.publication, "published");

  const service = getWeekContent(1, "service");
  assert.equal(service.bodyVisible, false);
  assert.equal(service.hidden, "not_published");
  // 블록이 비어 있어야 한다 — 화면에서 숨기는 것으로는 부족하다.
  assert.equal(
    Object.values(service.content.blocks).every((v) => v === null),
    true,
  );
  assert.equal(service.content.scenes.length, 0);

  // 내부 검수 경로에서는 본문이 온다.
  const internal = getWeekContent(1, "internal_review");
  assert.equal(internal.bodyVisible, true);
  assert.notEqual(internal.content.blocks.beforeStart, null);
  assert.ok(internal.content.scenes.length > 0);
});

test("audience 를 빠뜨리면 좁은 쪽(정식 서비스)으로 동작한다", () => {
  const fallback = getWeekContent(1);
  assert.equal(fallback.bodyVisible, false);
});

test("전사하지 않은 주차는 두 경로 모두 본문이 없다", () => {
  for (const audience of ["service", "internal_review"]) {
    const r = getWeekContent(2, audience);
    assert.equal(r.bodyVisible, false);
    assert.equal(r.content.scenes.length, 0);
  }
});

test("24주 메타는 경로와 무관하게 모두 나오고 범위를 벗어난 주차는 없다", () => {
  const { weeks } = listWeeks();
  assert.equal(weeks.length, 24);
  assert.deepEqual(
    weeks.map((w) => w.weekNo),
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
  assert.equal(getWeekContent(0), null);
  assert.equal(getWeekContent(25), null);
});

test("주차 메타에 빈 값이 없고 테마색은 6자리 hex 다", () => {
  for (const w of listWeeks().weeks) {
    assert.ok(w.title.length > 0, `${w.weekNo}주차 제목`);
    assert.ok(w.growthKeyword.length > 0, `${w.weekNo}주차 성장키워드`);
    assert.ok(w.coreMessage.length > 0, `${w.weekNo}주차 핵심 메시지`);
    assert.match(w.durationLabel, /^약 \d{2}~\d{2}분/, `${w.weekNo}주차 권장 시간`);
    assert.match(w.themeColor, /^#[0-9A-F]{6}$/, `${w.weekNo}주차 테마색`);
  }
});

test("개발 표시는 운영 배포에서만 꺼진다", () => {
  const saved = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    assert.equal(showsDevelopmentMarkers(), false);

    process.env.VERCEL_ENV = "preview";
    assert.equal(showsDevelopmentMarkers(), true);

    delete process.env.VERCEL_ENV;
    // Vercel 밖(로컬)에서는 켠다 — 모르면 켜는 쪽이 안전하다.
    assert.equal(showsDevelopmentMarkers(), true);
  } finally {
    if (saved === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved;
  }
});
