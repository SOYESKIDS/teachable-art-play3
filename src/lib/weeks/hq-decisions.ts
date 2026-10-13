/**
 * 본사 결정 대기 목록 — 전사 과정에서 **원문만으로는 정할 수 없는** 것들.
 *
 * ── 왜 별도 목록인가 ─────────────────────────────────────────────
 *
 * 전사 중 분명하지 않았던 곳은 주차별 `TranscriptionNote` 에 남는다. 그중
 * `category: "decision"` 은 전사자가 풀 수 없는 것이다 — 원문 안에서 값이
 * 서로 다르거나, 원문이 맞더라도 상품 기준을 정해야 하는 것들이다.
 *
 * 주의 기록은 「무엇이 모호했나」를 적지만, 결정하려면 더 필요하다.
 * 그래서 이 파일이 **권장안**과 **영향 주차**를 더해 들고 간다.
 *
 * ★ 결정 전까지 원문 값을 그대로 둔다. 권장안은 제안일 뿐 적용본이 아니다.
 * ★ 결정이 나면 원문 수정이 선행되어야 하는 항목이 있다 (needsSourceFix).
 *   코드만 고치면 다음 전사 때 원문과 다시 어긋난다.
 */

export interface HqDecision {
  id: string;
  /** 결정이 필요한 주차 */
  weekNo: number;
  /** 원문 위치 — 쪽과 섹션 */
  sourceLocation: string;
  /** 무엇이 충돌하거나 비어 있는가 */
  conflict: string;
  /** 지금 코드에 들어 있는 값 (결정 전까지 바뀌지 않는다) */
  currentValue: string;
  /** 전사자의 권장안. 적용본이 아니다 */
  recommendation: string;
  /** 이 결정이 바뀌면 함께 손봐야 하는 주차 */
  affectedWeeks: number[];
  /**
   * 결정 후 **원문 PDF 자체를 고쳐야** 하는가.
   * true 면 코드만 고치면 다음 전사 때 다시 어긋난다.
   */
  needsSourceFix: boolean;
}

export const HQ_DECISIONS: HqDecision[] = [
  {
    id: "w06-core-message",
    weekNo: 6,
    sourceLocation: "p.1 표지 / p.2 2. 수업 한눈에 보기 · 핵심 메시지",
    conflict:
      "같은 원문 안에서 핵심 메시지가 두 가지로 적혀 있다. 표지(1쪽)는 「혼자 하기 어려운 일도 친구와 힘을 합치고 도움을 주고받으면 함께 해낼 수 있어요.」, 2번 섹션(2쪽)은 「혼자 하기 어려운 일도 친구와 힘을 합치면 함께 해낼 수 있어요.」다. 표지 쪽에 「도움을 주고받으면」이 더 들어 있다.",
    currentValue:
      "2번 섹션 값 — 「혼자 하기 어려운 일도 친구와 힘을 합치면 함께 해낼 수 있어요.」",
    recommendation:
      "2번 섹션 값을 공식 문장으로 확정하고 표지를 맞추는 쪽을 권합니다. 핵심 메시지는 24주 지도·교실 화면·보호자 안내에 모두 같은 문장으로 나가야 하는데, 2번 섹션이 그 세 곳의 출처이기 때문입니다. 다만 표지 문장이 6주차의 「도움을 주고받는다」는 활동 성격을 더 정확히 담고 있다면 반대로 2번 섹션을 고치는 편이 낫습니다 — 어느 쪽이든 원문 두 곳을 같게 만들어야 합니다.",
    affectedWeeks: [6],
    needsSourceFix: true,
  },
  {
    id: "w05-audio-duplicate",
    weekNo: 5,
    sourceLocation: "p.3 4. 수업 전 준비 · 음원 / p.6 10. 음원·뮤직비디오 활용",
    conflict:
      "5주차 음원 네 곡(① 씨앗이 톡! ② 물을 주세요 ③ 햇살이 좋아요 ④ 우리는 친구 새싹)이 4주차와 완전히 같다. 준비물 칸과 10번 표가 모두 같은 네 곡이다. 5주차 전용 음원이 따로 제작됐는데 원문이 4주차 것을 그대로 둔 것인지, 두 주차가 실제로 같은 음원을 쓰는 것인지 확인이 필요하다.",
    currentValue: "원문 그대로 — 4주차와 같은 네 곡",
    recommendation:
      "음원 제작 목록과 대조해 5주차 전용 곡이 있는지 먼저 확인하기를 권합니다. 전용 곡이 있으면 원문 두 곳(4번 준비물·10번 표)을 함께 고쳐야 합니다. 두 주차가 실제로 같은 음원을 공유하는 운영이라면 원문에 「4주차와 동일」이라고 밝혀 교사가 자료 누락으로 오해하지 않게 하는 편이 좋습니다. 자료 등록 화면에서도 두 주차가 같은 파일을 가리키는지가 드러나야 합니다.",
    affectedWeeks: [4, 5],
    needsSourceFix: true,
  },
  {
    id: "w02-duration-label",
    weekNo: 2,
    sourceLocation: "p.2 2. 수업 한눈에 보기 · 권장 핵심수업 시간",
    conflict:
      "원문은 「약 55~65 분 (기관 일정에 따라 분리 운영 가능)」인데, 24주 지도(week-index)의 요약 칸에는 「약 55~65분」만 들어 있고 괄호 안 운영 안내는 주차 블록에만 있다. 요약 칸에서 분리 운영 가능 여부가 보이지 않는다.",
    currentValue:
      "주차 블록은 원문 전체 · 24주 지도 요약 칸은 「약 55~65분」",
    recommendation:
      "요약 칸은 지금처럼 시간만 두고, 분리 운영 가능 여부를 **별도 표시**로 빼는 쪽을 권합니다. 괄호 문구를 요약 칸에 그대로 넣으면 24주 목록이 길어져 비교가 어렵고, 주차마다 괄호 문구가 조금씩 달라 일관되게 줄이기도 어렵습니다. 「워크북·미술 분리 운영 가능」은 24주 대부분에 해당하므로 요약 칸의 항목이 아니라 지도 전체의 안내로 올리는 것이 맞습니다. 이는 화면 표현 결정이므로 원문 수정은 필요하지 않습니다.",
    affectedWeeks: [2],
    needsSourceFix: false,
  },
];

/** 주차별 결정 대기 건. 없으면 빈 배열 */
export function hqDecisionsOf(weekNo: number): HqDecision[] {
  return HQ_DECISIONS.filter((d) => d.weekNo === weekNo);
}

/** 이 주차가 다른 주차의 결정에 영향을 받는가 (자기 주차 건은 뺀다) */
export function affectedByOtherDecisions(weekNo: number): HqDecision[] {
  return HQ_DECISIONS.filter((d) => d.weekNo !== weekNo && d.affectedWeeks.includes(weekNo));
}
