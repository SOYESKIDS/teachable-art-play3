"use server";

import { guardWrite } from "@/lib/env/write-guard";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { UUID_PATTERN, logRpcFailure, toUserFacingError } from "@/lib/errors/rpc-errors";
import type { CurriculumFormState } from "../../../curriculum-state";

/**
 * 수업 자산 등록 · 정책 Server Action — 사용자 지시 항목 7.
 *
 * ── 테이블을 직접 쓰지 않는다 ─────────────────────────────────────
 *
 * `register_lesson_asset` · `set_lesson_asset_policy` RPC 만 쓴다. 두 RPC 는
 * HQ 여부를 다시 확인하고, 사유를 필수로 받고, audit 에 남긴다. 화면에서
 * `lesson_assets` 를 UPDATE 하면 그 세 가지가 빠진다.
 *
 * ── 성공을 흉내내지 않는다 ────────────────────────────────────────
 *
 * ★ RPC 가 실패하면 실패로 돌려준다. "저장했습니다"를 먼저 띄우지 않는다.
 * ★ 동시 수정(LA008)은 그대로 알린다. 조용히 덮어쓰지 않는다.
 *
 * ── 발행 조건을 비껴가지 않는다 ───────────────────────────────────
 *
 * published 는 저장 경로와 권리 확인(cleared)을 요구하는 CHECK 가 B2 에 있다.
 * 여기서 상태만 바꿔 "제공 중"으로 보이게 만들지 않는다 — DB 가 거절하고,
 * 그 거절을 그대로 화면에 보여 준다.
 *
 * ★ 이 파일의 런타임 export 는 async Server Action 뿐이다.
 *   상태 타입은 ../../../curriculum-state.ts 를 공유한다.
 */

const FALLBACK = "처리하지 못했습니다. 다시 시도해 주세요.";

const ASSET_TYPES = [
  "ebook",
  "story",
  "workbook",
  "teacher_guide",
  "activity_material",
  "vod",
  "music_video",
  "audio",
] as const;

const USAGE_POINTS = [
  "arrival",
  "intro",
  "story",
  "core",
  "creative",
  "closing",
  "workbook",
  "extension",
] as const;

export async function registerLessonAssetAction(
  _prev: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  guardWrite("app/admin/curriculum/asset-actions:registerLessonAssetAction");

  const lessonId = String(formData.get("lessonId") ?? "");
  const assetType = String(formData.get("assetType") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 1);
  const usagePointRaw = String(formData.get("usagePoint") ?? "").trim();
  const usageNote = String(formData.get("usageNote") ?? "").trim();
  const sourceRef = String(formData.get("sourceRef") ?? "").trim();

  if (!UUID_PATTERN.test(lessonId)) {
    return { phase: "error", message: "차시 정보를 확인할 수 없습니다." };
  }
  if (!(ASSET_TYPES as readonly string[]).includes(assetType)) {
    return { phase: "error", message: "자산 유형을 선택해 주세요." };
  }
  if (title.length < 1 || title.length > 200) {
    return { phase: "error", message: "자산 이름을 1~200자로 입력해 주세요." };
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 200) {
    return { phase: "error", message: "표시 순서를 1~200 사이로 입력해 주세요." };
  }
  if (usagePointRaw !== "" && !(USAGE_POINTS as readonly string[]).includes(usagePointRaw)) {
    return { phase: "error", message: "사용 시점을 다시 선택해 주세요." };
  }
  if (usageNote.length > 300) {
    return { phase: "error", message: "사용 시점 설명은 300자 이내로 입력해 주세요." };
  }
  if (sourceRef.length > 300) {
    return { phase: "error", message: "원본 근거는 300자 이내로 입력해 주세요." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("register_lesson_asset", {
    p_lesson_id: lessonId,
    p_asset_type: assetType,
    p_title: title,
    p_sort_order: sortOrder,
    p_usage_point: usagePointRaw === "" ? null : usagePointRaw,
    p_usage_note: usageNote === "" ? null : usageNote,
    p_source_ref: sourceRef === "" ? null : sourceRef,
  });

  if (error) {
    logRpcFailure("asset register", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return {
    phase: "success",
    // ★ "등록"과 "제공"을 구분해 적는다. 자리를 만든 것뿐이다.
    message:
      "자산 자리를 등록했습니다. 파일 등록과 권리 확인이 끝나면 발행할 수 있습니다.",
  };
}

export async function setLessonAssetPolicyAction(
  _prev: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  guardWrite("app/admin/curriculum/asset-actions:setLessonAssetPolicyAction");

  const assetId = String(formData.get("assetId") ?? "");
  const approvalStatus = String(formData.get("approvalStatus") ?? "");
  const rightsStatus = String(formData.get("rightsStatus") ?? "");
  const downloadAllowed = formData.get("downloadAllowed") === "on";
  const rightsNote = String(formData.get("rightsNote") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");

  if (!UUID_PATTERN.test(assetId) || expectedUpdatedAt === "") {
    return { phase: "error", message: "자산 정보를 확인할 수 없습니다." };
  }
  if (!["draft", "reviewed", "approved", "published", "archived"].includes(approvalStatus)) {
    return { phase: "error", message: "승인 상태를 다시 선택해 주세요." };
  }
  if (!["unverified", "cleared", "restricted"].includes(rightsStatus)) {
    return { phase: "error", message: "권리 상태를 다시 선택해 주세요." };
  }
  if (reason === "" || reason.length > 500) {
    return { phase: "error", message: "변경 사유를 500자 이내로 입력해 주세요." };
  }
  if (rightsNote.length > 500) {
    return { phase: "error", message: "권리 메모는 500자 이내로 입력해 주세요." };
  }
  if (downloadAllowed && rightsStatus !== "cleared") {
    return {
      phase: "error",
      message: "권리 확인이 끝난 자산만 내려받기를 허용할 수 있습니다.",
    };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("set_lesson_asset_policy", {
    p_asset_id: assetId,
    p_approval_status: approvalStatus,
    p_rights_status: rightsStatus,
    p_download_allowed: downloadAllowed,
    p_rights_note: rightsNote === "" ? null : rightsNote,
    p_reason: reason,
    p_expected_updated_at: expectedUpdatedAt,
  });

  if (error) {
    logRpcFailure("asset policy", error);
    return { phase: "error", message: toUserFacingError(error, FALLBACK).message };
  }

  refresh();
  return { phase: "success", message: "자산 정책을 변경했습니다." };
}
