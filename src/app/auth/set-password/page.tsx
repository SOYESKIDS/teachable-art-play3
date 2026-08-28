import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";
import { SET_PASSWORD_COPY, parseSetPasswordMode } from "./form-state";

export const metadata: Metadata = {
  title: "비밀번호 설정 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface SetPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 비밀번호를 직접 설정하는 화면. 두 흐름이 같은 화면을 쓴다.
 *
 *   1. 초대(invite) 수락 후 최초 비밀번호 설정
 *   2. 비밀번호 찾기(recovery)를 통한 재설정
 *
 * 어느 쪽이든 /auth/confirm에서 세션이 만들어진 직후 진입한다.
 * 구분은 mode 쿼리 하나로만 하고, 문구를 고르는 용도로만 쓴다.
 * 권한 판정에는 쓰지 않는다 — 대상 사용자는 전적으로 세션이 정한다.
 */
export default async function SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  const params = await searchParams;
  const mode = parseSetPasswordMode(params.mode);
  const copy = SET_PASSWORD_COPY[mode];

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // 세션이 없으면 비밀번호를 바꿀 대상 자체가 없다.
  // 재설정 사용자에게 "초대 링크 만료"를 보여주지 않도록 흐름별 코드를 쓴다.
  if (!data?.claims) {
    redirect(`/login?error=${copy.expiredNotice}`);
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
          <h1 className="mt-3 text-[24px] font-bold text-navy">
            {copy.heading}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy/60">
            {copy.description}
          </p>

          {email ? (
            <p className="mt-4 rounded-[var(--radius-lg)] bg-surface-soft px-4 py-3 text-[13px] text-navy/70">
              {email}
            </p>
          ) : null}

          <SetPasswordForm mode={mode} />
        </div>
      </div>
    </main>
  );
}
