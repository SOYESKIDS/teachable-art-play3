import type { ReactNode } from "react";

/**
 * 공개 안내 페이지 공통 본문 틀 — 실행 묶음 D1 (/faq · /guide/teacher · /roadmap).
 *
 * ★ 새 디자인 시스템을 만들지 않는다.
 *   법적 문서 화면(LegalDocumentView)과 같은 폭·같은 토큰을 쓴다.
 *   읽으러 온 화면이므로 마케팅 장치(큰 사진 · 강조 카드)를 쓰지 않는다.
 *
 * ★ 본문 폭을 좁게 묶는다. 860px 이면 16px 본문 기준 한 줄이 45자 안팎이다.
 */
export function InfoPageShell({
  eyebrow,
  headline,
  subCopy,
  children,
}: {
  eyebrow: string;
  headline: string;
  subCopy?: string;
  children: ReactNode;
}) {
  return (
    <main id="main" tabIndex={-1} className="flex-1 bg-white focus:outline-none">
      <div className="mx-auto w-full max-w-[860px] px-5 py-14 sm:px-8 sm:py-20">
        <header className="border-b border-line pb-8">
          <p className="eyebrow text-trust-blue">{eyebrow}</p>
          <h1 className="mt-3 whitespace-pre-line text-h1 font-bold leading-[1.25] text-navy">
            {headline}
          </h1>
          {subCopy ? (
            <p className="mt-4 text-body-sm leading-relaxed text-ink-muted">{subCopy}</p>
          ) : null}
        </header>

        {children}
      </div>
    </main>
  );
}

/** 안내 페이지 안의 한 묶음 */
export function InfoSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="mt-12 scroll-mt-[calc(var(--header-height)_+_16px)]"
    >
      <h2 className="text-title-sm font-bold leading-snug text-navy sm:text-title">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
