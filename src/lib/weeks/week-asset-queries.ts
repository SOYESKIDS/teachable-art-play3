import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonAssetType } from "@/lib/curriculum/lesson-asset-queries";
import type { WeekContent } from "./week-types";

/**
 * 주차별 자료 등록 현황 — B단계 (본사 검수 화면).
 *
 * ── 두 가지를 따로 센다 ──────────────────────────────────────────
 *
 * ★ **원문에 적혀 있나** — 공식 가이드가 그 자료를 쓰라고 했는가.
 *   전사된 원문 문구를 그대로 찾아 근거로 함께 돌려준다. 키워드로 찾은
 *   것이므로 사람이 문구를 보고 판단할 수 있어야 한다.
 *
 * ★ **파일이 등록됐나** — `lesson_assets` 에 행이 있고 받을 곳이 있는가.
 *   등록 건수 · 파일 있는 건수 · 발행된 건수 · 권리 확인된 건수를 따로 센다.
 *   행이 있다고 쓸 수 있는 것이 아니다 (SOURCE EXISTS ≠ READY).
 *
 * 둘은 독립이다. 「원문에 있는데 파일 없음」이 바로 누락 자료이고, 이 화면이
 * 찾아야 하는 것이다.
 *
 * ── 주차와 차시를 잇는 길 ────────────────────────────────────────
 *
 * `lesson_assets` 는 `curriculum_lessons.id` 에 달려 있고, 그 표에 `week_no`
 * 가 있다. 그래서 주차 → 차시 → 자산으로 잇는다.
 *
 * ★ 차시가 없는 주차는 `lessonLinked: false` 다. 이때 **등록 0건이라고
 *   적지 않는다.** 「연결된 차시가 없어 셀 수 없음」과 「차시는 있는데 자산이
 *   0건」은 다른 상태다.
 *
 * ★ 한 주차에 여러 프로그램(8·16·24주)의 차시가 걸릴 수 있다. 합치지 않고
 *   프로그램별로 적는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(scope: string, code: string | undefined) {
  console.error(`[weeks/asset-status] ${scope} failed:`, { code: code ?? null });
}

/* ══════════════════════════════════════════ 원문 근거 */

/**
 * 본사가 주차마다 확인하는 자료 다섯 종.
 *
 * ★ `lesson_assets.asset_type` 중 실제로 쓰는 값만 골랐다. 새 종류를 여기서
 *   만들지 않는다.
 */
export const REVIEWED_ASSET_TYPES = [
  "teacher_guide",
  "ebook",
  "audio",
  "music_video",
  "workbook",
] as const satisfies readonly LessonAssetType[];

export type ReviewedAssetType = (typeof REVIEWED_ASSET_TYPES)[number];

export const REVIEWED_ASSET_LABEL: Record<ReviewedAssetType, string> = {
  teacher_guide: "교안",
  ebook: "그림책",
  audio: "음원",
  music_video: "영상",
  workbook: "워크북",
};

/**
 * 원문에서 그 자료를 가리키는 표기.
 *
 * ★ 원문 표기를 그대로 적었다. 「E-BOOK」처럼 원문이 쓰는 형태를 포함한다.
 */
const GUIDE_KEYWORDS: Record<ReviewedAssetType, string[]> = {
  teacher_guide: ["교사용 수업가이드", "교사용 가이드", "퀵 가이드"],
  ebook: ["E-BOOK", "EBOOK", "그림책", "동화"],
  audio: ["음원", "노래", "곡"],
  music_video: ["뮤직비디오", "영상", "MV"],
  workbook: ["워크북", "활동지"],
};

export interface GuideMention {
  /** 원문에서 찾은 문구 그대로 */
  quote: string;
  /** 어느 섹션에서 찾았나 */
  section: string;
}

/**
 * 전사된 원문에서 그 자료를 언급한 문구를 찾는다.
 *
 * ★ 전사되지 않은 주차는 찾을 원문이 없다. 그때 「언급 없음」이 아니라
 *   「확인 불가」다 — 호출하는 쪽이 전사 상태를 보고 구분한다.
 */
export function findGuideMentions(
  content: WeekContent,
  assetType: ReviewedAssetType,
): GuideMention[] {
  const keywords = GUIDE_KEYWORDS[assetType];
  const found: GuideMention[] = [];

  const scan = (text: string | null | undefined, section: string) => {
    if (!text) return;
    if (!keywords.some((k) => text.toUpperCase().includes(k.toUpperCase()))) return;
    found.push({ quote: text, section });
  };

  const blocks = content.blocks;

  // 2. 수업 한눈에 보기 — 연계 콘텐츠가 자료 목록이다.
  for (const item of blocks.atAGlance?.linkedContents ?? []) {
    scan(item, "2. 수업 한눈에 보기 · 연계 콘텐츠");
  }
  scan(blocks.atAGlance?.storybook, "2. 수업 한눈에 보기 · 그림책");

  // 4. 수업 전 준비 — 준비물에 자료가 적힌다.
  for (const row of blocks.preparation?.materials ?? []) {
    scan(`${row.group} · ${row.item}`, "4. 수업 전 준비 · 준비물");
  }

  // 10. 음원·뮤직비디오 활용
  if (blocks.mediaOrWatch?.kind === "media") {
    for (const item of blocks.mediaOrWatch.items) {
      scan(`${item.name} — ${item.how}`, "10. 음원 · 뮤직비디오 활용");
    }
  }

  // 워크북 섹션 자체가 있으면 워크북을 쓰는 주차다.
  if (assetType === "workbook" && blocks.workbook) {
    found.push({
      quote: blocks.workbook.title ?? "워크북 섹션",
      section: "워크북 섹션",
    });
  }

  // 교안은 원문 파일 자체가 근거다.
  if (assetType === "teacher_guide" && content.sourceFile) {
    found.push({ quote: content.sourceFile, section: "원문 파일" });
  }

  return found;
}

/* ══════════════════════════════════════════ 등록 현황 */

export interface AssetRegistration {
  assetType: ReviewedAssetType;
  /** `lesson_assets` 행 수 */
  rowCount: number;
  /** storage 또는 외부 URL 이 붙은 행 수 */
  withSourceCount: number;
  /** approval_status = published */
  publishedCount: number;
  /** rights_status = cleared */
  rightsClearedCount: number;
}

export interface WeekLessonLink {
  lessonId: string;
  programId: string;
  programTitle: string | null;
  sessionNo: number;
  title: string;
}

export interface WeekAssetResult {
  ok: boolean;
  /** 이 주차에 걸린 차시가 있나. false 면 아래 건수는 뜻이 없다 */
  lessonLinked: boolean;
  lessons: WeekLessonLink[];
  registrations: AssetRegistration[];
  /** 다섯 종 밖의 자산이 등록돼 있으면 종류별 건수 */
  otherTypes: { assetType: string; rowCount: number }[];
}

const EMPTY: WeekAssetResult = {
  ok: false,
  lessonLinked: false,
  lessons: [],
  registrations: [],
  otherTypes: [],
};

function emptyRegistrations(): AssetRegistration[] {
  return REVIEWED_ASSET_TYPES.map((assetType) => ({
    assetType,
    rowCount: 0,
    withSourceCount: 0,
    publishedCount: 0,
    rightsClearedCount: 0,
  }));
}

/* ══════════════════════════════════════════ 24주 한 번에 */

export interface WeekAssetRollup {
  /** 주차 → 걸린 차시 수. 없는 주차는 키가 없다 */
  lessonCountByWeek: Map<number, number>;
  /** 주차 → 자료 종류별 (행 수 / 파일 있는 수) */
  byWeek: Map<number, Map<ReviewedAssetType, { rowCount: number; withSourceCount: number }>>;
}

export interface WeekAssetRollupResult {
  ok: boolean;
  rollup: WeekAssetRollup;
}

/**
 * 24주 목록 화면용 — 주차별 자료 건수를 한 번에 센다.
 *
 * ★ 주차마다 조회하면 24×3 번이 된다. 목록은 차시 전체를 한 번 읽고 메모리에서
 *   묶는다.
 * ★ 실패를 빈 결과 성공으로 바꾸지 않는다 (`ok: false`).
 */
export async function fetchWeekAssetRollup(
  supabase: SupabaseClient,
): Promise<WeekAssetRollupResult> {
  const empty: WeekAssetRollup = { lessonCountByWeek: new Map(), byWeek: new Map() };

  const lessonResult = await supabase
    .from("curriculum_lessons")
    .select("id, week_no")
    .lte("week_no", 24)
    .limit(2000);

  if (lessonResult.error) {
    log("rollup lessons", lessonResult.error.code);
    return { ok: false, rollup: empty };
  }

  const lessonRows = (lessonResult.data ?? []) as { id: string; week_no: number }[];
  const lessonCountByWeek = new Map<number, number>();
  const weekByLesson = new Map<string, number>();

  for (const row of lessonRows) {
    lessonCountByWeek.set(row.week_no, (lessonCountByWeek.get(row.week_no) ?? 0) + 1);
    weekByLesson.set(row.id, row.week_no);
  }

  if (lessonRows.length === 0) {
    return { ok: true, rollup: { lessonCountByWeek, byWeek: new Map() } };
  }

  const assetResult = await supabase
    .from("lesson_assets")
    .select("lesson_id, asset_type, storage_path, external_url")
    .in("lesson_id", [...weekByLesson.keys()].filter((id) => UUID_PATTERN.test(id)))
    .limit(5000);

  if (assetResult.error) {
    log("rollup assets", assetResult.error.code);
    return { ok: false, rollup: empty };
  }

  const assetRows = (assetResult.data ?? []) as {
    lesson_id: string;
    asset_type: string;
    storage_path: string | null;
    external_url: string | null;
  }[];

  const byWeek: WeekAssetRollup["byWeek"] = new Map();
  const reviewed = new Set<string>(REVIEWED_ASSET_TYPES);

  for (const row of assetRows) {
    const weekNo = weekByLesson.get(row.lesson_id);
    if (weekNo === undefined) continue;
    if (!reviewed.has(row.asset_type)) continue;

    const forWeek = byWeek.get(weekNo) ?? new Map();
    const key = row.asset_type as ReviewedAssetType;
    const cell = forWeek.get(key) ?? { rowCount: 0, withSourceCount: 0 };
    cell.rowCount += 1;
    if (row.storage_path !== null || row.external_url !== null) cell.withSourceCount += 1;
    forWeek.set(key, cell);
    byWeek.set(weekNo, forWeek);
  }

  return { ok: true, rollup: { lessonCountByWeek, byWeek } };
}

export async function fetchWeekAssetStatus(
  supabase: SupabaseClient,
  weekNo: number,
): Promise<WeekAssetResult> {
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) return EMPTY;

  const lessonResult = await supabase
    .from("curriculum_lessons")
    .select("id, program_id, session_no, title")
    .eq("week_no", weekNo)
    .order("session_no", { ascending: true })
    .limit(100);

  if (lessonResult.error) {
    log("lessons", lessonResult.error.code);
    return EMPTY;
  }

  const lessonRows = (lessonResult.data ?? []) as {
    id: string;
    program_id: string;
    session_no: number;
    title: string;
  }[];

  if (lessonRows.length === 0) {
    // ★ 차시가 없다. 자산을 셀 수 없는 상태이고, 0건과 구분해 알린다.
    return { ok: true, lessonLinked: false, lessons: [], registrations: [], otherTypes: [] };
  }

  const programIds = [...new Set(lessonRows.map((r) => r.program_id))];
  const programResult = await supabase
    .from("curriculum_programs")
    .select("id, title")
    .in("id", programIds)
    .limit(100);

  if (programResult.error) {
    log("programs", programResult.error.code);
    return EMPTY;
  }

  const programTitleById = new Map(
    ((programResult.data ?? []) as { id: string; title: string | null }[]).map((p) => [
      p.id,
      p.title,
    ]),
  );

  const lessonIds = lessonRows.map((r) => r.id).filter((id) => UUID_PATTERN.test(id));

  const assetResult = await supabase
    .from("lesson_assets")
    .select("asset_type, storage_path, external_url, approval_status, rights_status")
    .in("lesson_id", lessonIds)
    .limit(1000);

  if (assetResult.error) {
    log("assets", assetResult.error.code);
    return EMPTY;
  }

  const assetRows = (assetResult.data ?? []) as {
    asset_type: string;
    storage_path: string | null;
    external_url: string | null;
    approval_status: string;
    rights_status: string;
  }[];

  const registrations = emptyRegistrations();
  const byType = new Map<string, AssetRegistration>(
    registrations.map((r) => [r.assetType as string, r]),
  );
  const otherCount = new Map<string, number>();

  for (const row of assetRows) {
    const entry = byType.get(row.asset_type);
    if (!entry) {
      otherCount.set(row.asset_type, (otherCount.get(row.asset_type) ?? 0) + 1);
      continue;
    }
    entry.rowCount += 1;
    if (row.storage_path !== null || row.external_url !== null) entry.withSourceCount += 1;
    if (row.approval_status === "published") entry.publishedCount += 1;
    if (row.rights_status === "cleared") entry.rightsClearedCount += 1;
  }

  return {
    ok: true,
    lessonLinked: true,
    lessons: lessonRows.map((r) => ({
      lessonId: r.id,
      programId: r.program_id,
      programTitle: programTitleById.get(r.program_id) ?? null,
      sessionNo: r.session_no,
      title: r.title,
    })),
    registrations,
    otherTypes: [...otherCount.entries()].map(([assetType, rowCount]) => ({
      assetType,
      rowCount,
    })),
  };
}
