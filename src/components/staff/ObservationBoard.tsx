import Link from "next/link";
import {
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import { ObservationMediaSection } from "@/components/staff/ObservationMediaSection";
import {
  OBSERVATION_RECORD_STATUS_LABELS,
  type ObservationDomain,
  type StaffObservationChild,
  type StaffObservationPageData,
} from "@/types/staff-observation";

interface ObservationBoardProps {
  data: StaffObservationPageData;
  backHref: string;
}

/**
 * SERVICE-08B — 관찰기록 화면 (원장 · 읽기 전용).
 *
 * ★ PHASE 10B (M5 앱 준비): 교사 legacy 관찰 작성 · AI 정리 경로를 없앴다.
 *   교사는 Observation 2.0(ClassObservationWorkspace)으로 쓰고, 이 화면은 원장 조회만 한다.
 *   legacy 관찰 저장 RPC · 관찰 AI RPC 는 M5 가 회수한다.
 *
 * ★ 이 화면은 아동을 평가하지 않는다.
 *   점수·등급·발달단계·위험도 같은 표시를 만들지 않는다.
 *   다루는 것은 교사가 남긴 서술과 관찰영역 태그뿐이다.
 *
 * 원장은 조회만 한다 (20260831094000의 쓰기 Policy에 director 분기가 없다). 최종 판정은 RLS 다.
 */
export function ObservationBoard({
  data,
  backHref,
}: ObservationBoardProps) {
  const { session, domains, children } = data;

  const sessionReadOnly =
    session.status === "cancelled";

  /**
   * 원장은 보관된 반의 기록도 그대로 읽는다 —
   * 20260831094000의 SELECT Policy에는 반 상태 조건이 없고
   * 원장 분기는 has_org_role() 하나뿐이다.
   *
   * 그래도 안내를 두는 이유: 아무 표시가 없으면 "왜 이 반이 목록에 있지"라고
   * 오해하게 된다. 수업 정보 카드의 "(보관)" 표시만으로는 약하다.
   * 문구 전용이다.
   */
  const directorArchived = session.classStatus !== "active";

  const completeCount = children.filter(
    (child) => child.recordStatus === "complete",
  ).length;

  const draftCount = children.filter(
    (child) => child.recordStatus === "draft",
  ).length;

  const missingCount =
    children.length - completeCount - draftCount;

  return (
    /*
     * ★ isolate — 본문이 StaffShell의 sticky 헤더(z-30) 위로 올라오지 못하게 못 박는다.
     *
     *   이 화면은 카드마다 form·textarea·알림 배너가 들어가 있어
     *   나중에 어느 하나에 z-index가 붙으면 헤더/nav를 가릴 수 있다.
     *   여기서 stacking context를 닫아 두면 본문의 z-index가 밖으로 새지 않으므로
     *   순서는 항상 헤더 → nav → 본문이 된다. (AttendanceEditor는 건드리지 않는다)
     */
    <div className="isolate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-white px-3 text-caption font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            ← 수업 목록
          </Link>
        </div>

        <span className="rounded-md border border-line-strong bg-white px-2.5 py-1 text-micro font-bold text-navy">
          {CLASS_SESSION_STATUS_LABELS[session.status]}
        </span>
      </div>

      {/*
        scroll-mt-28 — StaffShell 헤더는 상단 행 + nav 2단이라 약 107px을 덮는다.
        수업 정보 카드(h1 포함)로 스크롤될 때 제목 윗부분이 nav 아래로 들어가지 않도록
        그보다 조금 큰 여백(112px)을 둔다. 아래 목록·카드도 같은 값을 쓴다.
      */}
      <section className="mt-4 scroll-mt-28 rounded-xl border border-line bg-white p-4 sm:p-5">
        <p className="text-caption font-bold text-navy">
          {session.className ?? "반 정보 없음"}
          {session.classStatus === "archived" ? (
            <span className="ml-1 font-normal text-ink-muted">
              (보관)
            </span>
          ) : null}
        </p>

        <p className="mt-1 text-micro text-ink-muted">
          {formatLessonOrder(
            session.weekNo,
            session.sessionNo,
          )}
          {session.programTitle
            ? ` · ${session.programTitle}`
            : ""}
        </p>

        <h1 className="mt-1 break-words text-title font-bold leading-snug text-navy">
          {session.lessonTitle ?? "차시 정보 없음"}
        </h1>

        <p className="mt-2 text-caption text-ink-muted">
          예정일{" "}
          {formatSessionDate(session.scheduledDate)}
          {session.programCode
            ? ` · ${session.programCode}`
            : ""}
        </p>
      </section>

      {sessionReadOnly ? (
        <p className="mt-4 rounded-xl border border-line-strong bg-navy/5 px-4 py-3 text-caption leading-relaxed text-navy">
          취소된 수업입니다. 이미 남아 있는 관찰기록은 확인만 할 수 있습니다.
        </p>
      ) : null}

      {/*
        cancelled 배너가 이미 "조회만 가능"을 말하고 있을 때는 겹쳐 띄우지 않는다.
        (교사 쪽 배너와 같은 기준 — 배너가 세 개 쌓이면 아무것도 읽지 않게 된다)
      */}
      {directorArchived && !sessionReadOnly ? (
        <p className="mt-4 rounded-xl border border-line-strong bg-navy/5 px-4 py-3 text-caption leading-relaxed text-navy">
          보관된 반의 관찰기록입니다. 기존 기록을 그대로 조회할 수 있습니다.
        </p>
      ) : null}

      <p className="mt-4 rounded-xl border border-line bg-white/60 px-4 py-3 text-caption leading-relaxed text-ink-muted">
        관찰기록은 수업을 담당한 교사가 작성합니다. 원장은 조회만 할 수 있습니다.
      </p>

      <section className="mt-5 scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-bold text-navy">
              원아 관찰기록
            </h2>
            <p className="mt-1 text-micro text-ink-muted">
              총 {children.length.toLocaleString("ko-KR")}명
            </p>
          </div>
        </div>

        {children.length > 0 ? (
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                key: "complete",
                label:
                  OBSERVATION_RECORD_STATUS_LABELS.complete,
                value: completeCount,
              },
              {
                key: "draft",
                label:
                  OBSERVATION_RECORD_STATUS_LABELS.draft,
                value: draftCount,
              },
              {
                key: "missing",
                label: "미작성",
                value: missingCount,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-line bg-white px-2 py-2 text-center"
              >
                <dt className="text-micro font-semibold text-ink-muted">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-body-sm font-bold tabular-nums text-navy">
                  {item.value.toLocaleString("ko-KR")}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children.length === 0 ? (
          <p className="mt-4 rounded-xl border border-line bg-white px-4 py-10 text-center text-label leading-relaxed text-ink-muted">
            이 수업에 표시할 원아가 없습니다.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {children.map((child) => (
              <ObservationChildCard
                key={child.childId}
                sessionId={session.id}
                child={child}
                domains={domains}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function childStatusLabel(
  status: StaffObservationChild["childStatus"],
): string | null {
  if (status === "inactive") return "재원 중지";
  if (status === "graduated") return "졸업";
  return null;
}

interface ObservationChildCardProps {
  sessionId: string;
  child: StaffObservationChild;
  domains: ObservationDomain[];
}

function ObservationChildCard({
  sessionId,
  child,
  domains,
}: ObservationChildCardProps) {
  const statusLabel = childStatusLabel(
    child.childStatus,
  );

  const recordLabel = child.recordStatus
    ? OBSERVATION_RECORD_STATUS_LABELS[
        child.recordStatus
      ]
    : "미작성";

  return (
    <li className="scroll-mt-28 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-body-sm font-bold text-navy">
            {child.childName ?? "원아 이름 확인 불가"}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-micro text-ink-muted">
            {statusLabel ? (
              <span className="rounded border border-line px-1.5 py-0.5">
                {statusLabel}
              </span>
            ) : null}

            {/*
              수업 이후 다른 반으로 옮긴 원아. 기록은 이 수업에 남아 있으므로
              명단에서 빼지 않고 출처를 표시한다(07B "과거 출결"과 같은 규칙).
            */}
            {!child.isCurrentClassMember &&
            child.hasExistingObservation ? (
              <span className="rounded border border-line px-1.5 py-0.5">
                과거 기록
              </span>
            ) : null}
          </div>
        </div>

        <span className="text-micro font-semibold text-ink-muted">
          {recordLabel}
        </span>
      </div>

      <ObservationChildReadOnly
        child={child}
        domains={domains}
      />

      {/*
        SERVICE-09A — 활동사진.
        관찰 텍스트 유무와 무관하게 항상 자리를 둔다. 사진이 없으면 안내만 뜬다.
        (사진이 없다고 원아 카드를 감추지 않는다)
      */}
      <ObservationMediaSection
        sessionId={sessionId}
        childId={child.childId}
        childName={child.childName}
        media={child.media}
        canUpload={false}
        uploadBlockedReason={null}
      />

    </li>
  );
}

interface ObservationChildReadOnlyProps {
  child: StaffObservationChild;
  domains: ObservationDomain[];
}

/** 편집할 수 없는 원아의 기록을 그대로 보여준다. */
function ObservationChildReadOnly({
  child,
  domains,
}: ObservationChildReadOnlyProps) {
  const domainByCode = new Map(
    domains.map((domain) => [domain.code, domain]),
  );

  const hasText =
    Boolean(child.childVoice) ||
    Boolean(child.teacherNote);

  if (!child.hasExistingObservation) {
    return (
      <p className="mt-3 text-caption leading-relaxed text-ink-muted">
        아직 작성된 관찰기록이 없습니다.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div>
        <p className="text-micro font-bold text-ink-muted">
          관찰영역
        </p>

        {child.domainCodes.length === 0 ? (
          <p className="mt-1 text-caption text-ink-muted">
            선택된 관찰영역이 없습니다.
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {child.domainCodes.map((code) => {
              const domain =
                domainByCode.get(code) ?? null;

              return (
                <li
                  key={code}
                  className="rounded-md border border-trust-blue/30 bg-trust-blue/5 px-2 py-1 text-micro font-semibold text-navy"
                >
                  {/*
                    은퇴한 영역도 과거 기록에는 그대로 남는다.
                    label을 감추면 무엇을 관찰했는지 알 수 없게 되므로
                    표시하되 현재 선택 목록에 없다는 것만 덧붙인다.
                  */}
                  {domain?.label ?? code}
                  {domain && !domain.isActive ? (
                    <span className="ml-1 font-normal text-ink-muted">
                      (사용 중지)
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <p className="text-micro font-bold text-ink-muted">
          아이의 말
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-caption leading-relaxed text-navy">
          {child.childVoice ?? "기록 없음"}
        </p>
      </div>

      <div>
        <p className="text-micro font-bold text-ink-muted">
          교사 관찰
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-caption leading-relaxed text-navy">
          {child.teacherNote ?? "기록 없음"}
        </p>
      </div>

      {/*
        서술이 둘 다 비어 있는 draft는 정상적으로 존재할 수 있다
        (complete만 내용을 요구한다). 빈 카드처럼 보이지 않게 알린다.
      */}
      {!hasText ? (
        <p className="text-micro leading-relaxed text-ink-muted">
          아직 서술 내용이 입력되지 않은 기록입니다.
        </p>
      ) : null}
    </div>
  );
}
