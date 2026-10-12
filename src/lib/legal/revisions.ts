/**
 * 법적 문서 판본 관리 — 실행 묶음 D2.
 *
 * ── 왜 이 파일이 필요한가 ───────────────────────────────────────────
 *
 * `src/data/legal.ts` 는 지금 `effectiveDate: "2026년 9월 7일"` · `revision: "최초 시행"`
 * 한 쌍만 갖고 있다. 그런데 이 저장소의 문서 **본문은 이미 바뀌었다** — 대표자(백향은)와
 * 개인정보·상담 정보 관리 담당자(박종현)가 추가되고, 수집 항목에서 선택 마케팅 동의가
 * 빠졌다. 즉 지금 상태는 "개정된 본문에 최초 시행 라벨이 붙어 있는" 상태다.
 *
 * 개정 UI 를 비워 두고 숨기는 것으로는 이 문제가 해결되지 않는다. 그래서 이 파일은
 * **판본의 사실관계를 명시적으로 선언**한다:
 *
 *   · 현행 운영본(effective)  — 2026-09-07 시행. 본문은 운영 배포(main)에 있다.
 *   · 개정안(draft)           — 이 저장소의 본문. 시행일·공지 시작일이 **없다**.
 *
 * ── 이 파일이 하지 않는 것 ─────────────────────────────────────────
 *
 * ★ 시행일·공지일을 만들지 않는다.
 *   `effectiveDate` 와 `noticeFrom` 이 null 인 동안 개정안은 effective 로 전환되지 않는다.
 *   10월 11일·18일 같은 검토안 날짜를 코드에 넣지 않는다.
 *
 * ★ 법률 절차를 판정하지 않는다.
 *   개정 사유 초안은 코드 변경 사실에서 끌어낼 수 있지만, 공지 기간·절차의 적법성은
 *   운영자·법무가 확정한다. 자체 조항이 "시행 7일 전 공지"를 요구하므로 계산 보조만 제공한다.
 *
 * ★ 보호책임자와 관리 담당자를 같은 필드로 섞지 않는다.
 *   박종현은 관리 담당자이고, 법정 개인정보 보호책임자 지정은 별개다.
 */

export type LegalDocumentId = "privacy" | "terms";

export type LegalRevisionStatus =
  /** 지금 효력이 있는 판본 */
  | "effective"
  /** 본문이 준비되었으나 시행일·공지일이 확정되지 않은 판본 */
  | "draft"
  /** 시행일·공지일이 확정되어 시행을 기다리는 판본 */
  | "scheduled"
  /** 다른 판본으로 대체된 판본 */
  | "superseded";

/** 그 판본의 본문이 어디에 있는가 */
export type LegalRevisionTextLocation =
  /** 이 저장소의 `src/data/legal.ts` */
  | "repository"
  /** 운영 배포에만 있다 (이 브랜치의 데이터 파일과 다르다) */
  | "deployed_only";

export interface LegalRevision {
  id: string;
  /** 사람이 읽는 판본 이름 */
  label: string;
  status: LegalRevisionStatus;
  /**
   * 시행일. **확정되지 않았으면 null 이다.**
   * 문자열 포맷은 기존 `legal.ts` 와 같은 한국어 표기를 쓴다.
   */
  effectiveDate: string | null;
  /** 공지 시작일. 확정되지 않았으면 null */
  noticeFrom: string | null;
  /** 변경 사유. 약관 조항이 "변경 사유를 명시"하도록 요구한다 */
  reason: string[];
  textLocation: LegalRevisionTextLocation;
  /** 운영 배포에만 있는 판본일 때 그 근거 (커밋 등) */
  deployedRef?: string;
}

export interface LegalRevisionRegistry {
  documentId: LegalDocumentId;
  revisions: LegalRevision[];
}

/**
 * 이 브랜치 본문이 개정안이 된 근거.
 *
 * 세 가지 모두 운영자가 2026-10-11 확정한 값이고, 본문에 이미 반영되어 있다.
 * 그래서 "내용은 개정됐고 시행일만 없는" 상태다.
 */
const REPOSITORY_DRAFT_REASON = [
  "회사 정보에 대표자(백향은)를 추가했습니다.",
  "개인정보 보호 업무 담당 창구에 개인정보·상담 정보 관리 담당자(박종현)를 표시했습니다. 법정 개인정보 보호책임자 지정과는 별개입니다.",
  "온라인 상담에서 선택 마케팅 수신 동의를 받지 않도록 수집 항목 안내를 수정했습니다. 기존에 수집된 동의 기록은 그대로 보존합니다.",
  "상담 목적·보유기간·거부 권리 안내를 상담창과 같은 원천으로 맞췄습니다.",
];

/** 현행 운영본. 본문은 운영 배포에 있고 이 브랜치의 데이터 파일과 다르다. */
const EFFECTIVE_2026_09_07: Omit<LegalRevision, "id"> = {
  label: "최초 시행",
  status: "effective",
  effectiveDate: "2026년 9월 7일",
  noticeFrom: null,
  reason: [],
  textLocation: "deployed_only",
  deployedRef: "main@dafa024",
};

export const LEGAL_REVISIONS: Record<LegalDocumentId, LegalRevisionRegistry> = {
  privacy: {
    documentId: "privacy",
    revisions: [
      { id: "privacy-2026-09-07", ...EFFECTIVE_2026_09_07 },
      {
        id: "privacy-draft-20261011",
        label: "개정안 (시행일 미확정)",
        status: "draft",
        effectiveDate: null,
        noticeFrom: null,
        reason: REPOSITORY_DRAFT_REASON,
        textLocation: "repository",
      },
    ],
  },
  terms: {
    documentId: "terms",
    revisions: [
      { id: "terms-2026-09-07", ...EFFECTIVE_2026_09_07 },
      {
        id: "terms-draft-20261011",
        label: "개정안 (시행일 미확정)",
        status: "draft",
        effectiveDate: null,
        noticeFrom: null,
        reason: [
          "회사 정보에 대표자(백향은)를 추가했습니다.",
          "현재 제공 범위와 준비 중 기능의 구분을 본문에 반영했습니다.",
        ],
        textLocation: "repository",
      },
    ],
  },
};

/* ════════════════════════════════════════════════════ 조회 helper */

export function revisionsOf(documentId: LegalDocumentId): LegalRevision[] {
  return LEGAL_REVISIONS[documentId].revisions;
}

export function effectiveRevisionOf(documentId: LegalDocumentId): LegalRevision | null {
  return revisionsOf(documentId).find((r) => r.status === "effective") ?? null;
}

/** 시행 예정 판본 (시행일·공지일이 확정된 것) */
export function scheduledRevisionOf(documentId: LegalDocumentId): LegalRevision | null {
  return revisionsOf(documentId).find((r) => r.status === "scheduled") ?? null;
}

/** 본문은 있으나 시행일이 없는 판본 */
export function draftRevisionOf(documentId: LegalDocumentId): LegalRevision | null {
  return revisionsOf(documentId).find((r) => r.status === "draft") ?? null;
}

export function historyOf(documentId: LegalDocumentId): LegalRevision[] {
  return revisionsOf(documentId).filter((r) => r.status === "superseded");
}

/**
 * 이 저장소의 본문이 지금 효력 있는 판본인가.
 *
 * false 이면 화면이 "이 본문은 개정안"임을 밝혀야 한다. 공개 배포 전에
 * 운영자가 시행일·공지 시작일을 확정하거나, 본문을 현행본으로 되돌려야 한다.
 */
export function repositoryTextIsEffective(documentId: LegalDocumentId): boolean {
  const effective = effectiveRevisionOf(documentId);
  return effective?.textLocation === "repository";
}

/**
 * 공개 배포를 보류해야 하는 상태인지와 그 이유.
 *
 * 화면과 문서가 같은 판정을 쓰도록 한 곳에 둔다. 이 함수가 blocked 를 돌려주는 동안
 * 해당 문서는 "확정 게시"로 취급하지 않는다.
 */
export interface LegalPublishVerdict {
  blocked: boolean;
  reasons: string[];
}

export function publishVerdictOf(documentId: LegalDocumentId): LegalPublishVerdict {
  const reasons: string[] = [];
  const draft = draftRevisionOf(documentId);

  if (draft && draft.textLocation === "repository") {
    reasons.push(
      "이 저장소의 본문이 개정안입니다. 현행 운영본과 내용이 다릅니다.",
    );
    if (!draft.effectiveDate) reasons.push("개정 시행일이 확정되지 않았습니다.");
    if (!draft.noticeFrom) reasons.push("개정 공지 시작일이 확정되지 않았습니다.");
  }

  return { blocked: reasons.length > 0, reasons };
}

/**
 * 공지 시작일 계산 보조.
 *
 * 자체 조항은 "변경 사항의 시행 7일 전부터" 공지하도록 정하고 있다.
 * 시행일이 정해지면 공지를 늦어도 언제 시작해야 하는지 계산해 준다.
 *
 * ★ 이 함수는 날짜를 **확정하지 않는다.** 운영자가 `effectiveDate` 를 넣은 뒤
 *   참고용으로 쓰는 계산이며, 법률상 필요한 기간 판단을 대신하지 않는다.
 *
 * @param effectiveDateIso `YYYY-MM-DD`
 * @returns `YYYY-MM-DD` 또는 입력이 형식에 맞지 않으면 null
 */
export const LEGAL_NOTICE_LEAD_DAYS = 7;

export function latestNoticeStartFor(effectiveDateIso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDateIso)) return null;
  const [y, m, d] = effectiveDateIso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() - LEGAL_NOTICE_LEAD_DAYS);
  const yy = String(base.getUTCFullYear()).padStart(4, "0");
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
