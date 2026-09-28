import type { Metadata } from "next";
import { ChildPortalView } from "@/components/share/ChildPortalView";

export const metadata: Metadata = {
  title: "아이 기록 | TeachAble Art Play",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export const dynamic = "force-dynamic";

interface ChildPortalPageProps {
  params: Promise<{ portalId: string }>;
}

/**
 * PT-01 학부모 "아이 기록" (DEC-040 · DEC-042 · DEC-103).
 * token 은 URL fragment 로만 전달되어 서버 로그 · Referer 에 남지 않는다.
 */
export default async function ChildPortalPage({ params }: ChildPortalPageProps) {
  const { portalId } = await params;

  return (
    <div className="min-h-screen bg-brand-ivory print:bg-white">
      <main className="mx-auto w-full max-w-[640px] px-4 py-6 text-ink">
        <ChildPortalView portalId={portalId} />
      </main>
    </div>
  );
}
