/** public.organizations 대응 타입 (20260815_create_organization_foundation.sql) */

export type InstitutionType =
  | "kindergarten"
  | "daycare"
  | "academy"
  | "other";

export type OrganizationStatus = "active" | "suspended";

export interface OrganizationRow {
  id: string;
  name: string;
  institution_type: InstitutionType | null;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}
