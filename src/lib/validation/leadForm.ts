import type { SubmissionType } from "@/types/leadForm";

/** 문의내용 max 2000, 기관명 100, 담당자명 50, 직책 50, 전화번호 30, 이메일 255 (Migration의 CHECK와 동일 기준) */
export const LEAD_FORM_MAX_LENGTHS = {
  institutionName: 100,
  contactName: 50,
  position: 50,
  phone: 30,
  email: 255,
  message: 2000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LeadFormValues {
  institutionName: string;
  contactName: string;
  position: string;
  phone: string;
  email: string;
  childCount: string;
  classCount: string;
  packageCode: string;
  message: string;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
  /** Honeypot: 실제 사용자에게는 보이지 않아야 하는 필드 */
  website: string;
}

export type LeadFormErrors = Partial<Record<keyof LeadFormValues, string>>;

export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};

  if (!values.institutionName.trim()) {
    errors.institutionName = "기관명을 입력해 주세요.";
  } else if (values.institutionName.trim().length > LEAD_FORM_MAX_LENGTHS.institutionName) {
    errors.institutionName = `기관명은 ${LEAD_FORM_MAX_LENGTHS.institutionName}자 이내로 입력해 주세요.`;
  }

  if (!values.contactName.trim()) {
    errors.contactName = "담당자명을 입력해 주세요.";
  } else if (values.contactName.trim().length > LEAD_FORM_MAX_LENGTHS.contactName) {
    errors.contactName = `담당자명은 ${LEAD_FORM_MAX_LENGTHS.contactName}자 이내로 입력해 주세요.`;
  }

  if (values.position.trim().length > LEAD_FORM_MAX_LENGTHS.position) {
    errors.position = `직책은 ${LEAD_FORM_MAX_LENGTHS.position}자 이내로 입력해 주세요.`;
  }

  if (!values.phone.trim()) {
    errors.phone = "연락처를 입력해 주세요.";
  } else if (values.phone.trim().length > LEAD_FORM_MAX_LENGTHS.phone) {
    errors.phone = `연락처는 ${LEAD_FORM_MAX_LENGTHS.phone}자 이내로 입력해 주세요.`;
  }

  if (values.email.trim()) {
    if (values.email.trim().length > LEAD_FORM_MAX_LENGTHS.email) {
      errors.email = `이메일은 ${LEAD_FORM_MAX_LENGTHS.email}자 이내로 입력해 주세요.`;
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      errors.email = "이메일 형식을 확인해 주세요.";
    }
  }

  if (values.childCount.trim()) {
    const parsed = Number(values.childCount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.childCount = "원아 수는 0 이상의 숫자로 입력해 주세요.";
    }
  }

  if (values.classCount.trim()) {
    const parsed = Number(values.classCount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.classCount = "반 수는 0 이상의 숫자로 입력해 주세요.";
    }
  }

  if (values.message.trim().length > LEAD_FORM_MAX_LENGTHS.message) {
    errors.message = `문의 내용은 ${LEAD_FORM_MAX_LENGTHS.message}자 이내로 입력해 주세요.`;
  }

  if (!values.privacyAgreed) {
    errors.privacyAgreed = "개인정보 수집·이용에 동의해 주세요.";
  }

  return errors;
}

function toNullableString(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function toNullableInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

/**
 * lead_submissions에 INSERT할 payload를 만든다.
 * id / status / source / created_at / updated_at은 DB Default에 맡기고 절대 포함하지 않는다.
 */
export function buildLeadSubmissionPayload(type: SubmissionType, values: LeadFormValues) {
  return {
    submission_type: type,
    institution_name: values.institutionName.trim(),
    contact_name: values.contactName.trim(),
    position: toNullableString(values.position),
    phone: values.phone.trim(),
    email: toNullableString(values.email),
    child_count: toNullableInt(values.childCount),
    class_count: toNullableInt(values.classCount),
    package_code: values.packageCode ? values.packageCode : null,
    message: toNullableString(values.message),
    privacy_agreed: values.privacyAgreed,
    marketing_agreed: values.marketingAgreed,
  };
}
