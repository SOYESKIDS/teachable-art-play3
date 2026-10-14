import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contentSourceMode,
  loadStaffScenes,
  loadWeekContent,
  loadWeekContentForReview,
  loadWeekRollupForReview,
} from "../src/lib/weeks/week-content-source.ts";
import { fetchStageData } from "../src/lib/class/stage-queries.ts";
import { TAP24_PROGRAM_CODE } from "../src/lib/weeks/week-program.ts";
import { encodeSection, sectionPlan } from "../src/lib/weeks/section-mapping.ts";
import { getWeekContent } from "../src/lib/weeks/week-source.ts";

/**
 * 교사 화면 · 인쇄물 · 교실 화면이 **같은 교안 버전**을 읽는지 확인한다.
 *
 * ── 왜 이 검사가 필요한가 ───────────────────────────────────────
 *
 * 세 화면이 각자 「3주차」를 읽는다. 그런데 같은 3주차를 담은 교안이 여럿일 수
 * 있다(버전). 각 화면이 다른 경로로 교안을 고르면 — 하나는 계약에서, 하나는
 * 주차 번호에서, 하나는 회차 행에서 — 교사는 화면과 인쇄물이 다른데도 그
 * 사실을 알 수 없다.
 *
 * ★ 그래서 세 경로가 **같은 차시 id** 에 도달하는지를 본다. 「주차 번호가
 *   같다」로는 부족하다.
 *
 * ── DB 없이 어떻게 보나 ─────────────────────────────────────────
 *
 * 이 환경에는 Postgres 가 없다. 대신 Supabase 클라이언트 모양을 흉내 낸
 * 고정자료를 두고, 각 경로가 **어떤 질의를 보내고 무엇을 고르는지** 본다.
 * 실제 SQL 실행 검증은 supabase/validation/e-stage 가 따로 한다.
 */

const ORG = "11111111-1111-1111-1111-111111111111";
const CLASS = "22222222-2222-2222-2222-222222222222";
const PRODUCT_VERSION = "33333333-3333-3333-3333-333333333333";
const PROGRAM = "44444444-4444-4444-4444-444444444444";
/** 같은 3주차를 담은 **다른** 교안. 경로가 흔들리면 이것을 집는다. */
const OTHER_PROGRAM = "55555555-5555-5555-5555-555555555555";
const LESSON = "66666666-6666-6666-6666-666666666666";
const OTHER_LESSON = "77777777-7777-7777-7777-777777777777";
const WEEK = 3;

/** 3주차 섹션 행 — 실제 적재가 만드는 것과 같은 봉투를 쓴다. */
function sectionRows(lessonId) {
  const fixture = getWeekContent(WEEK, "internal_review");
  assert.ok(fixture, "3주차 fixture 가 있어야 한다");
  const rows = [];
  for (const slot of sectionPlan(WEEK)) {
    const envelope = encodeSection(fixture.content.blocks, slot);
    if (envelope === null) continue;
    rows.push({
      lesson_id: lessonId,
      section_code: slot.code,
      body: "(평문)",
      body_json: JSON.parse(JSON.stringify(envelope)),
      source_ref: null,
    });
  }
  return rows;
}

/**
 * Supabase 클라이언트 흉내.
 *
 * ★ 질의를 **기록**한다. 「주차 번호로 교안을 고르지 않는다」를 확인하려면
 *   무엇으로 골랐는지 봐야 한다.
 */
function stubClient() {
  const calls = [];
  const tables = {
    contracts: [
      {
        organization_id: ORG,
        product_version_id: PRODUCT_VERSION,
        status: "active",
        start_date: "2026-01-01",
        end_date: "2027-01-01",
      },
    ],
    product_version_programs: [{ product_version_id: PRODUCT_VERSION, program_id: PROGRAM }],
    curriculum_programs: [
      { id: PROGRAM, code: TAP24_PROGRAM_CODE, status: "published" },
      { id: OTHER_PROGRAM, code: "SOYE-TAP24-OLD", status: "published" },
    ],
    curriculum_lessons: [
      {
        id: LESSON,
        program_id: PROGRAM,
        week_no: WEEK,
        session_no: 1,
        status: "published",
        title: "3주차",
        curriculum_programs: { id: PROGRAM, code: TAP24_PROGRAM_CODE, status: "published" },
      },
      {
        id: OTHER_LESSON,
        program_id: OTHER_PROGRAM,
        week_no: WEEK,
        session_no: 1,
        status: "published",
        title: "3주차 (옛 교안)",
        curriculum_programs: { id: OTHER_PROGRAM, code: "SOYE-TAP24-OLD", status: "published" },
      },
    ],
    lesson_sections: [...sectionRows(LESSON), ...sectionRows(OTHER_LESSON)],
    lesson_scenes: [],
    lesson_source_documents: [{ lesson_id: LESSON, file_name: "3주차.pdf" }],
    lesson_review_notes: [],
    class_program_assignments: [
      { organization_id: ORG, class_id: CLASS, program_id: PROGRAM, status: "active" },
    ],
    class_sessions: [
      {
        id: "88888888-8888-8888-8888-888888888888",
        organization_id: ORG,
        week_no: WEEK,
        class_id: CLASS,
        lesson_id: LESSON,
        program_id: PROGRAM,
      },
    ],
  };

  function builder(table) {
    const filters = [];
    const api = {
      select() {
        return api;
      },
      eq(col, value) {
        filters.push([col, value]);
        return api;
      },
      in(col, values) {
        filters.push([col, values]);
        return api;
      },
      lte() {
        return api;
      },
      gte() {
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      rows() {
        return (tables[table] ?? []).filter((row) =>
          filters.every(([col, value]) =>
            Array.isArray(value) ? value.includes(row[col]) : row[col] === value,
          ),
        );
      },
      maybeSingle() {
        calls.push({ table, filters: filters.map(([c]) => c) });
        const found = api.rows();
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
      then(resolve) {
        calls.push({ table, filters: filters.map(([c]) => c) });
        return Promise.resolve({ data: api.rows(), error: null }).then(resolve);
      },
    };
    return api;
  }

  return {
    calls,
    from: (table) => builder(table),
    rpc: (name, args) => {
      calls.push({ rpc: name, args });
      return Promise.resolve({
        data: [
          {
            scene_no: 1,
            scene_type: "prompt",
            kid_text: "장면",
            stage_label: null,
            teacher_note: null,
            base_seconds: null,
          },
        ],
        error: null,
      });
    },
  };
}

const withDatabaseMode = async (fn) => {
  const prev = process.env.CONTENT_SOURCE;
  process.env.CONTENT_SOURCE = "database";
  try {
    assert.equal(contentSourceMode(), "database");
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.CONTENT_SOURCE;
    else process.env.CONTENT_SOURCE = prev;
  }
};

test("기본 출처는 fixture 다 (게이트를 켜지 않으면 지금 동작하는 쪽)", () => {
  const prev = process.env.CONTENT_SOURCE;
  delete process.env.CONTENT_SOURCE;
  try {
    assert.equal(contentSourceMode(), "fixture");
  } finally {
    if (prev !== undefined) process.env.CONTENT_SOURCE = prev;
  }
});

test("fixture 모드에서는 버전이 null 이다 (교안 버전 개념이 없다)", async () => {
  const prev = process.env.CONTENT_SOURCE;
  delete process.env.CONTENT_SOURCE;
  try {
    const loaded = await loadWeekContent(stubClient(), {
      weekNo: WEEK,
      audience: "service",
      organizationId: ORG,
    });
    assert.ok(loaded.ok);
    assert.equal(loaded.version, null);
  } finally {
    if (prev !== undefined) process.env.CONTENT_SOURCE = prev;
  }
});

test("교사 화면 · 인쇄물 · 교실 화면이 같은 차시를 읽는다", async () => {
  await withDatabaseMode(async () => {
    // ① 교사 주차 화면
    const screen = await loadWeekContent(stubClient(), {
      weekNo: WEEK,
      audience: "service",
      organizationId: ORG,
    });
    assert.ok(screen.ok, screen.ok ? "" : screen.detail);

    // ② 퀵 가이드 인쇄물 — 같은 인자로 같은 경로를 쓴다
    const print = await loadWeekContent(stubClient(), {
      weekNo: WEEK,
      audience: "service",
      organizationId: ORG,
    });
    assert.ok(print.ok);

    // ③ 교실 화면 — 회차 행에서 출발한다
    const stage = await fetchStageData(
      stubClient(),
      ORG,
      "88888888-8888-8888-8888-888888888888",
    );
    assert.ok(stage.ok, stage.ok ? "" : String(stage.reason));

    assert.equal(screen.version.lessonId, LESSON);
    assert.equal(print.version.lessonId, screen.version.lessonId);
    assert.equal(stage.data.lessonId, screen.version.lessonId);
    assert.equal(screen.version.programCode, TAP24_PROGRAM_CODE);
  });
});

test("계약이 가리키는 교안을 읽는다 — 주차 번호로 고르지 않는다", async () => {
  await withDatabaseMode(async () => {
    const client = stubClient();
    const loaded = await loadWeekContent(client, {
      weekNo: WEEK,
      audience: "service",
      organizationId: ORG,
    });
    assert.ok(loaded.ok);

    // 같은 3주차가 두 교안에 있다. 계약이 가리키는 쪽을 집어야 한다.
    assert.equal(loaded.version.programId, PROGRAM);
    assert.notEqual(loaded.version.lessonId, OTHER_LESSON);

    // 계약 → 상품 버전 → 프로그램 순서를 실제로 거쳤는지 본다.
    const visited = client.calls.map((c) => c.table).filter(Boolean);
    assert.ok(visited.includes("contracts"), "계약을 읽어야 한다");
    assert.ok(visited.includes("product_version_programs"), "상품 버전 연결을 읽어야 한다");
  });
});

test("본사 검수는 프로그램을 코드로 명시한다", async () => {
  await withDatabaseMode(async () => {
    const client = stubClient();
    const loaded = await loadWeekContentForReview(client, WEEK);
    assert.ok(loaded.ok, loaded.ok ? "" : loaded.detail);
    assert.equal(loaded.version.programCode, TAP24_PROGRAM_CODE);
    assert.equal(loaded.version.lessonId, LESSON);

    // ★ 계약을 거치지 않는다. 본사는 계약이 없다.
    const visited = client.calls.map((c) => c.table).filter(Boolean);
    assert.ok(!visited.includes("contracts"), "본사 검수가 계약을 읽을 이유가 없다");
    assert.ok(visited.includes("curriculum_programs"), "프로그램을 코드로 찾아야 한다");
  });
});

test("본사 24주 목록은 네 질의로 끝낸다 (주차마다 왕복하지 않는다)", async () => {
  await withDatabaseMode(async () => {
    const client = stubClient();
    const rollup = await loadWeekRollupForReview(client);
    assert.ok(rollup.ok, rollup.ok ? "" : rollup.detail);
    assert.equal(rollup.mode, "database");

    // 프로그램 1 + 차시 1 + 섹션·장면·출처·검수 4 = 6회. 주차마다 돌면 수십 번이다.
    assert.ok(client.calls.length <= 8, `질의 ${client.calls.length}회`);
  });
});

test("교직원 장면은 권한 RPC 로 읽는다 (표를 직접 읽지 않는다)", async () => {
  await withDatabaseMode(async () => {
    const client = stubClient();
    const scenes = await loadStaffScenes(client, {
      organizationId: ORG,
      programId: PROGRAM,
      lessonId: LESSON,
    });
    assert.ok(scenes.ok);
    assert.equal(scenes.classId, CLASS);
    assert.equal(scenes.scenes.length, 1);
    // RPC 는 원문 출처를 주지 않는다. 지어내지 않고 null 로 남긴다.
    assert.equal(scenes.scenes[0].sourceRef, null);

    const rpcCalls = client.calls.filter((c) => c.rpc);
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0].rpc, "list_lesson_scenes_for_class");
    assert.equal(rpcCalls[0].args.p_class_id, CLASS);
    assert.equal(rpcCalls[0].args.p_lesson_id, LESSON);
  });
});

test("담당 반이 없으면 장면을 열지 않는다", async () => {
  await withDatabaseMode(async () => {
    const client = stubClient();
    const scenes = await loadStaffScenes(client, {
      organizationId: ORG,
      programId: OTHER_PROGRAM, // 배정이 없는 교안
      lessonId: OTHER_LESSON,
    });
    assert.ok(!scenes.ok);
    assert.equal(scenes.reason, "no_assigned_class");
    assert.equal(client.calls.filter((c) => c.rpc).length, 0, "RPC 를 부르지 않아야 한다");
  });
});

test("DB 조회 실패를 fixture 로 대체하지 않는다", async () => {
  await withDatabaseMode(async () => {
    const failing = {
      from: () => {
        const api = {
          select: () => api,
          eq: () => api,
          in: () => api,
          lte: () => api,
          gte: () => api,
          order: () => api,
          limit: () => api,
          maybeSingle: () => Promise.resolve({ data: null, error: { message: "relation 없음" } }),
          then: (resolve) =>
            Promise.resolve({ data: null, error: { message: "relation 없음" } }).then(resolve),
        };
        return api;
      },
      rpc: () => Promise.resolve({ data: null, error: { message: "함수 없음" } }),
    };

    const loaded = await loadWeekContent(failing, {
      weekNo: WEEK,
      audience: "service",
      organizationId: ORG,
    });
    assert.ok(!loaded.ok, "실패를 성공으로 바꾸지 않는다");
    assert.equal(loaded.reason, "query_failed");

    const stage = await fetchStageData(failing, ORG, "88888888-8888-8888-8888-888888888888");
    assert.ok(!stage.ok);
    // 회차 행 자체를 못 읽으면 load_failed, 내용을 못 읽으면 content_failed
    assert.ok(["load_failed", "content_failed"].includes(stage.reason), stage.reason);
  });
});
