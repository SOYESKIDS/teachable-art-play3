import { parseGoalNotation } from "@/lib/content/goal-notation";

/**
 * 수업 목표 표시 — "이렇게 해요" 를 먼저, "이렇게 하지 않아요" 를 옅게.
 * 원본이 "A X · B O" 형식이 아니면 원문 그대로 보여 준다.
 */
export function GoalStatement({ text, compact = false }: { text: string; compact?: boolean }) {
  const parsed = parseGoalNotation(text);

  if (!parsed) {
    return <span className="whitespace-pre-line">{text}</span>;
  }

  return (
    <span className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      <span className="flex flex-col">
        <span className="text-caption font-semibold text-secondary-strong">이렇게 해요</span>
        <span className="font-semibold text-ink">{parsed.goal}</span>
      </span>
      <span className="flex flex-col">
        <span className="text-caption font-semibold text-ink-muted">이렇게 하지 않아요</span>
        <span className="text-ink-muted">{parsed.avoid}</span>
      </span>
    </span>
  );
}
