import type { Metadata } from "next";
import Link from "next/link";
import { requireDirector } from "@/lib/auth/organization";

export const metadata: Metadata = {
  title: "원장 대시보드 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface DirectorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 원장 Gate Dashboard.
 *
 * 이번 Phase에서는 "기관 계정 연결이 되었다"는 것만 확인시킨다.
 * 교사 관리 / 반 / 아이 / 수업 / AI / 리포트는 다음 Phase에서 만든다.
 */
export default async function DirectorPage({
  searchParams,
}: DirectorPageProps) {
  // 로그인 + 활성 director membership + 활성 기관까지 DB가 판정한다.
  const { email, memberships } = await requireDirector();

  const params = await searchParams;
  const rawOrg = params.org;
  const requestedOrgId = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;

  // URL의 org 값은 반드시 내 소속 목록 안에서만 유효하다.
  const selected =
    memberships.find((m) => m.organizationId === requestedOrgId) ??
    (memberships.length === 1 ? memberships[0] : null);

  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="leading-tight">
            <p className="text-[10px] font-bold tracking-[0.16em] text-navy/45">
              TEACHABLE ART PLAY
            </p>
            <p className="text-[14px] font-semibold text-navy">원장 대시보드</p>
          </div>

          <div className="flex items-center gap-3">
            {email ? (
              <span className="hidden max-w-[220px] truncate text-[13px] text-navy/55 sm:inline">
                {email}
              </span>
            ) : null}
            {/* prefetch로 인한 의도치 않은 로그아웃을 막기 위해 Link가 아닌 form POST를 쓴다 */}
            <form method="post" action="/auth/logout">
              <button
                type="submit"
                className="rounded-lg border border-navy/20 px-3 py-2 text-[13px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8 lg:px-8">
        {selected ? (
          <>
            <h1 className="text-[22px] font-bold text-navy">
              {selected.organizationName}
            </h1>
            <p className="mt-1 text-[14px] text-navy/55">원장 대시보드</p>

            <div className="mt-6 rounded-xl border border-navy/10 bg-white p-8">
              <p className="text-[15px] font-semibold text-navy">
                기관 계정 연결이 정상적으로 완료되었습니다.
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-navy/50">
                교사 관리, 반 운영, 수업과 성장기록 기능은 순차적으로 열립니다.
              </p>
            </div>

            {memberships.length > 1 ? (
              <div className="mt-5">
                <Link
                  href="/director"
                  className="text-[13px] font-semibold text-trust-blue transition-opacity hover:opacity-70"
                >
                  다른 기관 선택
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-bold text-navy">기관 선택</h1>
            <p className="mt-1 text-[14px] text-navy/55">
              원장으로 소속된 기관이 여러 곳입니다. 관리할 기관을 선택해주세요.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {memberships.map((membership) => (
                <li key={membership.organizationId}>
                  <Link
                    href={`/director?org=${membership.organizationId}`}
                    className="block rounded-xl border border-navy/10 bg-white p-5 transition-colors hover:border-navy/25"
                  >
                    <p className="text-[15px] font-bold text-navy">
                      {membership.organizationName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-navy/50">원장</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
