import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
    <main className="min-h-screen bg-ivory">
      <div className="mx-auto grid w-full max-w-[1080px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_minmax(380px,420px)] lg:items-center lg:gap-16 lg:py-20">
        {/*
          ★ 모바일에서는 로그인 카드가 먼저다.
            여기까지 온 사람은 대개 "읽으러" 온 것이 아니라 "들어가려고" 온 것이다.
            소개를 먼저 읽히려고 스크롤을 시키지 않는다.
            order 로 순서만 바꾸고 DOM 순서(소개 → 카드)는 유지한다 —
            스크린리더와 키보드 사용자에게는 맥락이 먼저 오는 편이 낫다.
        */}
        <section className="order-2 lg:order-1">
          <Link
            href="/"
            className="inline-flex flex-col items-start leading-none"
          >
            <Image
              src="/images/site/brand/soyeskids-logo-primary.png"
              alt="SOYESKIDS"
              width={440}
              height={77}
              priority
              className="h-[20px] w-auto"
            />
            <span className="mt-1.5 font-serif text-xl font-semibold italic text-navy sm:text-2xl">
              TeachAble Art Play
            </span>
          </Link>

          <h2 className="mt-8 text-[28px] font-bold leading-[1.3] text-navy sm:text-[34px]">
            수업과 성장 기록을
            <br />
            한곳에서 관리하세요.
          </h2>

          <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-navy/60 sm:text-base">
            원장님과 선생님을 위한 TeachAble Art Play 유치원 전용 공간입니다.
          </p>

          <dl className="mt-9 grid gap-4 sm:grid-cols-2">
            {ROLE_GUIDES.map((guide) => (
              <div
                key={guide.role}
                className="rounded-[var(--radius-card)] border border-navy/10 bg-white/70 p-5"
              >
                <dt className="text-[14px] font-bold text-navy">
                  {guide.role}
                </dt>
                <dd>
                  <ul className="mt-3 flex flex-col gap-2">
                    {guide.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[14px] leading-relaxed text-navy/65"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-trust-blue"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="order-1 lg:order-2">
          <StaffLoginCard
            title="유치원 전용 로그인"
            description="초대받은 계정으로 로그인해주세요."
            initialError={resolveLoginNotice(params.error)}
            idPrefix="kindergarten"
            footnote="계정이 없으신 경우 소속 기관 또는 SOYESKIDS 담당자에게 문의해주세요."
          />

          <p className="mt-6 text-center text-[13px] text-navy/45">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-navy hover:underline"
            >
              홈페이지로 돌아가기
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
