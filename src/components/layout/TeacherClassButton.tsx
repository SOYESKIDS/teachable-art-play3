import Link from "next/link";
import { cx } from "@/components/ui/cx";

/** 교사는 오늘의 수업으로, 비로그인 사용자는 기존 기관 로그인 흐름으로 들어간다. */
export function TeacherClassButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href="/teacher"
      prefetch={false}
      onClick={onClick}
      title="교사 전용 · 오늘의 수업"
      aria-label="수업하기 · 교사 전용"
      className={cx(
        "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-secondary-strong bg-secondary-soft px-3 text-label font-bold text-secondary-strong transition-colors duration-200 hover:bg-secondary-strong hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-strong sm:px-4",
        className,
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 6.5C9.5 4.5 5.5 4.5 3 5.5v14c2.5-1 6.5-1 9 1 2.5-2 6.5-2 9-1v-14c-2.5-1-6.5-1-9 1Z" />
        <path d="M12 6.5v14" />
      </svg>
      <span>수업하기</span>
    </Link>
  );
}
