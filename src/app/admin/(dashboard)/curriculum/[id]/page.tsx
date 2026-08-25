import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { formatAgeGroup } from "@/lib/admin/class-child";
import {
  buildLessonListItems,
  buildStatusSummary,
  fetchProgram,
  fetchProgramLessons,
} from "@/lib/admin/curriculum-queries";
import {
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
  formatOptionalText,
} from "@/lib/admin/curriculum";
import { formatOrganizationDateTime } from "@/lib/admin/organization-labels";
import { ProgramFormDialog } from "../ProgramFormDialog";
import { LessonManagementSection } from "./LessonManagementSection";

export const metadata: Metadata = {
  title: "프로그램 상세 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-navy/8 py-3 last:border-b-0">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="whitespace-pre-line text-[14px] text-navy">{value}</dd>
    </div>
  );
}

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const programResult = await fetchProgram(supabase, id);

  if (!programResult.ok) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
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

  if (!programResult.program) {
    notFound();
  }

  const program = programResult.program;

  // 차시 목록 + 차시별 활동 수를 질의 2회로 가져온다(차시마다 count 질의 없음).
  const lessonResult = await fetchProgramLessons(supabase, id);

  const lessonRows = lessonResult.ok ? lessonResult.lessons : [];
  const lessons = buildLessonListItems(
    lessonRows,
    lessonResult.ok ? lessonResult.activityCountByLessonId : {},
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
      <Link
        href="/admin/curriculum"
        className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
      >
        ← 수업 프로그램 목록
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-navy">{program.title}</h1>
        <span
          className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${CURRICULUM_STATUS_BADGE_CLASSES[program.status]}`}
        >
          {CURRICULUM_STATUS_LABELS[program.status]}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-navy/50">{program.code}</p>

      <div className="mt-6 flex flex-col gap-5">
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy">프로그램 정보</h2>
              <p className="mt-1 text-[12px] text-navy/50">
                프로그램은 삭제하지 않고 상태로 관리합니다.
              </p>
            </div>
            <ProgramFormDialog program={program} variant="outline" />
          </div>

          <dl className="mt-2">
            <Field label="프로그램 코드" value={program.code} />
            <Field label="프로그램명" value={program.title} />
            <Field label="요약" value={formatOptionalText(program.summary)} />
            <Field
              label="권장 연령"
              value={formatAgeGroup(program.age_group)}
            />
            <Field label="운영 주차" value={`${program.duration_weeks}주`} />
            <Field
              label="상태"
              value={CURRICULUM_STATUS_LABELS[program.status]}
            />
            <Field
              label="등록일"
              value={formatOrganizationDateTime(program.created_at)}
            />
            <Field
              label="최근 수정일"
              value={formatOrganizationDateTime(program.updated_at)}
            />
          </dl>
        </section>

        <LessonManagementSection
          programId={program.id}
          durationWeeks={program.duration_weeks}
          isProgramArchived={program.status === "archived"}
          lessons={lessons}
          summary={buildStatusSummary(lessonRows)}
          hasError={!lessonResult.ok}
        />
      </div>
    </div>
  );
}
