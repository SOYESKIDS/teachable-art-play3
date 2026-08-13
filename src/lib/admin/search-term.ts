/**
 * Admin 검색어 정제 (Lead / Organization 공용).
 *
 * PostgREST의 `or=(...)` 필터 문법은 `,` `(` `)` `.` `"` 등을 구분자로 쓰므로
 * 사용자 입력을 그대로 넣으면 필터 구조가 깨지거나 조작될 수 있다.
 * 구분자와 LIKE 와일드카드를 제거하고 길이도 제한한다.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .slice(0, 60)
    .replace(/[%_\\"(),*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** searchParams 값은 배열로 올 수 있다 */
export function firstSearchParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
