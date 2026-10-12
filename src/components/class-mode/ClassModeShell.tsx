import Link from "next/link";
import type { ReactNode } from "react";
import { FullscreenToggle } from "./FullscreenToggle";

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
 * 메뉴 없음 · 상단 context + [전체화면] + [나가기] · 넓은 화면에서도 고밀도 layout 으로
 * 바꾸지 않는다 (큰 글자 · 큰 터치 영역 유지).
 *
 * ★ 태블릿 가로 (사용자 지시 항목 1)
 *   가로로 눕히면 세로 높이가 줄어 하단 버튼이 접히기 쉽다. 그래서
 *   `landscape:` 분기에서 헤더를 얇게 하고 본문 여백을 줄이며, 본문을
 *   스크롤 영역으로 두어 **기록·재생 버튼이 항상 화면 안에 남게** 한다.
 *   큰 글자·큰 터치 영역은 그대로 둔다 — 밀도를 올리지 않는다.
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
    <div
      id="class-mode-root"
      className="flex min-h-screen flex-col bg-brand-ivory text-ink landscape:max-h-screen landscape:overflow-hidden"
    >
      <a
        href="#class-mode-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-30 shrink-0 border-b border-hairline bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-3 landscape:py-2">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink-muted">
              {phaseLabel}
              {className ? ` · ${className}` : ""}
              {order ? ` · ${order}` : ""}
            </p>
            <p className="truncate text-[19px] font-bold text-ink">{lessonTitle ?? "차시 정보 없음"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FullscreenToggle targetId="class-mode-root" />
            <Link
              href={exitHref}
              className="inline-flex min-h-12 shrink-0 items-center rounded-xl border border-control-border bg-white px-4 text-[16px] font-semibold text-ink hover:bg-brand-ivory"
            >
              나가기
            </Link>
          </div>
        </div>
      </header>
      {/*
        가로 모드에서는 본문만 스크롤한다. 헤더가 고정이고 본문이 스크롤 영역이므로
        작은 높이에서도 하단 action bar 가 화면 밖으로 밀리지 않는다.
      */}
      <main
        id="class-mode-main"
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-5 py-6 landscape:min-h-0 landscape:overflow-y-auto landscape:py-4"
      >
        {children}
      </main>
    </div>
  );
}
