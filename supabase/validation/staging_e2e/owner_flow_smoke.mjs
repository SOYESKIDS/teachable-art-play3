/** Owner-requested, staging-only smoke test. Uses the teacher's real Auth/RLS.
 * Creates synthetic attendance, observation and a completed weekly report.
 * Requires a fresh, scheduled synthetic session; never replays a completed class.
 * Credentials are environment variables, never arguments or log output.
 */
import { createClient } from "@supabase/supabase-js";

const STAGING = "https://itcddooiuqsqingfhxkk.supabase.co";
const url = process.env.SOYE_UAT_URL;
if (url !== STAGING) throw new Error("Refusing any target other than SOYESKIDS staging.");
const sessionId = process.env.SOYE_UAT_SESSION_ID;
const verifyOnly = process.argv.includes("--verify-only");
if (process.argv.slice(2).some(arg => arg !== "--verify-only")) throw new Error("Unknown argument.");
if (!/^15100000-0000-4000-8000-[0-9]{12}$/.test(sessionId ?? "")) {
  throw new Error("Only the owner's isolated synthetic session IDs are allowed.");
}
for (const name of ["SOYE_UAT_KEY", "SOYE_UAT_EMAIL", "SOYE_UAT_PASSWORD"]) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
const client = createClient(url, process.env.SOYE_UAT_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const evidence = [];
function pass(step, detail = {}) {
  const row = { step, status: "passed", ...detail };
  evidence.push(row);
  console.log(JSON.stringify(row));
}
async function result(query, step) {
  const { data, error } = await query;
  if (error) throw new Error(`${step}: ${error.code ?? "unknown"} ${error.message}`);
  return data;
}
async function rpc(name, args) {
  return result(client.rpc(name, args), name);
}
try {
  const auth = await result(client.auth.signInWithPassword({
    email: process.env.SOYE_UAT_EMAIL, password: process.env.SOYE_UAT_PASSWORD,
  }), "teacher login");
  const teacherId = auth.user.id;
  pass("teacher_login");
  const session = await result(client.from("class_sessions")
    .select("id,class_id,organization_id,class_program_assignment_id,lesson_id,status,scheduled_date")
    .eq("id", sessionId).single(), "synthetic session");
  if (session.status !== (verifyOnly ? "completed" : "scheduled")) {
    throw new Error(verifyOnly ? "A completed synthetic session is required." : "A fresh scheduled session is required.");
  }
  const cls = await result(client.from("classes").select("name").eq("id", session.class_id).single(), "class");
  if (!cls.name.includes("(합성)")) throw new Error("Refusing a non-synthetic class.");
  const membership = await result(client.from("organization_members").select("id,role")
    .eq("organization_id", session.organization_id).eq("user_id", teacherId).single(), "membership");
  if (membership.role !== "teacher") throw new Error("The smoke test requires a teacher account.");
  const entitlement = await rpc("class_entitlements", { p_class_id: session.class_id });
  if (!entitlement.class_mode_write || !entitlement.weekly_report_write) {
    throw new Error("Class operation and weekly reporting must already be entitled.");
  }
  const lesson = await result(client.from("curriculum_lessons").select("week_no,status")
    .eq("id", session.lesson_id).single(), "published lesson");
  if (lesson.status !== "published") throw new Error("Never publish draft content for a smoke test.");
  const roster = await result(client.from("children").select("id,name").eq("class_id", session.class_id)
    .eq("status", "active").order("id"), "synthetic roster");
  if (roster.length !== 3 || roster.some(child => !child.name.includes("(합성)"))) {
    throw new Error("The isolated three-child synthetic roster is required.");
  }
  pass("scope_and_published_lesson", { roster_count: roster.length, week: lesson.week_no });
  if (verifyOnly) {
    const confirmation = await result(client.from("session_before_confirmations")
      .select("safety_confirmed,privacy_confirmed").eq("class_session_id", sessionId)
      .eq("confirmed_by", teacherId).single(), "preparation reread");
    if (!confirmation.safety_confirmed || !confirmation.privacy_confirmed) throw new Error("Preparation is missing.");
    pass("preparation_reread");
    const attendance = await result(client.from("class_session_attendance").select("child_id,attendance_status")
      .eq("class_session_id", sessionId), "attendance reread");
    if (attendance.length !== 3 || attendance.some(row => row.attendance_status !== "present")) {
      throw new Error("Synthetic attendance is incomplete.");
    }
    pass("attendance_reread", { count: attendance.length });
    const observation = await result(client.from("class_session_observations").select("id,record_status")
      .eq("class_session_id", sessionId).eq("child_id", roster[0].id).single(), "observation reread");
    if (observation.record_status !== "complete") throw new Error("Observation is incomplete.");
    pass("observation_reread", { observation_id: observation.id });
    const report = await result(client.from("reports").select("id,latest_completed_revision_id")
      .eq("class_program_assignment_id", session.class_program_assignment_id).eq("child_id", roster[0].id)
      .eq("report_type", "weekly").eq("week_no", lesson.week_no).single(), "report reread");
    if (!report.latest_completed_revision_id) throw new Error("Completed report revision is missing.");
    const revision = await result(client.from("report_revisions").select("status,completed_at")
      .eq("id", report.latest_completed_revision_id).single(), "revision reread");
    if (revision.status !== "complete" || !revision.completed_at) throw new Error("Report is incomplete.");
    pass("weekly_report_reread", { report_id: report.id });
    console.log(JSON.stringify({ status: "passed", mode: "verify-only", checks: evidence.length, target: "staging" }));
  } else {
  await rpc("confirm_session_before", { p_session_id: sessionId, p_safety_confirmed: true, p_privacy_confirmed: true });
  pass("preparation_saved");
  await rpc("start_class_session", { p_session_id: sessionId });
  pass("class_started");
  await rpc("save_quick_memo", { p_session_id: sessionId, p_body: "소유자 스테이징 검증용 합성 메모", p_expected_updated_at: null });
  pass("class_memo_saved");
  await rpc("finish_class_session", { p_session_id: sessionId });
  pass("class_finished");
  await rpc("save_class_session_attendance_atomic", {
    p_session_id: sessionId,
    p_entries: roster.map(child => ({ child_id: child.id, attendance_status: "present" })),
  });
  pass("attendance_saved", { count: roster.length });
  const childId = roster[0].id;
  const observation = await rpc("save_class_observation", {
    p_session_id: sessionId, p_child_id: childId,
    p_teacher_note: "스테이징 합성 기록: 친구의 이름을 부르고 차례를 기다렸습니다.",
    p_child_voice: "같이 해요. (테스트 문장)",
    p_record_status: "complete", p_growth: [], p_expected_updated_at: null,
  });
  pass("observation_saved", { observation_id: observation.observation_id });
  const report = await rpc("create_weekly_report_draft", {
    p_child_id: childId, p_assignment_id: session.class_program_assignment_id, p_week_no: lesson.week_no,
  });
  const saved = await rpc("save_report_draft", {
    p_revision_id: report.revision_id, p_expected_updated_at: report.updated_at, p_media_ids: [],
    p_content: {
      topic: "소유자 스테이징 수업 흐름 검증 (합성)",
      quote_choice: "같이 해요. (테스트 문장)",
      teacher_observation: "스테이징 합성 기록: 친구의 이름을 부르고 차례를 기다렸습니다.",
      family_conversation: "오늘 함께했던 친구에 관해 대화해 주세요. (테스트 문장)",
      next_week_preview: "테스트용 다음 수업 안내",
    },
  });
  await rpc("complete_report_revision", { p_revision_id: report.revision_id, p_expected_updated_at: saved.updated_at });
  pass("weekly_report_completed", { report_id: report.report_id, revision_id: report.revision_id });
  const reread = await result(client.from("class_session_observations").select("id,record_status,teacher_note")
    .eq("id", observation.observation_id).single(), "observation reread");
  if (reread.record_status !== "complete" || !reread.teacher_note.includes("스테이징 합성 기록")) {
    throw new Error("Observation was not persisted as expected.");
  }
  const revision = await result(client.from("report_revisions").select("id,status")
    .eq("id", report.revision_id).single(), "report reread");
  if (revision.status !== "complete") throw new Error("The report was not completed.");
  pass("persisted_data_reread");
  console.log(JSON.stringify({ status: "passed", checks: evidence.length, target: "staging", session_id: sessionId }));
  }
} catch (error) {
  console.error(JSON.stringify({ status: "failed", passed_checks: evidence.length, message: error.message }));
  process.exitCode = 1;
} finally {
  await client.auth.signOut({ scope: "local" });
}
