import Link from "next/link";

/**
 * 주차 수업 페이지 5탭 — 교사가 한 주 동안 하는 일의 순서와 같다.
 *
 * ★ 링크로 만든다. 클라이언트 상태로 숨기지 않는다.
 *   새로고침·뒤로가기·북마크가 그대로 되고, 키보드로만도 이동할 수 있다.
 *
 * ★ 탭 이름 옆 상태는 숫자나 체크로 적는다. 색만으로 말하지 않는다.
 */

export type WeekTabKey = "prep" | "guide" | "class" | "observe" | "report";

export const WEEK_TABS: { key: WeekTabKey; label: string }[] = [
  { key: "prep", label: "① 준비" },
  { key: "guide", label: "② 수업 가이드" },
  { key: "class", label: "③ 수업하기" },
  { key: "observe", label: "④ 관찰 기록" },
  { key: "report", label: "⑤ 결과 보고" },
];

export function isWeekTab(value: unknown): value is WeekTabKey {
  return (
    value === "prep" ||
    value === "guide" ||
    value === "class" ||
    value === "observe" ||
    value === "report"
  );
}

export function WeekTabs({
  weekNo,
  active,
  orgQuery,
  status,
}: {
  weekNo: number;
  active: WeekTabKey;
  /** `org=...` 형태 (앞에 ? 없이) */
  orgQuery: string;
  /** 탭 옆에 붙는 짧은 상태 문구 */
  status?: Partial<Record<WeekTabKey, string>>;
}) {
  return (
    <nav aria-label="주차 수업 단계" className="mt-5 border-b border-rule">
      <ul className="flex flex-wrap gap-x-1">
        {WEEK_TABS.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={`/teacher/weeks/${weekNo}?${orgQuery}&tab=${tab.key}`}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-12 items-center gap-1.5 border-b-2 px-3 text-[15px] ${
                  current
                    ? "border-leaf font-bold text-forest"
                    : "border-transparent text-muted-ink hover:text-forest"
                }`}
              >
                {tab.label}
                {status?.[tab.key] ? (
                  <span className="text-[13px] font-normal text-muted-ink">
                    {status[tab.key]}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
