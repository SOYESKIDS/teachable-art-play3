import type { Metadata } from "next";
import { StaffLoginCard } from "@/components/auth/StaffLoginCard";
import { resolveLoginNotice } from "./form-state";

export const metadata: Metadata = {
  title: "로그인 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 기관 사용자(원장 · 교사) 로그인.
 *
 * ★ 이 경로는 옮기지도 지우지도 않는다.
 *   초대 수락(/auth/confirm), 비밀번호 재설정(/auth/set-password),
 *   로그아웃(/auth/logout), 권한 없는 접근(requireDirector/requireTeacher),
 *   Proxy 의 비로그인 차단이 전부 /login 으로 돌아온다.
 *   유치원 전용 포털(/kindergarten)은 그 위에 얹은 **입구**이지
 *   이 목적지를 대신하는 것이 아니다.
 *
 * ★ 로그인 카드는 /kindergarten 과 같은 것을 쓴다.
 *   인증 action 도 하나다(organizationSignInAction).
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-[440px]">
        <StaffLoginCard
          title="기관 로그인"
          description="원장님과 선생님을 위한 기관 운영 공간입니다."
          initialError={resolveLoginNotice(params.error)}
          idPrefix="login"
          footnote="계정은 SOYESKIDS 담당자의 초대로 발급됩니다."
        />
      </div>
    </main>
  );
}
