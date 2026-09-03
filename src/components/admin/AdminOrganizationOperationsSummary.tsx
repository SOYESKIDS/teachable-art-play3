import {
  formatAdminShortDate,
} from "@/lib/admin/admin-dashboard-queries";
import {
  formatAttentionItem,
  type AdminOrganizationSummary,
} from "@/types/admin-dashboard";

interface AdminOrganizationOperationsSummaryProps {
  summary: AdminOrganizationSummary | null;
}

/**
 * SERVICE-14 — 기관 상세 상단의 운영 요약.
 *
 * ★ 기존 기관 상세 화면을 대체하지 않는다.
 *   원장/교사 · 반 · 원아 · 프로그램 배정 관리 영역은 그대로 두고
 *   그 위에 "지금 이 기관이 어떻게 돌아가는가"만 한 줄로 얹는다.
 *
 * ★ 학부모 공유는 다루지 않는다.
 *   child_growth_report_shares 의 SELECT Policy 에는 원장 분기만 있고
 *   본사 관리자 분기가 없다(SERVICE-13 의 의도된 경계).
 *   RLS 를 우회해서까지 볼 값이 아니므로 이 요약에 넣지 않았다.
 *   token_hash · raw token · 공유 주소는 어떤 경로로도 표시하지 않는다.
 *
 * ★ 개인정보를 펼치지 않는다. 수량 · 상태 · 날짜뿐이다.
 */
export function AdminOrganizationOperationsSummary({
  summary,
}: AdminOrganizationOperationsSummaryProps) {
  if (!summary) {
    return (
      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-[15px] font-bold text-navy">운영 요약</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-navy/55">
          운영 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-bold text-navy">운영 요약</h2>
        <p className="text-[12px] text-navy/45">
          수업 · 기록은 최근 {summary.windowDays}일 기준
        </p>
      </div>

      {/*
        ★ 운영이 끝난 기관도 상세는 막지 않는다.
          전체 기관 관리에서 지난 기록을 확인할 수 있어야 하기 때문이다.
          다만 운영 대시보드의 KPI 는 운영 중인 기관만 세므로,
          이 숫자들이 그 합계에 들어가지 않는다는 점을 밝혀 둔다.
      */}
      {summary.status !== "active" ? (
        <p className="mt-2 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2 text-[12px] leading-relaxed text-navy/55">
          운영 중이 아닌 기관입니다. 아래 숫자는 이 기관의 기록이며, 운영
          대시보드의 전체 집계에는 포함되지 않습니다.
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="원장" value={summary.directorCount} unit="명" />
        <Metric label="교사" value={summary.teacherCount} unit="명" />
        <Metric label="운영 중인 반" value={summary.classCount} unit="개" />
        <Metric label="재원 원아" value={summary.childCount} unit="명" />
        <Metric
          label="운영 중 프로그램 배정"
          value={summary.assignmentCount}
          unit="건"
        />
        <Metric
          label={`${summary.windowDays}일 수업`}
          value={summary.recentSessionCount}
          unit="회"
        />
        <Metric
          label="작성 완료 성장 리포트"
          value={summary.completedReportCount}
          unit="건"
        />

        <div className="flex flex-col gap-1">
          <dt className="break-keep text-[11px] font-semibold text-navy/45">
            최근 수업일
          </dt>
          <dd className="text-[18px] font-bold tabular-nums leading-none text-navy">
            {formatAdminShortDate(summary.lastSessionDate)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-navy/8 pt-4">
        <p className="text-[12px] font-semibold text-navy/50">확인 필요</p>

        {!summary.attentionReliable ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-navy/55">
            지금은 집계할 수 없습니다.
          </p>
        ) : summary.attention.length === 0 ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-navy/55">
            현재 확인이 필요한 운영 항목이 없습니다.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {summary.attention.map((item) => (
              <li
                key={item.kind}
                className="break-keep rounded-md border border-navy/15 bg-surface-soft px-2 py-1 text-[12px] font-semibold text-navy/70"
              >
                {formatAttentionItem(item)}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-[11px] leading-relaxed text-navy/40">
          운영 사실만 표시합니다. 기관·교사·아동에 대한 평가가 아닙니다.
        </p>
      </div>
    </section>
  );
}

/** value === null 이면 "—". 0 으로 위장하지 않는다. */
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="break-keep text-[11px] font-semibold text-navy/45">
        {label}
      </dt>
      <dd className="text-navy">
        <span className="text-[18px] font-bold tabular-nums leading-none">
          {value === null ? "—" : value.toLocaleString("ko-KR")}
        </span>
        {value === null ? null : (
          <span className="ml-1 text-[12px] font-semibold text-navy/55">
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
