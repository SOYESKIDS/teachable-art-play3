import type { Metadata } from "next";
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
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-[420px]">
        <div className="rounded-[var(--radius-card)] border border-navy/10 bg-white p-8 shadow-[var(--shadow-card)] sm:p-10">
          <p className="text-[12px] font-bold tracking-[0.18em] text-yellow">
            SOYESKIDS ADMIN
          </p>
          <h1 className="mt-3 text-[24px] font-bold text-navy">
            TeachAble Art Play
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy/60">
            기관 문의와 도입 현황을 관리합니다.
          </p>

          <LoginForm initialError={initialError} />
        </div>

        <p className="mt-6 text-center text-[12px] text-navy/40">
          관리자 전용 페이지입니다.
        </p>
      </div>
    </main>
  );
}
