import type { LeadNotificationOverview } from "@/lib/admin/lead-notification-queries";

/**
 * 상담 알림 상태 카드 — 실행 묶음 D3.
 *
 * ★ 읽기 전용이다. 발송 버튼을 두지 않는다 — 이번 단계에서는 실제 발송을 하지 않는다.
 * ★ 알림 본문·수신자 주소를 보여 주지 않는다. 상태 집계와 채널 상태만 보여 준다.
 * ★ 읽기 실패와 "미적용"을 빈 목록 성공으로 감추지 않는다.
 */

const STATUS_LABEL: Record<keyof LeadNotificationOverview["counts"], string> = {
  pending: "대기",
  sending: "발송 중",
  sent: "전달 완료",
  failed: "실패",
  skipped: "보내지 않음",
};

export function LeadNotificationCard({
  overview,
}: {
  overview: LeadNotificationOverview;
}) {
  if (overview.tableMissing) {
    return (
      <section className="rounded-xl border border-warning-border bg-warning-soft px-5 py-4">
        <h2 className="text-label font-bold text-warning-text">상담 알림</h2>
        <p className="mt-1.5 text-caption leading-relaxed text-warning-text">
          알림 테이블이 아직 적용되지 않았습니다. 문의 저장은 정상 동작하며, 알림만
          쌓이지 않습니다.
          <br />
          적용 대상:{" "}
          <code className="font-mono">
            supabase/migrations/20261012090000_d3_lead_notification_outbox.sql
          </code>
        </p>
      </section>
    );
  }

  if (!overview.ok) {
    return (
      <section className="rounded-xl border border-danger-border bg-danger-soft px-5 py-4">
        <h2 className="text-label font-bold text-danger">상담 알림</h2>
        <p className="mt-1.5 text-caption text-danger">
          알림 상태를 불러오지 못했습니다. 아래 문의 목록은 별도로 조회됩니다.
        </p>
      </section>
    );
  }

  const disabled = overview.channels.filter((c) => c.status === "disabled");

  return (
    <section className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-label font-bold text-ink">상담 알림</h2>
        <p className="text-caption text-ink-muted">
          회신 약속: 주 1회 확인 · 1주일 이내 회신 (담당 백향은)
        </p>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {(
          Object.keys(STATUS_LABEL) as (keyof LeadNotificationOverview["counts"])[]
        ).map((key) => (
          <div key={key} className="flex items-baseline gap-1.5">
            <dt className="text-caption text-ink-muted">{STATUS_LABEL[key]}</dt>
            <dd className="text-body-sm font-semibold tabular-nums text-ink">
              {overview.counts[key].toLocaleString("ko-KR")}
            </dd>
          </div>
        ))}
      </dl>

      {overview.truncated && (
        <p className="mt-2 text-caption text-ink-muted">
          집계가 상한에 닿았습니다. 위 숫자는 최근 일부만 센 값입니다.
        </p>
      )}

      {disabled.length > 0 && (
        <div className="mt-3 rounded-lg border border-warning-border bg-warning-soft px-4 py-3">
          <p className="text-caption font-semibold text-warning-text">
            설정 필요 — 발송이 비활성 상태입니다
          </p>
          <ul className="mt-1 space-y-1">
            {disabled.map((channel) => (
              <li key={channel.code} className="text-caption text-warning-text">
                <strong>{channel.label}</strong>
                {channel.blockedNote ? ` — ${channel.blockedNote}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-warning-text/80">
            비활성 상태에서도 문의 저장과 알림 적재는 계속됩니다. 수신자와 메일
            provider 가 확정되면 채널을 활성화합니다.
          </p>
        </div>
      )}

      <p className="mt-3 text-caption text-ink-muted">
        알림에는 문의 원문과 연락처가 들어가지 않습니다. 상세 내용은 이 화면에
        로그인한 뒤에만 볼 수 있습니다.
      </p>
    </section>
  );
}
