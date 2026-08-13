import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = {
  title: "비밀번호 설정 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/**
 * 초대를 수락한 사용자가 본인 비밀번호를 직접 설정하는 화면.
 * /auth/confirm에서 verifyOtp로 세션이 만들어진 직후 진입한다.
 */
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // 세션이 없으면 비밀번호를 바꿀 대상 자체가 없다.
  if (!data?.claims) {
    redirect("/login?error=invalid_link");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[var(--radius-card)] border border-navy/10 bg-white p-8 shadow-[var(--shadow-card)] sm:p-10">
          <p className="text-[12px] font-bold tracking-[0.18em] text-yellow">
            TEACHABLE ART PLAY
          </p>
          <h1 className="mt-3 text-[24px] font-bold text-navy">비밀번호 설정</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy/60">
            앞으로 로그인에 사용할 비밀번호를 설정해주세요.
          </p>

          {email ? (
            <p className="mt-4 rounded-[var(--radius-lg)] bg-surface-soft px-4 py-3 text-[13px] text-navy/70">
              {email}
            </p>
          ) : null}

          <SetPasswordForm />
        </div>
      </div>
    </main>
  );
}
