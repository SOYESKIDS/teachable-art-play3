import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/organization";
import { resolveMembership } from "@/lib/staff/membership";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { HIDDEN_REASON_NOTE } from "@/lib/weeks/content-state";
import { getWeekContent } from "@/lib/weeks/week-source";
import { QuickGuideSheet } from "@/components/weeks/QuickGuideSheet";
import { PrintButton } from "@/components/weeks/PrintButton";

export const metadata: Metadata = {
  title: "퀵 가이드 인쇄 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface QuickGuidePageProps {
  params: Promise<{ weekNo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 교사용 퀵 가이드 인쇄 — 주차별 A4 한 장.
 *
 * ── 왜 전용 경로인가 ─────────────────────────────────────────────
 *
 * 교사는 이 한 장을 들고 교실에 들어간다. 주차 화면 전체를 인쇄하면 탭·버튼·
 * 안내문까지 섞여 여러 장이 나온다. 그래서 인쇄할 것만 있는 경로를 둔다.
 *
 * ── 공통 업무 껍데기를 쓰지 않는다 ───────────────────────────────
 *
 * ★ `StaffShell` 의 머리말·메뉴는 인쇄에서 빼야 하는데, 화면에 두면 교사가
 *   브라우저 인쇄를 눌렀을 때 첫 장 위쪽을 차지한다. 이 화면은 돌아가는 링크
 *   하나만 두고 나머지는 시트에 맡긴다.
 *
 * ── 권한과 공개 상태 ─────────────────────────────────────────────
 *
 * ★ 로그인한 교사만 들어온다. 인증을 건너뛰는 길을 만들지 않는다.
 * ★ **정식 서비스 경로**이므로 발행된 주차만 본문이 열린다. 검수 전 주차는
 *   이유를 적고 인쇄본을 내보내지 않는다 — 검수 전 내용이 종이로 나가면
 *   회수할 수 없다.
 */
export default async function TeacherQuickGuidePage({
  params,
  searchParams,
}: QuickGuidePageProps) {
  const { memberships } = await requireTeacher();
  const { weekNo: raw } = await params;
  const query = await searchParams;

  const weekNo = Number(raw);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 24) notFound();

  const membership = resolveMembership(memberships, query.org);
  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/teacher/weeks/${weekNo}/quick-guide`}
        roleLabel="교사"
      />
    );
  }

  // ★ 정식 경로 — 발행된 것만 본문이 들어온다.
  const result = getWeekContent(weekNo, "service");
  if (!result) notFound();

  const orgQuery = `org=${encodeURIComponent(membership.organizationId)}`;
  const backHref = `/teacher/weeks/${weekNo}?${orgQuery}`;

  return (
    <main className="min-h-screen bg-paper py-6 print:bg-white print:py-0">
      <div className="print:hidden mx-auto mb-4 flex w-full max-w-[186mm] flex-wrap items-center justify-between gap-3 px-6">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-[14px] font-semibold text-forest"
        >
          ← {weekNo}주차 수업으로
        </Link>
        {result.bodyVisible ? <PrintButton label="A4 한 장 인쇄" /> : null}
      </div>

      {!result.bodyVisible ? (
        <section
          role="note"
          className="mx-auto w-full max-w-[186mm] rounded-[10px] border border-warning-border bg-warning-soft px-6 py-8"
        >
          <h1 className="text-[18px] font-bold text-warning-text">
            {weekNo}주차 퀵 가이드를 아직 내보내지 않았습니다
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-warning-text">
            {result.hidden ? HIDDEN_REASON_NOTE[result.hidden] : ""}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-warning-text">
            검수 전 내용은 종이로 내보내면 회수할 수 없어 인쇄본을 만들지 않습니다. 수업은 받으신
            공식 교사용 수업가이드로 진행해 주세요.
          </p>
        </section>
      ) : (
        <QuickGuideSheet content={result.content} />
      )}
    </main>
  );
}
