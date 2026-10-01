import type { StaffSessionItem } from "@/types/staff-session";

/**
 * 이미 불러온 수업 목록을 반 기준으로 묶는다 (화면 표시 전용).
 *
 * ★ 새 질의를 만들지 않는다. 받은 배열을 그대로 나눌 뿐이다.
 * ★ 반 이름이 없으면(조회 범위 밖) 한 묶음 "반 정보 없음"으로 모은다.
 * ★ 묶음 순서는 반 이름 가나다순, 묶음 안의 수업 순서는 받은 순서 그대로다.
 */
export interface ClassSessionGroup {
  key: string;
  className: string;
  archived: boolean;
  sessions: StaffSessionItem[];
}

export function groupSessionsByClass(
  sessions: readonly StaffSessionItem[],
): ClassSessionGroup[] {
  const groups = new Map<string, ClassSessionGroup>();

  for (const session of sessions) {
    const key = session.class_id;
    const existing = groups.get(key);

    if (existing) {
      existing.sessions.push(session);
      continue;
    }

    groups.set(key, {
      key,
      className: session.className ?? "반 정보 없음",
      archived: session.classStatus === "archived",
      sessions: [session],
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.className.localeCompare(b.className, "ko"),
  );
}
