import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "비밀번호 찾기 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/**
 * 기관 사용자(원장 · 교사) 비밀번호 재설정 요청 화면.
 *
 * 이 화면은 로그인하지 않은 상태에서 열리므로 세션을 요구하지 않는다.
 * 실제 재설정은 메일 링크를 통해 /auth/set-password에서 이루어진다.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[var(--radius-card)] border border-navy/10 bg-white p-8 shadow-[var(--shadow-card)] sm:p-10">
          <p className="text-[12px] font-bold tracking-[0.18em] text-yellow">
            TEACHABLE ART PLAY
          </p>
          <h1 className="mt-3 text-[24px] font-bold text-navy">비밀번호 찾기</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy/60">
            가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>

          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-[13px] text-navy/50">
          <Link
            href="/login"
            className="font-semibold text-navy/70 underline-offset-4 transition-colors hover:text-navy hover:underline"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}
