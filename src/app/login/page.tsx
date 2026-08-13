import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { LOGIN_NOTICES } from "./form-state";

export const metadata: Metadata = {
  title: "로그인 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** searchParams는 신뢰할 수 없는 입력이므로 정해진 코드만 메시지로 변환한다 */
function resolveNotice(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;
  return code ? (LOGIN_NOTICES[code] ?? null) : null;
}

/**
 * 기관 사용자(원장 · 향후 교사) 전용 로그인.
 * SOYES 운영자 로그인(/admin/login)과 화면·흐름을 분리한다.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialError = resolveNotice(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[var(--radius-card)] border border-navy/10 bg-white p-8 shadow-[var(--shadow-card)] sm:p-10">
          <p className="text-[12px] font-bold tracking-[0.18em] text-yellow">
            TEACHABLE ART PLAY
          </p>
          <h1 className="mt-3 text-[24px] font-bold text-navy">기관 로그인</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy/60">
            원장님과 선생님을 위한 기관 운영 공간입니다.
          </p>

          <LoginForm initialError={initialError} />
        </div>

        <p className="mt-6 text-center text-[12px] text-navy/40">
          계정은 SOYESKIDS 담당자의 초대로 발급됩니다.
        </p>
      </div>
    </main>
  );
}
