"use client";

import {
  Button,
  ButtonLink,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/PublicButton";
import { useOptionalLeadForm } from "@/components/forms/LeadFormContext";
import type { PackageCode, SubmissionType } from "@/types/leadForm";

interface LeadCtaButtonProps {
  /** 어떤 문의로 접수되는가 — lead_submissions.submission_type과 그대로 이어진다 */
  type: SubmissionType;
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** 분석용 식별자 (기존 data-cta 규칙 유지) */
  dataCta?: string;
  /** purchase_interest에서만 의미가 있다 */
  packageCode?: PackageCode;
  /** 폼을 열기 전에 먼저 처리할 동작 (예: 모바일 메뉴 닫기) */
  onBeforeOpen?: () => void;
}

/**
 * 공개 홈페이지의 전환 버튼.
 *
 * ★ Provider가 없는 화면에서도 안전하게 동작한다.
 *   공개 화면(홈 · /programs/[slug] · /privacy · /terms)은 PublicShell 이
 *   LeadFormProvider 를 함께 올린다. 그 밖의 화면에서 useLeadForm()을 그대로
 *   쓰면 화면이 통째로 죽으므로 optional hook을 쓰고, Provider가 없으면
 *   /#contact(전화·이메일 안내)로 내려보낸다.
 *   전환 경로가 사라지는 것이 아니라 한 단계 낮은 경로로 대체된다.
 *
 * ★ 라벨을 이 컴포넌트가 정하지 않는다.
 *   문구는 전부 site-copy.ts의 ctaLabels에서 온다. 같은 행동을 가리키는
 *   버튼이 화면마다 다른 말을 하지 않게 하기 위해서다.
 */
export function LeadCtaButton({
  type,
  children,
  variant = "primary",
  size = "md",
  className = "",
  dataCta,
  packageCode,
  onBeforeOpen,
}: LeadCtaButtonProps) {
  const leadForm = useOptionalLeadForm();

  if (!leadForm) {
    return (
      <ButtonLink
        href="/#contact"
        variant={variant}
      size={size}
        data-cta={dataCta}
        className={className}
        onClick={onBeforeOpen}
      >
        {children}
      </ButtonLink>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      data-cta={dataCta}
      className={className}
      onClick={() => {
        onBeforeOpen?.();
        leadForm.openLeadForm(type, packageCode);
      }}
    >
      {children}
    </Button>
  );
}
