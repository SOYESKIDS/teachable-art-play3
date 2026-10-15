import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContentAudience } from "./content-state";
import { isVisibleTo, hiddenReason } from "./content-state";
import { weekSummary } from "./week-index";
import { EMPTY_BLOCKS } from "./week-types";
import type {
  TranscriptionNote,
  WeekBlocks,
  WeekContent,
  WeekScene,
} from "./week-types";
import type { WeekContentResult } from "./week-source";

/**
 * 주차 콘텐츠를 **데이터베이스에서** 읽는다.
 *
 * ── 조용한 대체를 하지 않는다 ───────────────────────────────────
 *
 * 조회가 실패했을 때 저장소 fixture 로 넘어가면, 화면은 정상으로 보이고
 * 아무도 DB 가 비어 있다는 것을 모른다. 그 상태로 발행하면 교사는 DB 에
 * 없는 내용을 보게 된다.
 *
 * ★ 그래서 이 모듈은 실패를 **값으로 돌려준다.** 부르는 쪽이 fixture 로
 *   넘어갈지 오류를 띄울지 정한다 — 이 모듈이 대신 정하지 않는다.
 * ★ `ok: false` 를 성공처럼 처리하면 타입이 막는다 (판별 공용체).
 *
 * ── 콘텐츠 식별 ─────────────────────────────────────────────────
 *
 * 주차 번호만으로 찾지 않는다. **프로그램 id + 주차 + 차시 번호**로 찾는다.
 * 같은 1~8주를 담은 프로그램이 여럿일 수 있기 때문이다 (버전).
 */

export type WeekDbFailure =
  | "program_not_found"
  | "lesson_not_found"
  | "query_failed"
  | "section_decode_failed";

/**
 * 이 콘텐츠가 **어느 교안 버전의 어느 차시인가.**
 *
 * ★ 교사 화면·인쇄물·교실 화면이 같은 버전을 쓰는지 확인하려면 각 경로가
 *   무엇을 읽었는지 말할 수 있어야 한다. 「24주차」만으로는 같은지 다른지
 *   알 수 없다 — 같은 주차를 담은 프로그램이 여럿일 수 있다.
 */
export interface WeekVersionRef {
  programId: string;
  programCode: string;
  lessonId: string;
  weekNo: number;
  sessionNo: number;
}

export type WeekDbResult =
  | { ok: true; result: WeekContentResult; version: WeekVersionRef }
  | { ok: false; reason: WeekDbFailure; detail: string };

/** 블록 키 ↔ 섹션 코드는 주차마다 다르다 (8·9번이 뒤바뀐다) → body_json 이 스스로 밝힌다 */
export interface SectionRow {
  section_code: string;
  body: string;
  body_json: unknown;
  source_ref: string | null;
}

interface SceneRow {
  scene_no: number;
  scene_type: string;
  kid_text: string;
  stage_label: string | null;
  teacher_note: string | null;
  source_ref: string;
  base_seconds: number | null;
}

interface NoteRow {
  section_label: string;
  page_no: number;
  issue: string;
  category: string;
  status: string;
  evidence: string | null;
}

const BLOCK_KEYS = new Set<keyof WeekBlocks>([
  "beforeStart",
  "atAGlance",
  "objectives",
  "preparation",
  "timetable",
  "lessonSteps",
  "coreActivity",
  "workbook",
  "art",
  "mediaOrWatch",
  "closing",
  "observationGuide",
  "homeConnection",
  "situations",
  "quickGuide",
]);

/**
 * body_json → 블록.
 *
 * ★ 모양이 아니면 **빈 블록으로 넘어가지 않고 실패를 돌려준다.** 비어 있는
 *   화면과 「원문에 없다」는 다른 뜻인데, 디코딩 실패를 null 로 두면 둘이
 *   섞인다.
 * ★ 4번(준비물)은 A·B·C 세 행으로 나뉘어 저장된다. part 를 보고 합친다.
 */
export function decodeSections(rows: SectionRow[]): { ok: true; blocks: WeekBlocks } | { ok: false; detail: string } {
  if (rows.length === 0) {
    return { ok: false, detail: "본문 섹션을 읽지 못했습니다. 적재 상태와 열람 권한을 확인해 주세요." };
  }
  const blocks: WeekBlocks = { ...EMPTY_BLOCKS };
  const preparationParts: Record<string, unknown> = {};

  for (const row of rows) {
    const raw = row.body_json;
    // body_json 이 없으면 구조가 없는 옛 적재본이다. 평문만으로는 블록을 만들 수
    // 없다 — 모양을 지어내지 않고 실패로 알린다.
    if (raw === null || raw === undefined) {
      return {
        ok: false,
        detail: `${row.section_code}: body_json 이 없다 (구조 없는 적재본). 다시 적재해야 한다.`,
      };
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, detail: `${row.section_code}: body_json 이 객체가 아니다` };
    }

    const envelope = raw as { blockKey?: unknown; part?: unknown; value?: unknown };
    const key = envelope.blockKey;
    if (typeof key !== "string" || !BLOCK_KEYS.has(key as keyof WeekBlocks)) {
      return { ok: false, detail: `${row.section_code}: 알 수 없는 blockKey (${String(key)})` };
    }
    if (!("value" in envelope)) {
      return { ok: false, detail: `${row.section_code}: value 가 없다` };
    }

    if (key === "preparation") {
      const part = envelope.part;
      if (typeof part !== "string") {
        return { ok: false, detail: `${row.section_code}: preparation 인데 part 가 없다` };
      }
      preparationParts[part] = envelope.value;
      // C항 제목은 안전 조각에 함께 실려 온다.
      const label = (envelope as { safetyLabel?: unknown }).safetyLabel;
      if (typeof label === "string") preparationParts.safetyLabel = label;
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 적재본이 들고 온 모양을 그대로 싣는다. 위에서 키를 검사했다.
    (blocks as any)[key] = envelope.value;
  }

  // 4번 세 조각을 합친다. 하나라도 빠지면 「안전 안내가 사라진 준비물」이 된다.
  const partKeys = Object.keys(preparationParts);
  if (partKeys.length > 0) {
    for (const need of ["materials", "spaceSetup", "safety"]) {
      if (!(need in preparationParts)) {
        return { ok: false, detail: `4. 수업 전 준비의 ${need} 조각이 없다 (s4a·s4b·s4c)` };
      }
    }
    // ★ C항 제목이 없으면 기본값으로 때우지 않는다. 16주차는 「안전·개인정보
    //   확인」인데 「안전 확인」으로 떨어지면 원문과 다른 제목이 나간다.
    if (typeof preparationParts.safetyLabel !== "string") {
      return { ok: false, detail: "4. 수업 전 준비의 C항 제목(safetyLabel)이 없다" };
    }
    blocks.preparation = {
      materials: preparationParts.materials as NonNullable<WeekBlocks["preparation"]>["materials"],
      spaceSetup: preparationParts.spaceSetup as string[],
      safety: preparationParts.safety as string[],
      safetyLabel: preparationParts.safetyLabel,
    };
  }

  return { ok: true, blocks };
}

function decodeScenes(rows: SceneRow[]): WeekScene[] {
  return rows.map((r) => ({
    sceneNo: r.scene_no,
    sceneType: r.scene_type as WeekScene["sceneType"],
    kidText: r.kid_text,
    stageLabel: r.stage_label,
    teacherNote: r.teacher_note,
    sourceRef: r.source_ref,
    baseSeconds: r.base_seconds,
  }));
}

function decodeNotes(rows: NoteRow[]): TranscriptionNote[] {
  return rows.map((r) => ({
    section: r.section_label,
    page: r.page_no,
    issue: r.issue,
    category: r.category as TranscriptionNote["category"],
    status: r.status as TranscriptionNote["status"],
    evidence: r.evidence,
  }));
}

export interface WeekDbQuery {
  /** 어느 교안 버전인가. 주차 번호만으로 찾지 않는다. */
  programId: string;
  weekNo: number;
  /** 한 주에 2회 수업하는 운영이 있어 차시 번호를 따로 받는다 */
  sessionNo?: number;
  audience?: ContentAudience;
}

export async function getWeekContentFromDb(
  client: SupabaseClient,
  query: WeekDbQuery,
): Promise<WeekDbResult> {
  const { programId, weekNo, sessionNo = 1, audience = "service" } = query;

  const summary = weekSummary(weekNo);
  if (!summary) {
    return { ok: false, reason: "lesson_not_found", detail: `${weekNo}주차는 24주 지도에 없다` };
  }

  const lessonQuery = await client
    .from("curriculum_lessons")
    .select("id, status, title, curriculum_programs!inner(id, code, status)")
    .eq("program_id", programId)
    .eq("week_no", weekNo)
    .eq("session_no", sessionNo)
    .maybeSingle();

  if (lessonQuery.error) {
    return { ok: false, reason: "query_failed", detail: lessonQuery.error.message };
  }
  if (!lessonQuery.data) {
    return {
      ok: false,
      reason: "lesson_not_found",
      // RLS also hides unpublished lessons. Zero rows do not prove missing data.
      detail: `${weekNo}주차 수업이 아직 발행되지 않았거나 현재 기관에서 열람할 수 없습니다. 기관 관리자에게 발행·프로그램 연결 상태를 확인해 주세요.`,
    };
  }

  const lessonId = lessonQuery.data.id as string;
  const lessonStatus = lessonQuery.data.status as string;
  const programRow = lessonQuery.data.curriculum_programs as
    | { id: string; code: string }
    | { id: string; code: string }[]
    | null;
  const programMeta = Array.isArray(programRow) ? programRow[0] : programRow;
  if (!programMeta) {
    return {
      ok: false,
      reason: "program_not_found",
      detail: `차시 ${lessonId} 의 프로그램을 읽지 못했다`,
    };
  }

  // ★ 발행 여부는 **DB 가 들고 있는 값**이다. 저장소 지도(WEEK_INDEX)의
  //   publication 을 믿지 않는다 — 그것은 전사 작업용 표시다.
  const publication = lessonStatus === "published" ? "published" : "draft";
  const dbStatus = { ...summary.status, publication } as typeof summary.status;
  const visible = isVisibleTo(dbStatus, audience);

  // Draft service requests must not fetch protected content and then discard it.
  // Review requests continue below and validate the actual stored sections.
  if (!visible) {
    return {
      ok: true,
      result: {
        origin: "database", bodyVisible: false, hidden: hiddenReason(dbStatus),
        content: {
          summary: { ...summary, status: dbStatus }, blocks: EMPTY_BLOCKS,
          scenes: [], sourceFile: null, transcriptionNotes: [],
        },
      },
      version: { programId: programMeta.id, programCode: programMeta.code, lessonId, weekNo, sessionNo },
    };
  }

  const [sectionsQuery, scenesQuery, sourceQuery] = await Promise.all([
    client
      .from("lesson_sections")
      .select("section_code, body, body_json, source_ref")
      .eq("lesson_id", lessonId)
      .order("section_code", { ascending: true }),
    client
      .from("lesson_scenes")
      .select("scene_no, scene_type, kid_text, stage_label, teacher_note, source_ref, base_seconds")
      .eq("lesson_id", lessonId)
      .order("scene_no", { ascending: true }),
    client
      .from("lesson_source_documents")
      .select("file_name")
      .eq("lesson_id", lessonId)
      .limit(1),
  ]);

  if (sectionsQuery.error) {
    return { ok: false, reason: "query_failed", detail: sectionsQuery.error.message };
  }
  if (scenesQuery.error) {
    return { ok: false, reason: "query_failed", detail: scenesQuery.error.message };
  }
  // ★ 원문 출처는 본사 전용이다. 기관 경로에서는 RLS 가 0행을 돌려준다 —
  //   그것은 오류가 아니다. error 만 실패로 본다.
  if (sourceQuery.error) {
    return { ok: false, reason: "query_failed", detail: sourceQuery.error.message };
  }

  const decoded = decodeSections((sectionsQuery.data ?? []) as SectionRow[]);
  if (!decoded.ok) {
    return { ok: false, reason: "section_decode_failed", detail: decoded.detail };
  }

  // 검수 기록은 본사 경로에서만 읽는다. 기관 경로는 조회조차 하지 않는다 —
  // RLS 에 더해 앱에서도 막는다 (이중 방어).
  let notes: TranscriptionNote[] = [];
  if (audience === "internal_review") {
    const notesQuery = await client
      .from("lesson_review_notes")
      .select("section_label, page_no, issue, category, status, evidence")
      .eq("lesson_id", lessonId)
      .order("page_no", { ascending: true });
    if (notesQuery.error) {
      return { ok: false, reason: "query_failed", detail: notesQuery.error.message };
    }
    notes = decodeNotes((notesQuery.data ?? []) as NoteRow[]);
  }

  const content: WeekContent = {
    summary: { ...summary, status: dbStatus },
    blocks: visible ? decoded.blocks : EMPTY_BLOCKS,
    scenes: visible ? decodeScenes((scenesQuery.data ?? []) as SceneRow[]) : [],
    sourceFile: (sourceQuery.data?.[0]?.file_name as string | undefined) ?? null,
    transcriptionNotes: notes,
  };

  return {
    ok: true,
    result: {
      origin: "database",
      bodyVisible: visible,
      hidden: visible ? null : hiddenReason(dbStatus),
      content,
    },
    version: {
      programId: programMeta.id,
      programCode: programMeta.code,
      lessonId,
      weekNo,
      sessionNo,
    },
  };
}


/**
 * 프로그램 코드로 교안 버전을 찾는다 — **본사 검수 경로용.**
 *
 * ★ 본사 검수는 계약을 거치지 않는다. 그래서 어떤 프로그램을 보는지
 *   화면이 **명시**해야 한다. 「아무 프로그램이나 첫 번째」로 고르면
 *   검수자는 자기가 무엇을 승인했는지 모르게 된다.
 */
export async function resolveProgramByCode(
  client: SupabaseClient,
  code: string,
): Promise<{ ok: true; programId: string } | { ok: false; reason: WeekDbFailure; detail: string }> {
  const query = await client
    .from("curriculum_programs")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (query.error) {
    return { ok: false, reason: "query_failed", detail: query.error.message };
  }
  if (!query.data) {
    return {
      ok: false,
      reason: "program_not_found",
      detail: `교안 프로그램 ${code} 가 데이터베이스에 없습니다. 적재가 끝나지 않았습니다.`,
    };
  }
  return { ok: true, programId: query.data.id as string };
}


export interface ProgramWeekRow {
  weekNo: number;
  sessionNo: number;
  version: WeekVersionRef;
  result: WeekContentResult;
}

/**
 * 한 프로그램의 **모든 주차**를 한 번에 읽는다 (본사 24주 목록용).
 *
 * ★ 주차마다 따로 조회하면 24번 × 네 질의가 된다. 목록 하나에 백 번 가까이
 *   왕복하면 화면이 느려지고, 느린 화면은 사람이 건너뛴다.
 *   그래서 네 질의로 끝내고 묶는 일은 여기서 한다.
 * ★ 실패는 숨기지 않는다. 디코드가 깨진 주차는 그 주차만 이유와 함께 돌려준다.
 */
export async function getProgramWeeksFromDb(
  client: SupabaseClient,
  programId: string,
  audience: ContentAudience = "internal_review",
): Promise<
  | { ok: true; weeks: ProgramWeekRow[]; broken: { weekNo: number; detail: string }[] }
  | { ok: false; reason: WeekDbFailure; detail: string }
> {
  const lessonsQuery = await client
    .from("curriculum_lessons")
    .select("id, week_no, session_no, status, curriculum_programs!inner(id, code)")
    .eq("program_id", programId)
    .order("week_no", { ascending: true });

  if (lessonsQuery.error) {
    return { ok: false, reason: "query_failed", detail: lessonsQuery.error.message };
  }
  const lessons = lessonsQuery.data ?? [];
  if (lessons.length === 0) {
    return { ok: false, reason: "lesson_not_found", detail: `프로그램 ${programId} 에 차시가 없다` };
  }

  const lessonIds = lessons.map((l) => l.id as string);

  const [sectionsQuery, scenesQuery, sourcesQuery, notesQuery] = await Promise.all([
    client
      .from("lesson_sections")
      .select("lesson_id, section_code, body, body_json, source_ref")
      .in("lesson_id", lessonIds)
      .order("section_code", { ascending: true }),
    client
      .from("lesson_scenes")
      .select("lesson_id, scene_no, scene_type, kid_text, stage_label, teacher_note, source_ref, base_seconds")
      .in("lesson_id", lessonIds)
      .order("scene_no", { ascending: true }),
    client.from("lesson_source_documents").select("lesson_id, file_name").in("lesson_id", lessonIds),
    // 검수 기록은 본사 경로에서만 읽는다. 기관 경로는 조회조차 하지 않는다.
    audience === "internal_review"
      ? client
          .from("lesson_review_notes")
          .select("lesson_id, section_label, page_no, issue, category, status, evidence")
          .in("lesson_id", lessonIds)
          .order("page_no", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const q of [sectionsQuery, scenesQuery, sourcesQuery, notesQuery]) {
    if (q.error) return { ok: false, reason: "query_failed", detail: q.error.message };
  }

  const groupBy = <T extends { lesson_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const r of rows ?? []) {
      const list = map.get(r.lesson_id);
      if (list) list.push(r);
      else map.set(r.lesson_id, [r]);
    }
    return map;
  };

  const sectionsByLesson = groupBy(sectionsQuery.data as (SectionRow & { lesson_id: string })[] | null);
  const scenesByLesson = groupBy(scenesQuery.data as (SceneRow & { lesson_id: string })[] | null);
  const sourcesByLesson = groupBy(sourcesQuery.data as { lesson_id: string; file_name: string }[] | null);
  const notesByLesson = groupBy(notesQuery.data as (NoteRow & { lesson_id: string })[] | null);

  const weeks: ProgramWeekRow[] = [];
  const broken: { weekNo: number; detail: string }[] = [];

  for (const lesson of lessons) {
    const lessonId = lesson.id as string;
    const weekNo = lesson.week_no as number;
    const sessionNo = lesson.session_no as number;
    const summary = weekSummary(weekNo);
    if (!summary) {
      broken.push({ weekNo, detail: `${weekNo}주차는 24주 지도에 없다` });
      continue;
    }

    const decoded = decodeSections(sectionsByLesson.get(lessonId) ?? []);
    if (!decoded.ok) {
      broken.push({ weekNo, detail: decoded.detail });
      continue;
    }

    const publication = (lesson.status as string) === "published" ? "published" : "draft";
    const dbStatus = { ...summary.status, publication } as typeof summary.status;
    const visible = isVisibleTo(dbStatus, audience);
    const programRow = lesson.curriculum_programs as
      | { id: string; code: string }
      | { id: string; code: string }[]
      | null;
    const programMeta = Array.isArray(programRow) ? programRow[0] : programRow;
    if (!programMeta) {
      broken.push({ weekNo, detail: "프로그램 메타를 읽지 못했다" });
      continue;
    }

    weeks.push({
      weekNo,
      sessionNo,
      version: { programId: programMeta.id, programCode: programMeta.code, lessonId, weekNo, sessionNo },
      result: {
        origin: "database",
        bodyVisible: visible,
        hidden: visible ? null : hiddenReason(dbStatus),
        content: {
          summary: { ...summary, status: dbStatus },
          blocks: visible ? decoded.blocks : EMPTY_BLOCKS,
          scenes: visible ? decodeScenes(scenesByLesson.get(lessonId) ?? []) : [],
          sourceFile: sourcesByLesson.get(lessonId)?.[0]?.file_name ?? null,
          transcriptionNotes: decodeNotes(notesByLesson.get(lessonId) ?? []),
        },
      },
    });
  }

  return { ok: true, weeks, broken };
}

/**
 * 계약이 쓰는 교안 프로그램을 찾는다.
 *
 * ★ 주차 번호로 찾지 않는다. 상품 버전 → 프로그램 연결을 읽는다.
 *   연결이 없으면 **없다고 말한다** — 아무 프로그램이나 고르지 않는다.
 */
export async function resolveProgramForProductVersion(
  client: SupabaseClient,
  productVersionId: string,
): Promise<{ ok: true; programId: string } | { ok: false; reason: WeekDbFailure; detail: string }> {
  const query = await client
    .from("product_version_programs")
    .select("program_id")
    .eq("product_version_id", productVersionId)
    .maybeSingle();

  if (query.error) {
    return { ok: false, reason: "query_failed", detail: query.error.message };
  }
  if (!query.data) {
    return {
      ok: false,
      reason: "program_not_found",
      detail: `상품 버전 ${productVersionId} 에 연결된 교안 프로그램이 없습니다. 연결을 먼저 지정해야 합니다.`,
    };
  }
  return { ok: true, programId: query.data.program_id as string };
}
