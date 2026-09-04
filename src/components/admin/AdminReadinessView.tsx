import Link from "next/link";
import {
  ORGANIZATION_STATUS_BADGE_CLASSES,
  ORGANIZATION_STATUS_LABELS,
} from "@/lib/admin/organization-labels";
import {
  PARENT_SHARE_NOTE,
  type OrganizationReadiness,
  type ReadinessData,
} from "@/types/admin-readiness";
import {
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusPill,
} from "@/components/ui/surface";

/**
 * SERVICE-16 — 서비스 오픈 준비 화면.
 *
 * ★ 읽기 전용이다. 삭제·수정 버튼이 없다.
 *
 * ★ 평가하지 않는다.
 *   위험 점수도, 등급도, 순위도 없다. "설정됨 / 미설정"이라는 사실만 말한다.
 *   완료 개수(3/7)는 진행 상황이지 평가가 아니며, 그 옆에 항상 항목 이름이 붙는다.
 *
 * ★ 색으로만 말하지 않는다.
 *   모든 배지가 "설정됨" · "미설정" 같은 한국어 라벨을 함께 갖는다.
 */
export function AdminReadinessView({ data }: { data: ReadinessData }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-8 lg:px-8">
      <PageHeader
        title="서비스 오픈 준비"
        description="첫 기관을 받기 전에 확인할 항목을 한 화면에서 봅니다. 이 화면은 읽기 전용입니다."
        meta={`${data.todayLabel} 기준`}
        actions={
          <>
            <QuickLink href="/admin/onboarding" label="새 기관 도입" primary />
            <QuickLink href="/admin" label="운영 대시보드" />
          </>
        }
      />

      {/* ───────────────────────────────────── 전체 요약 */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="운영 기관"
          value={data.totals.activeOrganizations}
          unit="곳"
          note="운영 중"
        />
        <MetricCard
          label="운영 반"
          value={data.totals.activeClasses}
          unit="개"
          note="운영 기관 기준"
        />
        <MetricCard
          label="재원 원아"
          value={data.totals.activeChildren}
          unit="명"
          note="운영 기관 기준"
        />
        <MetricCard
          label="교사"
          value={data.totals.teacherMemberships}
          unit="명"
          note="기관 소속 기준"
        />
        <MetricCard
          label={`최근 ${data.windowDays}일 수업`}
          value={data.totals.recentSessions}
          unit="회"
          note="취소 제외"
        />
        <MetricCard
          label="성장 리포트"
          value={data.totals.completedReports}
          unit="건"
          note="작성 완료"
        />
        <MetricCard
          label="활성 학부모 공유"
          value={data.totals.activeParentShares}
          unit="건"
        />
        <div className="flex min-h-[104px] flex-col justify-center rounded-xl border border-navy/10 bg-surface-soft p-4">
          <p className="break-keep text-[11px] leading-relaxed text-navy/55">
            {PARENT_SHARE_NOTE}
          </p>
        </div>
      </div>

      {!data.reliable && data.ok ? (
        <p className="mt-3 rounded-xl border border-navy/10 bg-white px-4 py-3 text-[12px] leading-relaxed text-navy/55">
          일부 집계가 조회 범위를 넘었습니다. 위 숫자 중 일부는 표시하지
          않았으며, 아래 기관별 항목이 실제와 다를 수 있습니다.
        </p>
      ) : null}

      {/* ───────────────────────────── 기관별 준비 현황 */}
      <section className="mt-8">
        <h2 className="text-[16px] font-bold text-navy">기관별 준비 현황</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-navy/50">
          각 항목은 설정 여부라는 사실만 표시합니다. 점수나 등급이 아닙니다.
          일시 중지된 기관도 함께 보여 줍니다.
        </p>

        {!data.ok ? (
          <div className="mt-3">
            <ErrorState text="준비 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
          </div>
        ) : data.organizations.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              text="등록된 기관이 없습니다."
              action={
                <QuickLink href="/admin/onboarding" label="새 기관 도입" primary />
              }
            />
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {data.organizations.map((org) => (
              <li key={org.id}>
                <OrganizationCard org={org} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─────────────────────────────── 오픈 전 확인 */}
      <section className="mt-8">
        <SectionCard
          title="첫 기관을 받기 전에"
          description="아래는 화면에서 자동으로 확인할 수 없는 항목입니다. 운영 문서의 체크리스트와 함께 확인하세요."
        >
          <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-navy/65">
            <li>· 본사 관리자 계정 중 지금 로그인할 수 있는 계정이 있는지</li>
            <li>· Production 환경변수와 Supabase 백업 설정</li>
            <li>· 학부모 공유 링크 안내 문구를 원장에게 전달했는지</li>
            <li>· 테스트 기관 데이터를 실제 기관과 구분할 계획이 있는지</li>
            <li>· OpenAI 사용량 한도 설정</li>
          </ul>
        </SectionCard>
      </section>
    </div>
  );
}

function OrganizationCard({ org }: { org: OrganizationReadiness }) {
  const allDone = org.doneCount === org.totalCount;

  return (
    <div className="h-full rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-words text-[15px] font-bold text-navy">
          {org.name}
        </p>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${ORGANIZATION_STATUS_BADGE_CLASSES[org.status]}`}
          >
            {ORGANIZATION_STATUS_LABELS[org.status]}
          </span>
          <StatusPill tone={allDone ? "done" : "pending"}>
            {allDone
              ? "설정 완료"
              : `설정 ${org.doneCount}/${org.totalCount}`}
          </StatusPill>
        </div>
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-navy/8">
        {org.items.map((entry) => (
          <li
            key={entry.key}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
          >
            <span className="text-[13px] text-navy/70">{entry.label}</span>
            <span className="flex items-center gap-2">
              <span className="text-[12px] tabular-nums text-navy/55">
                {entry.detail}
              </span>
              <StatusPill tone={entry.done ? "done" : "neutral"}>
                {entry.done ? "설정됨" : "미설정"}
              </StatusPill>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-4">
        <Link
          href={`/admin/onboarding?organization=${encodeURIComponent(org.id)}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-trust-blue/30 bg-white px-3 text-[13px] font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5"
        >
          도입 설정 계속
        </Link>
        <Link
          href={`/admin/organizations/${org.id}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-3 text-[13px] font-bold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
        >
          기관 상세
        </Link>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center rounded-lg px-4 text-[13px] font-semibold transition-colors ${
        primary
          ? "bg-navy text-white hover:bg-navy/90"
          : "border border-navy/20 bg-white text-navy hover:border-navy/35 hover:bg-navy/5"
      }`}
    >
      {label}
    </Link>
  );
}
