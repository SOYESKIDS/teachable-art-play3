"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireTeacher } from "@/lib/auth/organization";
import type { ClassStatus } from "@/types/class-child";
import type { ClassSessionStatus } from "@/types/class-session";
import {
  MAX_OBSERVATION_MEDIA_BYTES,
  MAX_OBSERVATION_MEDIA_FILENAME,
  OBSERVATION_MEDIA_BUCKET,
  OBSERVATION_MEDIA_EXTENSIONS,
  OBSERVATION_MEDIA_MIME_TYPES,
  type ObservationMediaFinalizeState,
  type ObservationMediaMimeType,
  type ObservationMediaPrepareState,
} from "@/types/staff-observation-media";

/**
 * SERVICE-09A — 교사 활동사진 업로드 Server Action (2단계).
 *
 * ★ 파일 자체는 Next 서버를 통과하지 않는다.
 *
 *   6 MiB 이미지를 Server Action FormData로 보내면 body size 제한과
 *   서버 메모리를 그대로 쓰게 되고, 교실 네트워크에서 실패율이 높아진다.
 *   그래서 브라우저가 Supabase Storage로 직접 업로드하고,
 *   서버는 그 앞뒤에서 "어디에 올릴 수 있는가"와 "무엇이 올라갔는가"만 판정한다.
 *
 *     1) prepareObservationMediaUpload  — 권한 재검증 + 저장 경로 발급
 *     2) (브라우저) storage.upload(path, file)   ← Storage RLS가 최종 판정
 *     3) finalizeObservationMediaUpload — 권한 재검증 + metadata INSERT
 *
 *   1단계가 경로를 만들어 주지만 그것이 권한의 근거는 아니다.
 *   위조한 경로로 직접 업로드해도 storage.objects의
 *   can_upload_observation_media_object()가 같은 조건을 다시 판정해 거부한다.
 *
 * ★ Client가 보내는 값 중 권한 근거로 쓰는 것은 없다.
 *   organizationId / classId / classStatus / 권한 플래그를 받지 않는다.
 *   organization_id · class_id는 sessionId로 다시 읽은 class_sessions 행에서만 나온다.
 *   created_by는 DB trigger가 auth.uid()로 채운다.
 *
 * ★ service_role을 쓰지 않는다. 사용자 세션 client + RLS만 사용한다.
 * ★ 원장은 이 파일에 도달할 수 없다 — requireTeacher()가 첫 문장이다.
 *
 * ★ FormData가 아니라 일반 인자를 받는 이유
 *   이 두 action은 <form action>에 연결되지 않는다.
 *   file input을 form에 넣어 form action으로 제출하면 React가 File을
 *   FormData에 담아 서버로 보내 버린다 — 위의 "파일이 서버를 통과하지 않는다"가
 *   깨진다. 그래서 화면이 값을 직접 전달하는 구조를 쓴다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** DB의 storage_path CHECK와 같은 형식이다. 한쪽만 바뀌면 안 된다. */
const STORAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** unique(storage_path) — 같은 경로를 두 번 등록하려 한 경우 */
const UNIQUE_VIOLATION = "23505";

/** trigger / CHECK 제약 */
const CHECK_VIOLATION = "23514";

/** RLS Policy 위반 (insufficient_privilege) */
const RLS_VIOLATION = "42501";

/**
 * 20260831110000의 trigger가 직접 던지는 코드.
 * "경로는 유효한데 그 자리에 실제 파일이 없다"는 뜻이다.
 */
const MISSING_STORAGE_OBJECT = "OM006";

const MESSAGES = {
  invalidRequest: "사진 요청 값을 확인할 수 없습니다.",
  invalidType:
    "JPG · PNG · WEBP 이미지만 올릴 수 있습니다.",
  tooLarge: `사진 용량은 ${Math.floor(
    MAX_OBSERVATION_MEDIA_BYTES / (1024 * 1024),
  )}MB 이내여야 합니다.`,
  notFound: "수업을 찾을 수 없거나 접근 권한이 없습니다.",
  cancelled: "취소된 수업에는 활동 사진을 추가할 수 없습니다.",
  archived:
    "보관된 반에는 새 활동 사진을 추가할 수 없습니다. 기존 사진은 계속 확인할 수 있습니다.",
  notInClass:
    "현재 이 수업의 반에 소속된 원아만 활동 사진을 추가할 수 있습니다.",
  notAllowed:
    "이 수업에 활동 사진을 추가할 권한이 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
  missingObject:
    "업로드된 사진을 확인할 수 없습니다. 사진을 다시 선택해 업로드해주세요.",
  failure: "활동 사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
} as const;

function prepareError(message: string): ObservationMediaPrepareState {
  return { ok: false, message };
}

function finalizeError(message: string): ObservationMediaFinalizeState {
  return { ok: false, message };
}

/** 서버 로그에만 남긴다. DB 원문 메시지를 화면에 내보내지 않는다. */
function logFailure(scope: string, message: string) {
  console.error(`[staff/observation-media] ${scope} failed: ${message}`);
}

function isSupportedMimeType(
  value: string,
): value is ObservationMediaMimeType {
  return (OBSERVATION_MEDIA_MIME_TYPES as readonly string[]).includes(
    value,
  );
}

/** 파일명은 표시용으로만 쓴다. 저장 경로에는 절대 들어가지 않는다. */
function normalizeFilename(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (trimmed === "") return null;

  return trimmed.slice(0, MAX_OBSERVATION_MEDIA_FILENAME);
}

interface SessionContextRow {
  id: string;
  organization_id: string;
  class_id: string;
  status: ClassSessionStatus;
}

interface ClassRow {
  id: string;
  status: ClassStatus;
}

interface ChildRow {
  id: string;
  class_id: string | null;
}

/**
 * 두 action이 공유하는 권한 재검증.
 *
 * 여기서 하는 판정은 전부 DB에서 방금 읽은 값이 근거다.
 * Client가 보낸 것은 sessionId / childId 두 개의 uuid뿐이고,
 * 그 둘조차 RLS를 통과해야 행이 돌아온다.
 */
type UploadContext =
  | {
      ok: true;
      supabase: SupabaseClient;
      session: SessionContextRow;
    }
  | {
      ok: false;
      message: string;
    };

async function resolveUploadContext(
  sessionId: string,
  childId: string,
): Promise<UploadContext> {
  // 로그인 + role='teacher' + membership active + 기관 active를 DB가 판정한다.
  const { supabase, memberships } = await requireTeacher();

  const { data: sessionData, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id, organization_id, class_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    logFailure("session lookup", sessionError.message);
    return { ok: false, message: MESSAGES.notFound };
  }

  if (!sessionData) {
    return { ok: false, message: MESSAGES.notFound };
  }

  const session = sessionData as unknown as SessionContextRow;

  /**
   * requireTeacher()는 "어딘가의 교사"까지만 보장한다.
   * 타 기관 sessionId는 RLS가 이미 0건으로 막지만,
   * 기관 대조를 생략하면 그 사실이 코드에 남지 않는다.
   */
  const isTeacherOfOrg = memberships.some(
    (membership) =>
      membership.organizationId === session.organization_id &&
      membership.role === "teacher",
  );

  if (!isTeacherOfOrg) {
    return { ok: false, message: MESSAGES.notFound };
  }

  // 취소된 수업은 조회 전용이다. DB trigger와 Policy가 최종 방어선이다.
  if (session.status === "cancelled") {
    return { ok: false, message: MESSAGES.cancelled };
  }

  const [classResult, childResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id, status")
      .eq("id", session.class_id)
      .maybeSingle(),

    supabase
      .from("children")
      .select("id, class_id")
      .eq("id", childId)
      .eq("organization_id", session.organization_id)
      .maybeSingle(),
  ]);

  if (classResult.error) {
    logFailure("class validation", classResult.error.message);
    return { ok: false, message: MESSAGES.failure };
  }

  if (childResult.error) {
    logFailure("child validation", childResult.error.message);
    return { ok: false, message: MESSAGES.failure };
  }

  const classRow =
    (classResult.data as unknown as ClassRow | null) ?? null;

  const childRow =
    (childResult.data as unknown as ChildRow | null) ?? null;

  /**
   * ★ 신규 업로드는 운영 중인 반에서만 가능하다.
   *   Storage Policy와 테이블 INSERT Policy가 쓰는 is_class_teacher()가
   *   반 active를 요구하므로, 여기서 같은 조건을 먼저 확인해
   *   사용자가 이해할 수 있는 문구로 끝낸다.
   */
  if (classRow?.status !== "active") {
    return { ok: false, message: MESSAGES.archived };
  }

  // ★ 원아가 "지금" 이 수업의 반 소속인가 — DB trigger와 같은 시점 검사다.
  if (!childRow || childRow.class_id !== session.class_id) {
    return { ok: false, message: MESSAGES.notInClass };
  }

  return { ok: true, supabase, session };
}

/**
 * 1단계 — 권한을 다시 확인하고 안전한 저장 경로를 발급한다.
 *
 * 경로 형식: {organization_id}/{class_session_id}/{child_id}/{uuid}.{ext}
 *
 * ★ 파일명도, 확장자도 Client 값을 쓰지 않는다.
 *   확장자는 허용 목록의 mime type에서 서버가 고르고,
 *   마지막 조각은 서버가 만든 uuid다. 같은 경로가 두 번 나오지 않는다.
 */
export async function prepareObservationMediaUpload(input: {
  sessionId: string;
  childId: string;
  mimeType: string;
  byteSize: number;
}): Promise<ObservationMediaPrepareState> {
  const sessionId = String(input?.sessionId ?? "");
  const childId = String(input?.childId ?? "");
  const mimeType = String(input?.mimeType ?? "");
  const byteSize = Number(input?.byteSize ?? 0);

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(childId)) {
    return prepareError(MESSAGES.invalidRequest);
  }

  if (!isSupportedMimeType(mimeType)) {
    return prepareError(MESSAGES.invalidType);
  }

  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    return prepareError(MESSAGES.invalidRequest);
  }

  if (byteSize > MAX_OBSERVATION_MEDIA_BYTES) {
    return prepareError(MESSAGES.tooLarge);
  }

  const context = await resolveUploadContext(sessionId, childId);

  if (!context.ok) {
    return prepareError(context.message);
  }

  const extension = OBSERVATION_MEDIA_EXTENSIONS[mimeType];

  const storagePath = [
    context.session.organization_id,
    context.session.id,
    childId,
    `${randomUUID()}.${extension}`,
  ].join("/");

  return {
    ok: true,
    bucket: OBSERVATION_MEDIA_BUCKET,
    storagePath,
  };
}

/**
 * 3단계 — 업로드가 끝난 객체의 metadata를 등록한다.
 *
 * ★ 여기서도 권한을 처음부터 다시 판정한다.
 *   1단계와 3단계 사이에 수업이 취소되거나 배정이 해제될 수 있고,
 *   Client가 1단계를 건너뛰고 3단계만 호출할 수도 있다.
 *
 * ★ storage_path가 이 수업·이 원아의 경로인지 문자열로 다시 확인한다.
 *   DB의 CHECK 제약과 trigger가 같은 규칙을 한 번 더 강제한다.
 */
export async function finalizeObservationMediaUpload(input: {
  sessionId: string;
  childId: string;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  originalFilename?: string | null;
}): Promise<ObservationMediaFinalizeState> {
  const sessionId = String(input?.sessionId ?? "");
  const childId = String(input?.childId ?? "");
  const storagePath = String(input?.storagePath ?? "");
  const mimeType = String(input?.mimeType ?? "");
  const byteSize = Number(input?.byteSize ?? 0);
  const originalFilename = normalizeFilename(input?.originalFilename);

  if (!UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(childId)) {
    return finalizeError(MESSAGES.invalidRequest);
  }

  if (!STORAGE_PATH_PATTERN.test(storagePath)) {
    return finalizeError(MESSAGES.invalidRequest);
  }

  if (!isSupportedMimeType(mimeType)) {
    return finalizeError(MESSAGES.invalidType);
  }

  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    return finalizeError(MESSAGES.invalidRequest);
  }

  if (byteSize > MAX_OBSERVATION_MEDIA_BYTES) {
    return finalizeError(MESSAGES.tooLarge);
  }

  // 확장자가 mime type과 어긋나면 거부한다(위조 경로 차단).
  if (
    !storagePath.endsWith(`.${OBSERVATION_MEDIA_EXTENSIONS[mimeType]}`)
  ) {
    return finalizeError(MESSAGES.invalidRequest);
  }

  const context = await resolveUploadContext(sessionId, childId);

  if (!context.ok) {
    return finalizeError(context.message);
  }

  const { supabase, session } = context;

  // 경로의 앞 세 조각이 이 수업·이 원아의 것인지 확인한다.
  const expectedPrefix = [
    session.organization_id,
    session.id,
    childId,
    "",
  ].join("/");

  if (!storagePath.startsWith(expectedPrefix)) {
    return finalizeError(MESSAGES.invalidRequest);
  }

  /**
   * organization_id / class_id는 방금 읽은 수업 행에서 만든다.
   * created_by / created_at / id는 보내지 않는다 — trigger와 default가 채운다
   * (INSERT GRANT의 컬럼 목록에도 없다).
   */
  const { data, error } = await supabase
    .from("class_session_observation_media")
    .insert({
      organization_id: session.organization_id,
      class_session_id: session.id,
      class_id: session.class_id,
      child_id: childId,
      storage_path: storagePath,
      media_type: "image",
      mime_type: mimeType,
      byte_size: byteSize,
      original_filename: originalFilename,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logFailure("media insert", error.message);

    /**
     * 같은 경로가 이미 등록되어 있다 = 3단계를 두 번 호출했다.
     * 업로드는 이미 끝났고 행도 있으므로 사용자에게는 성공이다.
     * (네트워크가 끊겨 재시도하는 교실 상황에서 실제로 일어난다)
     */
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: true, mediaId: "", alreadyRegistered: true };
    }

    /**
     * 업로드가 실제로 끝나지 않았는데 metadata만 등록하려 한 경우다.
     * (네트워크가 중간에 끊겼거나, prepare만 받고 업로드를 건너뛴 요청)
     * 권한 문제가 아니므로 다른 문구를 준다 — 사용자가 할 일은 재업로드다.
     */
    if (error.code === MISSING_STORAGE_OBJECT) {
      return finalizeError(MESSAGES.missingObject);
    }

    if (
      error.code === RLS_VIOLATION ||
      error.code === CHECK_VIOLATION
    ) {
      return finalizeError(MESSAGES.notAllowed);
    }

    return finalizeError(MESSAGES.failure);
  }

  const row = (data as unknown as { id: string } | null) ?? null;

  if (!row) {
    logFailure("media insert", "insert returned no row");
    return finalizeError(MESSAGES.failure);
  }

  return { ok: true, mediaId: row.id, alreadyRegistered: false };
}
