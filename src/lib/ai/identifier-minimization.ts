/**
 * AI 전송 전 자유서술 식별정보 최소화 — 실행 묶음 C4.
 *
 * ── 무엇을 해결하는가 ──────────────────────────────────────────────
 *
 * `ObservationDraftInput` 과 `GrowthReportEvidenceInput` 은 아이 이름 · UUID ·
 * 기관 · 반 · 교사 · 사진을 **구조적으로** 담지 않는다. 그 부분은 타입이 이미 막고 있다.
 *
 * 남은 구멍은 자유서술이다. `childVoice` · `teacherNote` 는 교사가 손으로 쓰는 문장이라
 * "민재가 서연이한테 말했어요", "어머니 010-1234-5678로 연락" 처럼 등록된 사람 이름과
 * 연락처가 그 안에 들어갈 수 있다. 이 모듈은 전송 직전에 그것을 치환한다.
 *
 * ── 하지 않는 주장 ────────────────────────────────────────────────
 *
 * ★ 이것은 **익명화가 아니다.**
 *   한국어 이름은 일반 명사와 겹치고(예: 하은 · 소예), 띄어쓰기 없이 조사가 붙는다.
 *   등록된 이름 목록으로 치환하는 방식은 목록에 없는 사람·별명·관계 서술을 놓친다.
 *   그래서 결과에 `residualRisk` 를 붙여 교사가 확인할 수 있게 하고,
 *   "완전히 제거했다"고 기록하지 않는다.
 *
 * ★ 원문을 바꾸지 않는다.
 *   DB 의 관찰기록 원문은 그대로 둔다. 치환은 전송용 사본에만 적용한다.
 *
 * ★ 원문·치환 전후 텍스트를 로그에 남기지 않는다 (지침 §7 C4).
 *   이 모듈은 어떤 것도 console 에 쓰지 않는다. 호출자는 건수·플래그만 남긴다.
 *
 * ★ 민감정보가 의심되면 전송을 막는 판정을 돌려준다.
 *   의료·진단 표현이 들어간 입력은 `blocked` 로 표시하고, 보낼지 말지는 호출자가 정한다.
 */

/** 치환에 쓰는 자리표시. 사람이 읽어도 무엇이 가려졌는지 알 수 있게 한다. */
export const PLACEHOLDER = {
  child: "[아이]",
  peer: "[친구]",
  teacher: "[선생님]",
  organization: "[기관]",
  guardian: "[보호자]",
  phone: "[연락처]",
  email: "[이메일]",
  idNumber: "[식별번호]",
} as const;

/** 호출자가 넘기는 "등록된 이름" 목록. 서버에서 조회한 값만 넣는다. */
export interface KnownIdentifiers {
  /** 이 기록의 대상 아이 이름 */
  childName?: string | null;
  /** 같은 반 다른 아이들의 이름 */
  peerNames?: readonly string[];
  /** 담당 교사 이름 */
  teacherNames?: readonly string[];
  /** 기관명 */
  organizationNames?: readonly string[];
}

export interface MinimizationFinding {
  kind: keyof typeof PLACEHOLDER;
  /** 몇 군데를 바꿨는가. 원문 조각은 담지 않는다. */
  count: number;
}

export type ResidualRisk =
  /** 치환할 것을 찾지 못했고 추가 위험 신호도 없다 */
  | "none"
  /** 등록 이름 외에 사람 이름으로 보이는 표현이 남아 있을 수 있다 */
  | "possible_unlisted_name"
  /** 의료·진단·민감 표현이 포함되어 있다 */
  | "sensitive_content";

export interface MinimizationResult {
  /** 전송용 사본 */
  text: string;
  /** 무엇을 몇 건 바꿨는가 */
  findings: MinimizationFinding[];
  residualRisk: ResidualRisk;
  /**
   * 전송을 막아야 하는가.
   *
   * true 면 호출자는 AI 호출을 하지 않고 교사에게 확인을 요청한다.
   * 지금 기준은 의료·진단 표현 하나다 — 그 외는 막지 않고 위험만 표시한다.
   */
  blocked: boolean;
}

/* ════════════════════════════════════════════════════ 패턴 */

/**
 * 전화번호. 한국 휴대전화·지역번호를 하이픈·공백·점 구분까지 본다.
 * 워크북 수치(42% → 61%)나 날짜와 겹치지 않게 최소 9자리 이상만 잡는다.
 */
const PHONE_PATTERN = /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** 주민등록번호 형태. 실제로 적힐 일은 없어야 하지만, 적히면 반드시 막는다. */
const ID_NUMBER_PATTERN = /\b\d{6}\s?[-–]\s?[1-4]\d{6}\b/g;

/**
 * 보호자 호칭 + 이름 조합. "서연이 어머니", "민재 아버님" 처럼
 * 등록 목록에 없더라도 보호자를 가리키는 표현을 줄인다.
 */
const GUARDIAN_PATTERN =
  /([가-힣]{2,4})\s*(어머니|어머님|아버지|아버님|엄마|아빠|보호자|학부모)/g;

/**
 * 목록에 없는 사람 이름 **신호**. 치환하지 않고 위험 표시만 한다.
 *
 * 한국어 이름을 패턴으로 잡으려 하면 일반 명사를 대량으로 오탐한다.
 * 그래서 "이름 + 조사" 중 사람을 가리키는 쓰임이 분명한 조합만 신호로 본다.
 */
const UNLISTED_NAME_SIGNAL =
  /[가-힣]{2,4}(이가|이는|이한테|이에게|이랑|이와|군|양)\b/;

/**
 * 의료·진단·민감 표현. 발견되면 전송을 막는다.
 *
 * 이 서비스는 아이를 진단하지 않는다. 이런 표현이 교사 메모에 들어왔다면
 * AI 로 보내기 전에 사람이 먼저 봐야 한다.
 */
const SENSITIVE_PATTERN =
  /(ADHD|자폐|아스퍼거|발달지연|발달장애|지적장애|경계선|틱|뇌전증|간질|약물|복용|처방|진단|소견서|치료|상담센터|심리검사|지능검사|IQ)/i;

/* ════════════════════════════════════════════════════ 치환 */

/** 정규식 특수문자를 막는다 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 등록된 이름 하나를 치환한다.
 *
 * 한국어는 이름 뒤에 조사가 바로 붙는다("서연이가", "서연은"). 그래서
 * 단어 경계(\b)로는 잡히지 않는다. 이름 문자열을 그대로 찾고, 뒤에 오는
 * 조사·접미사는 남겨 둔다 — 문장이 읽히는 상태로 유지하기 위해서다.
 *
 * 2글자 미만 이름은 건너뛴다. 일반 명사 오탐이 너무 커진다.
 */
function replaceName(text: string, name: string, placeholder: string): {
  text: string;
  count: number;
} {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { text, count: 0 };

  const pattern = new RegExp(escapeRegExp(trimmed), "g");
  let count = 0;
  const next = text.replace(pattern, () => {
    count += 1;
    return placeholder;
  });
  return { text: next, count };
}

function applyPattern(
  text: string,
  pattern: RegExp,
  replacement: string | ((...args: string[]) => string),
): { text: string; count: number } {
  let count = 0;
  const next = text.replace(pattern, (...args: string[]) => {
    count += 1;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  return { text: next, count };
}

/**
 * 자유서술 한 덩어리를 전송용으로 바꾼다.
 *
 * 순서가 중요하다. 식별번호·연락처·이메일을 먼저 지우고, 그 다음 보호자 호칭,
 * 마지막에 등록된 이름을 치환한다. 이름을 먼저 바꾸면 "서연이 어머니" 가
 * "[아이] 어머니" 로 남아 보호자 패턴이 걸리지 않는다.
 */
export function minimizeFreeText(
  raw: string | null,
  known: KnownIdentifiers,
): MinimizationResult {
  if (raw === null || raw.trim() === "") {
    return { text: "", findings: [], residualRisk: "none", blocked: false };
  }

  const findings: MinimizationFinding[] = [];
  const push = (kind: MinimizationFinding["kind"], count: number) => {
    if (count > 0) findings.push({ kind, count });
  };

  let text = raw;

  const id = applyPattern(text, ID_NUMBER_PATTERN, PLACEHOLDER.idNumber);
  text = id.text;
  push("idNumber", id.count);

  const phone = applyPattern(text, PHONE_PATTERN, PLACEHOLDER.phone);
  text = phone.text;
  push("phone", phone.count);

  const email = applyPattern(text, EMAIL_PATTERN, PLACEHOLDER.email);
  text = email.text;
  push("email", email.count);

  // 보호자 호칭은 앞의 이름까지 함께 가린다.
  const guardian = applyPattern(
    text,
    GUARDIAN_PATTERN,
    (_match, _name, title) => `${PLACEHOLDER.guardian} ${title}`,
  );
  text = guardian.text;
  push("guardian", guardian.count);

  // 긴 이름을 먼저 바꾼다. 짧은 이름이 긴 이름의 일부일 수 있다.
  const byLength = (a: string, b: string) => b.length - a.length;

  let organizationCount = 0;
  for (const name of [...(known.organizationNames ?? [])].sort(byLength)) {
    const r = replaceName(text, name, PLACEHOLDER.organization);
    text = r.text;
    organizationCount += r.count;
  }
  push("organization", organizationCount);

  let teacherCount = 0;
  for (const name of [...(known.teacherNames ?? [])].sort(byLength)) {
    const r = replaceName(text, name, PLACEHOLDER.teacher);
    text = r.text;
    teacherCount += r.count;
  }
  push("teacher", teacherCount);

  let peerCount = 0;
  for (const name of [...(known.peerNames ?? [])].sort(byLength)) {
    const r = replaceName(text, name, PLACEHOLDER.peer);
    text = r.text;
    peerCount += r.count;
  }
  push("peer", peerCount);

  // 대상 아이 이름은 마지막에. 같은 이름이 또래 목록에도 있으면 또래로 먼저 바뀐다.
  let childCount = 0;
  if (known.childName) {
    const r = replaceName(text, known.childName, PLACEHOLDER.child);
    text = r.text;
    childCount = r.count;
  }
  push("child", childCount);

  // 위험 판정 — 원문 기준으로 본다. 치환 후에는 신호가 사라질 수 있다.
  let residualRisk: ResidualRisk = "none";
  let blocked = false;

  if (SENSITIVE_PATTERN.test(raw)) {
    residualRisk = "sensitive_content";
    blocked = true;
  } else if (UNLISTED_NAME_SIGNAL.test(text)) {
    // 치환 후에도 남아 있는 신호만 본다 — 등록 이름은 이미 바뀌었다.
    residualRisk = "possible_unlisted_name";
  }

  return { text, findings, residualRisk, blocked };
}

/* ════════════════════════════════════════════════════ 묶음 처리 */

export interface MinimizedField<K extends string> {
  key: K;
  result: MinimizationResult;
}

export interface MinimizationSummary {
  /** 전송을 막아야 하는가 (어느 한 칸이라도 blocked) */
  blocked: boolean;
  /** 가장 높은 잔여 위험 */
  residualRisk: ResidualRisk;
  /** 종류별 치환 건수 합계 */
  totals: Partial<Record<keyof typeof PLACEHOLDER, number>>;
  /** 교사에게 보여 줄 확인 필요 여부 */
  needsTeacherReview: boolean;
}

const RISK_ORDER: Record<ResidualRisk, number> = {
  none: 0,
  possible_unlisted_name: 1,
  sensitive_content: 2,
};

export function summarizeMinimization(
  results: readonly MinimizationResult[],
): MinimizationSummary {
  const totals: Partial<Record<keyof typeof PLACEHOLDER, number>> = {};
  let blocked = false;
  let residualRisk: ResidualRisk = "none";

  for (const r of results) {
    if (r.blocked) blocked = true;
    if (RISK_ORDER[r.residualRisk] > RISK_ORDER[residualRisk]) {
      residualRisk = r.residualRisk;
    }
    for (const f of r.findings) {
      totals[f.kind] = (totals[f.kind] ?? 0) + f.count;
    }
  }

  return {
    blocked,
    residualRisk,
    totals,
    needsTeacherReview: blocked || residualRisk !== "none",
  };
}

/**
 * 사용자에게 보여 줄 문구.
 *
 * ★ 원문 조각을 담지 않는다. 무엇이 가려졌는지 "종류와 건수"까지만 말한다.
 * ★ "완전히 제거했다"고 말하지 않는다. 치환은 등록된 이름 기준이고,
 *   목록에 없는 사람·별명은 놓칠 수 있다.
 */
export function minimizationNotice(summary: MinimizationSummary): string | null {
  if (summary.blocked) {
    return "기록에 진단·의료 표현으로 보이는 내용이 있어 AI 정리를 진행하지 않았습니다. 내용을 확인한 뒤 다시 시도해 주세요.";
  }

  if (summary.residualRisk === "possible_unlisted_name") {
    return "등록되지 않은 사람 이름으로 보이는 표현이 남아 있을 수 있습니다. 전송 전에 기록을 한 번 확인해 주세요.";
  }

  const replaced = Object.values(summary.totals).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  if (replaced > 0) {
    return `전송용 사본에서 ${replaced}곳을 가렸습니다. 원문 기록은 그대로 보존됩니다. 완전한 익명 처리는 아닙니다.`;
  }

  return null;
}
