import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import {
  fetchOrganization,
  fetchOrganizationDirectors,
} from "@/lib/admin/organization-queries";
import { fetchAuthEmailById } from "@/lib/admin/director-invite";
import {
  buildChildListItems,
  buildChildSummary,
  buildClassListItems,
  buildClassSummary,
  fetchOrganizationChildren,
  fetchOrganizationClasses,
} from "@/lib/admin/class-child-queries";
import {
  buildTeacherAssignments,
  buildTeacherNamesByClassId,
  buildTeacherSummary,
  fetchOrganizationClassTeachers,
  fetchOrganizationTeachers,
} from "@/lib/admin/class-teacher-queries";
import { DirectorInviteDialog } from "./DirectorInviteDialog";
import { TeacherAssignmentSection } from "./TeacherAssignmentSection";
import { ClassManagementSection } from "./ClassManagementSection";
import { ChildManagementSection } from "./ChildManagementSection";
import {
  ORGANIZATION_STATUS_BADGE_CLASSES,
  ORGANIZATION_STATUS_LABELS,
  formatInstitutionType,
  formatOrganizationDateTime,
} from "@/lib/admin/organization-labels";
import { OrganizationEditForm } from "./OrganizationEditForm";

export const metadata: Metadata = {
  title: "기관 상세 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-navy/8 py-3 last:border-b-0">
      <dt className="text-[11px] font-semibold text-navy/45">{label}</dt>
      <dd className="text-[14px] text-navy">{value}</dd>
    </div>
  );
}

/**
 * 기관 상세는 Drawer가 아니라 독립 Route로 만든다.
 * 앞으로 원장/교사·반·아이·계약 정보가 이 화면에 붙을 예정이라
 * 자체 데이터 로딩과 URL을 갖는 편이 유지보수에 유리하다.
 */
export default async function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const result = await fetchOrganization(supabase, id);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-8">
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-navy">
            기관 데이터를 불러오지 못했습니다.
          </p>
          <p className="mt-1.5 text-[13px] text-navy/50">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!result.organization) {
    notFound();
  }

  const organization = result.organization;

  const directorResult = await fetchOrganizationDirectors(supabase, id);

  // 이메일은 auth.users에만 있어 Auth Admin으로 보강한다(원장 수는 소수).
  // 실패해도 화면을 막지 않고 "—"로 표시한다.
  const directors = directorResult.ok
    ? await Promise.all(
        directorResult.members.map(async (member) => ({
          ...member,
          email: await fetchAuthEmailById(member.userId),
        })),
      )
    : [];

  // 서로 참조하지 않는 독립 질의 4개라 한 번에 병렬로 가져온다.
  // 이후 집계(반별 재원 원아 수, 교사별 담당 반, 반별 담당 교사)는 전부
  // 이 배열들을 메모리에서 join해서 만든다 — 행마다 질의를 반복하지 않는다(N+1 없음).
  const [classResult, childResult, teacherResult, assignmentResult] =
    await Promise.all([
      fetchOrganizationClasses(supabase, id),
      fetchOrganizationChildren(supabase, id),
      fetchOrganizationTeachers(supabase, id),
      fetchOrganizationClassTeachers(supabase, id),
    ]);

  const classRows = classResult.ok ? classResult.classes : [];
  const childRows = childResult.ok ? childResult.children : [];
  const teacherRows = teacherResult.ok ? teacherResult.teachers : [];
  const assignmentRows = assignmentResult.ok ? assignmentResult.assignments : [];

  const classListItems = buildClassListItems(classRows, childRows);
  const childListItems = buildChildListItems(childRows, classRows);

  const teacherAssignments = buildTeacherAssignments(
    teacherRows,
    assignmentRows,
    classRows,
  );

  // 신규 배정 후보는 운영 중인 반뿐이다(보관된 반에는 새로 배정하지 않는다).
  const assignableClasses = classListItems.filter(
    (classRow) => classRow.status === "active",
  );

  const teacherNamesByClassId = buildTeacherNamesByClassId(
    assignmentRows,
    teacherRows,
  );

  // 등록 폼의 학년도 기본값. Client에서 계산하면 Hydration 불일치 위험이 있어 서버에서 정한다.
  const defaultSchoolYear = new Date().getFullYear();

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-8">
      <Link
        href="/admin/organizations"
        className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
      >
        ← 기관 목록
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-navy">{organization.name}</h1>
        <span
          className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${ORGANIZATION_STATUS_BADGE_CLASSES[organization.status]}`}
        >
          {ORGANIZATION_STATUS_LABELS[organization.status]}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">기관 정보</h2>
          <dl className="mt-2">
            <Field label="기관명" value={organization.name} />
            <Field
              label="기관 유형"
              value={formatInstitutionType(organization.institution_type)}
            />
            <Field
              label="상태"
              value={ORGANIZATION_STATUS_LABELS[organization.status]}
            />
            <Field
              label="등록일"
              value={formatOrganizationDateTime(organization.created_at)}
            />
            <Field
              label="최근 수정일"
              value={formatOrganizationDateTime(organization.updated_at)}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">기관 정보 수정</h2>
          <p className="mt-1 mb-4 text-[12px] text-navy/50">
            기관명과 기관 유형만 수정할 수 있습니다. 상태 변경은 후속 단계에서
            제공됩니다.
          </p>
          <OrganizationEditForm organization={organization} />
        </section>

        <section className="rounded-xl border border-navy/10 bg-white p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy">원장 관리</h2>
              <p className="mt-1 text-[12px] text-navy/50">
                초대 메일을 받은 원장이 비밀번호를 설정하면 바로 로그인할 수
                있습니다.
              </p>
            </div>
            {directors.length > 0 ? (
              <DirectorInviteDialog
                organizationId={organization.id}
                variant="outline"
              />
            ) : null}
          </div>

          {!directorResult.ok ? (
            <p className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-6 text-center text-[13px] text-navy/55">
              원장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          ) : directors.length === 0 ? (
            <div className="mt-5 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy">
                등록된 원장이 없습니다.
              </p>
              <div className="mt-4 flex justify-center">
                <DirectorInviteDialog organizationId={organization.id} />
              </div>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {directors.map((director) => (
                <li
                  key={director.userId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy/10 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-navy">
                      {director.displayName}
                    </p>
                    <p className="truncate text-[12px] text-navy/50">
                      {director.email ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-md border border-navy/15 bg-surface-soft px-2 py-0.5 text-[12px] font-semibold text-navy/70">
                      원장
                    </span>
                    <span className="rounded-md border border-navy/15 bg-surface-soft px-2 py-0.5 text-[12px] font-semibold text-navy/70">
                      {director.status === "active"
                        ? "활성"
                        : director.status === "invited"
                          ? "초대됨"
                          : "비활성"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ClassManagementSection
          organizationId={organization.id}
          defaultSchoolYear={defaultSchoolYear}
          classes={classListItems}
          teacherNamesByClassId={teacherNamesByClassId}
          summary={buildClassSummary(classRows)}
          hasError={!classResult.ok}
          reachedLimit={classResult.ok && classResult.reachedLimit}
        />

        <ChildManagementSection
          organizationId={organization.id}
          childRows={childListItems}
          classes={classListItems}
          summary={buildChildSummary(childRows)}
          hasError={!childResult.ok}
          reachedLimit={childResult.ok && childResult.reachedLimit}
        />

        <TeacherAssignmentSection
          organizationId={organization.id}
          teachers={teacherAssignments}
          assignableClasses={assignableClasses}
          summary={buildTeacherSummary(teacherAssignments)}
          hasError={!teacherResult.ok || !assignmentResult.ok}
        />
      </div>
    </div>
  );
}
