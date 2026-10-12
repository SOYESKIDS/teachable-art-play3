import type { PrintBundle } from "@/lib/staff/report-print-queries";
import { formatDotDate } from "@/lib/entitlement/labels";

/**
 * 반 단위 인쇄 지면 — 사용자 지시 항목 1.
 *
 * ── 지면 규칙 ──────────────────────────────────────────────────────
 *
 * ★ 한 아이 = 한 장에서 시작한다 (`rp-sheet` 에 break-before).
 *   내용이 길면 두 장이 된다. 글을 자르지 않는다 — 내용이 빠지는 것보다
 *   한 장 늘어나는 쪽이 낫다.
 *
 * ★ 배경색에 기대지 않는다. 브라우저 인쇄에서 배경 그래픽은 기본이 꺼짐이다.
 *   구조는 선 · 글자 크기 · 여백으로 만든다.
 *
 * ── 담지 않는 것 ───────────────────────────────────────────────────
 *
 * ★ 사진 · 숨긴 리포트 · 작성 중 초안.
 *   숨김과 초안은 조회 단계에서 이미 빠진다. 여기서 다시 확인하지 않아도
 *   되지만, 빠진 건수는 화면에 적어 둔다 (몰라서 못 보내는 일을 막는다).
 *
 * ★ 평균 · 성장률 · 서열.
 *   반 전체를 한 번에 인쇄하더라도 아이들을 서로 비교하지 않는다.
 */
export function ClassPrintSheet({
  bundle,
  title,
}: {
  bundle: PrintBundle;
  title: string;
}) {
  return (
    <div className="rp-bundle flex flex-col gap-6">
      {bundle.items.map((item) => (
        <article
          key={item.reportId}
          className="rp-sheet rounded-2xl border border-hairline bg-white p-6"
        >
          <header className="rp-head border-b border-hairline pb-3">
            <p className="rp-eyebrow text-[13px] text-ink-muted">
              {bundle.className ?? ""} · {title}
            </p>
            <h2 className="rp-name mt-1 text-[22px] font-bold text-ink">
              {item.childName ?? "이름 없음"}
            </h2>
            <p className="rp-meta mt-1 text-[13px] text-ink-muted">
              {item.completedAt ? `${formatDotDate(item.completedAt)} 작성 완료` : "작성 완료"}
            </p>
          </header>

          {item.sections.length === 0 ? (
            <p className="rp-body mt-4 text-[15px] text-ink-muted">
              완료된 본문에 적힌 내용이 없습니다.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {item.sections.map((section) => (
                <section key={section.label} className="rp-block">
                  <h3 className="rp-heading text-[15px] font-bold text-ink">
                    {section.label}
                  </h3>
                  <p className="rp-body mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          )}

          {item.evidence.length > 0 ? (
            <section className="rp-block mt-5 border-t border-hairline pt-3">
              <h3 className="rp-heading text-[15px] font-bold text-ink">
                근거가 된 수업 기록
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {item.evidence.map((line, index) => (
                  <li key={`${item.revisionId}-${index}`} className="rp-evidence">
                    <p className="rp-meta text-[13px] text-ink-muted">
                      {[
                        line.weekNo !== null ? `${line.weekNo}주차` : null,
                        formatDotDate(line.sessionDate),
                        line.lessonTitle,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {line.teacherNote ? (
                      <p className="rp-body mt-0.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">
                        {line.teacherNote}
                      </p>
                    ) : null}
                    {line.childVoice ? (
                      <p className="rp-body mt-0.5 text-[14px] text-ink">
                        아이의 말: &ldquo;{line.childVoice}&rdquo;
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="rp-foot mt-5 border-t border-hairline pt-3">
            <p className="rp-meta text-[12px] text-ink-muted">
              SOYE KIDS TeachAble Art Play · 이 기록은 수업 중 관찰을 바탕으로 작성되었습니다.
              발달 진단이나 평가가 아닙니다.
            </p>
          </footer>
        </article>
      ))}
    </div>
  );
}
