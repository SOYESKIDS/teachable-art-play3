import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell>
      <AuthCard
        eyebrow="계정 도움"
        title="비밀번호 찾기"
        description="가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다."
      >
        <ForgotPasswordForm />
      </AuthCard>

      <p className="mt-5 text-center text-caption">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-navy hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </AuthShell>
  );
}
