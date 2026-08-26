import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchOrganization } from "@/lib/admin/organization-queries";
import { fetchProgram } from "@/lib/admin/curriculum-queries";
import {
  buildClassSessionItems,
  buildClassSessionSummary,
  buildSchedulableLessons,
  fetchAssignmentClassSessions,
  fetchClassById,
  fetchClassProgramAssignment,
  fetchProgramLessonsForSessions,
  hasPublishedLesson as hasPublishedLessonIn,
} from "@/lib/admin/class-session-queries";
import {
  ASSIGNMENT_STATUS_BADGE_CLASSES,
  ASSIGNMENT_STATUS_LABELS,
  formatAssignmentDate,
  formatClassOptionLabel,
} from "@/lib/admin/class-program";
import {
  CURRICULUM_STATUS_BADGE_CLASSES,
  CURRICULUM_STATUS_LABELS,
} from "@/lib/admin/curriculum";
import { CLASS_STATUS_LABELS } from "@/lib/admin/class-child";
import { ClassSessionSection } from "./ClassSessionSection";

export const metadata: Metadata = {
  title: "수업 실행 관리 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AssignmentSessionPageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-navy/8 py-3 sm:border-b-0">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="text-[14px] text-navy">{children}</dd>
    </div>
  );
}

/**
 * 배정 상세 — 이 반이 이 프로그램으로 실제 진행한 수업 이력.
 *
 * 기관 상세 안의 Dialog가 아니라 별도 Route로 뺀 이유:
 *   - 한 배정의 수업이 프로그램 차시 수만큼(보통 8~16행) 생겨 표가 필요하다.
 *   - "어느 기관 · 어느 반 · 어느 프로그램"이라는 맥락이 계속 보여야 한다.
 *   - 운영자가 특정 배정을 북마크·공유할 수 있다.
 *
 * ★ 배정이 completed/cancelled여도 이 페이지는 열린다.
 *   지난 수업 이력을 보고, 남아 있는 열린 수업을 정리하는 용도다.
 */
export default async function AssignmentSessionPage({
  params,
}: AssignmentSessionPageProps) {
  const { supabase } = await requireAdmin();
  const { id, assignmentId } = await params;

  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(assignmentId)) {
    notFound();
  }

  const assignmentResult = await fetchClassProgramAssignment(
    supabase,
    assignmentId,
  );

  if (!assignmentResult.ok) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-navy">
            배정 정보를 불러오지 못했습니다.
          </p>
          <p className="mt-1.5 text-[13px] text-navy/50">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  const assignment = assignmentResult.assignment;

  // ★ URL 조작 차단 — 이 배정이 정말 이 기관의 것이 아니면 404로 처리한다.
  //   SOYES 운영자는 RLS상 모든 기관의 배정을 볼 수 있어 RLS가 막아 주지 않는다.
  if (!assignment || assignment.organization_id !== id) {
    notFound();
  }

  // 배정을 확인한 뒤에야 나머지를 병렬로 읽는다.
  // 반·프로그램 id는 배정 행에서 도출하므로 URL로 바꿔치기할 수 없다.
  const [organizationResult, classResult, programResult, lessonResult, sessionResult] =
    await Promise.all([
      fetchOrganization(supabase, id),
      fetchClassById(supabase, assignment.class_id),
      fetchProgram(supabase, assignment.program_id),
      fetchProgramLessonsForSessions(supabase, assignment.program_id),
      fetchAssignmentClassSessions(supabase, assignment.id),
    ]);

  const organization = organizationResult.ok
    ? organizationResult.organization
    : null;
  const classRow = classResult.ok ? classResult.classRow : null;
  const program = programResult.ok ? programResult.program : null;

  if (!organization || !classRow || !program) {
    notFound();
  }

  const lessons = lessonResult.ok ? lessonResult.lessons : [];
  const sessions = sessionResult.ok ? sessionResult.sessions : [];

  const sessionItems = buildClassSessionItems(sessions, lessons);
  const summary = buildClassSessionSummary(sessions);
  const schedulableLessons = buildSchedulableLessons(lessons, sessions);
  const hasPublishedLesson = hasPublishedLessonIn(lessons);

  /**
   * 새 수업을 열 수 있는가 = 배정 active + 반 active + 프로그램 published.
   * 차시 published 여부는 후보 목록과 행 단위 판정에서 따로 본다.
   * (Server Action과 DB trigger가 같은 조건을 다시 확인한다.)
   */
  const canOpenNewSession =
    assignment.status === "active" &&
    classRow.status === "active" &&
    program.status === "published";

  const isAssignmentTerminal = assignment.status !== "active";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
      {/* Breadcrumb — 모바일에서도 줄바꿈되도록 flex-wrap */}
      <nav
        aria-label="이동 경로"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]"
      >
        <Link
          href="/admin/organizations"
          className="font-semibold text-trust-blue transition-opacity hover:opacity-70"
        >
          기관 관리
        </Link>
        <span aria-hidden className="text-navy/30">
          ›
        </span>
        <Link
          href={`/admin/organizations/${organization.id}`}
          className="max-w-[200px] truncate font-semibold text-trust-blue transition-opacity hover:opacity-70 sm:max-w-none"
        >
          {organization.name}
        </Link>
        <span aria-hidden className="text-navy/30">
          ›
        </span>
        <span className="text-navy/55">수업 프로그램 운영</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-navy">
          {classRow.name} · {program.title}
        </h1>
        <span
          className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${ASSIGNMENT_STATUS_BADGE_CLASSES[assignment.status]}`}
        >
          {ASSIGNMENT_STATUS_LABELS[assignment.status]}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-navy/50">
        {program.code} · 배정 시작 {formatAssignmentDate(assignment.start_date)}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">배정 정보</h2>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-3 sm:gap-y-4">
            <InfoCell label="기관">{organization.name}</InfoCell>
            <InfoCell label="반">
              {formatClassOptionLabel(
                classRow.name,
                classRow.age_group,
                classRow.school_year,
              )}
              {classRow.status !== "active" ? (
                <span className="ml-1.5 text-[12px] text-navy/45">
                  ({CLASS_STATUS_LABELS[classRow.status]})
                </span>
              ) : null}
            </InfoCell>
            <InfoCell label="프로그램">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {program.title}
                <span
                  className={`rounded-md border px-2 py-0.5 text-[12px] font-semibold ${CURRICULUM_STATUS_BADGE_CLASSES[program.status]}`}
                >
                  {CURRICULUM_STATUS_LABELS[program.status]}
                </span>
              </span>
            </InfoCell>
            <InfoCell label="프로그램 코드">{program.code}</InfoCell>
            <InfoCell label="배정 상태">
              {ASSIGNMENT_STATUS_LABELS[assignment.status]}
            </InfoCell>
            <InfoCell label="배정 시작일">
              {formatAssignmentDate(assignment.start_date)}
            </InfoCell>
          </dl>

          {isAssignmentTerminal ? (
            <p className="mt-4 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2 text-[12px] leading-relaxed text-navy/60">
              이 프로그램 배정은 종료되었습니다. 기존 수업 이력을 확인하거나,
              남아 있는 열린 수업을 완료·취소로 정리할 수 있습니다. 새 수업
              일정은 등록할 수 없습니다.
            </p>
          ) : null}

          {!isAssignmentTerminal && classRow.status !== "active" ? (
            <p className="mt-4 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2 text-[12px] leading-relaxed text-navy/60">
              보관된 반입니다. 기존 수업은 완료·취소로 정리할 수 있지만 새 수업은
              등록할 수 없습니다.
            </p>
          ) : null}

          {!isAssignmentTerminal &&
          classRow.status === "active" &&
          program.status !== "published" ? (
            <p className="mt-4 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2 text-[12px] leading-relaxed text-navy/60">
              게시 중이 아닌 프로그램입니다. 기존 수업은 정리할 수 있지만 새
              수업은 등록할 수 없습니다.
            </p>
          ) : null}
        </section>

        <ClassSessionSection
          organizationId={organization.id}
          assignmentId={assignment.id}
          programId={program.id}
          sessions={sessionItems}
          summary={summary}
          schedulableLessons={schedulableLessons}
          hasPublishedLesson={hasPublishedLesson}
          canOpenNewSession={canOpenNewSession}
          hasError={!sessionResult.ok || !lessonResult.ok}
        />
      </div>
    </div>
  );
}
