import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassSessionStatus } from "@/types/class-session";

/**
 * 한 주차에 걸린 실제 수업 회차 — B단계 (교사 홈·반·회차 연결).
 *
 * ── 주차와 회차는 다르다 ─────────────────────────────────────────
 *
 * 주차(週次)는 교육과정의 자리이고, 회차는 **특정 반이 특정 날짜에 하는 수업**
 * 이다. 17주차는 하나지만 햇살반 17주차와 바다반 17주차는 서로 다른 회차이고
 * 진행 상태도 따로 간다.
 *
 * ★ 그래서 이 함수는 주차 하나에 대해 **회차 목록**을 돌려준다. 하나로 합친
 *   "그 주차의 진행률" 같은 값을 만들지 않는다. 합치면 어느 반 이야기인지
 *   알 수 없게 된다.
 *
 * ── 권한은 RLS 가 정한다 ─────────────────────────────────────────
 *
 * `organization_id` 로만 좁혀 질의한다. 교사에게는 담당 반의 회차만 돌아온다
 * (20260826 class_sessions SELECT 정책). 담당 반 목록을 코드가 다시 계산하면
 * RLS 와 어긋날 여지가 생긴다.
 *
 * ── 지금 읽을 수 있는 것만 읽는다 ────────────────────────────────
 *
 * ★ 준비 체크 · 결과 보고 제출 여부는 아직 저장되는 곳이 없다. 그래서 읽지
 *   않고, 화면도 그 값을 아는 척하지 않는다. 지금 읽는 것은 회차가 실제로
 *   갖고 있는 값(반 · 날짜 · 상태)뿐이다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(scope: string, code: string | undefined) {
  console.error(`[weeks/session] ${scope} failed:`, { code: code ?? null });
}

export interface WeekSessionItem {
  sessionId: string;
  classId: string;
  className: string | null;
  scheduledDate: string | null;
  status: ClassSessionStatus;
}

export interface WeekSessionResult {
  ok: boolean;
  sessions: WeekSessionItem[];
}

const EMPTY: WeekSessionResult = { ok: false, sessions: [] };

/**
 * 한 기관의 특정 주차 회차 목록.
 *
 * 교안 차시 → 회차 → 반 순으로 조회한다. 정확한 lessonId가 있으면 차시 조회를 생략한다. 회차 수가 적어 N+1 문제가
 * 되지 않는다.
 */
export async function fetchWeekSessions(
  supabase: SupabaseClient,
  organizationId: string,
  weekNo: number,
  lessonId?: string,
): Promise<WeekSessionResult> {
  if (!UUID_PATTERN.test(organizationId)) return EMPTY;
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 52) return EMPTY;

  if (lessonId !== undefined && !UUID_PATTERN.test(lessonId)) return EMPTY;
  let lessonIds: string[];
  if (lessonId) {
    // DB 콘텐츠가 밝힌 정확한 교안 차시만 잇는다. 다른 버전의 같은 주차를 섞지 않는다.
    lessonIds = [lessonId];
  } else {
    // class_sessions에는 week_no가 없다. 차시 메타를 거쳐 회차를 찾는다.
    const lessons = await supabase.from("curriculum_lessons")
      .select("id").eq("week_no", weekNo).limit(120);
    if (lessons.error) { log("lessons", lessons.error.code); return EMPTY; }
    lessonIds = (lessons.data ?? []).map((row: { id: string }) => row.id);
    if (lessonIds.length === 0) return { ok: true, sessions: [] };
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, scheduled_date, status")
    .eq("organization_id", organizationId)
    .in("lesson_id", lessonIds)
    .order("scheduled_date", { ascending: true })
    .limit(60);

  if (error) {
    log("sessions", error.code);
    return EMPTY;
  }

  const rows = (data ?? []) as {
    id: string;
    class_id: string;
    scheduled_date: string | null;
    status: ClassSessionStatus;
  }[];

  if (rows.length === 0) return { ok: true, sessions: [] };

  const classIds = [...new Set(rows.map((r) => r.class_id))];
  const classResult = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds)
    .limit(120);

  if (classResult.error) {
    log("classes", classResult.error.code);
    return EMPTY;
  }

  const nameById = new Map(
    ((classResult.data ?? []) as { id: string; name: string | null }[]).map((c) => [c.id, c.name]),
  );

  return {
    ok: true,
    sessions: rows.map((r) => ({
      sessionId: r.id,
      classId: r.class_id,
      className: nameById.get(r.class_id) ?? null,
      scheduledDate: r.scheduled_date,
      status: r.status,
    })),
  };
}

/* ══════════════════════════════════════════ 화면 문구 */

export const SESSION_STATUS_LABEL: Record<ClassSessionStatus, string> = {
  scheduled: "예정",
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

/**
 * 회차 상태에 따라 지금 할 일.
 *
 * ★ 이 값은 **회차 상태만** 보고 정한다. 준비 체크나 결과 보고 제출 여부는
 *   아직 저장되지 않으므로 반영하지 않는다. 모르는 것을 아는 척하지 않는다.
 */
export function nextActionFor(status: ClassSessionStatus, actorRole: "teacher" | "director" = "teacher"): {
  label: string;
  href: (sessionId: string, orgQuery: string) => string;
} | null {
  switch (status) {
    case "scheduled":
      return {
        label: actorRole === "director" ? "회차 운영 확인" : "수업 준비 이어하기",
        href: (id, org) => actorRole === "director" ? `/director/sessions/history?${org}` : `/teacher/sessions/${id}/before?${org}`,
      };
    case "in_progress":
      return {
        label: "교실 화면 열기",
        href: (id, org) => `/class/${id}?${org}`,
      };
    case "completed":
      return {
        label: "관찰 기록 보기",
        href: (id, org) => `/${actorRole}/sessions/${id}/observations?${org}`,
      };
    case "cancelled":
      return null;
    default:
      return null;
  }
}

export function formatSessionDate(date: string | null): string {
  if (!date) return "날짜 미정";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${y}.${m}.${d}`;
}
