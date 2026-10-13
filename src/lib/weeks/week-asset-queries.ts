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
 * ★ **파일이 등록됐나** — `lesson_assets` 에 행이 있고 받을 곳이 적혀 있는가.
 *
 * 둘은 독립이다. 「원문에 있는데 파일 없음」이 바로 누락 자료이고, 이 화면이
 * 찾아야 하는 것이다.
 *
 * ── 합산하지 않는다 ──────────────────────────────────────────────
 *
 * ★ 한 주차에 여러 프로그램(8·16·24주)의 차시가 걸린다. 그 차시들의 자료를
 *   합쳐서 「음원 3건」이라고 적으면, **A 프로그램에 3건이 있고 B 프로그램에
 *   0건인 상태가 「3건 있음」으로 보인다.** B 로 수업하는 기관은 음원 없이
 *   수업하게 된다.
 *
 *   그래서 **프로그램 → 차시 → 자료 종류**로 내려가며 따로 센다. 전체 합계는
 *   `total` 에 따로 담아, 화면이 합계와 내역을 나란히 그린다. 합계가 내역을
 *   대신하지 않는다.
 *
 * ── 등록과 재생은 다른 것이다 ────────────────────────────────────
 *
 * ★ `storage_path` · `external_url` 이 적혀 있다는 것은 **어디서 받을지 적혀
 *   있다**는 뜻일 뿐이다. 그 파일이 실제로 있는지, 서명 URL 이 발급되는지,
 *   재생이 되는지는 **확인하지 않았다**. 이 모듈은 메타데이터만 읽는다.
 *   그래서 필드 이름을 `withPathCount` 로 두고, 화면은 「경로 등록」이라고
 *   적는다. 「재생 가능」이라고 적지 않는다.
 *
 * ── 주차와 차시를 잇는 길 ────────────────────────────────────────
 *
 * `lesson_assets` 는 `curriculum_lessons.id` 에 달려 있고, 그 표에 `week_no`
 * 가 있다. 그래서 주차 → 차시 → 자산으로 잇는다.
 *
 * ★ 차시가 없는 주차는 `lessonLinked: false` 다. 이때 **등록 0건이라고
 *   적지 않는다.** 「연결된 차시가 없어 셀 수 없음」과 「차시는 있는데 자산이
 *   0건」은 다른 상태다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(scope: string, code: string | undefined) {
  console.error(`[weeks/asset-status] ${scope} failed:`, { code: code ?? null });
}

/**
 * 실제 파일 접근·재생을 확인했는가.
 *
 * ★ 이 모듈은 **확인하지 않는다.** 서명 URL 발급과 재생 확인은 자산 재생
 *   경로(`lesson-asset-queries`)가 하는 일이고, 그마저도 발급 성공이 재생
 *   성공은 아니다. 검수 화면이 「경로 등록 N건」을 「재생 가능 N건」으로 읽지
 *   않도록 이 문구를 함께 내보낸다.
 */
export const ASSET_ACCESS_NOTE =
  "경로가 등록됐는지만 셌습니다. 파일이 실제로 열리는지·재생되는지는 확인하지 않았습니다.";

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
    // ★ 열 순서는 「콘텐츠 / 권장 사용 시점 / 활용」이다 (1·2권).
    for (const row of blocks.mediaOrWatch.table.rows) {
      scan(`${row[0]} — ${row[2] ?? ""}`, "10. 음원 · 뮤직비디오 활용");
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
  /**
   * 받을 경로(`storage_path` 또는 `external_url`)가 적힌 행 수.
   *
   * ★ 「재생 가능」이 아니다. {@link ASSET_ACCESS_NOTE} 를 함께 보여 준다.
   */
  withPathCount: number;
  /** approval_status = published */
  publishedCount: number;
  /** rights_status = cleared */
  rightsClearedCount: number;
  /** download_allowed = true */
  downloadAllowedCount: number;
}

export interface WeekLessonLink {
  lessonId: string;
  programId: string;
  programTitle: string | null;
  sessionNo: number;
  title: string;
}

/** 차시 하나의 자료 현황 */
export interface LessonAssetStatus {
  lesson: WeekLessonLink;
  registrations: AssetRegistration[];
  /** 다섯 종 밖의 자산 */
  otherTypes: { assetType: string; rowCount: number }[];
}

/** 프로그램 하나의 자료 현황 (차시별로 나뉘어 있다) */
export interface ProgramAssetStatus {
  programId: string;
  programTitle: string | null;
  lessons: LessonAssetStatus[];
  /** 이 프로그램 안에서의 합계 */
  subtotal: AssetRegistration[];
}

export interface WeekAssetResult {
  ok: boolean;
  /** 이 주차에 걸린 차시가 있나. false 면 아래 건수는 뜻이 없다 */
  lessonLinked: boolean;
  /** 프로그램 → 차시 → 자료 종류. 합산하지 않은 내역 */
  programs: ProgramAssetStatus[];
  /**
   * 주차 전체 합계.
   *
   * ★ 내역을 대신하지 않는다. 화면은 합계와 프로그램별 내역을 함께 그린다.
   */
  total: AssetRegistration[];
  /** 다섯 종 밖의 자산 (주차 전체) */
  totalOtherTypes: { assetType: string; rowCount: number }[];
}

const EMPTY: WeekAssetResult = {
  ok: false,
  lessonLinked: false,
  programs: [],
  total: [],
  totalOtherTypes: [],
};

function emptyRegistrations(): AssetRegistration[] {
  return REVIEWED_ASSET_TYPES.map((assetType) => ({
    assetType,
    rowCount: 0,
    withPathCount: 0,
    publishedCount: 0,
    rightsClearedCount: 0,
    downloadAllowedCount: 0,
  }));
}

/** 같은 종류끼리 더한다. 합계 칸을 만들 때만 쓴다 */
function sumRegistrations(parts: AssetRegistration[][]): AssetRegistration[] {
  const out = emptyRegistrations();
  const byType = new Map(out.map((r) => [r.assetType, r]));

  for (const list of parts) {
    for (const item of list) {
      const target = byType.get(item.assetType);
      if (!target) continue;
      target.rowCount += item.rowCount;
      target.withPathCount += item.withPathCount;
      target.publishedCount += item.publishedCount;
      target.rightsClearedCount += item.rightsClearedCount;
      target.downloadAllowedCount += item.downloadAllowedCount;
    }
  }

  return out;
}

export function registrationOf(
  registrations: AssetRegistration[],
  assetType: ReviewedAssetType,
): AssetRegistration {
  return (
    registrations.find((r) => r.assetType === assetType) ?? {
      assetType,
      rowCount: 0,
      withPathCount: 0,
      publishedCount: 0,
      rightsClearedCount: 0,
      downloadAllowedCount: 0,
    }
  );
}

interface AssetRow {
  lesson_id: string;
  asset_type: string;
  storage_path: string | null;
  external_url: string | null;
  approval_status: string;
  rights_status: string;
  download_allowed: boolean;
}

/** 한 차시의 자산 행들을 종류별로 센다 */
function countForLesson(rows: AssetRow[]): {
  registrations: AssetRegistration[];
  otherTypes: { assetType: string; rowCount: number }[];
} {
  const registrations = emptyRegistrations();
  const byType = new Map<string, AssetRegistration>(
    registrations.map((r) => [r.assetType as string, r]),
  );
  const otherCount = new Map<string, number>();

  for (const row of rows) {
    const entry = byType.get(row.asset_type);
    if (!entry) {
      otherCount.set(row.asset_type, (otherCount.get(row.asset_type) ?? 0) + 1);
      continue;
    }
    entry.rowCount += 1;
    if (row.storage_path !== null || row.external_url !== null) entry.withPathCount += 1;
    if (row.approval_status === "published") entry.publishedCount += 1;
    if (row.rights_status === "cleared") entry.rightsClearedCount += 1;
    if (row.download_allowed) entry.downloadAllowedCount += 1;
  }

  return {
    registrations,
    otherTypes: [...otherCount.entries()].map(([assetType, rowCount]) => ({
      assetType,
      rowCount,
    })),
  };
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
    return { ok: true, lessonLinked: false, programs: [], total: [], totalOtherTypes: [] };
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

  // ★ lesson_id 를 함께 읽는다. 이것이 없으면 차시별로 나눌 수 없다.
  const assetResult = await supabase
    .from("lesson_assets")
    .select(
      "lesson_id, asset_type, storage_path, external_url, approval_status, rights_status, download_allowed",
    )
    .in("lesson_id", lessonIds)
    .limit(1000);

  if (assetResult.error) {
    log("assets", assetResult.error.code);
    return EMPTY;
  }

  const assetRows = (assetResult.data ?? []) as AssetRow[];

  const rowsByLesson = new Map<string, AssetRow[]>();
  for (const row of assetRows) {
    const list = rowsByLesson.get(row.lesson_id) ?? [];
    list.push(row);
    rowsByLesson.set(row.lesson_id, list);
  }

  const lessonStatuses = lessonRows.map<LessonAssetStatus>((row) => {
    const counted = countForLesson(rowsByLesson.get(row.id) ?? []);
    return {
      lesson: {
        lessonId: row.id,
        programId: row.program_id,
        programTitle: programTitleById.get(row.program_id) ?? null,
        sessionNo: row.session_no,
        title: row.title,
      },
      registrations: counted.registrations,
      otherTypes: counted.otherTypes,
    };
  });

  const programs: ProgramAssetStatus[] = programIds
    .map((programId) => {
      const lessons = lessonStatuses.filter((l) => l.lesson.programId === programId);
      return {
        programId,
        programTitle: programTitleById.get(programId) ?? null,
        lessons,
        subtotal: sumRegistrations(lessons.map((l) => l.registrations)),
      };
    })
    .sort((a, b) => (a.programTitle ?? "").localeCompare(b.programTitle ?? "", "ko"));

  const totalOther = new Map<string, number>();
  for (const status of lessonStatuses) {
    for (const other of status.otherTypes) {
      totalOther.set(other.assetType, (totalOther.get(other.assetType) ?? 0) + other.rowCount);
    }
  }

  return {
    ok: true,
    lessonLinked: true,
    programs,
    total: sumRegistrations(lessonStatuses.map((l) => l.registrations)),
    totalOtherTypes: [...totalOther.entries()].map(([assetType, rowCount]) => ({
      assetType,
      rowCount,
    })),
  };
}

/* ══════════════════════════════════════════ 24주 한 번에 */

export interface WeekRollupCell {
  rowCount: number;
  /** 경로가 적힌 행 수 — 재생 가능 수가 아니다 */
  withPathCount: number;
  /** 그 자료가 한 건도 없는 프로그램 수 */
  programsWithout: number;
}

export interface WeekRollupRow {
  lessonCount: number;
  programCount: number;
  byType: Map<ReviewedAssetType, WeekRollupCell>;
}

export interface WeekAssetRollupResult {
  ok: boolean;
  /** 주차 → 현황. 차시가 없는 주차는 키가 없다 */
  byWeek: Map<number, WeekRollupRow>;
}

/**
 * 24주 목록 화면용 — 주차별 자료 건수를 한 번에 센다.
 *
 * ★ 주차마다 조회하면 24×3 번이 된다. 목록은 차시 전체를 한 번 읽고 메모리에서
 *   묶는다.
 *
 * ★ 목록의 숫자는 **여러 프로그램을 더한 값**이다. 그래서 `programsWithout`
 *   을 함께 센다 — 합계가 0이 아니어도 그 자료가 아예 없는 프로그램이 몇 개인지
 *   목록에서 보여야 한다. 한 프로그램의 파일이 다른 프로그램의 누락을 가리지
 *   않게 하는 장치다. 자세한 내역은 주차 상세에서 본다.
 *
 * ★ 실패를 빈 결과 성공으로 바꾸지 않는다 (`ok: false`).
 */
export async function fetchWeekAssetRollup(
  supabase: SupabaseClient,
): Promise<WeekAssetRollupResult> {
  const lessonResult = await supabase
    .from("curriculum_lessons")
    .select("id, program_id, week_no")
    .lte("week_no", 24)
    .limit(2000);

  if (lessonResult.error) {
    log("rollup lessons", lessonResult.error.code);
    return { ok: false, byWeek: new Map() };
  }

  const lessonRows = (lessonResult.data ?? []) as {
    id: string;
    program_id: string;
    week_no: number;
  }[];

  const byWeek = new Map<number, WeekRollupRow>();
  const programsByWeek = new Map<number, Set<string>>();
  const lessonMeta = new Map<string, { weekNo: number; programId: string }>();

  for (const row of lessonRows) {
    const existing = byWeek.get(row.week_no) ?? {
      lessonCount: 0,
      programCount: 0,
      byType: new Map<ReviewedAssetType, WeekRollupCell>(),
    };
    existing.lessonCount += 1;
    byWeek.set(row.week_no, existing);

    const programs = programsByWeek.get(row.week_no) ?? new Set<string>();
    programs.add(row.program_id);
    programsByWeek.set(row.week_no, programs);

    lessonMeta.set(row.id, { weekNo: row.week_no, programId: row.program_id });
  }

  for (const [weekNo, programs] of programsByWeek) {
    const row = byWeek.get(weekNo);
    if (row) row.programCount = programs.size;
  }

  if (lessonRows.length === 0) return { ok: true, byWeek };

  const assetResult = await supabase
    .from("lesson_assets")
    .select("lesson_id, asset_type, storage_path, external_url")
    .in("lesson_id", [...lessonMeta.keys()].filter((id) => UUID_PATTERN.test(id)))
    .limit(5000);

  if (assetResult.error) {
    log("rollup assets", assetResult.error.code);
    return { ok: false, byWeek: new Map() };
  }

  const assetRows = (assetResult.data ?? []) as {
    lesson_id: string;
    asset_type: string;
    storage_path: string | null;
    external_url: string | null;
  }[];

  const reviewed = new Set<string>(REVIEWED_ASSET_TYPES);
  /** 주차 → 자료 종류 → 그 자료를 가진 프로그램 집합 */
  const havingPrograms = new Map<number, Map<ReviewedAssetType, Set<string>>>();

  for (const row of assetRows) {
    const meta = lessonMeta.get(row.lesson_id);
    if (!meta) continue;
    if (!reviewed.has(row.asset_type)) continue;

    const weekRow = byWeek.get(meta.weekNo);
    if (!weekRow) continue;

    const key = row.asset_type as ReviewedAssetType;
    const cell =
      weekRow.byType.get(key) ?? { rowCount: 0, withPathCount: 0, programsWithout: 0 };
    cell.rowCount += 1;
    if (row.storage_path !== null || row.external_url !== null) cell.withPathCount += 1;
    weekRow.byType.set(key, cell);

    const perWeek = havingPrograms.get(meta.weekNo) ?? new Map();
    const set = perWeek.get(key) ?? new Set<string>();
    set.add(meta.programId);
    perWeek.set(key, set);
    havingPrograms.set(meta.weekNo, perWeek);
  }

  // ★ 「합계는 있는데 없는 프로그램이 있다」를 목록에서 드러낸다.
  for (const [weekNo, weekRow] of byWeek) {
    const perWeek = havingPrograms.get(weekNo);
    for (const assetType of REVIEWED_ASSET_TYPES) {
      const having = perWeek?.get(assetType)?.size ?? 0;
      const cell = weekRow.byType.get(assetType);
      const without = Math.max(0, weekRow.programCount - having);
      if (cell) {
        cell.programsWithout = without;
      } else if (weekRow.programCount > 0) {
        weekRow.byType.set(assetType, {
          rowCount: 0,
          withPathCount: 0,
          programsWithout: without,
        });
      }
    }
  }

  return { ok: true, byWeek };
}
