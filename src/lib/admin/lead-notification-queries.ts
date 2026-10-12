import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 상담 알림 outbox 조회 — 실행 묶음 D3.
 *
 * ★ 로그인 관리자 세션으로만 질의한다. Secret Key 를 쓰지 않는다.
 *   어떤 행이 보이는지는 RLS(`lead_notification_outbox_select_hq`)가 판정한다.
 *
 * ★ 읽기 실패를 빈 목록 성공으로 감추지 않는다 (지침 §5 A2).
 *   `ok: false` 를 돌려주고 화면이 그 사실을 그린다.
 *
 * ★ 알림 본문을 다루지 않는다.
 *   outbox 행에는 문의 원문·연락처가 없다. 여기서도 payload 를 화면으로 넘기지 않고
 *   상태 집계만 만든다.
 *
 * 이 모듈은 migration 20261012090000_d3_lead_notification_outbox.sql 의 테이블을 읽는다.
 * **그 migration 은 아직 원격에 적용되지 않았다.** 적용 전에는 조회가 실패하고,
 * 화면은 "알림 테이블 미적용"으로 표시한다 — 가짜 성공을 만들지 않는다.
 */

export type LeadNotificationStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "skipped";

export interface LeadNotificationChannel {
  code: string;
  label: string;
  status: "disabled" | "enabled";
  blockedNote: string | null;
}

export interface LeadNotificationCounts {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface LeadNotificationOverview {
  /** 조회가 성공했는가. false 면 아래 값은 의미가 없다 */
  ok: boolean;
  /** migration 미적용으로 테이블 자체가 없는 경우 */
  tableMissing: boolean;
  channels: LeadNotificationChannel[];
  counts: LeadNotificationCounts;
  /** 집계가 상한에 닿았는가 */
  truncated: boolean;
}

const EMPTY_COUNTS: LeadNotificationCounts = {
  pending: 0,
  sending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
};

/** 집계 상한. 이 수를 넘으면 truncated 로 표시한다. */
const MAX_ROWS = 1000;

/** PostgREST 가 "관계가 없다"고 알려 주는 코드 */
const UNDEFINED_TABLE = "42P01";

export async function fetchLeadNotificationOverview(
  supabase: SupabaseClient,
): Promise<LeadNotificationOverview> {
  const [channelResult, outboxResult] = await Promise.all([
    supabase
      .from("lead_notification_channels")
      .select("code, label, status, blocked_note")
      .order("code", { ascending: true }),
    supabase
      .from("lead_notification_outbox")
      .select("status")
      .limit(MAX_ROWS),
  ]);

  const tableMissing =
    channelResult.error?.code === UNDEFINED_TABLE ||
    outboxResult.error?.code === UNDEFINED_TABLE;

  if (channelResult.error || outboxResult.error) {
    // 오류 본문에 문의 내용이 섞일 수 있어 code 만 남긴다.
    console.error("[admin/leads] notification overview read failed:", {
      channelCode: channelResult.error?.code ?? null,
      outboxCode: outboxResult.error?.code ?? null,
    });
    return {
      ok: false,
      tableMissing,
      channels: [],
      counts: EMPTY_COUNTS,
      truncated: false,
    };
  }

  const channels: LeadNotificationChannel[] = (channelResult.data ?? []).map(
    (row) => ({
      code: String(row.code),
      label: String(row.label),
      status: row.status === "enabled" ? "enabled" : "disabled",
      blockedNote: row.blocked_note === null ? null : String(row.blocked_note),
    }),
  );

  const rows = outboxResult.data ?? [];
  const counts: LeadNotificationCounts = { ...EMPTY_COUNTS };
  for (const row of rows) {
    const status = String(row.status) as LeadNotificationStatus;
    if (status in counts) counts[status] += 1;
  }

  return {
    ok: true,
    tableMissing: false,
    channels,
    counts,
    truncated: rows.length >= MAX_ROWS,
  };
}
