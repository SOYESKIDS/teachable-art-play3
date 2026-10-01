import Image from "next/image";
import { cx } from "@/components/ui/cx";

/**
 * 브랜드 표기 — SOYESKIDS 워드마크 + 서비스명 "TeachAble Art Play".
 *
 * ★ V3: serif italic 을 걷었다 (DEC-109 "serif italic 제거").
 *   font-serif 는 Pretendard 가 아니라 OS 기본 serif(Georgia · 바탕)로 떨어져
 *   기기마다 서비스명이 다른 글꼴로 보였다. 이제 Pretendard Bold 하나로,
 *   "Art Play" 만 Coral 로 구분한다 — 같은 글꼴 안에서 색으로만 리듬을 만든다.
 *
 *   layout="auto"    좁은 화면 2줄(로고 위 · 서비스명 아래), sm 이상 한 줄
 *   layout="stacked" 항상 2줄 (로그인 카드 · 푸터)
 *   tone="inverse"   어두운 바탕 위 (로고는 흰색으로 반전)
 */
export function BrandMark({
  tone = "default",
  layout = "auto",
  priority = false,
  className = "",
}: {
  tone?: "default" | "inverse";
  layout?: "auto" | "stacked";
  priority?: boolean;
  className?: string;
}) {
  const inverse = tone === "inverse";
  const stacked = layout === "stacked";

  return (
    <span
      className={cx(
        "flex leading-none",
        stacked
          ? "flex-col items-start gap-2"
          : "flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
    >
      <Image
        src="/images/site/brand/soyeskids-logo-primary.png"
        alt="SOYESKIDS"
        width={440}
        height={77}
        priority={priority}
        /* 워드마크에 흰 외곽선이 있어 Navy 바탕에서도 원본 그대로 읽힌다 — 색을 뒤집지 않는다 */
        className="h-[17px] w-auto lg:h-[19px]"
      />
      {stacked ? null : (
        <span
          aria-hidden="true"
          className={cx(
            "hidden h-4 w-px sm:block",
            inverse ? "bg-white/25" : "bg-line-strong",
          )}
        />
      )}
      <span
        className={cx(
          "whitespace-nowrap text-[17px] font-bold tracking-[-0.025em] lg:text-lg",
          inverse ? "text-white" : "text-navy",
        )}
      >
        TeachAble{" "}
        <span className={inverse ? "text-accent-on-dark" : "text-accent-strong"}>
          Art Play
        </span>
      </span>
    </span>
  );
}
