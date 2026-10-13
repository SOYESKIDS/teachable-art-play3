import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassSessionStatus } from "@/types/class-session";

/**
 * 반별 주차 진행 현황 — B단계 (원장 화면).
 *
 * ── 실제 회차 행만 센다 ──────────────────────────────────────────
 *
 * ★ 여기 나오는 숫자는 전부 `class_sessions` 행을 센 값이다. 추정하거나
 *   비율을 만들어 내지 않는다.
 *
 * ★ **진행률(%)을 계산하지 않는다.** 분모가 되려면 그 반의 이용권이 몇 주를
 *   여는지 알아야 하는데, 이용권은 아직 연결되지 않았다. 모르는 분모로 만든
 *   퍼센트는 실제 집계처럼 보이면서 틀린 값이다. 그래서 건수만 센다.
 *
 * ── 결과보고서는 아직 없다 ───────────────────────────────────────
 *
 * ★ 회차별 결과보고서를 저장하는 테이블이 없다. 그래서 「제출 N건」을 세지
 *   않는다. 화면이 그 사실을 적는다.
 *
 * ── 권한 ─────────────────────────────────────────────────────────
 *
 * `organization_id` 로만 좁힌다. 원장은 기관 전체, 교사는 담당 반만 돌아온다
 * (RLS).
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(scope: string, code: string | undefined) {
  console.error(`[staff/class-progress] ${scope} failed:`, { code: code ?? null });
}

export interface ClassWeekCell {
  weekNo: number;
  status: ClassSessionStatus;
  sessionId: string;
  scheduledDate: string | null;
}

export interface ClassProgressRow {
  classId: string;
  className: string | null;
  /** 주차 번호 오름차순 */
  weeks: ClassWeekCell[];
  completedCount: number;
  inProgressCount: number;
  scheduledCount: number;
  cancelledCount: number;
  /** 가장 최근에 완료된 주차 */
  latestCompletedWeek: number | null;
  /** 지금 진행 중이거나 다음으로 예정된 주차 */
  currentWeek: number | null;
}

export interface ClassProgressResult {
  ok: boolean;
  classes: ClassProgressRow[];
  /** 주차가 지정되지 않아 표에 넣지 못한 회차 수 */
  withoutWeek: number;
}

const EMPTY: ClassProgressResult = { ok: false, classes: [], withoutWeek: 0 };

export async function fetchClassWeekProgress(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ClassProgressResult> {
  if (!UUID_PATTERN.test(organizationId)) return EMPTY;

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, week_no, scheduled_date, status")
    .eq("organization_id", organizationId)
    .order("week_no", { ascending: true })
    .limit(2000);

  if (error) {
    log("sessions", error.code);
    return EMPTY;
  }

  const rows = (data ?? []) as {
    id: string;
    class_id: string;
    week_no: number | null;
    scheduled_date: string | null;
    status: ClassSessionStatus;
  }[];

  if (rows.length === 0) return { ok: true, classes: [], withoutWeek: 0 };

  const classIds = [...new Set(rows.map((r) => r.class_id))];
  const classResult = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds)
    .limit(200);

  if (classResult.error) {
    log("classes", classResult.error.code);
    return EMPTY;
  }

  const nameById = new Map(
    ((classResult.data ?? []) as { id: string; name: string | null }[]).map((c) => [c.id, c.name]),
  );

  const byClass = new Map<string, ClassWeekCell[]>();
  let withoutWeek = 0;

  for (const row of rows) {
    if (typeof row.week_no !== "number") {
      // ★ 주차가 없는 회차는 표에 넣지 않고 건수만 알린다. 임의로 끼워 넣지 않는다.
      withoutWeek += 1;
      continue;
    }
    const list = byClass.get(row.class_id) ?? [];
    list.push({
      weekNo: row.week_no,
      status: row.status,
      sessionId: row.id,
      scheduledDate: row.scheduled_date,
    });
    byClass.set(row.class_id, list);
  }

  const classes: ClassProgressRow[] = [...byClass.entries()]
    .map(([classId, cells]) => {
      const weeks = [...cells].sort((a, b) => a.weekNo - b.weekNo);
      const completed = weeks.filter((w) => w.status === "completed");
      const inProgress = weeks.filter((w) => w.status === "in_progress");
      const scheduled = weeks.filter((w) => w.status === "scheduled");

      return {
        classId,
        className: nameById.get(classId) ?? null,
        weeks,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
        scheduledCount: scheduled.length,
        cancelledCount: weeks.filter((w) => w.status === "cancelled").length,
        latestCompletedWeek:
          completed.length > 0 ? Math.max(...completed.map((w) => w.weekNo)) : null,
        // 진행 중이 있으면 그것, 없으면 가장 이른 예정 주차.
        currentWeek:
          inProgress.length > 0
            ? Math.min(...inProgress.map((w) => w.weekNo))
            : scheduled.length > 0
              ? Math.min(...scheduled.map((w) => w.weekNo))
              : null,
      };
    })
    .sort((a, b) => (a.className ?? "").localeCompare(b.className ?? "", "ko"));

  return { ok: true, classes, withoutWeek };
}
