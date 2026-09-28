import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID_PATTERN } from "@/lib/errors/rpc-errors";
import { fetchOrganizationEntitlements } from "@/lib/entitlement/queries";

/**
 * "8주 기록 모아보기" (DEC-069 · DEC-104 · report-parent-experience §11).
 *
 * · 완료된 Weekly Snapshot(최근 완료본)만 모아 보여 주는 derived view
 * · 새 report_type · 새 revision · 새 write · AI 없음
 * · 한 번에 최대 8주 (Snapshot 최대 8개 · 질의 모두 bounded)
 * · 빈 주는 중립적으로 비우고 사유(결석 · 미작성 · 미공개)를 구분하지 않는다
 * · 범위는 RLS 가 정한다 (교사: 담당 반 · 원장: 기관 · 원장은 완료본만)
 *
 * 8주 구간: 기준 Weekly 가 속한 구간. 계약 week 범위 시작점부터 8주 단위로 나눈다
 * (계약 정보가 없으면 1주차부터). 구간 끝은 계약 week 범위를 넘지 않는다.
 */

export const SUMMARY_WEEKS = 8;

export interface ProgramSummaryWeek {
  weekNo: number;
  dateFrom: string | null;
  dateTo: string | null;
  report: {
    id: string;
    topic: string | null;
    quoteChoice: string | null;
    hidden: boolean;
    revised: boolean;
    photoUrl: string | null;
  } | null;
}

export interface ProgramSummaryData {
  anchorReportId: string;
  childName: string | null;
  className: string | null;
  weekFrom: number;
  weekTo: number;
  weeks: ProgramSummaryWeek[];
}

function log(scope: string, code: string | undefined) {
  console.error(`[program-summary] ${scope} failed: code=${code ?? "unknown"}`);
}

function pickText(content: unknown, key: string): string | null {
  const row = (content ?? {}) as Record<string, unknown>;
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function summaryWindow(anchorWeek: number, contractFrom: number | null, contractTo: number | null) {
  const base = contractFrom ?? 1;
  const offset = Math.max(0, anchorWeek - base);
  const from = base + Math.floor(offset / SUMMARY_WEEKS) * SUMMARY_WEEKS;
  const last = from + SUMMARY_WEEKS - 1;
  const to = contractTo !== null && contractTo >= from ? Math.min(last, contractTo) : last;
  return { from, to };
}

export async function fetchProgramSummary(
  supabase: SupabaseClient,
  anchorReportId: string,
  options: { includePhotos: boolean },
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

  const entitlements = await fetchOrganizationEntitlements(supabase, anchor.organization_id);
  const { from, to } = summaryWindow(anchor.week_no, entitlements.weekFrom, entitlements.weekTo);

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

  const reports = (reportResult.data ?? []) as {
    id: string;
    week_no: number;
    hidden_at: string | null;
    latest_completed_revision_id: string;
  }[];

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

  const dates = new Map<number, { from: string; to: string }>();
  for (const row of (sessionResult.data ?? []) as { week_no: number | null; scheduled_date: string | null }[]) {
    if (row.week_no === null || !row.scheduled_date) continue;
    const current = dates.get(row.week_no);
    if (!current) dates.set(row.week_no, { from: row.scheduled_date, to: row.scheduled_date });
    else {
      if (row.scheduled_date < current.from) current.from = row.scheduled_date;
      if (row.scheduled_date > current.to) current.to = row.scheduled_date;
    }
  }

  const reportByWeek = new Map(reports.map((row) => [row.week_no, row]));
  const weeks: ProgramSummaryWeek[] = [];
  for (let week = from; week <= to; week += 1) {
    const row = reportByWeek.get(week);
    const revision = row ? revisionById.get(row.latest_completed_revision_id) : undefined;
    weeks.push({
      weekNo: week,
      dateFrom: dates.get(week)?.from ?? null,
      dateTo: dates.get(week)?.to ?? null,
      report:
        row && revision
          ? {
              id: row.id,
              topic: pickText(revision.content, "topic"),
              quoteChoice: pickText(revision.content, "quote_choice"),
              hidden: row.hidden_at !== null,
              revised: revision.revision_no > 1,
              photoUrl: photoByRevision.get(row.latest_completed_revision_id) ?? null,
            }
          : null,
    });
  }

  return {
    ok: true,
    data: {
      anchorReportId: anchor.id,
      childName: (childResult.data as { name: string } | null)?.name ?? null,
      className: (classResult.data as { name: string } | null)?.name ?? null,
      weekFrom: from,
      weekTo: to,
      weeks,
    },
  };
}
