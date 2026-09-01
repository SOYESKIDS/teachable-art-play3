"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createOrRefreshGrowthReportAction,
  saveGrowthReportAction,
} from "@/lib/staff/growth-report-actions";
import {
  MAX_GROWTH_CHANGES,
  MAX_GROWTH_REPORT_TITLE,
  MAX_NEXT_SUPPORT,
  MAX_OBSERVATION_SUMMARY,
  type GrowthReportDetail,
} from "@/types/staff-growth-report";

interface GrowthReportEditorProps {
  report: GrowthReportDetail;
}

/**
 * SERVICE-11A — 교사 성장 리포트 편집.
 *
 * ★ 작성 완료(complete)는 잠금이다.
 *   완료된 리포트는 DB UPDATE Policy의 USING이 status='draft'를 요구해
 *   교사에게도 수정 대상이 아니게 된다. 그래서 완료 후에는 이 컴포넌트가
 *   입력칸을 아예 렌더하지 않는다 — 눌러도 안 되는 버튼을 남기지 않는다.
 *
 * ★ 이 화면은 아동을 평가하지 않는다.
 *   점수·등급·발달단계 입력칸이 없고, 서술 세 칸만 있다.
 */
export function GrowthReportEditor({ report }: GrowthReportEditorProps) {
  const router = useRouter();

  const locked = report.status === "complete";

  const [title, setTitle] = useState(report.title);
  const [growth, setGrowth] = useState(report.growthChanges ?? "");
  const [summary, setSummary] = useState(
    report.observationSummary ?? "",
  );
  const [support, setSupport] = useState(report.nextSupport ?? "");

  const [token, setToken] = useState(report.updatedAt);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  /**
   * 서버가 새 값을 내려주면 편집 중이 아닐 때만 맞춘다.
   * (렌더 중 setState는 이 프로젝트가 쓰는 prop 동기화 패턴이다)
   */
  const serverSignature = JSON.stringify([
    report.updatedAt,
    report.status,
    report.title,
    report.growthChanges,
    report.observationSummary,
    report.nextSupport,
  ]);

  const [syncedSignature, setSyncedSignature] =
    useState(serverSignature);

  if (syncedSignature !== serverSignature && !editing && !isPending) {
    setSyncedSignature(serverSignature);
    setTitle(report.title);
    setGrowth(report.growthChanges ?? "");
    setSummary(report.observationSummary ?? "");
    setSupport(report.nextSupport ?? "");
    setToken(report.updatedAt);
  }

  const hasAll =
    growth.trim() !== "" &&
    summary.trim() !== "" &&
    support.trim() !== "";

  async function save(status: "draft" | "complete") {
    if (isPending || locked) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await saveGrowthReportAction({
        reportId: report.id,
        title,
        growthChanges: growth,
        observationSummary: summary,
        nextSupport: support,
        status,
        // ★ 서버가 준 문자열 그대로. 가공하면 영구 stale이 된다.
        expectedUpdatedAt: token,
      });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      // 성공 직후 새 토큰으로 갈아끼운다 — 새로고침을 기다리지 않고 연속 저장이 된다.
      setToken(result.updatedAt);
      setEditing(false);
      setIsError(false);
      setMessage(
        status === "complete"
          ? "리포트를 작성 완료로 저장했습니다."
          : "리포트를 임시저장했습니다.",
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function refreshSources() {
    if (isPending || locked) return;

    setIsPending(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await createOrRefreshGrowthReportAction({
        classId: report.classId,
        childId: report.childId,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        title: report.title,
      });

      if (!result.ok) {
        setIsError(true);
        setMessage(result.message);
        return;
      }

      setIsError(false);
      setMessage(
        `근거 관찰기록 ${result.sourceCount.toLocaleString("ko-KR")}건을 다시 모았습니다.`,
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  const notice = message ? (
    <p
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={`mt-3 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed ${
        isError
          ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
          : "border-soft-green/50 bg-soft-green/15 text-navy"
      }`}
    >
      {message}
    </p>
  ) : null;

  // ── 완료된 리포트: 읽기 전용 ──────────────────────────────────
  if (locked) {
    return (
      <section className="mt-6 scroll-mt-28">
        <h2 className="text-[15px] font-bold text-navy">리포트 내용</h2>

        <p className="mt-2 rounded-xl border border-soft-green/50 bg-soft-green/15 px-4 py-3 text-[13px] leading-relaxed text-navy">
          교사 작성 완료된 리포트입니다. 완료 후에는 내용과 근거가 바뀌지
          않습니다.
        </p>

        <div className="mt-3 flex flex-col gap-4">
          <ReadOnlyBlock label="성장 변화" value={report.growthChanges} />
          <ReadOnlyBlock
            label="관찰 요약"
            value={report.observationSummary}
          />
          <ReadOnlyBlock
            label="다음 지원 방향"
            value={report.nextSupport}
          />
        </div>
      </section>
    );
  }

  // ── 작성 중 ──────────────────────────────────────────────────
  return (
    <section className="mt-6 scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-navy">리포트 작성</h2>

        <button
          type="button"
          onClick={refreshSources}
          disabled={isPending}
          className="min-h-11 rounded-lg border border-navy/20 bg-white px-3 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending ? "처리 중..." : "근거 다시 모으기"}
        </button>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-navy/45">
        근거를 다시 모으면 이 기간의 검토 완료 기록으로 목록이 갱신됩니다.
        작성한 글은 그대로 유지됩니다.
      </p>

      <div className="mt-3 flex flex-col gap-4">
        <Field
          id={`gr-title-${report.id}`}
          label="리포트 제목"
          value={title}
          max={MAX_GROWTH_REPORT_TITLE}
          rows={1}
          disabled={isPending}
          onChange={(value) => {
            setEditing(true);
            setTitle(value);
          }}
        />

        <Field
          id={`gr-growth-${report.id}`}
          label="성장 변화"
          placeholder="기간 동안 관찰된 변화를 사실 그대로 적어주세요."
          value={growth}
          max={MAX_GROWTH_CHANGES}
          rows={6}
          disabled={isPending}
          onChange={(value) => {
            setEditing(true);
            setGrowth(value);
          }}
        />

        <Field
          id={`gr-summary-${report.id}`}
          label="관찰 요약"
          placeholder="근거 기록에서 반복해서 보인 장면을 정리해주세요."
          value={summary}
          max={MAX_OBSERVATION_SUMMARY}
          rows={6}
          disabled={isPending}
          onChange={(value) => {
            setEditing(true);
            setSummary(value);
          }}
        />

        <Field
          id={`gr-support-${report.id}`}
          label="다음 지원 방향"
          placeholder="다음 기간에 어떤 활동과 도움을 준비할지 적어주세요."
          value={support}
          max={MAX_NEXT_SUPPORT}
          rows={5}
          disabled={isPending}
          onChange={(value) => {
            setEditing(true);
            setSupport(value);
          }}
        />
      </div>

      {notice}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={isPending}
          className="min-h-12 rounded-lg border border-navy/20 bg-white px-6 text-[14px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending ? "저장 중..." : "임시저장"}
        </button>

        {/*
          완료는 세 칸이 모두 필요하다. 여기서 미리 막아 헛된 왕복을 줄일 뿐,
          최종 판정은 RPC(GR001)와 컬럼 CHECK다.
        */}
        <button
          type="button"
          onClick={() => save("complete")}
          disabled={isPending || !hasAll}
          title={
            hasAll
              ? undefined
              : "성장 변화 · 관찰 요약 · 다음 지원 방향을 모두 입력해야 완료할 수 있습니다."
          }
          className="min-h-12 rounded-lg bg-navy px-6 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending ? "저장 중..." : "작성완료"}
        </button>
      </div>

      <p className="mt-2 text-right text-[11px] leading-relaxed text-navy/45">
        작성완료 이후에는 내용과 근거를 수정할 수 없습니다.
      </p>
    </section>
  );
}

function ReadOnlyBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-navy/55">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-navy">
        {value ?? "작성된 내용이 없습니다."}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  max,
  rows,
  disabled,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  rows: number;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  // PostgreSQL char_length와 같은 기준(code point)으로 센다.
  const count = [...value].length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[11px] font-bold text-navy/55"
        >
          {label}
        </label>
        <span
          className="text-[11px] tabular-nums text-navy/45"
          aria-hidden="true"
        >
          {count.toLocaleString("ko-KR")} / {max.toLocaleString("ko-KR")}
        </span>
      </div>

      <textarea
        id={id}
        value={value}
        onChange={(event) => {
          // 값은 updater 밖에서 먼저 읽는다(React 렌더 단계 재실행 대비).
          const next = event.target.value;
          onChange(next);
        }}
        readOnly={disabled}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        className="mt-1.5 w-full scroll-mt-28 rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy placeholder:text-navy/30 read-only:cursor-not-allowed read-only:opacity-60 focus:border-trust-blue/60 focus:outline-none"
      />
    </div>
  );
}
