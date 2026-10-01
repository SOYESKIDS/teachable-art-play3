"use client";

import { useActionState } from "react";
import { appButtonSecondary, noticeDanger, noticeSuccess, noticeWarning } from "@/components/ui/app-button";
import {
  LESSON_SECTION_CODES,
  LESSON_SECTION_LABELS,
  REQUIRED_LESSON_SECTIONS,
  type LessonSectionCode,
} from "@/lib/curriculum/lesson-sections";
import { saveLessonSectionAction, type SectionActionState } from "../../../section-actions";

const IDLE: SectionActionState = { phase: "idle", message: null };

interface SectionValue {
  body: string;
  sourceRef: string | null;
}

/**
 * 차시 수업 섹션 편집 (HQ-09 · DEC-096 · CMS 아님 · 최소 구조).
 * 섹션별 명시 저장. 초안 차시에서만 편집할 수 있다.
 */
export function LessonSectionEditor({
  programId,
  lessonId,
  editable,
  sections,
}: {
  programId: string;
  lessonId: string;
  editable: boolean;
  sections: Partial<Record<LessonSectionCode, SectionValue>>;
}) {
  const missing = REQUIRED_LESSON_SECTIONS.filter((code) => !sections[code]);

  return (
    <section className="mt-6 rounded-xl border border-line bg-white p-5" aria-labelledby="lesson-sections-title">
      <h2 id="lesson-sections-title" className="text-body-sm font-bold text-navy">
        수업 섹션
      </h2>
      <p className="mt-1 text-micro text-ink-muted">
        필수 섹션이 모두 채워지고 차시가 게시되어야 Class Mode · 계약 준비 상태에서 &quot;준비됨&quot;으로 판정됩니다. 섹션이 있다고 검수가 끝난 것은 아닙니다.
      </p>

      {missing.length > 0 ? (
        <p className={`mt-3 ${noticeWarning}`}>
          비어 있는 필수 섹션: {missing.map((code) => LESSON_SECTION_LABELS[code]).join(", ")}
        </p>
      ) : (
        <p className={`mt-3 ${noticeSuccess}`}>필수 섹션이 모두 채워져 있습니다.</p>
      )}

      {!editable ? (
        <p className="mt-3 text-caption text-ink-muted">게시 중이거나 보관된 차시는 섹션을 수정할 수 없습니다. 수정하려면 차시를 초안으로 되돌려 주세요.</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {LESSON_SECTION_CODES.map((code) => (
          <SectionForm
            key={code}
            programId={programId}
            lessonId={lessonId}
            code={code}
            required={REQUIRED_LESSON_SECTIONS.includes(code)}
            value={sections[code] ?? null}
            editable={editable}
          />
        ))}
      </div>
    </section>
  );
}

function SectionForm({
  programId,
  lessonId,
  code,
  required,
  value,
  editable,
}: {
  programId: string;
  lessonId: string;
  code: LessonSectionCode;
  required: boolean;
  value: SectionValue | null;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveLessonSectionAction, IDLE);
  const bodyId = `section-${code}-body`;
  const sourceId = `section-${code}-source`;

  return (
    <form action={formAction} className="rounded-lg border border-line p-4">
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="sectionCode" value={code} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={bodyId} className="text-label font-semibold text-ink">
          {LESSON_SECTION_LABELS[code]}
          {required ? <span className="ml-2 text-micro font-semibold text-danger">필수</span> : null}
        </label>
        <span className="text-micro text-ink-muted">{value ? "작성됨" : "비어 있음"}</span>
      </div>
      <textarea
        id={bodyId}
        name="body"
        defaultValue={value?.body ?? ""}
        readOnly={!editable}
        maxLength={10000}
        rows={value ? 5 : 2}
        className="mt-2 w-full rounded-lg border border-control-border px-3 py-2 text-label leading-relaxed text-ink read-only:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
      />
      <label htmlFor={sourceId} className="mt-2 block text-micro font-semibold text-ink-muted">
        원본 출처 메모 (선택 · 파일 · 페이지)
      </label>
      <input
        id={sourceId}
        name="sourceRef"
        defaultValue={value?.sourceRef ?? ""}
        readOnly={!editable}
        maxLength={300}
        className="mt-1 min-h-11 w-full rounded-lg border border-control-border px-3 text-label text-ink read-only:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
      />
      {editable ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
          {state.phase !== "idle" && state.message ? (
            <p
              role={state.phase === "error" ? "alert" : "status"}
              className={state.phase === "error" ? noticeDanger : "text-caption font-semibold text-success-text"}
            >
              {state.message}
            </p>
          ) : null}
          <button type="submit" className={appButtonSecondary} disabled={pending}>
            {pending ? "저장 중" : "섹션 저장"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
