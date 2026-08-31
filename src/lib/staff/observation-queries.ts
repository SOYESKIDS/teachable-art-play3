import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChildStatus, ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_OBSERVATION_ROSTER,
  type ObservationDomain,
  type ObservationRecordStatus,
  type StaffObservationChild,
  type StaffObservationLoadResult,
} from "@/types/staff-observation";

/**
 * SERVICE-08B — 교사 관찰기록 상세 조회.
 *
 * ★ 권한 범위는 RLS가 최종 결정한다.
 *   organizationId/sessionId를 URL에서 받더라도
 *   class_sessions SELECT가 허용되지 않으면 session 자체가 0건이다.
 *   Client가 organization_id / class_id를 만드는 구조가 아니다 —
 *   두 값은 아래에서 조회한 class_sessions 행에서만 나온다.
 *
 * ★ 관찰 명단 (07B 출결과 같은 기준)
 *
 *   A. 현재 session.class_id 소속 children
 *      UNION
 *   B. 이 session에 이미 관찰기록이 존재하는 children
 *
 *   B가 필요한 이유:
 *   원아가 수업 후 다른 반으로 이동해도 과거 관찰에서 이름이 사라지면 안 된다.
 *   20260831095000의 can_read_child_observation_history()가 바로 이 이름 조회를 허용한다.
 *
 * ★ N+1 금지
 *   session 1회 조회 후 metadata/children/observations/domains를 일괄 조회한다.
 *   관찰영역 연결(class_session_observation_domains)도 observation_id 목록으로 한 번만 읽는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 조회와 저장이 같은 상한을 쓴다 (types/staff-observation.ts) */
const LOOKUP_LIMIT = MAX_OBSERVATION_ROSTER;

/**
 * 관찰영역 연결 행 상한.
 *
 * 원아 한 명이 최대 MAX_DOMAIN_CODES(20)개를 고를 수 있고
 * 명단은 LOOKUP_LIMIT명까지이므로 그 곱이 이론적 최대다.
 */
const DOMAIN_LINK_LIMIT = LOOKUP_LIMIT * 20;

interface SessionRow {
  id: string;
  organization_id: string;
  class_id: string;
  program_id: string;
  lesson_id: string;
  scheduled_date: string | null;
  status: ClassSessionStatus;
}

interface ClassLookupRow {
  id: string;
  name: string;
  status: ClassStatus;
}

interface ProgramLookupRow {
  id: string;
  code: string;
  title: string;
}

interface LessonLookupRow {
  id: string;
  week_no: number;
  session_no: number;
  title: string;
}

interface ChildLookupRow {
  id: string;
  class_id: string | null;
  name: string;
  status: ChildStatus;
}

interface DomainLookupRow {
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ObservationLookupRow {
  id: string;
  child_id: string;
  child_voice: string | null;
  teacher_note: string | null;
  record_status: ObservationRecordStatus;
  /** timestamptz 원본 문자열 — 가공하지 않는다 */
  updated_at: string;
}

interface ObservationDomainLinkRow {
  observation_id: string;
  domain_code: string;
}

function logQueryFailure(scope: string, message: string) {
  console.error(`[staff/observation] ${scope} query failed: ${message}`);
}

/**
 * 교사가 관찰기록 화면을 열 때 필요한 데이터를 읽는다.
 *
 * 다른 기관/다른 반 sessionId를 넣어도 RLS 때문에 session 조회가 0건이므로
 * not_found로만 응답한다. 권한 존재 여부를 별도 정보로 노출하지 않는다.
 */
export async function fetchStaffObservations(
  supabase: SupabaseClient,
  organizationId: string,
  sessionId: string,
): Promise<StaffObservationLoadResult> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // 1. 수업 자체를 먼저 확인한다.
  // RLS가 교사가 볼 수 있는 session 범위를 결정한다.
  const { data: sessionData, error: sessionError } = await supabase
    .from("class_sessions")
    .select(
      "id, organization_id, class_id, program_id, lesson_id, scheduled_date, status",
    )
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (sessionError) {
    logQueryFailure("session", sessionError.message);
    return { ok: false, reason: "load_failed" };
  }

  if (!sessionData) {
    return { ok: false, reason: "not_found" };
  }

  const session = sessionData as unknown as SessionRow;

  // 2. 수업 context + 현재 반 원아 + 관찰영역 + 기존 관찰기록을 고정 횟수로 조회한다.
  const [
    classResult,
    programResult,
    lessonResult,
    currentChildrenResult,
    domainResult,
    observationResult,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, status")
      .eq("id", session.class_id)
      .maybeSingle(),

    supabase
      .from("curriculum_programs")
      .select("id, code, title")
      .eq("id", session.program_id)
      .maybeSingle(),

    supabase
      .from("curriculum_lessons")
      .select("id, week_no, session_no, title")
      .eq("id", session.lesson_id)
      .maybeSingle(),

    supabase
      .from("children")
      .select("id, class_id, name, status")
      .eq("organization_id", organizationId)
      .eq("class_id", session.class_id)
      .order("name", { ascending: true })
      .limit(LOOKUP_LIMIT),

    /**
     * ★ is_active 필터를 걸지 않는다.
     *   은퇴한 영역이 과거 기록에 연결되어 있을 수 있고,
     *   그 label을 읽지 못하면 화면에 "알 수 없는 영역"이 뜬다.
     *   "지금 고를 수 있는 영역"을 거르는 것은 화면의 몫이다
     *   (20260831093000 SELECT Policy가 같은 이유로 is_active를 요구하지 않는다).
     */
    supabase
      .from("observation_domains")
      .select("code, label, description, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true }),

    supabase
      .from("class_session_observations")
      .select(
        "id, child_id, child_voice, teacher_note, record_status, updated_at",
      )
      .eq("organization_id", organizationId)
      .eq("class_session_id", session.id)
      .limit(LOOKUP_LIMIT),
  ]);

  if (classResult.error) {
    logQueryFailure("class", classResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (programResult.error) {
    logQueryFailure("program", programResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (lessonResult.error) {
    logQueryFailure("lesson", lessonResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (currentChildrenResult.error) {
    logQueryFailure("current children", currentChildrenResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (domainResult.error) {
    logQueryFailure("observation domains", domainResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (observationResult.error) {
    logQueryFailure("observations", observationResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  const classRow =
    (classResult.data as unknown as ClassLookupRow | null) ?? null;

  const programRow =
    (programResult.data as unknown as ProgramLookupRow | null) ?? null;

  const lessonRow =
    (lessonResult.data as unknown as LessonLookupRow | null) ?? null;

  const currentChildren =
    (currentChildrenResult.data ?? []) as unknown as ChildLookupRow[];

  const domainRows =
    (domainResult.data ?? []) as unknown as DomainLookupRow[];

  const observationRows =
    (observationResult.data ?? []) as unknown as ObservationLookupRow[];

  const domains: ObservationDomain[] = domainRows.map((row) => ({
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  const domainOrderByCode = new Map(
    domains.map((domain) => [domain.code, domain.sortOrder]),
  );

  // 3. 관찰영역 연결을 observation_id 목록 기준으로 한 번에 읽는다 (원아별 N+1 금지).
  const observationIds = observationRows.map((row) => row.id);

  let domainLinks: ObservationDomainLinkRow[] = [];

  if (observationIds.length > 0) {
    const { data, error } = await supabase
      .from("class_session_observation_domains")
      .select("observation_id, domain_code")
      .in("observation_id", observationIds)
      .limit(DOMAIN_LINK_LIMIT);

    if (error) {
      logQueryFailure("observation domain links", error.message);
      return { ok: false, reason: "load_failed" };
    }

    domainLinks = (data ?? []) as unknown as ObservationDomainLinkRow[];
  }

  const codesByObservationId = new Map<string, string[]>();

  for (const link of domainLinks) {
    const bucket = codesByObservationId.get(link.observation_id);

    if (bucket) {
      bucket.push(link.domain_code);
    } else {
      codesByObservationId.set(link.observation_id, [link.domain_code]);
    }
  }

  /**
   * 화면 표시 순서를 관찰영역 정렬 순서로 맞춘다.
   * 목록에 없는 code(이론상 FK로 불가능하지만 방어)는 뒤로 보낸다.
   */
  for (const codes of codesByObservationId.values()) {
    codes.sort((a, b) => {
      const orderA = domainOrderByCode.get(a) ?? Number.MAX_SAFE_INTEGER;
      const orderB = domainOrderByCode.get(b) ?? Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) return orderA - orderB;

      return a.localeCompare(b);
    });
  }

  const currentChildById = new Map(
    currentChildren.map((child) => [child.id, child]),
  );

  /**
   * 기존 관찰기록에 있지만 현재 session 반 명단에는 없는 원아.
   *
   * 대표적인 경우:
   *   수업 당시 햇살반
   *   → 관찰기록 작성
   *   → 이후 달빛반으로 이동
   *
   * 08A-3의 can_read_child_observation_history()가 이 이름 조회를 허용한다.
   * 출결이 한 건도 없고 관찰만 있는 원아도 이 경로로 이름이 보인다
   * (20260831095000이 해결한 문제가 정확히 이것이다).
   */
  const historicalChildIds = [
    ...new Set(
      observationRows
        .map((row) => row.child_id)
        .filter((childId) => !currentChildById.has(childId)),
    ),
  ];

  let historicalChildren: ChildLookupRow[] = [];

  if (historicalChildIds.length > 0) {
    const { data, error } = await supabase
      .from("children")
      .select("id, class_id, name, status")
      .eq("organization_id", organizationId)
      .in("id", historicalChildIds)
      .limit(LOOKUP_LIMIT);

    if (error) {
      logQueryFailure("historical children", error.message);
      return { ok: false, reason: "load_failed" };
    }

    historicalChildren = (data ?? []) as unknown as ChildLookupRow[];
  }

  const childById = new Map<string, ChildLookupRow>();

  for (const child of currentChildren) {
    childById.set(child.id, child);
  }

  for (const child of historicalChildren) {
    childById.set(child.id, child);
  }

  const observationByChildId = new Map(
    observationRows.map((row) => [row.child_id, row]),
  );

  /**
   * 화면 roster:
   *
   * 현재 반 원아
   * UNION
   * 기존 관찰기록 원아
   *
   * ★ 이름을 읽지 못한 원아(childName = null)도 목록에서 빼지 않는다.
   *   이미 존재하는 관찰기록을 화면에서 조용히 사라지게 하면
   *   교사가 그 기록의 존재 자체를 알 수 없다.
   */
  const rosterIds = [
    ...new Set([
      ...currentChildren.map((child) => child.id),
      ...observationRows.map((row) => row.child_id),
    ]),
  ];

  const children: StaffObservationChild[] = rosterIds
    .map((childId) => {
      const child = childById.get(childId) ?? null;
      const observation = observationByChildId.get(childId) ?? null;

      return {
        childId,
        childName: child?.name ?? null,
        childStatus: child?.status ?? null,
        currentClassId: child?.class_id ?? null,

        observationId: observation?.id ?? null,
        childVoice: observation?.child_voice ?? null,
        teacherNote: observation?.teacher_note ?? null,
        recordStatus: observation?.record_status ?? null,
        // ★ DB 문자열 그대로. 다음 단계의 p_expected_updated_at 원본이다.
        updatedAt: observation?.updated_at ?? null,
        domainCodes: observation
          ? (codesByObservationId.get(observation.id) ?? [])
          : [],

        hasExistingObservation: observation !== null,
        isCurrentClassMember: child?.class_id === session.class_id,
      };
    })
    .sort((a, b) => {
      const nameA = a.childName ?? "￿";
      const nameB = b.childName ?? "￿";

      const byName = nameA.localeCompare(nameB, "ko");
      if (byName !== 0) return byName;

      return a.childId.localeCompare(b.childId);
    });

  return {
    ok: true,
    data: {
      session: {
        id: session.id,
        organizationId: session.organization_id,
        classId: session.class_id,

        className: classRow?.name ?? null,
        classStatus: classRow?.status ?? null,

        scheduledDate: session.scheduled_date,
        status: session.status,

        programTitle: programRow?.title ?? null,
        programCode: programRow?.code ?? null,

        weekNo: lessonRow?.week_no ?? null,
        sessionNo: lessonRow?.session_no ?? null,
        lessonTitle: lessonRow?.title ?? null,
      },

      domains,
      children,
    },
  };
}
