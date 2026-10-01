import type { Metadata } from "next";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "SOYESKIDS ADMIN 로그인",
  robots: { index: false, follow: false },
};

/** searchParams는 신뢰할 수 없는 입력이므로 정해진 코드만 메시지로 변환한다. */
const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "관리자 권한이 없는 계정입니다.",
};

function resolveErrorMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;
  return code ? (ERROR_MESSAGES[code] ?? null) : null;
}

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const initialError = resolveErrorMessage(params.error);

  return (
    <AuthShell homeHref={null}>
      <AuthCard
        eyebrow="SOYESKIDS 본사"
        title="운영 콘솔 로그인"
        description="기관 문의 · 도입 · 수업 프로그램을 관리합니다."
      >
        <LoginForm initialError={initialError} />
      </AuthCard>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-caption text-ink-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        본사 관리자 전용 페이지입니다.
      </p>
    </AuthShell>
  );
}
