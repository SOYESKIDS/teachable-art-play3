/**
 * 공개 체험(/experience) 콘텐츠 검사.
 *
 * ★ 24주 전부 존재 · PART 별 8주 · 번호 중복 없음 · 빈 필드 없음
 * ★ 공식 값(week-index.ts)을 체험 데이터가 바꾸지 않았는가
 * ★ 체험용 본문은 official 로 표시되지 않는가 (임시 내용을 확정 교안처럼 보이지 않게)
 * ★ 누리과정 5개 영역 공식 명칭 · SOYE KIDS 핵심경험 승인 목록만 쓰는가 (섞이지 않는가)
 * ★ 교사 검토(2026-10-15)에서 지적된 표현이 체험 문장에 들어가지 않았는가
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXPERIENCE_WEEKS, EXPERIENCE_PARTS, parseDurationMinutes, splitMinutes, STAGE_ORDER } from "../src/data/experience/weeks.ts";
import { DEMO_LESSONS } from "../src/data/experience/demo-lessons.ts";
import { DEMO_REPORT } from "../src/data/experience/report.ts";
import { CHARACTERS, CHARACTER_GROUP, CHARACTERS_ENABLED, characterImage, characterGroupImage } from "../src/data/experience/characters.ts";
import { MEDIA, WEEK_MEDIA } from "../src/data/experience/media.ts";
import { WEEK_INDEX } from "../src/lib/weeks/week-index.ts";
import { NURI_AREA_LABEL, APPROVED_SOYE_CORE_EXPERIENCES, GROWTH_METRIC_LABEL } from "../src/lib/curriculum/taxonomies.ts";

const PUBLIC = new URL("../public/", import.meta.url);
const publicFile = (src) => fileURLToPath(new URL(src.replace(/^\//, ""), PUBLIC));
const NURI = new Set(Object.values(NURI_AREA_LABEL));
const SOYE = new Set(APPROVED_SOYE_CORE_EXPERIENCES);

test("24주가 모두 있고 번호가 1~24 로 한 번씩만 나온다", () => {
  assert.equal(EXPERIENCE_WEEKS.length, 24);
  assert.deepEqual(EXPERIENCE_WEEKS.map((w) => w.weekNo), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.equal(new Set(DEMO_LESSONS.map((l) => l.weekNo)).size, 24);
});

test("PART 마다 정확히 8주", () => {
  assert.equal(EXPERIENCE_PARTS.length, 3);
  for (const p of EXPERIENCE_PARTS) {
    const weeks = EXPERIENCE_WEEKS.filter((w) => w.partNo === p.partNo);
    assert.equal(weeks.length, 8, `PART ${p.partNo}`);
    assert.ok(weeks.every((w) => w.weekNo >= p.weekFrom && w.weekNo <= p.weekTo));
  }
});

test("공식 지도 값을 체험 데이터가 바꾸지 않는다", () => {
  for (const w of EXPERIENCE_WEEKS) {
    const o = WEEK_INDEX.find((x) => x.weekNo === w.weekNo);
    for (const k of ["title", "growthKeyword", "coreMessage", "durationLabel", "activitySummary", "themeColor"]) {
      assert.equal(w[k], o[k], `${w.weekNo}주 ${k}`);
    }
    assert.equal(w.outcome, o.outcome && o.outcome.trim() ? o.outcome : null, `${w.weekNo}주 outcome`);
  }
});

test("체험용 본문은 official 로 표시되지 않는다 (adapted · demo_draft 만)", () => {
  for (const l of DEMO_LESSONS) assert.ok(["adapted", "demo_draft"].includes(l.status), `${l.weekNo}주 ${l.status}`);
  assert.equal(DEMO_LESSONS.find((l) => l.weekNo === 4).status, "adapted");
});

test("빈 제목 · 목표 · 준비물 · 발문 · 관찰 · 안전 · 가정연계가 없다", () => {
  for (const w of EXPERIENCE_WEEKS) {
    const b = w.body;
    const at = `${w.weekNo}주`;
    assert.ok(w.title.trim(), `${at} title`);
    assert.ok(w.growthKeyword.trim(), `${at} keyword`);
    for (const k of ["goal", "story", "movement", "music", "explore", "art", "homeConnection", "closingQuestion"]) assert.ok(b[k]?.trim(), `${at} ${k}`);
    assert.ok(b.materials.length >= 3, `${at} materials`);
    assert.ok(b.teacherQuestions.length >= 3, `${at} questions`);
    assert.ok(b.observationPoints.length >= 3, `${at} observation`);
    assert.ok(b.safety.length >= 1, `${at} safety`);
    assert.ok(b.coreExperiences.length >= 2, `${at} core experiences`);
    for (const k of STAGE_ORDER) assert.ok(b.childLines[k]?.trim(), `${at} childLine ${k}`);
  }
});

test("누리과정은 공식 5개 영역 명칭만, SOYE KIDS 핵심경험은 승인 목록만 — 서로 섞이지 않는다", () => {
  for (const l of DEMO_LESSONS) {
    assert.ok(l.nuriAreas.length >= 1, `${l.weekNo}주 nuri`);
    for (const a of l.nuriAreas) assert.ok(NURI.has(a), `${l.weekNo}주 누리 영역 아님: ${a}`);
    for (const s of l.soyeCoreExperiences) {
      assert.ok(SOYE.has(s), `${l.weekNo}주 승인되지 않은 핵심경험: ${s}`);
      assert.ok(!NURI.has(s), `${l.weekNo}주 핵심경험이 누리 영역 이름과 같다: ${s}`);
    }
    assert.equal(new Set(l.nuriAreas).size, l.nuriAreas.length, `${l.weekNo}주 중복`);
  }
});

test("수업 다섯 단계 · 시간 합이 공식 수업 시간 가운데 값과 같다", () => {
  for (const w of EXPERIENCE_WEEKS) {
    assert.deepEqual(w.stages.map((s) => s.key), STAGE_ORDER);
    const sum = w.stages.reduce((n, s) => n + s.minutes, 0);
    assert.equal(sum, parseDurationMinutes(w.durationLabel), `${w.weekNo}주`);
    assert.ok(w.stages.every((s) => s.minutes >= 3 && s.childLine && s.guide && s.teacherQuestion));
  }
  assert.equal(parseDurationMinutes("약 55~65분"), 60);
  assert.equal(Object.values(splitMinutes(53)).reduce((a, b) => a + b, 0), 53);
});

test("이미지 · 캐릭터 파일이 실제로 있다 (깨진 그림 없음)", () => {
  if (CHARACTERS_ENABLED) for (const c of [...Object.values(CHARACTERS), CHARACTER_GROUP]) assert.ok(existsSync(publicFile(c.src)), c.src);
  for (const m of Object.values(MEDIA)) assert.ok(existsSync(publicFile(m.src)), m.src);
  for (const m of Object.values(WEEK_MEDIA)) assert.ok(existsSync(publicFile(m.src)), m.src);
  for (const p of EXPERIENCE_PARTS) assert.ok(existsSync(publicFile(p.image.src)), p.image.src);
});

test("교사 검토에서 지적된 표현이 체험 문장에 없다", () => {
  const text = JSON.stringify(DEMO_LESSONS) + JSON.stringify(DEMO_REPORT);
  for (const bad of ["몰래", "촬영하는 것처럼", "키즈노트", "엄마"]) assert.ok(!text.includes(bad), bad);
});

test("가상 리포트는 다섯 관점을 모두 쓰고 점수 · 순위 · 등급 · 진단 표현이 없다", () => {
  const metrics = new Set(DEMO_REPORT.moments.map((m) => m.metric));
  assert.deepEqual([...metrics].sort(), Object.keys(GROWTH_METRIC_LABEL).sort());
  const text = JSON.stringify(DEMO_REPORT);
  assert.ok(!/\d+\s*점|점수|순위|등급|진단|상위|하위\s*\d/.test(text));
  assert.match(DEMO_REPORT.childLabel, /가상/);
});

test("캐릭터 사용권 확인 전(CHARACTERS_ENABLED=false)에는 화면에도 배포 파일에도 캐릭터가 없다", () => {
  if (CHARACTERS_ENABLED) return;
  for (const k of Object.keys(CHARACTERS)) assert.equal(characterImage(k), null, k);
  assert.equal(characterGroupImage(), null);
  // public/ 은 그대로 배포된다 — 꺼 둔 동안에는 파일 자체가 없어야 공개 URL 로 새지 않는다
  for (const c of [...Object.values(CHARACTERS), CHARACTER_GROUP]) assert.ok(!existsSync(publicFile(c.src)), `배포 폴더에 남아 있다: ${c.src}`);
});
