"use client";

import Link from "next/link";
import { useOptionalLeadForm } from "@/components/forms/LeadFormContext";
import { popButtonClass, type PopSize, type PopTone } from "./PopButton";

/**
 * 도입 문의 버튼 — 기존 상담 폼(동의 · 검증 · 저장 경로 그대로)을 연다.
 * 폼 Provider 밖이면 홈의 문의 위치로 이동한다.
 */
export function ConsultButton({
  children = "도입 문의하기",
  tone = "ink",
  size = "lg",
  className,
}: {
  children?: string;
  tone?: PopTone;
  size?: PopSize;
  className?: string;
}) {
  const leadForm = useOptionalLeadForm();
  if (!leadForm) {
    return (
      <Link href="/#contact" className={popButtonClass(tone, size, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" data-cta="consult-play" onClick={() => leadForm.openLeadForm("consult")} className={popButtonClass(tone, size, className)}>
      {children}
    </button>
  );
}
