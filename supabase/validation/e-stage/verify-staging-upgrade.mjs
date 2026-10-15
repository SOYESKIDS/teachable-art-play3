/**
 * 스테이징 **실제 기준** 업그레이드 검증.
 *
 * ── 왜 또 하나인가 ─────────────────────────────────────────────────
 *
 * 이미 두 가지가 있다.
 *   verify-e-stage.mjs  빈 DB 에 전체 적용
 *   verify-upgrade.mjs  #1~#21(운영 기준) + 업무 데이터 → 후속 전체 적용
 *
 * 그런데 **스테이징은 둘 다 아니다.** 2026-10-14 읽기 전용 점검으로 확인된
 * 스테이징의 실제 이력은 `20261002100000_p10c_release_controls` 까지에
 * `20261002110000_uat_db_guard` 가 더해진 상태다. 그 위에 올릴 것은 아래
 * 기존 11개와 교사 교안 조회 RPC 1개다 (저장소 문서의 「#39부터」같은 번호가 아니라 version 으로 적는다).
 *
 *   20261012090000_d3_lead_notification_outbox
 *   20261012091000_c3_portal_expiry_rate_limit
 *   20261012092000_b2_lesson_assets
 *   20261012093000_c3b_portal_access_policy
 *   20261012094000_d3b_lead_notification_delivery
 *   20261012095000_c2b_period_report_compose
 *   20261012096000_b2b_lesson_asset_predownload
 *   20261014090000_e1_lesson_content_structure
 *   20261014091000_e2_lesson_publish_gate
 *   20261014092000_e3_publish_lock_and_scope
 *   20261014093000_e4_lesson_section_scope
 *   20261015020314_staff_content_program_lookup (교사 계약표 비공개 유지)
 *
 * ── 무엇을 지키는지 본다 ──────────────────────────────────────────
 *
 * 스테이징에는 합성 UAT 자료가 살아 있다. 업그레이드가 그것을 깨뜨리면
 * 직원 UAT 를 처음부터 다시 만들어야 한다. 그래서 적용 **전후**로
 *
 *   · 합성 기관 · 반 · 담임 · 원아 · 계약 · 배정 · 회차 8건
 *   · STARTER 발행본 (8차시 · 136섹션 · 주차마다 필수 11섹션)
 *   · 미래 회차 쓰기 금지 (uat_db_guard · SS009)
 *   · 학부모 공유 신규 발급 잠금 (PT004 · parent_portal 미출시)
 *
 * 를 모두 확인한다. **가드가 업그레이드 뒤에도 살아 있는지**가 핵심이다 —
 * 새 migration 이 트리거를 지우거나 함수를 덮어써도 적용은 성공하기 때문이다.
 *
 * 실행: DATABASE_URL=... node supabase/validation/e-stage/verify-staging-upgrade.mjs
 */

import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

/** 스테이징에 이미 적용된 마지막 version (여기까지가 기준선) */
const BASELINE_LAST = "20261002110000_uat_db_guard.sql";

/** 그 위에 올릴 것. version 으로 적는다 — 번호로 세지 않는다. */
const PENDING = [
  "20261012090000_d3_lead_notification_outbox.sql",
  "20261012091000_c3_portal_expiry_rate_limit.sql",
  "20261012092000_b2_lesson_assets.sql",
  "20261012093000_c3b_portal_access_policy.sql",
  "20261012094000_d3b_lead_notification_delivery.sql",
  "20261012095000_c2b_period_report_compose.sql",
  "20261012096000_b2b_lesson_asset_predownload.sql",
  "20261014090000_e1_lesson_content_structure.sql",
  "20261014091000_e2_lesson_publish_gate.sql",
  "20261014092000_e3_publish_lock_and_scope.sql",
  "20261014093000_e4_lesson_section_scope.sql",
  "20261015020314_staff_content_program_lookup.sql",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 이 필요하다 (격리된 Postgres 전용).");
  process.exit(2);
}
if (/supabase\.(co|com)/i.test(url) || /\.supabase\./i.test(url)) {
  console.error("DATABASE_URL 이 Supabase 호스트를 가리킨다 — 이 스크립트는 격리 환경 전용이다.");
  process.exit(2);
}

const results = [];
let failures = 0;
function check(label, ok, detail = "") {
  results.push({ label, ok });
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const count = async (c, sql, p = []) => Number((await one(c, sql, p)).c);

/**
 * 로그인한 사용자로 가장한다.
 *
 * ★ 관리 연결(superuser)로 쓰면 `auth.uid()` 가 null 이라 **기존 권한 검사**가
 *   먼저 거부한다(SS002). 그러면 uat_db_guard 의 미래 회차 판정(SS009)까지
 *   가지 못해 「가드가 동작했다」를 확인할 수 없다 —
 *   trg_zz_* 가드는 이름 순서상 **맨 마지막**에 돈다.
 *   그래서 담당 교사로 가장해, 다른 조건을 모두 통과한 뒤 가드만 남게 한다.
 */
async function asTeacher(connectionString, uid) {
  const c = new pg.Client({ connectionString });
  await c.connect();
  await c.query("set role authenticated");
  await c.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  return c;
}

/** 이 쓰기는 **거부돼야** 한다. 어떤 코드로 거부됐는지까지 본다. */
async function expectRejected(client, label, sql, params, codeOrMessage) {
  try {
    await client.query("savepoint s");
    await client.query(sql, params);
    await client.query("rollback to savepoint s");
    check(label, false, "거부되지 않고 **성공했다**");
  } catch (e) {
    await client.query("rollback to savepoint s").catch(() => {});
    const hit =
      e.code === codeOrMessage ||
      String(e.message).includes(codeOrMessage) ||
      String(e.code) === String(codeOrMessage);
    check(label, hit, hit ? `거부됨 (${e.code})` : `다른 이유로 거부 [${e.code}] ${String(e.message).split("\n")[0]}`);
  }
}

const WORK_DB = "soye_staging_upgrade_check";

async function freshDatabase() {
  const bootstrap = new pg.Client({ connectionString: url });
  await bootstrap.connect();
  await bootstrap.query(`drop database if exists ${WORK_DB}`);
  await bootstrap.query(`create database ${WORK_DB}`);
  await bootstrap.end();
  return url.replace(/\/[^/?]*(\?|$)/, `/${WORK_DB}$1`);
}

// 합성 UAT 자료 — 2026-10-14 점검에서 확인된 모양을 따른다.
// ★ 스테이징의 실제 id 는 쓰지 않는다. 모양만 같게 만든다.
const ORG = "d0000000-0000-4000-8000-000000000001";
const CLASS = "c0000000-0000-4000-8000-000000000001";
const CHILD = [
  "a0000000-0000-4000-8000-000000000001",
  "a0000000-0000-4000-8000-000000000002",
  "a0000000-0000-4000-8000-000000000003",
];
const TEACHER = "e0000000-0000-4000-8000-000000000001";
/**
 * 원장. 스테이징 합성 자료에는 교사만 있지만, 학부모 공유 잠금(PT004)에
 * 닿으려면 원장이 필요하다 — 그 앞에 「원장만 관리한다」(PT002) 가 먼저 선다.
 */
const DIRECTOR = "e0000000-0000-4000-8000-000000000002";
const PROGRAM = "f0000000-0000-4000-8000-000000000001";
const ASSIGN = "b0000000-0000-4000-8000-000000000001";
const CONTRACT = "90000000-0000-4000-8000-000000000001";

/** DB 가 허용하는 섹션 코드 전부 (private.is_known_lesson_section). 17개다. */
const KNOWN_SECTIONS = [
  "s1", "s2", "s3", "s4a", "s4b", "s4c", "s5", "s6", "s7", "s8",
  "s9", "s10", "s11", "s12", "s13", "s14", "s15",
];

async function main() {
  const workUrl = await freshDatabase();
  const admin = new pg.Client({ connectionString: workUrl });
  await admin.connect();

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  const cut = files.indexOf(BASELINE_LAST);
  if (cut < 0) {
    check(`기준선 migration ${BASELINE_LAST} 이 저장소에 있다`, false, "파일이 없다");
    process.exit(1);
  }
  const baseline = files.slice(0, cut + 1);
  const pending = files.slice(cut + 1);

  /* ── 1. 기준선 ── */
  console.log("── 스테이징 기준선 적용 (…p10c_release_controls + uat_db_guard)");
  await admin.query(readFileSync(join(HERE, "shim.sql"), "utf8"));
  for (const f of baseline) {
    try {
      await admin.query(readFileSync(join(MIGRATIONS, f), "utf8"));
    } catch (e) {
      check(`기준선 ${f}`, false, e.message);
      process.exit(1);
    }
  }
  check(`기준선 ${baseline.length}건 적용`, baseline.at(-1) === BASELINE_LAST, baseline.at(-1));
  check(
    "기준선에는 신규 구조가 없다 (2026-10-14 점검과 같다)",
    (await count(
      admin,
      `select count(*) c from pg_catalog.pg_tables where schemaname = 'public'
        and tablename in ('lesson_assets','report_period_sources','portal_access_throttle',
                          'lesson_scenes','product_version_programs','lesson_review_notes')`,
    )) === 0,
  );
  check(
    "기준선에는 lesson_sections.body_json 이 없다",
    (await count(
      admin,
      `select count(*) c from information_schema.columns
        where table_schema='public' and table_name='lesson_sections' and column_name='body_json'`,
    )) === 0,
  );

  /* ── 2. 올릴 목록이 문서와 같은가 ── */
  console.log("\n── 적용 대상 대조");
  const sameList =
    pending.length === PENDING.length && pending.every((f, i) => f === PENDING[i]);
  check(
    "기준선 뒤 migration 이 점검 문서의 11건과 같다",
    sameList,
    sameList ? `${pending.length}건` : `저장소 ${pending.length}건 / 문서 ${PENDING.length}건 — ${pending.filter((f) => !PENDING.includes(f)).join(", ") || "순서 차이"}`,
  );

  /* ── 3. 합성 UAT 자료 ── */
  console.log("\n── 합성 UAT 자료 적재 (기준선 상태에서)");
  await admin.query("set session_replication_role = replica");

  const seed = async (sql, params = []) => {
    try {
      await admin.query(sql, params);
    } catch (e) {
      console.error(`고정자료 실패: ${e.message}\n  ${sql.trim().split("\n")[0]}`);
      throw e;
    }
  };

  await seed(
    `insert into auth.users (id, email) values ($1, 'uat-teacher@test.local'), ($2, 'uat-director@test.local')`,
    [TEACHER, DIRECTOR],
  );
  await seed(
    `insert into public.profiles (user_id, display_name) values ($1, '박교사'), ($2, '김원장')`,
    [TEACHER, DIRECTOR],
  );
  await seed(
    `insert into public.organizations (id, name, institution_type, status)
     values ($1, 'UAT 유치원', 'kindergarten', 'active')`,
    [ORG],
  );
  await seed(
    `insert into public.organization_members (id, organization_id, user_id, role, status) values
       ('11110000-0000-4000-8000-000000000001', $1, $2, 'teacher', 'active'),
       ('11110000-0000-4000-8000-000000000002', $1, $3, 'director', 'active')`,
    [ORG, TEACHER, DIRECTOR],
  );
  await seed(
    `insert into public.classes (id, organization_id, name, age_group, school_year, status)
     values ($1, $2, 'UAT반', 'age5', 2026, 'active')`,
    [CLASS, ORG],
  );
  await seed(
    `insert into public.class_teachers (organization_id, class_id, organization_member_id)
     values ($1, $2, '11110000-0000-4000-8000-000000000001')`,
    [ORG, CLASS],
  );
  for (const [i, id] of CHILD.entries()) {
    await seed(
      `insert into public.children (id, organization_id, class_id, name, birth_year, status)
       values ($1, $2, $3, $4, 2021, 'active')`,
      [id, ORG, CLASS, `원아${i + 1}`],
    );
  }

  // STARTER 모양: 발행된 8차시 · 주차마다 17섹션 (필수 11 포함)
  await seed(
    `insert into public.curriculum_programs (id, code, title, duration_weeks, status)
     values ($1, 'UAT-STARTER-2026.1', 'UAT 스타터', 8, 'published')`,
    [PROGRAM],
  );
  // ★ private 스키마의 배열 함수다 (text[]). DEC-096 Required Content Set.
  const requiredCodes = (
    await admin.query("select unnest(private.required_lesson_sections()) as code order by 1")
  ).rows.map((r) => r.code);
  check(
    "필수 섹션 목록을 DB 가 알려 준다 (DEC-096)",
    requiredCodes.length === 11 && requiredCodes.every((c) => KNOWN_SECTIONS.includes(c)),
    `${requiredCodes.length}종`,
  );

  const lessonIds = [];
  for (let w = 1; w <= 8; w += 1) {
    const id = `70000000-0000-4000-8000-00000000000${w}`;
    lessonIds.push(id);
    await seed(
      `insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status)
       values ($1, $2, $3, 1, $4, 'published')`,
      [id, PROGRAM, w, `${w}주차`],
    );
    // 주차마다 17섹션. 섹션 코드는 **DB 가 아는 것만** 쓸 수 있다
    // (lesson_sections_section_code_check → private.is_known_lesson_section).
    // 아는 코드가 정확히 17개이고 필수 11개가 그 안에 들어 있다.
    for (const [idx, code] of KNOWN_SECTIONS.entries()) {
      await seed(
        `insert into public.lesson_sections (lesson_id, section_code, body)
         values ($1, $2, $3)`,
        [id, code, `${w}주차 ${code} 본문`],
      );
      void idx;
    }
  }

  // ★ 상품·상품 버전은 만들지 않는다. m2_fact_backfill_reference_seed 가
  //   기준선 안에서 이미 seed 했다 (starter/standard/premium 2026.1).
  //   여기서 또 만들면 스테이징과 다른 모양이 된다.
  const pv = await one(
    admin,
    `select pv.id from public.product_versions pv
     join public.products p on p.id = pv.product_id
     where p.code = 'starter' and pv.version_label = '2026.1' limit 1`,
  );
  check("starter 2026.1 상품 버전이 기준선에 있다", Boolean(pv?.id), pv?.id ? "있음" : "없음");

  await seed(
    `insert into public.contracts (id, organization_id, product_version_id, status, start_date, end_date)
     values ($1, $2, $3, 'active', current_date - 45, current_date + 45)`,
    [CONTRACT, ORG, pv.id],
  );
  await seed(
    `insert into public.contract_classes (organization_id, contract_id, class_id) values ($1, $2, $3)`,
    [ORG, CONTRACT, CLASS],
  );
  await seed(
    `insert into public.class_program_assignments (id, organization_id, class_id, program_id, status)
     values ($1, $2, $3, $4, 'active')`,
    [ASSIGN, ORG, CLASS, PROGRAM],
  );

  // 회차 8건 — 점검 문서처럼 과거·오늘 3건, 미래 5건
  const sessionIds = [];
  for (let w = 1; w <= 8; w += 1) {
    const id = `80000000-0000-4000-8000-00000000000${w}`;
    sessionIds.push(id);
    // w<=3 → 과거·오늘, w>=4 → 미래
    const offset = w <= 3 ? `current_date - ${(3 - w) * 7}` : `current_date + ${(w - 3) * 7}`;
    await seed(
      `insert into public.class_sessions
         (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status)
       values ($1, $2, $3, $4, $5, $6, ${offset}, 'scheduled')`,
      [id, ORG, CLASS, ASSIGN, PROGRAM, lessonIds[w - 1]],
    );
  }
  await admin.query("set session_replication_role = origin");

  const snapshot = async () =>
    await one(
      admin,
      `select
         (select count(*) from public.organizations where id = '${ORG}') orgs,
         (select count(*) from public.classes where id = '${CLASS}') classes,
         (select count(*) from public.class_teachers where class_id = '${CLASS}') teachers,
         (select count(*) from public.children where organization_id = '${ORG}') children,
         (select count(*) from public.contracts where id = '${CONTRACT}') contracts,
         (select count(*) from public.contract_classes where contract_id = '${CONTRACT}') contract_classes,
         (select count(*) from public.class_program_assignments where id = '${ASSIGN}') assignments,
         (select count(*) from public.class_sessions where class_id = '${CLASS}') sessions,
         (select count(*) from public.curriculum_lessons where program_id = '${PROGRAM}' and status='published') published_lessons,
         (select count(*) from public.lesson_sections s join public.curriculum_lessons l on l.id = s.lesson_id where l.program_id = '${PROGRAM}') sections,
         (select max(updated_at) from public.class_sessions where class_id = '${CLASS}') session_updated`,
    );

  const pre = await snapshot();
  check(
    "합성 UAT 자료가 들어갔다",
    Number(pre.sessions) === 8 && Number(pre.sections) === 136 && Number(pre.children) === 3,
    `회차 ${pre.sessions} · 섹션 ${pre.sections} · 원아 ${pre.children}`,
  );

  /* ── 4. 기준선에서 가드가 동작하는가 ── */
  console.log("\n── 적용 **전** 가드 동작 (uat_db_guard)");
  const futureSession = sessionIds[7]; // W8 = 미래
  const pastSession = sessionIds[0]; // W1 = 과거

  /** 가드 세 가지를 한 벌로 확인한다 (적용 전후로 같은 것을 본다) */
  async function checkGuards(teacher, stage) {
    await teacher.query("begin");
    await expectRejected(
      teacher,
      `${stage} 미래 회차에는 시작 전 확인을 쓸 수 없다 (SS009)`,
      `insert into public.session_before_confirmations
         (organization_id, class_id, class_session_id, safety_confirmed, privacy_confirmed)
       values ($1, $2, $3, true, true)`,
      [ORG, CLASS, futureSession],
      "SS009",
    );
    await expectRejected(
      teacher,
      `${stage} 미래 회차에는 출결을 쓸 수 없다 (SS009)`,
      `insert into public.class_session_attendance
         (organization_id, class_session_id, class_id, child_id, attendance_status)
       values ($1, $2, $3, $4, 'present')`,
      [ORG, futureSession, CLASS, CHILD[0]],
      "SS009",
    );
    await teacher.query("rollback");

    /*
      ★ 학부모 공유는 **관리 연결**로 확인한다.
        `child_portals` 직접 INSERT 는 authenticated 에 grant 가 없다(42501) —
        쓰기는 RPC `issue_child_portal` 로만 한다. 그 42501 은 가드가 아니라
        grant 가 막은 것이므로 「PT004 가 살아 있다」를 증명하지 못한다.
        관리 연결은 grant·RLS 를 지나므로 **트리거만** 남고, 그것이 보려는 것이다.
        열 이름은 issued_by 다 (created_by 가 아니다).
    */
    await admin.query("begin");
    await admin.query("select set_config('request.jwt.claim.sub', $1, true)", [DIRECTOR]);
    await expectRejected(
      admin,
      `${stage} 학부모 공유 신규 발급이 잠겨 있다 (PT004 · parent_portal 미출시)`,
      `insert into public.child_portals (organization_id, child_id, token_hash, issued_by)
       values ($1, $2, repeat('a', 64), $3)`,
      [ORG, CHILD[0], DIRECTOR],
      "PT004",
    );
    await admin.query("rollback");
  }

  const teacherClient = await asTeacher(workUrl, TEACHER);
  check(
    "담당 교사로 가장한 세션이 이 반을 본다 (가드 검사의 전제)",
    (await count(teacherClient, "select count(*) c from public.class_sessions where class_id = $1", [CLASS])) === 8,
  );
  await checkGuards(teacherClient, "적용 전:");

  const guardTriggers = async () =>
    await count(
      admin,
      `select count(*) c from pg_catalog.pg_trigger t
        where not t.tgisinternal and t.tgname like 'trg_zz_%'`,
    );
  const preTriggers = await guardTriggers();
  check("가드 트리거가 붙어 있다", preTriggers >= 11, `${preTriggers}개`);

  /* ── 5. 11건 적용 ── */
  console.log(`\n── 대기 중 migration ${pending.length}건 적용`);
  for (const f of pending) {
    try {
      await admin.query(readFileSync(join(MIGRATIONS, f), "utf8"));
    } catch (e) {
      check(`적용 ${f}`, false, `${e.code ?? ""} ${e.message}`);
      process.exit(1);
    }
  }
  check(`${pending.length}건이 합성 자료가 있는 DB 에 적용된다`, true, `${pending[0]} … ${pending.at(-1)}`);

  /* ── 6. 보존 확인 ── */
  console.log("\n── 적용 뒤 보존");
  const post = await snapshot();
  for (const [k, label] of [
    ["orgs", "기관"], ["classes", "반"], ["teachers", "담임"], ["children", "원아"],
    ["contracts", "계약"], ["contract_classes", "계약↔반"], ["assignments", "배정"],
    ["sessions", "회차"], ["published_lessons", "발행 차시"], ["sections", "섹션"],
  ]) {
    check(`${label} 그대로`, pre[k] === post[k], `${pre[k]} → ${post[k]}`);
  }
  check(
    "회차 updated_at 이 바뀌지 않았다 (일괄 UPDATE 없음)",
    String(pre.session_updated) === String(post.session_updated),
  );
  check(
    "주차마다 필수 섹션이 모두 남아 있다",
    (await count(
      admin,
      `select count(*) c from public.curriculum_lessons l
        where l.program_id = $1
          and (select count(*) from public.lesson_sections s
               where s.lesson_id = l.id
                 and s.section_code = any(private.required_lesson_sections()))
              <> cardinality(private.required_lesson_sections())`,
      [PROGRAM],
    )) === 0,
    "모자란 주차 0",
  );
  check(
    "기존 평문 body 가 그대로다 (body_json 열이 생겨도)",
    (await count(
      admin,
      `select count(*) c from public.lesson_sections s
        join public.curriculum_lessons l on l.id = s.lesson_id
       where l.program_id = $1 and (s.body is null or btrim(s.body) = '')`,
      [PROGRAM],
    )) === 0,
  );
  check(
    "새로 생긴 body_json 은 기존 섹션에서 null 이다 (덮어쓰지 않았다)",
    (await count(
      admin,
      `select count(*) c from public.lesson_sections s
        join public.curriculum_lessons l on l.id = s.lesson_id
       where l.program_id = $1 and s.body_json is not null`,
      [PROGRAM],
    )) === 0,
  );

  /* ── 7. 가드가 살아 있는가 ── */
  console.log("\n── 적용 뒤에도 가드가 살아 있는가 (가장 중요한 부분)");
  const postTriggers = await guardTriggers();
  check("가드 트리거 수가 줄지 않았다", postTriggers >= preTriggers, `${preTriggers} → ${postTriggers}`);

  await checkGuards(teacherClient, "적용 뒤:");

  // 지난 회차는 반대로 **열려 있어야** 한다. 전부 막아 놓고 통과시키지 않는다.
  await teacherClient.query("begin");
  let pastOk = true;
  let pastDetail = "";
  try {
    await teacherClient.query(
      `insert into public.session_before_confirmations
         (organization_id, class_id, class_session_id, safety_confirmed, privacy_confirmed)
       values ($1, $2, $3, true, true)`,
      [ORG, CLASS, pastSession],
    );
  } catch (e) {
    pastOk = false;
    pastDetail = `[${e.code}] ${String(e.message).split("\n")[0]}`;
  }
  await teacherClient.query("rollback");
  check("지난 회차에는 여전히 쓸 수 있다 (가드가 과잉 차단하지 않는다)", pastOk, pastDetail);

  /* ── 8. 출시 스위치는 그대로인가 ── */
  console.log("\n── 기능 출시 스위치");
  const released = await count(
    admin,
    "select count(*) c from public.platform_capabilities where is_released = true",
  );
  check("업그레이드가 기능을 임의로 출시하지 않는다", released === 0, `출시된 기능 ${released}개`);

  /* ── 9. 새 구조가 들어왔는가 ── */
  console.log("\n── 새 구조");
  for (const t of [
    "lesson_assets", "report_period_sources", "portal_access_throttle",
    "lesson_scenes", "product_version_programs", "lesson_review_notes",
  ]) {
    check(
      `${t} 가 생겼다`,
      (await count(admin, "select count(*) c from pg_catalog.pg_tables where schemaname='public' and tablename=$1", [t])) === 1,
    );
  }
  check(
    "lesson_sections.body_json 이 생겼다 (nullable)",
    (await count(
      admin,
      `select count(*) c from information_schema.columns
        where table_schema='public' and table_name='lesson_sections'
          and column_name='body_json' and is_nullable='YES'`,
    )) === 1,
  );
  check(
    "TAP24 교안은 아직 없다 (적재는 migration 이 아니다)",
    (await count(admin, "select count(*) c from public.curriculum_programs where code = 'SOYE-TAP24-2026.1'")) === 0,
  );

  console.log("\n── 교사 계약표 비공개 · 교안 ID 조회 RPC");
  check("교사는 여전히 contracts 표를 직접 볼 수 없다",
    (await count(teacherClient, "select count(*) c from public.contracts")) === 0);
  let lookup = (await one(teacherClient,
    "select public.resolve_organization_content_program($1) r", [ORG])).r;
  check("교안 연결이 없으면 미연결을 알린다", lookup.ok === false && lookup.reason === "program_not_found");
  await admin.query("insert into public.product_version_programs(product_version_id,program_id) values($1,$2)", [pv.id, PROGRAM]);
  lookup = (await one(teacherClient, "select public.resolve_organization_content_program($1) r", [ORG])).r;
  check("교사는 기관의 연결된 교안 ID만 받는다", lookup.ok === true && lookup.program_id === PROGRAM && Object.keys(lookup).length === 2);
  const directorClient = await asTeacher(workUrl, DIRECTOR);
  lookup = (await one(directorClient, "select public.resolve_organization_content_program($1) r", [ORG])).r;
  check("원장도 같은 교안 ID를 받는다", lookup.ok === true && lookup.program_id === PROGRAM);
  await directorClient.end();
  let denied = false;
  try {
    await teacherClient.query("select public.resolve_organization_content_program('ffffffff-ffff-4fff-8fff-ffffffffffff')");
  } catch (error) { denied = error.code === "42501"; }
  check("다른 기관의 교안 연결 조회는 42501로 거부한다", denied);
  check("anon은 교안 연결 RPC 실행 권한이 없다", !(await one(admin,
    "select has_function_privilege('anon','public.resolve_organization_content_program(uuid)','EXECUTE') allowed")).allowed);

  await teacherClient.end();
  await admin.end();
  console.log(`\n결과: ${results.length - failures}/${results.length} 통과${failures > 0 ? ` · 실패 ${failures}` : ""}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\n검증 중단:", e.message);
  process.exit(1);
});
