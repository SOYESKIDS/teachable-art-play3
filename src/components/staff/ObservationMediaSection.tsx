"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  finalizeObservationMediaUpload,
  prepareObservationMediaUpload,
} from "@/lib/staff/observation-media-actions";
import {
  MAX_OBSERVATION_MEDIA_BYTES,
  OBSERVATION_MEDIA_ACCEPT,
  OBSERVATION_MEDIA_MIME_TYPES,
  type ObservationMediaItem,
} from "@/types/staff-observation-media";

interface ObservationMediaSectionProps {
  sessionId: string;
  childId: string;
  childName: string | null;
  media: ObservationMediaItem[];
  /** 신규 업로드 가능 여부. 최종 판정은 Server Action + Storage RLS다. */
  canUpload: boolean;
  /** 업로드가 막힌 이유 (있으면 안내로 표시) */
  uploadBlockedReason: string | null;
}

const MAX_MB = Math.floor(
  MAX_OBSERVATION_MEDIA_BYTES / (1024 * 1024),
);

/**
 * SERVICE-09A — 원아 한 명의 활동사진.
 *
 * ★ 파일은 Next 서버를 거치지 않는다.
 *   prepare(Server Action) → Storage 직접 업로드 → finalize(Server Action)
 *   순서로 진행하고, 권한은 Storage RLS와 DB Policy가 최종 판정한다.
 *
 * ★ 사진을 form action에 태우지 않는 이유
 *   file input을 <form action={serverAction}> 안에 두면 React가 File을
 *   FormData에 담아 서버로 전송한다. 8MiB 이미지가 Server Action body를
 *   그대로 통과하게 되어 body size 제한과 서버 메모리를 쓰게 된다.
 *   그래서 버튼 onClick에서 두 action을 직접 호출한다.
 *
 * ★ 이 화면은 사진을 분석하지 않는다. 태그·점수·감정 추정이 없다.
 */
export function ObservationMediaSection({
  sessionId,
  childId,
  childName,
  media,
  canUpload,
  uploadBlockedReason,
}: ObservationMediaSectionProps) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /** 사진 내용을 추측하지 않는다. 원아 이름만 쓴다. */
  const altText = childName
    ? `${childName} 활동 사진`
    : "원아 활동 사진";

  const fieldId = `observation-media-${childId}`;

  function clearSelection() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });

    setFile(null);
  }

  function handleSelect(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const nextFile = event.target.files?.[0] ?? null;

    setMessage(null);
    setIsError(false);

    if (!nextFile) {
      clearSelection();
      return;
    }

    // 화면 검증은 헛된 업로드를 줄이기 위한 것이다.
    // 최종 판정은 bucket의 allowed_mime_types / file_size_limit와 DB CHECK다.
    if (
      !(OBSERVATION_MEDIA_MIME_TYPES as readonly string[]).includes(
        nextFile.type,
      )
    ) {
      clearSelection();
      event.target.value = "";
      setIsError(true);
      setMessage("JPG · PNG · WEBP 이미지만 올릴 수 있습니다.");
      return;
    }

    if (nextFile.size > MAX_OBSERVATION_MEDIA_BYTES) {
      clearSelection();
      event.target.value = "";
      setIsError(true);
      setMessage(`사진 용량은 ${MAX_MB}MB 이내여야 합니다.`);
      return;
    }

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });

    setFile(nextFile);
  }

  async function handleUpload() {
    if (!file || isUploading) return;

    setIsUploading(true);
    setMessage(null);
    setIsError(false);

    try {
      // 1) 서버가 권한을 다시 확인하고 저장 경로를 발급한다.
      const prepared = await prepareObservationMediaUpload({
        sessionId,
        childId,
        mimeType: file.type,
        byteSize: file.size,
      });

      if (!prepared.ok) {
        setIsError(true);
        setMessage(prepared.message);
        return;
      }

      // 2) 브라우저 → Storage 직접 업로드. Storage RLS가 최종 판정한다.
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .upload(prepared.storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setIsError(true);
        setMessage(
          "사진을 업로드하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.",
        );
        return;
      }

      // 3) metadata 등록. 여기까지 성공해야 화면에 나타난다.
      const finalized = await finalizeObservationMediaUpload({
        sessionId,
        childId,
        storagePath: prepared.storagePath,
        mimeType: file.type,
        byteSize: file.size,
        originalFilename: file.name,
      });

      if (!finalized.ok) {
        setIsError(true);
        setMessage(finalized.message);
        return;
      }

      clearSelection();
      setIsError(false);
      setMessage("활동 사진을 저장했습니다.");
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  }

  const expanded =
    media.find((item) => item.id === expandedId) ?? null;

  return (
    <section className="mt-4 border-t border-navy/8 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-bold text-navy/55">
          활동 사진
        </h3>

        <span className="text-[11px] tabular-nums text-navy/45">
          {media.length.toLocaleString("ko-KR")}장
        </span>
      </div>

      {media.length === 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-navy/45">
          등록된 활동 사진이 없습니다.
        </p>
      ) : (
        <>
          {/*
            확대 보기. modal 라이브러리를 쓰지 않고, 고른 사진을
            목록 위에 크게 한 장 띄우는 것으로 충분하다.
          */}
          {expanded ? (
            <div className="mt-2 rounded-lg border border-navy/15 bg-navy/5 p-2">
              {expanded.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL은 매 요청 새로 발급되는 임시 주소라 next/image의 원격 도메인 최적화 대상이 아니다
                <img
                  src={expanded.signedUrl}
                  alt={altText}
                  className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md"
                />
              ) : (
                <p className="px-3 py-8 text-center text-[13px] text-navy/45">
                  사진을 불러오지 못했습니다.
                </p>
              )}

              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="mt-2 min-h-11 w-full rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5"
              >
                닫기
              </button>
            </div>
          ) : null}

          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(
                      expandedId === item.id ? null : item.id,
                    )
                  }
                  aria-label={`${altText} 크게 보기`}
                  className="block aspect-square w-full overflow-hidden rounded-lg border border-navy/15 bg-navy/5 transition-colors hover:border-trust-blue/40"
                >
                  {item.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 위와 같은 이유
                    <img
                      src={item.signedUrl}
                      alt={altText}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center px-1 text-center text-[11px] leading-tight text-navy/45">
                      불러오지 못함
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {canUpload ? (
        <div className="mt-3">
          <label
            htmlFor={fieldId}
            className="text-[11px] font-bold text-navy/55"
          >
            사진 추가
          </label>

          <input
            id={fieldId}
            type="file"
            accept={OBSERVATION_MEDIA_ACCEPT}
            onChange={handleSelect}
            disabled={isUploading}
            className="mt-1.5 block w-full cursor-pointer rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[13px] text-navy file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-md file:border file:border-navy/20 file:bg-white file:px-3 file:text-[13px] file:font-bold file:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p className="mt-1 text-[11px] leading-relaxed text-navy/45">
            JPG · PNG · WEBP, {MAX_MB}MB 이내. 한 번에 한 장씩 올립니다.
          </p>

          {file ? (
            <div className="mt-2 rounded-lg border border-navy/15 bg-white p-2">
              <div className="flex items-center gap-3">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 업로드 전 로컬 미리보기(blob URL)라 최적화 대상이 아니다
                  <img
                    src={previewUrl}
                    alt="선택한 사진 미리보기"
                    className="size-16 shrink-0 rounded-md object-cover"
                  />
                ) : null}

                <p className="min-w-0 break-all text-[12px] text-navy/60">
                  {file.name}
                </p>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="min-h-12 flex-1 rounded-lg bg-navy px-4 text-[14px] font-bold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isUploading ? "올리는 중..." : "사진 올리기"}
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isUploading}
                  className="min-h-12 rounded-lg border border-navy/20 bg-white px-4 text-[14px] font-bold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  취소
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : uploadBlockedReason ? (
        <p className="mt-3 text-[12px] leading-relaxed text-navy/45">
          {uploadBlockedReason}
        </p>
      ) : null}

      {message ? (
        <p
          role={isError ? "alert" : "status"}
          aria-live="polite"
          className={`mt-2 rounded-lg border px-3 py-2 text-[13px] leading-relaxed ${
            isError
              ? "border-soft-coral/50 bg-soft-coral/10 text-navy"
              : "border-soft-green/50 bg-soft-green/15 text-navy"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
