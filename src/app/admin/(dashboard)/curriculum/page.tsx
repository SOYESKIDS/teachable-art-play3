import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildProgramListItems,
  buildStatusSummary,
  fetchProgramList,
} from "@/lib/admin/curriculum-queries";
import { ProgramFormDialog } from "./ProgramFormDialog";
import { ProgramEmptyState, ProgramListSection } from "./ProgramListSection";

export const metadata: Metadata = {
  title: "수업 프로그램 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCurriculumPage() {
  // Layout에서도 검사하지만, 데이터를 다루는 페이지에서 독립적으로 다시 확인한다.
  const { supabase } = await requireAdmin();

  // 프로그램 목록과 차시 수를 질의 2회로 가져온다(프로그램마다 count 질의 없음).
  const result = await fetchProgramList(supabase);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
        <h1 className="text-[22px] font-bold text-navy">수업 프로그램</h1>
        <div className="mt-6 rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-navy">
            프로그램 데이터를 불러오지 못했습니다.
          </p>
          <p className="mt-1.5 text-[13px] text-navy/50">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  const programs = buildProgramListItems(
    result.programs,
    result.lessonCountByProgramId,
  );
  const summary = buildStatusSummary(result.programs);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold text-navy">수업 프로그램</h1>
          <p className="text-[14px] text-navy/55">
            TeachAble Art Play에서 사용하는 공용 교육 프로그램을 관리합니다.
          </p>
        </div>

        {programs.length > 0 ? (
          <div className="shrink-0">
            <ProgramFormDialog />
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "전체", value: summary.total },
            { label: "초안", value: summary.draft },
            { label: "게시", value: summary.published, accent: true },
            { label: "보관", value: summary.archived },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border bg-white px-4 py-3.5 ${
                item.accent ? "border-yellow/50" : "border-navy/10"
              }`}
            >
              <dt className="text-[11px] font-semibold text-navy/45">
                {item.label}
              </dt>
              <dd className="mt-1 text-[24px] font-bold tabular-nums text-navy">
                {item.value.toLocaleString("ko-KR")}
              </dd>
            </div>
          ))}
        </dl>

        {programs.length === 0 ? (
          <ProgramEmptyState />
        ) : (
          <ProgramListSection programs={programs} />
        )}
      </div>
    </div>
  );
}
