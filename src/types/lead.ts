import type { PackageCode, SubmissionType } from "./leadForm";

/** public.lead_submissions.status */
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "closed";

/** public.lead_submissions 한 행 (Admin 조회용) */
export interface LeadRow {
  id: string;
  submission_type: SubmissionType;
  institution_name: string;
  contact_name: string;
  position: string | null;
  phone: string;
  email: string | null;
  child_count: number | null;
  class_count: number | null;
  package_code: PackageCode | null;
  message: string | null;
  privacy_agreed: boolean;
  marketing_agreed: boolean;
  status: LeadStatus;
  created_at: string;
}
