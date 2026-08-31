import Link from "next/link";
import {
  CLASS_SESSION_STATUS_LABELS,
  formatLessonOrder,
  formatSessionDate,
} from "@/lib/admin/class-session";
import {
  OBSERVATION_RECORD_STATUS_LABELS,
  type ObservationDomain,
  type StaffObservationChild,
  type StaffObservationPageData,
} from "@/types/staff-observation";

type StaffRole = "director" | "teacher";

interface ObservationBoardProps {
  data: StaffObservationPageData;
  role: StaffRole;
  backHref: string;
}

/**
 * SERVICE-08B-1 — 교사 관찰기록 조회 화면.
 *
 * 이번 단계는 읽기 전용이다. 저장 UI는 다음 단계에서 붙는다.
 * 여기서 확정되는 것은 "무엇이 기록으로 남아 있는가"를 보여주는 방식이고,
 * 저장 단계는 이 화면 위에 입력 폼만 얹는다.
 *
 * ★ 이 화면은 아동을 평가하지 않는다.
 *   점수·등급·발달단계·위험도 같은 표시를 만들지 않는다.
 *   보여주는 것은 교사가 남긴 서술과 관찰영역 태그뿐이다.
 *
 * 표시 정책
 *   scheduled / in_progress / completed : 기록 조회
 *   cancelled                           : 기록 조회 (다음 단계에서도 저장 불가)
 *
 * 최종 권한 판정은 RLS가 한다. 이 화면은 이미 읽힌 것만 그린다.
 */
export function ObservationBoard({
  data,
  role,
  backHref,
}: ObservationBoardProps) {
  const { session, domains, children } = data;

  const domainByCode = new Map<string, ObservationDomain>(
    domains.map((domain) => [domain.code, domain]),
  );

  const sessionReadOnly =
    session.status === "cancelled";

  const teacherArchived =
    role === "teacher" &&
    session.classStatus !== "active";

  const completeCount = children.filter(
    (child) => child.recordStatus === "complete",
  ).length;

  const draftCount = children.filter(
    (child) => child.recordStatus === "draft",
  ).length;

  const missingCount =
    children.length - completeCount - draftCount;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center rounded-lg border border-navy/15 bg-white px-3 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            ← 수업 목록
          </Link>
        </div>

        <span className="rounded-md border border-navy/15 bg-white px-2.5 py-1 text-[12px] font-bold text-navy">
          {CLASS_SESSION_STATUS_LABELS[session.status]}
        </span>
      </div>

      <section className="mt-4 rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
        <p className="text-[13px] font-bold text-navy">
          {session.className ?? "반 정보 없음"}
          {session.classStatus === "archived" ? (
            <span className="ml-1 font-normal text-navy/45">
              (보관)
            </span>
          ) : null}
        </p>

        <p className="mt-1 text-[12px] text-navy/50">
          {formatLessonOrder(
            session.weekNo,
            session.sessionNo,
          )}
          {session.programTitle
            ? ` · ${session.programTitle}`
            : ""}
        </p>

        <h1 className="mt-1 break-words text-[20px] font-bold leading-snug text-navy">
          {session.lessonTitle ?? "차시 정보 없음"}
        </h1>

        <p className="mt-2 text-[13px] text-navy/50">
          예정일{" "}
          {formatSessionDate(session.scheduledDate)}
          {session.programCode
            ? ` · ${session.programCode}`
            : ""}
        </p>
      </section>

      <p className="mt-4 rounded-xl border border-navy/10 bg-white/60 px-4 py-3 text-[13px] leading-relaxed text-navy/60">
        지금은 저장된 관찰기록을 확인하는 화면입니다. 기록 작성과 수정은 다음 단계에서 열립니다.
      </p>

      {sessionReadOnly ? (
        <p className="mt-3 rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 text-[13px] leading-relaxed text-navy">
          취소된 수업입니다. 이미 남아 있는 관찰기록만 확인할 수 있습니다.
        </p>
      ) : null}

      {teacherArchived ? (
        <p className="mt-3 rounded-xl border border-yellow/50 bg-yellow-soft px-4 py-3 text-[13px] leading-relaxed text-navy">
          보관된 반입니다. 이미 남아 있는 관찰기록은 그대로 확인할 수 있습니다.
        </p>
      ) : null}

      <section className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-navy">
              원아 관찰기록
            </h2>
            <p className="mt-1 text-[12px] text-navy/50">
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
                className="rounded-lg border border-navy/10 bg-white px-2 py-2 text-center"
              >
                <dt className="text-[12px] font-semibold text-navy/55">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-navy">
                  {item.value.toLocaleString("ko-KR")}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children.length === 0 ? (
          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/50">
            이 수업에 표시할 원아가 없습니다.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {children.map((child) => (
              <ObservationChildCard
                key={child.childId}
                child={child}
                domainByCode={domainByCode}
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
  child: StaffObservationChild;
  domainByCode: Map<string, ObservationDomain>;
}

function ObservationChildCard({
  child,
  domainByCode,
}: ObservationChildCardProps) {
  const statusLabel = childStatusLabel(
    child.childStatus,
  );

  const recordLabel = child.recordStatus
    ? OBSERVATION_RECORD_STATUS_LABELS[
        child.recordStatus
      ]
    : "미작성";

  const hasText =
    Boolean(child.childVoice) ||
    Boolean(child.teacherNote);

  return (
    <li className="rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[15px] font-bold text-navy">
            {child.childName ?? "원아 이름 확인 불가"}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-navy/45">
            {statusLabel ? (
              <span className="rounded border border-navy/10 px-1.5 py-0.5">
                {statusLabel}
              </span>
            ) : null}

            {/*
              수업 이후 다른 반으로 옮긴 원아. 기록은 이 수업에 남아 있으므로
              명단에서 빼지 않고 출처를 표시한다(07B "과거 출결"과 같은 규칙).
            */}
            {!child.isCurrentClassMember &&
            child.hasExistingObservation ? (
              <span className="rounded border border-navy/10 px-1.5 py-0.5">
                과거 기록
              </span>
            ) : null}
          </div>
        </div>

        <span className="text-[12px] font-semibold text-navy/50">
          {recordLabel}
        </span>
      </div>

      {child.hasExistingObservation ? (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-bold text-navy/55">
              관찰영역
            </p>

            {child.domainCodes.length === 0 ? (
              <p className="mt-1 text-[13px] text-navy/45">
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
                      className="rounded-md border border-trust-blue/30 bg-trust-blue/5 px-2 py-1 text-[12px] font-semibold text-navy"
                    >
                      {/*
                        은퇴한 영역도 과거 기록에는 그대로 남는다.
                        label을 감추면 무엇을 관찰했는지 알 수 없게 되므로
                        표시하되 현재 선택 목록에 없다는 것만 덧붙인다.
                      */}
                      {domain?.label ?? code}
                      {domain && !domain.isActive ? (
                        <span className="ml-1 font-normal text-navy/45">
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
            <p className="text-[11px] font-bold text-navy/55">
              아이의 말
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-navy">
              {child.childVoice ?? "기록 없음"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-navy/55">
              교사 관찰
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-navy">
              {child.teacherNote ?? "기록 없음"}
            </p>
          </div>

          {/*
            서술이 둘 다 비어 있는 draft는 정상적으로 존재할 수 있다
            (complete만 내용을 요구한다). 빈 카드처럼 보이지 않게 알린다.
          */}
          {!hasText ? (
            <p className="text-[12px] leading-relaxed text-navy/45">
              아직 서술 내용이 입력되지 않은 기록입니다.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-navy/45">
          아직 작성된 관찰기록이 없습니다.
        </p>
      )}
    </li>
  );
}
