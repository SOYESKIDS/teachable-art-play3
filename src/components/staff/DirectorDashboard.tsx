import Link from "next/link";
import {
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import type {
  DashboardFollowUpSession,
  DirectorDashboardData,
} from "@/types/director-dashboard";
import type { StaffSessionItem } from "@/types/staff-session";
import { GrowthReportList } from "./GrowthReportList";
import { SessionStatusBadge } from "./SessionCard";
import { groupSessionsByClass } from "./class-groups";

interface DirectorDashboardProps {
  data: DirectorDashboardData;
  organizationId: string;
}

/**
 * SERVICE-12 — 원장 운영 대시보드 화면.
 *
 * ★ 읽는 순서: 상태(오늘 운영 요약) → 다음 행동(확인이 필요한 기록)
 *   → 진행(오늘 수업 · 반별) → 결과(최근 성장 리포트).
 *   원장이 5초 안에 "오늘 무엇을 봐야 하는가"를 알 수 있게 한다.
 *
 * ★ 이 화면은 평가하지 않는다.
 *   점수·등급·순위·출석률·위험도가 없다. 숫자는 전부 "몇 건이 기록되어 있는가"다.
 *
 * ★ 단정하지 않는다.
 *   "미작성 / 누락 / 경고" 대신 "출결 기록 없음 / 관찰 기록 없음"이라고만 쓴다.
 *   기록이 없는 것이 곧 문제라는 규칙은 이 서비스 어디에도 없다.
 *
 * ★ 숫자를 지어내지 않는다.
 *   집계가 상한에 닿거나 조회가 실패하면 숫자 대신 "—"와 안내를 보여준다.
 *   반별 묶음은 이미 받은 오늘 수업 목록을 화면에서 나눈 것뿐이다 (새 질의 없음).
 *
 * ★ 관리 도구처럼 딱딱해지지 않게 한다.
 *   기존 교직원 화면과 같은 흰 카드 · 남색 텍스트 · 부드러운 테두리를 쓰고
 *   표(table)를 쓰지 않는다. 좁은 화면에서 가로 스크롤이 생기지 않는다.
 */
export function DirectorDashboard({
  data,
  organizationId,
}: DirectorDashboardProps) {
  const org = encodeURIComponent(organizationId);

  const sessionsHref = `/director/sessions?org=${org}`;
  const historyHref = `/director/sessions/history?org=${org}`;
  const reportsHref = `/director/growth-reports?org=${org}`;

  const hasFollowUps =
    data.attendanceFollowUps.length > 0 ||
    data.observationFollowUps.length > 0;
  const classGroups = data.sessionsOk
    ? groupSessionsByClass(data.todaySessions)
    : [];

  return (
    <>
      {/* ------------------------------------------------ 상태 */}
      <div className="flex flex-col gap-1 border-b border-line-soft pb-5">
        <p className="eyebrow text-accent-strong">원장 대시보드</p>
        <h1 className="text-headline font-bold text-navy sm:text-headline-lg">
          오늘의 우리 원
        </h1>
        <p className="text-label leading-relaxed text-ink-muted">
          오늘 수업과 아직 비어 있는 기록을 먼저 보여 드립니다.
        </p>
        <p className="text-caption tabular-nums text-ink-muted">
          {data.todayLabel}
        </p>
      </div>

      {/* ------------------------------------------- 오늘 운영 요약 */}
      <section aria-labelledby="director-summary" className="mt-6">
        <h2 id="director-summary" className="text-title-sm font-bold text-navy">
          오늘 운영 요약
        </h2>
        {/*
          모바일 2열 → 데스크톱 4열.
          카드 높이를 items-stretch + flex-col justify-between으로 맞춰
          보조 문구 길이가 달라도 숫자 줄이 어긋나지 않는다.
        */}
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            href={sessionsHref}
            label="오늘 수업"
            value={data.sessionsOk ? data.todaySummary.total : null}
            unit="회"
            note={
              data.sessionsOk
                ? todayBreakdown(data)
                : "지금은 집계할 수 없습니다"
            }
          />

          <StatCard
            href={historyHref}
            label="출결 기록 없음"
            value={
              data.sessionsOk && data.attendance.reliable
                ? data.attendance.withoutRecordSessions
                : null
            }
            unit="회"
            note={
              data.sessionsOk && data.attendance.reliable
                ? `최근 ${data.windowDays}일 · 기록 있음 ${data.attendance.recordedSessions.toLocaleString("ko-KR")}회`
                : "지금은 집계할 수 없습니다"
            }
          />

          <StatCard
            href={historyHref}
            label="관찰 기록"
            value={
              data.sessionsOk && data.observation.reliable
                ? data.observation.totalRecords
                : null
            }
            unit="건"
            note={
              data.sessionsOk && data.observation.reliable
                ? `최근 ${data.windowDays}일 · 작성 완료 ${data.observation.completeRecords.toLocaleString("ko-KR")}건`
                : "지금은 집계할 수 없습니다"
            }
          />

          <StatCard
            href={reportsHref}
            label="성장 리포트"
            value={data.reportsOk ? data.growthReport.completedCount : null}
            unit="건"
            note={
              data.reportsOk
                ? data.growthReport.truncated
                  ? "작성 완료 (최근 분량만 집계)"
                  : "교사가 작성 완료한 리포트"
                : "지금은 집계할 수 없습니다"
            }
          />
        </div>

        {data.sessionsTruncated ? (
          <p className="mt-3 rounded-xl border border-line bg-white px-4 py-3 text-micro leading-relaxed text-ink-muted">
            최근 {data.windowDays}일 수업이 집계 범위를 넘었습니다. 카드의 기록
            현황은 일부만 반영했을 수 있습니다. 정확한 내용은 수업 이력에서
            확인해주세요.
          </p>
        ) : null}
      </section>

      {/* ------------------------------ 확인이 필요한 기록 (다음 행동) */}
      {data.sessionsOk && hasFollowUps ? (
        <section aria-labelledby="director-follow-ups" className="mt-8">
          <h2
            id="director-follow-ups"
            className="text-title-sm font-bold text-navy"
          >
            확인이 필요한 기록
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-ink-muted">
            최근 {data.windowDays}일 수업 중 기록이 아직 없는 수업입니다. 기록이
            없는 것이 곧 문제라는 뜻은 아닙니다. [열기]에서 바로 확인할 수
            있습니다.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.attendanceFollowUps.length > 0 ? (
              <FollowUpGroup
                title="출결 기록 없음"
                description="예정일이 오늘까지인 수업 중 출결 기록이 아직 없습니다. (취소 제외)"
                total={data.attendance.withoutRecordSessions}
                items={data.attendanceFollowUps}
                organizationId={organizationId}
                target="attendance"
              />
            ) : null}

            {data.observationFollowUps.length > 0 ? (
              <FollowUpGroup
                title="관찰 기록 없음"
                description="완료된 수업 중 관찰 기록이 아직 없습니다."
                total={data.observation.sessionsWithoutRecord}
                items={data.observationFollowUps}
                organizationId={organizationId}
                target="observations"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------ 오늘 수업 (반별) */}
      <section aria-labelledby="director-today" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id="director-today" className="text-title-sm font-bold text-navy">
            오늘 수업 · 반별
          </h2>
          <Link
            href={sessionsHref}
            className="inline-flex min-h-11 items-center text-label font-semibold text-trust-blue transition-opacity hover:opacity-70"
          >
            수업 운영 열기
          </Link>
        </div>

        {!data.sessionsOk ? (
          <EmptyBox text="수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
        ) : classGroups.length === 0 ? (
          <EmptyBox text="오늘 예정된 수업이 없습니다. 지난 수업은 수업 이력에서 볼 수 있습니다." />
        ) : (
          <div className="mt-3 flex flex-col gap-6">
            {classGroups.map((group) => (
              <div key={group.key}>
                <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-label font-bold text-navy">
                  {group.className}
                  {group.archived ? (
                    <span className="text-micro font-normal text-ink-muted">
                      (보관)
                    </span>
                  ) : null}
                  <span className="text-caption font-medium tabular-nums text-ink-muted">
                    {classBreakdown(group.sessions)}
                  </span>
                </h3>
                <ul className="mt-2 flex flex-col gap-3">
                  {group.sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      organizationId={organizationId}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------- 최근 성장 리포트 */}
      <section aria-labelledby="director-reports" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2
            id="director-reports"
            className="text-title-sm font-bold text-navy"
          >
            최근 성장 리포트
          </h2>
          <Link
            href={reportsHref}
            className="inline-flex min-h-11 items-center text-label font-semibold text-trust-blue transition-opacity hover:opacity-70"
          >
            전체 보기
          </Link>
        </div>
        <p className="mt-1 text-caption leading-relaxed text-ink-muted">
          교사가 작성 완료한 리포트만 표시됩니다.
        </p>

        {!data.reportsOk ? (
          <EmptyBox text="성장 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
        ) : (
          <GrowthReportList
            reports={data.recentReports}
            basePath="/director/growth-reports"
            organizationId={organizationId}
            emptyText="작성 완료된 성장 리포트가 아직 없습니다."
            showStatus={false}
          />
        )}
      </section>
    </>
  );
}

/** 오늘 수업 카드의 보조 문구 — 실제 status 값만 쓴다 */
function todayBreakdown(data: DirectorDashboardData): string {
  const { scheduled, inProgress, completed, cancelled } = data.todaySummary;

  const parts: string[] = [];

  if (scheduled > 0) parts.push(`예정 ${scheduled}`);
  if (inProgress > 0) parts.push(`진행 중 ${inProgress}`);
  if (completed > 0) parts.push(`완료 ${completed}`);
  if (cancelled > 0) parts.push(`취소 ${cancelled}`);

  return parts.length > 0 ? parts.join(" · ") : "예정된 수업 없음";
}

/** 반 묶음 제목 옆 상태 분포 — 받은 status 값만 센다 */
function classBreakdown(sessions: StaffSessionItem[]): string {
  const counts = new Map<StaffSessionItem["status"], number>();
  for (const session of sessions) {
    counts.set(session.status, (counts.get(session.status) ?? 0) + 1);
  }

  return (["scheduled", "in_progress", "completed", "cancelled"] as const)
    .filter((status) => counts.has(status))
    .map((status) => `${CLASS_SESSION_STATUS_LABELS[status]} ${counts.get(status)}`)
    .join(" · ");
}

/**
 * 현황 카드 하나.
 *
 * value가 null이면 숫자를 표시하지 않는다 — 집계가 불확실할 때
 * 0으로 보여주면 "없다"는 잘못된 사실을 말하게 된다.
 *
 * 카드 전체가 링크다. 좁은 화면에서 작은 글씨를 정확히 누르지 않아도 되도록
 * 최소 높이를 넉넉히 잡는다.
 */
function StatCard({
  href,
  label,
  value,
  unit,
  note,
}: {
  href: string;
  label: string;
  value: number | null;
  unit: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[96px] flex-col justify-between rounded-xl border border-line bg-white p-4 transition-colors hover:border-navy/25"
    >
      <p className="break-keep text-micro font-semibold text-ink-muted">
        {label}
      </p>

      <p className="mt-1.5 text-navy">
        <span className="text-headline font-bold tabular-nums leading-none">
          {value === null ? "—" : value.toLocaleString("ko-KR")}
        </span>
        {value === null ? null : (
          <span className="ml-1 text-caption font-semibold text-ink-muted">
            {unit}
          </span>
        )}
      </p>

      <p className="mt-1.5 break-keep text-micro leading-relaxed text-ink-muted">
        {note}
      </p>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-xl border border-dashed border-border-strong bg-white/70 px-4 py-8 text-center text-label leading-relaxed text-ink-muted">
      {text}
    </p>
  );
}

/**
 * 오늘 수업 한 줄 (반 묶음 안).
 *
 * SessionCard를 쓰지 않는 이유: 대시보드에서는 상태 변경을 하지 않고,
 * 대신 기록 현황을 함께 보여줘야 한다. 라벨·날짜·배지는 기존 헬퍼를 그대로 쓴다.
 * 반 이름은 묶음 제목에 있으므로 줄 안에서 반복하지 않는다.
 */
function SessionRow({
  session,
  organizationId,
}: {
  session: StaffSessionItem;
  organizationId: string;
}) {
  const org = encodeURIComponent(organizationId);

  return (
    <li className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-micro text-ink-muted">
            {formatLessonOrder(session.weekNo, session.sessionNo)}
            {session.programTitle ? ` · ${session.programTitle}` : ""}
          </p>

          <p className="mt-1 break-words text-body-sm font-bold leading-snug text-navy">
            {session.lessonTitle ?? "차시 정보 없음"}
          </p>

          <p className="mt-1 text-micro tabular-nums text-ink-muted">
            {formatSessionDate(session.scheduled_date)}
          </p>
        </div>

        <SessionStatusBadge status={session.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line-soft pt-4">
        <Link
          href={`/director/sessions/${session.id}/attendance?org=${org}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-trust-blue/30 bg-white px-4 text-label font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5"
        >
          출결 보기
        </Link>

        <Link
          href={`/director/sessions/${session.id}/observations?org=${org}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-white px-4 text-label font-bold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
        >
          관찰기록 보기
        </Link>
      </div>
    </li>
  );
}

/**
 * "확인이 필요한 기록" 묶음.
 *
 * 문구는 사실만 말한다 — 어떤 수업에 어떤 기록이 아직 없다는 것까지다.
 *
 * ★ 같은 날짜 · 같은 차시 수업이 여러 번 등록되어 있으면 두 줄이 똑같아 보인다.
 *   그래서 차시명 · 상태 · 프로그램명까지 함께 보여 주고, 그래도 같은 칸이라면
 *   "몇 회 등록되어 있는지"를 사실 그대로 알려 준다.
 *   session UUID 는 화면에 노출하지 않고, 없는 번호를 만들어 붙이지도 않는다.
 */
function FollowUpGroup({
  title,
  description,
  total,
  items,
  organizationId,
  target,
}: {
  title: string;
  description: string;
  total: number;
  items: DashboardFollowUpSession[];
  organizationId: string;
  target: "attendance" | "observations";
}) {
  const org = encodeURIComponent(organizationId);

  return (
    <div className="rounded-xl border border-warning-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-label font-bold text-navy">{title}</h3>
        <span className="text-caption tabular-nums text-ink-muted">
          {total.toLocaleString("ko-KR")}회
        </span>
      </div>

      <p className="mt-1 text-micro leading-relaxed text-ink-muted">
        {description}
      </p>

      <ul className="mt-3 flex flex-col divide-y divide-navy/8">
        {items.map(({ session, sameSlotCount }) => (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-caption font-semibold text-navy">
                {session.className ?? "반 정보 없음"}
                {session.classStatus === "archived" ? (
                  <span className="ml-1 text-micro font-normal text-ink-muted">
                    (보관)
                  </span>
                ) : null}
              </p>

              <p className="mt-0.5 break-words text-micro leading-relaxed text-ink-muted">
                <span className="tabular-nums">
                  {formatSessionDate(session.scheduled_date)}
                </span>
                {session.lessonTitle ? ` · ${session.lessonTitle}` : ""}
              </p>

              <p className="mt-0.5 break-words text-micro leading-relaxed text-ink-muted">
                {formatLessonOrder(session.weekNo, session.sessionNo)}
                {` · ${CLASS_SESSION_STATUS_LABELS[session.status]}`}
                {session.programTitle ? ` · ${session.programTitle}` : ""}
              </p>

              {sameSlotCount > 1 ? (
                <p className="mt-1 break-keep text-micro leading-relaxed text-ink-muted">
                  같은 날짜 · 같은 차시에 확인할 수업이{" "}
                  {sameSlotCount.toLocaleString("ko-KR")}회 있습니다.
                </p>
              ) : null}
            </div>

            <Link
              href={`/director/sessions/${session.id}/${target}?org=${org}`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-line-strong bg-white px-3 text-caption font-bold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
            >
              열기
            </Link>
          </li>
        ))}
      </ul>

      {total > items.length ? (
        <p className="mt-3 text-micro text-ink-muted">
          이 밖에 {(total - items.length).toLocaleString("ko-KR")}회가 더
          있습니다.
        </p>
      ) : null}
    </div>
  );
}
