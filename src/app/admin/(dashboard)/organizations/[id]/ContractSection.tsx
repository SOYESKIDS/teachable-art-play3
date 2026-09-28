"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  appButtonDanger,
  appButtonPrimary,
  appButtonSecondary,
  noticeDanger,
  noticeSuccess,
  noticeWarning,
} from "@/components/ui/app-button";
import {
  CONTRACT_STATUS_LABELS,
  FEATURE_LABELS,
  contractPeriodLabel,
  formatDotDate,
  type FeatureCode,
} from "@/lib/entitlement/labels";
import type { ContractView, PublishedVersionOption, ReadinessItem } from "@/lib/admin/contract-queries";
import {
  activateContractAction,
  addContractClassAction,
  changeContractStatusAction,
  createContractAction,
  removeContractClassAction,
  type ContractActionState,
} from "./contract-actions";

const IDLE: ContractActionState = { phase: "idle", message: null };

const fieldClass =
  "min-h-11 w-full rounded-lg border border-control-border bg-white px-3 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

const READINESS_LABELS: Record<string, string> = {
  contract: "계약 · 기관 상태",
  product_version: "상품 버전 발행",
  class_scope: "계약 반 범위",
  program_assignment: "반별 프로그램 배정",
  content: "약속한 차시 콘텐츠 준비",
  pilot_capacity: "Pilot 반 정원 (15명 이하)",
  pilot_teachers: "Pilot 참여 교사 2~4명",
};

const REASON_LABELS: Record<string, string> = {
  not_found: "계약을 찾을 수 없습니다.",
  organization_suspended: "기관이 운영 중 상태가 아닙니다.",
  contract_suspended: "일시 정지된 계약입니다.",
  contract_ended: "종료된 계약입니다.",
  version_not_published: "발행되지 않은 상품 버전입니다.",
  no_class_in_scope: "계약 범위에 반이 없습니다.",
  too_many_classes: "상품이 허용하는 반 수를 넘었습니다.",
  archived_class_in_scope: "보관된 반이 범위에 있습니다.",
  class_without_active_assignment: "운영 중 프로그램이 없는 반이 있습니다.",
  content_not_ready: "발행 차시 또는 필수 섹션이 비어 있는 week 가 있습니다.",
  policy_blocked: "정책 결정 대기 중인 기능입니다.",
  not_released: "아직 출시되지 않은 기능입니다.",
  pilot_capacity_exceeded: "정원을 넘은 반이 있습니다.",
  pilot_teacher_count: "참여 교사 수가 조건과 다릅니다.",
};

function readinessLabel(code: string): string {
  if (code.startsWith("feature:")) {
    const feature = code.slice("feature:".length) as FeatureCode;
    return `포함 기능 · ${FEATURE_LABELS[feature] ?? feature}`;
  }
  return READINESS_LABELS[code] ?? code;
}

function readinessDetail(item: ReadinessItem): string | null {
  const detail = item.detail;
  if (!detail || item.ok) return null;
  if (item.code === "content" && Array.isArray(detail.missing_weeks)) {
    const weeks = [...new Set(detail.missing_weeks.map((entry) => (entry as { week_no?: number }).week_no))]
      .filter((week): week is number => typeof week === "number")
      .sort((a, b) => a - b);
    return weeks.length > 0 ? `준비 안 된 week: ${weeks.join(", ")}` : null;
  }
  if (item.code.startsWith("feature:") && Array.isArray(detail.blocked_by) && detail.blocked_by.length > 0) {
    return `결정 대기: ${detail.blocked_by.join(", ")}`;
  }
  if (item.code === "pilot_teachers" && typeof detail.teacher_count === "number") {
    return `현재 ${detail.teacher_count}명`;
  }
  return null;
}

function ActionNotice({ state }: { state: ContractActionState }) {
  if (state.phase === "idle" || !state.message) return null;
  return (
    <p role={state.phase === "error" ? "alert" : "status"} className={state.phase === "error" ? noticeDanger : noticeSuccess}>
      {state.message}
    </p>
  );
}

interface ContractSectionProps {
  organizationId: string;
  today: string;
  contracts: ContractView[];
  versions: PublishedVersionOption[];
  classes: { id: string; name: string; status: string }[];
  hasError: boolean;
}

/**
 * HQ "계약 · 이용권" (DEC-106).
 * 계약 상태(초안 · 유효 · 일시 정지 · 종료)와 날짜 파생 이용 기간 상태를 한 배지로 섞지 않는다.
 * 결제 · 청구 정보는 없다 (No PG).
 */
export function ContractSection({ organizationId, today, contracts, versions, classes, hasError }: ContractSectionProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section className="rounded-xl border border-navy/10 bg-white p-5 lg:col-span-2" aria-labelledby="contract-section-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="contract-section-title" className="text-[15px] font-bold text-navy">
            계약 · 이용권
          </h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            계약은 초안으로 만든 뒤 준비 상태가 모두 충족되면 활성화합니다. 결제 · 청구는 이 화면에서 다루지 않습니다.
          </p>
        </div>
        <button type="button" className={appButtonSecondary} onClick={() => setCreateOpen(true)}>
          계약 초안 만들기
        </button>
      </div>

      {hasError ? (
        <p className={`mt-4 ${noticeDanger}`}>계약 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      ) : contracts.length === 0 ? (
        <p className="mt-4 rounded-lg border border-navy/10 bg-surface-soft px-4 py-8 text-center text-[14px] text-ink-muted">
          등록된 계약이 없습니다. 계약이 없으면 이 기관은 수업 · 리포트 기능을 쓸 수 없습니다.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {contracts.map((contract) => (
            <ContractCard key={contract.id} organizationId={organizationId} today={today} contract={contract} classes={classes} />
          ))}
        </ul>
      )}

      <CreateContractDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
        versions={versions}
      />
    </section>
  );
}

function CreateContractDialog({
  open,
  onClose,
  organizationId,
  versions,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  versions: PublishedVersionOption[];
}) {
  const [state, formAction, pending] = useActionState(createContractAction, IDLE);

  return (
    <Dialog open={open} onClose={onClose} title="계약 초안 만들기" busy={pending}>
      {versions.length === 0 ? (
        <p className={noticeWarning}>발행된 상품 버전이 없습니다. 상품 버전을 먼저 발행해야 계약을 만들 수 있습니다.</p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="organizationId" value={organizationId} />
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
            상품 버전
            <select name="productVersionId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                선택해 주세요
              </option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
              이용 시작일
              <input type="date" name="startDate" required className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
              이용 종료일
              <input type="date" name="endDate" required className={fieldClass} />
            </label>
          </div>
          <ActionNotice state={state} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className={appButtonSecondary} onClick={onClose} disabled={pending}>
              닫기
            </button>
            <button type="submit" className={appButtonPrimary} disabled={pending}>
              {pending ? "저장 중" : "초안 만들기"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function ContractCard({
  organizationId,
  today,
  contract,
  classes,
}: {
  organizationId: string;
  today: string;
  contract: ContractView;
  classes: { id: string; name: string; status: string }[];
}) {
  const [addState, addAction, addPending] = useActionState(addContractClassAction, IDLE);
  const [activateOpen, setActivateOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<"suspended" | "active" | "ended" | null>(null);

  const scopedIds = new Set(contract.classes.map((item) => item.classId));
  const addable = classes.filter((item) => item.status === "active" && !scopedIds.has(item.id));
  const editableScope = contract.status === "draft" || contract.status === "active";
  const capacity = contract.childrenPerClass;

  return (
    <li className="rounded-lg border border-navy/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink">
            {contract.productName ?? "상품 정보 없음"}
            {contract.versionLabel ? <span className="ml-1 text-[13px] font-medium text-ink-muted">({contract.versionLabel})</span> : null}
          </p>
          <p className="text-[13px] text-ink-muted">
            {formatDotDate(contract.startDate)} ~ {formatDotDate(contract.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          <span className="rounded-md border border-navy/15 bg-surface-soft px-2 py-0.5 text-ink">
            계약 {CONTRACT_STATUS_LABELS[contract.status]}
          </span>
          <span className="rounded-md border border-navy/15 bg-white px-2 py-0.5 text-ink-muted">
            기간 {contractPeriodLabel(contract.startDate, contract.endDate, today)}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid gap-1 text-[13px] text-ink sm:grid-cols-3">
        <div>
          <dt className="inline text-ink-muted">약속 week </dt>
          <dd className="inline">{contract.weekFrom !== null && contract.weekTo !== null ? `${contract.weekFrom}~${contract.weekTo}` : "—"}</dd>
        </div>
        <div>
          <dt className="inline text-ink-muted">반당 기준 인원 </dt>
          <dd className="inline">{capacity !== null ? `${capacity}명` : "—"}</dd>
        </div>
        <div>
          <dt className="inline text-ink-muted">최대 반 수 </dt>
          <dd className="inline">{contract.maxClasses ?? "제한 없음"}</dd>
        </div>
      </dl>
      <p className="mt-1 text-[13px] leading-relaxed text-ink">
        <span className="text-ink-muted">포함 기능 </span>
        {contract.features.length > 0
          ? contract.features
              .map((feature) => {
                const label = FEATURE_LABELS[feature.code as FeatureCode] ?? feature.code;
                return feature.aiCapabilities && feature.aiCapabilities.length > 0
                  ? `${label} (${feature.aiCapabilities.join(" · ")})`
                  : label;
              })
              .join(" · ")
          : "없음"}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">실제 이용 가능 여부는 계약 상태 · 이용 기간 · 반 범위 · 기능 출시 상태로 서버가 판정합니다.</p>

      {contract.statusReason ? <p className="mt-2 text-[13px] text-ink-muted">최근 변경 사유: {contract.statusReason}</p> : null}

      <div className="mt-4">
        <h3 className="text-[13px] font-bold text-ink">계약 반 범위</h3>
        {contract.classes.length === 0 ? (
          <p className="mt-1 text-[13px] text-ink-muted">범위에 포함된 반이 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {contract.classes.map((item) => {
              const over = capacity !== null && item.activeChildren > capacity;
              return (
                <li key={item.contractClassId} className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-ink">
                  <span>
                    {item.className}
                    <span className="ml-2 text-[13px] text-ink-muted">
                      재원 {item.activeChildren}명{capacity !== null ? ` / 기준 ${capacity}명` : ""}
                    </span>
                    {over ? (
                      <span className="ml-2 text-[12px] font-semibold text-warning-text">
                        {contract.offerType === "pilot" ? "Pilot 정원 초과 · 활성화 불가" : "기준 인원 초과 · 초과분은 기록만 됩니다"}
                      </span>
                    ) : null}
                  </span>
                  {editableScope ? (
                    <form action={removeContractClassAction}>
                      <input type="hidden" name="contractClassId" value={item.contractClassId} />
                      <button type="submit" className="min-h-11 rounded-lg px-3 text-[13px] font-semibold text-danger hover:bg-danger-soft">
                        범위에서 제외
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {editableScope && addable.length > 0 ? (
          <form action={addAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="contractId" value={contract.id} />
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[13px] font-semibold text-ink">
              반 추가
              <select name="classId" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  반 선택
                </option>
                {addable.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={appButtonSecondary} disabled={addPending}>
              {addPending ? "추가 중" : "추가"}
            </button>
          </form>
        ) : null}
        <div className="mt-2">
          <ActionNotice state={addState} />
        </div>
      </div>

      {contract.readiness ? (
        <div className="mt-4">
          <h3 className="text-[13px] font-bold text-ink">
            준비 상태 {contract.readiness.ready ? "· 모두 충족" : "· 미충족 항목 있음"}
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {contract.readiness.items.map((item) => {
              const detail = readinessDetail(item);
              return (
                <li key={item.code} className="text-[13px] leading-relaxed">
                  <span className={item.ok ? "font-semibold text-success-text" : "font-semibold text-danger"}>
                    {item.ok ? "충족" : "미충족"}
                  </span>
                  <span className="ml-2 text-ink">{readinessLabel(item.code)}</span>
                  {!item.ok && item.reason ? (
                    <span className="ml-2 text-ink-muted">{REASON_LABELS[item.reason] ?? item.reason}</span>
                  ) : null}
                  {detail ? <span className="ml-2 text-ink-muted">({detail})</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : contract.status === "draft" || contract.status === "active" ? (
        <p className="mt-4 text-[13px] text-ink-muted">준비 상태를 불러오지 못했습니다.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {contract.status === "draft" ? (
          <button
            type="button"
            className={appButtonPrimary}
            disabled={!contract.readiness?.ready}
            onClick={() => setActivateOpen(true)}
          >
            계약 활성화
          </button>
        ) : null}
        {contract.status === "active" ? (
          <button type="button" className={appButtonSecondary} onClick={() => setStatusTarget("suspended")}>
            일시 정지
          </button>
        ) : null}
        {contract.status === "suspended" ? (
          <button type="button" className={appButtonSecondary} onClick={() => setStatusTarget("active")}>
            재개
          </button>
        ) : null}
        {contract.status === "active" || contract.status === "suspended" ? (
          <button type="button" className={appButtonSecondary} onClick={() => setStatusTarget("ended")}>
            계약 종료
          </button>
        ) : null}
      </div>

      <ActivateDialog open={activateOpen} onClose={() => setActivateOpen(false)} contract={contract} />
      <StatusDialog target={statusTarget} onClose={() => setStatusTarget(null)} contract={contract} />
    </li>
  );
}

function ActivateDialog({ open, onClose, contract }: { open: boolean; onClose: () => void; contract: ContractView }) {
  const [state, formAction, pending] = useActionState(activateContractAction, IDLE);
  const done = state.phase === "success";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="계약을 활성화할까요?"
      description="활성화하면 이용 기간 동안 계약 반에서 수업 · 리포트 기능이 열립니다. 동시에 유효한 계약은 하나만 둘 수 있습니다."
      busy={pending}
    >
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="contractId" value={contract.id} />
        <input type="hidden" name="expectedUpdatedAt" value={contract.updatedAt} />
        <ActionNotice state={state} />
        <div className="flex justify-end gap-2">
          <button type="button" className={appButtonSecondary} onClick={onClose} disabled={pending}>
            {done ? "닫기" : "취소"}
          </button>
          {done ? null : (
            <button type="submit" className={appButtonPrimary} disabled={pending}>
              {pending ? "활성화 중" : "활성화"}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

const STATUS_COPY: Record<"suspended" | "active" | "ended", { title: string; description: string; button: string }> = {
  suspended: {
    title: "계약을 일시 정지할까요?",
    description: "정지 중에는 새 수업 · 기록 작성이 막히고, 이미 작성된 기록은 읽기만 할 수 있습니다.",
    button: "일시 정지",
  },
  active: {
    title: "계약을 재개할까요?",
    description: "재개하면 이용 기간 안에서 다시 수업 · 리포트 기능을 쓸 수 있습니다.",
    button: "재개",
  },
  ended: {
    title: "계약을 종료할까요?",
    description: "종료한 계약은 다시 활성화할 수 없습니다. 이후 이용은 새 계약으로 진행합니다.",
    button: "계약 종료",
  },
};

function StatusDialog({
  target,
  onClose,
  contract,
}: {
  target: "suspended" | "active" | "ended" | null;
  onClose: () => void;
  contract: ContractView;
}) {
  const [state, formAction, pending] = useActionState(changeContractStatusAction, IDLE);
  const copy = target ? STATUS_COPY[target] : null;
  const done = state.phase === "success";

  return (
    <Dialog open={target !== null} onClose={onClose} title={copy?.title ?? ""} description={copy?.description} busy={pending}>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="contractId" value={contract.id} />
        <input type="hidden" name="status" value={target ?? ""} />
        <input type="hidden" name="expectedUpdatedAt" value={contract.updatedAt} />
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
          사유 (필수)
          <textarea name="reason" required maxLength={500} rows={3} className={`${fieldClass} py-2`} />
        </label>
        <ActionNotice state={state} />
        <div className="flex justify-end gap-2">
          <button type="button" className={appButtonSecondary} onClick={onClose} disabled={pending}>
            {done ? "닫기" : "취소"}
          </button>
          {done ? null : (
            <button type="submit" className={target === "active" ? appButtonPrimary : appButtonDanger} disabled={pending}>
              {pending ? "처리 중" : copy?.button}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
