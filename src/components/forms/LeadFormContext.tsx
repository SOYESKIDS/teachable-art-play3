"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PackageCode, SubmissionType } from "@/types/leadForm";

interface LeadFormContextValue {
  isOpen: boolean;
  formType: SubmissionType | null;
  packageCode: PackageCode | null;
  /** Pricing에서 마지막으로 선택한 상품 — Purchase Section의 "선택하신 상품" 표시에 사용 */
  lastSelectedPackageCode: PackageCode | null;
  openLeadForm: (type: SubmissionType, packageCode?: PackageCode) => void;
  closeLeadForm: () => void;
}

const LeadFormContext = createContext<LeadFormContextValue | null>(null);

/** 홈페이지 전역에서 Lead Form Dialog를 여닫기 위한 최소한의 Context (전역 State 라이브러리 미사용) */
export function LeadFormProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formType, setFormType] = useState<SubmissionType | null>(null);
  const [packageCode, setPackageCode] = useState<PackageCode | null>(null);
  const [lastSelectedPackageCode, setLastSelectedPackageCode] = useState<PackageCode | null>(
    null,
  );

  const openLeadForm = (type: SubmissionType, code?: PackageCode) => {
    setFormType(type);
    setPackageCode(code ?? null);
    if (code) setLastSelectedPackageCode(code);
    setIsOpen(true);
  };

  const closeLeadForm = () => setIsOpen(false);

  return (
    <LeadFormContext.Provider
      value={{
        isOpen,
        formType,
        packageCode,
        lastSelectedPackageCode,
        openLeadForm,
        closeLeadForm,
      }}
    >
      {children}
    </LeadFormContext.Provider>
  );
}

/**
 * Provider가 없으면 null을 돌려주는 안전한 접근자.
 *
 * Header·MobileStickyCta는 LeadFormProvider가 없는 페이지(/programs/*, /kindergarten 등)
 * 에서도 그대로 렌더링된다. 그쪽에서 useLeadForm()을 부르면 throw되어
 * 페이지 전체가 죽는다. 그래서 전환 버튼은 이 hook을 쓰고,
 * Provider가 없으면 #contact 앵커로 대체한다.
 */
export function useOptionalLeadForm() {
  return useContext(LeadFormContext);
}

export function useLeadForm() {
  const context = useContext(LeadFormContext);
  if (!context) {
    throw new Error("useLeadForm은 LeadFormProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
