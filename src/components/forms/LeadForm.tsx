"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildLeadSubmissionPayload,
  validateLeadForm,
  type LeadFormErrors,
  type LeadFormValues,
} from "@/lib/validation/leadForm";
import { leadFormCopy } from "@/data/site-copy";
import { pricingPackages } from "@/data/packages";
import type { PackageCode, SubmissionType } from "@/types/leadForm";

const EMPTY_VALUES: LeadFormValues = {
  institutionName: "",
  contactName: "",
  position: "",
  phone: "",
  email: "",
  childCount: "",
  classCount: "",
  packageCode: "",
  message: "",
  privacyAgreed: false,
  marketingAgreed: false,
  website: "",
};

interface LeadFormProps {
  type: SubmissionType;
  titleId: string;
  defaultPackageCode?: PackageCode | null;
  onClose: () => void;
}

export function LeadForm({ type, titleId, defaultPackageCode, onClose }: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(() => ({
    ...EMPTY_VALUES,
    packageCode: defaultPackageCode ?? "",
  }));
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const copy = leadFormCopy[type];

  function updateField<K extends keyof LeadFormValues>(field: K, value: LeadFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    // Honeypot: 값이 채워져 있으면 Bot으로 간주 — 저장은 건너뛰고 정상 성공처럼 보이게만 한다.
    if (values.website.trim()) {
      setSubmitStatus("success");
      return;
    }

    const validationErrors = validateLeadForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const supabase = createClient();
      // pilot/demo/consult는 정규 상품 선택과 구분되어야 하므로 관심 상품 필드를 보여주지 않고,
      // package_code는 항상 null로 저장한다. purchase_interest에서만 실제 선택값을 전달한다.
      const effectiveValues: LeadFormValues =
        type === "purchase_interest" ? values : { ...values, packageCode: "" };
      const payload = buildLeadSubmissionPayload(type, effectiveValues);
      const { error } = await supabase.from("lead_submissions").insert(payload);

      if (error) {
        console.error("lead_submissions insert failed:", error);
        setSubmitStatus("error");
        return;
      }

      setSubmitStatus("success");
    } catch (error) {
      console.error("lead_submissions insert threw:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-trust-blue/10 text-trust-blue">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.5 6.5 9.5 17.5 4 12" />
          </svg>
        </span>
        <h2 id={titleId} className="text-xl font-bold text-navy sm:text-2xl">
          신청이 접수되었습니다.
        </h2>
        <p className="text-sm leading-relaxed text-navy/60 sm:text-base">
          담당자가 확인 후 연락드리겠습니다.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-yellow px-8 py-3 text-sm font-bold text-navy transition-colors hover:bg-yellow/90"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 id={titleId} className="text-xl font-bold text-navy sm:text-2xl">
          {copy.headline}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-navy/60">{copy.description}</p>
      </div>

      {/* Honeypot — 실제 사용자에게는 보이지 않고 스크린리더도 건너뜀 */}
      <div className="absolute -left-[9999px] top-0" aria-hidden="true">
        <label htmlFor="lead-form-website">웹사이트</label>
        <input
          id="lead-form-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => updateField("website", event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="기관명" required error={errors.institutionName}>
          <input
            type="text"
            value={values.institutionName}
            onChange={(event) => updateField("institutionName", event.target.value)}
            maxLength={100}
            className={inputClass(errors.institutionName)}
          />
        </Field>

        <Field label="담당자명" required error={errors.contactName}>
          <input
            type="text"
            value={values.contactName}
            onChange={(event) => updateField("contactName", event.target.value)}
            maxLength={50}
            className={inputClass(errors.contactName)}
          />
        </Field>

        <Field label="직책" error={errors.position}>
          <input
            type="text"
            value={values.position}
            onChange={(event) => updateField("position", event.target.value)}
            maxLength={50}
            className={inputClass(errors.position)}
          />
        </Field>

        <Field label="연락처" required error={errors.phone}>
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            maxLength={30}
            placeholder="010-0000-0000"
            className={inputClass(errors.phone)}
          />
        </Field>

        <Field label="이메일" error={errors.email}>
          <input
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            maxLength={255}
            className={inputClass(errors.email)}
          />
        </Field>

        {type === "purchase_interest" && (
          <Field label="관심 상품">
            <select
              value={values.packageCode}
              onChange={(event) => updateField("packageCode", event.target.value)}
              className={inputClass(undefined)}
            >
              <option value="">선택 안 함</option>
              {pricingPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} · {pkg.subtitle}
                </option>
              ))}
              <option value="undecided">아직 결정하지 않았어요</option>
            </select>
          </Field>
        )}

        <Field label="원아 수" error={errors.childCount}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={values.childCount}
            onChange={(event) => updateField("childCount", event.target.value)}
            className={inputClass(errors.childCount)}
          />
        </Field>

        <Field label="반 수" error={errors.classCount}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={values.classCount}
            onChange={(event) => updateField("classCount", event.target.value)}
            className={inputClass(errors.classCount)}
          />
        </Field>
      </div>

      <Field label="문의 내용" error={errors.message}>
        <textarea
          rows={4}
          value={values.message}
          onChange={(event) => updateField("message", event.target.value)}
          maxLength={2000}
          className={inputClass(errors.message)}
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-navy/10 pt-4">
        <label className="flex items-start gap-2.5 text-sm text-navy/75">
          <input
            type="checkbox"
            checked={values.privacyAgreed}
            onChange={(event) => updateField("privacyAgreed", event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-trust-blue"
          />
          <span>
            개인정보 수집·이용에 동의합니다. <span className="text-trust-blue">*</span>
          </span>
        </label>
        {errors.privacyAgreed && (
          <p className="text-xs font-medium text-red-600">{errors.privacyAgreed}</p>
        )}

        <label className="flex items-start gap-2.5 text-sm text-navy/60">
          <input
            type="checkbox"
            checked={values.marketingAgreed}
            onChange={(event) => updateField("marketingAgreed", event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-trust-blue"
          />
          <span>소식 및 안내 수신에 동의합니다. (선택)</span>
        </label>
      </div>

      {submitStatus === "error" && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-600">
          신청을 저장하지 못했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-yellow px-8 py-3.5 text-base font-bold text-navy transition-colors hover:bg-yellow/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "제출 중..." : "신청하기"}
      </button>
    </form>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-base text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-trust-blue/25 ${
    error ? "border-red-300" : "border-navy/15 focus:border-trust-blue"
  }`;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
      <span>
        {label} {required && <span className="text-trust-blue">*</span>}
      </span>
      {children}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}
