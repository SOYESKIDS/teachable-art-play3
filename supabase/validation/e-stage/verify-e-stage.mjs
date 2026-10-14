/**
 * E단계 SQL 실행 검증 — 격리된 Postgres 에서 실제로 돌린다.
 *
 * 실행:
 *   DATABASE_URL=postgres://... node supabase/validation/e-stage/verify-e-stage.mjs
 *
 * 순서: shim → migration 전체 → 적재 → 재적재 → 단언
 *
 * ★ 원격 DB 에는 절대 쓰지 않는다. DATABASE_URL 이 supabase.co 를 가리키면
 *   시작하지 않는다 — 검증 스크립트가 운영 DB 를 건드리는 사고를 막는다.
 * ★ 이 스크립트는 **격리 환경 전용**이다. shim.sql 은 Supabase 플랫폼이
 *   제공하는 것(auth·storage·역할)의 최소 대역이고 운영에 쓰지 않는다.
 */

import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");
const LOAD_SQL = join(ROOT, "supabase", "content", "tap24_2026_1_load.sql");
const STARTER_SQL = join(ROOT, "supabase", "content", "starter_2026_1_load.sql");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 이 없다.");
  process.exit(2);
}
if (/supabase\.(co|com)/i.test(url) || /\.supabase\./i.test(url)) {
  console.error("DATABASE_URL 이 Supabase 호스트를 가리킨다 — 이 스크립트는 격리 환경 전용이다.");
  process.exit(2);
}

const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function expectError(client, label, sql, matcher, params = []) {
  try {
    await client.query(sql, params);
    check(label, false, "거부되지 않고 통과했다");
  } catch (e) {
    const msg = String(e.message);
    check(label, matcher.test(msg), matcher.test(msg) ? "" : `다른 오류: ${msg.split("\n")[0]}`);
  }
}

/**
 * 「막혀서 아무것도 못 가져온다」를 판정한다.
 *
 * ★ `catch(() => 0)` 으로 뭉뚱그리지 않는다. 그렇게 쓰면 표가 없거나 SQL 이
 *   틀려도 **0행 성공**으로 읽혀 통과한다 — 검증이 아무것도 보지 않게 된다.
 *
 * 통과: 조회가 되고 0행  ·  권한 오류(42501 · RLS)로 거부
 * 실패: 1행이라도 나옴  ·  그 밖의 오류(표 없음 · 문법 오류 · 함수 없음)
 */
const DENIAL_CODES = new Set(["42501"]);

async function expectNoRows(client, label, sql, params = []) {
  try {
    const r = await client.query(sql, params);
    const n = r.rows.length;
    check(label, n === 0, n === 0 ? "조회 가능 · 0행" : `${n}행이 새어 나왔다`);
  } catch (e) {
    const denied =
      DENIAL_CODES.has(e.code) || /row-level security|permission denied/i.test(String(e.message));
    check(
      label,
      denied,
      denied
        ? `거부됨 (${e.code})`
        : `예상 밖 오류 [${e.code}] ${String(e.message).split("\n")[0]}`,
    );
  }
}

const one = async (client, sql, params = []) => (await client.query(sql, params)).rows[0];
const count = async (client, sql, params = []) => Number((await one(client, sql, params)).c);

async function main() {
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();

  /* ── 1. shim + migration ── */
  console.log("── shim · migration");
  await admin.query(readFileSync(join(HERE, "shim.sql"), "utf8"));

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    try {
      await admin.query(readFileSync(join(MIGRATIONS, f), "utf8"));
    } catch (e) {
      check(`migration ${f}`, false, String(e.message).split("\n")[0]);
      console.error("\n선행 migration 이 실패해 이후 검사를 할 수 없다.");
      process.exit(1);
    }
  }
  check(`migration ${files.length}건 적용`, true);

  /* ── 2. 기존 STARTER 적재가 여전히 동작하는가 ── */
  console.log("\n── 기존 기능 유지");
  await admin.query("begin");
  await admin.query(readFileSync(STARTER_SQL, "utf8"));
  await admin.query("commit");
  check(
    "기존 STARTER 2026.1 적재가 그대로 성공한다",
    (await count(admin, "select count(*) c from public.curriculum_programs where code = 'SOYE-STARTER-2026.1'")) === 1,
  );
  const starterSections = await count(
    admin,
    `select count(*) c from public.lesson_sections s
     join public.curriculum_lessons l on l.id = s.lesson_id
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-STARTER-2026.1'`,
  );
  check("기존 STARTER 섹션이 그대로 적재된다", starterSections === 136, `${starterSections}건`);
  check(
    "기존 STARTER 섹션은 body_json 이 null 이다 (구조 없는 옛 적재본 보존)",
    (await count(
      admin,
      `select count(*) c from public.lesson_sections s
       join public.curriculum_lessons l on l.id = s.lesson_id
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-STARTER-2026.1' and s.body_json is not null`,
    )) === 0,
  );

  /* ── 3. 24주 적재 ── */
  console.log("\n── 24주 적재");
  const t0 = Date.now();
  await admin.query("begin");
  await admin.query(readFileSync(LOAD_SQL, "utf8"));
  await admin.query("commit");
  check("적재 성공", true, `${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const scope = `
    join public.curriculum_lessons l on l.id = x.lesson_id
    join public.curriculum_programs p on p.id = l.program_id
    where p.code = 'SOYE-TAP24-2026.1'`;

  const lessons = await count(
    admin,
    `select count(*) c from public.curriculum_lessons l
     join public.curriculum_programs p on p.id = l.program_id
     where p.code = 'SOYE-TAP24-2026.1'`,
  );
  check("차시 24", lessons === 24, `${lessons}`);

  const sections = await count(admin, `select count(*) c from public.lesson_sections x ${scope}`);
  check("섹션 408", sections === 408, `${sections}`);

  const scenes = await count(admin, `select count(*) c from public.lesson_scenes x ${scope}`);
  check("장면 240", scenes === 240, `${scenes}`);

  const notes = await count(admin, `select count(*) c from public.lesson_review_notes x ${scope}`);
  check("검수 기록 168", notes === 168, `${notes}`);

  const decisions = await count(admin, "select count(*) c from public.lesson_hq_decisions");
  check("본사 결정 3", decisions === 3, `${decisions}`);

  check(
    "body_json 이 빠진 섹션이 없다",
    (await count(admin, `select count(*) c from public.lesson_sections x ${scope} and x.body_json is null`)) === 0,
  );
  check(
    "최초 적재는 전부 draft (자동 발행 없음)",
    (await count(
      admin,
      `select count(*) c from public.curriculum_lessons l
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-TAP24-2026.1' and l.status <> 'draft'`,
    )) === 0,
  );
  check(
    "원문 출처 24건 (파일명·해시만)",
    (await count(admin, `select count(*) c from public.lesson_source_documents x ${scope}`)) === 24,
  );
  check(
    "상품 버전 3개가 프로그램에 연결된다",
    (await count(
      admin,
      `select count(*) c from public.product_version_programs pvp
       join public.curriculum_programs p on p.id = pvp.program_id
       where p.code = 'SOYE-TAP24-2026.1'`,
    )) === 3,
  );

  /* ── 4. 재적재 ── */
  console.log("\n── 재적재 (멱등)");
  const beforeUpdated = await one(
    admin,
    `select max(x.updated_at) m from public.lesson_sections x ${scope}`,
  );

  // 사람이 해결로 바꾼 기록 하나 — 재적재가 되돌리면 안 된다
  await admin.query(
    `update public.lesson_review_notes set status = 'resolved', evidence = '사람이 확인함 (검증)'
     where id = (select n.id from public.lesson_review_notes n
       join public.curriculum_lessons l on l.id = n.lesson_id
       join public.curriculum_programs p on p.id = l.program_id
       where p.code = 'SOYE-TAP24-2026.1' and n.status = 'unresolved' limit 1)`,
  );
  // 본사 결정 하나를 decided 로 — 재적재가 open 으로 되돌리면 안 된다
  await admin.query("update public.lesson_hq_decisions set state = 'decided' where decision_key = 'w02-duration-label'");

  await admin.query("begin");
  await admin.query(readFileSync(LOAD_SQL, "utf8"));
  await admin.query("commit");

  check("재적재 후에도 섹션 408", (await count(admin, `select count(*) c from public.lesson_sections x ${scope}`)) === 408);
  check("재적재 후에도 장면 240", (await count(admin, `select count(*) c from public.lesson_scenes x ${scope}`)) === 240);
  check("재적재 후에도 검수 기록 168", (await count(admin, `select count(*) c from public.lesson_review_notes x ${scope}`)) === 168);
  check(
    "재적재가 resolved 를 되돌리지 않는다",
    (await count(admin, "select count(*) c from public.lesson_review_notes where evidence = '사람이 확인함 (검증)' and status = 'resolved'")) === 1,
  );
  check(
    "재적재가 본사 결정 state 를 되돌리지 않는다",
    (await one(admin, "select state from public.lesson_hq_decisions where decision_key = 'w02-duration-label'")).state === "decided",
  );
  const afterUpdated = await one(admin, `select max(x.updated_at) m from public.lesson_sections x ${scope}`);
  check(
    "같은 내용 재적재는 섹션을 건드리지 않는다",
    String(beforeUpdated.m) === String(afterUpdated.m),
    String(beforeUpdated.m) === String(afterUpdated.m) ? "" : "updated_at 이 변했다",
  );

  /* ── 5. 발행 게이트 ── */
  console.log("\n── 발행 게이트");
  const lessonOf = async (w) =>
    (
      await one(
        admin,
        `select l.id from public.curriculum_lessons l
         join public.curriculum_programs p on p.id = l.program_id
         where p.code = 'SOYE-TAP24-2026.1' and l.week_no = $1`,
        [w],
      )
    ).id;

  const w6 = await lessonOf(6);
  const w1 = await lessonOf(1);

  // HQ 사용자 준비
  const hq = (await one(admin, "insert into auth.users (email) values ('hq@test.local') returning id")).id;
  await admin.query("insert into private.admin_users (user_id, role) values ($1, 'admin') on conflict do nothing", [hq]);

  const asUser = async (client, uid) =>
    client.query("select set_config('request.jwt.claim.sub', $1, false)", [uid === null ? "" : uid]);

  const hqClient = new pg.Client({ connectionString: url });
  await hqClient.connect();
  await hqClient.query("set role authenticated");
  await asUser(hqClient, hq);

  const blockers6 = (await hqClient.query("select blocker from public.lesson_publish_blockers($1)", [w6])).rows.map((r) => r.blocker);
  check("6주차는 본사 결정 대기로 막힌다", blockers6.includes("open_hq_decisions"), blockers6.join(","));

  const blockers1 = (await hqClient.query("select blocker from public.lesson_publish_blockers($1)", [w1])).rows.map((r) => r.blocker);
  check("프로그램이 draft 면 막힌다", blockers1.includes("program_not_published"), blockers1.join(","));

  await expectError(hqClient, "체크섬 형식이 아니면 거부", "select public.publish_lesson($1, 'nope')", /체크섬/, [w1]);

  // 프로그램을 게시하고 1주차만 통과 상태로 만든다
  await admin.query("update public.curriculum_programs set status = 'published' where code = 'SOYE-TAP24-2026.1'");
  const checksum1 = (await one(admin, "select private.lesson_content_checksum($1) c", [w1])).c;

  await expectError(
    hqClient,
    "오래된 체크섬으로는 발행되지 않는다",
    "select public.publish_lesson($1, $2)",
    /검수 이후 본문이 바뀌었습니다/,
    [w1, "0".repeat(64)],
  );

  // 권한 없는 사용자
  const plain = (await one(admin, "insert into auth.users (email) values ('plain@test.local') returning id")).id;
  const plainClient = new pg.Client({ connectionString: url });
  await plainClient.connect();
  await plainClient.query("set role authenticated");
  await asUser(plainClient, plain);
  await expectError(
    plainClient,
    "본사가 아니면 발행이 거부된다",
    "select public.publish_lesson($1, $2)",
    /본사 관리자만/,
    [w1, checksum1],
  );
  await expectError(
    plainClient,
    "본사가 아니면 검수 상태도 못 본다",
    "select * from public.lesson_review_state($1)",
    /본사 관리자만/,
    [w1],
  );

  /* ── 6. status 직접 UPDATE 우회 ── */
  console.log("\n── 발행 우회 차단");
  await expectError(
    admin,
    "status 직접 UPDATE 로 발행할 수 없다",
    "update public.curriculum_lessons set status = 'published' where id = $1",
    /publish_lesson\(\) 으로만/,
    [w6],
  );

  /* ── 7. 동시 수정 · 발행 (두 세션) ── */
  console.log("\n── 두 세션 동시 수정·발행");
  const sessA = new pg.Client({ connectionString: url });
  const sessB = new pg.Client({ connectionString: url });
  await sessA.connect();
  await sessB.connect();
  await sessA.query("set role authenticated");
  await sessB.query("set role authenticated");
  await asUser(sessA, hq);
  await asUser(sessB, hq);

  // A: 본문 수정 시작 (커밋하지 않음) → 차시 행을 잠근다
  await sessA.query("begin");
  await sessA.query(
    "update public.lesson_sections set body = body || ' (A 가 수정 중)' where lesson_id = $1 and section_code = 's1'",
    [w1],
  );

  // B: 같은 차시 발행 시도 → A 의 잠금에 막혀 기다린다
  await sessB.query("begin");
  let bSettled = false;
  const bPromise = sessB
    .query("select public.publish_lesson($1, $2)", [w1, checksum1])
    .then(() => ({ ok: true }))
    .catch((e) => ({ ok: false, message: String(e.message) }))
    .then((r) => {
      bSettled = true;
      return r;
    });

  await new Promise((r) => setTimeout(r, 1200));
  check("발행이 수정 중인 세션의 잠금에 막혀 기다린다", bSettled === false);

  await sessA.query("commit");
  const bResult = await bPromise;
  await sessB.query("rollback").catch(() => {});

  check(
    "A 가 커밋한 뒤 B 의 발행은 바뀐 본문을 보고 거부된다",
    bResult.ok === false && /검수 이후 본문이 바뀌었습니다/.test(bResult.message ?? ""),
    bResult.ok ? "발행이 통과했다 — 검수하지 않은 내용이 나갔다" : (bResult.message ?? "").split("\n")[0],
  );

  await sessA.end();
  await sessB.end();

  /* ── 8. 실제 발행 → 발행 후 보호 ── */
  console.log("\n── 발행 후 수정 거부");
  const freshChecksum = (await one(admin, "select private.lesson_content_checksum($1) c", [w1])).c;
  const published = await hqClient.query("select * from public.publish_lesson($1, $2)", [w1, freshChecksum]);
  check("미해결 없는 주차는 발행된다", published.rows.length === 1 && published.rows[0].lesson_status === "published");

  await expectError(
    admin,
    "발행된 차시의 장면은 직접 수정할 수 없다",
    "update public.lesson_scenes set kid_text = kid_text || '!' where lesson_id = $1 and scene_no = 1",
    /게시 중이거나 보관된 차시의 교실 화면 장면/,
    [w1],
  );
  await expectError(
    admin,
    "발행된 차시의 본문은 직접 수정할 수 없다",
    "update public.lesson_sections set body = body || '!' where lesson_id = $1 and section_code = 's1'",
    /게시 중이거나 보관된 차시의 수업 섹션/,
    [w1],
  );
  await expectError(
    admin,
    "발행된 차시의 장면은 삭제할 수 없다",
    "delete from public.lesson_scenes where lesson_id = $1 and scene_no = 1",
    /게시 중이거나 보관된 차시의 교실 화면 장면/,
    [w1],
  );
  await expectError(
    hqClient,
    "이미 발행된 차시는 다시 발행되지 않는다",
    "select public.publish_lesson($1, $2)",
    /already_published|이미 발행/,
    [w1, freshChecksum],
  );

  /* ── 9. 범위 밖 접근 ── */
  console.log("\n── 기관·반·상품 범위");
  // ★ RLS 는 거부가 아니라 **0행**으로 답한다. 그것이 설계다 — 「있는데 못
  //   본다」와 「없다」를 구분해 주면 열거에 쓰인다. 쓰기만 오류로 막는다.
  await expectError(
    plainClient,
    "본사가 아니면 검수 기록을 쓸 수 없다",
    `insert into public.lesson_review_notes (lesson_id, section_label, page_no, issue, category, status)
     values ($1, '침입', 1, '침입', 'extraction', 'unresolved')`,
    /row-level security|permission denied|violates|거부/i,
    [w1],
  );
  await expectNoRows(
    plainClient,
    "본사가 아닌 사용자에게 검수 기록이 0행이다",
    "select id from public.lesson_review_notes limit 5",
  );
  await expectNoRows(
    plainClient,
    "본사가 아닌 사용자에게 본사 결정이 0행이다",
    "select id from public.lesson_hq_decisions limit 5",
  );
  await expectNoRows(
    plainClient,
    "본사가 아닌 사용자에게 원문 출처가 0행이다",
    "select id from public.lesson_source_documents limit 5",
  );
  await expectNoRows(
    plainClient,
    "본사가 아닌 사용자에게 장면 직접 조회가 0행이다 (RPC 로만 읽는다)",
    "select id from public.lesson_scenes limit 5",
  );
  await expectNoRows(
    plainClient,
    "소속 없는 사용자는 수업 본문(body·body_json)도 0행이다",
    "select body, body_json from public.lesson_sections limit 5",
  );
  await expectError(
    plainClient,
    "담당 반이 아니면 장면 RPC 가 거부한다",
    "select * from public.list_lesson_scenes_for_class($1, $2)",
    /이 반의 콘텐츠를 볼 수 없습니다|insufficient/,
    ["00000000-0000-0000-0000-000000000001", w1],
  );

  /* ── 10. 실제 계약 범위 — 8주 계약이 24주차를 못 본다 ── */
  console.log("\n── 계약 주차 범위");

  // 8주(starter) 계약 기관 하나를 만든다. 실제 계약·반·배정을 모두 만든다 —
  // 「화면에서 숨기는 것」이 아니라 DB 가 막는지 보려면 진짜 범위가 필요하다.
  // ★ 계약 생성·활성화에는 Readiness 게이트가 걸려 있다. 여기서 보려는 것은
  //   그 게이트가 아니라 **콘텐츠 범위 제한**이므로, 기존 pgTAP 과 같은
  //   방식으로 트리거를 잠시 끄고 고정자료를 만든다.
  await admin.query("set session_replication_role = replica");
  const fx = await one(
    admin,
    `with org as (
       insert into public.organizations (name, status) values ('검증 유치원', 'active') returning id
     ), cls as (
       insert into public.classes (organization_id, name, school_year, status)
       select id, '햇살반', 2026, 'active' from org returning id, organization_id
     ), pv as (
       select pv.id from public.product_versions pv
       join public.products p on p.id = pv.product_id
       where p.code = 'starter' and pv.version_label = '2026.1'
     ), ct as (
       insert into public.contracts (organization_id, product_version_id, status, start_date, end_date)
       select org.id, pv.id, 'active', current_date - 1, current_date + 365 from org, pv returning id, organization_id
     ), cc as (
       insert into public.contract_classes (organization_id, contract_id, class_id)
       select ct.organization_id, ct.id, cls.id from ct, cls returning class_id
     ), asg as (
       insert into public.class_program_assignments (organization_id, class_id, program_id, status)
       select cls.organization_id, cls.id,
              (select id from public.curriculum_programs where code = 'SOYE-TAP24-2026.1'), 'active'
       from cls returning class_id
     )
     select (select id from cls) class_id, (select id from org) org_id`,
  );

  await admin.query("set session_replication_role = origin");

  const teacher = (await one(admin, "insert into auth.users (email) values ('teacher@test.local') returning id")).id;
  const member = (
    await one(
      admin,
      "insert into public.organization_members (organization_id, user_id, role, status) values ($1, $2, 'teacher', 'active') returning id",
      [fx.org_id, teacher],
    )
  ).id;
  // 담당 반 배정. 이것이 없으면 같은 기관이어도 거부된다 — 그게 맞는 동작이다.
  await admin.query(
    "insert into public.class_teachers (organization_id, class_id, organization_member_id) values ($1, $2, $3)",
    [fx.org_id, fx.class_id, member],
  );

  const teacherClient = new pg.Client({ connectionString: url });
  await teacherClient.connect();
  await teacherClient.query("set role authenticated");
  await asUser(teacherClient, teacher);

  // 1주차는 이미 발행됐고 starter 계약(1~8주) 범위 안이다 → 보인다
  const seenW1 = (
    await teacherClient.query("select * from public.list_lesson_scenes_for_class($1, $2)", [fx.class_id, w1])
  ).rows.length;
  check("계약 범위 안 · 발행된 주차는 담당 교사에게 보인다", seenW1 > 0, `${seenW1}개 장면`);

  // 24주차를 발행해도 starter 계약(1~8주) 범위 밖이라 보이면 안 된다
  const w24 = await lessonOf(24);
  await admin.query(
    `update public.lesson_review_notes set status = 'resolved', evidence = '검증용 일괄 해결'
     where lesson_id = $1 and status = 'unresolved'`,
    [w24],
  );
  const checksum24 = (await one(admin, "select private.lesson_content_checksum($1) c", [w24])).c;
  await hqClient.query("select public.publish_lesson($1, $2)", [w24, checksum24]);

  const seenW24 = (
    await teacherClient.query("select * from public.list_lesson_scenes_for_class($1, $2)", [fx.class_id, w24])
  ).rows.length;
  check("상품 범위 밖(24주차)은 발행돼도 8주 계약 교사에게 0행", seenW24 === 0, `${seenW24}개 장면`);

  await expectNoRows(
    teacherClient,
    "범위 밖 주차는 장면 직접 조회로도 0행이다",
    "select id from public.lesson_scenes where lesson_id = $1",
    [w24],
  );

  // ── 본문 직접 조회 (E4) ──
  // ★ 장면보다 본문이 담는 내용이 많다. E3 는 장면만 막았고 본문은 「활성
  //   기관 구성원 ∧ 게시됨」 이면 **어느 주차든** 읽혔다 — 더 큰 구멍이었다.
  await expectNoRows(
    teacherClient,
    "8주 계약 교사는 24주 본문(body·body_json)을 읽지 못한다",
    "select body, body_json from public.lesson_sections where lesson_id = $1",
    [w24],
  );

  // 수업 활동도 같은 내용을 담는 다른 문이다. 고정자료가 없으면 검사가
  // 공허하게 통과하므로 양쪽 주차에 실제 행을 심어 두고 본다.
  await admin.query(
    `insert into public.lesson_activities (lesson_id, sequence_no, title, activity_type)
     values ($1, 1, '검증용 활동 1주', 'activity'), ($2, 1, '검증용 활동 24주', 'activity')
     on conflict (lesson_id, sequence_no) do nothing`,
    [w1, w24],
  );
  await expectNoRows(
    teacherClient,
    "8주 계약 교사는 24주 수업 활동도 읽지 못한다",
    "select id from public.lesson_activities where lesson_id = $1",
    [w24],
  );

  // 반대쪽도 본다. 전부 막아 놓고 통과시키면 검증이 아니다.
  const w1Body = (
    await teacherClient.query("select body, body_json from public.lesson_sections where lesson_id = $1", [w1])
  ).rows.length;
  check("계약 범위 안 주차의 본문은 담당 교사에게 읽힌다", w1Body === 17, `${w1Body}개 섹션`);
  const w1Act = (
    await teacherClient.query("select id from public.lesson_activities where lesson_id = $1", [w1])
  ).rows.length;
  check("계약 범위 안 주차의 수업 활동은 담당 교사에게 읽힌다", w1Act === 1, `${w1Act}행`);

  // ── 교안 버전 일치 ──
  // 교사 화면은 **계약 → 상품 버전 → 프로그램** 으로 교안을 찾고, 교실 화면은
  // **회차 → 배정 → 프로그램** 으로 찾는다. 두 경로가 다른 교안을 가리키면
  // 교사는 화면과 교실 화면이 다른데도 알 수 없다.
  const sameProgram = await one(
    admin,
    `select
       (select pvp.program_id
          from public.contracts c
          join public.product_version_programs pvp on pvp.product_version_id = c.product_version_id
         where c.organization_id = $1 and c.status = 'active' limit 1) as by_contract,
       (select cpa.program_id
          from public.class_program_assignments cpa
         where cpa.class_id = $2 and cpa.status = 'active' limit 1) as by_assignment`,
    [fx.org_id, fx.class_id],
  );
  check(
    "계약이 가리키는 교안과 반 배정 교안이 같다 (화면·인쇄물·교실 화면이 같은 버전)",
    sameProgram.by_contract !== null && sameProgram.by_contract === sameProgram.by_assignment,
    `계약 ${sameProgram.by_contract} · 배정 ${sameProgram.by_assignment}`,
  );

  // 다른 기관 교사
  const other = (await one(admin, "insert into auth.users (email) values ('other@test.local') returning id")).id;
  const otherOrg = (await one(admin, "insert into public.organizations (name, status) values ('다른 유치원', 'active') returning id")).id;
  await admin.query(
    "insert into public.organization_members (organization_id, user_id, role, status) values ($1, $2, 'teacher', 'active')",
    [otherOrg, other],
  );
  const otherClient = new pg.Client({ connectionString: url });
  await otherClient.connect();
  await otherClient.query("set role authenticated");
  await asUser(otherClient, other);

  await expectError(
    otherClient,
    "다른 기관 교사는 그 반의 장면 RPC 가 거부된다",
    "select * from public.list_lesson_scenes_for_class($1, $2)",
    /이 반의 콘텐츠를 볼 수 없습니다/,
    [fx.class_id, w1],
  );
  await expectNoRows(
    otherClient,
    "다른 기관 교사에게 장면 직접 조회는 0행이다",
    "select id from public.lesson_scenes limit 5",
  );
  await expectNoRows(
    otherClient,
    "다른 기관 교사는 1주차 본문도 읽지 못한다",
    "select body, body_json from public.lesson_sections where lesson_id = $1",
    [w1],
  );

  // ── 담당 외 반 ──
  // 같은 기관이지만 담당 반이 없는 구성원. 기관으로 묶여 있다는 것만으로
  // 본문이 열리는지 본다.
  const bystander = (
    await one(admin, "insert into auth.users (email) values ('bystander@test.local') returning id")
  ).id;
  await admin.query(
    "insert into public.organization_members (organization_id, user_id, role, status) values ($1, $2, 'teacher', 'active')",
    [fx.org_id, bystander],
  );
  const bystanderClient = new pg.Client({ connectionString: url });
  await bystanderClient.connect();
  await bystanderClient.query("set role authenticated");
  await asUser(bystanderClient, bystander);
  await expectError(
    bystanderClient,
    "담당 외 반은 같은 기관 교사에게도 장면 RPC 가 거부된다",
    "select * from public.list_lesson_scenes_for_class($1, $2)",
    /이 반의 콘텐츠를 볼 수 없습니다/,
    [fx.class_id, w1],
  );
  await expectNoRows(
    bystanderClient,
    "담당 외 반은 24주 본문도 0행이다",
    "select body, body_json from public.lesson_sections where lesson_id = $1",
    [w24],
  );

  // ── 만료 계약 ──
  // 담당 교사여도 계약이 끝나면 닫혀야 한다. 기간이 지난 뒤에도 읽히면
  // 해지한 기관이 교안을 계속 쓴다.
  await admin.query("set session_replication_role = replica");
  await admin.query(
    "update public.contracts set start_date = current_date - 400, end_date = current_date - 1 where organization_id = $1",
    [fx.org_id],
  );
  await admin.query("set session_replication_role = origin");

  await expectNoRows(
    teacherClient,
    "만료된 계약에서는 1주차 본문이 읽히지 않는다",
    "select body, body_json from public.lesson_sections where lesson_id = $1",
    [w1],
  );
  await expectNoRows(
    teacherClient,
    "만료된 계약에서는 1주차 수업 활동도 읽히지 않는다",
    "select id from public.lesson_activities where lesson_id = $1",
    [w1],
  );
  await expectError(
    teacherClient,
    "만료된 계약에서는 장면 RPC 가 거부한다",
    "select * from public.list_lesson_scenes_for_class($1, $2)",
    /이 반의 콘텐츠를 볼 수 없습니다/,
    [fx.class_id, w1],
  );

  await bystanderClient.end();
  await teacherClient.end();
  await otherClient.end();
  await hqClient.end();
  await plainClient.end();
  await admin.end();

  console.log(
    `\n결과: ${results.length - failures}/${results.length} 통과${failures > 0 ? ` · 실패 ${failures}` : ""}`,
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("검증 중 오류:", e.message);
  console.error(e.stack);
  process.exit(2);
});
