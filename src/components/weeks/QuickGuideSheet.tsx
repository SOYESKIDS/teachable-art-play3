import type { WeekContent } from "@/lib/weeks/week-types";

/**
 * 교사용 1페이지 퀵 가이드 — A4 인쇄용.
 *
 * ── 왜 따로 만드는가 ─────────────────────────────────────────────
 *
 * 공식 가이드 15번 섹션이 「교사용 1페이지 퀵 가이드」다. 원문이 **한 장으로
 * 들고 들어가는 것을 전제로** 쓰여 있다. 주차 화면 탭 안에 섞여 있으면 그
 * 한 장이 나오지 않는다. 그래서 인쇄 전용 경로를 둔다.
 *
 * ── 인쇄를 기준으로 짠다 ─────────────────────────────────────────
 *
 * ★ `@page size: A4` 와 여백을 지정한다. 브라우저 기본값(Letter)으로 인쇄하면
 *   표 오른쪽이 잘린다.
 * ★ 화면용 머리말·버튼은 `print:hidden` 으로 뺀다. 종이에 남으면 한 장을
 *   넘긴다.
 * ★ 색 배경을 깔지 않는다. 흑백 레이저로 뽑을 때 글자가 묻힌다. 구분은 선으로
 *   한다.
 * ★ 표 행을 `break-inside-avoid` 로 묶는다. 한 행이 두 장에 걸치면 읽을 수
 *   없다.
 *
 * ── 원문만 싣는다 ────────────────────────────────────────────────
 *
 * ★ 15번 섹션에 적힌 것만 옮긴다. 여기서 발문을 보태거나 시간을 바꾸지
 *   않는다. 원문에 없으면 그 칸을 비우고 「가이드 미기재」라고 적는다.
 *
 * ── 한 장에 억지로 맞추지 않는다 ─────────────────────────────────
 *
 * 주차에 따라 진행 표가 길고 준비물이 많다. 그럴 때 **글자를 줄이거나 원문을
 * 지우지 않는다.** 빠진 한 줄이 사고로 이어질 수 있다.
 *
 * ★ 내용이 넘치면 둘째 장으로 넘긴다. 각 섹션은 `break-inside-avoid` 로 묶어
 *   도중에 잘리지 않게 한다.
 * ★ 진행 표만 한 장으로 들고 싶은 교사를 위해 `includeMaterials` 로 준비물·안전
 *   면을 덜어내고 인쇄할 수 있게 한다. 덜어내는 선택은 교사가 화면에서 하고,
 *   글자를 줄이는 일은 하지 않는다.
 */

/**
 * ★ A4 기준 폭을 글자 크기로 묶는다.
 *   210mm - 좌우 여백 12mm × 2 = 186mm. 이 폭에서 11pt 표가 네 열로 들어간다.
 */
const PRINT_STYLE = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff; }
}
`;

export function QuickGuideSheet({
  content,
  /** 내부 검수본임을 종이에도 남긴다 */
  internalReview = false,
  /** 준비물·안전 면을 함께 인쇄할지. 끄면 15번 섹션만 나온다 */
  includeMaterials = true,
}: {
  content: WeekContent;
  internalReview?: boolean;
  includeMaterials?: boolean;
}) {
  const { summary, blocks } = content;
  const guide = blocks.quickGuide;

  return (
    <>
      {/* ★ 상수 문자열이다. 사용자 입력이나 원문 내용이 이 바깥에 들어가지 않는다. */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <article className="mx-auto w-full max-w-[186mm] bg-white px-6 py-6 text-black print:px-0 print:py-0">
        {/* ── 머리말 ── */}
        <header className="border-b-2 border-black pb-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h1 className="text-[18pt] font-bold leading-tight">
              <span className="tabular-nums">{summary.weekNo}주차</span> {summary.title}
            </h1>
            <p className="text-[10pt]">
              성장키워드 {summary.growthKeyword} · {summary.durationLabel}
            </p>
          </div>
          <p className="mt-1 text-[10pt] leading-snug">
            그림책 {summary.storybook} · {summary.coreMessage}
          </p>
        </header>

        {guide === null ? (
          <p className="mt-6 border border-black px-4 py-6 text-center text-[11pt] leading-relaxed">
            이 주차의 퀵 가이드를 아직 옮기지 않았습니다. 인쇄된 공식 교사용 수업가이드 15번
            섹션을 보고 진행해 주세요.
          </p>
        ) : (
          <>
            {/* ── 오늘의 목표 ── */}
            <section className="mt-3">
              <h2 className="text-[11pt] font-bold">오늘의 목표</h2>
              <p className="mt-0.5 text-[11pt] leading-relaxed">{guide.goal}</p>
            </section>

            {/* ── 진행 표 ── */}
            <section className="mt-3">
              <h2 className="text-[11pt] font-bold">수업 진행</h2>
              {/* ★ 열 제목은 원문 값이다. 3권은 셋째 칸이 「핵심 질문」이다. */}
              <table className="mt-1 w-full border-collapse text-[10pt]">
                <thead>
                  <tr className="border-y border-black text-left">
                    {guide.table.columns.map((c, i) => (
                      <th
                        key={c}
                        scope="col"
                        className={
                          i === 0 ? "w-[22%] py-1 pr-2 font-bold" : "py-1 pr-2 font-bold"
                        }
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.table.rows.map((row) => (
                    <tr
                      key={row.join("|")}
                      className="break-inside-avoid border-b border-black/30 align-top"
                    >
                      {row.map((cell, i) => (
                        <td
                          key={`${i}:${cell}`}
                          className={
                            i === 0
                              ? "py-1.5 pr-2 font-semibold leading-snug"
                              : "py-1.5 pr-2 leading-snug"
                          }
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {guide.closingNote ? (
              <section className="mt-3 border border-black px-3 py-2">
                <h2 className="text-[10pt] font-bold">마지막에</h2>
                <p className="mt-0.5 text-[11pt] leading-relaxed">{guide.closingNote}</p>
              </section>
            ) : null}
          </>
        )}

        {/* ── 준비물 · 안전 (원문 4번 섹션) ── */}
        {includeMaterials && blocks.preparation ? (
          <section className="mt-3 break-inside-avoid">
            <h2 className="text-[11pt] font-bold">준비물 · 안전</h2>
            <ul className="mt-0.5 flex flex-col gap-0.5 text-[10pt] leading-snug">
              {blocks.preparation.materials.map((m, index) => (
                <li key={`${m.group}-${index}`}>
                  <span className="font-semibold">{m.group}</span> · {m.item}
                </li>
              ))}
              {blocks.preparation.safety.map((s, index) => (
                <li key={`safety-${index}`}>안전 · {s}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-4 border-t border-black/40 pt-1.5 text-[8pt] leading-snug">
          <p>
            SOYE KIDS TeachAble Art Play · 공식 교사용 수업가이드{" "}
            {content.sourceFile ? `(${content.sourceFile})` : ""} 15번 섹션에서 옮겼습니다.
          </p>
          {!includeMaterials && blocks.preparation ? (
            <p className="mt-0.5">
              준비물 · 안전 면은 이 인쇄본에서 덜어냈습니다. 원문 4번 섹션에서 확인해 주세요.
            </p>
          ) : null}
          {internalReview ? (
            <p className="mt-0.5 font-bold">
              본사 내부 검수본 — 검수 전 내용입니다. 기관에 배포하지 마십시오.
            </p>
          ) : null}
          <p className="mt-0.5">
            원아 이름 · 관찰 기록은 들어 있지 않습니다. 인쇄물을 교실에 두어도 개인정보가 남지
            않습니다.
          </p>
        </footer>
      </article>
    </>
  );
}
