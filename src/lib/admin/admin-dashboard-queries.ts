import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassSessionStatus } from "@/types/class-session";
import type { OrganizationStatus } from "@/types/organization";
import {
  ADMIN_ID_CHUNK_SIZE,
  ADMIN_WINDOW_DAYS,
  MAX_ADMIN_ASSIGNMENTS,
  MAX_ADMIN_ATTENTION_ORGS,
  MAX_ADMIN_CHILDREN,
  MAX_ADMIN_CLASSES,
  MAX_ADMIN_MEMBERS,
  MAX_ADMIN_ORGANIZATIONS,
  MAX_ADMIN_RECENT_ITEMS,
  MAX_ADMIN_RECORD_ROWS,
  MAX_ADMIN_SESSIONS,
  type AdminAttentionItem,
  type AdminDashboardData,
  type AdminOrganizationRow,
  type AdminOrganizationSummary,
  type AdminRecentReport,
  type AdminRecentSession,
} from "@/types/admin-dashboard";
import { shiftIsoDate } from "@/types/director-dashboard";
import {
  isAttendanceRecordTarget,
  isObservationRecordTarget,
} from "@/lib/operations/session-record-rules";

/**
 * SERVICE-14 — 본사 운영 콘솔 집계.
 *
 * ★ 권한은 이 파일이 정하지 않는다.
 *   호출자는 requireAdmin() 을 통과한 **로그인 관리자 세션 client** 를 넘긴다.
 *   무엇이 보이는지는 RLS 가 결정한다 — 위 표들의 SELECT Policy 에
 *   private.is_soyes_admin() 분기가 열려 있어 관리자는 전 기관을 읽는다.
 *   service_role / Secret Key / admin client 를 쓰지 않고, RLS 를 우회하지 않는다.
 *
 * ★ 새 SECURITY DEFINER 함수도, migration 도 만들지 않는다.
 *   전부 기존 표 · 기존 Policy 위에서 읽기만 한다.
 *
 * ★ N+1 금지
 *   기관마다 질의하지 않는다. 표 하나당 한 번(또는 id chunk 당 한 번) 읽고
 *   메모리에서 기관별로 나눈다. 질의 횟수는 기관 수와 무관하다.
 *
 * ★ 개인정보 최소화
 *   원아 이름 · 관찰 원문 · 교사 작성문 · 사진 경로를 select 하지 않는다.
 *   필요한 것은 id 와 소속, 그리고 상태값뿐이다.
 *
 * ★ 운영 범위 = 운영 중(active)인 기관
 *   KPI · 기관 현황 · 확인 필요 · 최근 활동이 전부 organizations.status = 'active'
 *   인 기관에만 걸린다. 기관이 운영 종료됐는데 그 안의 반 · 교사 · 원아 · 수업 ·
 *   리포트가 아직 active 이면, "운영 기관"에서는 빠지고 다른 숫자에는 들어가
 *   서로 어긋난 집계가 된다. 그래서 활성 기관 id 를 먼저 구하고, 이후 모든 조회를
 *   그 id 목록으로 좁힌다.
 *
 *   운영이 끝난 기관이 사라지는 것은 아니다 — 전체 목록과 관리는
 *   /admin/organizations 가, 기관별 지난 기록은 기관 상세가 담당한다.
 *
 * ★ child_growth_report_shares 는 읽지 않는다.
 *   그 표의 SELECT Policy 에는 원장 분기만 있고 관리자 분기가 없다(SERVICE-13).
 *   RLS 를 우회해서까지 볼 값이 아니므로 이 화면에서 다루지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logQueryFailure(scope: string, message: string) {
  // 원인 파악에 필요한 최소한만 남긴다. 행 내용은 로그에 넣지 않는다.
  console.error(`[admin/dashboard] ${scope} query failed: ${message}`);
}

interface OrganizationLite {
  id: string;
  name: string;
  status: OrganizationStatus;
  created_at: string;
}

interface MemberLite {
  organization_id: string;
  user_id: string;
  role: string;
}

interface ClassLite {
  id: string;
  organization_id: string;
  status: string;
}

interface ChildLite {
  organization_id: string;
}

interface AssignmentLite {
  organization_id: string;
  /**
   * ★ 어느 반의 배정인지 알아야 한다.
   *   기관 id 만으로 세면, 보관된 반에만 배정이 남아 있는 기관이
   *   "프로그램 배정 있음"으로 보인다. 운영 중인 반에 걸린 배정만 센다.
   */
  class_id: string;
}

interface SessionLite {
  id: string;
  organization_id: string;
  class_id: string;
  scheduled_date: string | null;
  status: ClassSessionStatus;
}

interface ClassTeacherLite {
  class_id: string;
}

interface SessionIdLite {
  class_session_id: string;
}

/** 상한에 닿았는가 = 이 집계로 전체를 보지 못했다 */
interface Bounded<T> {
  rows: T[];
  ok: boolean;
  truncated: boolean;
}

function empty<T>(): Bounded<T> {
  return { rows: [], ok: false, truncated: false };
}

/** 표 하나를 상한까지 읽고, 실패/절단 여부를 함께 돌려준다 */
async function fetchBounded<T>(
  supabase: SupabaseClient,
  scope: string,
  build: (
    client: SupabaseClient,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  limit: number,
): Promise<Bounded<T>> {
  const { data, error } = await build(supabase);

  if (error) {
    logQueryFailure(scope, error.message);
    return empty<T>();
  }

  const rows = (data ?? []) as T[];

  return { rows, ok: true, truncated: rows.length >= limit };
}

/**
 * id 목록을 chunk 로 잘라 `.in()` 질의를 병렬 실행한다.
 *
 * 한 번에 다 넣으면 URL 이 게이트웨이 한도를 넘고, 하나씩 넣으면 N+1 이다.
 * chunk 하나당 한 번씩만 읽고 결과를 합친다.
 */
async function fetchByIdChunks<T>(
  ids: string[],
  scope: string,
  run: (chunk: string[]) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  rowLimit: number,
): Promise<Bounded<T>> {
  if (ids.length === 0) return { rows: [], ok: true, truncated: false };

  const chunks: string[][] = [];

  for (let i = 0; i < ids.length; i += ADMIN_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + ADMIN_ID_CHUNK_SIZE));
  }

  const results = await Promise.all(chunks.map((chunk) => run(chunk)));

  const rows: T[] = [];
  let truncated = false;

  for (const result of results) {
    if (result.error) {
      logQueryFailure(scope, result.error.message);
      return empty<T>();
    }

    const chunkRows = (result.data ?? []) as T[];

    // chunk 단위 상한에 닿았다면 그 chunk 의 일부를 못 본 것이다.
    if (chunkRows.length >= rowLimit) truncated = true;

    rows.push(...chunkRows);
  }

  return { rows, ok: true, truncated };
}

/** head:true 정확 집계. 행을 한 줄도 가져오지 않는다. */
async function countExact(
  supabase: SupabaseClient,
  scope: string,
  build: (
    client: SupabaseClient,
  ) => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
  const { count, error } = await build(supabase);

  if (error) {
    logQueryFailure(scope, error.message);
    return null;
  }

  return count ?? 0;
}

/** 기관별 개수 세기 (추가 질의 없이 메모리에서) */
function countByOrganization(
  rows: { organization_id: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.organization_id, (counts.get(row.organization_id) ?? 0) + 1);
  }

  return counts;
}

/**
 * 활성 기관 id 로 좁힌 정확 집계.
 *
 * chunk 들은 기관 id 로 서로 겹치지 않으므로 각 chunk 의 exact count 를 더하면
 * 전체가 된다. head:true 라 행은 한 줄도 전송되지 않는다.
 * 한 chunk 라도 실패하면 합계를 믿을 수 없으므로 null 을 돌려준다.
 */
async function countExactByOrgChunks(
  organizationIds: string[],
  scope: string,
  run: (chunk: string[]) => PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<number | null> {
  if (organizationIds.length === 0) return 0;

  const chunks: string[][] = [];

  for (let i = 0; i < organizationIds.length; i += ADMIN_ID_CHUNK_SIZE) {
    chunks.push(organizationIds.slice(i, i + ADMIN_ID_CHUNK_SIZE));
  }

  const results = await Promise.all(chunks.map((chunk) => run(chunk)));

  let total = 0;

  for (const result of results) {
    if (result.error) {
      logQueryFailure(scope, result.error.message);
      return null;
    }

    total += result.count ?? 0;
  }

  return total;
}

/** 기관별 확인 항목을 사실만으로 만든다 */
function buildAttention(input: {
  classCount: number;
  teacherCount: number;
  assignmentCount: number;
  attendanceMissing: number;
  observationMissing: number;
  activityReliable: boolean;
}): AdminAttentionItem[] {
  const items: AdminAttentionItem[] = [];

  if (input.classCount === 0) {
    items.push({ kind: "no_class" });
  } else {
    // 반이 있는데 배정된 교사가 없는 경우만 확인 항목이다.
    if (input.teacherCount === 0) items.push({ kind: "no_teacher" });
    if (input.assignmentCount === 0) items.push({ kind: "no_program" });
  }

  // 집계를 믿을 수 없으면 개수를 말하지 않는다. 0으로 위장하지도 않는다.
  if (input.activityReliable) {
    if (input.attendanceMissing > 0) {
      items.push({
        kind: "attendance_missing",
        count: input.attendanceMissing,
      });
    }

    if (input.observationMissing > 0) {
      items.push({
        kind: "observation_missing",
        count: input.observationMissing,
      });
    }
  }

  return items;
}

/**
 * 운영 콘솔 한 화면에 필요한 집계.
 *
 * 실패는 영역별로 격리한다. 최근 활동 조회가 실패해도 기관 현황은 보여야 하고,
 * 반대도 마찬가지다. 그래서 전체를 실패시키지 않고 플래그로 내려보낸다.
 */
export async function fetchAdminDashboard(
  supabase: SupabaseClient,
  today: string,
): Promise<AdminDashboardData> {
  const windowStart = shiftIsoDate(today, -(ADMIN_WINDOW_DAYS - 1));

  const emptyResult = (organizationsOk: boolean): AdminDashboardData => ({
    today,
    todayLabel: formatAdminDate(today),
    windowStart,
    windowDays: ADMIN_WINDOW_DAYS,
    kpis: {
      activeOrganizations: null,
      activeClasses: null,
      teacherMemberships: null,
      activeChildren: null,
      recentSessions: null,
      completedReports: null,
    },
    organizations: [],
    attentionOrganizations: [],
    recentReports: [],
    recentSessions: [],
    organizationsOk,
    rosterReliable: false,
    sessionsReliable: false,
    activityReliable: false,
    recentOk: false,
  });

  // ── 0차: 운영 범위를 먼저 정한다 ───────────────────────────────────────
  //   활성 기관 id 를 알아야 이후 모든 조회를 거기에 맞춰 좁힐 수 있다.
  //   기관 수 자체는 head:true 정확 집계라 아래 목록 상한의 영향을 받지 않는다.
  const [activeOrganizationCount, organizations] = await Promise.all([
    countExact(supabase, "kpi:organizations", (c) =>
      c
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ),
    fetchBounded<OrganizationLite>(
      supabase,
      "organizations",
      (c) =>
        c
          .from("organizations")
          .select("id, name, status, created_at")
          .eq("status", "active")
          .order("name", { ascending: true })
          .limit(MAX_ADMIN_ORGANIZATIONS),
      MAX_ADMIN_ORGANIZATIONS,
    ),
  ]);

  if (!organizations.ok) return emptyResult(false);

  const orgById = new Map(organizations.rows.map((row) => [row.id, row]));
  const activeOrgIds = organizations.rows.map((row) => row.id);

  // 운영 중인 기관이 하나도 없으면 더 읽을 것이 없다. 0 은 여기서는 사실이다.
  if (activeOrgIds.length === 0) {
    return {
      ...emptyResult(true),
      kpis: {
        activeOrganizations: activeOrganizationCount,
        activeClasses: 0,
        teacherMemberships: 0,
        activeChildren: 0,
        recentSessions: 0,
        completedReports: 0,
      },
      rosterReliable: true,
      sessionsReliable: true,
      activityReliable: true,
      recentOk: true,
    };
  }

  // ── 1차: 전부 활성 기관 id 로 좁혀서 batch 조회 ────────────────────────
  const [
    members,
    classes,
    children,
    assignments,
    sessions,
    classTeachers,
    reports,
    completedReportCount,
  ] = await Promise.all([
    fetchByIdChunks<MemberLite>(
      activeOrgIds,
      "members",
      (chunk) =>
        supabase
          .from("organization_members")
          .select("organization_id, user_id, role")
          .in("organization_id", chunk)
          .eq("status", "active")
          .limit(MAX_ADMIN_MEMBERS),
      MAX_ADMIN_MEMBERS,
    ),

    fetchByIdChunks<ClassLite>(
      activeOrgIds,
      "classes",
      (chunk) =>
        supabase
          .from("classes")
          .select("id, organization_id, status")
          .in("organization_id", chunk)
          .eq("status", "active")
          .limit(MAX_ADMIN_CLASSES),
      MAX_ADMIN_CLASSES,
    ),

    // ★ 이름을 읽지 않는다. 세는 데 필요한 것은 소속뿐이다.
    fetchByIdChunks<ChildLite>(
      activeOrgIds,
      "children",
      (chunk) =>
        supabase
          .from("children")
          .select("organization_id")
          .in("organization_id", chunk)
          .eq("status", "active")
          .limit(MAX_ADMIN_CHILDREN),
      MAX_ADMIN_CHILDREN,
    ),

    fetchByIdChunks<AssignmentLite>(
      activeOrgIds,
      "assignments",
      (chunk) =>
        supabase
          .from("class_program_assignments")
          .select("organization_id, class_id")
          .in("organization_id", chunk)
          .eq("status", "active")
          .limit(MAX_ADMIN_ASSIGNMENTS),
      MAX_ADMIN_ASSIGNMENTS,
    ),

    fetchByIdChunks<SessionLite>(
      activeOrgIds,
      "sessions",
      (chunk) =>
        supabase
          .from("class_sessions")
          .select("id, organization_id, class_id, scheduled_date, status")
          .in("organization_id", chunk)
          .gte("scheduled_date", windowStart)
          .lte("scheduled_date", today)
          .order("scheduled_date", { ascending: false })
          .limit(MAX_ADMIN_SESSIONS),
      MAX_ADMIN_SESSIONS,
    ),

    fetchByIdChunks<ClassTeacherLite>(
      activeOrgIds,
      "class teachers",
      (chunk) =>
        supabase
          .from("class_teachers")
          .select("class_id")
          .in("organization_id", chunk)
          .limit(MAX_ADMIN_CLASSES),
      MAX_ADMIN_CLASSES,
    ),

    // 최근 완료 리포트 — chunk 마다 상위 몇 건씩 받아 합친 뒤 다시 정렬한다.
    // 전체 상위 N 은 각 chunk 상위 N 의 합집합 안에 반드시 들어 있다.
    fetchByIdChunks<{
      id: string;
      organization_id: string;
      period_start: string;
      period_end: string;
      completed_at: string | null;
    }>(
      activeOrgIds,
      "reports",
      (chunk) =>
        supabase
          .from("child_growth_reports")
          .select("id, organization_id, period_start, period_end, completed_at")
          .in("organization_id", chunk)
          .eq("status", "complete")
          .order("completed_at", { ascending: false, nullsFirst: false })
          .limit(MAX_ADMIN_RECENT_ITEMS),
      // 이 조회는 애초에 상위 N 건만 원하므로 절단 여부를 보지 않는다.
      Number.MAX_SAFE_INTEGER,
    ),

    // 완료 리포트 총계는 행을 받지 않고 정확히 센다.
    countExactByOrgChunks(activeOrgIds, "kpi:reports", (chunk) =>
      supabase
        .from("child_growth_reports")
        .select("id", { count: "exact", head: true })
        .in("organization_id", chunk)
        .eq("status", "complete"),
    ),
  ]);

  // ── 2차: 수업 id 가 정해진 뒤에야 할 수 있는 조회 ──────────────────────
  const attendanceTargets = sessions.rows.filter((session) =>
    isAttendanceRecordTarget(session, today),
  );
  const observationTargets = sessions.rows.filter((session) =>
    isObservationRecordTarget(session, today),
  );

  const [attendanceRows, observationRows] = await Promise.all([
    fetchByIdChunks<SessionIdLite>(
      attendanceTargets.map((s) => s.id),
      "attendance",
      (chunk) =>
        supabase
          .from("class_session_attendance")
          .select("class_session_id")
          .in("class_session_id", chunk)
          .limit(MAX_ADMIN_RECORD_ROWS),
      MAX_ADMIN_RECORD_ROWS,
    ),
    fetchByIdChunks<SessionIdLite>(
      observationTargets.map((s) => s.id),
      "observations",
      (chunk) =>
        supabase
          .from("class_session_observations")
          .select("class_session_id")
          .in("class_session_id", chunk)
          .limit(MAX_ADMIN_RECORD_ROWS),
      MAX_ADMIN_RECORD_ROWS,
    ),
  ]);

  const sessionsWithAttendance = new Set(
    attendanceRows.rows.map((row) => row.class_session_id),
  );
  const sessionsWithObservation = new Set(
    observationRows.rows.map((row) => row.class_session_id),
  );

  // ── 신뢰도 ────────────────────────────────────────────────────────────
  const rosterReliable =
    !organizations.truncated &&
    members.ok &&
    !members.truncated &&
    classes.ok &&
    !classes.truncated &&
    children.ok &&
    !children.truncated &&
    assignments.ok &&
    !assignments.truncated &&
    classTeachers.ok &&
    !classTeachers.truncated;

  // 수업 수·최근 수업일은 수업 조회만 온전하면 믿을 수 있다.
  const sessionsReliable =
    !organizations.truncated && sessions.ok && !sessions.truncated;

  // "기록 없음"은 그 수업들의 출결/관찰 행까지 온전해야 한다.
  const activityReliable =
    sessionsReliable &&
    attendanceRows.ok &&
    !attendanceRows.truncated &&
    observationRows.ok &&
    !observationRows.truncated;

  // ── 집계 ──────────────────────────────────────────────────────────────
  const classCounts = countByOrganization(classes.rows);
  const childCounts = countByOrganization(children.rows);

  // ★ 운영 중인 반 id. 아래 두 확인 항목의 기준선이다.
  //   classes.rows 는 status='active' 로 좁혀 읽은 것이므로 그대로 쓴다.
  const activeClassIds = new Set(classes.rows.map((row) => row.id));

  // ★ "운영 중 프로그램 배정" = 활성 기관 + 활성 반 + 활성 배정.
  //   보관된 반에 남아 있는 배정은 과거 기록이지 지금 운영 중인 배정이 아니다.
  //   (기록을 지우거나 숨기는 것이 아니다 — 전체 이력은 기관 상세가 보여 준다)
  const assignmentCounts = countByOrganization(
    assignments.rows.filter((row) => activeClassIds.has(row.class_id)),
  );

  // 교사 수 = 그 기관의 active teacher membership 수 (사람이 두 기관에 있으면 각각 1)
  const teacherRows = members.rows.filter((row) => row.role === "teacher");
  const teacherCounts = countByOrganization(teacherRows);

  // ★ "배정된 교사 있음" = 운영 중인 반 중 하나라도 교사가 배정된 경우.
  //   class_teachers 에는 status 컬럼이 없다(20260824 스키마 확인) —
  //   배정이 끝나면 행 자체가 사라지는 구조라 행의 존재가 곧 배정이다.
  //   그래서 "활성 여부"는 반 쪽에서 가른다: 아래 루프가 활성 반만 순회하므로
  //   보관된 반에만 교사가 있는 기관은 여기 들어오지 않는다.
  const classesWithTeacher = new Set(
    classTeachers.rows.map((row) => row.class_id),
  );

  const orgHasAssignedTeacher = new Set<string>();

  for (const classRow of classes.rows) {
    if (classesWithTeacher.has(classRow.id)) {
      orgHasAssignedTeacher.add(classRow.organization_id);
    }
  }

  const recentSessionCounts = new Map<string, number>();
  const lastSessionDates = new Map<string, string>();
  const attendanceMissing = new Map<string, number>();
  const observationMissing = new Map<string, number>();

  let totalRecentSessions = 0;

  for (const session of sessions.rows) {
    const orgId = session.organization_id;

    if (session.status !== "cancelled") {
      totalRecentSessions += 1;
      recentSessionCounts.set(orgId, (recentSessionCounts.get(orgId) ?? 0) + 1);

      if (session.scheduled_date !== null) {
        const current = lastSessionDates.get(orgId);

        if (current === undefined || session.scheduled_date > current) {
          lastSessionDates.set(orgId, session.scheduled_date);
        }
      }
    }

    if (
      isAttendanceRecordTarget(session, today) &&
      !sessionsWithAttendance.has(session.id)
    ) {
      attendanceMissing.set(orgId, (attendanceMissing.get(orgId) ?? 0) + 1);
    }

    if (
      isObservationRecordTarget(session, today) &&
      !sessionsWithObservation.has(session.id)
    ) {
      observationMissing.set(orgId, (observationMissing.get(orgId) ?? 0) + 1);
    }
  }

  const rows: AdminOrganizationRow[] = organizations.rows.map((org) => {
    const classCount = classCounts.get(org.id) ?? 0;

    return {
      id: org.id,
      name: org.name,
      status: org.status,
      classCount,
      teacherCount: teacherCounts.get(org.id) ?? 0,
      childCount: childCounts.get(org.id) ?? 0,
      assignmentCount: assignmentCounts.get(org.id) ?? 0,
      lastSessionDate: lastSessionDates.get(org.id) ?? null,
      recentSessionCount: recentSessionCounts.get(org.id) ?? 0,
      attention: buildAttention({
        classCount,
        // 반이 있는데 그 반들 중 어디에도 교사가 배정되지 않았는가
        teacherCount: orgHasAssignedTeacher.has(org.id) ? 1 : 0,
        assignmentCount: assignmentCounts.get(org.id) ?? 0,
        attendanceMissing: attendanceMissing.get(org.id) ?? 0,
        observationMissing: observationMissing.get(org.id) ?? 0,
        activityReliable,
      }),
    };
  });

  // 확인이 필요한 기관 — 점수를 만들지 않는다.
  // 항목 개수가 많은 순, 같으면 최근 수업이 오래된 순(없으면 가장 오래된 것으로 본다).
  const attentionOrganizations = rows
    .filter((row) => row.attention.length > 0)
    .sort((a, b) => {
      const byCount = b.attention.length - a.attention.length;
      if (byCount !== 0) return byCount;

      const aDate = a.lastSessionDate ?? "";
      const bDate = b.lastSessionDate ?? "";
      if (aDate !== bDate) return aDate.localeCompare(bDate);

      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, MAX_ADMIN_ATTENTION_ORGS);

  const recentReports: AdminRecentReport[] = reports.rows
    .filter((row) => row.completed_at !== null)
    .sort((a, b) =>
      (b.completed_at as string).localeCompare(a.completed_at as string),
    )
    .slice(0, MAX_ADMIN_RECENT_ITEMS)
    .map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      organizationName: orgById.get(row.organization_id)?.name ?? "기관 확인 불가",
      periodStart: row.period_start,
      periodEnd: row.period_end,
      completedAt: row.completed_at as string,
    }));

  // 최근 수업은 "날짜 + 기관" 단위로 묶는다. 개별 수업을 늘어놓을 이유가 없다.
  const recentSessions = buildRecentSessions(sessions.rows, orgById);

  return {
    today,
    todayLabel: formatAdminDate(today),
    windowStart,
    windowDays: ADMIN_WINDOW_DAYS,

    kpis: {
      // 기관 수만 head:true 정확 집계다. 나머지는 위에서 읽은 활성 기관 행에서
      // 직접 세므로, 아래 기관별 표의 숫자와 반드시 일치한다.
      activeOrganizations: activeOrganizationCount,
      activeClasses: rosterReliable ? classes.rows.length : null,
      teacherMemberships: rosterReliable ? teacherRows.length : null,
      activeChildren: rosterReliable ? children.rows.length : null,
      recentSessions: sessionsReliable ? totalRecentSessions : null,
      completedReports: completedReportCount,
    },
    organizations: rows,
    attentionOrganizations,
    recentReports,
    recentSessions,

    organizationsOk: true,
    rosterReliable,
    sessionsReliable,
    activityReliable,
    recentOk: reports.ok && sessions.ok,
  };
}

/** 기관 · 날짜로 묶은 최근 수업 요약 */
function buildRecentSessions(
  sessions: SessionLite[],
  orgById: Map<string, OrganizationLite>,
): AdminRecentSession[] {
  const grouped = new Map<string, AdminRecentSession>();

  for (const session of sessions) {
    if (session.scheduled_date === null) continue;
    if (session.status === "cancelled") continue;

    const key = `${session.organization_id}|${session.scheduled_date}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.completedCount += 1;
      continue;
    }

    grouped.set(key, {
      id: session.id,
      organizationId: session.organization_id,
      organizationName:
        orgById.get(session.organization_id)?.name ?? "기관 확인 불가",
      className: null,
      scheduledDate: session.scheduled_date,
      completedCount: 1,
    });
  }

  return [...grouped.values()]
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, MAX_ADMIN_RECENT_ITEMS);
}

/**
 * 기관 상세 상단의 운영 요약.
 *
 * 대시보드와 같은 규칙을 쓰되, 한 기관만 보므로 질의 범위를 그 기관으로 좁힌다.
 * 질의 횟수는 고정이다(기관 수와 무관).
 */
export async function fetchAdminOrganizationSummary(
  supabase: SupabaseClient,
  organizationId: string,
  status: OrganizationStatus,
  today: string,
): Promise<AdminOrganizationSummary | null> {
  if (!UUID_PATTERN.test(organizationId)) return null;

  const windowStart = shiftIsoDate(today, -(ADMIN_WINDOW_DAYS - 1));

  const [
    directorCount,
    teacherCount,
    classCount,
    childCount,
    assignments,
    completedReportCount,
    sessions,
    classes,
    classTeachers,
  ] = await Promise.all([
    countExact(supabase, "org:directors", (c) =>
      c
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .eq("role", "director"),
    ),
    countExact(supabase, "org:teachers", (c) =>
      c
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .eq("role", "teacher"),
    ),
    countExact(supabase, "org:classes", (c) =>
      c
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active"),
    ),
    countExact(supabase, "org:children", (c) =>
      c
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active"),
    ),
    // ★ head:true 로 셀 수 없다. 활성 반에 걸린 배정만 세야 하므로
    //   class_id 를 함께 읽어 아래에서 걸러낸다.
    fetchBounded<AssignmentLite>(
      supabase,
      "org:assignments",
      (c) =>
        c
          .from("class_program_assignments")
          .select("organization_id, class_id")
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .limit(MAX_ADMIN_ASSIGNMENTS),
      MAX_ADMIN_ASSIGNMENTS,
    ),
    countExact(supabase, "org:reports", (c) =>
      c
        .from("child_growth_reports")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "complete"),
    ),

    fetchBounded<SessionLite>(
      supabase,
      "org:sessions",
      (c) =>
        c
          .from("class_sessions")
          .select("id, organization_id, class_id, scheduled_date, status")
          .eq("organization_id", organizationId)
          .gte("scheduled_date", windowStart)
          .lte("scheduled_date", today)
          .order("scheduled_date", { ascending: false })
          .limit(MAX_ADMIN_SESSIONS),
      MAX_ADMIN_SESSIONS,
    ),

    fetchBounded<ClassLite>(
      supabase,
      "org:class ids",
      (c) =>
        c
          .from("classes")
          .select("id, organization_id, status")
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .limit(MAX_ADMIN_CLASSES),
      MAX_ADMIN_CLASSES,
    ),

    fetchBounded<ClassTeacherLite>(
      supabase,
      "org:class teachers",
      (c) =>
        c
          .from("class_teachers")
          .select("class_id")
          .eq("organization_id", organizationId)
          .limit(MAX_ADMIN_CLASSES),
      MAX_ADMIN_CLASSES,
    ),
  ]);

  const attendanceTargets = sessions.rows.filter((session) =>
    isAttendanceRecordTarget(session, today),
  );
  const observationTargets = sessions.rows.filter((session) =>
    isObservationRecordTarget(session, today),
  );

  const [attendanceRows, observationRows] = await Promise.all([
    fetchByIdChunks<SessionIdLite>(
      attendanceTargets.map((s) => s.id),
      "org:attendance",
      (chunk) =>
        supabase
          .from("class_session_attendance")
          .select("class_session_id")
          .in("class_session_id", chunk)
          .limit(MAX_ADMIN_RECORD_ROWS),
      MAX_ADMIN_RECORD_ROWS,
    ),
    fetchByIdChunks<SessionIdLite>(
      observationTargets.map((s) => s.id),
      "org:observations",
      (chunk) =>
        supabase
          .from("class_session_observations")
          .select("class_session_id")
          .in("class_session_id", chunk)
          .limit(MAX_ADMIN_RECORD_ROWS),
      MAX_ADMIN_RECORD_ROWS,
    ),
  ]);

  const withAttendance = new Set(
    attendanceRows.rows.map((row) => row.class_session_id),
  );
  const withObservation = new Set(
    observationRows.rows.map((row) => row.class_session_id),
  );

  const activityReliable =
    sessions.ok &&
    !sessions.truncated &&
    attendanceRows.ok &&
    !attendanceRows.truncated &&
    observationRows.ok &&
    !observationRows.truncated;

  let recentSessionCount = 0;
  let lastSessionDate: string | null = null;
  let missingAttendance = 0;
  let missingObservation = 0;

  for (const session of sessions.rows) {
    if (session.status !== "cancelled") {
      recentSessionCount += 1;

      if (
        session.scheduled_date !== null &&
        (lastSessionDate === null || session.scheduled_date > lastSessionDate)
      ) {
        lastSessionDate = session.scheduled_date;
      }
    }

    if (
      isAttendanceRecordTarget(session, today) &&
      !withAttendance.has(session.id)
    ) {
      missingAttendance += 1;
    }

    if (
      isObservationRecordTarget(session, today) &&
      !withObservation.has(session.id)
    ) {
      missingObservation += 1;
    }
  }

  // ★ 대시보드와 같은 기준: 운영 중인 반에 걸린 것만 센다.
  const activeClassIds = new Set(classes.rows.map((row) => row.id));

  const classesWithTeacher = new Set(
    classTeachers.rows.map((row) => row.class_id),
  );

  const hasAssignedTeacher = classes.rows.some((row) =>
    classesWithTeacher.has(row.id),
  );

  // 반 목록이나 배정 목록을 온전히 읽지 못했으면 숫자를 만들지 않는다.
  const assignmentCount =
    assignments.ok &&
    !assignments.truncated &&
    classes.ok &&
    !classes.truncated
      ? assignments.rows.filter((row) => activeClassIds.has(row.class_id)).length
      : null;

  return {
    status,
    directorCount,
    teacherCount,
    classCount,
    childCount,
    assignmentCount,
    lastSessionDate,
    recentSessionCount: sessions.ok ? recentSessionCount : null,
    completedReportCount,
    windowDays: ADMIN_WINDOW_DAYS,
    attention: buildAttention({
      classCount: classCount ?? 0,
      teacherCount: hasAssignedTeacher ? 1 : 0,
      assignmentCount: assignmentCount ?? 0,
      attendanceMissing: missingAttendance,
      observationMissing: missingObservation,
      activityReliable,
    }),
    // ★ 확인 항목은 반 · 교사 배정 · 프로그램 배정 조회가 모두 온전해야 믿을 수 있다.
    //   assignmentCount 가 null(집계 불가)인데 그것을 0 으로 읽어
    //   "프로그램 미배정"을 띄우는 일이 없도록, 여기서 함께 막는다.
    attentionReliable:
      activityReliable &&
      classes.ok &&
      !classes.truncated &&
      classTeachers.ok &&
      !classTeachers.truncated &&
      assignmentCount !== null &&
      classCount !== null,
  };
}

/**
 * "2026년 9월 3일".
 *
 * ★ 시간대에 의존하지 않는다. "YYYY-MM-DD" 문자열을 그대로 쪼갠다.
 *   서버 UTC 날짜를 substring 해서 한국 날짜가 하루 밀리는 사고를 만들지 않는다
 *   (오늘 값 자체는 호출자가 todayInSeoul() 로 만들어 넘긴다).
 */
export function formatAdminDate(isoDate: string): string {
  const parts = isoDate.split("-");

  if (parts.length !== 3) return isoDate;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return isoDate;
  }

  return `${year}년 ${month}월 ${day}일`;
}

/** "2026.09.03" — 표·목록의 짧은 날짜 */
export function formatAdminShortDate(isoDate: string | null): string {
  if (!isoDate) return "—";

  return isoDate.slice(0, 10).replaceAll("-", ".");
}
