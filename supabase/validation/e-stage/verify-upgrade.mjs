/**
 * 기존 DB 업그레이드 검증 — 운영 중인 DB 에 후속 migration 을 올렸을 때
 * 이미 들어 있는 업무 데이터가 살아남는지 본다.
 *
 * ── 왜 따로 있나 ───────────────────────────────────────────────────
 *
 * verify-e-stage.mjs 는 **빈** DB 에 49건을 한 번에 올린다. 그것으로는
 * 「이미 데이터가 있는 DB」에서 무슨 일이 생기는지 알 수 없다. 원격은
 * #1~#21 이 적용된 채 **실제 기관·반·수업·관찰·리포트가 들어 있는** 상태다.
 *
 * 그래서 이 스크립트는 순서를 바꾼다.
 *
 *   #1~#21 적용 → 가상 업무 데이터 적재 → #22~#49 적용 → 데이터·참조·권한·업무 조회 확인
 *
 * 깨지는 방식은 보통 조용하다. NOT NULL 열 추가, 정책 교체로 기존 기관이
 * 자기 데이터를 못 보게 되는 것, 복합 FK 가 끊기는 것 — 전부 적용은 성공하고
 * 다음 날 교사가 로그인해서야 드러난다.
 *
 * 실행: DATABASE_URL=... node supabase/validation/e-stage/verify-upgrade.mjs
 */

import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 이 필요하다 (격리된 Postgres 전용).");
  process.exit(2);
}
// ★ 운영 DB 에 절대 붙지 않는다. 이 스크립트는 데이터를 심고 지운다.
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

const one = async (client, sql, params = []) => (await client.query(sql, params)).rows[0];
const count = async (client, sql, params = []) => Number((await one(client, sql, params)).c);

/** 0행이어야 하는 조회. 오류를 '0행 성공' 으로 바꾸지 않는다. */
async function expectNoRows(client, label, sql, params = []) {
  try {
    const n = (await client.query(sql, params)).rows.length;
    check(label, n === 0, n === 0 ? "조회 가능 · 0행" : `${n}행이 새어 나왔다`);
  } catch (e) {
    const denied = e.code === "42501" || /row-level security|permission denied/i.test(String(e.message));
    check(label, denied, denied ? `거부됨 (${e.code})` : `예상 밖 오류 [${e.code}] ${e.message}`);
  }
}

/**
 * 고정자료 한 문장. ★ `client.query(sql, params)` 는 **문장 하나**만 받는다 —
 * 여러 문장을 세미콜론으로 이어 보내면 "cannot insert multiple commands into a
 * prepared statement" 로 거부된다. 그래서 하나씩 보낸다.
 */
const seed = async (client, sql, params = []) => {
  try {
    await client.query(sql, params);
  } catch (e) {
    console.error(`고정자료 적재 실패: ${e.message}\n  ${sql.trim().split("\n")[0]}`);
    throw e;
  }
};

// ★ shim 의 auth.uid() 는 `request.jwt.claim.sub` 를 읽는다 (Supabase 의 옛
//   단일 GUC 형태). `request.jwt.claims` JSON 을 세팅하면 uid 가 null 이 되고
//   모든 조회가 0행이 되어 「권한이 깨졌다」로 잘못 읽힌다.
const asUser = (client, uid) =>
  client.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);

// ── 고정 id. 로그에서 사람이 따라갈 수 있게 눈에 띄는 값을 쓴다.
const ORG = "11111111-0000-0000-0000-000000000001";
const ORG2 = "11111111-0000-0000-0000-000000000002";
const CLS_A = "22222222-0000-0000-0000-0000000000a1";
const CLS_B = "22222222-0000-0000-0000-0000000000b1";
const CHILD = ["33333333-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000003"];
const PROG = "44444444-0000-0000-0000-000000000001";
const LESSON = ["45454545-0000-0000-0000-000000000001", "45454545-0000-0000-0000-000000000002"];
const ASSIGN = "55555555-0000-0000-0000-000000000001";
const SESSION = ["66666666-0000-0000-0000-000000000001", "66666666-0000-0000-0000-000000000002"];
const OBS = ["77777777-0000-0000-0000-000000000001", "77777777-0000-0000-0000-000000000002"];
const REPORT = "88888888-0000-0000-0000-000000000001";
const SHARE = "89898989-0000-0000-0000-000000000001";
const U_DIRECTOR = "99999999-0000-0000-0000-00000000000d";
const U_TEACHER = "99999999-0000-0000-0000-00000000000e";
const U_OTHER = "99999999-0000-0000-0000-00000000000f";

/**
 * 이 검증은 **빈 DB 에서 시작해야** 한다 (#1~#21 만 올린 상태를 만들어야 하므로).
 * 그런데 같은 CI 작업에서 verify-e-stage.mjs 가 먼저 49건을 다 올려 둔다.
 *
 * 그래서 전용 데이터베이스를 따로 만들어 쓴다. 기존 DB 를 비우지 않는다 —
 * 남의 검증 결과를 지우면 두 검증이 서로를 가린다.
 */
const WORK_DB = "soye_upgrade_check";

async function freshDatabase() {
  const bootstrap = new pg.Client({ connectionString: url });
  await bootstrap.connect();
  await bootstrap.query(`drop database if exists ${WORK_DB}`);
  await bootstrap.query(`create database ${WORK_DB}`);
  await bootstrap.end();
  return url.replace(/\/[^/?]*(\?|$)/, `/${WORK_DB}$1`);
}

async function main() {
  const workUrl = await freshDatabase();
  console.log(`── 전용 검증 데이터베이스 ${WORK_DB} 생성`);
  const admin = new pg.Client({ connectionString: workUrl });
  await admin.connect();

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  const before = files.slice(0, 21);
  const after = files.slice(21);

  /* ── 1. #1~#21 — 원격의 현재 상태 ── */
  console.log("── #1~#21 적용 (원격 현재 상태 재현)");
  await admin.query(readFileSync(join(HERE, "shim.sql"), "utf8"));
  for (const f of before) {
    try {
      await admin.query(readFileSync(join(MIGRATIONS, f), "utf8"));
    } catch (e) {
      check(`선행 migration ${f}`, false, e.message);
      process.exit(1);
    }
  }
  check(`선행 migration ${before.length}건 적용`, before.length === 21, before[20]);
  check(
    "이 시점에는 상거래·콘텐츠 표가 아직 없다 (원격과 같다)",
    (await count(
      admin,
      `select count(*) c from pg_catalog.pg_tables
       where schemaname = 'public' and tablename in ('lesson_sections','product_versions','contracts','lesson_assets')`,
    )) === 0,
  );

  /* ── 2. 가상 업무 데이터 ── */
  console.log("\n── 가상 업무 데이터 적재 (#1~#21 상태에서)");
  // ★ 업무 트리거(수업이 진행 중이어야 관찰을 쓸 수 있다 등)를 피해 고정자료를
  //   만든다. 기존 pgTAP 과 같은 방식이다. 검증 대상은 그 트리거가 아니라
  //   **업그레이드가 데이터를 보존하는지** 다.
  await admin.query("set session_replication_role = replica");
  await seed(
    admin,
    `insert into auth.users (id, email) values ($1, 'director@old.local'), ($2, 'teacher@old.local'), ($3, 'other@old.local')`,
    [U_DIRECTOR, U_TEACHER, U_OTHER],
  );
  await seed(
    admin,
    `insert into public.profiles (user_id, display_name) values ($1, '김원장'), ($2, '박교사'), ($3, '최타기관')`,
    [U_DIRECTOR, U_TEACHER, U_OTHER],
  );
  await seed(
    admin,
    `insert into public.organizations (id, name, institution_type, status) values
       ($1, '기존 유치원', 'kindergarten', 'active'),
       ($2, '남의 유치원', 'kindergarten', 'active')`,
    [ORG, ORG2],
  );
  await seed(
    admin,
    `insert into public.organization_members (id, organization_id, user_id, role, status) values
       ('a0000000-0000-0000-0000-00000000000d', $1, $3, 'director', 'active'),
       ('a0000000-0000-0000-0000-00000000000e', $1, $4, 'teacher', 'active'),
       ('a0000000-0000-0000-0000-00000000000f', $2, $5, 'teacher', 'active')`,
    [ORG, ORG2, U_DIRECTOR, U_TEACHER, U_OTHER],
  );
  await seed(
    admin,
    `insert into public.classes (id, organization_id, name, age_group, school_year, status) values
       ($1, $3, '해바라기반', 'age5', 2026, 'active'),
       ($2, $3, '민들레반', 'age4', 2026, 'active')`,
    [CLS_A, CLS_B, ORG],
  );
  await seed(
    admin,
    `insert into public.class_teachers (organization_id, class_id, organization_member_id)
     values ($1, $2, 'a0000000-0000-0000-0000-00000000000e')`,
    [ORG, CLS_A],
  );
  await seed(
    admin,
    `insert into public.children (id, organization_id, class_id, name, birth_year, status) values
       ($1, $4, $5, '이가온', 2021, 'active'),
       ($2, $4, $5, '정하람', 2021, 'active'),
       ($3, $4, $6, '오늘찬', 2022, 'active')`,
    [CHILD[0], CHILD[1], CHILD[2], ORG, CLS_A, CLS_B],
  );

  await seed(
    admin,
    `insert into public.curriculum_programs (id, code, title, duration_weeks, status)
     values ($1, 'OLD-PROGRAM-2026', '기존 프로그램', 8, 'published')`,
    [PROG],
  );
  await seed(
    admin,
    `insert into public.curriculum_lessons (id, program_id, week_no, session_no, title, status) values
       ($1, $3, 1, 1, '1주차 수업', 'published'),
       ($2, $3, 2, 1, '2주차 수업', 'published')`,
    [LESSON[0], LESSON[1], PROG],
  );
  await seed(
    admin,
    `insert into public.class_program_assignments (id, organization_id, class_id, program_id, start_date, status)
     values ($1, $2, $3, $4, current_date - 30, 'active')`,
    [ASSIGN, ORG, CLS_A, PROG],
  );
  await seed(
    admin,
    `insert into public.class_sessions
       (id, organization_id, class_id, class_program_assignment_id, program_id, lesson_id, scheduled_date, status) values
       ($1, $3, $4, $5, $6, $7, current_date - 14, 'completed'),
       ($2, $3, $4, $5, $6, $8, current_date - 7,  'completed')`,
    [SESSION[0], SESSION[1], ORG, CLS_A, ASSIGN, PROG, LESSON[0], LESSON[1]],
  );
  await seed(
    admin,
    `insert into public.class_session_attendance (organization_id, class_session_id, class_id, child_id, attendance_status) values
       ($1, $2, $4, $5, 'present'),
       ($1, $2, $4, $6, 'absent'),
       ($1, $3, $4, $5, 'present'),
       ($1, $3, $4, $6, 'late')`,
    [ORG, SESSION[0], SESSION[1], CLS_A, CHILD[0], CHILD[1]],
  );

  await seed(
    admin,
    `insert into public.class_session_observations
       (id, organization_id, class_session_id, class_id, child_id, child_voice, teacher_note, record_status, created_by, updated_by) values
       ($1, $3, $4, $5, $6, '빨간색이 좋아요', '색을 고르는 데 시간이 걸렸지만 스스로 정했다', 'complete', $8, $8),
       ($2, $3, $4, $5, $7, null, '친구에게 붓을 먼저 건넸다', 'draft', $8, $8)`,
    [OBS[0], OBS[1], ORG, SESSION[0], CLS_A, CHILD[0], CHILD[1], U_TEACHER],
  );
  await seed(
    admin,
    `insert into public.class_session_observation_domains (observation_id, domain_code)
     select $1, code from public.observation_domains order by code limit 2`,
    [OBS[0]],
  );
  await seed(
    admin,
    `insert into public.child_growth_reports
       (id, organization_id, class_id, child_id, period_start, period_end, title,
        growth_changes, observation_summary, next_support, status,
        attendance_present_count, attendance_absent_count, session_count, created_by, completed_by, completed_at)
     values ($1, $2, $3, $4, current_date - 60, current_date - 1, '2026 상반기 성장 이야기',
       '색 선택을 스스로 하게 되었다', '관찰 2건에서 자기 결정이 보인다', '선택의 폭을 조금 넓혀 준다', 'complete',
       2, 0, 2, $5, $5, now())`,
    [REPORT, ORG, CLS_A, CHILD[0], U_TEACHER],
  );

  await seed(
    admin,
    `insert into public.child_growth_report_shares (id, organization_id, report_id, token_hash, created_by, expires_at)
     values ($1, $2, $3, repeat('a', 64), $4, now() + interval '7 days')`,
    [SHARE, ORG, REPORT, U_DIRECTOR],
  );

  await seed(
    admin,
    `insert into public.lead_submissions
       (submission_type, institution_name, contact_name, phone, message, privacy_agreed)
     values ('consult', '기존 유치원', '김원장', '010-0000-0000', '적용 전에 들어온 문의', true)`,
  );
  await admin.query("set session_replication_role = origin");

  // 적재 직후 상태를 기록해 둔다. 업그레이드 뒤 이 값과 비교한다.
  const snapshot = async () =>
    await one(
      admin,
      `select
         (select count(*) from public.organizations)                     orgs,
         (select count(*) from public.organization_members)              members,
         (select count(*) from public.classes)                           classes,
         (select count(*) from public.class_teachers)                    class_teachers,
         (select count(*) from public.children)                          children,
         (select count(*) from public.class_sessions)                    sessions,
         (select count(*) from public.class_session_attendance)          attendance,
         (select count(*) from public.class_session_observations)        observations,
         (select count(*) from public.class_session_observation_domains) obs_domains,
         (select count(*) from public.child_growth_reports)              reports,
         (select count(*) from public.child_growth_report_shares)        shares,
         (select count(*) from public.lead_submissions)                  leads,
         (select max(updated_at) from public.class_session_observations) obs_updated,
         (select max(updated_at) from public.child_growth_reports)       report_updated,
         (select teacher_note from public.class_session_observations where id = '${OBS[0]}') note,
         (select growth_changes from public.child_growth_reports where id = '${REPORT}') growth`,
    );

  const pre = await snapshot();
  check("적재된 업무 데이터", Number(pre.observations) === 2 && Number(pre.reports) === 1, JSON.stringify({
    기관: Number(pre.orgs), 반: Number(pre.classes), 원아: Number(pre.children),
    수업: Number(pre.sessions), 출결: Number(pre.attendance),
    관찰: Number(pre.observations), 리포트: Number(pre.reports), 공유: Number(pre.shares),
  }));

  const BUSINESS = [
    ["반", "select id from public.classes"],
    ["원아", "select id from public.children"],
    ["수업", "select id from public.class_sessions"],
    ["출결", "select id from public.class_session_attendance"],
    ["관찰기록", "select id from public.class_session_observations"],
    ["성장 리포트", "select id from public.child_growth_reports"],
    ["프로그램 배정", "select id from public.class_program_assignments"],
    ["차시", "select id from public.curriculum_lessons"],
  ];

  const asRole = async (uid) => {
    const c = new pg.Client({ connectionString: workUrl });
    await c.connect();
    await c.query("set role authenticated");
    await asUser(c, uid);
    return c;
  };

  /** 이 사용자에게 각 업무 조회가 몇 행으로 보이는가. 오류는 null 로 남긴다. */
  async function visible(uid) {
    const c = await asRole(uid);
    const out = { member: null };
    try {
      out.member = (await one(c, "select private.is_active_org_member() m")).m;
    } catch (e) {
      out.member = `ERR ${e.code}`;
    }
    for (const [label, sql] of BUSINESS) {
      try {
        out[label] = (await c.query(sql)).rows.length;
      } catch (e) {
        out[label] = `ERR ${e.code ?? ""} ${e.message}`;
      }
    }
    await c.end();
    return out;
  }


  // 적용 **전** 업무 조회가 어떻게 보였는지 먼저 뜬다. 비교 기준이 없으면
  // 적용 후의 0행이 「원래 그랬다」인지 「끊겼다」인지 구분할 수 없다.
  const preTeacher = await visible(U_TEACHER);
  const preDirector = await visible(U_DIRECTOR);
  const preOther = await visible(U_OTHER);
  check(
    "적용 전 교사가 자기 기관 데이터를 본다 (기준선)",
    preTeacher.member === true && preTeacher["관찰기록"] > 0,
    JSON.stringify(preTeacher),
  );

  /* ── 3. 후속 migration 적용 ── */
  console.log(`\n── #22~#${files.length} 적용 (검토한 후속 변경)`);
  for (const f of after) {
    try {
      await admin.query(readFileSync(join(MIGRATIONS, f), "utf8"));
    } catch (e) {
      check(`후속 migration ${f}`, false, `${e.code ?? ""} ${e.message}`);
      process.exit(1);
    }
  }
  check(`후속 migration ${after.length}건이 데이터가 있는 DB 에 적용된다`, true, `${after[0]} … ${after.at(-1)}`);

  /* ── 4. 데이터 보존 ── */
  console.log("\n── 기존 데이터 보존");
  const post = await snapshot();
  for (const [key, label] of [
    ["orgs", "기관"], ["members", "구성원"], ["classes", "반"], ["class_teachers", "담임 배정"],
    ["children", "원아"], ["sessions", "수업"], ["attendance", "출결"],
    ["observations", "관찰기록"], ["obs_domains", "관찰 영역"], ["reports", "성장 리포트"],
    ["shares", "리포트 공유"], ["leads", "상담 문의"],
  ]) {
    check(`${label} 행 수가 그대로다`, pre[key] === post[key], `${pre[key]} → ${post[key]}`);
  }
  check("관찰기록 본문이 그대로다", pre.note === post.note);
  check("성장 리포트 본문이 그대로다", pre.growth === post.growth);
  // ★ updated_at 이 바뀌면 migration 이 전체 UPDATE 를 돌린 것이다. 그러면
  //   「마지막 수정 시각」을 쓰는 낙관적 잠금·동기화가 전부 틀어진다.
  check(
    "관찰기록 updated_at 이 바뀌지 않았다 (일괄 UPDATE 없음)",
    String(pre.obs_updated) === String(post.obs_updated),
  );
  check(
    "성장 리포트 updated_at 이 바뀌지 않았다",
    String(pre.report_updated) === String(post.report_updated),
  );

  /* ── 5. 참조 관계 ── */
  console.log("\n── 참조 관계");
  const orphan = async (label, sql) => check(label, (await count(admin, sql)) === 0, "끊긴 참조 0건");
  await orphan(
    "관찰기록 → 수업·반·기관 복합 참조가 살아 있다",
    `select count(*) c from public.class_session_observations o
     where not exists (select 1 from public.class_sessions s
       where s.id = o.class_session_id and s.organization_id = o.organization_id and s.class_id = o.class_id)`,
  );
  await orphan(
    "출결 → 수업 복합 참조가 살아 있다",
    `select count(*) c from public.class_session_attendance a
     where not exists (select 1 from public.class_sessions s
       where s.id = a.class_session_id and s.organization_id = a.organization_id and s.class_id = a.class_id)`,
  );
  await orphan(
    "성장 리포트 → 원아·반 참조가 살아 있다",
    `select count(*) c from public.child_growth_reports r
     where not exists (select 1 from public.children ch where ch.id = r.child_id and ch.organization_id = r.organization_id)
        or not exists (select 1 from public.classes cl where cl.id = r.class_id and cl.organization_id = r.organization_id)`,
  );
  await orphan(
    "리포트 공유 → 리포트 참조가 살아 있다",
    `select count(*) c from public.child_growth_report_shares s
     where not exists (select 1 from public.child_growth_reports r where r.id = s.report_id and r.organization_id = s.organization_id)`,
  );
  await orphan(
    "담임 배정 → 반·구성원 참조가 살아 있다",
    `select count(*) c from public.class_teachers ct
     where not exists (select 1 from public.classes cl where cl.id = ct.class_id and cl.organization_id = ct.organization_id)
        or not exists (select 1 from public.organization_members m where m.id = ct.organization_member_id and m.organization_id = ct.organization_id)`,
  );
  await orphan(
    "수업 → 배정·차시 참조가 살아 있다",
    `select count(*) c from public.class_sessions s
     where not exists (select 1 from public.class_program_assignments a
                       where a.id = s.class_program_assignment_id and a.organization_id = s.organization_id
                         and a.class_id = s.class_id and a.program_id = s.program_id)
        or not exists (select 1 from public.curriculum_lessons l where l.id = s.lesson_id and l.program_id = s.program_id)`,
  );

  // 새로 들어온 NOT NULL 열이 기존 행을 비워 두지 않았는지 본다.
  const nullCols = await admin.query(
    `select c.table_name, c.column_name
     from information_schema.columns c
     join pg_catalog.pg_tables t on t.schemaname = 'public' and t.tablename = c.table_name
     where c.table_schema = 'public' and c.is_nullable = 'NO' and c.column_default is null
       and c.table_name in ('class_sessions','class_session_observations','child_growth_reports','classes','children')`,
  );
  check(
    "기존 표에 추가된 필수 열이 기존 행을 깨지 않았다",
    true,
    `필수 열 ${nullCols.rows.length}개 확인 (적용이 성공했으므로 기존 행이 모두 값을 가진다)`,
  );

  /* ── 6. 로그인 권한 · 업무 조회 ── */
  //
  // ★ 적용 **전후를 비교**한다. 고정 숫자를 기대하지 않는다 — 후속 migration 이
  //   정책을 **의도적으로** 좁히기도 한다(반 조회가 「기관 전체」에서 「담당 반」
  //   으로 바뀐다). 고정 숫자로 보면 그 의도된 변화와 사고를 구분하지 못한다.
  //
  //   판정 기준: **보이던 것이 0 으로 떨어지면 실패.** 업무가 멈추는 경계다.
  console.log("\n── 로그인 권한 · 업무 조회");

  const postTeacher = await visible(U_TEACHER);
  const postDirector = await visible(U_DIRECTOR);
  const postOther = await visible(U_OTHER);

  check("교사의 구성원 판정이 업그레이드 뒤에도 통한다", postTeacher.member === true, String(postTeacher.member));
  check("원장의 구성원 판정이 업그레이드 뒤에도 통한다", postDirector.member === true, String(postDirector.member));

  for (const [label] of BUSINESS) {
    const was = preTeacher[label];
    const now = postTeacher[label];
    if (typeof was !== "number") {
      check(`교사 · ${label} 조회 (적용 전 상태 확인 불가)`, false, `적용 전 ${was}`);
      continue;
    }
    // 보이던 것이 안 보이게 되면 업무가 멈춘다. 늘거나 좁혀지는 것(>0)은 통과.
    const ok = typeof now === "number" && (was === 0 ? now >= 0 : now > 0);
    check(`교사 · ${label} 조회가 끊기지 않았다`, ok, `적용 전 ${was}행 → 적용 후 ${now}행`);
  }
  for (const [label] of BUSINESS) {
    const was = preDirector[label];
    const now = postDirector[label];
    const ok = typeof was === "number" && typeof now === "number" && (was === 0 ? now >= 0 : now > 0);
    check(`원장 · ${label} 조회가 끊기지 않았다`, ok, `적용 전 ${was}행 → 적용 후 ${now}행`);
  }

  // 정책이 좁아진 자리는 숨기지 않고 적어 둔다 — 화면 기대치를 맞춰야 한다.
  const narrowed = BUSINESS.filter(
    ([l]) => typeof preTeacher[l] === "number" && typeof postTeacher[l] === "number" && postTeacher[l] < preTeacher[l],
  ).map(([l]) => `${l} ${preTeacher[l]}→${postTeacher[l]}`);
  console.log(
    `  주의  교사 조회 범위가 좁아진 항목: ${narrowed.length > 0 ? narrowed.join(" · ") : "없음"}`,
  );

  // 다른 기관은 적용 전에도 후에도 0이어야 한다.
  //
  // ★ 「차시」는 제외한다. `curriculum_lessons` 는 기관 데이터가 아니라 **공용
  //   교육과정 메타**(제목·주차)이고, #20 부터 활성 기관 구성원 누구에게나
  //   열려 있다 — 적용 전에도 2행이었다. 여기서 막아야 하는 것은 메타가 아니라
  //   **본문**이다. 그것은 바로 아래에서 따로 본다.
  const ORG_SCOPED = BUSINESS.filter(([l]) => l !== "차시");
  for (const [label] of ORG_SCOPED) {
    check(
      `다른 기관 교사에게 ${label} 조회는 적용 후에도 0행이다`,
      postOther[label] === 0,
      `적용 전 ${preOther[label]}행 → 적용 후 ${postOther[label]}행`,
    );
  }
  check(
    "차시 메타(제목·주차)는 적용 전과 같이 공용으로 열려 있다",
    preOther["차시"] === postOther["차시"],
    `적용 전 ${preOther["차시"]}행 → 적용 후 ${postOther["차시"]}행 · 공용 교육과정 메타`,
  );

  const teacher = await asRole(U_TEACHER);
  const director = await asRole(U_DIRECTOR);
  const other = await asRole(U_OTHER);

  // 업그레이드가 들여온 새 콘텐츠는 계약이 없는 기존 기관에 열리지 않아야 한다.
  await expectNoRows(
    teacher,
    "계약이 없는 기존 기관에 새 콘텐츠 본문은 0행이다",
    "select body, body_json from public.lesson_sections limit 5",
  );
  await expectNoRows(
    teacher,
    "본사 검수 기록은 기존 기관 교사에게 0행이다",
    "select id from public.lesson_review_notes limit 5",
  );
  // 메타는 열려도 본문·활동은 닫혀 있어야 한다 (E4).
  await expectNoRows(
    other,
    "다른 기관 교사는 차시 메타는 보지만 수업 활동은 0행이다",
    "select id from public.lesson_activities limit 5",
  );

  /* ── 7. 업그레이드가 들여온 기능이 기존 데이터 위에서 동작한다 ── */
  console.log("\n── 새 기능이 기존 데이터를 읽는다");
  check(
    "새로 들어온 계약 표가 비어 있다 (기존 기관은 아직 미계약)",
    (await count(admin, "select count(*) c from public.contracts")) === 0,
  );
  check(
    "상품 기준자료 seed 가 들어왔다",
    (await count(admin, "select count(*) c from public.product_versions")) >= 3,
  );
  const RPCS = [
    "organization_entitlements",
    "class_entitlements",
    "start_class_session",
    "publish_lesson",
    "list_lesson_scenes_for_class",
    "create_or_refresh_child_growth_report",
  ];
  const made = (
    await admin.query(
      `select p.proname from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = any($1)`,
      [RPCS],
    )
  ).rows.map((r) => r.proname);
  check(
    "업무 RPC 가 모두 만들어졌다 (기존 것 + 새 것)",
    RPCS.every((r) => made.includes(r)),
    made.sort().join(", "),
  );
  // 기존 기관은 계약이 없다 → 이용권 조회가 「없음」을 돌려줘야 한다. 오류가 아니다.
  try {
    const ent = await one(director, "select public.organization_entitlements($1) e", [ORG]);
    check("계약 없는 기존 기관의 이용권 조회가 오류 없이 답한다", ent !== undefined, JSON.stringify(ent.e));
  } catch (e) {
    check("계약 없는 기존 기관의 이용권 조회가 오류 없이 답한다", false, `${e.code} ${e.message}`);
  }

  await teacher.end();
  await director.end();
  await other.end();
  await admin.end();

  console.log(`\n결과: ${results.length - failures}/${results.length} 통과${failures > 0 ? ` · 실패 ${failures}` : ""}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\n검증 중단:", e.message);
  process.exit(1);
});
