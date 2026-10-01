import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { cx } from "@/components/ui/cx";

/**
 * 인증 화면(/login · /kindergarten · /admin/login · /auth/*) 공통 틀.
 *
 * ★ 같은 브랜드의 다른 문.
 *   예전에는 화면마다 폭(420 · 440 · 1080)과 브랜드 표기(serif · 노란 eyebrow · 없음)가 달랐다.
 *   이제 위에 BrandMark, 가운데 카드, 아래 저작권 한 줄 — 모든 인증 화면이 같은 뼈대다.
 *
 * ★ 장식은 바탕의 아주 옅은 색면 두 개뿐이다 (DEC-109: glass · neon · 반짝임 금지).
 *
 * ★ 폼은 페이지에 하나만 둔다.
 *   E2E 는 `form button[type="submit"]` 첫 번째를 누른다 — 이 틀에는 폼을 넣지 않는다.
 */
export function AuthShell({
  children,
  width = "narrow",
  homeHref = "/",
}: {
  children: ReactNode;
  /** narrow 440px 카드 · wide 2단(소개 + 카드) */
  width?: "narrow" | "wide";
  /** 브랜드를 눌렀을 때 갈 곳 — 관리자 화면은 공개 홈으로 보내지 않는다 */
  homeHref?: string | null;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-ivory">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 -z-10 h-[520px] w-[520px] rounded-full bg-accent-soft opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-40 -z-10 h-[560px] w-[560px] rounded-full bg-brand-sky opacity-80 blur-3xl"
      />

      <header className="mx-auto flex w-full max-w-[1120px] items-center px-5 pt-5 sm:px-8 sm:pt-7">
        {homeHref ? (
          <Link
            href={homeHref}
            aria-label="TeachAble Art Play 홈"
            className="flex min-h-11 items-center rounded-lg"
          >
            <BrandMark priority />
          </Link>
        ) : (
          <BrandMark priority />
        )}
      </header>

      <main
        id="main"
        className={cx(
          "mx-auto flex w-full flex-1 items-center px-5 py-10 sm:px-8 sm:py-14",
          width === "wide" ? "max-w-[1120px]" : "max-w-[488px]",
        )}
      >
        <div className="w-full">{children}</div>
      </main>

      <footer className="px-5 pb-6 text-center text-caption text-ink-muted">
        © SOYESKIDS · TeachAble Art Play
      </footer>
    </div>
  );
}

/** 인증 카드 한 장 — 흰 면 · 얇은 선 · 아주 옅은 그림자 */
export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="animate-rise-in rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-card)] sm:p-10">
      <p className="eyebrow text-accent-strong">{eyebrow}</p>
      <h1 className="mt-3 text-headline font-bold text-navy">{title}</h1>
      {description ? (
        <p className="mt-2 text-body-sm text-ink-muted">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
