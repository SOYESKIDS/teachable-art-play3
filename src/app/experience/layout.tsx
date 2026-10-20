import type { Metadata } from "next";
import { PlayShell } from "@/components/play/PlayShell";

/**
 * 공개 체험 영역 (/experience/*).
 *
 * ★ 로그인 · 세션 · DB 를 쓰지 않는다. Proxy matcher 에 포함되지 않는다 (src/proxy.ts).
 *   모든 페이지는 코드 안의 체험 데이터(src/data/experience)로 정적 생성된다.
 * ★ 실제 기관 기능(교사 · 원장 · 관리자 · 보호자 공유)은 이 영역에서 연결되지 않는다.
 *   tests/experience-isolation.test.mjs 가 import 경계를 검사한다.
 */
export const metadata: Metadata = {
  title: "수업 체험 | TeachAble Art Play",
  description: "로그인 없이 24주 통합예술교육 수업을 둘러보고 교실 플레이어로 직접 체험해 보세요. 체험 화면은 가상 데이터이며 저장되지 않습니다.",
};

export default function ExperienceLayout({ children }: LayoutProps<"/experience">) {
  return <PlayShell>{children}</PlayShell>;
}
