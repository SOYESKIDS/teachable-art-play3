import Link from "next/link";
import type { WeekContent } from "@/lib/weeks/week-types";
import { SCENE_TYPE_LABEL } from "@/lib/weeks/week-types";
import {
  SESSION_STATUS_LABEL,
  formatSessionDate,
  type WeekSessionItem,
} from "@/lib/weeks/week-session-queries";

/**
 * 주차 수업 페이지의 탭 본문 — 원문을 나누어 배치한다.
 *
 * ── 원문을 고치지 않는다 ─────────────────────────────────────────
 *
 * 블록 안의 문장은 공식 가이드 원문 그대로다. 이 컴포넌트는 **어디에 놓을지만**
 * 정한다. 각 묶음 아래에 출처를 작게 적어 교사가 인쇄본과 대조할 수 있게 한다.
 *
 * ── 없는 것은 없다고 적는다 ──────────────────────────────────────
 *
 * ★ 원문에 없는 칸은 「가이드 미기재」로 표시한다. 빈칸을 채우려고 문장을
 *   만들지 않는다.
 * ★ 아직 연결되지 않은 기능은 "곧 됩니다"가 아니라 **무엇이 필요한지** 적는다.
 */

function SourceRef({ children }: { children: string }) {
  return <p className="mt-2 text-[12px] text-muted-ink">출처: {children}</p>;
}

function Section({
  title,
  children,
  source,
}: {
  title: string;
  children: React.ReactNode;
  source?: string;
}) {
  return (
    <section className="border-t border-rule-soft pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-[17px] font-bold text-forest">{title}</h3>
      <div className="mt-2">{children}</div>
      {source ? <SourceRef>{source}</SourceRef> : null}
    </section>
  );
}

function NotWritten({ what }: { what: string }) {
  return (
    <p className="rounded-[10px] bg-paper px-4 py-3 text-[14px] text-muted-ink">
      가이드 미기재 — 공식 원문에 {what}이(가) 적혀 있지 않습니다. 임의로 채우지 않았습니다.
    </p>
  );
}

const bullet = "flex gap-2 text-[15px] leading-relaxed text-forest/90";

/**
 * 회차가 있어야 하는 작업의 안내.
 *
 * ★ 회차를 고르게 한다. 「오늘의 수업으로 가세요」라고만 적으면 교사가 다시
 *   자기 반을 찾아야 한다. 여기서 반·날짜별로 바로 들어갈 수 있게 한다.
 * ★ 회차가 없으면 무엇이 없는지 적는다. 버튼을 만들어 두지 않는다.
 */
function SessionRequired({
  what,
  why,
  sessions,
  orgQuery,
  hrefFor,
}: {
  what: string;
  why: string;
  sessions: WeekSessionItem[];
  orgQuery: string;
  hrefFor: (sessionId: string) => string;
}) {
  return (
    <section className="rounded-[10px] bg-sky-pale px-4 py-3">
      <h3 className="text-[15px] font-bold text-sky-deep">{what}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-sky-deep">{why}</p>

      {sessions.length === 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-sky-deep">
          이 주차에 잡힌 수업 회차가 아직 없습니다. 원장님이 반에 프로그램을 배정하고 일정을
          잡으면 여기에서 바로 들어갈 수 있습니다.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {sessions.map((s) => (
            <li key={s.sessionId}>
              <Link
                href={`${hrefFor(s.sessionId)}?${orgQuery}`}
                className="inline-flex min-h-11 items-center text-[14px] font-semibold text-sky-deep underline"
              >
                {s.className ?? "반 이름 없음"} · {formatSessionDate(s.scheduledDate)} ·{" "}
                {SESSION_STATUS_LABEL[s.status]}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════ ① 준비 */

export function PrepPanel({ content }: { content: WeekContent }) {
  const { beforeStart, preparation, objectives, timetable, atAGlance } = content.blocks;

  return (
    <div className="flex flex-col gap-6 py-6">
      {beforeStart ? (
        <Section title="이번 주 아이들이 경험하는 것" source="가이드 1. 시작하기 전에">
          <p className="text-[15px] leading-relaxed text-forest/90">{beforeStart.intro}</p>
          <ol className="mt-3 flex flex-col gap-1.5">
            {beforeStart.experienceFlow.map((step, i) => (
              <li key={step} className={bullet}>
                <span className="shrink-0 font-bold tabular-nums text-leaf">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <h4 className="mt-5 text-[15px] font-bold text-forest">교사의 역할</h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {beforeStart.teacherRoles.map((role) => (
              <li key={role} className={bullet}>
                <span aria-hidden className="shrink-0 text-leaf">
                  ·
                </span>
                <span>{role}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        <NotWritten what="시작하기 전에 내용" />
      )}

      {preparation ? (
        <Section title="수업 전 준비" source="가이드 4. 수업 전 준비">
          <h4 className="text-[15px] font-bold text-forest">A. 준비물</h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {preparation.materials.map((m) => (
              <li key={m.group} className={bullet}>
                <span className="w-[86px] shrink-0 text-[13px] text-muted-ink">{m.group}</span>
                <span>{m.item}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-5 text-[15px] font-bold text-forest">B. 공간 세팅</h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {preparation.spaceSetup.map((s) => (
              <li key={s} className={bullet}>
                <span aria-hidden className="shrink-0 text-leaf">
                  ·
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-5 text-[15px] font-bold text-forest">C. {preparation.safetyLabel}</h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {preparation.safety.map((s) => (
              <li key={s} className={bullet}>
                <span aria-hidden className="shrink-0 text-leaf">
                  ·
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-[10px] bg-sky-pale px-4 py-3 text-[13px] leading-relaxed text-sky-deep">
            체크 저장은 수업 회차에 묶입니다. 회차를 연결하면 이 목록을 체크할 수 있고, 부담임과
            함께 보게 됩니다.
          </p>
        </Section>
      ) : (
        <NotWritten what="수업 전 준비 내용" />
      )}

      {objectives ? (
        <Section title="교육목표 · 누리과정 연계" source="가이드 3. 교육목표 및 누리과정 연계">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead className="bg-paper text-[13px] text-muted-ink">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    영역
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    교육목표
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    교사가 볼 행동
                  </th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((o) => (
                  <tr key={o.nuriArea} className="border-t border-rule-soft align-top">
                    <th scope="row" className="px-3 py-2 text-left font-semibold text-forest">
                      {o.nuriArea}
                    </th>
                    <td className="px-3 py-2 text-forest/90">{o.objective}</td>
                    <td className="px-3 py-2 text-forest/90">{o.teacherWatch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {timetable ? (
        <Section
          title={timetable.kind === "time" ? "권장 시간표" : "관찰 시간표"}
          source="가이드 5. 권장 시간표 / 관찰 시간표"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead className="bg-paper text-[13px] text-muted-ink">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    단계
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    시간
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    교사 역할
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    아이 경험
                  </th>
                </tr>
              </thead>
              <tbody>
                {timetable.rows.map((r) => (
                  <tr key={r.stage} className="border-t border-rule-soft align-top">
                    <th scope="row" className="px-3 py-2 text-left font-semibold text-forest">
                      {r.stage}
                    </th>
                    <td className="px-3 py-2 tabular-nums text-forest/90">{r.duration ?? "—"}</td>
                    <td className="px-3 py-2 text-forest/90">{r.teacherRole}</td>
                    <td className="px-3 py-2 text-forest/90">{r.childExperience}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {atAGlance ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-ink">
              원문 권장 시간: {atAGlance.durationLabel}. 45분·30분 단축 운영은 주차별 교육 검수
              후에 열립니다. 원문을 임의로 줄여 쓰지 않습니다.
            </p>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════ ② 수업 가이드 */

export function GuidePanel({ content }: { content: WeekContent }) {
  const { lessonSteps, coreActivity, workbook, art, mediaOrWatch, closing, situations, quickGuide } =
    content.blocks;

  return (
    <div className="flex flex-col gap-6 py-6">
      {lessonSteps ? (
        <Section title="실제 수업 진행안" source="가이드 6. 실제 수업 진행안">
          <div className="flex flex-col gap-6">
            {lessonSteps.map((step) => (
              <article key={step.step} className="rounded-[10px] bg-paper p-4">
                <p className="text-[13px] font-semibold text-leaf">{step.step}</p>
                <h4 className="mt-0.5 font-serif text-[18px] font-bold text-forest">
                  {step.title}
                </h4>
                {step.body ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-forest/90">{step.body}</p>
                ) : null}

                {step.questions.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {step.questions.map((q) => (
                      <li key={q} className="font-serif text-[16px] leading-relaxed text-forest">
                        {q}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {step.responses.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[440px] border-collapse text-left text-[14px]">
                      <caption className="sr-only">아이 반응에 따른 교사 대응</caption>
                      <tbody>
                        {step.responses.map((r) => (
                          <tr key={r.child} className="border-t border-rule-soft align-top">
                            <th
                              scope="row"
                              className="w-[180px] px-3 py-2 text-left font-bold text-forest"
                            >
                              {r.child}
                            </th>
                            <td className="px-3 py-2 text-forest/90">{r.teacher}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {step.notes.map((n) => (
                  <p
                    key={n}
                    className="mt-3 rounded-[10px] border border-[color:var(--color-crayon)] bg-crayon-soft px-3 py-2 text-[14px] leading-relaxed text-forest"
                  >
                    {n}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </Section>
      ) : (
        <NotWritten what="수업 진행안" />
      )}

      {coreActivity ? (
        <Section title={`핵심활동 — ${coreActivity.title}`} source="가이드 7. 핵심활동">
          {coreActivity.intro ? (
            <p className="text-[15px] leading-relaxed text-forest/90">{coreActivity.intro}</p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-3">
            {coreActivity.plays.map((p) => (
              <li key={p.title} className="rounded-[10px] border border-rule px-4 py-3">
                {p.label ? (
                  <span className="rounded-[4px] bg-sprout px-2 py-0.5 text-[12px] font-bold text-leaf">
                    {p.label}
                  </span>
                ) : null}
                <p className="mt-1 text-[15px] font-semibold text-forest">{p.title}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="text-[14px] leading-relaxed text-forest/85">
                      {pt}
                    </li>
                  ))}
                </ul>
                {/*
                  ★ 원문이 표로 둔 묶음은 표로 그린다. 한 줄로 이어 적으면
                    어느 말이 교사 행동이고 어느 말이 교사 언어인지가 사라진다.
                    열 제목도 주차마다 달라 고정하지 않고 원문 값을 쓴다.
                */}
                {p.stepTable ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
                      <thead className="bg-paper text-[13px] text-muted-ink">
                        <tr>
                          {p.stepTable.columns.map((c) => (
                            <th key={c} scope="col" className="px-3 py-2 font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {p.stepTable.rows.map((row) => (
                          <tr key={row.join("|")} className="border-t border-rule-soft align-top">
                            <th
                              scope="row"
                              className="whitespace-nowrap px-3 py-2 text-left font-semibold text-forest"
                            >
                              {row[0]}
                            </th>
                            {row.slice(1).map((cell, i) => (
                              <td
                                key={cell}
                                className={
                                  i === row.length - 2
                                    ? "px-3 py-2 font-serif text-forest"
                                    : "px-3 py-2 text-forest/90"
                                }
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {coreActivity.adaptations.length > 0 ? (
            <>
              <h4 className="mt-5 text-[15px] font-bold text-forest">현장 난이도 · 개별 지원</h4>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[440px] border-collapse text-left text-[14px]">
                  <tbody>
                    {coreActivity.adaptations.map((a) => (
                      <tr key={a.condition} className="border-t border-rule-soft align-top">
                        <th
                          scope="row"
                          className="w-[180px] px-3 py-2 text-left font-bold text-forest"
                        >
                          {a.condition}
                        </th>
                        <td className="px-3 py-2 text-forest/90">{a.adjust}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </Section>
      ) : null}

      {workbook ? (
        <Section title={workbook.title ?? "워크북 운영"} source="가이드 8. 워크북 운영 가이드">
          {workbook.intro ? (
            <p className="text-[15px] leading-relaxed text-forest/90">{workbook.intro}</p>
          ) : null}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead className="bg-paper text-[13px] text-muted-ink">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    활동
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    교사 초점
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    발문 예시
                  </th>
                </tr>
              </thead>
              <tbody>
                {workbook.pages.map((p) => (
                  <tr key={p.activity} className="border-t border-rule-soft align-top">
                    <th scope="row" className="px-3 py-2 text-left font-semibold text-forest">
                      {p.activity}
                    </th>
                    <td className="px-3 py-2 text-forest/90">{p.focus}</td>
                    <td className="px-3 py-2 font-serif text-forest">{p.question}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ★ 2권(9~16주차)은 표 뒤에 이어지는 문장이 있다. 1권에는 없다. */}
          {workbook.outro ? (
            <p className="mt-3 text-[15px] leading-relaxed text-forest/90">{workbook.outro}</p>
          ) : null}
        </Section>
      ) : null}

      {art ? (
        <Section title={`미술활동 — ${art.title}`} source="가이드 9. 미술활동">
          {/*
            ★ 원문이 「핵심활동과 같은 활동」이라고 밝힌 주차가 있다 (8주차).
              섹션은 둘이지만 교실에서 하는 일은 하나다. 적지 않으면 교사가
              활동을 두 번 하는 것으로 읽고 수업 시간을 두 배로 잡는다.
          */}
          {art.sameAsCoreActivity ? (
            <p
              role="note"
              className="mb-3 rounded-[10px] border border-[color:var(--color-crayon)] bg-crayon-soft px-4 py-3 text-[14px] leading-relaxed text-forest"
            >
              <strong className="font-bold">위 핵심활동과 같은 활동입니다.</strong> 따로 한 번 더
              하지 않습니다. 원문 권장 시간표에도 이 활동은 한 번만 들어 있어 수업 시간이 두 번
              계산되지 않습니다.
            </p>
          ) : null}
          {art.intro ? (
            <p className="text-[15px] leading-relaxed text-forest/90">{art.intro}</p>
          ) : null}
          {/*
            ★ 원문이 「별도 제작 활동 없음」이라고 적은 주차가 있다 (10·16주차).
              진행 순서와 교사 발문 제목만 비워 두면 「만들 것이 있는데 아직 안 옮겼다」로
              읽힌다. 비어 있는 이유를 적고 빈 제목은 그리지 않는다.
          */}
          {art.steps.length === 0 && art.questions.length === 0 ? (
            <p
              role="note"
              className="mt-3 rounded-[10px] border border-rule bg-paper px-4 py-3 text-[14px] leading-relaxed text-forest"
            >
              <strong className="font-bold">원문에 진행 순서와 교사 발문이 없습니다.</strong> 이
              주차는 공식 가이드가 별도 제작 활동을 두지 않았습니다. 옮기지 않은 것이 아닙니다.
            </p>
          ) : (
            <>
              <h4 className="mt-4 text-[15px] font-bold text-forest">진행 순서</h4>
              <ol className="mt-2 flex flex-col gap-1.5">
                {art.steps.map((s, i) => (
                  <li key={s} className={bullet}>
                    <span className="shrink-0 font-bold tabular-nums text-leaf">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <h4 className="mt-4 text-[15px] font-bold text-forest">교사 발문</h4>
              <ul className="mt-2 flex flex-col gap-1.5">
                {art.questions.map((q) => (
                  <li key={q} className="font-serif text-[16px] leading-relaxed text-forest">
                    {q}
                  </li>
                ))}
              </ul>
            </>
          )}
          {art.standard ? (
            <p className="mt-4 rounded-[10px] bg-sprout px-4 py-3 text-[14px] leading-relaxed text-forest">
              {art.standard}
            </p>
          ) : null}
        </Section>
      ) : null}

      {mediaOrWatch ? (
        <Section
          title={mediaOrWatch.kind === "media" ? "음원 · 뮤직비디오 활용" : "활동 관찰 포인트"}
          source="가이드 10. 음원·뮤직비디오 활용 / 관찰 포인트"
        >
          <ul className="flex flex-col gap-2">
            {mediaOrWatch.items.map((it) => (
              <li
                key={it.name}
                className="flex flex-wrap items-baseline gap-x-2 rounded-[10px] border border-rule px-4 py-3"
              >
                <span className="text-[15px] font-semibold text-forest">{it.name}</span>
                {it.usedAt ? (
                  <span className="text-[13px] text-muted-ink">· {it.usedAt}</span>
                ) : null}
                <span className="w-full text-[14px] leading-relaxed text-forest/85">{it.how}</span>
                <span className="rounded-[4px] border border-rule px-2 py-0.5 text-[12px] text-muted-ink">
                  자료 준비 중 — 재생 파일이 아직 등록되지 않았습니다
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {closing ? (
        <Section title="마무리 대화" source="가이드 11. 마무리 대화">
          {closing.intro ? (
            <p className="text-[15px] leading-relaxed text-forest/90">{closing.intro}</p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-1.5">
            {closing.questions.map((q) => (
              <li key={q} className="font-serif text-[16px] leading-relaxed text-forest">
                {q}
              </li>
            ))}
          </ul>
          {closing.closingLine ? (
            <p className="mt-4 border-l-2 border-leaf pl-4 font-serif text-[17px] leading-relaxed text-forest">
              {closing.closingLine}
            </p>
          ) : null}
        </Section>
      ) : null}

      {situations ? (
        <Section title="수업 중 이런 상황이 생기면" source="가이드 14. 수업 중 이런 상황이 생기면">
          <ul className="flex flex-col gap-3">
            {situations.map((s) => (
              <li key={s.situation} className="rounded-[10px] border border-rule px-4 py-3">
                <p className="text-[15px] font-bold text-forest">{s.situation}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-ink">
                  <span className="font-semibold">피하기</span> · {s.avoid}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-forest/90">
                  <span className="font-semibold text-leaf">권장</span> · {s.recommend}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {quickGuide ? (
        <Section title="교사용 1페이지 퀵 가이드" source="가이드 15. 교사용 1페이지 퀵 가이드">
          <p className="rounded-[10px] bg-sprout px-4 py-3 text-[15px] leading-relaxed text-forest">
            오늘의 목표 — {quickGuide.goal}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead className="bg-paper text-[13px] text-muted-ink">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    순서
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    교사가 할 일
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    핵심 문장
                  </th>
                </tr>
              </thead>
              <tbody>
                {quickGuide.rows.map((r) => (
                  <tr key={r.order} className="border-t border-rule-soft align-top">
                    <th scope="row" className="px-3 py-2 text-left font-semibold text-forest">
                      {r.order} {r.stage}
                    </th>
                    <td className="px-3 py-2 text-forest/90">{r.todo}</td>
                    <td className="px-3 py-2 font-serif text-forest">{r.keyQuestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quickGuide.closingNote ? (
            <p className="mt-3 text-[14px] leading-relaxed text-muted-ink">
              {quickGuide.closingNote}
            </p>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════ ③ 수업하기 */

export function ClassPanel({ content }: { content: WeekContent }) {
  if (content.scenes.length === 0) {
    return (
      <div className="py-6">
        <NotWritten what="교실 화면 장면" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <section>
        <h3 className="text-[17px] font-bold text-forest">교실 화면 장면 {content.scenes.length}개</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-muted-ink">
          아이 화면 문장은 공식 가이드의 발문에서 가져왔습니다. 교사 노트는 같은 TV 에 열리므로
          공통 진행 안내만 담고, 원아 이름과 관찰은 업무 화면에서 다룹니다.
        </p>
      </section>

      <ol className="flex flex-col gap-3">
        {content.scenes.map((scene) => (
          <li key={scene.sceneNo} className="rounded-[10px] border border-rule bg-white px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="rounded-[4px] bg-sprout px-2 py-0.5 text-[12px] font-bold text-leaf">
                {scene.sceneNo}. {SCENE_TYPE_LABEL[scene.sceneType]}
              </span>
              {scene.stageLabel ? (
                <span className="text-[13px] text-muted-ink">{scene.stageLabel}</span>
              ) : null}
              {scene.baseSeconds ? (
                <span className="text-[13px] tabular-nums text-muted-ink">
                  · 권장 {Math.round(scene.baseSeconds / 60)}분
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-serif text-[20px] leading-snug text-forest">{scene.kidText}</p>
            {scene.teacherNote ? (
              <p className="mt-2 text-[14px] leading-relaxed text-forest/85">
                교사 노트 · {scene.teacherNote}
              </p>
            ) : null}
            <SourceRef>{scene.sourceRef}</SourceRef>
          </li>
        ))}
      </ol>

      <p className="rounded-[10px] bg-sky-pale px-4 py-3 text-[14px] leading-relaxed text-sky-deep">
        교실 화면을 실제로 띄우려면 <strong>수업 회차</strong>가 필요합니다. 회차는 반과 날짜에
        묶이고, 진행 기록이 결과 보고의 첫 단계를 채웁니다. 지금 화면은 장면 구성만 보여 줍니다.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════ ④ 관찰 · ⑤ 결과 보고 */

export function ObservePanel({
  content,
  orgQuery,
  sessions,
}: {
  content: WeekContent;
  orgQuery: string;
  sessions: WeekSessionItem[];
}) {
  const guide = content.blocks.observationGuide;

  return (
    <div className="flex flex-col gap-6 py-6">
      {guide ? (
        <Section title="이번 주 관찰 기준" source="가이드 12. 관찰 및 기록 가이드">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead className="bg-paper text-[13px] text-muted-ink">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    관찰영역
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    관찰할 행동
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    기록 문장에 담을 것
                  </th>
                </tr>
              </thead>
              <tbody>
                {guide.areas.map((a) => (
                  <tr key={a.area} className="border-t border-rule-soft align-top">
                    <th scope="row" className="px-3 py-2 text-left font-semibold text-forest">
                      {a.area}
                    </th>
                    <td className="px-3 py-2 text-forest/90">{a.behavior}</td>
                    <td className="px-3 py-2 text-forest/90">{a.recordFocus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 rounded-[10px] bg-sprout px-4 py-3 text-[14px] leading-relaxed text-forest">
            관찰영역 이름은 원문 그대로입니다. 점수·등급·횟수 칸은 두지 않습니다. 보지 못한 영역은
            비워 둡니다 — 빈칸은 부족함이 아니라 「이번에는 보지 못했다」는 뜻입니다.
          </p>

          {guide.recordExample ? (
            <details className="mt-3 rounded-[10px] border border-rule px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-semibold text-forest">
                원문 기록 예시 보기
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-forest/85">
                {guide.recordExample}
              </p>
              <p className="mt-2 text-[13px] text-muted-ink">
                예시를 그대로 옮겨 모든 아이에게 쓰지 않습니다. 아이마다 실제로 본 장면을
                적습니다.
              </p>
            </details>
          ) : null}
        </Section>
      ) : (
        <NotWritten what="관찰 및 기록 가이드" />
      )}

      <SessionRequired
        what="관찰 입력은 회차에서 합니다"
        why="아이 선택 · 사진 · 아이의 말이 회차와 원아에 묶여 저장됩니다. 주차 번호만으로는 어느 반 누구의 기록인지 정해지지 않습니다."
        sessions={sessions}
        orgQuery={orgQuery}
        hrefFor={(id) => `/teacher/sessions/${id}/observations`}
      />
    </div>
  );
}

export function ReportPanel({
  content,
  orgQuery,
  sessions,
}: {
  content: WeekContent;
  orgQuery: string;
  sessions: WeekSessionItem[];
}) {
  const home = content.blocks.homeConnection;

  return (
    <div className="flex flex-col gap-6 py-6">
      {home ? (
        <Section title={`가정연계 — ${home.title}`} source="가이드 13. 가정연계">
          {home.status === "undecided" ? (
            <p className="rounded-[10px] border border-warning-border bg-warning-soft px-4 py-3 text-[14px] text-warning-text">
              공식 가이드에 이 주차 가정연계가 「미정」으로 적혀 있습니다. 확정 전까지 보호자에게
              보내지 않습니다.
            </p>
          ) : null}
          {home.description ? (
            <p className="text-[15px] leading-relaxed text-forest/90">{home.description}</p>
          ) : null}
          {home.steps.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {home.steps.map((s) => (
                <li key={s} className={bullet}>
                  <span aria-hidden className="shrink-0 text-leaf">
                    ·
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {/*
            ★ 진행 방법과 핵심 문장 사이에 소제목이 붙은 예시 묶음이 들어가는 주차가 있다.
              목록에 섞으면 교사가 그것도 해야 할 절차로 읽는다.
          */}
          {home.examples ? (
            <>
              <h4 className="mt-4 text-[15px] font-bold text-forest">{home.examples.label}</h4>
              <p className="mt-2 text-[14px] leading-relaxed text-forest/90">
                {home.examples.text}
              </p>
            </>
          ) : null}
          {home.noticeExample ? (
            <>
              <h4 className="mt-4 text-[15px] font-bold text-forest">부모님께 전달할 핵심 문장</h4>
              <p className="mt-2 rounded-[10px] bg-sky-pale px-4 py-3 text-[14px] leading-relaxed text-sky-deep">
                {home.noticeExample}
              </p>
            </>
          ) : null}
          {/*
            ★ 2권(9~16주차)은 핵심 문장 뒤에 마무리 문단이 따로 있다.
              진행 방법 항목이 아니므로 목록에 섞지 않고 따로 적는다.
          */}
          {home.closingNote ? (
            <p className="mt-4 border-t border-rule-soft pt-3 text-[14px] leading-relaxed text-forest/85">
              {home.closingNote}
            </p>
          ) : null}
        </Section>
      ) : (
        <NotWritten what="가정연계 내용" />
      )}

      <section className="rounded-[10px] border border-rule px-4 py-3">
        <h3 className="text-[15px] font-bold text-forest">결과 보고</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-forest/85">
          결과 보고는 <strong>수업 회차 단위</strong>로 제출합니다. 진행한 활동과 실제 시간은 교실
          화면 진행 기록에서 채워지고, 출결·관찰은 이미 저장된 값을 가져옵니다. 그래서 회차 없이는
          제출할 수 없습니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-ink">
          원장에게 가는 결과보고서는 반 단위이고, 보호자에게 가는 성장 이야기는 원아 단위입니다.
          성장 이야기는 교사가 확인하고 완료한 것만 공유 대상이 됩니다.
        </p>
        <Link
          href={`/teacher/growth-reports?${orgQuery}`}
          className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-sky-deep underline"
        >
          리포트 화면 열기
        </Link>
      </section>

      <SessionRequired
        what="결과 보고는 회차 단위로 제출합니다"
        why="진행한 활동과 실제 시간은 회차의 진행 기록에서 채워지고, 출결·관찰은 이미 저장된 값을 가져옵니다."
        sessions={sessions}
        orgQuery={orgQuery}
        hrefFor={(id) => `/teacher/sessions/${id}/report`}
      />
    </div>
  );
}
