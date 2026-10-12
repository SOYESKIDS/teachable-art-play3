import {
  NonProductionWriteBlockedError,
  assertWriteAllowed,
  evaluateWriteGuard,
  type WriteGuardVerdict,
} from "@/lib/env/deployment-guard";

/**
 * 쓰기 경로 공통 가드 — 실행 묶음 E 보완.
 *
 * ── 왜 공통 helper 인가 ────────────────────────────────────────────
 *
 * 쓰기를 하는 Server Action 이 24개 파일에 흩어져 있다. 각 파일이 가드를
 * 직접 호출하도록 두면 새 action 을 추가할 때 빠뜨린다. 그래서 호출 지점을
 * 한 줄로 만들고, 그 한 줄을 모든 쓰기 action 의 첫 줄로 둔다.
 *
 * ── 기본은 통과다 ─────────────────────────────────────────────────
 *
 * 정상 연결된 환경에서 `evaluateWriteGuard()` 는 `allow` 를 돌려준다.
 * 그래서 이 가드를 추가해도 기존 동작은 바뀌지 않는다. 막히는 경우는 두 가지다.
 *
 *   1. 환경변수 한 세트가 서로 다른 프로젝트를 가리킨다 (배포 종류 무관)
 *   2. 비운영 배포가 운영 데이터에 쓰려 하고, 차단 설정이 켜져 있다
 *
 * ── 막히면 던진다 ────────────────────────────────────────────────
 *
 * `guardWrite()` 는 예외를 던진다. 내부 운영 화면에서는 오류 화면이 뜨는 쪽이
 * 조용히 잘못된 프로젝트에 쓰는 것보다 안전하다 (fail-closed).
 *
 * 사용자에게 문구를 보여 줘야 하는 경로(공개 상담 폼 등)는 `tryGuardWrite()` 로
 * 판정만 받아 각자의 상태 모양에 맞게 처리한다.
 */

/** 막히면 던진다. 쓰기 action 의 첫 줄에 둔다. */
export function guardWrite(surface: string): void {
  assertWriteAllowed(surface);
}

/** 던지지 않고 판정만 받는다. 사용자 문구를 직접 만들어야 하는 경로에서 쓴다. */
export function tryGuardWrite(surface: string): {
  allowed: boolean;
  verdict: WriteGuardVerdict;
} {
  const verdict = evaluateWriteGuard();
  if (verdict !== "allow") {
    // 코드만 남긴다. 값·경로·입력 내용을 로그에 넣지 않는다.
    console.error("[write-guard] blocked:", { surface, verdict });
  }
  return { allowed: verdict === "allow", verdict };
}

export { NonProductionWriteBlockedError };
