import Link from "next/link";
import {
  formatAdminShortDate,
} from "@/lib/admin/admin-dashboard-queries";
import {
  ORGANIZATION_STATUS_BADGE_CLASSES,
  ORGANIZATION_STATUS_LABELS,
} from "@/lib/admin/organization-labels";
import {
  MAX_ADMIN_ATTENTION_BADGES,
  formatAttentionItem,
  type AdminDashboardData,
  type AdminOrganizationRow,
} from "@/types/admin-dashboard";

interface AdminOperationsDashboardProps {
  data: AdminDashboardData;
}

/**
 * SERVICE-14 — 본사 운영 콘솔 화면.
 *
 * ★ 평가하지 않는다.
 *   점수 · 등급 · 위험도 · 순위가 없다. "확인 필요"는 운영 사실의 나열이고
 *   정렬 기준도 "항목 개수"와 "최근 수업일"이라는 사실뿐이다.
 *
 * ★ 단정하지 않는다.
 *   "미작성 / 누락 / 경고 / 부진" 대신 "출결 기록 없음 · 관찰 기록 없음"만 쓴다.
 *
 * ★ 개인정보를 펼치지 않는다.
 *   원아 이름 · 관찰 원문 · 교사 작성문 · 사진 · 학부모 공유 주소가 없다.
 *   여기 있는 것은 수량 · 상태 · 날짜뿐이다.
 *
 * ★ 모르는 것은 "—"로 말한다.
 *   조회 실패나 집계 상한 초과를 0으로 위장하지 않는다.
 *
 * ★ 새 차트 라이브러리를 쓰지 않는다. 숫자와 표가 더 정확하다.
 */
export function AdminOperationsDashboard({
  data,
}: AdminOperationsDashboardProps) {
  const { kpis } = data;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold text-navy">운영 대시보드</h1>
          <p className="text-[14px] text-navy/55">
            도입기관과 수업 운영 현황을 한눈에 확인합니다.
          </p>
          <p className="text-[13px] tabular-nums text-navy/45">
            {data.todayLabel} 기준 · 운영 중인 기관만
          </p>
        </div>

        <nav
          aria-label="빠른 이동"
          className="flex shrink-0 flex-wrap gap-2"
        >
          <QuickLink href="/admin/organizations" label="기관 관리" />
          <QuickLink href="/admin/curriculum" label="수업 프로그램" />
          <QuickLink href="/admin/leads" label="기관 문의 관리" />
        </nav>
      </div>

      {/* ─────────────────────────────────────────────── KPI */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="운영 기관" value={kpis.activeOrganizations} unit="곳" note="운영 중" />
        <Kpi label="운영 반" value={kpis.activeClasses} unit="개" note="운영 중" />
        <Kpi
          label="등록 교사"
          value={kpis.teacherMemberships}
          unit="명"
          note="기관 소속 기준"
        />
        <Kpi label="등록 원아" value={kpis.activeChildren} unit="명" note="재원 중" />
        <Kpi
          label={`최근 ${data.windowDays}일 수업`}
          value={kpis.recentSessions}
          unit="회"
          note="취소 제외"
        />
        <Kpi
          label="성장 리포트"
          value={kpis.completedReports}
          unit="건"
          note="작성 완료"
        />
      </div>

      {!data.rosterReliable || !data.sessionsReliable || !data.activityReliable ? (
        <p className="mt-3 rounded-xl border border-navy/10 bg-white px-4 py-3 text-[12px] leading-relaxed text-navy/55">
          일부 집계가 조회 범위를 넘었거나 실패했습니다. 기관별 숫자와 확인 항목이
          실제와 다를 수 있어 해당 값은 표시하지 않습니다. 상단 KPI는 DB 집계라
          영향을 받지 않습니다.
        </p>
      ) : null}

      {/* ─────────────────────────────────────── 기관 운영 현황 */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-[16px] font-bold text-navy">기관 운영 현황</h2>
          <Link
            href="/admin/organizations"
            className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
          >
            전체 기관 관리
          </Link>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
          운영 중인 기관만, 최근 {data.windowDays}일 기준입니다. 운영이 끝난 기관을
          포함한 전체 목록은 기관 관리에서 확인합니다. 확인 항목은 운영 사실만
          표시하며 평가가 아닙니다.
        </p>

        {!data.organizationsOk ? (
          <ErrorBox text="운영 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
        ) : data.organizations.length === 0 ? (
          <EmptyBox text="운영 중인 기관이 없습니다." />
        ) : (
          <>
            {/* 데스크톱: 표 */}
            <div className="mt-3 hidden overflow-hidden rounded-xl border border-navy/10 bg-white lg:block">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-navy/10 bg-surface-soft/60">
                    <Th className="w-[20%]">기관명</Th>
                    <Th className="w-[8%]">상태</Th>
                    <Th className="w-[6%] text-right">반</Th>
                    <Th className="w-[6%] text-right">교사</Th>
                    <Th className="w-[6%] text-right">원아</Th>
                    <Th className="w-[8%] text-right">프로그램</Th>
                    <Th className="w-[10%]">최근 수업일</Th>
                    <Th className="w-[8%] text-right">{data.windowDays}일 수업</Th>
                    <Th className="w-[20%]">확인 필요</Th>
                    <Th className="w-[8%]">
                      <span className="sr-only">상세</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {data.organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b border-navy/8 last:border-b-0"
                    >
                      <Td>
                        <span className="break-words font-semibold text-navy">
                          {org.name}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={org.status} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        <Count value={org.classCount} reliable={data.rosterReliable} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        <Count value={org.teacherCount} reliable={data.rosterReliable} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        <Count value={org.childCount} reliable={data.rosterReliable} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        <Count
                          value={org.assignmentCount}
                          reliable={data.rosterReliable}
                        />
                      </Td>
                      <Td className="tabular-nums text-navy/60">
                        {data.sessionsReliable
                          ? formatAdminShortDate(org.lastSessionDate)
                          : "—"}
                      </Td>
                      <Td className="text-right tabular-nums">
                        <Count
                          value={org.recentSessionCount}
                          reliable={data.sessionsReliable}
                        />
                      </Td>
                      <Td>
                        <AttentionBadges org={org} />
                      </Td>
                      <Td>
                        <DetailLink id={org.id} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일/태블릿: 카드. 표를 가로로 밀지 않는다. */}
            <ul className="mt-3 flex flex-col gap-3 lg:hidden">
              {data.organizations.map((org) => (
                <li
                  key={org.id}
                  className="rounded-xl border border-navy/10 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-[15px] font-bold text-navy">
                      {org.name}
                    </p>
                    <StatusBadge status={org.status} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                    <Row label="반" value={org.classCount} reliable={data.rosterReliable} />
                    <Row label="교사" value={org.teacherCount} reliable={data.rosterReliable} />
                    <Row label="원아" value={org.childCount} reliable={data.rosterReliable} />
                    <Row
                      label="프로그램"
                      value={org.assignmentCount}
                      reliable={data.rosterReliable}
                    />
                    <Row
                      label={`${data.windowDays}일 수업`}
                      value={org.recentSessionCount}
                      reliable={data.sessionsReliable}
                    />
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-navy/45">최근 수업일</dt>
                      <dd className="tabular-nums text-navy/70">
                        {data.sessionsReliable
                          ? formatAdminShortDate(org.lastSessionDate)
                          : "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3">
                    <AttentionBadges org={org} />
                  </div>

                  <div className="mt-3 border-t border-navy/8 pt-3">
                    <DetailLink id={org.id} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ───────────────────────────────── 확인이 필요한 기관 */}
      <section className="mt-8">
        <h2 className="text-[16px] font-bold text-navy">확인이 필요한 기관</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
          확인 항목이 많은 순, 같으면 최근 수업이 오래된 순입니다. 점수를 매기지
          않습니다.
        </p>

        {!data.organizationsOk ? (
          <ErrorBox text="운영 현황을 불러오지 못했습니다." />
        ) : data.attentionOrganizations.length === 0 ? (
          <EmptyBox text="현재 확인이 필요한 운영 항목이 없습니다." />
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.attentionOrganizations.map((org) => (
              <li
                key={org.id}
                className="rounded-xl border border-navy/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-[14px] font-bold text-navy">
                    {org.name}
                  </p>
                  <StatusBadge status={org.status} />
                </div>

                <ul className="mt-2 flex flex-col gap-1">
                  {org.attention.map((item) => (
                    <li
                      key={item.kind}
                      className="text-[12px] leading-relaxed text-navy/60"
                    >
                      · {formatAttentionItem(item)}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 border-t border-navy/8 pt-3">
                  <DetailLink id={org.id} label="기관 열기" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ───────────────────────────────────────── 최근 운영 활동 */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-[16px] font-bold text-navy">최근 수업</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
            운영 중인 기관의 수업을 기관 · 날짜별로 묶어 보여줍니다. (취소 제외)
          </p>

          {!data.recentOk ? (
            <ErrorBox text="최근 활동을 불러오지 못했습니다." />
          ) : data.recentSessions.length === 0 ? (
            <EmptyBox text="최근 수업 기록이 없습니다." />
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-navy/8 rounded-xl border border-navy/10 bg-white px-4">
              {data.recentSessions.map((item) => (
                <li
                  key={`${item.organizationId}-${item.scheduledDate}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] tabular-nums text-navy/45">
                      {formatAdminShortDate(item.scheduledDate)}
                    </p>
                    <p className="mt-0.5 break-words text-[13px] font-semibold text-navy">
                      {item.organizationName}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] tabular-nums text-navy/60">
                    수업 {item.completedCount.toLocaleString("ko-KR")}회
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-navy">
            최근 작성 완료 성장 리포트
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
            기관과 기간만 표시합니다. 원아 정보와 본문은 이 화면에 열지 않습니다.
          </p>

          {!data.recentOk ? (
            <ErrorBox text="최근 활동을 불러오지 못했습니다." />
          ) : data.recentReports.length === 0 ? (
            <EmptyBox text="작성 완료된 성장 리포트가 아직 없습니다." />
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-navy/8 rounded-xl border border-navy/10 bg-white px-4">
              {data.recentReports.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] tabular-nums text-navy/45">
                      {formatAdminShortDate(item.completedAt.slice(0, 10))} 완료
                    </p>
                    <p className="mt-0.5 break-words text-[13px] font-semibold text-navy">
                      {item.organizationName}
                    </p>
                  </div>
                  <p className="shrink-0 text-[12px] tabular-nums text-navy/55">
                    {formatAdminShortDate(item.periodStart)} ~{" "}
                    {formatAdminShortDate(item.periodEnd)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
    >
      {label}
    </Link>
  );
}

/** value === null 이면 "—". 0 은 "없다"는 사실 주장이라 함부로 쓰지 않는다. */
function Kpi({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  note: string;
}) {
  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-navy/10 bg-white p-4">
      <p className="break-keep text-[12px] font-semibold text-navy/50">{label}</p>

      <p className="mt-2 text-navy">
        <span className="text-[24px] font-bold tabular-nums leading-none">
          {value === null ? "—" : value.toLocaleString("ko-KR")}
        </span>
        {value === null ? null : (
          <span className="ml-1 text-[13px] font-semibold text-navy/60">
            {unit}
          </span>
        )}
      </p>

      <p className="mt-2 break-keep text-[11px] leading-relaxed text-navy/45">
        {value === null ? "집계할 수 없습니다" : note}
      </p>
    </div>
  );
}

function Count({ value, reliable }: { value: number; reliable: boolean }) {
  return <>{reliable ? value.toLocaleString("ko-KR") : "—"}</>;
}

function Row({
  label,
  value,
  reliable,
}: {
  label: string;
  value: number;
  reliable: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-navy/45">{label}</dt>
      <dd className="tabular-nums text-navy/70">
        <Count value={value} reliable={reliable} />
      </dd>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: AdminOrganizationRow["status"];
}) {
  return (
    <span
      className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${ORGANIZATION_STATUS_BADGE_CLASSES[status]}`}
    >
      {ORGANIZATION_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 확인 항목 배지.
 *
 * 최대 3개까지만 펼치고 나머지는 "+N"으로 접는다.
 * 색으로 심각도를 말하지 않는다 — 전부 같은 중립 배지다.
 */
function AttentionBadges({ org }: { org: AdminOrganizationRow }) {
  if (org.attention.length === 0) {
    return <span className="text-[12px] text-navy/35">—</span>;
  }

  const shown = org.attention.slice(0, MAX_ADMIN_ATTENTION_BADGES);
  const hidden = org.attention.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <span
          key={item.kind}
          className="inline-block break-keep rounded-md border border-navy/15 bg-surface-soft px-2 py-0.5 text-[11px] font-semibold text-navy/70"
        >
          {formatAttentionItem(item)}
        </span>
      ))}

      {hidden > 0 ? (
        <span className="inline-block rounded-md border border-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy/45">
          +{hidden}
        </span>
      ) : null}
    </div>
  );
}

function DetailLink({ id, label = "상세 보기" }: { id: string; label?: string }) {
  return (
    <Link
      href={`/admin/organizations/${id}`}
      className="inline-flex min-h-11 items-center rounded-lg border border-trust-blue/30 bg-white px-3 text-[13px] font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5"
    >
      {label}
    </Link>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-[11px] font-bold text-navy/50 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-3 align-middle text-[13px] text-navy ${className}`}>
      {children}
    </td>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/50">
      {text}
    </p>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-xl border border-navy/15 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/60">
      {text}
    </p>
  );
}
