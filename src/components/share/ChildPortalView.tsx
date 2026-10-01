"use client";

import { useEffect, useState } from "react";
import {
  PORTAL_RESOLVE_ENDPOINT,
  PORTAL_TOKEN_PATTERN,
  type ChildPortalData,
  type ChildPortalResolveResponse,
  type PortalWeekly,
} from "@/types/child-portal";

type ViewState =
  | { phase: "loading" }
  | { phase: "ready"; portal: ChildPortalData }
  | { phase: "needsLink" }
  | { phase: "unavailable" };

function stripFragment() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

function dot(value: string | null): string {
  return value ? value.slice(0, 10).replaceAll("-", ".") : "";
}

function weekLabel(item: PortalWeekly): string {
  const range = item.dateFrom ? (item.dateTo && item.dateTo !== item.dateFrom ? `${dot(item.dateFrom)} ~ ${dot(item.dateTo)}` : dot(item.dateFrom)) : "";
  return `Week ${item.weekNo}${range ? ` · ${range}` : ""}`;
}

/**
 * 학부모 "아이 기록" (PT-01 · DEC-042 · DEC-060 · DEC-100 · DEC-103).
 *
 * · 탭 2개: 이번 주 · 지난 기록
 * · 이번 주 = 현재 주간 수업 week 의 공개 Weekly (서버 판정). 없으면
 *   "현재 새로 공유된 기록이 없습니다." — 이전 기록을 끌어올리지 않는다
 * · 모든 기록에 Week 번호 + 실제 날짜
 * · 수정본은 "업데이트됨 YYYY.MM.DD" 만 (정정됨 · v2 없음)
 * · 관찰된 모습: 지표 이름 + 교사 관찰 문장 · Stage 없음
 * · 사진은 표시하지 않는다 (영역 자체 없음 · 사유 문구 없음)
 * · 실패 원인을 구분하지 않는다
 */
export function ChildPortalView({ portalId }: { portalId: string }) {
  const [state, setState] = useState<ViewState>({ phase: "loading" });
  const [tab, setTab] = useState<"this_week" | "past">("this_week");
  const [openPast, setOpenPast] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const token = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";

      if (token === "") {
        await Promise.resolve();
        if (!controller.signal.aborted) setState({ phase: "needsLink" });
        return;
      }

      if (!PORTAL_TOKEN_PATTERN.test(token)) {
        await Promise.resolve();
        if (controller.signal.aborted) return;
        stripFragment();
        setState({ phase: "unavailable" });
        return;
      }

      let next: ViewState = { phase: "unavailable" };
      try {
        const response = await fetch(PORTAL_RESOLVE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({ portalId, token }),
        });
        if (controller.signal.aborted) return;
        if (response.ok) {
          const payload = (await response.json()) as ChildPortalResolveResponse;
          if (payload.ok) next = { phase: "ready", portal: payload.portal };
        }
      } catch {
        if (controller.signal.aborted) return;
      }

      // 주소창 · 방문 기록에 token 을 남기지 않는다
      stripFragment();
      setState(next);
    })();

    return () => controller.abort();
  }, [portalId]);

  if (state.phase === "loading") {
    return (
      <p role="status" aria-live="polite" className="py-16 text-center text-body-lg text-ink-muted">
        기록을 불러오고 있어요
      </p>
    );
  }

  if (state.phase === "needsLink") {
    return (
      <section className="py-16 text-center">
        <h1 className="text-title font-bold text-ink">처음 받으신 링크에서 열어 주세요</h1>
        <p className="mt-2 text-body leading-relaxed text-ink-muted">
          보안을 위해 새로고침한 화면에서는 기록을 다시 불러올 수 없습니다. 전달받으신 링크를 다시 눌러 주세요.
        </p>
      </section>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <section className="py-16 text-center">
        <h1 className="text-title font-bold text-ink">이 링크로는 기록을 확인할 수 없습니다.</h1>
        <p className="mt-2 text-body leading-relaxed text-ink-muted">기관에 새 공유 링크를 요청해 주세요.</p>
      </section>
    );
  }

  const { portal } = state;
  const hasAny = portal.thisWeek.length > 0 || portal.past.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-body-sm text-ink-muted">
          {portal.organizationName}
          {portal.className ? ` · ${portal.className}` : ""}
        </p>
        <h1 className="text-headline font-bold text-navy">{portal.childName}의 기록</h1>
      </header>

      <div role="tablist" aria-label="기록 보기" className="grid grid-cols-2 gap-2">
        {(
          [
            ["this_week", "이번 주"],
            ["past", "지난 기록"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => {
              setTab(key);
              setOpenPast(null);
            }}
            className={`min-h-12 rounded-xl border text-body-lg font-semibold ${
              tab === key ? "border-brand-navy bg-brand-navy text-white" : "border-hairline bg-white text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "this_week" ? (
        <section role="tabpanel" id="panel-this_week" aria-labelledby="tab-this_week" className="flex flex-col gap-5">
          {portal.thisWeek.length === 0 ? (
            <>
              <p className="rounded-2xl border border-hairline bg-white px-5 py-10 text-center text-body-lg text-ink">
                {hasAny ? "현재 새로 공유된 기록이 없습니다." : "아직 공유된 기록이 없습니다."}
              </p>
              {portal.past.length > 0 ? (
                <div>
                  <h2 className="text-body-lg font-bold text-ink">최근 공유 기록</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("past");
                      setOpenPast(0);
                    }}
                    className="mt-2 flex min-h-12 w-full items-center rounded-xl border border-hairline bg-white px-4 text-left text-body text-ink"
                  >
                    {weekLabel(portal.past[0])}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            portal.thisWeek.map((item) => <WeeklyRecord key={`${item.weekNo}-${item.dateFrom}`} item={item} />)
          )}
        </section>
      ) : (
        <section role="tabpanel" id="panel-past" aria-labelledby="tab-past" className="flex flex-col gap-3">
          {portal.past.length === 0 ? (
            <p className="rounded-2xl border border-hairline bg-white px-5 py-10 text-center text-body-lg text-ink">
              아직 공유된 기록이 없습니다.
            </p>
          ) : openPast !== null && portal.past[openPast] ? (
            <>
              <button
                type="button"
                onClick={() => setOpenPast(null)}
                className="min-h-12 self-start rounded-xl border border-hairline bg-white px-4 text-body text-ink"
              >
                목록으로
              </button>
              <WeeklyRecord item={portal.past[openPast]} />
            </>
          ) : (
            <ul className="flex flex-col gap-2">
              {portal.past.map((item, index) => (
                <li key={`${item.weekNo}-${item.dateFrom}-${index}`}>
                  <button
                    type="button"
                    onClick={() => setOpenPast(index)}
                    className="flex min-h-14 w-full flex-col items-start justify-center rounded-xl border border-hairline bg-white px-4 py-2 text-left"
                  >
                    <span className="text-body font-semibold text-ink">{weekLabel(item)}</span>
                    {item.content.topic ? <span className="text-body-sm text-ink-muted">{item.content.topic}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="border-t border-hairline pt-4 text-label leading-relaxed text-ink-muted print:hidden">
        이 링크는 해당 보호자에게만 전달해 주세요.
      </footer>
    </div>
  );
}

function WeeklyRecord({ item }: { item: PortalWeekly }) {
  const { content } = item;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-5">
      <div>
        <p className="text-body-sm text-ink-muted">{weekLabel(item)}</p>
        {item.updatedOn ? <p className="text-label text-ink-muted">업데이트됨 {item.updatedOn}</p> : null}
      </div>

      {content.topic ? <Section title="이번 주 활동 주제" body={content.topic} /> : null}
      {content.quoteChoice ? <Section title="아이의 말과 선택" body={content.quoteChoice} /> : null}
      {content.teacherObservation ? <Section title="교사 관찰 기록" body={content.teacherObservation} /> : null}

      {item.observedMoments.length > 0 ? (
        <section>
          <h2 className="text-body-lg font-bold text-ink">관찰된 모습</h2>
          <p className="mt-1 text-body leading-relaxed text-ink">{item.observedMoments.join(" · ")}</p>
          <p className="mt-1 text-label leading-relaxed text-ink-muted">
            이 기록은 점수나 평가가 아니라, 이번 활동에서 보인 아이의 모습을 담은 것입니다.
          </p>
        </section>
      ) : null}

      {content.familyConversation ? <Section title="가정에서 나눌 이야기" body={content.familyConversation} /> : null}
      {content.nextWeekPreview ? <Section title="다음 주 예고" body={content.nextWeekPreview} /> : null}

      <button
        type="button"
        onClick={() => window.print()}
        className="min-h-12 self-start rounded-xl border border-hairline bg-white px-4 text-body text-ink print:hidden"
      >
        인쇄
      </button>
    </article>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-body-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 whitespace-pre-line text-body-lg leading-relaxed text-ink">{body}</p>
    </section>
  );
}
