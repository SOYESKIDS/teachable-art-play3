import Link from "next/link";
import type { ReactNode } from "react";

interface ClassModeShellProps {
  phaseLabel: "수업 준비" | "수업 중";
  className: string | null;
  lessonTitle: string | null;
  weekNo: number | null;
  sessionNo: number | null;
  exitHref: string;
  children: ReactNode;
}

/**
 * Class Mode 전체 화면 Shell (DEC-098 · SL-03).
 *
 * 메뉴 없음 · 상단 context + [나가기] · 넓은 화면에서도 고밀도 layout 으로
 * 바꾸지 않는다 (큰 글자 · 큰 터치 영역 유지).
 */
export function ClassModeShell({
  phaseLabel,
  className,
  lessonTitle,
  weekNo,
  sessionNo,
  exitHref,
  children,
}: ClassModeShellProps) {
  const order = [weekNo ? `${weekNo}주` : null, sessionNo ? `${sessionNo}차시` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-screen flex-col bg-brand-ivory text-ink">
      <a
        href="#class-mode-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-30 border-b border-hairline bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink-muted">
              {phaseLabel}
              {className ? ` · ${className}` : ""}
              {order ? ` · ${order}` : ""}
            </p>
            <p className="truncate text-[19px] font-bold text-ink">{lessonTitle ?? "차시 정보 없음"}</p>
          </div>
          <Link
            href={exitHref}
            className="inline-flex min-h-12 shrink-0 items-center rounded-xl border border-control-border bg-white px-4 text-[16px] font-semibold text-ink hover:bg-brand-ivory"
          >
            나가기
          </Link>
        </div>
      </header>
      <main id="class-mode-main" className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-5 py-6">
        {children}
      </main>
    </div>
  );
}
