import { test } from "node:test";
import assert from "node:assert/strict";
import { publicParts, publicWeeks, AVAILABLE_THROUGH_WEEK } from "../src/data/public-curriculum.ts";
import { approvedLessonSample, screenTourScenes } from "../src/data/public-sample.ts";
import { pricingPackages, priceDisclaimerLines } from "../src/data/packages.ts";

/**
 * 공개 페이지가 내보내는 데이터 검사.
 *
 * 공개 화면은 로그인 없이 열리고, 서버 컴포넌트가 읽은 값은 그대로 HTML 에
 * 실린다. 그래서 **데이터 모양**을 검사한다.
 */

test("공개 주차 요약에는 교안 본문·장면이 들어 있지 않다", () => {
  const allowed = [
    "weekNo",
    "partNo",
    "title",
    "growthKeyword",
    "coreMessage",
    "activitySummary",
    "outcome",
    "themeColor",
    "available",
  ].sort();

  assert.equal(publicWeeks.length, 24);
  for (const week of publicWeeks) {
    assert.deepEqual(Object.keys(week).sort(), allowed, `${week.weekNo}주차 필드`);
    // 15개 섹션 블록이나 교실 장면이 섞여 들어오지 않았는지.
    for (const forbidden of ["blocks", "scenes", "lessonSteps", "situations", "quickGuide"]) {
      assert.equal(forbidden in week, false, `${week.weekNo}주차에 ${forbidden}`);
    }
  }
});

test("제공 중인 주차와 준비 중인 주차가 나뉘어 있다", () => {
  const available = publicWeeks.filter((w) => w.available);
  const pending = publicWeeks.filter((w) => !w.available);

  assert.equal(available.length, AVAILABLE_THROUGH_WEEK);
  assert.equal(pending.length, 24 - AVAILABLE_THROUGH_WEEK);
  // 24주 전체를 지금 쓸 수 있는 것처럼 두지 않는다.
  assert.ok(pending.length > 0);
  assert.equal(
    available.every((w) => w.weekNo <= AVAILABLE_THROUGH_WEEK),
    true,
  );
});

test("세 권이 24주를 빠짐없이 나눈다", () => {
  assert.equal(publicParts.length, 3);
  const covered = publicParts.flatMap((p) => p.weeks.map((w) => w.weekNo));
  assert.deepEqual(
    covered.sort((a, b) => a - b),
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
  // 3권 이름은 공식 가이드에 없어 임시임을 표시해야 한다.
  assert.equal(publicParts[2].nameProvisional, true);
});

test("공개 샘플은 승인된 교안 샘플이 없으면 수업 내용을 쓰지 않는다", () => {
  assert.equal(approvedLessonSample, null);
  assert.ok(screenTourScenes.length > 0);
  for (const scene of screenTourScenes) {
    // 출처가 「수업 내용 아님」으로 적혀 있어야 한다.
    assert.match(scene.sourceRef, /수업 내용 아님/, `${scene.sceneNo}번 출처`);
    // 공식 가이드 출처 표기를 흉내내지 않는다.
    assert.equal(/가이드 \d/.test(scene.sourceRef), false, `${scene.sceneNo}번 가이드 출처 표기`);
  }
});

test("상품 가격은 상품소개서 v4 값과 같다", () => {
  const expected = {
    starter: { monthly: 99000, total: 198000, weeks: 8 },
    standard: { monthly: 150000, total: 600000, weeks: 16 },
    premium: { monthly: 250000, total: 1500000, weeks: 24 },
  };

  assert.equal(pricingPackages.length, 3);
  for (const pkg of pricingPackages) {
    const want = expected[pkg.id];
    assert.ok(want, `알 수 없는 상품 ${pkg.id}`);
    assert.equal(pkg.monthlyPriceKrw, want.monthly, `${pkg.id} 월 금액`);
    assert.equal(pkg.totalPriceKrw, want.total, `${pkg.id} 총액`);
    assert.equal(pkg.durationWeeks, want.weeks, `${pkg.id} 주차 수`);
    // 근거 없는 추천 배지를 달지 않는다.
    assert.equal(pkg.isBest, false, `${pkg.id} 추천 배지`);
  }

  // 부가세·기준 인원·추가 요금이 빠지지 않았는지.
  const terms = priceDisclaimerLines.join(" ");
  assert.match(terms, /부가세 별도/);
  assert.match(terms, /15명/);
  assert.match(terms, /6,600원/);
});

test("준비 중 구성을 포함으로 표시하지 않는다", () => {
  const states = new Set();
  for (const pkg of pricingPackages) {
    for (const f of pkg.features ?? []) {
      states.add(f.availability);
      assert.ok(f.label.length > 0);
    }
  }
  // 세 상태가 실제로 구분되어 쓰이고 있어야 한다.
  assert.equal(states.has("포함"), true);
  assert.equal(states.has("준비 중"), true);
});
