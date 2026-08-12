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

export function useLeadForm() {
  const context = useContext(LeadFormContext);
  if (!context) {
    throw new Error("useLeadForm은 LeadFormProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
