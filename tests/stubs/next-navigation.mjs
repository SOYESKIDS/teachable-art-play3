/**
 * `next/navigation` 테스트 스텁.
 *
 * `requireHqStaff()` · `requireTeacher()` 가 로그인하지 않은 호출을 `redirect()`
 * 로 돌려보낸다. `node --test` 에는 Next 라우터가 없어 이 모듈을 ESM 으로
 * 해석하지 못한다.
 *
 * ★ 실제 Next 의 `redirect()` 도 **던진다** (특수 오류를 던져 렌더를 중단시킨다).
 *   그래서 스텁도 던지는 쪽이 동작에 가깝고, 가드 검사에서도 「여기까지 왔다」가
 *   오류로 드러나 조용히 넘어가지 않는다.
 */
export function redirect(url) {
  const error = new Error(`next/navigation.redirect(${url}) 가 테스트에서 호출됐다.`);
  error.digest = "NEXT_REDIRECT";
  throw error;
}

export function notFound() {
  const error = new Error("next/navigation.notFound() 가 테스트에서 호출됐다.");
  error.digest = "NEXT_NOT_FOUND";
  throw error;
}

export function permanentRedirect(url) {
  return redirect(url);
}
