import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchOnboardingState } from "@/lib/admin/onboarding-queries";
import { fetchOrganizationList } from "@/lib/admin/organization-queries";
import { parseOrganizationFilters } from "@/lib/admin/organization-filters";
import {
  ORGANIZATION_STATUS_BADGE_CLASSES,
  ORGANIZATION_STATUS_LABELS,
} from "@/lib/admin/organization-labels";
import { EmptyState, ErrorState, PageHeader, SectionCard } from "@/components/ui/surface";
import { CreateOrganizationStep } from "./CreateOrganizationStep";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata: Metadata = {
  title: "새 기관 도입 | SOYESKIDS Admin",
  robots: { index: false, follow: false },
};

interface OnboardingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * SERVICE-17 — 새 기관 도입 (/admin/onboarding).
 *
 * ★ URL 의 organization id 를 신뢰하지 않는다.
 *   requireAdmin() 을 통과한 뒤 fetchOnboardingState() 가 기관 행을 직접 조회하고,
 *   존재하지 않으면 안내 화면으로 끝낸다. 형식이 틀린 값도 같은 경로로 떨어진다.
 *
 * ★ 진행 상태를 별도로 저장하지 않는다.
 *   온보딩 전용 DB 표를 만들지 않았다. 각 단계의 완료 여부는 실제 데이터에서
 *   계산하므로, 브라우저를 닫아도 · 다른 화면에서 설정해도 그대로 이어진다.
 *
 * ★ 새 기관을 만들지 않은 상태(1단계)와 만든 뒤(2~7단계)를 한 라우트에서 다룬다.
 */
export default async function AdminOnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const { supabase } = await requireAdmin();

  const params = await searchParams;
  const raw = params.organization;
  const requested = Array.isArray(raw) ? raw[0] : raw;

  // ── 기관을 아직 고르지 않았다: 1단계 ────────────────────────────────
  if (!requested) {
    const recent = await fetchOrganizationList(
      supabase,
      parseOrganizationFilters({}),
    );

    return (
      <div className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-8">
        <PageHeader
          title="새 기관 도입"
          description="기관 등록부터 프로그램 배정까지 한 흐름으로 진행합니다. 각 단계는 저장되는 즉시 반영되며, 중간에 닫아도 이어서 설정할 수 있습니다."
          actions={
            <Link
              href="/admin/readiness"
              className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              오픈 준비 현황
            </Link>
          }
        />

        <div className="mt-6 flex flex-col gap-5">
          <CreateOrganizationStep />

          <SectionCard
            title="이미 등록한 기관 이어서 설정"
            description="도입 설정을 중간에 멈춘 기관은 여기서 이어서 진행합니다."
          >
            {!recent.ok ? (
              <ErrorState text="기관 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
            ) : recent.rows.length === 0 ? (
              <EmptyState text="아직 등록된 기관이 없습니다. 위에서 첫 기관을 등록해주세요." />
            ) : (
              <ul className="flex flex-col divide-y divide-navy/8">
                {recent.rows.map((org) => (
                  <li
                    key={org.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 break-words text-[14px] font-semibold text-navy">
                        {org.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${ORGANIZATION_STATUS_BADGE_CLASSES[org.status]}`}
                      >
                        {ORGANIZATION_STATUS_LABELS[org.status]}
                      </span>
                    </span>

                    <Link
                      href={`/admin/onboarding?organization=${encodeURIComponent(org.id)}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-trust-blue/30 bg-white px-3 text-[13px] font-bold text-trust-blue transition-colors hover:border-trust-blue/50 hover:bg-trust-blue/5"
                    >
                      도입 설정 계속
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    );
  }

  // ── 기관을 골랐다: 2~7단계 ──────────────────────────────────────────
  const state = await fetchOnboardingState(supabase, requested);

  if (!state) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-8">
        <PageHeader title="새 기관 도입" />
        <div className="mt-6">
          <EmptyState
            text="기관을 찾을 수 없거나 접근할 수 없습니다."
            action={
              <Link
                href="/admin/onboarding"
                className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-[13px] font-bold text-white transition-colors hover:bg-navy/90"
              >
                처음부터 시작
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-8">
      <PageHeader
        title="새 기관 도입"
        description={`${state.organization.name} 의 도입 설정을 진행합니다.`}
        meta="각 단계는 저장 즉시 반영됩니다. 중간에 닫아도 저장된 내용은 남습니다."
        actions={
          <Link
            href={`/admin/organizations/${state.organization.id}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            기관 상세
          </Link>
        }
      />

      {!state.ok ? (
        <p className="mt-4 rounded-xl border border-navy/15 bg-white px-4 py-3 text-[13px] leading-relaxed text-navy/60">
          현재 설정 상태 일부를 불러오지 못했습니다. 아래 단계는 그대로 진행할 수
          있지만, 표시된 개수가 실제와 다를 수 있습니다.
        </p>
      ) : null}

      <OnboardingFlow state={state} />
    </div>
  );
}
