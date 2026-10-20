import { GROWTH_METRIC_LABEL } from "@/lib/curriculum/taxonomies";

/**
 * 가상 성장 리포트 예시 — 실제 원아 · 기관과 연결되지 않은 지어낸 사례다.
 *
 * ★ 점수 · 순위 · 등급 · 진단을 쓰지 않는다. 리포트는 아이가 무엇을 했고 어떻게
 *   달라졌는지를 문장으로 설명한다.
 * ★ 이름은 실존 인물로 오해되지 않도록 「하늘(가상)」처럼 적고, 사진은 쓰지 않는다.
 * ★ 다섯 관찰 관점의 이름은 운영 리포트와 같은 공식 명칭(taxonomies.ts)을 쓴다.
 */
export interface DemoMoment {
  metric: keyof typeof GROWTH_METRIC_LABEL;
  week: number;
  title: string;
  observed: string;
  childVoice: string | null;
}

export const DEMO_REPORT = {
  childLabel: "하늘 (가상 원아)",
  classLabel: "햇살반 (가상)",
  period: "1~4주 · 씨앗과 숲",
  summary:
    "하늘이는 새로운 재료를 만나면 먼저 손으로 만져 보고 소리를 들어 보는 탐색형 친구예요. 4주 동안 ‘처음엔 망설이다가 스스로 다시 해보는’ 순간이 점점 늘었어요.",
  moments: [
    {
      metric: "expression_variety",
      week: 3,
      title: "마음을 색으로 고르기",
      observed: "오늘 기분을 묻자 노랑과 하늘색 구슬을 번갈아 들어 보며 ‘반은 신나고 반은 졸려요’라고 두 가지 마음을 함께 표현했어요.",
      childVoice: "반은 신나고 반은 졸려요!",
    },
    {
      metric: "form_space_composition",
      week: 4,
      title: "씨앗을 크기대로 나란히",
      observed: "마라카스에 넣기 전, 콩 · 해바라기씨 · 좁쌀을 큰 것부터 작은 것 순서로 줄 세운 뒤 ‘작은 건 맨 끝’이라며 배치를 설명했어요.",
      childVoice: null,
    },
    {
      metric: "creative_attempt",
      week: 4,
      title: "소리를 바꾸는 새로운 방법",
      observed: "친구 마라카스와 소리가 비슷하자 씨앗을 조금 덜어 내고 다시 흔들어 보며 ‘이제 비 소리 같아요’라고 스스로 소리를 바꿨어요.",
      childVoice: "이제 비 소리 같아요!",
    },
    {
      metric: "engagement_immersion",
      week: 2,
      title: "한 번 더 도전",
      observed: "콩주머니 나르기 미션에서 두 번 떨어뜨린 뒤 잠시 멈췄다가, 걸음을 천천히 바꿔 끝까지 옮겼어요.",
      childVoice: null,
    },
    {
      metric: "self_explanation",
      week: 1,
      title: "이름표 소개",
      observed: "이름표에 그린 해님을 가리키며 ‘아침에 일찍 일어나서 해님을 그렸어요’라고 친구들 앞에서 그림의 이유를 말했어요.",
      childVoice: "아침에 일찍 일어나서 해님을 그렸어요.",
    },
  ] satisfies DemoMoment[],
  nextSupport:
    "다음 주차에는 하늘이가 고른 재료를 친구에게 소개하는 시간을 조금 더 길게 마련해, 탐색한 것을 말로 나누는 경험을 이어 갈 예정이에요.",
  homeTip: "집에서도 ‘이건 어떤 소리가 날까?’처럼 결과보다 시도를 묻는 질문을 건네 주세요.",
} as const;
