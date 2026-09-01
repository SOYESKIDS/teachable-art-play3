import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChildStatus, ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_AI_DRAFT_LOOKUP,
  type ObservationAiDraft,
  type ObservationAiReviewStatus,
} from "@/types/staff-observation-ai";
import {
  MAX_OBSERVATION_MEDIA_LOOKUP,
  OBSERVATION_MEDIA_BUCKET,
  OBSERVATION_MEDIA_SIGNED_URL_TTL_SECONDS,
  type ObservationMediaItem,
} from "@/types/staff-observation-media";
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

interface ObservationAiDraftRow {
  id: string;
  observation_id: string;
  generated_text: string;
  reviewed_text: string | null;
  review_status: ObservationAiReviewStatus;
  source_observation_updated_at: string;
  updated_at: string;
  provider: string;
  model: string;
  prompt_version: string;
  generated_at: string;
  reviewed_at: string | null;
}

interface ObservationMediaRow {
  id: string;
  child_id: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  original_filename: string | null;
  caption: string | null;
  created_at: string;
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
    mediaResult,
    aiDraftResult,
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

    /**
     * SERVICE-09A — 이 수업의 활동사진 metadata를 한 번에 읽는다.
     *
     * ★ 원아별로 나눠 조회하지 않는다(N+1 금지).
     *   수업 단위로 1회 읽고 아래에서 child_id로 묶는다.
     *
     * ★ 관찰 텍스트와 join하지 않는다.
     *   사진은 observation_id가 아니라 (수업 · 원아)에 매달려 있어서,
     *   서술이 아직 없는 원아의 사진도 그대로 나온다.
     */
    supabase
      .from("class_session_observation_media")
      .select(
        "id, child_id, storage_path, mime_type, byte_size, original_filename, caption, created_at",
      )
      .eq("organization_id", organizationId)
      .eq("class_session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(MAX_OBSERVATION_MEDIA_LOOKUP),

    /**
     * SERVICE-10A — 이 수업의 AI 정리를 한 번에 읽는다.
     *
     * ★ 원아별로 나눠 조회하지 않는다(N+1 금지).
     *   수업 단위로 1회 읽고 아래에서 observation_id로 묶는다.
     *
     * ★ 조회 자체는 Teacher와 Director가 같은 구조를 쓴다.
     *   원장에게 무엇을 보여줄지는 화면이 정한다 — 원장 화면은
     *   검토 완료된 문장만 표시하고 AI 원문은 표시하지 않는다.
     */
    supabase
      .from("class_session_observation_ai_drafts")
      .select(
        "id, observation_id, generated_text, reviewed_text, review_status, source_observation_updated_at, updated_at, provider, model, prompt_version, generated_at, reviewed_at",
      )
      .eq("organization_id", organizationId)
      .eq("class_session_id", session.id)
      .limit(MAX_AI_DRAFT_LOOKUP),
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

  if (mediaResult.error) {
    logQueryFailure("observation media", mediaResult.error.message);
    return { ok: false, reason: "load_failed" };
  }

  if (aiDraftResult.error) {
    logQueryFailure("observation ai drafts", aiDraftResult.error.message);
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

  const mediaRows =
    (mediaResult.data ?? []) as unknown as ObservationMediaRow[];

  const aiDraftRows =
    (aiDraftResult.data ?? []) as unknown as ObservationAiDraftRow[];

  /**
   * SERVICE-10A — AI 정리를 observation_id 기준으로 묶는다.
   *
   * ★ isSourceStale 은 여기서 계산한다.
   *   생성 당시 저장한 source_observation_updated_at 과
   *   관찰기록의 현재 updated_at 을 문자열 그대로 비교한다.
   *   둘 다 PostgREST 가 만든 같은 형식이라 가공할 필요가 없고,
   *   가공하면 마이크로초가 잘려 비교가 어긋난다.
   */
  const aiDraftByObservationId = new Map<string, ObservationAiDraft>();

  const observationUpdatedAtById = new Map(
    observationRows.map((row) => [row.id, row.updated_at]),
  );

  for (const row of aiDraftRows) {
    const sourceNow =
      observationUpdatedAtById.get(row.observation_id) ?? null;

    aiDraftByObservationId.set(row.observation_id, {
      id: row.id,
      observationId: row.observation_id,
      generatedText: row.generated_text,
      reviewedText: row.reviewed_text,
      reviewStatus: row.review_status,
      sourceObservationUpdatedAt: row.source_observation_updated_at,
      // ★ DB 문자열 그대로. 검토 저장의 동시성 토큰이다.
      updatedAt: row.updated_at,
      provider: row.provider,
      model: row.model,
      promptVersion: row.prompt_version,
      generatedAt: row.generated_at,
      reviewedAt: row.reviewed_at,
      isSourceStale:
        sourceNow === null ||
        sourceNow !== row.source_observation_updated_at,
    });
  }

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

  /**
   * SERVICE-09A — signed URL 일괄 발급.
   *
   * ★ 사진 한 장마다 요청하지 않는다(N+1 금지).
   *   createSignedUrls()로 이 수업의 경로 전부를 한 번에 서명한다.
   *
   * ★ bucket이 private이므로 public URL 경로는 존재하지 않는다.
   *   여기서 만든 URL은 DB에 저장하지 않는다 — 영구 저장하는 것은 storage_path뿐이고,
   *   화면을 열 때마다 짧은 수명의 URL을 새로 발급한다.
   *
   * ★ 서명에 실패해도 화면 전체를 실패로 만들지 않는다.
   *   signedUrl이 null이면 그 자리에만 안내를 띄우고 나머지는 정상 표시한다.
   *   (서명은 Storage RLS를 통과해야 발급되므로, 권한이 없으면 여기서 비게 된다)
   */
  const signedUrlByPath = new Map<string, string>();

  if (mediaRows.length > 0) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(OBSERVATION_MEDIA_BUCKET)
      .createSignedUrls(
        mediaRows.map((row) => row.storage_path),
        OBSERVATION_MEDIA_SIGNED_URL_TTL_SECONDS,
      );

    if (signedError) {
      logQueryFailure("media signed urls", signedError.message);
    } else {
      for (const entry of signedData ?? []) {
        if (entry.error === null && entry.path && entry.signedUrl) {
          signedUrlByPath.set(entry.path, entry.signedUrl);
        }
      }
    }
  }

  /**
   * 사진을 원아별로 묶는다. 질의는 이미 created_at 오름차순이라
   * 각 원아 안에서도 올린 순서가 유지된다.
   */
  const mediaByChildId = new Map<string, ObservationMediaItem[]>();

  for (const row of mediaRows) {
    const item: ObservationMediaItem = {
      id: row.id,
      childId: row.child_id,
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      originalFilename: row.original_filename,
      caption: row.caption,
      createdAt: row.created_at,
      // ★ DB 값이 아니라 이번 요청에서만 유효한 임시 URL이다.
      signedUrl: signedUrlByPath.get(row.storage_path) ?? null,
    };

    const bucket = mediaByChildId.get(row.child_id);

    if (bucket) {
      bucket.push(item);
    } else {
      mediaByChildId.set(row.child_id, [item]);
    }
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
  /**
   * ★ 09A부터는 사진만 있는 원아도 여기에 포함된다.
   *   서술을 쓰기 전에 반을 옮긴 원아의 사진이 이름 없이 남지 않게 한다.
   */
  const historicalChildIds = [
    ...new Set(
      [
        ...observationRows.map((row) => row.child_id),
        ...mediaRows.map((row) => row.child_id),
      ].filter((childId) => !currentChildById.has(childId)),
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
   * UNION
   * 이 수업에 활동사진이 있는 원아 (09A)
   *
   * ★ 이름을 읽지 못한 원아(childName = null)도 목록에서 빼지 않는다.
   *   이미 존재하는 관찰기록을 화면에서 조용히 사라지게 하면
   *   교사가 그 기록의 존재 자체를 알 수 없다.
   */
  const rosterIds = [
    ...new Set([
      ...currentChildren.map((child) => child.id),
      ...observationRows.map((row) => row.child_id),
      // 서술은 없고 사진만 올린 원아도 명단에서 빠지지 않는다.
      ...mediaRows.map((row) => row.child_id),
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

        media: mediaByChildId.get(childId) ?? [],

        // AI 정리는 관찰기록에 매달린다. 관찰기록이 없으면 있을 수 없다.
        aiDraft: observation
          ? (aiDraftByObservationId.get(observation.id) ?? null)
          : null,
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
