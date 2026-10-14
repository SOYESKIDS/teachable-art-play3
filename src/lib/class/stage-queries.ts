import type { SupabaseClient } from "@supabase/supabase-js";
import { loadClassScenes, loadWeekContent } from "@/lib/weeks/week-content-source";
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
  /**
   * 어느 교안 버전의 어느 차시를 띄웠나. fixture 모드에서는 null.
   *
   * ★ 교사 화면·인쇄물과 **같은 버전**인지 확인하는 데 쓴다. 세 화면이 각자
   *   「3주차」를 읽었다는 것만으로는 같은 내용을 봤다고 말할 수 없다.
   */
  lessonId: string | null;
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
  | {
      ok: false;
      reason: "invalid_id" | "not_found" | "load_failed" | "no_week" | "content_failed";
      /** `content_failed` 일 때 왜 못 열었는지 (조용히 대체하지 않으므로 적어야 한다) */
      detail?: string;
    };

export async function fetchStageData(
  supabase: SupabaseClient,
  organizationId: string,
  sessionId: string,
): Promise<StageResult> {
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "invalid_id" };
  }

  // ★ 이 select 에는 원아·교사 관련 열이 없다. 반·차시 id 는 **장면 권한
  //   RPC 에 넘기기 위해** 읽는다 — 화면에 그리지 않는다.
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, week_no, class_id, lesson_id, program_id")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    log("session", error.code);
    return { ok: false, reason: "load_failed" };
  }
  if (!data) return { ok: false, reason: "not_found" };

  const row = data as {
    week_no: number | null;
    class_id: string;
    lesson_id: string;
    program_id: string;
  };
  const weekNo = row.week_no;
  if (typeof weekNo !== "number") return { ok: false, reason: "no_week" };

  // ★ 교실 화면은 정식 서비스 경로다. 발행된 주차의 본문만 내려온다.
  // ★ 출처는 CONTENT_SOURCE 게이트가 정한다. **프로그램을 회차 행에서** 가져온다 —
  //   주차 번호로 교안을 고르지 않는다. 같은 3주차를 담은 교안이 여럿일 수 있다.
  const loaded = await loadWeekContent(supabase, {
    weekNo,
    audience: "service",
    organizationId,
    programId: loadedProgramId(row.program_id),
  });

  if (!loaded.ok) {
    // ★ fixture 로 조용히 대체하지 않는다. 아이들 앞에 띄우는 화면이 저장된
    //   것과 다르면 교사는 그 사실을 알 수 없다.
    log("content", loaded.reason);
    return { ok: false, reason: "content_failed", detail: loaded.detail };
  }

  // ── 장면 ──
  // fixture 모드면 읽어 온 content 의 장면을 그대로 쓴다.
  // database 모드면 **권한 RPC** 로 읽는다. 장면 표 직접 조회는 본사만 된다.
  let scenes = loaded.result.content.scenes;
  if (loaded.version !== null) {
    const viaRpc = await loadClassScenes(supabase, row.class_id, loaded.version.lessonId);
    if (!viaRpc.ok) {
      log("scenes", undefined);
      return { ok: false, reason: "content_failed", detail: viaRpc.detail };
    }
    scenes = viaRpc.scenes;
  }

  return {
    ok: true,
    data: {
      sessionId,
      weekNo,
      lessonId: loaded.version?.lessonId ?? null,
      lessonTitle: loaded.result.content.summary.title,
      themeColor: loaded.result.content.summary.themeColor,
      scenes,
      contentUnavailable: !loaded.result.bodyVisible || scenes.length === 0,
    },
  };
}

/**
 * 회차 행의 프로그램 id.
 *
 * fixture 모드에서는 쓰이지 않지만(주차 번호로 지도를 읽는다), database 모드
 * 에서는 **이 값이 교안 버전을 정한다.** 계약을 다시 뒤지지 않는 이유는,
 * 회차가 이미 「어느 교안의 어느 차시」인지 들고 있기 때문이다.
 */
function loadedProgramId(programId: string | null | undefined): string | undefined {
  return typeof programId === "string" && programId.length > 0 ? programId : undefined;
}
