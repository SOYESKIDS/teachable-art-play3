"use client";

import { useActionState, useState } from "react";
import {
  ASSET_APPROVAL_LABEL,
  ASSET_DOWNLOAD_POLICY_NOTE,
  ASSET_RIGHTS_LABEL,
  ASSET_RIGHTS_MEANING,
  publishBlockers,
  type AdminLessonAsset,
  type AdminLessonAssetList,
} from "@/lib/admin/lesson-asset-admin-queries";
import {
  ASSET_TYPE_LABEL,
  ASSET_USAGE_LABEL,
} from "@/lib/curriculum/lesson-asset-queries";
import {
  CURRICULUM_FORM_INITIAL_STATE,
  type CurriculumFormState,
} from "../../../curriculum-state";
import {
  registerLessonAssetAction,
  setLessonAssetPolicyAction,
} from "./asset-actions";

/**
 * 차시 자산 등록 · 승인 · 설정 — 사용자 지시 항목 7.
 *
 * ── 왜 이 화면이 필요한가 ─────────────────────────────────────────
 *
 * `lesson_assets` 는 기본값이 draft · 권리 확인 전 · 내려받기 불허다. 그 값을
 * 바꿀 화면이 없으면 자산은 영원히 제공되지 않는다. 반대로 테이블을 직접
 * 고치게 두면 사유도 audit 도 남지 않는다. 그래서 RPC 를 쓰는 화면을 둔다.
 *
 * ── 등록은 제공이 아니다 ──────────────────────────────────────────
 *
 * ★ [자산 자리 등록] 은 메타데이터만 만든다. 파일이 없으면 `has_source` 가
 *   false 로 남고, 그 상태로는 발행할 수 없다. 화면이 그것을 "미등록"으로
 *   표시한다 — "준비 중" 하나로 뭉개지 않는다.
 *
 * ── 파일 업로드는 이 화면에 없다 ─────────────────────────────────
 *
 * ★ Storage 업로드 경로를 아직 열지 않았다. 열지 않은 것을 "곧 됩니다"로
 *   적지 않고, 무엇이 남았는지 적는다. 업로드를 흉내내는 버튼을 두지 않는다.
 *
 * ── 되돌릴 수 없는 설정 ───────────────────────────────────────────
 *
 * ★ 내려받기 허용은 파일을 기기에 남긴다. 사유를 필수로 받고, 권리 확인이
 *   끝나지 않은 자산에는 켤 수 없다.
 */

export function LessonAssetSection({
  lessonId,
  list,
}: {
  lessonId: string;
  list: AdminLessonAssetList;
}) {
  const [registerState, registerAction, registerPending] = useActionState(
    registerLessonAssetAction,
    CURRICULUM_FORM_INITIAL_STATE,
  );
  const [openForm, setOpenForm] = useState(false);

  if (list.notInstalled) {
    return (
      <section className="mt-8 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-[16px] font-bold text-ink">수업 자산</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          자산 테이블이 아직 적용되지 않았습니다. 적용 후 등록할 수 있습니다.
        </p>
      </section>
    );
  }

  if (!list.ok) {
    return (
      <section className="mt-8 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-[16px] font-bold text-ink">수업 자산</h2>
        <p className="mt-2 text-[14px] text-danger">
          자산 목록을 불러오지 못했습니다. 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-bold text-ink">수업 자산</h2>
        <button
          type="button"
          onClick={() => setOpenForm((prev) => !prev)}
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 px-3 text-[14px] font-semibold text-navy"
        >
          {openForm ? "등록 양식 닫기" : "자산 자리 등록"}
        </button>
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
        등록은 자리를 만드는 것입니다. 파일 등록과 권리 확인이 끝나야 기관에
        제공됩니다. 파일 업로드 경로는 아직 열려 있지 않습니다.
      </p>

      {openForm ? (
        <form
          action={registerAction}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-navy/10 bg-brand-ivory p-4"
        >
          <input type="hidden" name="lessonId" value={lessonId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[14px]">
              <span className="font-semibold text-ink">자산 유형</span>
              <select name="assetType" required className="min-h-11 rounded-lg border border-navy/20 px-3">
                {(
                  [
                    "ebook",
                    "story",
                    "workbook",
                    "teacher_guide",
                    "activity_material",
                    "vod",
                    "music_video",
                    "audio",
                  ] as const
                ).map((type) => (
                  <option key={type} value={type}>
                    {ASSET_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[14px]">
              <span className="font-semibold text-ink">표시 순서</span>
              <input
                type="number"
                name="sortOrder"
                min={1}
                max={200}
                defaultValue={list.assets.length + 1}
                required
                className="min-h-11 rounded-lg border border-navy/20 px-3"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-[14px]">
            <span className="font-semibold text-ink">자산 이름</span>
            <input
              type="text"
              name="title"
              maxLength={200}
              required
              className="min-h-11 rounded-lg border border-navy/20 px-3"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[14px]">
              <span className="font-semibold text-ink">사용 시점 (선택)</span>
              <select name="usagePoint" className="min-h-11 rounded-lg border border-navy/20 px-3">
                <option value="">모름 · 지정하지 않음</option>
                {(
                  [
                    "arrival",
                    "intro",
                    "story",
                    "core",
                    "creative",
                    "closing",
                    "workbook",
                    "extension",
                  ] as const
                ).map((point) => (
                  <option key={point} value={point}>
                    {ASSET_USAGE_LABEL[point]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[14px]">
              <span className="font-semibold text-ink">원본 근거 (선택)</span>
              <input
                type="text"
                name="sourceRef"
                maxLength={300}
                placeholder="원본 파일명 · 섹션"
                className="min-h-11 rounded-lg border border-navy/20 px-3"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-[14px]">
            <span className="font-semibold text-ink">사용 시점 설명 (선택)</span>
            <textarea
              name="usageNote"
              maxLength={300}
              rows={2}
              className="rounded-lg border border-navy/20 px-3 py-2"
            />
          </label>

          <StateMessage state={registerState} />

          <div>
            <button
              type="submit"
              disabled={registerPending}
              className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {registerPending ? "등록 중…" : "등록"}
            </button>
          </div>
        </form>
      ) : null}

      {list.assets.length === 0 ? (
        <p className="mt-4 rounded-lg border border-navy/10 px-4 py-8 text-center text-[14px] leading-relaxed text-ink-muted">
          이 차시에 등록된 자산이 없습니다. 원본 가이드에 연계 콘텐츠가 있다면 자리를
          먼저 등록해 두세요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {list.assets.map((asset) => (
            <AssetRow key={asset.assetId} asset={asset} />
          ))}
        </ul>
      )}
    </section>
  );
}

function StateMessage({ state }: { state: CurriculumFormState }) {
  if (state.phase === "idle" || !state.message) return null;
  return (
    <p
      role={state.phase === "error" ? "alert" : "status"}
      className={`text-[13px] leading-relaxed ${
        state.phase === "error" ? "text-danger" : "text-ink-muted"
      }`}
    >
      {state.message}
    </p>
  );
}

function AssetRow({ asset }: { asset: AdminLessonAsset }) {
  const [state, action, pending] = useActionState(
    setLessonAssetPolicyAction,
    CURRICULUM_FORM_INITIAL_STATE,
  );
  const [open, setOpen] = useState(false);
  const blockers = publishBlockers(asset);

  return (
    <li className="rounded-lg border border-navy/10 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="rounded-full border border-navy/20 px-2 py-0.5 text-[12px] font-bold text-ink-muted">
              {ASSET_TYPE_LABEL[asset.assetType]}
            </span>
            <span className="text-[15px] font-semibold text-ink">{asset.title}</span>
            <span className="text-[13px] text-ink-muted">· {asset.versionLabel}</span>
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">
            {ASSET_APPROVAL_LABEL[asset.approvalStatus]} ·{" "}
            {ASSET_RIGHTS_LABEL[asset.rightsStatus]} ·{" "}
            {asset.hasSource ? "파일 등록됨" : "파일 미등록"} ·{" "}
            {asset.downloadAllowed ? "내려받기 허용" : "내려받기 불허"}
          </p>
          {asset.usagePoint ? (
            <p className="mt-0.5 text-[13px] text-ink-muted">
              사용 시점: {ASSET_USAGE_LABEL[asset.usagePoint]}
              {asset.usageNote ? ` · ${asset.usageNote}` : ""}
            </p>
          ) : null}
          {asset.sourceRef ? (
            <p className="mt-0.5 text-[13px] text-ink-muted">원본 근거: {asset.sourceRef}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-navy/20 px-3 text-[14px] font-semibold text-navy"
        >
          {open ? "닫기" : "승인 · 정책 변경"}
        </button>
      </div>

      {blockers.length > 0 && asset.approvalStatus !== "published" ? (
        <p className="mt-2 rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-[13px] leading-relaxed text-warning-text">
          발행 전 남은 조건: {blockers.join(" · ")}
        </p>
      ) : null}

      {open ? (
        <form action={action} className="mt-3 flex flex-col gap-3 border-t border-navy/10 pt-3">
          <input type="hidden" name="assetId" value={asset.assetId} />
          {/* 낙관적 동시성 — 다른 관리자가 먼저 바꿨으면 거절된다 */}
          <input type="hidden" name="expectedUpdatedAt" value={asset.updatedAt} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[14px]">
              <span className="font-semibold text-ink">승인 상태</span>
              <select
                name="approvalStatus"
                defaultValue={asset.approvalStatus}
                className="min-h-11 rounded-lg border border-navy/20 px-3"
              >
                {(["draft", "reviewed", "approved", "published", "archived"] as const).map(
                  (status) => (
                    <option key={status} value={status}>
                      {ASSET_APPROVAL_LABEL[status]}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[14px]">
              <span className="font-semibold text-ink">권리 상태</span>
              <select
                name="rightsStatus"
                defaultValue={asset.rightsStatus}
                className="min-h-11 rounded-lg border border-navy/20 px-3"
              >
                {(["unverified", "cleared", "restricted"] as const).map((status) => (
                  <option key={status} value={status}>
                    {ASSET_RIGHTS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-[13px] leading-relaxed text-ink-muted">
            {ASSET_RIGHTS_MEANING[asset.rightsStatus]}
          </p>

          <label className="flex items-start gap-2 text-[14px]">
            <input
              type="checkbox"
              name="downloadAllowed"
              defaultChecked={asset.downloadAllowed}
              className="mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="font-semibold text-ink">내려받기 허용</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">
                {ASSET_DOWNLOAD_POLICY_NOTE}
              </span>
            </span>
          </label>

          <label className="flex flex-col gap-1 text-[14px]">
            <span className="font-semibold text-ink">권리 메모 (선택)</span>
            <textarea
              name="rightsNote"
              maxLength={500}
              rows={2}
              defaultValue={asset.rightsNote ?? ""}
              placeholder="계약 범위 · 확인 근거. 자격증명이나 주소 토큰을 넣지 마세요."
              className="rounded-lg border border-navy/20 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-[14px]">
            <span className="font-semibold text-ink">변경 사유 (필수)</span>
            <textarea
              name="reason"
              maxLength={500}
              rows={2}
              required
              className="rounded-lg border border-navy/20 px-3 py-2"
            />
          </label>

          <StateMessage state={state} />

          <div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "변경 중…" : "변경 저장"}
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
