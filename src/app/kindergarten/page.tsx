import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { StaffLoginCard } from "@/components/auth/StaffLoginCard";
import { resolveLoginNotice } from "@/app/login/form-state";

/**
 * 유치원 전용 포털 — 원장 · 교사 로그인 입구.
 *
 * ★ 인증을 새로 만들지 않았다.
 *   화면만 새것이고, 폼 · Server Action · 역할 판정 · 도착지는
 *   /login 이 쓰던 것과 **완전히 같은 하나**다.
 *   (StaffLoginCard → StaffLoginForm → organizationSignInAction)
 *
 * ★ 역할을 고르게 하지 않는다.
 *   원장인지 교사인지는 사용자가 고르는 것이 아니라 DB 의 소속(organization_members)이
 *   정한다. 화면에서 고르게 하면, 고른 값과 실제 권한이 어긋나는 순간
 *   "왜 안 들어가지는가"를 사용자가 설명할 수 없게 된다.
 *   왼쪽에 있는 것은 선택지가 아니라 **소개**다.
 *
 * ★ 본사 관리자 로그인(/admin/login)은 여기에 없다.
 *   유치원 사용자와 본사 운영자의 입구를 섞지 않는다.
 *
 * ★ 검색 결과에 노출하지 않는다.
 *   로그인 화면은 콘텐츠 페이지가 아니다. robots.txt 의 Disallow 와
 *   아래 metadata 두 겹으로 막는다.
 */
export const metadata: Metadata = {
  title: "유치원 전용 로그인 | TeachAble Art Play",
  description:
    "TeachAble Art Play 원장·교사 전용 로그인 화면입니다.",
  robots: { index: false, follow: false },
};

/** 왼쪽 소개. 역할 선택 버튼이 아니라 이 공간에서 무엇을 하는지에 대한 설명이다. */
const ROLE_GUIDES = [
  {
    role: "원장님",
    items: ["기관 운영 현황", "수업 확인", "성장리포트 관리"],
  },
  {
    role: "선생님",
    items: ["오늘의 수업", "출결 기록", "관찰 기록", "성장리포트 작성"],
  },
] as const;

interface KindergartenPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KindergartenPortalPage({
  searchParams,
}: KindergartenPageProps) {
  const params = await searchParams;

  return (
    <AuthShell width="wide">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_minmax(380px,440px)] lg:items-center lg:gap-16">
        {/*
          ★ 모바일에서는 로그인 카드가 먼저다 — 여기 온 사람은 "들어가려고" 왔다.
            order 로 순서만 바꾸고 DOM 순서(소개 → 카드)는 유지한다.

          ★ 소개 문장은 제목(h2)이 아니라 문단이다.
            예전에는 소개의 h2 가 카드의 h1 보다 먼저 나와 제목 순서가 뒤집혔다.
            이 화면의 제목은 하나 — 카드의 "유치원 전용 로그인" 이다.
        */}
        <section aria-label="유치원 전용 공간 소개" className="order-2 lg:order-1">
          <p className="eyebrow text-accent-strong">KINDERGARTEN PORTAL</p>
          <p className="mt-4 text-h1 font-bold text-navy">
            수업과 성장 기록을
            <br />
            한곳에서 관리하세요.
          </p>

          <p className="mt-5 max-w-[36ch] text-lead text-ink-muted">
            원장님과 선생님을 위한 TeachAble Art Play 유치원 전용 공간입니다.
          </p>

          <dl className="mt-10 grid gap-4 sm:grid-cols-2">
            {ROLE_GUIDES.map((guide, index) => (
              <div
                key={guide.role}
                className="rounded-2xl border border-line bg-white/80 p-5 backdrop-blur-sm"
              >
                <dt className="flex items-center gap-2.5 text-body-sm font-bold text-navy">
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-caption font-bold ${
                      index === 0
                        ? "bg-primary-soft text-navy"
                        : "bg-secondary-soft text-secondary-strong"
                    }`}
                  >
                    {guide.role.slice(0, 1)}
                  </span>
                  {guide.role}
                </dt>
                <dd>
                  <ul className="mt-3 flex flex-col gap-2">
                    {guide.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-label text-ink-muted"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0 text-secondary">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="로그인" className="order-1 lg:order-2">
          <StaffLoginCard
            title="유치원 전용 로그인"
            description="초대받은 계정으로 로그인해주세요."
            initialError={resolveLoginNotice(params.error)}
            idPrefix="kindergarten"
            footnote="계정이 없으신 경우 소속 기관 또는 SOYESKIDS 담당자에게 문의해주세요."
          />

          <p className="mt-5 text-center text-caption">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 text-ink-muted underline-offset-4 transition-colors hover:text-navy hover:underline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              홈페이지로 돌아가기
            </Link>
          </p>
        </section>
      </div>
    </AuthShell>
  );
}
