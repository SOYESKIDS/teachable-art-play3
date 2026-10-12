import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 상담 알림 전달 처리 — 실행 묶음 D3 보완 (사용자 지시 항목 6).
 *
 * ── 흐름 ───────────────────────────────────────────────────────────
 *
 *   1. 만료 lease 회수  (죽은 처리기가 잡고 있던 행을 되돌린다)
 *   2. claim            (`for update skip locked` — 두 처리기가 같은 행을 집지 않는다)
 *   3. adapter 호출     (지금은 비활성 adapter 하나뿐)
 *   4. 결과 기록        (sent / retry / failed — 재시도 간격은 DB 가 계산한다)
 *
 * ── 하지 않는 것 ───────────────────────────────────────────────────
 *
 * ★ 메일을 보내지 않는다.
 *   `resolveAdapter()` 가 provider 설정을 보고 adapter 를 고르는데, 설정된
 *   provider 가 없으므로 항상 `disabledAdapter` 다. 그 adapter 는 네트워크를
 *   건드리지 않고 "설정 없음" 을 돌려준다.
 *
 * ★ 스케줄을 등록하지 않는다.
 *   `runLeadNotificationDelivery()` 는 사람이 관리 화면에서 부른다.
 *   cron · queue 등록은 이번 범위가 아니다.
 *
 * ★ 성공을 가장하지 않는다.
 *   adapter 가 보내지 못하면 `sent` 로 기록하지 않는다. 설정이 없으면 claim
 *   자체가 0건이고(활성 채널만 집는다), 혹시 집혔다면 `retry` 로 되돌린다.
 *
 * ★ 알림 본문을 만들지 않는다.
 *   payload 는 4키(`submission_type`·`package_code`·`received_at`·`admin_path`)뿐이고,
 *   adapter 도 그것만 받는다. 문의 원문·연락처는 이 경로에 없다.
 */

/** DB 가 돌려주는 claim 결과 */
export interface ClaimedNotification {
  outboxId: string;
  leadId: string;
  channelCode: string;
  attemptCount: number;
  payload: {
    submission_type?: string;
    package_code?: string | null;
    received_at?: string;
    admin_path?: string;
  };
  updatedAt: string;
}

export type DeliveryOutcome =
  | { result: "sent" }
  /** 다시 시도한다. DB 가 backoff 를 계산한다 */
  | { result: "retry"; errorCode: string }
  /** 재시도해도 소용없다 */
  | { result: "failed"; errorCode: string };

export interface NotificationAdapter {
  readonly name: string;
  /** 설정이 끝나 실제로 보낼 수 있는가 */
  readonly configured: boolean;
  deliver(item: ClaimedNotification): Promise<DeliveryOutcome>;
}

/**
 * 비활성 adapter.
 *
 * 수신자와 provider 가 정해지지 않았다. 네트워크를 건드리지 않고 `retry` 를
 * 돌려주므로, 알림은 사라지지 않고 설정이 끝난 뒤 다시 시도된다.
 */
export const disabledAdapter: NotificationAdapter = {
  name: "disabled",
  configured: false,
  async deliver() {
    return { result: "retry", errorCode: "provider_not_configured" };
  },
};

/**
 * 설정된 provider 를 고른다.
 *
 * ★ 지금은 어떤 provider 도 구현되어 있지 않다. 수신자 주소와 메일 provider 가
 *   확정되면 여기에 adapter 를 추가한다. 그때까지는 비활성 adapter 하나다.
 */
export function resolveAdapter(channelCode: string): NotificationAdapter {
  // 채널별 adapter 매핑 지점. 지금은 모두 비활성이다.
  void channelCode;
  return disabledAdapter;
}

export interface DeliveryRunSummary {
  ok: boolean;
  /** migration 미적용 */
  notInstalled: boolean;
  reclaimed: number;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  /** adapter 가 설정되지 않아 보내지 못했다 */
  adapterNotConfigured: boolean;
  /** 결과 기록이 동시성으로 거부된 건수 */
  conflicts: number;
}

const UNDEFINED_FUNCTION = "42883";
const UNDEFINED_TABLE = "42P01";

const EMPTY: DeliveryRunSummary = {
  ok: false,
  notInstalled: false,
  reclaimed: 0,
  claimed: 0,
  sent: 0,
  retried: 0,
  failed: 0,
  adapterNotConfigured: false,
  conflicts: 0,
};

function toClaimed(row: Record<string, unknown>): ClaimedNotification {
  return {
    outboxId: String(row.outbox_id),
    leadId: String(row.lead_id),
    channelCode: String(row.channel_code),
    attemptCount: typeof row.attempt_count === "number" ? row.attempt_count : 0,
    payload:
      typeof row.payload === "object" && row.payload !== null
        ? (row.payload as ClaimedNotification["payload"])
        : {},
    updatedAt: String(row.updated_at),
  };
}

/**
 * 전달 처리 1회.
 *
 * @param batchSize 한 번에 집어갈 건수. DB 가 1~100 으로 묶는다.
 */
export async function runLeadNotificationDelivery(
  supabase: SupabaseClient,
  batchSize = 10,
): Promise<DeliveryRunSummary> {
  const summary: DeliveryRunSummary = { ...EMPTY, ok: true };

  // 1) 만료 lease 회수 — 죽은 처리기가 잡고 있던 행을 되돌린다
  const reclaim = await supabase.rpc("reclaim_stale_lead_notifications");
  if (reclaim.error) {
    const notInstalled =
      reclaim.error.code === UNDEFINED_FUNCTION ||
      reclaim.error.code === UNDEFINED_TABLE;
    console.error("[admin/notify] reclaim failed:", { code: reclaim.error.code ?? null });
    return { ...EMPTY, notInstalled };
  }
  summary.reclaimed = typeof reclaim.data === "number" ? reclaim.data : 0;

  // 2) claim — 활성 채널의 보낼 차례만. 비활성이면 0건이다.
  const claim = await supabase.rpc("claim_lead_notifications", {
    p_limit: batchSize,
  });
  if (claim.error) {
    console.error("[admin/notify] claim failed:", { code: claim.error.code ?? null });
    return { ...summary, ok: false };
  }

  const items = (Array.isArray(claim.data) ? claim.data : []).map((row) =>
    toClaimed(row as Record<string, unknown>),
  );
  summary.claimed = items.length;

  // 3~4) adapter 호출 → 결과 기록
  for (const item of items) {
    const adapter = resolveAdapter(item.channelCode);
    if (!adapter.configured) summary.adapterNotConfigured = true;

    let outcome: DeliveryOutcome;
    try {
      outcome = await adapter.deliver(item);
    } catch {
      // adapter 가 던지면 재시도로 돌린다. 예외 내용을 로그에 남기지 않는다.
      outcome = { result: "retry", errorCode: "adapter_threw" };
    }

    const record = await supabase.rpc("record_lead_notification_result", {
      p_outbox_id: item.outboxId,
      p_result: outcome.result,
      p_error_code: outcome.result === "sent" ? null : outcome.errorCode,
      // ★ claim 시점의 updated_at 을 넘겨 동시 수정을 잡는다.
      p_expected_updated_at: item.updatedAt,
    });

    if (record.error) {
      // LN003 = 다른 처리기가 먼저 기록했다. 중복 발송 방지가 동작한 결과다.
      if (record.error.code === "LN003") {
        summary.conflicts += 1;
      } else {
        console.error("[admin/notify] record failed:", { code: record.error.code ?? null });
        summary.ok = false;
      }
      continue;
    }

    if (outcome.result === "sent") summary.sent += 1;
    else if (outcome.result === "retry") summary.retried += 1;
    else summary.failed += 1;
  }

  return summary;
}

/* ══════════════════════════════════════════════════ 실패 목록 */

export interface NotificationIssue {
  outboxId: string;
  leadId: string;
  channelCode: string;
  status: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  leaseExpiresAt: string | null;
}

export interface NotificationIssueList {
  ok: boolean;
  notInstalled: boolean;
  issues: NotificationIssue[];
}

export async function fetchNotificationIssues(
  supabase: SupabaseClient,
  limit = 50,
): Promise<NotificationIssueList> {
  const { data, error } = await supabase.rpc("list_lead_notification_issues", {
    p_limit: limit,
  });

  if (error) {
    const notInstalled =
      error.code === UNDEFINED_FUNCTION || error.code === UNDEFINED_TABLE;
    console.error("[admin/notify] issues read failed:", { code: error.code ?? null });
    return { ok: false, notInstalled, issues: [] };
  }

  const issues: NotificationIssue[] = (Array.isArray(data) ? data : []).map(
    (row) => ({
      outboxId: String(row.outbox_id),
      leadId: String(row.lead_id),
      channelCode: String(row.channel_code),
      status: String(row.status),
      attemptCount: typeof row.attempt_count === "number" ? row.attempt_count : 0,
      lastAttemptAt: row.last_attempt_at === null ? null : String(row.last_attempt_at),
      nextAttemptAt: row.next_attempt_at === null ? null : String(row.next_attempt_at),
      lastErrorCode: row.last_error_code === null ? null : String(row.last_error_code),
      leaseExpiresAt:
        row.lease_expires_at === null ? null : String(row.lease_expires_at),
    }),
  );

  return { ok: true, notInstalled: false, issues };
}

/** 실패 코드 → 사람이 읽는 문구. 모르는 코드는 그대로 보여 준다. */
export const NOTIFICATION_ERROR_LABEL: Record<string, string> = {
  provider_not_configured: "메일 provider 미설정",
  adapter_threw: "전달 처리 중 오류",
  lease_expired: "처리기가 응답하지 않아 되돌림",
};
