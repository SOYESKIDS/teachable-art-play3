import type { Metadata } from "next";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell>
      <AuthCard
        eyebrow="계정 설정"
        title={copy.heading}
        description={copy.description}
      >
        {email ? (
          <p className="mt-4 rounded-lg bg-surface-soft px-4 py-3 text-caption font-medium text-ink">
            {email}
          </p>
        ) : null}

        <SetPasswordForm mode={mode} />
      </AuthCard>
    </AuthShell>
  );
}
