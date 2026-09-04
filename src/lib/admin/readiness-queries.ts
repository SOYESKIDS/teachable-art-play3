import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_WINDOW_DAYS,
  MAX_ADMIN_ASSIGNMENTS,
  MAX_ADMIN_CHILDREN,
  MAX_ADMIN_CLASSES,
  MAX_ADMIN_MEMBERS,
  MAX_ADMIN_ORGANIZATIONS,
  MAX_ADMIN_SESSIONS,
} from "@/types/admin-dashboard";
import type {
  OrganizationReadiness,
  ReadinessData,
  ReadinessItem,
} from "@/types/admin-readiness";
import { shiftIsoDate } from "@/types/director-dashboard";
import { formatAdminDate } from "./admin-dashboard-queries";
import type { OrganizationStatus } from "@/types/organization";

/**
 * SERVICE-16 — 서비스 오픈 준비 집계.
 *
 * ★ 읽기 전용이다.
 *   이 파일에는 insert / update / delete / upsert 가 한 줄도 없다.
 *
 * ★ 권한은 RLS 가 정한다.
 *   호출자는 requireAdmin() 을 통과한 관리자 세션 client 를 넘긴다.
 *   service_role · Secret Key · admin client 를 쓰지 않는다.
 *
 * ★ N+1 금지
 *   기관마다 질의하지 않는다. 표 하나당 한 번 읽고 메모리에서 기관별로 나눈다.
 *   카드마다 따로 질의하지도 않는다 — 한 번 읽은 배열을 재사용한다.
 *
 * ★ 개인정보를 읽지 않는다.
 *   원아 이름 · 관찰 원문 · 사진 경로 · 학부모 공유 토큰을 select 하지 않는다.
 *
 * ★ 학부모 공유는 세지 않는다.
 *   child_growth_report_shares 는 원장 전용 SELECT Policy 라 관리자에게 보이지 않는다.
 *   RLS 를 우회하지 않고, 화면에서 그 이유를 밝힌다.
 */

function logQueryFailure(scope: string, message: string) {
  console.error(`[admin/readiness] ${scope} query failed: ${message}`);
}

interface Row {
  organization_id: string;
}

interface OrgRow {
  id: string;
  name: string;
  status: OrganizationStatus;
}

interface ClassRow {
  id: string;
  organization_id: string;
}

interface MemberRow {
  organization_id: string;
  role: string;
}

interface SessionRow {
  organization_id: string;
  status: string;
}

interface Bounded<T> {
  rows: T[];
  ok: boolean;
  truncated: boolean;
}

async function fetchBounded<T>(
  scope: string,
  run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  limit: number,
): Promise<Bounded<T>> {
  const { data, error } = await run();

  if (error) {
    logQueryFailure(scope, error.message);
    return { rows: [], ok: false, truncated: false };
  }

  const rows = (data ?? []) as T[];

  return { rows, ok: true, truncated: rows.length >= limit };
}

function countBy(rows: { organization_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.organization_id, (counts.get(row.organization_id) ?? 0) + 1);
  }

  return counts;
}

/** 개수를 사실 문장으로 바꾼다. 0 이면 "없음" — 없다는 사실이지 잘못이 아니다. */
function item(
  key: string,
  label: string,
  count: number,
  unit: string,
): ReadinessItem {
  return {
    key,
    label,
    done: count > 0,
    detail: count > 0 ? `${count.toLocaleString("ko-KR")}${unit}` : "없음",
  };
}

/**
 * 오픈 준비 현황.
 *
 * 모든 기관(운영 중 + 일시 중지)을 보여 준다 — 운영 대시보드와 달리
 * 여기서는 "아직 준비가 끝나지 않은 기관"을 찾는 것이 목적이기 때문이다.
 */
export async function fetchServiceReadiness(
  supabase: SupabaseClient,
  today: string,
): Promise<ReadinessData> {
  const windowStart = shiftIsoDate(today, -(ADMIN_WINDOW_DAYS - 1));

  const [organizations, members, classes, children, assignments, sessions, reports] =
    await Promise.all([
      fetchBounded<OrgRow>(
        "organizations",
        () =>
          supabase
            .from("organizations")
            .select("id, name, status")
            .order("created_at", { ascending: false })
            .limit(MAX_ADMIN_ORGANIZATIONS),
        MAX_ADMIN_ORGANIZATIONS,
      ),
      fetchBounded<MemberRow>(
        "members",
        () =>
          supabase
            .from("organization_members")
            .select("organization_id, role")
            .eq("status", "active")
            .limit(MAX_ADMIN_MEMBERS),
        MAX_ADMIN_MEMBERS,
      ),
      fetchBounded<ClassRow>(
        "classes",
        () =>
          supabase
            .from("classes")
            .select("id, organization_id")
            .eq("status", "active")
            .limit(MAX_ADMIN_CLASSES),
        MAX_ADMIN_CLASSES,
      ),
      // ★ 이름을 읽지 않는다. 세는 데 필요한 것은 소속뿐이다.
      fetchBounded<Row>(
        "children",
        () =>
          supabase
            .from("children")
            .select("organization_id")
            .eq("status", "active")
            .limit(MAX_ADMIN_CHILDREN),
        MAX_ADMIN_CHILDREN,
      ),
      fetchBounded<Row & { class_id: string }>(
        "assignments",
        () =>
          supabase
            .from("class_program_assignments")
            .select("organization_id, class_id")
            .eq("status", "active")
            .limit(MAX_ADMIN_ASSIGNMENTS),
        MAX_ADMIN_ASSIGNMENTS,
      ),
      fetchBounded<SessionRow>(
        "sessions",
        () =>
          supabase
            .from("class_sessions")
            .select("organization_id, status")
            .gte("scheduled_date", windowStart)
            .lte("scheduled_date", today)
            .limit(MAX_ADMIN_SESSIONS),
        MAX_ADMIN_SESSIONS,
      ),
      fetchBounded<Row>(
        "reports",
        () =>
          supabase
            .from("child_growth_reports")
            .select("organization_id")
            .eq("status", "complete")
            .limit(MAX_ADMIN_CHILDREN),
        MAX_ADMIN_CHILDREN,
      ),
    ]);

  const reliable =
    organizations.ok &&
    !organizations.truncated &&
    members.ok &&
    !members.truncated &&
    classes.ok &&
    !classes.truncated &&
    children.ok &&
    !children.truncated &&
    assignments.ok &&
    !assignments.truncated &&
    sessions.ok &&
    !sessions.truncated &&
    reports.ok &&
    !reports.truncated;

  const directorCounts = countBy(members.rows.filter((r) => r.role === "director"));
  const teacherCounts = countBy(members.rows.filter((r) => r.role === "teacher"));
  const classCounts = countBy(classes.rows);
  const childCounts = countBy(children.rows);

  // ★ 운영 중인 반에 걸린 배정만 센다 (SERVICE-14 와 같은 기준).
  const activeClassIds = new Set(classes.rows.map((row) => row.id));
  const assignmentCounts = countBy(
    assignments.rows.filter((row) => activeClassIds.has(row.class_id)),
  );

  // 취소된 수업은 운영 건수에서 뺀다.
  const liveSessions = sessions.rows.filter((row) => row.status !== "cancelled");
  const sessionCounts = countBy(liveSessions);
  const reportCounts = countBy(reports.rows);

  const activeOrgIds = new Set(
    organizations.rows.filter((row) => row.status === "active").map((r) => r.id),
  );

  const inActiveOrg = (rows: { organization_id: string }[]) =>
    rows.filter((row) => activeOrgIds.has(row.organization_id)).length;

  const list: OrganizationReadiness[] = organizations.rows.map((org) => {
    const items: ReadinessItem[] = [
      item("director", "원장 계정", directorCounts.get(org.id) ?? 0, "명"),
      item("class", "운영 중인 반", classCounts.get(org.id) ?? 0, "개"),
      item("teacher", "교사 계정", teacherCounts.get(org.id) ?? 0, "명"),
      item("child", "재원 원아", childCounts.get(org.id) ?? 0, "명"),
      item("program", "프로그램 배정", assignmentCounts.get(org.id) ?? 0, "건"),
      item("session", `최근 ${ADMIN_WINDOW_DAYS}일 수업`, sessionCounts.get(org.id) ?? 0, "회"),
      item("report", "작성 완료 성장 리포트", reportCounts.get(org.id) ?? 0, "건"),
    ];

    return {
      id: org.id,
      name: org.name,
      status: org.status,
      items,
      doneCount: items.filter((i) => i.done).length,
      totalCount: items.length,
    };
  });

  return {
    today,
    todayLabel: formatAdminDate(today),
    windowDays: ADMIN_WINDOW_DAYS,

    totals: {
      activeOrganizations: organizations.ok ? activeOrgIds.size : null,
      activeClasses: reliable ? inActiveOrg(classes.rows) : null,
      activeChildren: reliable ? inActiveOrg(children.rows) : null,
      teacherMemberships: reliable
        ? inActiveOrg(members.rows.filter((r) => r.role === "teacher"))
        : null,
      recentSessions: reliable ? inActiveOrg(liveSessions) : null,
      completedReports: reliable ? inActiveOrg(reports.rows) : null,
      // ★ 언제나 null. 이유는 types/admin-readiness.ts 의 PARENT_SHARE_NOTE 참조.
      activeParentShares: null,
    },

    organizations: list,
    ok: organizations.ok,
    reliable,
  };
}
