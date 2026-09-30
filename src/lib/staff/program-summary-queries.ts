import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";
import { fetchOrganizationEntitlements } from "@/lib/entitlement/queries";
import {
  buildSummaryWeeks,
  SUMMARY_WEEKS,
  summaryWindow,
  type ProgramSummaryWeek,
  type SummaryReportRow,
  type SummarySessionRow,
} from "@/lib/staff/program-summary-window";

/**
 * "8주 기록 모아보기" (DEC-069 · DEC-104 · report-parent-experience §11).
 *
 * · 완료된 Weekly Snapshot(최근 완료본)만 모아 보여 주는 derived view
 * · 새 report_type · 새 revision · 새 write · AI 없음
 * · 한 번에 최대 8주 (Snapshot 최대 8개 · 질의 모두 bounded)
 * · 빈 주는 중립적으로 비우고 사유(결석 · 미작성 · 미공개)를 구분하지 않는다
 * · 범위는 RLS 가 정한다 (교사: 담당 반 · 원장: 기관 · 원장은 완료본만)
 *
 * 8주 구간 · 주 행 계산은 program-summary-window.ts (순수 함수 · PHASE 10D 수락 테스트 대상).
 * 기준 Weekly 는 화면이 고른 기관(?org)의 것이어야 한다 — 다르면 not_found (PHASE 10D).
 */

export { SUMMARY_WEEKS, summaryWindow, type ProgramSummaryWeek };

export interface ProgramSummaryData {
  anchorReportId: string;
  childName: string | null;
  className: string | null;
  weekFrom: number;
  weekTo: number;
  /** false = 현재 계약 week 범위 밖(또는 계약 정보 없음)의 구간 — 화면이 안내한다 */
  inContract: boolean;
  contractWeekFrom: number | null;
  contractWeekTo: number | null;
  weeks: ProgramSummaryWeek[];
}

function log(scope: string, code: string | undefined) {
  console.error(`[program-summary] ${scope} failed: code=${code ?? "unknown"}`);
}

export async function fetchProgramSummary(
  supabase: SupabaseClient,
  anchorReportId: string,
  options: { includePhotos: boolean; organizationId: string },
): Promise<{ ok: true; data: ProgramSummaryData } | { ok: false; reason: "not_found" | "load_failed" }> {
  if (!UUID_PATTERN.test(anchorReportId)) return { ok: false, reason: "not_found" };

  const { data: anchor, error: anchorError } = await supabase
    .from("reports")
    .select("id, organization_id, class_id, child_id, class_program_assignment_id, week_no, report_type")
    .eq("id", anchorReportId)
    .maybeSingle();

  if (anchorError) {
    log("anchor", anchorError.code);
    return { ok: false, reason: "load_failed" };
  }
  if (!anchor || anchor.report_type !== "weekly") return { ok: false, reason: "not_found" };
  if (anchor.organization_id !== options.organizationId) return { ok: false, reason: "not_found" };

  const entitlements = await fetchOrganizationEntitlements(supabase, anchor.organization_id);
  const window = summaryWindow(anchor.week_no, entitlements.weekFrom, entitlements.weekTo);
  const { from, to } = window;

  const [reportResult, sessionResult, childResult, classResult] = await Promise.all([
    supabase
      .from("reports")
      .select("id, week_no, hidden_at, latest_completed_revision_id")
      .eq("report_type", "weekly")
      .eq("child_id", anchor.child_id)
      .eq("class_program_assignment_id", anchor.class_program_assignment_id)
      .gte("week_no", from)
      .lte("week_no", to)
      .not("latest_completed_revision_id", "is", null)
      .limit(SUMMARY_WEEKS),
    supabase
      .from("class_sessions")
      .select("week_no, scheduled_date")
      .eq("class_program_assignment_id", anchor.class_program_assignment_id)
      .neq("status", "cancelled")
      .gte("week_no", from)
      .lte("week_no", to)
      .limit(SUMMARY_WEEKS * 7),
    supabase.from("children").select("name").eq("id", anchor.child_id).maybeSingle(),
    supabase.from("classes").select("name").eq("id", anchor.class_id).maybeSingle(),
  ]);

  const failed = reportResult.error ?? sessionResult.error;
  if (failed) {
    log("load", failed.code);
    return { ok: false, reason: "load_failed" };
  }

  const reports = (reportResult.data ?? []) as SummaryReportRow[];

  const revisionIds = reports.map((row) => row.latest_completed_revision_id);
  const revisionById = new Map<string, { content: unknown; revision_no: number }>();
  const photoByRevision = new Map<string, string>();

  if (revisionIds.length > 0) {
    const [revisionResult, mediaLinkResult] = await Promise.all([
      supabase.from("report_revisions").select("id, content, revision_no").in("id", revisionIds),
      options.includePhotos
        ? supabase
            .from("report_revision_media")
            .select("revision_id, media_id, sort_order")
            .in("revision_id", revisionIds)
            .eq("sort_order", 1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (revisionResult.error) {
      log("revisions", revisionResult.error.code);
      return { ok: false, reason: "load_failed" };
    }
    for (const row of (revisionResult.data ?? []) as { id: string; content: unknown; revision_no: number }[]) {
      revisionById.set(row.id, { content: row.content, revision_no: row.revision_no });
    }

    // 대표 사진 = Weekly 에서 이미 고른 첫 번째 사진 (숨긴 사진 제외 · 표시 가능할 때만)
    const links = (mediaLinkResult.data ?? []) as { revision_id: string; media_id: string }[];
    if (links.length > 0) {
      const { data: mediaRows, error: mediaError } = await supabase
        .from("class_session_observation_media")
        .select("id, storage_path")
        .in(
          "id",
          links.map((link) => link.media_id),
        )
        .is("hidden_at", null);

      if (mediaError) {
        log("media", mediaError.code);
      } else {
        const paths = (mediaRows ?? []) as { id: string; storage_path: string }[];
        if (paths.length > 0) {
          const { data: signed } = await supabase.storage.from("observation-media").createSignedUrls(
            paths.map((row) => row.storage_path),
            60 * 10,
          );
          const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
          const urlByMedia = new Map(paths.map((row) => [row.id, urlByPath.get(row.storage_path) ?? null]));
          for (const link of links) {
            const url = urlByMedia.get(link.media_id);
            if (url) photoByRevision.set(link.revision_id, url);
          }
        }
      }
    }
  }

  const weeks = buildSummaryWeeks({
    window,
    reports,
    revisions: revisionById,
    photos: photoByRevision,
    sessions: (sessionResult.data ?? []) as SummarySessionRow[],
  });

  return {
    ok: true,
    data: {
      anchorReportId: anchor.id,
      childName: (childResult.data as { name: string } | null)?.name ?? null,
      className: (classResult.data as { name: string } | null)?.name ?? null,
      weekFrom: from,
      weekTo: to,
      inContract: window.inContract,
      contractWeekFrom: entitlements.weekFrom,
      contractWeekTo: entitlements.weekTo,
      weeks,
    },
  };
}
