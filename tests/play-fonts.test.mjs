/**
 * 공개 체험 글꼴 서브셋 검사 (정적).
 *
 * ★ 공개 체험 화면 소스에 든 글자가 모두 서브셋 글자 목록에 있는지 본다.
 *   문구를 고치고 서브셋을 다시 만들지 않으면 여기서 실패한다 →
 *   python scripts/subset-play-fonts.py <Jua-Regular.ttf>
 *   (빠진 글자도 Pretendard 로 대체되어 깨지지는 않지만, 제목 글꼴이 한 글자만 달라진다)
 * ★ 루트 layout 이 다시 무거운 글꼴(명조 · Jua 전체 조각)을 모든 페이지에 싣지 않는지 본다.
 * ★ 명조를 쓰는 화면이 있는 구역은 SerifFontScope 로 감싸져 있는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPERIENCE_WEEKS, EXPERIENCE_PARTS } from "../src/data/experience/weeks.ts";
import { STAGE_LABEL } from "../src/data/experience/types.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(ROOT, "src", "fonts", "play");

// scripts/subset-play-fonts.py 의 SOURCE_GLOBS 와 같은 범위
const SOURCES = [
  "src/app/page.tsx",
  "src/app/experience",
  "src/components/play",
  "src/components/forms",
  "src/components/layout/BrandMark.tsx",
  "src/data/experience",
  "src/lib/weeks/week-index.ts",
  "src/lib/weeks/week-types.ts",
  "src/lib/curriculum/taxonomies.ts",
];

function walk(p) {
  const abs = join(ROOT, p);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs, { recursive: true })
    .map((f) => join(abs, f))
    .filter((f) => /\.(ts|tsx)$/.test(f));
}

const dataFiles = readdirSync(join(ROOT, "src", "data"))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join(ROOT, "src", "data", f));

test("공개 체험 소스의 모든 글자가 서브셋 글자 목록에 있다", () => {
  const glyphs = new Set(readFileSync(join(FONT_DIR, "play-glyphs.txt"), "utf8"));
  const missing = new Map();
  for (const file of [...SOURCES.flatMap(walk), ...dataFiles]) {
    for (const ch of readFileSync(file, "utf8")) {
      const cp = ch.codePointAt(0);
      if (cp < 0x20 || cp >= 0x1f000 || ch === "﻿") continue;
      if (!glyphs.has(ch)) missing.set(ch, relative(ROOT, file));
    }
  }
  assert.deepEqual(
    [...missing].map(([c, f]) => `${c} (${f})`),
    [],
    "서브셋을 다시 만드세요: python scripts/subset-play-fonts.py <Jua-Regular.ttf>",
  );
});

test("서브셋 글꼴 파일 · 라이선스가 있고 크기가 예산 안이다", () => {
  for (const [file, maxKb] of [["tap-play-sans.woff2", 220], ["tap-play-display.woff2", 190]]) {
    const abs = join(FONT_DIR, file);
    assert.ok(existsSync(abs), file);
    assert.ok(statSync(abs).size < maxKb * 1024, `${file} ${Math.round(statSync(abs).size / 1024)}KB > ${maxKb}KB`);
  }
  assert.match(readFileSync(join(FONT_DIR, "OFL-Pretendard.txt"), "utf8"), /Reserved Font Name 'Pretendard'/);
  assert.match(readFileSync(join(FONT_DIR, "OFL-Jua.txt"), "utf8"), /SIL Open Font License/);
  // OFL 예약 이름 — 수정본(서브셋)은 Pretendard 라는 이름을 쓰지 않는다
  assert.doesNotMatch(readFileSync(join(FONT_DIR, "index.ts"), "utf8"), /src:\s*"[^"]*pretendard/i);
});

test("루트 layout 은 명조 · Jua 를 모든 페이지에 싣지 않는다", () => {
  const layout = readFileSync(join(ROOT, "src", "app", "layout.tsx"), "utf8");
  assert.doesNotMatch(layout, /next\/font\/google/);
});

test("명조를 쓰는 구역은 SerifFontScope 로 감싸져 있다", () => {
  const appDir = join(ROOT, "src", "app");
  const serifUsers = readdirSync(appDir, { recursive: true })
    .filter((f) => /\.tsx$/.test(f))
    .filter((f) => {
      const src = readFileSync(join(appDir, f), "utf8");
      return /font-serif|ClassStage|SampleStage|ParentGrowthReportView|StaffWeekPage|WeekRibbon|WeekTabPanels/.test(src) && !/^layout\.tsx$/.test(f);
    })
    .map((f) => f.split(/[\\/]/)[0]);
  const segments = [...new Set(serifUsers)].filter((s) => !s.endsWith(".tsx"));
  assert.ok(segments.length >= 5, segments.join());
  for (const seg of segments) {
    const layout = join(appDir, seg, "layout.tsx");
    assert.ok(existsSync(layout) && /SerifFontScope/.test(readFileSync(layout, "utf8")), `src/app/${seg}/layout.tsx 에 SerifFontScope 가 없다`);
  }
  // 공개 체험 화면은 명조를 쓰지 않는다 (쓰면 명조 글꼴이 다시 필요해진다)
  for (const file of ["src/app/page.tsx", "src/app/experience", "src/components/play"].flatMap(walk)) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /font-serif/, relative(ROOT, file));
  }
});

test("둥근 제목 글꼴 목록이 주차명 · 교실 문장 · 단계 이름 글자를 모두 담는다", () => {
  const path = join(FONT_DIR, "display-glyphs.txt");
  assert.ok(existsSync(path), "node scripts/collect-play-display-glyphs.mjs 로 만든다");
  const display = new Set(readFileSync(path, "utf8"));
  const sans = new Set(readFileSync(join(FONT_DIR, "play-glyphs.txt"), "utf8"));
  const texts = [
    ...EXPERIENCE_WEEKS.flatMap((w) => [w.title, `${w.weekNo}주차`, `《${w.title}》`, ...w.stages.flatMap((s) => [s.title, s.childLine])]),
    ...EXPERIENCE_PARTS.map((p) => p.title),
    ...Object.values(STAGE_LABEL),
  ];
  const missing = [...new Set(texts.join(""))].filter((c) => c.trim() && !display.has(c));
  assert.deepEqual(missing, [], "글자 목록을 다시 모으고 서브셋을 다시 만드세요 (scripts/collect-play-display-glyphs.mjs)");
  // 제목 글꼴 글자는 본문 서브셋에도 있어야 한다 (빠진 글자의 대체 글꼴)
  assert.deepEqual([...display].filter((c) => !sans.has(c)), []);
});

test("공개 체험 화면은 서브셋 굵기 범위(400~800) 밖의 굵기를 쓰지 않는다", () => {
  for (const file of SOURCES.flatMap(walk)) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bfont-(thin|extralight|light|black)\b|font-\[(1|2|3|9)00\]/, relative(ROOT, file));
  }
});
