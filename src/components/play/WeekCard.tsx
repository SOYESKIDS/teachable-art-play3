import Link from "next/link";
import { cx } from "@/components/ui/cx";
import type { ExperienceWeek } from "@/data/experience/types";
import { ArrowRight } from "./PopButton";
import { WeekArt } from "./WeekArt";

/**
 * 24주 탐색 카드 — 큰 그림 + 주차 번호 · 제목 · 성장 키워드 · 체험 버튼.
 *
 * ★ 카드 전체가 하나의 링크다 (안에 버튼을 겹쳐 두지 않는다 — 중첩 상호작용 금지).
 * ★ hover 는 살짝 떠오르기만 한다. 움직임 줄이기 설정에서는 transition 이 꺼진다.
 */
export function WeekCard({ week, priority = false }: { week: ExperienceWeek; priority?: boolean }) {
  return (
    <Link
      href={`/experience/weeks/${week.weekNo}`}
      // 24장이 한 화면에 모여 있어 미리 받기를 끈다 — 모바일 첫 화면이 24주치 데이터를 함께 받지 않게 (2026-10-20 Lighthouse)
      prefetch={false}
      className={cx(
        "group flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-pop ring-1 ring-pop-ink/5",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-pop-lg focus-visible:-translate-y-1.5",
      )}
    >
      <div className="relative">
        <WeekArt week={week} priority={priority} className="aspect-[4/3] w-full" />
        <span
          className="absolute left-4 top-4 inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-2 font-display text-[22px] text-white sticker"
          style={{ backgroundColor: week.themeColor }}
        >
          {week.weekNo}
          <span className="ml-0.5 text-[13px]">주</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {/* 키워드 칩은 주차 색을 옅게 — 24장이 같은 노랑 칩으로 반복되지 않게 (글자는 늘 잉크색 · 대비 유지) */}
        <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-[13px] font-bold text-pop-ink" style={{ backgroundColor: `${week.themeColor}24` }}>
          #{week.growthKeyword}
        </span>
        <h3 className="font-display text-[22px] leading-snug text-pop-ink">{week.title}</h3>
        <p className="line-clamp-2 text-[14px] leading-relaxed text-pop-ink-muted">{week.coreMessage}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[15px] font-bold text-pop-pink-deep">
          수업 보기
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
