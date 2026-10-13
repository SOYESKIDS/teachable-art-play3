import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { InfoPageShell } from "@/components/public/InfoPageShell";
import { SampleStage } from "@/components/public/SampleStage";
import {
  approvedLessonSample,
  sampleCopy,
  screenTourScenes,
} from "@/data/public-sample";

export const metadata: Metadata = {
  title: "샘플 수업 | TeachAble Art Play",
  description:
    "교실 TV·전자칠판에 띄우는 수업 화면을 직접 넘겨 보세요. 원아 개인정보가 없는 공개 샘플입니다.",
};

/**
 * 공개 샘플 수업 체험.
 *
 * ── 공개해도 되는 것만 쓴다 ──────────────────────────────────────
 *
 * ★ 공식 교안에서 문장을 가져오지 않는다. 공개 허락을 받은 실제 샘플이
 *   생기면(`approvedLessonSample`) 그것을 쓰고, 그 전까지는 화면 사용법을
 *   설명하는 장면만 보여 준다. 화면에 그 사실을 적는다.
 *
 * ── 개인정보가 없다 ──────────────────────────────────────────────
 *
 * ★ 로그인 없이 열리는 페이지다. 원아 이름·사진·관찰은 데이터에 없다.
 */
export default function SamplePage() {
  const sample = approvedLessonSample;
  const scenes = sample?.scenes ?? screenTourScenes;
  const isLessonSample = sample !== null;

  return (
    <PublicShell>
      <InfoPageShell
        eyebrow={sampleCopy.eyebrow}
        headline={sampleCopy.headline}
        subCopy={sampleCopy.subCopy}
      >
        {!isLessonSample ? (
          <p className="rounded-xl border border-warning-soft bg-warning-soft px-5 py-4 text-body-sm leading-relaxed text-warning-text">
            {sampleCopy.notLessonNotice}
          </p>
        ) : null}

        <div className="mt-6">
          <SampleStage
            scenes={scenes}
            themeColor={sampleCopy.themeColor}
            weekLabel={isLessonSample ? `${sample.weekNo}주차 · ${sample.title}` : "화면 설명"}
          />
        </div>

        <p className="mt-4 text-caption leading-relaxed text-ink-muted">
          {sampleCopy.noPersonalData}
        </p>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-label font-bold text-navy">수업 화면에서 교사가 하는 일</h2>
          <ul className="mt-3 flex flex-col gap-2 text-body-sm leading-relaxed text-ink">
            <li>이전·다음으로 장면을 넘깁니다. 키보드 화살표로도 넘어갑니다.</li>
            <li>활동을 시작하면 「화면 쉬기」로 화면을 비워 둡니다.</li>
            <li>타이머로 활동 시간을 봅니다. 시간이 지나도 화면이 저절로 넘어가지 않습니다.</li>
            <li>수업이 끝나면 관찰한 장면을 짧게 기록하고 결과를 보고합니다.</li>
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/curriculum"
            className="inline-flex min-h-12 items-center rounded-lg border border-navy/20 px-5 text-label font-semibold text-navy"
          >
            24주 수업 보기
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-12 items-center rounded-lg border border-navy/20 px-5 text-label font-semibold text-navy"
          >
            상품 안내
          </Link>
          <Link
            href="/#contact"
            className="inline-flex min-h-12 items-center rounded-lg bg-navy px-5 text-label font-semibold text-white"
          >
            도입 상담 신청
          </Link>
        </div>
      </InfoPageShell>
    </PublicShell>
  );
}
