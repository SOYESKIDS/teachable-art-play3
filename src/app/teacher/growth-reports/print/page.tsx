import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth/organization";
import { fetchClassEntitlements } from "@/lib/entitlement/queries";
import { resolveMembership } from "@/lib/staff/membership";
import {
  fetchClassPrintBundle,
  printBundleTitle,
  type PrintSelector,
} from "@/lib/staff/report-print-queries";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { ClassPrintSheet } from "@/components/staff/ClassPrintSheet";
import { ReportPrintActions } from "@/components/staff/ReportPrintActions";
import { TEACHER_NAV } from "../../nav";
import "./report-print.css";

export const metadata: Metadata = {
  title: "리포트 인쇄 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface PrintPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const TERM_KEY_PATTERN = /^[a-z0-9_-]{1,40}$/;

function resolveSelector(
  params: Record<string, string | string[] | undefined>,
): PrintSelector | null {
  const week = Number(first(params.week));
  if (Number.isInteger(week) && week >= 1 && week <= 52) {
    return { kind: "weekly", weekNo: week };
  }

  const block = Number(first(params.block));
  if (Number.isInteger(block) && block >= 1 && block <= 13) {
    return { kind: "monthly", blockNo: block };
  }

  const term = first(params.term);
  if (typeof term === "string" && TERM_KEY_PATTERN.test(term)) {
    return { kind: "semester", termKey: term };
  }

  return null;
}

/**
 * 반 단위 리포트 인쇄 — 사용자 지시 항목 1.
 *
 * ★ 일괄 인쇄는 등록된 기능이다 (`bulk_print` · P1).
 *   계약에 없거나 아직 출시되지 않았으면 지면을 만들지 않고 이유를 적는다.
 *   "준비 중"을 빈 종이로 보여 주지 않는다.
 *
 * ★ 완료본만 · 숨김 제외 · 사진 없음. 조회 계층이 그렇게 만든다.
 *   제외한 건수는 화면에 적는다.
 *
 * ★ PDF 파일을 서버에서 만들지 않는다. 브라우저 인쇄 대화상자를 쓴다.
 */
export default async function TeacherReportPrintPage({ searchParams }: PrintPageProps) {
  const { supabase, email, memberships } = await requireTeacher();
  const params = await searchParams;
  const membership = resolveMembership(memberships, params.org);

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath="/teacher/growth-reports/print"
        roleLabel="교사"
      />
    );
  }

  const assignmentId = first(params.assignment) ?? "";
  const classId = first(params.class) ?? "";
  const selector = resolveSelector(params);
  const backHref = `/teacher/growth-reports?org=${encodeURIComponent(membership.organizationId)}`;

  const shell = (body: React.ReactNode) => (
    <StaffShell
      email={email}
      roleLabel="교사"
      organizationName={membership.organizationName}
      navItems={TEACHER_NAV}
      currentHref="/teacher/growth-reports"
    >
      {body}
    </StaffShell>
  );

  if (!assignmentId || !classId || !selector) {
    return shell(
      <>
        <h1 className="text-[24px] font-bold text-ink">리포트 인쇄</h1>
        <p className="mt-4 rounded-xl border border-hairline bg-white px-4 py-6 text-[15px] text-ink">
          인쇄할 반과 기간을 확인할 수 없습니다. 리포트 화면에서 다시 들어와 주세요.
        </p>
        <Link href={backHref} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-navy underline">
          리포트로 돌아가기
        </Link>
      </>,
    );
  }

  const entitlements = await fetchClassEntitlements(supabase, classId);

  if (!entitlements.bulkPrint) {
    return shell(
      <>
        <h1 className="text-[24px] font-bold text-ink">리포트 인쇄</h1>
        <p className="mt-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-6 text-[15px] leading-relaxed text-warning-text">
          반 단위 일괄 인쇄는 현재 이용 상품에 포함되지 않았거나 아직 출시되지 않았습니다. 리포트를
          한 명씩 열어 인쇄할 수 있습니다.
        </p>
        <Link href={backHref} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-navy underline">
          리포트로 돌아가기
        </Link>
      </>,
    );
  }

  const bundle = await fetchClassPrintBundle(supabase, assignmentId, classId, selector);
  const title = printBundleTitle(selector);

  if (bundle.notInstalled) {
    return shell(
      <>
        <h1 className="text-[24px] font-bold text-ink">리포트 인쇄</h1>
        <p className="mt-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-6 text-[15px] text-warning-text">
          리포트 모델이 아직 적용되지 않았습니다.
        </p>
      </>,
    );
  }

  if (!bundle.ok) {
    return shell(
      <>
        <h1 className="text-[24px] font-bold text-ink">리포트 인쇄</h1>
        <p className="mt-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-6 text-[15px] leading-relaxed text-danger">
          인쇄할 리포트를 모두 불러오지 못했습니다. 일부만 인쇄하면 빠진 아이를 모를 수 있어
          지면을 만들지 않았습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Link href={backHref} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-navy underline">
          리포트로 돌아가기
        </Link>
      </>,
    );
  }

  return shell(
    <>
      <div className="print:hidden">
        <h1 className="text-[24px] font-bold text-ink">리포트 인쇄</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          {bundle.className ?? ""} · {title} · 완료본 {bundle.items.length}건
        </p>

        {bundle.hiddenExcluded > 0 ? (
          <p className="mt-3 rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-[14px] leading-relaxed text-warning-text">
            학부모 화면에서 숨긴 {bundle.hiddenExcluded}건은 인쇄물에 담지 않았습니다. 다시 공개는
            원장님이 합니다.
          </p>
        ) : null}

        {bundle.empty ? null : (
          <div className="mt-4">
            <ReportPrintActions bundle />
          </div>
        )}

        <Link href={backHref} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-navy underline">
          리포트로 돌아가기
        </Link>
      </div>

      {bundle.empty ? (
        <p className="mt-4 rounded-xl border border-hairline bg-white px-4 py-8 text-center text-[15px] leading-relaxed text-ink print:hidden">
          이 기간에 완료된 리포트가 없습니다. 작성 중인 리포트는 인쇄하지 않습니다.
        </p>
      ) : (
        <div className="mt-6">
          <ClassPrintSheet bundle={bundle} title={title} />
        </div>
      )}
    </>,
  );
}
