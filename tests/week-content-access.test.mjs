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
  // ★ 주차 번호를 박아 두지 않는다. 전사가 진행되면서 그 번호가 전사 완료로
  //   바뀌면 이 테스트는 규칙이 아니라 진행 상황을 재는 것이 된다.
  const pending = WEEK_INDEX.find((w) => w.status.transcription === "pending");
  assert.ok(pending, "전사 전 주차가 하나도 없다 — 이 테스트의 전제가 바뀌었다");

  for (const audience of ["service", "internal_review"]) {
    const r = getWeekContent(pending.weekNo, audience);
    assert.equal(r.bodyVisible, false);
    assert.equal(r.content.scenes.length, 0);
  }
});

test("전사된 주차는 모두 내부 검수 경로에서 본문·장면·출처가 들어온다", () => {
  const done = WEEK_INDEX.filter((w) => w.status.transcription === "done");
  assert.ok(done.length > 0, "전사된 주차가 없다");

  for (const week of done) {
    const r = getWeekContent(week.weekNo, "internal_review");
    assert.equal(r.bodyVisible, true, `${week.weekNo}주차 본문이 열리지 않았다`);
    assert.ok(r.content.scenes.length > 0, `${week.weekNo}주차 장면이 없다`);
    assert.equal(
      typeof r.content.sourceFile,
      "string",
      `${week.weekNo}주차 출처 파일명이 없다`,
    );
  }
});

test("대조 주의 기록은 정식 서비스 경로로 새어 나가지 않는다", () => {
  for (const week of WEEK_INDEX) {
    const service = getWeekContent(week.weekNo, "service");
    assert.deepEqual(
      service.content.transcriptionNotes,
      [],
      `${week.weekNo}주차 전사 주의가 정식 경로에 나왔다`,
    );
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

test("교실 화면에 넘기는 장면에는 정해진 필드만 있다 (원아 정보 없음)", () => {
  const allowed = [
    "sceneNo",
    "sceneType",
    "kidText",
    "stageLabel",
    "teacherNote",
    "sourceRef",
    "baseSeconds",
  ].sort();

  const { content } = getWeekContent(1, "internal_review");
  assert.ok(content.scenes.length > 0);

  for (const scene of content.scenes) {
    assert.deepEqual(Object.keys(scene).sort(), allowed, `${scene.sceneNo}번 장면 필드`);

    // 아이들이 보는 문장과 교사 노트에 이름 자리표시가 섞이지 않았는지.
    for (const field of ["kidText", "stageLabel", "teacherNote"]) {
      const value = scene[field];
      if (typeof value !== "string") continue;
      assert.equal(/\{\{|\$\{|childName|원아명/.test(value), false, `${field} 치환자`);
    }
  }
});

test("장면 유형은 8종 안에 있고 아이 화면 문장은 비어 있지 않다", () => {
  const types = ["intro", "story", "promise", "play", "workbook", "create", "share", "home"];
  const { content } = getWeekContent(1, "internal_review");

  for (const scene of content.scenes) {
    assert.ok(types.includes(scene.sceneType), `${scene.sceneNo}번 유형 ${scene.sceneType}`);
    assert.ok(scene.kidText.trim().length > 0, `${scene.sceneNo}번 아이 화면 문장`);
    assert.ok(scene.sourceRef.trim().length > 0, `${scene.sceneNo}번 출처`);
  }

  // 장면 번호는 1부터 빠짐없이 이어진다.
  assert.deepEqual(
    content.scenes.map((s) => s.sceneNo),
    content.scenes.map((_, i) => i + 1),
  );
});
