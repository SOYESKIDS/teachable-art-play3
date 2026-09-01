/**
 * SERVICE-09A — 관찰기록 활동사진 타입 · 상수.
 *
 * 20260831110000_create_observation_media.sql 과 1:1로 맞춘다.
 *
 * ★ 사진은 원본 관찰자료다. AI 산출물도, 평가 대상도 아니다.
 *   점수·등급·발달단계·위험도·감정 추정 어떤 필드도 두지 않는다.
 *
 * ★ 아래 세 상수는 Storage bucket 설정 · DB CHECK · 화면 검증이
 *   같은 값을 쓰도록 하는 단일 출처다. 한쪽만 바꾸면
 *   화면은 통과시키는데 Storage나 DB가 거부하는 상태가 된다.
 *
 *     OBSERVATION_MEDIA_BUCKET      bucket id
 *     MAX_OBSERVATION_MEDIA_BYTES   bucket.file_size_limit      = 6291456
 *                                   byte_size CHECK             <= 6291456
 *     OBSERVATION_MEDIA_MIME_TYPES  bucket.allowed_mime_types
 *                                   mime_type CHECK
 */

/** private bucket. public URL은 어떤 경로로도 만들지 않는다. */
export const OBSERVATION_MEDIA_BUCKET = "observation-media";

/**
 * 6 MiB — bucket.file_size_limit / byte_size CHECK와 같은 값.
 *
 * ★ 더 큰 상한이 아니라 6 MiB인 이유
 *   이 화면은 supabase-js의 standard upload(단일 요청)를 쓴다.
 *   그 경로는 요청 하나를 그대로 올리므로 교실 모바일 네트워크에서
 *   큰 파일일수록 중간 실패율이 급격히 올라간다.
 *   더 큰 파일을 안정적으로 올리려면 TUS resumable upload가 필요한데,
 *   그것은 09A 범위가 아니다(09B/09C backlog).
 *   그래서 standard upload가 안정적으로 처리하는 크기로 상한을 낮춘다.
 */
export const MAX_OBSERVATION_MEDIA_BYTES = 6 * 1024 * 1024;

/**
 * HEIC/HEIF는 09A에서 제외한다.
 * 브라우저가 디코딩하지 못하는 조합이 많아 업로드는 되는데 화면에 안 보이는
 * 상태가 만들어진다. 지원하려면 서버 변환이 필요하고, 그건 별도 설계다.
 */
export const OBSERVATION_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ObservationMediaMimeType =
  (typeof OBSERVATION_MEDIA_MIME_TYPES)[number];

/** <input type="file" accept> 값 */
export const OBSERVATION_MEDIA_ACCEPT =
  OBSERVATION_MEDIA_MIME_TYPES.join(",");

/**
 * ★ 확장자는 원본 파일명이 아니라 mime type에서 서버가 결정한다.
 *   사용자가 보낸 파일명을 경로에 쓰면 traversal·특수문자·확장자 위장이 들어온다.
 *   DB의 storage_path CHECK도 이 세 확장자만 허용한다.
 */
export const OBSERVATION_MEDIA_EXTENSIONS: Record<
  ObservationMediaMimeType,
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** original_filename CHECK와 같은 상한 */
export const MAX_OBSERVATION_MEDIA_FILENAME = 255;

/**
 * 한 수업 화면이 읽어 오는 사진 metadata 상한.
 *
 * 원아 200명 × 몇 장을 가정해도 넉넉하고,
 * 잘못된 대량 요청은 걸러낸다(관찰 roster 상한과 같은 성격).
 */
export const MAX_OBSERVATION_MEDIA_LOOKUP = 600;

/**
 * signed URL 유효시간(초).
 *
 * 교직원이 한 화면을 열어 두고 작업하는 시간을 덮되,
 * URL이 유출되어도 오래 살아 있지 않도록 짧게 잡는다.
 */
export const OBSERVATION_MEDIA_SIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * 화면에 내려보내는 사진 한 장.
 *
 * ★ signedUrl은 DB 컬럼이 아니다.
 *   요청마다 Storage에서 새로 발급하는 view model 값이고,
 *   절대 DB에 저장하지 않는다. 영구 저장하는 것은 storagePath뿐이다.
 *   발급에 실패하면 null이 되고, 화면은 그 자리에 안내 문구를 보여 준다.
 */
export interface ObservationMediaItem {
  id: string;
  childId: string;
  /** storage.objects.name과 같은 값 */
  storagePath: string;
  mimeType: string;
  byteSize: number;
  originalFilename: string | null;
  caption: string | null;
  /** timestamptz 원본 문자열 */
  createdAt: string;
  /** ★ 요청마다 새로 발급되는 임시 URL. DB 값이 아니다. */
  signedUrl: string | null;
}

/**
 * 업로드 1단계 결과 — 서버가 확정한 저장 경로.
 *
 * Client는 이 경로를 그대로 써야 한다. 스스로 만들어 낸 경로는
 * Storage RLS(can_upload_observation_media_object)가 거부한다.
 */
export type ObservationMediaPrepareState =
  | {
      ok: true;
      bucket: string;
      storagePath: string;
    }
  | {
      ok: false;
      message: string;
    };

/** 업로드 2단계 결과 — metadata 등록 */
export type ObservationMediaFinalizeState =
  | {
      ok: true;
      mediaId: string;
      /** 이미 같은 경로가 등록되어 있었다(재시도). 사용자에게는 성공으로 보인다. */
      alreadyRegistered: boolean;
    }
  | {
      ok: false;
      message: string;
    };
