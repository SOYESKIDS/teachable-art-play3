import { cx } from "@/components/ui/cx";
import { CONTENT_STATUS_LABEL, type ExperienceContentStatus } from "@/data/experience/types";

/**
 * 공개 체험 표시 — 실제 서비스와 헷갈리지 않게 모든 체험 화면 상단에 둔다.
 */
export function DemoNotice({ className, compact = false, tone = "dark" }: { className?: string; compact?: boolean; tone?: "dark" | "light" }) {
  return (
    <p
      role="note"
      className={cx(
        "inline-flex items-center gap-2 rounded-full",
        tone === "dark" ? "bg-pop-ink text-white" : "bg-white text-pop-ink shadow-pop",
        compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]",
        "font-semibold",
        className,
      )}
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-pop-yellow" />
      체험용 화면 · 가상 데이터 · 저장되지 않아요
    </p>
  );
}

const STATUS_TONE: Record<ExperienceContentStatus, string> = {
  official: "bg-pop-leaf-soft text-pop-leaf-deep",
  adapted: "bg-pop-sky-soft text-pop-sky-deep",
  demo_draft: "bg-pop-orange-soft text-pop-orange-deep",
};

/** 콘텐츠 출처 표시 — official / adapted / demo_draft */
export function ContentStatusBadge({ status, className }: { status: ExperienceContentStatus; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold", STATUS_TONE[status], className)}>
      {CONTENT_STATUS_LABEL[status]}
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-pop-ink ring-1 ring-pop-ink/10", className)}>
      {children}
    </span>
  );
}
