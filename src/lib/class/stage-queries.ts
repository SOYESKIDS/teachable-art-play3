import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeekContent } from "@/lib/weeks/week-source";
import type { WeekScene } from "@/lib/weeks/week-types";

/**
 * 교실 화면 조회 — 아이들이 보는 화면에 들어갈 것만 읽는다.
 *
 * ── 개인정보를 애초에 담지 않는다 ────────────────────────────────
 *
 * ★ 기존 `fetchClassModeData` 는 교사 업무 화면용이라 원아 이름
 *   (`photoNotSharedNames`)과 교사 메모까지 읽는다. 교실 화면은 그 데이터를
 *   **받지 않아야** 한다. 화면에서 안 그리는 것으로는 부족하다 — 서버
 *   컴포넌트가 클라이언트로 넘기는 props 에 실려 HTML 에 들어간다.
 *
 *   그래서 교실 화면 전용 조회를 따로 둔다. 이 함수는 원아 테이블을 아예
 *   조회하지 않는다.
 *
 * ★ 반 이름도 읽지 않는다. 장면에 쓰이지 않으므로 받을 이유가 없다.
 *
 * ── 회차는 실제 레코드다 ─────────────────────────────────────────
 *
 * ★ 주차 번호로 회차를 만들지 않는다. `sessionId` 는 반·날짜에 묶인 실제
 *   `class_sessions` 행이고, 그 행이 주차를 알려 준다. 반대 방향은 없다.
 * ★ 권한은 RLS 가 판정한다. 담당이 아니면 행이 돌아오지 않는다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function log(scope: string, code: string | undefined) {
  console.error(`[class/stage] ${scope} failed:`, { code: code ?? null });
}

export interface StageData {
  sessionId: string;
  weekNo: number;
  /** 수업명 (그림책 제목). 원아 정보가 아니다 */
  lessonTitle: string;
  /** 주차 테마색 — 책갈피에 쓴다 */
  themeColor: string;
  scenes: WeekScene[];
  /** 본문이 발행되지 않아 장면이 비어 있는가 */
  contentUnavailable: boolean;
}

export type StageResult =
  | { ok: true; data: StageData }
  | { ok: false; reason: "invalid_id" | "not_found" | "load_failed" | "no_week" };

export async function fetchStageData(
  supabase: SupabaseClient,
  organizationId: string,
  sessionId: string,
): Promise<StageResult> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // ★ 이 select 에는 원아·교사 관련 열이 없다.
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, week_no")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    log("session", error.code);
    return { ok: false, reason: "load_failed" };
  }
  if (!data) return { ok: false, reason: "not_found" };

  const weekNo = (data as { week_no: number | null }).week_no;
  if (typeof weekNo !== "number") return { ok: false, reason: "no_week" };

  // ★ 교실 화면은 정식 서비스 경로다. 발행된 주차의 장면만 내려온다.
  const content = getWeekContent(weekNo, "service");
  if (!content) return { ok: false, reason: "no_week" };

  return {
    ok: true,
    data: {
      sessionId,
      weekNo,
      lessonTitle: content.content.summary.title,
      themeColor: content.content.summary.themeColor,
      scenes: content.content.scenes,
      contentUnavailable: !content.bodyVisible || content.content.scenes.length === 0,
    },
  };
}
