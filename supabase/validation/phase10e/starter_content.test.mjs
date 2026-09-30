// PHASE 10E — STARTER 2026.1 canonical W1~W8 콘텐츠 패키지 검사 (node:test · 새 npm 의존성 없음 · 네트워크 · DB 없음)
// ---------------------------------------------------------------------
// 실행:  node --test supabase/validation/phase10e/starter_content.test.mjs
//
// DB 적재 · Readiness · 게시본 보호는 supabase/tests/p0_phase10e_starter_content.test.sql (local) 이 판정한다.
// 원본 대조(원본 PDF 추출 텍스트 ↔ canonical)는 저장소 밖 원본이 필요해 여기서 하지 않는다 — 결과는
// docs/11-production-readiness/phase-10e-starter-content-approval.md 에 기록.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PKG = join(root, "content", "starter", "2026.1");
const build = await import(pathToFileURL(join(PKG, "build-sql.mjs")).href);
const { manifest, weeks } = build.loadPackage();
const labels = await import(pathToFileURL(join(root, "src", "lib", "curriculum", "lesson-sections.ts")).href);

test("manifest: STARTER 2026.1 = 8주 · W1~W8 · 원본 파일 · SHA-256 · 두 판본 기록", () => {
  assert.equal(manifest.program.product.code, "starter");
  assert.equal(manifest.program.product.version_label, "2026.1");
  assert.deepEqual([manifest.program.product.week_from, manifest.program.product.week_to, manifest.program.duration_weeks], [1, 8, 8]);
  assert.deepEqual(weeks.map((w) => w.week), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const w of weeks) {
    assert.equal(w.source.filename, `SOYE_KIDS_${w.week}주차_교사용_수업가이드.pdf`);
    assert.match(w.source.sha256, /^[0-9a-f]{64}$/);
    assert.match(w.source.alt_version.sha256, /^[0-9a-f]{64}$/);
    assert.equal(w.source.alt_version.text_identical, true);
    assert.ok(w.source.pages >= 8);
    assert.match(w.source_certainty, /^SOURCE EXISTS · TRANSCRIPTION (MACHINE-VERIFIED|HUMAN VERIFICATION REQUIRED)$/);
  }
  assert.equal(manifest.cross_reference.found_locally, false, "24주 데이터구조 문서는 로컬에 없음 (기록 유지)");
});

test("section 구성: 주차마다 17개 = DB · 앱 코드 집합 · 필수 11개 포함 · 순서 동일", () => {
  assert.deepEqual(build.SECTION_CODES, [...labels.LESSON_SECTION_CODES]);
  assert.deepEqual(build.REQUIRED, [...labels.REQUIRED_LESSON_SECTIONS]);
  for (const w of weeks) {
    assert.deepEqual(w.sections.map((s) => s.code), build.SECTION_CODES, `W${w.week} codes`);
    for (const code of build.REQUIRED) assert.ok(w.sections.find((s) => s.code === code)?.body.length >= 60, `W${w.week} ${code}`);
    assert.equal(Object.keys(w.section_source_map).length, 17);
  }
});

test("s8 = 미술 · s9 = 워크북 (앱 라벨) — 원본 절 번호가 반대인 주차는 교차 대응", () => {
  assert.match(labels.LESSON_SECTION_LABELS.s8, /미술/);
  assert.match(labels.LESSON_SECTION_LABELS.s9, /워크북/);
  for (const w of weeks) {
    const s8 = w.sections.find((s) => s.code === "s8");
    const s9 = w.sections.find((s) => s.code === "s9");
    assert.match(s8.label, /미술/, `W${w.week} s8 label ${s8.label}`);
    assert.match(s9.label, /워크북/, `W${w.week} s9 label ${s9.label}`);
    assert.ok(s8.label.startsWith(w.section_source_map.s8), `W${w.week} s8 source ${w.section_source_map.s8}`);
    assert.ok(s9.label.startsWith(w.section_source_map.s9), `W${w.week} s9 source ${w.section_source_map.s9}`);
  }
});

test("metadata ↔ 본문 일치: 제목 · 그림책 · 성장키워드 · 핵심 메시지 · 오늘의 목표", () => {
  for (const w of weeks) {
    const s2 = w.sections.find((s) => s.code === "s2").body;
    const s15 = w.sections.find((s) => s.code === "s15").body;
    assert.ok(s2.includes(`• 그림책 — ${w.storybook}`), `W${w.week} storybook`);
    assert.ok(s2.includes(`• 성장키워드 — ${w.growth_keyword}`), `W${w.week} keyword`);
    assert.ok(s2.includes(`• 핵심 메시지 — ${w.core_message}`), `W${w.week} core message`);
    assert.ok(s2.includes(`• 권장 핵심수업 시간 — ${w.recommended_duration}`), `W${w.week} duration`);
    assert.ok(s15.includes(w.objective), `W${w.week} objective`);
    assert.equal(w.storybook, `《${w.title}》`);
    if (w.cover_core_message) assert.ok(s2.includes(w.cover_core_message), `W${w.week} cover message kept`);
  }
  assert.deepEqual(weeks.map((w) => w.growth_keyword), ["시작", "끈기", "표현", "시작", "자존감", "협력", "기다림", "공동체"]);
  assert.ok(weeks[3].conflicts.some((c) => c.includes("성장키워드") && c.includes("사람 결정")), "W4 keyword conflict recorded");
});

test("합성 · 임시 표시 없음 · 없는 자산을 만들지 않음 (URL · 파일 경로 · 라이선스 주장)", () => {
  for (const w of weeks) {
    for (const s of w.sections) {
      assert.doesNotMatch(s.body, /\(가상\)|가상아이|샘플|TODO|FIXME|임시|dummy|lorem|placeholder|TBD/i, `W${w.week} ${s.code}`);
      assert.doesNotMatch(s.body, /https?:\/\/|www\.|\.(mp3|mp4|pdf|png|jpg)\b/i, `W${w.week} ${s.code} no asset URL`);
      assert.doesNotMatch(s.body, /저작권|라이선스|licen[cs]e|©/i, `W${w.week} ${s.code} no licensing claim`);
    }
  }
});

// 금지 의미: 진단 · 장애 추론 · 발달 점수 · 순위 · 백분위 · Growth5 자동 판정 · 만든 발달 주장 · AI 산출물
const PROHIBITED = /진단|장애|발달 ?지연|지연|점수|순위|등수|백분위|퍼센트|\d+ ?%|상위|하위|평가|우열|또래보다|뒤처|발달 ?단계|레벨|등급|판정|정상 ?발달|문제 ?행동|치료|IQ|AI|인공지능|자동/;
// 원본의 부정 · 금지 문장만 허용 (문맥이 "하지 않는다 / 피해야 할 반응" 인 것) — 새 표현이 생기면 사람이 검토해 추가한다
const ALLOW = [
  { week: 1, code: "s6", phrase: "아이의 첫날 감정을 평가하지 않고", why: "평가하지 않음 (부정)" },
  { week: 2, code: "s14", phrase: "피해야 할 반응: 등수·개수 칭찬", why: "피해야 할 반응 목록" },
  { week: 5, code: "s1", phrase: "한 가지 기준으로 아이를 평가하기보다", why: "평가하지 않음 (부정)" },
  { week: 5, code: "s6", phrase: "특별함을 우열이나 성취와 연결하지 않습니다", why: "우열 연결 금지 (부정)" },
  { week: 6, code: "s8", phrase: "멋진 집을 만드는 것이 1순위가 아닙니다", why: "결과 우선순위 부정 · 아동 순위 아님" },
  { week: 7, code: "s8", phrase: "예쁜 나비를 만드는 것이 1순위가 아닙니다", why: "결과 우선순위 부정 · 아동 순위 아님" },
  { week: 8, code: "s8", phrase: "‘예쁜 현수막’을 만드는 것이 1순위가 아닙니다", why: "결과 우선순위 부정 · 아동 순위 아님" },
  { week: 8, code: "s11", phrase: "누구의 작품이 더 멋진지 평가하지 않고", why: "평가하지 않음 (부정)" },
];

test("콘텐츠 안전: 진단 · 장애 추론 · 점수 · 순위 · 백분위 · 자동 판정 · AI 표현 없음 (원본의 부정 문장만 허용)", () => {
  const hits = [];
  for (const w of weeks) {
    for (const s of w.sections) {
      for (const line of s.body.split("\n")) {
        // 허용된 원본 부정 문장만 지운 뒤에도 금지 표현이 남으면 실패
        let rest = line;
        for (const a of ALLOW) if (a.week === w.week && a.code === s.code) rest = rest.split(a.phrase).join(" ");
        const m = rest.match(PROHIBITED);
        if (m) hits.push(`W${w.week} ${s.code}: …${rest.slice(Math.max(0, m.index - 20), m.index + 25)}…`);
      }
    }
  }
  assert.deepEqual(hits, []);
  for (const a of ALLOW) {
    const s = weeks[a.week - 1].sections.find((x) => x.code === a.code);
    assert.ok(s.body.includes(a.phrase), `allow-list 문장이 원본에 그대로 있어야 한다: W${a.week} ${a.code}`);
  }
});

test("관찰 · 기록 안내는 서술형 (교사가 관찰 · 사람 작성) — 판정 · 수치 없음", () => {
  for (const w of weeks) {
    const s12 = w.sections.find((s) => s.code === "s12").body;
    const rows = s12.split("\n").filter((l) => l.startsWith("• "));
    assert.equal(rows.length, 5, `W${w.week} 관찰영역 5개`);
    for (const r of rows) {
      assert.match(r, /^• .+ — 관찰할 행동: .+ \/ 기록 문장에 담을 것: .+/, `W${w.week} 관찰 행동 · 기록 서술 (${r.slice(0, 30)})`);
      assert.doesNotMatch(r, /\d+ ?(점|회 이상|%)/, `W${w.week} 수치 기준 없음`);
    }
    assert.match(s12, /키즈노트 (성장)?기록 예시/);
  }
});

test("교차 주차: W4~W7 산출물 → W8 대형 숲 현수막 (원본 문장으로 확인)", () => {
  const body = (week, code) => weeks[week - 1].sections.find((s) => s.code === code).body;
  assert.ok(body(8, "s8").includes("4~7주 동안 만든 완성품 또는 제공 도안을 현수막에 붙여"));
  assert.ok(body(8, "s4b").includes("씨앗 → 새싹 → 꽃 → 비·바람·햇살 → 나비·벌"));
  assert.ok(body(4, "s4a").includes("새싹 장식") && body(4, "s13").includes("씨앗 도안"), "W4 씨앗·새싹");
  assert.ok(body(5, "s8").includes("나만의 꽃"), "W5 꽃");
  assert.ok(body(6, "s13").includes("8주차 ‘우리 반 성장 숲’ 대형 현수막"), "W6 → W8 명시");
  assert.ok(body(7, "s4a").includes("데칼코마니용 나비 도안") && body(7, "s4a").includes("나비·벌 도안"), "W7 나비·벌");
  assert.ok(body(8, "s6").includes("1주차부터 7주차까지 만났던 자연 요소"));
  for (const w of [4, 5, 6, 7, 8]) assert.ok(weeks[w - 1].cross_week.length >= 1, `W${w} cross_week 기록`);
});

test("생성 SQL = canonical 파일에서 결정적으로 생성된 저장소 파일과 같다 · migration 폴더 밖", () => {
  const { load, publish, lessonIds, programId } = build.buildSql();
  const lf = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  assert.equal(lf(join(root, "supabase", "content", "starter_2026_1_load.sql")), load);
  assert.equal(lf(join(root, "supabase", "content", "starter_2026_1_publish.sql")), publish);
  assert.equal(new Set(lessonIds).size, 8);
  assert.equal(build.contentId("program:SOYE-STARTER-2026.1"), programId);
  assert.doesNotMatch(load, /\bdelete\s+from\b|\btruncate\b|\bdrop\b|\bbegin\s*;|\bcommit\s*;/i, "no destructive statements / no tx control");
  assert.doesNotMatch(load, /'published'/, "load 는 게시하지 않는다");
  assert.doesNotMatch(publish, /\bdelete\s+from\b|\btruncate\b|\bdrop\b/i);
  assert.doesNotMatch(load + publish, /@|password|service_role|sb_secret|eyJ/i, "no credentials / PII");
});
