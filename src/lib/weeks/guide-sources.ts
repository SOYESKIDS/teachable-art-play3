/**
 * 원본 가이드 출처 기록 — 내부 검수 정보 (C단계).
 *
 * ── 여기 들어 있는 것 ─────────────────────────────────
 *
 * 주차별 원본 PDF 의 **파일명 · SHA-256 · 포함 페이지 수 · 파일 크기**만
 * 적는다. 교안 본문은 담지 않는다.
 *
 * ★ 원본 PDF 는 이 저장소에 넣지 않는다 (제외 규칙 유지). 해시만 있으면
 *   검수자가 자기 손의 파일이 **전사할 때 본 그 파일인지** 확인할 수 있다.
 *   원본이 다시 내려오거나 수정되면 해시가 달라지므로 전사본을 다시
 *   대조해야 한다는 것을 알 수 있다.
 *
 * ★ 해시는 표시하지 않는다 — 교사·원장 화면에는 일절 나오지 않고,
 *   본사 검수 화면에서만 보여 준다.
 *
 * ── 파일명이 주차마다 다르다 ──────────────────────────
 *
 * ★ 1~8주는 `SOYE_KIDS_`, 9~24주는 `SOYES_KIDS_` 로 시작하고, 10·18주는
 *   파일명에 ` (1)` 이 붙어 있다. 받은 그대로 적는다 — 이름을 정리해
 *   적으면 검수자가 파일을 못 찾는다.
 */

export interface GuideSource {
  weekNo: number;
  /** 받은 파일명 그대로 */
  file: string;
  /** SHA-256 (소문자 16진수) */
  sha256: string;
  /** PDF 포함 페이지 수 */
  pages: number;
  /** 파일 크기 (바이트) */
  bytes: number;
}

/**
 * 24주 원본 출처.
 *
 * ★ 2026-10-13 기준의 사내 공식 가이드 폴더에서 직접 읽어 계산했다.
 *   사람이 손으로 적지 않았다.
 */
export const GUIDE_SOURCES: Record<number, GuideSource> = {
  1: {
    weekNo: 1,
    file: "SOYE_KIDS_1주차_교사용_수업가이드.pdf",
    sha256: "66e2182a4c75b8597152abc4bc93caad81d2bbd0ed6fb1291157110ff1004bdd",
    pages: 9,
    bytes: 54103,
  },
  2: {
    weekNo: 2,
    file: "SOYE_KIDS_2주차_교사용_수업가이드.pdf",
    sha256: "9a3eb15a72d3a4a92d35fb3686aaa8d26557939b037cb5bfdc2fddbe2fc83ac6",
    pages: 8,
    bytes: 408741,
  },
  3: {
    weekNo: 3,
    file: "SOYE_KIDS_3주차_교사용_수업가이드.pdf",
    sha256: "adf553ba41f3adbd86e79e2f14d031ead6e7e1219e283e7f27c6df25e87fd29a",
    pages: 10,
    bytes: 54657,
  },
  4: {
    weekNo: 4,
    file: "SOYE_KIDS_4주차_교사용_수업가이드.pdf",
    sha256: "04a4372eb72f8d7f0b413e3c5615e03a90f62c53412ee3131226ca542f6097b5",
    pages: 9,
    bytes: 53610,
  },
  5: {
    weekNo: 5,
    file: "SOYE_KIDS_5주차_교사용_수업가이드.pdf",
    sha256: "984c16dbb717f51b1eae4841d663291aab5395a2d1cc923c4f937e46d667aa39",
    pages: 8,
    bytes: 52613,
  },
  6: {
    weekNo: 6,
    file: "SOYE_KIDS_6주차_교사용_수업가이드.pdf",
    sha256: "1d6f4aa607bccbd2d5c88fd58012f426ae21608368b4f41050921390de37acce",
    pages: 10,
    bytes: 55918,
  },
  7: {
    weekNo: 7,
    file: "SOYE_KIDS_7주차_교사용_수업가이드.pdf",
    sha256: "7e9a557ccc6eb46f52668260972c0a2a080a4970697c14878995d4352791bf88",
    pages: 8,
    bytes: 228788,
  },
  8: {
    weekNo: 8,
    file: "SOYE_KIDS_8주차_교사용_수업가이드.pdf",
    sha256: "317975742c3de601cae0e5003f3761ded3be1fb449b386100fdcccf32a0dae5f",
    pages: 8,
    bytes: 238031,
  },
  9: {
    weekNo: 9,
    file: "SOYES_KIDS_9주차_교사용_수업가이드.pdf",
    sha256: "7c4394c2587c1ff55edcd11b5106a664c815f2d25dbb7cee7e0b2cb1e514f1c0",
    pages: 8,
    bytes: 252865,
  },
  10: {
    weekNo: 10,
    file: "SOYES_KIDS_10주차_교사용_수업가이드 (1).pdf",
    sha256: "dcfddb5d6e2a19ab1b9c402b0398438c819808a48a39f6282d6ec2290e1181b9",
    pages: 8,
    bytes: 246735,
  },
  11: {
    weekNo: 11,
    file: "SOYES_KIDS_11주차_교사용_수업가이드.pdf",
    sha256: "8de0366e80e0c5c60d73c2e6f53164ca7e6908d9c6f45b0ac4c740f34119fbf8",
    pages: 8,
    bytes: 235768,
  },
  12: {
    weekNo: 12,
    file: "SOYES_KIDS_12주차_교사용_수업가이드.pdf",
    sha256: "02729998b203d6d04bac7f9a4c2c367c0725b1715d1a825e621e53a544064e8f",
    pages: 8,
    bytes: 232815,
  },
  13: {
    weekNo: 13,
    file: "SOYES_KIDS_13주차_교사용_수업가이드.pdf",
    sha256: "74cc6364fd0cad3f3356013d7b15cc819d538699354b38ce321530153c84c5d8",
    pages: 8,
    bytes: 237090,
  },
  14: {
    weekNo: 14,
    file: "SOYES_KIDS_14주차_교사용_수업가이드.pdf",
    sha256: "cd5eaaecdb2405b65cc9580a5fac88a38cf06758997c40c1a67fbf6ddc960124",
    pages: 8,
    bytes: 244670,
  },
  15: {
    weekNo: 15,
    file: "SOYES_KIDS_15주차_교사용_수업가이드.pdf",
    sha256: "16dc2df2a05688566487bdcd48fca555deb9f8d6f3906957a6e59476bec0eec8",
    pages: 8,
    bytes: 237389,
  },
  16: {
    weekNo: 16,
    file: "SOYES_KIDS_16주차_교사용_수업가이드.pdf",
    sha256: "9ad62a9cd1e2bcce4a3ab0896c3efe49f7a2288b3018a5f0469ea8fdbbe5fea8",
    pages: 8,
    bytes: 242089,
  },
  17: {
    weekNo: 17,
    file: "SOYES_KIDS_17주차_교사용_수업가이드.pdf",
    sha256: "9134dd825de7a24ab394a91f4968b5620bafe07cabe33c0bceb68f1d2ea8bc5d",
    pages: 8,
    bytes: 214910,
  },
  18: {
    weekNo: 18,
    file: "SOYES_KIDS_18주차_교사용_수업가이드 (1).pdf",
    sha256: "064ec72110a22d6a14b9b9f8d6109ccfd51945f873ec31ff92063ff680ea8c7e",
    pages: 8,
    bytes: 213196,
  },
  19: {
    weekNo: 19,
    file: "SOYES_KIDS_19주차_교사용_수업가이드.pdf",
    sha256: "d9239870b8a748b4fed24d0953cfc0cf9f513e03117df16739b4dc3cc6afabe3",
    pages: 8,
    bytes: 203882,
  },
  20: {
    weekNo: 20,
    file: "SOYES_KIDS_20주차_교사용_수업가이드.pdf",
    sha256: "1da904925f53945f19217f5cf5f2d6676d37e6e59bf5e24a5b3d07a695bb7890",
    pages: 8,
    bytes: 213202,
  },
  21: {
    weekNo: 21,
    file: "SOYES_KIDS_21주차_교사용_수업가이드.pdf",
    sha256: "739121f446b912022b9b1e7dbc05503720e771c68efc4ab6c00d820cb1ae7724",
    pages: 8,
    bytes: 198958,
  },
  22: {
    weekNo: 22,
    file: "SOYES_KIDS_22주차_교사용_수업가이드.pdf",
    sha256: "2eedbcbb45e468d86d4d99d5f626da596324f3f3a7cd3fdc4d08978f8e2154fd",
    pages: 8,
    bytes: 219886,
  },
  23: {
    weekNo: 23,
    file: "SOYES_KIDS_23주차_교사용_수업가이드.pdf",
    sha256: "ae1a76335c5a0823f5390e869ffcc66e62807089adccb313b203c72b3cb02e93",
    pages: 8,
    bytes: 211858,
  },
  24: {
    weekNo: 24,
    file: "SOYES_KIDS_24주차_교사용_수업가이드.pdf",
    sha256: "b4734c5667bd243d612305230a3fe8c548729533d6fa090037a341e3acba3c30",
    pages: 8,
    bytes: 207422,
  },
};

export function guideSourceOf(weekNo: number): GuideSource | null {
  return GUIDE_SOURCES[weekNo] ?? null;
}

/**
 * 해시 앞 12자만 보여 준다.
 *
 * ★ 화면에서 대조하는 내다 — 64자를 다 적으면 읽지 않는다. 전진
 *   12자만 있으면 사람이 `shasum` 결과와 맞추기에 충분하다.
 */
export function shortHash(sha256: string): string {
  return sha256.slice(0, 12);
}
