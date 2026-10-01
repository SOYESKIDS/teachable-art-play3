import Link from "next/link";
import { AuthCard } from "./AuthShell";
import { StaffLoginForm } from "./StaffLoginForm";

/**
 * 기관 사용자 로그인 카드.
 *
 * /login 과 /kindergarten 이 같은 카드를 쓴다.
 * 두 경로의 차이는 **카드를 감싸는 바깥 화면**뿐이다 —
 * /login 은 초대 · 비밀번호 재설정 흐름이 되돌아오는 조용한 목적지이고,
 * /kindergarten 은 공개 홈페이지에서 걸어 들어오는 입구다.
 * 안에 있는 폼과 인증 경로는 완전히 같다.
 */
export function StaffLoginCard({
  title,
  description,
  initialError = null,
  idPrefix,
  footnote,
}: {
  title: string;
  description: string;
  initialError?: string | null;
  idPrefix?: string;
  footnote: string;
}) {
  return (
    <AuthCard eyebrow="원장 · 교사" title={title} description={description}>
      <StaffLoginForm initialError={initialError} idPrefix={idPrefix} />

      <p className="mt-4 text-center text-caption">
        <Link
          href="/auth/forgot-password"
          className="inline-flex min-h-11 items-center font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-navy hover:underline"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </p>

      <p className="mt-3 border-t border-line-soft pt-5 text-center text-caption text-ink-muted">
        {footnote}
      </p>
    </AuthCard>
  );
}
