// E3 — 24주 전사본(fixture) → 결정적 적재 SQL (새 npm 의존성 없음)
// ---------------------------------------------------------------------
// 실행:  node --import ./tests/register-hooks.mjs content/tap24/2026.1/build-sql.mjs
//        node --import ./tests/register-hooks.mjs content/tap24/2026.1/build-sql.mjs --check
//        (--check 는 생성 결과가 저장소 파일과 같은지만 본다 · exit 1 = 다름)
//
// 출력 (migration 이 아니다 — `supabase/migrations` 밖 · db push 로 적용되지 않는다):
//   supabase/content/tap24_2026_1_load.sql
//
// ── 기존 적재본과의 관계 ─────────────────────────────────────────
//
// `content/starter/2026.1/` 는 PHASE 10E 의 1~8주 기술 적재본이다. 그것을
// 고치지 않는다 — 게시본을 조용히 바꾸지 않는 것이 이 저장소의 규칙이고
// (DEC-096), 지금 전사본은 섹션 구조·장면·검수 기록까지 더 담는 **다른 버전**이다.
// 그래서 새 프로그램(SOYE-TAP24-2026.1)으로 적재하고, 상품 버전이 어느
// 프로그램을 쓰는지는 `product_version_programs` 가 가리킨다.
//
// ── 결정성과 멱등 ───────────────────────────────────────────────
//
// id = md5("soye-content:<key>") 를 UUID 형식으로 → 같은 입력 = 같은 SQL.
// 시각·난수 없음. 다시 돌려도 중복 행이 생기지 않고, 이미 검수·발행된 것을
// draft 로 되돌리지 않는다.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { WEEK_INDEX } from "../../../src/lib/weeks/week-index.ts";
import { getWeekContent } from "../../../src/lib/weeks/week-source.ts";
import { GUIDE_SOURCES } from "../../../src/lib/weeks/guide-sources.ts";
import { HQ_DECISIONS } from "../../../src/lib/weeks/hq-decisions.ts";
import { encodeSection, sectionPlan } from "../../../src/lib/weeks/section-mapping.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const OUT = join(ROOT, "supabase", "content", "tap24_2026_1_load.sql");

const PROGRAM_CODE = "SOYE-TAP24-2026.1";
const PROGRAM_TITLE = "SOYE KIDS TeachAble Art Play 24주 (2026.1)";
const PROGRAM_SUMMARY =
  "공식 교사용 수업가이드 1~24주 전사본. 15개 섹션·교실 화면 장면·전사 검수 기록 포함 (본사 검수 전 · draft)";

/** 상품 버전 ↔ 이 프로그램. week 범위는 product_versions 가 이미 들고 있다. */
const PRODUCT_VERSIONS = [
  { product: "starter", label: "2026.1" },
  { product: "standard", label: "2026.1" },
  { product: "premium", label: "2026.1" },
];

export function contentId(key) {
  const h = createHash("md5").update(`soye-content:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-3${h.slice(13, 16)}-${(
    (parseInt(h[16], 16) & 0x3) |
    0x8
  ).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/* ══════════════════════════════════ 섹션 번호 매핑 */

// ★ 매핑은 src/lib/weeks/section-mapping.ts 한 곳에 있다. 적재와 조회가
//   같은 매핑을 써야 어긋나지 않는다 — 여기에 복사해 두지 않는다.

/* ══════════════════════════════════ 평문 렌더 (body) */

const bullet = (lines) => lines.map((l) => `• ${l}`).join("\n");

function renderTable(table) {
  if (!table) return "";
  const head = table.columns.join(" | ");
  const rows = table.rows.map((r) => r.map((c) => (c === "" ? "—" : c)).join(" | "));
  return [head, ...rows].join("\n");
}

/**
 * 블록을 평문으로. `body` 는 구조를 모르는 기존 조회가 읽는 자리다.
 *
 * ★ 이 평문은 **읽기 편의**이고 기준이 아니다. 뜻을 지탱하는 것은 body_json
 *   이다. 그래서 평문에도 열 제목과 소제목을 그대로 적어 둔다 — 평문만 보고도
 *   「어느 칸의 말인지」를 알 수 있어야 한다.
 */
function renderBody(key, block, part) {
  switch (key) {
    case "beforeStart":
      return [
        block.intro,
        "",
        "수업의 경험 구조",
        block.experienceFlow.join(" → "),
        "",
        "교사의 역할",
        bullet(block.teacherRoles),
      ].join("\n");

    case "atAGlance":
      return [
        `주제 — ${block.theme}`,
        `그림책 — ${block.storybook}`,
        `성장키워드 — ${block.growthKeyword}`,
        `핵심 메시지 — ${block.coreMessage}`,
        `핵심 활동 — ${block.coreActivities.join(" → ")}`,
        `권장 핵심수업 시간 — ${block.durationLabel}`,
        `연계 콘텐츠 — ${block.linkedContents.join(", ")}`,
      ].join("\n");

    case "objectives":
      return [
        "영역 | 교육목표 | 교사가 볼 행동",
        ...block.map((o) => `${o.nuriArea} | ${o.objective} | ${o.teacherWatch}`),
      ].join("\n");

    case "preparation":
      if (part === "materials") {
        return ["구분 | 준비물", ...block.materials.map((m) => `${m.group} | ${m.item}`)].join("\n");
      }
      if (part === "spaceSetup") return bullet(block.spaceSetup);
      return bullet(block.safety);

    case "timetable":
      return renderTable(block.table);

    case "lessonSteps":
      return block
        .map((s) => {
          const out = [`${s.step}. ${s.title}`];
          if (s.body) out.push(s.body);
          if (s.questions.length > 0) out.push("교사 질문", bullet(s.questions));
          if (s.responses.length > 0) {
            out.push(
              "아이 반응 → 교사 대응",
              ...s.responses.map((r) => `${r.child} → ${r.teacher}`),
            );
          }
          if (s.extraList) out.push(s.extraList.label, bullet(s.extraList.items));
          if (s.notes.length > 0) out.push(...s.notes);
          return out.join("\n");
        })
        .join("\n\n");

    case "coreActivity": {
      const out = [block.title];
      if (block.intro) out.push(block.intro);
      for (const p of block.plays) {
        out.push("", p.label ? `${p.label}. ${p.title}` : p.title);
        if (p.points.length > 0) out.push(bullet(p.points));
        if (p.stepTable) out.push(renderTable(p.stepTable));
      }
      if (block.adaptations) out.push("", "현장 난이도 · 개별 지원", renderTable(block.adaptations));
      if (block.situations) out.push("", "활동 중 상황별 교사 말", renderTable(block.situations));
      return out.join("\n");
    }

    case "workbook": {
      const out = [];
      if (block.title) out.push(block.title);
      if (block.intro) out.push(block.intro, "");
      out.push(renderTable(block.table));
      if (block.outro) out.push("", block.outro);
      return out.join("\n");
    }

    case "art": {
      const out = [block.title];
      if (block.intro) out.push(block.intro);
      if (block.sameAsCoreActivity) {
        out.push("★ 위 핵심활동과 같은 활동입니다. 따로 한 번 더 하지 않습니다.");
      }
      if (block.steps.length > 0) out.push("", "진행 순서", bullet(block.steps));
      if (block.questions.length > 0) out.push("", "교사 발문", bullet(block.questions));
      if (block.steps.length === 0 && block.questions.length === 0) {
        out.push("", "※ 원문에 진행 순서와 교사 발문이 없습니다 (별도 제작 활동 없음).");
      }
      if (block.standard) out.push("", block.standard);
      return out.join("\n");
    }

    case "mediaOrWatch":
      return [block.title, renderTable(block.table)].join("\n");

    case "closing": {
      const out = [];
      if (block.intro) out.push(block.intro, "");
      out.push(bullet(block.questions));
      if (block.closingLine) {
        out.push("", block.closingLineLabel ?? "마지막 한 문장", block.closingLine);
      }
      return out.join("\n");
    }

    case "observationGuide": {
      const out = [renderTable(block.table)];
      if (block.recordExample) {
        out.push("", block.recordExampleLabel ?? "기록 예시", block.recordExample);
      }
      if (block.cautions.length > 0) {
        out.push("", block.cautionsLabel ?? "기록 시 주의", bullet(block.cautions));
      }
      return out.join("\n");
    }

    case "homeConnection": {
      const out = [block.title];
      if (block.status === "undecided") {
        out.push("※ 원문이 「미정」입니다. 확정 전까지 보호자에게 보내지 않습니다.");
      }
      if (block.description) out.push(block.description);
      if (block.steps.length > 0) {
        if (block.stepsLabel) out.push("", block.stepsLabel);
        out.push(bullet(block.steps));
      }
      if (block.examples) out.push("", block.examples.label, block.examples.text);
      if (block.noticeExample) {
        out.push("", block.noticeLabel ?? "부모님께 전달할 핵심 문장", block.noticeExample);
      }
      if (block.closingNote) out.push("", block.closingNote);
      return out.join("\n");
    }

    case "situations":
      return renderTable(block);

    case "quickGuide": {
      const out = [`오늘의 목표 — ${block.goal}`, "", renderTable(block.table)];
      if (block.closingNote) out.push("", block.closingNote);
      return out.join("\n");
    }

    default:
      throw new Error(`렌더할 수 없는 블록: ${key}`);
  }
}

/* ══════════════════════════════════ SQL 리터럴 */

const T = (s) => `$t$${s}$t$`;
const B = (s) => `$b$${s}$b$`;
const J = (o) => `$j$${JSON.stringify(o)}$j$::jsonb`;
const N = (v) => (v === null || v === undefined ? "null" : String(v));

function assertNoDollarTag(value, where) {
  // $t$ · $b$ · $j$ 가 본문에 들어 있으면 리터럴이 깨진다. 조용히 넘기지 않는다.
  for (const tag of ["$t$", "$b$", "$j$"]) {
    if (String(value).includes(tag)) {
      throw new Error(`${where}: 본문에 SQL 태그 ${tag} 가 들어 있다 — 빌더를 고쳐야 한다`);
    }
  }
}

/* ══════════════════════════════════ 생성 */

function build() {
  const programId = contentId(`program:${PROGRAM_CODE}`);
  const out = [];
  let sectionCount = 0;
  let sceneCount = 0;
  let noteCount = 0;

  out.push(
    "-- =====================================================================",
    "-- GENERATED by content/tap24/2026.1/build-sql.mjs — 직접 수정하지 않는다",
    "--   (fixture src/lib/weeks/content/week-NN.ts 를 고친 뒤 다시 생성한다)",
    "-- LOAD: draft 프로그램 1 · draft 차시 24 · 차시당 section 17 · 장면 240 · 검수 기록 168",
    "-- migration 이 아니다 · 트랜잭션 제어 없음 (호출자가 begin/commit) · 삭제 없음",
    "-- 사용자 · 계약 · 수업 · 관찰 · 리포트 데이터와 무관하다",
    "--",
    "-- 반복 실행 안전: 같은 내용이면 아무것도 바뀌지 않는다. 이미 검수·발행된 것을",
    "--   draft 로 되돌리지 않는다. 게시된 차시의 본문이 다르면 적재가 중단된다 (DEC-096).",
    "--",
    "-- 선행 migration: 20261014090000_e1_lesson_content_structure.sql",
    "-- =====================================================================",
    "",
  );

  /* ── 프로그램 ── */
  out.push(
    "do $load$",
    "declare",
    "  v_code text;",
    "begin",
    `  select code into v_code from public.curriculum_programs where id = '${programId}';`,
    "  if not found then",
    "    insert into public.curriculum_programs (id, code, title, summary, age_group, duration_weeks, status)",
    `    values ('${programId}', ${T(PROGRAM_CODE)}, ${T(PROGRAM_TITLE)}, ${T(PROGRAM_SUMMARY)}, null, 24, 'draft');`,
    `  elsif v_code is distinct from ${T(PROGRAM_CODE)} then`,
    "    raise exception 'TAP24 2026.1 program id 충돌 (code=%)', v_code;",
    "  end if;",
    "end;",
    "$load$;",
    "",
  );

  /* ── 상품 버전 ↔ 프로그램 ── */
  out.push(
    "-- 상품 버전이 어느 교안 프로그램을 쓰는가. 주차 번호가 아니라 program id 로 잇는다.",
    "-- ★ 이미 다른 프로그램을 가리키고 있으면 **바꾸지 않고 멈춘다** — 운영 중인 계약이",
    "--   보는 콘텐츠가 조용히 달라지면 안 된다.",
    "do $load$",
    "declare",
    "  v_version_id uuid;",
    "  v_linked uuid;",
    "begin",
  );
  for (const pv of PRODUCT_VERSIONS) {
    out.push(
      "  select pv.id into v_version_id",
      "  from public.product_versions pv",
      "  join public.products p on p.id = pv.product_id",
      `  where p.code = ${T(pv.product)} and pv.version_label = ${T(pv.label)};`,
      "  if found then",
      "    select program_id into v_linked from public.product_version_programs where product_version_id = v_version_id;",
      "    if not found then",
      `      insert into public.product_version_programs (product_version_id, program_id) values (v_version_id, '${programId}');`,
      `    elsif v_linked is distinct from '${programId}'::uuid then`,
      `      raise exception '${pv.product} ${pv.label} 이 이미 다른 프로그램(%)을 가리킨다 — 수동 확인 필요', v_linked;`,
      "    end if;",
      "  end if;",
      "",
    );
  }
  out.push("end;", "$load$;", "");

  /* ── 주차 ── */
  for (const week of WEEK_INDEX) {
    const { content } = getWeekContent(week.weekNo, "internal_review");
    const lessonId = contentId(`lesson:${PROGRAM_CODE}:w${week.weekNo}:s1`);
    const source = GUIDE_SOURCES[week.weekNo] ?? null;
    const plan = sectionPlan(week.weekNo);

    out.push(
      `-- ── W${week.weekNo} ${content.summary.title} · 성장키워드 ${content.summary.growthKeyword}`,
      "do $load$",
      "declare",
      "  v_status text;",
      "  v_body text;",
      "  v_body_json jsonb;",
      "  v_expected text;",
      "  v_expected_json jsonb;",
      "begin",
      `  select status into v_status from public.curriculum_lessons where id = '${lessonId}';`,
      "  if not found then",
      "    insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, objective, duration_minutes, status)",
      `    values ('${lessonId}', '${programId}', ${week.weekNo}, 1, ${T(content.summary.title)}, ${T(
        content.summary.coreMessage,
      )}, null, 'draft');`,
      "    v_status := 'draft';",
      "  end if;",
      "",
    );

    for (const entry of plan) {
      const block = content.blocks[entry.key];
      if (block === null || block === undefined) continue;

      const body = renderBody(entry.key, block, entry.part);
      assertNoDollarTag(body, `W${week.weekNo} ${entry.code}`);
      if (body.length === 0 || body.length > 10000) {
        throw new Error(
          `W${week.weekNo} ${entry.code}: body 길이 ${body.length} — 1~10000 이어야 한다`,
        );
      }

      // 봉투는 공유 함수가 만든다. 조회 쪽이 같은 모양을 기대한다.
      const json = encodeSection(content.blocks, entry);
      if (json === null) {
        throw new Error(`W${week.weekNo} ${entry.code}: 봉투를 만들 수 없다`);
      }
      const jsonText = JSON.stringify(json);
      assertNoDollarTag(jsonText, `W${week.weekNo} ${entry.code} json`);
      if (jsonText.length > 60000) {
        throw new Error(`W${week.weekNo} ${entry.code}: body_json ${jsonText.length}자 — 60000 초과`);
      }

      const sourceRef = source
        ? `${source.file} §${entry.code} (sha256:${source.sha256.slice(0, 16)}) · TAP24 2026.1`
        : `${content.sourceFile ?? "원문 미상"} §${entry.code} · TAP24 2026.1`;
      assertNoDollarTag(sourceRef, `W${week.weekNo} ${entry.code} source_ref`);

      out.push(
        `  v_expected := ${B(body)};`,
        `  v_expected_json := ${J(json)};`,
        `  select body, body_json into v_body, v_body_json from public.lesson_sections`,
        `  where lesson_id = '${lessonId}' and section_code = ${T(entry.code)};`,
        "  if not found then",
        "    if v_status <> 'draft' then",
        `      raise exception 'W${week.weekNo} 게시된 차시에 ${entry.code} 가 없다 — 새 버전으로 적재해야 한다';`,
        "    end if;",
        "    insert into public.lesson_sections (lesson_id, section_code, body, body_json, source_ref)",
        `    values ('${lessonId}', ${T(entry.code)}, v_expected, v_expected_json, ${T(sourceRef)});`,
        "  elsif v_body is distinct from v_expected or v_body_json is distinct from v_expected_json then",
        "    if v_status <> 'draft' then",
        `      raise exception 'W${week.weekNo} ${entry.code} 게시본과 전사본이 다르다 — 게시본은 조용히 고치지 않는다 (DEC-096)';`,
        "    end if;",
        `    update public.lesson_sections set body = v_expected, body_json = v_expected_json, source_ref = ${T(sourceRef)}`,
        `    where lesson_id = '${lessonId}' and section_code = ${T(entry.code)};`,
        "  end if;",
        "",
      );
      sectionCount += 1;
    }

    out.push("end;", "$load$;", "");

    /* 원문 출처 */
    if (source) {
      out.push(
        `insert into public.lesson_source_documents (lesson_id, file_name, sha256, page_count, byte_size)`,
        `values ('${lessonId}', ${T(source.file)}, ${T(source.sha256)}, ${source.pages}, ${N(source.bytes)})`,
        "on conflict (lesson_id, file_name) do update",
        "  set sha256 = excluded.sha256, page_count = excluded.page_count, byte_size = excluded.byte_size;",
        "",
      );
    }

    /* 장면 */
    for (const scene of content.scenes) {
      assertNoDollarTag(scene.kidText, `W${week.weekNo} scene ${scene.sceneNo}`);
      out.push(
        "insert into public.lesson_scenes (lesson_id, scene_no, scene_type, kid_text, stage_label, teacher_note, source_ref, base_seconds)",
        `values ('${lessonId}', ${scene.sceneNo}, ${T(scene.sceneType)}, ${B(scene.kidText)}, ${
          scene.stageLabel === null ? "null" : B(scene.stageLabel)
        }, ${scene.teacherNote === null ? "null" : B(scene.teacherNote)}, ${T(scene.sourceRef)}, ${N(
          scene.baseSeconds,
        )})`,
        "on conflict (lesson_id, scene_no) do update",
        "  set scene_type = excluded.scene_type, kid_text = excluded.kid_text,",
        "      stage_label = excluded.stage_label, teacher_note = excluded.teacher_note,",
        "      source_ref = excluded.source_ref, base_seconds = excluded.base_seconds;",
      );
      sceneCount += 1;
    }
    if (content.scenes.length > 0) out.push("");

    /* 검수 기록 */
    for (const note of content.transcriptionNotes) {
      assertNoDollarTag(note.issue, `W${week.weekNo} note`);
      out.push(
        "insert into public.lesson_review_notes (lesson_id, section_label, page_no, issue, category, status, evidence)",
        `values ('${lessonId}', ${B(note.section)}, ${note.page}, ${B(note.issue)}, ${T(
          note.category,
        )}, ${T(note.status)}, ${note.evidence === null ? "null" : B(note.evidence)})`,
        "on conflict (lesson_id, section_label, page_no) do update",
        "  set issue = excluded.issue, category = excluded.category,",
        // ★ 해결로 바뀐 것을 미해결로 되돌리지 않는다. 사람이 확인한 결과를
        //   적재 스크립트가 지우면 안 된다.
        // ON CONFLICT DO UPDATE 에서 기존 행은 **스키마 없이** 표 이름으로 가리킨다.
        "      status = case when lesson_review_notes.status = 'resolved' then 'resolved' else excluded.status end,",
        "      evidence = coalesce(lesson_review_notes.evidence, excluded.evidence);",
      );
      noteCount += 1;
    }
    if (content.transcriptionNotes.length > 0) out.push("");
  }

  /* ── 본사 결정 ── */
  out.push("-- ── 본사 결정 대기 목록 (원문만으로는 정할 수 없는 것들)");
  for (const d of HQ_DECISIONS) {
    const lessonId = contentId(`lesson:${PROGRAM_CODE}:w${d.weekNo}:s1`);
    assertNoDollarTag(d.recommendation, `decision ${d.id}`);
    out.push(
      "do $load$",
      "declare",
      "  v_id uuid;",
      "begin",
      `  select id into v_id from public.lesson_hq_decisions where decision_key = ${T(d.id)};`,
      "  if not found then",
      "    insert into public.lesson_hq_decisions",
      "      (decision_key, lesson_id, source_location, conflict, current_value, recommendation, affected_weeks, needs_source_fix, state)",
      `    values (${T(d.id)}, '${lessonId}', ${B(d.sourceLocation)}, ${B(d.conflict)}, ${B(
        d.currentValue,
      )}, ${B(d.recommendation)}, array[${d.affectedWeeks.join(", ")}]::integer[], ${
        d.needsSourceFix
      }, 'open')`,
      "    returning id into v_id;",
      "    insert into public.lesson_hq_decision_events (decision_id, event_type, memo)",
      `    values (v_id, 'opened', ${B("전사 중 발견 · TAP24 2026.1 적재")});`,
      "  else",
      // ★ state 는 건드리지 않는다. 사람이 'decided' 로 바꾼 것을 되돌리면 안 된다.
      "    update public.lesson_hq_decisions set",
      `      source_location = ${B(d.sourceLocation)}, conflict = ${B(d.conflict)},`,
      `      current_value = ${B(d.currentValue)}, recommendation = ${B(d.recommendation)},`,
      `      affected_weeks = array[${d.affectedWeeks.join(", ")}]::integer[], needs_source_fix = ${d.needsSourceFix}`,
      "    where id = v_id;",
      "  end if;",
      "end;",
      "$load$;",
      "",
    );
  }

  out.push(
    `-- 적재 요약: 차시 ${WEEK_INDEX.length} · section ${sectionCount} · 장면 ${sceneCount} · 검수 기록 ${noteCount} · 본사 결정 ${HQ_DECISIONS.length}`,
    "",
  );

  return { sql: out.join("\n"), sectionCount, sceneCount, noteCount };
}

/* ══════════════════════════════════ 실행 */

const result = build();
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  let existing = null;
  try {
    existing = readFileSync(OUT, "utf8");
  } catch {
    console.error(`생성물이 없다: ${OUT}`);
    process.exit(1);
  }
  if (existing !== result.sql) {
    console.error(`생성 결과가 저장소 파일과 다르다: ${OUT}`);
    console.error("fixture 를 고친 뒤 build-sql.mjs 를 다시 돌려야 한다.");
    process.exit(1);
  }
  console.log(
    `OK — section ${result.sectionCount} · 장면 ${result.sceneCount} · 검수 기록 ${result.noteCount}`,
  );
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, result.sql, "utf8");
  console.log(
    `생성: ${OUT}\n  차시 ${WEEK_INDEX.length} · section ${result.sectionCount} · 장면 ${result.sceneCount} · 검수 기록 ${result.noteCount} · 본사 결정 ${HQ_DECISIONS.length}`,
  );
}
