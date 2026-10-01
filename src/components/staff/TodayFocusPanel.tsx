import type { StaffSessionItem } from "@/types/staff-session";
import { appButtonPrimary } from "@/components/ui/app-button";
import { SessionStatusBadge } from "./SessionCard";

/**
 * 교사 홈 — 오늘 먼저 볼 수업 한 건 (읽기 전용 미리보기).
 *
 * ★ 이 패널에는 /before 링크를 두지 않는다.
 *   실제 [수업 준비] · [수업 이어서]는 아래 수업 카드(SessionCard) 한 곳에만 있다.
 *   패널의 버튼은 같은 페이지 안의 그 카드로 이동하는 앵커다.
 *
 * ★ 원아 이름 · 사진 공유 여부는 여기서 보여 주지 않는다.
 *   미리보기는 차시 원본 섹션(§2 · §4-A · §15)에서 읽은 문장뿐이다.
 */
export interface TodayFocusPreview {
  growthKeyword: string | null;
  goals: string[];
  materials: string[];
}

const MAX_MATERIALS = 6;

/** "• 라벨 — 내용" 형태의 글머리 줄에서 앞의 기호를 걷어낸다 */
function stripBullet(line: string): string {
  return line.replace(/^[•·\-*]\s*/, "").trim();
}

/** 차시 원본 섹션에서 미리보기를 읽는다. 형식이 다르면 해당 칸만 비운다. */
export function buildTodayFocusPreview(
  sections: Record<string, string>,
): TodayFocusPreview {
  const keywordMatch = (sections.s2 ?? "").match(
    /^\s*•\s*성장\s*키워드\s*[—–-]\s*(.+)$/m,
  );

  const materials = (sections.s4a ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("•"))
    .map(stripBullet)
    .filter(Boolean)
    .slice(0, MAX_MATERIALS);

  const goals: string[] = [];
  const quickGuide = (sections.s15 ?? "").split("\n");
  const goalStart = quickGuide.findIndex((line) => line.trim() === "오늘의 목표");
  if (goalStart >= 0) {
    for (const line of quickGuide.slice(goalStart + 1)) {
      const text = line.trim();
      if (!text) {
        if (goals.length > 0) break;
        continue;
      }
      if (text.startsWith("•")) break;
      goals.push(text);
    }
  }

  return {
    growthKeyword: keywordMatch ? keywordMatch[1].trim() : null,
    goals,
    materials,
  };
}

/** 상태별 다음 행동 한 줄 — 아래 수업 카드의 버튼 이름과 맞춘다 */
function nextStepText(session: StaffSessionItem): string {
  switch (session.status) {
    case "scheduled":
      return "수업 카드의 [수업 준비]에서 준비물과 필수 확인을 마치고 수업을 시작합니다.";
    case "in_progress":
      return "진행 중인 수업입니다. 수업 카드의 [수업 이어서]에서 이어 가거나 마칠 수 있습니다.";
    case "completed":
      return "수업을 마쳤습니다. 수업 카드에서 출결과 관찰기록을 확인해 주세요.";
    case "cancelled":
      return "취소된 수업입니다. 남긴 출결 · 관찰기록은 수업 카드에서 볼 수 있습니다.";
  }
}

export function TodayFocusPanel({
  session,
  preview,
  isToday,
}: {
  session: StaffSessionItem;
  /** 차시 원본을 읽지 못하면 null — 패널은 미리보기 없이 그린다 */
  preview: TodayFocusPreview | null;
  /** 오늘 날짜 수업이 아니라 이전 날짜에서 이어진 수업이면 false */
  isToday: boolean;
}) {
  const hasPreview = Boolean(
    preview &&
      (preview.growthKeyword ||
        preview.goals.length > 0 ||
        preview.materials.length > 0),
  );

  return (
    <section
      aria-labelledby="today-focus-title"
      className="rounded-2xl border border-line-strong bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-accent-strong">
            {isToday ? "오늘 먼저 할 수업" : "먼저 마무리할 수업"}
          </p>
          <p className="mt-2 text-label font-semibold text-ink-muted">
            {session.className ?? "반 정보 없음"}
            {session.weekNo !== null ? ` · ${session.weekNo}주차` : ""}
          </p>
          <h2
            id="today-focus-title"
            className="mt-0.5 break-words text-headline font-bold leading-snug text-navy"
          >
            {session.lessonTitle ?? "차시 정보 없음"}
          </h2>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      {hasPreview && preview ? (
        <dl className="mt-5 grid gap-4 border-t border-line-soft pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {preview.growthKeyword || preview.goals.length > 0 ? (
            <div className="flex flex-col gap-4">
              {preview.growthKeyword ? (
                <div>
                  <dt className="text-caption font-semibold text-ink-muted">
                    성장 키워드
                  </dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full bg-secondary-soft px-3 py-1 text-body-sm font-bold text-secondary-strong">
                      {preview.growthKeyword}
                    </span>
                  </dd>
                </div>
              ) : null}
              {preview.goals.length > 0 ? (
                <div>
                  <dt className="text-caption font-semibold text-ink-muted">
                    오늘의 목표
                  </dt>
                  <dd className="mt-1 text-body-sm leading-relaxed text-ink">
                    {preview.goals.map((goal, index) => (
                      <p key={`${index}-${goal}`}>{goal}</p>
                    ))}
                  </dd>
                </div>
              ) : null}
            </div>
          ) : null}

          {preview.materials.length > 0 ? (
            <div>
              <dt className="text-caption font-semibold text-ink-muted">
                준비물
              </dt>
              <dd className="mt-1">
                <ul className="flex flex-col gap-1 text-body-sm leading-relaxed text-ink">
                  {preview.materials.map((item, index) => (
                    <li key={`${index}-${item}`} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption leading-relaxed text-ink-muted">
          {nextStepText(session)}
        </p>
        <a href={`#session-${session.id}`} className={appButtonPrimary}>
          오늘 수업 카드로 이동
        </a>
      </div>
    </section>
  );
}
