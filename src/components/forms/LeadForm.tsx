"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildLeadSubmissionPayload,
  validateLeadForm,
  type LeadFormErrors,
  type LeadFormValues,
} from "@/lib/validation/leadForm";
import { leadFormCopy } from "@/data/site-copy";
import { buttonClasses } from "@/components/ui/PublicButton";
import { fieldAuth } from "@/components/ui/field-public";
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
  // 같은 틱 안의 두 번째 제출(빠른 연타 · 중복 이벤트)을 막는다 — state 는 다음 렌더 전까지 false 로 보인다
  const submittingRef = useRef(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const copy = leadFormCopy[type];

  function updateField<K extends keyof LeadFormValues>(field: K, value: LeadFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || submittingRef.current) return;

    // Honeypot: 값이 채워져 있으면 Bot으로 간주 — 저장은 건너뛰고 정상 성공처럼 보이게만 한다.
    if (values.website.trim()) {
      setSubmitStatus("success");
      return;
    }

    const validationErrors = validateLeadForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    submittingRef.current = true;
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
      submittingRef.current = false;
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
        <h2 id={titleId} className="text-title font-bold text-navy sm:text-headline">
          신청이 접수되었습니다.
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          접수 후 1주일 이내에 연락드립니다.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-8 py-3 text-sm font-bold text-white shadow-[var(--shadow-cta)] transition-all duration-200 hover:bg-primary-hover active:scale-[0.98]"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 id={titleId} className="text-title font-bold text-navy sm:text-headline">
          {copy.headline}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{copy.description}</p>
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
            autoComplete="organization"
            maxLength={100}
            className={inputClass(errors.institutionName)}
          />
        </Field>

        <Field label="담당자명" required error={errors.contactName}>
          <input
            type="text"
            value={values.contactName}
            onChange={(event) => updateField("contactName", event.target.value)}
            autoComplete="name"
            maxLength={50}
            className={inputClass(errors.contactName)}
          />
        </Field>

        <Field label="직책" error={errors.position}>
          <input
            type="text"
            value={values.position}
            onChange={(event) => updateField("position", event.target.value)}
            autoComplete="organization-title"
            maxLength={50}
            className={inputClass(errors.position)}
          />
        </Field>

        <Field label="연락처" required error={errors.phone}>
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            autoComplete="tel"
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
            autoComplete="email"
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

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <label className="flex min-h-11 items-start gap-3 py-1 text-sm text-ink">
          <input
            type="checkbox"
            checked={values.privacyAgreed}
            onChange={(event) => updateField("privacyAgreed", event.target.checked)}
            aria-invalid={errors.privacyAgreed ? true : undefined}
            aria-describedby={errors.privacyAgreed ? "lead-form-privacy-error" : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-navy"
          />
          <span>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-trust-blue underline underline-offset-2"
            >
              개인정보 처리방침
            </a>
            을 확인했으며 개인정보 수집·이용에 동의합니다.{" "}
            <span className="text-accent-strong" aria-hidden="true">*</span>
            <span className="sr-only">(필수)</span>
          </span>
        </label>
        {errors.privacyAgreed && (
          <p id="lead-form-privacy-error" className="text-caption font-medium text-danger">
            {errors.privacyAgreed}
          </p>
        )}

        <label className="flex min-h-11 items-start gap-3 py-1 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={values.marketingAgreed}
            onChange={(event) => updateField("marketingAgreed", event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-navy"
          />
          <span>소식 및 안내 수신에 동의합니다. (선택)</span>
        </label>

        <p className="text-xs leading-relaxed text-ink-muted">
          {"서비스 이용에 관한 사항은 "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-navy"
          >
            이용약관
          </a>
          {"에서 확인하실 수 있습니다."}
        </p>
      </div>

      {submitStatus === "error" && (
        <p role="alert" className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium leading-relaxed text-danger">
          신청을 저장하지 못했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={buttonClasses({ variant: "primary", size: "lg", className: "font-bold" })}
      >
        {isSubmitting ? "제출 중..." : "신청하기"}
      </button>
    </form>
  );
}

function inputClass(error?: string) {
  return `${fieldAuth} rounded-xl text-base ${error ? "border-danger" : ""}`;
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
  const errorId = useId();
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
      <span>
        {label}{" "}
        {required && (
          <>
            <span className="text-accent-strong" aria-hidden="true">*</span>
            <span className="sr-only">(필수)</span>
          </>
        )}
      </span>
      {/* 오류 문구를 입력칸에 이어 준다 — 화면 읽기 프로그램이 칸에서 곧바로 이유를 읽는다 */}
      {isValidElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>(children)
        ? cloneElement(children, {
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? errorId : undefined,
          })
        : children}
      {error && (
        <span id={errorId} className="text-caption font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
