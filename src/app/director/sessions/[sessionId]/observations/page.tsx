import type { Metadata } from "next";
import { requireDirector } from "@/lib/auth/organization";
import { fetchStaffObservations } from "@/lib/staff/observation-queries";
import { resolveMembership } from "@/lib/staff/membership";
import { ObservationBoard } from "@/components/staff/ObservationBoard";
import { OrganizationPicker } from "@/components/staff/OrganizationPicker";
import { StaffShell } from "@/components/staff/StaffShell";
import { DIRECTOR_NAV } from "../../../nav";

export const metadata: Metadata = {
  title: "관찰기록 조회 | TeachAble Art Play",
  robots: {
    index: false,
    follow: false,
  },
};

interface DirectorObservationPageProps {
  params: Promise<{
    sessionId: string;
  }>;

  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}

/**
 * SERVICE-08C-1 — 원장 관찰기록 조회 페이지.
 *
 * 골격은 원장 출결 페이지와 같고, 내용만 관찰기록으로 바뀐다.
 *   requireDirector() → 소속 확인 → fetchStaffObservations() → StaffShell
 *
 * ★ 원장은 읽기만 한다.
 *   이 파일은 saveObservationAction / observation-actions.ts /
 *   ObservationChildForm.tsx 어느 것도 import하지 않는다.
 *   ObservationBoard에 role="director"를 하드코딩으로 넘기면
 *   canWrite가 false가 되어 입력 form이 한 개도 렌더되지 않는다.
 *   최종 방어선은 DB다 — 20260831094000의 관찰기록 INSERT/UPDATE Policy에는
 *   director 분기가 아예 없고, DELETE Policy는 존재하지 않는다.
 *
 * ★ 전용 query를 새로 만들지 않는다.
 *   fetchStaffObservations()에는 role 분기가 없고 organizationId/sessionId만 받는다.
 *   원장이 무엇을 볼 수 있는지는 RLS가 판정한다
 *   (observations SELECT Policy의 has_org_role(organization_id, ['director']) 분기).
 *
 * ★ SERVICE-10A — 원장 화면에는 AI 생성 경로가 없다.
 *   ObservationBoard에 aiEnabled를 넘기지 않으므로 기본값 false가 되고,
 *   AI 영역은 "교사 검토 완료" 문장만 읽기 전용으로 표시한다.
 *   이 파일은 observation-ai-actions도 AI provider도 import하지 않는다.
 *
 * ★ 실패 문구는 "찾을 수 없거나 접근 권한이 없습니다" 하나로 합친다.
 *   존재하지 않는 수업과 권한 없는 수업을 구분해 보여주면
 *   sessionId를 바꿔가며 다른 기관의 수업 존재 여부를 확인할 수 있다.
 */
export default async function DirectorObservationPage({
  params,
  searchParams,
}: DirectorObservationPageProps) {
  const {
    supabase,
    email,
    memberships,
  } = await requireDirector();

  const { sessionId } = await params;
  const query = await searchParams;

  /**
   * URL의 ?org= 값은 그대로 쓰지 않는다.
   * requireDirector()가 DB에서 읽어 온 memberships 안에 있을 때만 유효하고,
   * 통과하더라도 모든 질의는 RLS를 다시 거친다.
   */
  const membership = resolveMembership(
    memberships,
    query.org,
  );

  if (!membership) {
    return (
      <OrganizationPicker
        memberships={memberships}
        basePath={`/director/sessions/${sessionId}/observations`}
        roleLabel="원장"
      />
    );
  }

  const result =
    await fetchStaffObservations(
      supabase,
      membership.organizationId,
      sessionId,
    );

  return (
    <StaffShell
      email={email}
      roleLabel="원장"
      organizationName={
        membership.organizationName
      }
      navItems={DIRECTOR_NAV}
      currentHref="/director/sessions"
    >
      {!result.ok ? (
        <div>
          <h1 className="text-[22px] font-bold text-navy">
            관찰기록 조회
          </h1>

          <p className="mt-4 rounded-xl border border-navy/10 bg-white px-4 py-10 text-center text-[14px] leading-relaxed text-navy/55">
            {result.reason ===
            "load_failed"
              ? "관찰기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
              : "수업을 찾을 수 없거나 접근 권한이 없습니다."}
          </p>
        </div>
      ) : (
        <ObservationBoard
          data={result.data}
          role="director"
          backHref={`/director/sessions?org=${encodeURIComponent(
            membership.organizationId,
          )}`}
        />
      )}
    </StaffShell>
  );
}
