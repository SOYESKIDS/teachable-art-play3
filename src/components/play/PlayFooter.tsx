import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { COMPANY_FIELDS } from "@/data/legal";
import { contactInfo, legalLinks } from "@/data/site-copy";
import { ConsultButton } from "./ConsultButton";

/**
 * 2026 공개 체험 바닥글 — 간결하게.
 *
 * ★ 체험 입구 다섯 개만: 24주 수업 체험 · 수업 진행 체험 · 성장리포트 예시 · 문의하기 · 유치원 로그인.
 *   예전 바닥글의 상품 · 샘플 수업 · 제공 현황 링크는 2026 공개 체험과 겹치거나
 *   확정 전 판매 조건으로 읽힐 수 있어 여기서는 뺐다 (페이지 자체는 지우지 않았다).
 * ★ 사업자 표기 · 개인정보처리방침 · 이용약관은 기존 legal.ts · site-copy.ts 값을 그대로 쓴다.
 */
const LINKS = [
  { label: "24주 수업 체험", href: "/experience/weeks" },
  { label: "수업 진행 체험", href: "/experience/classroom/4" },
  { label: "성장리포트 예시", href: "/experience/report" },
  { label: "유치원 로그인", href: "/kindergarten" },
];

const BUSINESS_LABELS = ["상호", "대표자", "사업자등록번호", "통신판매업 신고번호", "주소"];
const businessFields = COMPANY_FIELDS.filter((f) => BUSINESS_LABELS.includes(f.label) && f.value);

export function PlayFooter() {
  return (
    <footer data-surface="dark" className="bg-pop-ink pb-10 pt-14 text-white/75 sm:pt-16">
      <div className="mx-auto max-w-[1320px] 2xl:max-w-[1520px] px-4 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[30ch]">
            <BrandMark tone="inverse" layout="stacked" />
            <p className="mt-5 font-display text-[24px] leading-snug text-white">놀이가 예술이 되고, 예술이 성장으로.</p>
            <p className="mt-2 text-[14px] text-white/65">2026년은 누구나 로그인 없이 체험할 수 있습니다.</p>
          </div>
          <nav aria-label="바닥글 바로가기" className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center text-[16px] font-bold text-white hover:text-pop-yellow">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col items-start gap-3">
            <ConsultButton tone="yellow" size="lg">문의하기</ConsultButton>
            <p className="text-[14px]">
              <span className="whitespace-nowrap">{contactInfo.phone}</span>
              <span aria-hidden="true"> · </span>
              <span className="whitespace-nowrap">{contactInfo.email}</span>
            </p>
          </div>
        </div>
        <div className="mt-12 flex flex-col-reverse gap-3 border-t border-white/15 pt-6 text-[13px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="break-keep">
              {businessFields.map((f, i) => (
                <span key={f.label}>
                  {i > 0 ? <span aria-hidden="true"> · </span> : null}
                  <span className={f.label === "주소" ? undefined : "whitespace-nowrap"}>{f.label === "상호" ? f.value : `${f.label} ${f.value}`}</span>
                </span>
              ))}
            </p>
            {/* 생성 · 예시 이미지 표기 */}
            <p className="mt-1">화면의 수업 장면 이미지는 이해를 돕기 위한 예시이며, 일부는 생성형 이미지 도구로 만든 그림입니다. 체험 화면의 원아 · 기록은 모두 가상입니다.</p>
            <p className="mt-1">{contactInfo.copyright}</p>
          </div>
          <div className="flex flex-wrap gap-x-5">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
