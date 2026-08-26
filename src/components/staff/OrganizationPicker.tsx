import Link from "next/link";
import type { ActiveMembership } from "@/lib/auth/organization";

interface OrganizationPickerProps {
  memberships: ActiveMembership[];
  /** 선택 시 이동할 기본 경로 (예: /teacher, /director/sessions) */
  basePath: string;
  roleLabel: string;
}

/**
 * 소속 기관이 여러 곳일 때의 선택 화면.
 *
 * 한 사람이 여러 유치원에 소속되는 경우가 드물지만 실제로 있다.
 * (기존 /director 화면이 이미 같은 방식을 쓰고 있어 동작을 맞춘다.)
 */
export function OrganizationPicker({
  memberships,
  basePath,
  roleLabel,
}: OrganizationPickerProps) {
  return (
    <div className="mx-auto w-full max-w-[600px] px-5 py-10">
      <h1 className="text-[22px] font-bold text-navy">기관 선택</h1>
      <p className="mt-1 text-[14px] text-navy/55">
        소속된 기관이 여러 곳입니다. 수업을 확인할 기관을 선택해주세요.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {memberships.map((membership) => (
          <li key={membership.organizationId}>
            <Link
              href={`${basePath}?org=${membership.organizationId}`}
              className="block rounded-xl border border-navy/10 bg-white p-5 transition-colors hover:border-navy/25"
            >
              <p className="text-[15px] font-bold text-navy">
                {membership.organizationName}
              </p>
              <p className="mt-0.5 text-[12px] text-navy/50">{roleLabel}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
