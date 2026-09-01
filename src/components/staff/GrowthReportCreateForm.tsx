"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrRefreshGrowthReportAction } from "@/lib/staff/growth-report-actions";
import type { GrowthReportClassOption } from "@/types/staff-growth-report";

interface GrowthReportCreateFormProps {
  options: GrowthReportClassOption[];
  organizationId: string;
}

/**
 * SERVICE-11A — 교사 성장 리포트 만들기.
 *
 * ★ 여기서 고르는 반·원아는 권한의 근거가 아니다.
 *   목록 자체가 RLS로 좁혀져 있고, 저장 시점에 RPC와 trigger가 다시 판정한다.
 *
 * ★ 근거로 쓸 관찰기록을 화면이 고르지 않는다.
 *   기간만 정하면 서버가 "검토 완료 + 원본이 그 뒤 바뀌지 않은" 기록을 직접 찾는다.
 *   근거가 하나도 없으면 리포트가 만들어지지 않는다.
 */
export function GrowthReportCreateForm({
  options,
  organizationId,
}: GrowthReportCreateFormProps) {
  const router = useRouter();

  // 운영 중인 반이 먼저 오도록 정렬해 기본값을 고른다.
  const activeFirst = [...options].sort((a, b) => {
    if (a.classStatus === b.classStatus) return 0;
    return a.classStatus === "active" ? -1 : 1;
  });

  const [classId, setClassId] = useState(
    activeFirst[0]?.classId ?? "",
  );
  const [childId, setChildId] = useState(
    activeFirst[0]?.children[0]?.childId ?? "",
  );
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const selectedClass =
    activeFirst.find((item) => item.classId === classId) ?? null;

  const canSubmit =
    classId !== "" &&
    childId !== "" &&
    periodStart !== "" &&
    periodEnd !== "" &&
    periodStart <= periodEnd &&
    !isPending;

  async function handleCreate() {
    if (!canSubmit) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await createOrRefreshGrowthReportAction({
        classId,
        childId,
        periodStart,
        periodEnd,
      });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      router.push(
        `/teacher/growth-reports/${result.reportId}?org=${encodeURIComponent(
          organizationId,
        )}`,
      );
    } finally {
      setIsPending(false);
    }
  }

  if (options.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-8 text-center text-[13px] leading-relaxed text-navy/50">
        담당하는 반이 없어 성장 리포트를 만들 수 없습니다.
      </p>
    );
  }

  const controlClasses =
    "h-11 w-full rounded-lg border border-navy/15 bg-white px-3 text-[14px] font-medium text-navy transition-colors focus:border-trust-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section className="mt-4 rounded-xl border border-navy/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy">
            새 성장 리포트
          </h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-navy/50">
            기간을 정하면 그 기간의 검토 완료 관찰기록을 근거로 모읍니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="min-h-11 rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5"
        >
          {open ? "닫기" : "리포트 만들기"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="gr-create-class"
                className="text-[11px] font-bold text-navy/55"
              >
                반
              </label>
              <select
                id="gr-create-class"
                value={classId}
                disabled={isPending}
                onChange={(event) => {
                  const next = event.target.value;
                  setClassId(next);
                  const nextClass = activeFirst.find(
                    (item) => item.classId === next,
                  );
                  setChildId(nextClass?.children[0]?.childId ?? "");
                }}
                className={`mt-1.5 ${controlClasses}`}
              >
                {activeFirst.map((item) => (
                  <option key={item.classId} value={item.classId}>
                    {item.className}
                    {item.classStatus === "archived" ? " (보관)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="gr-create-child"
                className="text-[11px] font-bold text-navy/55"
              >
                원아
              </label>
              <select
                id="gr-create-child"
                value={childId}
                disabled={isPending || !selectedClass}
                onChange={(event) => setChildId(event.target.value)}
                className={`mt-1.5 ${controlClasses}`}
              >
                {(selectedClass?.children ?? []).map((child) => (
                  <option key={child.childId} value={child.childId}>
                    {child.childName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="gr-create-start"
                className="text-[11px] font-bold text-navy/55"
              >
                기간 시작
              </label>
              <input
                id="gr-create-start"
                type="date"
                value={periodStart}
                disabled={isPending}
                onChange={(event) => setPeriodStart(event.target.value)}
                className={`mt-1.5 ${controlClasses}`}
              />
            </div>

            <div>
              <label
                htmlFor="gr-create-end"
                className="text-[11px] font-bold text-navy/55"
              >
                기간 종료
              </label>
              <input
                id="gr-create-end"
                type="date"
                value={periodEnd}
                disabled={isPending}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className={`mt-1.5 ${controlClasses}`}
              />
            </div>
          </div>

          {selectedClass?.children.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-navy/45">
              이 반에 등록된 원아가 없습니다.
            </p>
          ) : null}

          {message ? (
            <p
              role={isError ? "alert" : "status"}
              aria-live="polite"
              className={`rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed ${
                isError
                  ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
                  : "border-soft-green/50 bg-soft-green/15 text-navy"
              }`}
            >
              {message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="min-h-12 w-full rounded-lg bg-navy px-6 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:self-end"
          >
            {isPending ? "만드는 중..." : "리포트 만들기"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
