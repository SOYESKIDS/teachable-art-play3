interface DemoBadgeProps {
  label?: string;
  className?: string;
}

/** 실제 운영 데이터가 아닌 예시 화면임을 표시하는 공용 뱃지 */
export function DemoBadge({ label = "DEMO · 예시 화면", className = "" }: DemoBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-navy/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-navy/55 ${className}`}
    >
      {label}
    </span>
  );
}
