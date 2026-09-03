"use client";

import { useEffect, useState } from "react";
import {
  SHARE_RESOLVE_ENDPOINT,
  SHARE_TOKEN_PATTERN,
  type ParentSharedActivity,
  type ParentSharedReport,
  type ParentShareResolveResponse,
} from "@/types/parent-share";

interface ParentGrowthReportViewProps {
  shareId: string;
}

type ViewState =
  | { phase: "loading" }
  | { phase: "ready"; report: ParentSharedReport }
  | { phase: "unavailable" };

/**
 * SERVICE-13 — 학부모 성장 리포트 화면.
 *
 * ★ 비밀값은 주소창의 #뒤에서 읽는다.
 *   fragment는 브라우저가 서버로 보내지 않는다 — 서버 access log에도,
 *   Referer 헤더에도 남지 않는다. 그래서 Server Component가 아니라
 *   Client Component가 읽어 POST로 넘긴다.
 *
 * ★ 주소창의 fragment 는 **조회를 끝낸 뒤에** 지운다.
 *   fragment 는 서버로 가지 않지만 주소창 · 브라우저 방문기록 · 화면 캡처에는
 *   그대로 남는다. 그래서 지우기는 하되, 지우는 시점이 중요하다.
 *
 *   ※ 읽자마자 지우면 개발 모드에서 화면이 열리지 않는다.
 *     React Strict Mode 는 effect 를 setup → cleanup → setup 으로 두 번 돌린다.
 *     첫 번째가 주소창을 먼저 비워 버리면, 두 번째는 읽을 hash 가 없어
 *     언제나 "사용할 수 없습니다"가 된다. 경합이 아니라 결정적인 실패다.
 *
 *     그래서 순서를 이렇게 둔다 —
 *       token 확보 → 검증 → resolve 요청 → **응답 수신** → 취소되지 않았는지 확인
 *       → 그때 fragment 제거 → 화면 반영
 *     취소된(cleanup 된) 실행은 주소창을 건드리지 않고 조용히 끝난다.
 *     그래야 살아남은 실행이 같은 token 을 다시 읽을 수 있다.
 *
 *   ※ 제거 이후 새로고침은 동작하지 않는다. 주소에 비밀값이 없기 때문이다.
 *     부모는 받은 링크를 다시 열어야 한다. 노출을 줄이려고 택한 맞바꿈이다.
 *
 * ★ 비밀값을 화면에 표시하지 않는다.
 *   상태 문구에도, 오류 메시지에도 넣지 않는다.
 *   React state 에도 담지 않는다 — effect 안의 지역 변수로만 존재하고
 *   요청 한 번에 쓰인 뒤 사라진다. localStorage / sessionStorage / cookie 도 쓰지 않는다.
 *
 * ★ 실패 이유를 나누지 않는다.
 *   없는 링크 · 틀린 비밀값 · 만료 · 중지가 모두 같은 화면이다.
 *   부모에게 정확한 원인을 알려 줄 실익이 없고, 링크를 찔러 보는 사람에게는
 *   "이 주소는 존재한다"는 정보를 주게 된다.
 *
 * ★ 점수 · 등급 · 진단 · 발달단계 문구가 없다.
 *   AI가 쓰였는지 여부도 표시하지 않는다.
 */
export function ParentGrowthReportView({ shareId }: ParentGrowthReportViewProps) {
  const [state, setState] = useState<ViewState>({ phase: "loading" });

  useEffect(() => {
    // ★ cleanup 된 실행을 확실히 구분하는 하나의 기준.
    //   진행 중인 요청을 실제로 취소하고, "내가 아직 살아 있는가"의 판정에도 쓴다.
    //   플래그만 두면 요청은 계속 날아가고, 취소 여부를 두 곳에서 관리하게 된다.
    const controller = new AbortController();

    // ★ 모든 상태 전이를 async 경로 안에서만 한다.
    //   effect 본문에서 곧바로 setState 하면 렌더 중 갱신이 되어 버린다.
    void (async () => {
      // ① 비밀값을 지역 변수로 확보한다.
      //    이 변수가 raw token 이 존재하는 유일한 곳이다.
      //    ★ 여기서 주소창을 건드리지 않는다 — 이 실행이 곧 취소될 수 있고,
      //      그러면 다음 실행이 읽을 hash 가 사라진다.
      const token = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";

      // ② 형식이 아예 다르면 서버에 요청조차 보내지 않는다.
      //    이 경로에서도 fragment 는 지운다 — 오타 하나 섞인 실제 비밀값일 수 있다.
      //    (형식이 틀린 값은 어느 실행에서 읽어도 틀리므로 정상 경로를 깨뜨리지 않는다)
      if (!SHARE_TOKEN_PATTERN.test(token)) {
        await Promise.resolve();
        if (controller.signal.aborted) return;

        stripFragment();
        setState({ phase: "unavailable" });
        return;
      }

      // 실패를 기본값으로 둔다. 성공했을 때만 덮어쓴다.
      let next: ViewState = { phase: "unavailable" };

      try {
        const response = await fetch(SHARE_RESOLVE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          // 비밀값은 body로만 나간다. 이 호출이 token 을 쓰는 유일한 지점이다.
          body: JSON.stringify({ shareId, token }),
        });

        if (controller.signal.aborted) return;

        if (response.ok) {
          const payload = (await response.json()) as ParentShareResolveResponse;

          if (controller.signal.aborted) return;

          if (payload.ok) next = { phase: "ready", report: payload.report };
        }
      } catch {
        // ★ 취소로 인한 예외는 실패가 아니다. 화면도 주소창도 건드리지 않는다.
        if (controller.signal.aborted) return;
      }

      // ③ 여기까지 왔다는 것은 취소되지 않은 실행이 응답을 손에 쥐었다는 뜻이다.
      //    그때서야 주소창과 현재 history 항목에서 fragment 를 지운다.
      stripFragment();
      setState(next);
    })();

    return () => {
      controller.abort();
    };
  }, [shareId]);

  if (state.phase === "loading") {
    return (
      <p className="rounded-2xl border border-navy/10 bg-white px-5 py-12 text-center text-[14px] text-navy/50">
        리포트를 불러오는 중입니다.
      </p>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <div className="rounded-2xl border border-navy/10 bg-white px-5 py-12 text-center">
        <p className="text-[15px] font-bold text-navy">
          이 공유 링크를 사용할 수 없습니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-navy/55">
          링크가 만료되었거나 공유가 종료되었을 수 있습니다.
          <br />
          유치원에 새 링크를 요청해주세요.
        </p>
      </div>
    );
  }

  const { report } = state;

  return (
    <article>
      <header className="rounded-2xl border border-navy/10 bg-white p-5">
        <p className="text-[12px] font-semibold text-navy/50">
          {report.organizationName}
        </p>

        <h1 className="mt-1 break-words text-[20px] font-bold leading-snug text-navy">
          {report.childName ? `${report.childName} 성장 리포트` : "성장 리포트"}
        </h1>

        {report.className ? (
          <p className="mt-1 text-[13px] text-navy/55">{report.className}</p>
        ) : null}

        <p className="mt-1.5 text-[13px] tabular-nums text-navy/55">
          {formatPeriod(report.periodStart, report.periodEnd)}
        </p>

        <p className="mt-3 break-words text-[13px] leading-relaxed text-navy/60">
          {report.title}
        </p>
      </header>

      <div className="mt-4 flex flex-col gap-4">
        <Block label="이번 기간에 관찰된 모습" value={report.observationSummary} />
        <Block label="성장 변화" value={report.growthChanges} />
        <Block label="다음 지원 방향" value={report.nextSupport} />
      </div>

      {report.activities.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-navy/10 bg-white p-5">
          <h2 className="text-[15px] font-bold text-navy">함께한 활동</h2>

          <ul className="mt-3 flex flex-col divide-y divide-navy/8">
            {report.activities.map((activity, index) => (
              <ActivityRow
                key={`${activity.observedOn ?? "unknown"}-${index}`}
                activity={activity}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-6">
        <p className="text-[12px] leading-relaxed text-navy/45">
          교사가 작성 완료한 기록을 바탕으로 제공됩니다.
          {report.completedAt
            ? ` 작성 완료 ${formatDate(report.completedAt.slice(0, 10))}.`
            : ""}
        </p>
      </footer>
    </article>
  );
}

/**
 * 주소창과 **현재** history 항목에서 #fragment 만 지운다.
 *
 * ★ 새 history 항목을 만들지 않는다.
 *   pushState 를 쓰면 뒤로가기 한 번에 비밀값이 다시 주소창에 돌아온다.
 *   replaceState 로 지금 항목을 덮어써야 방문기록에서도 사라진다.
 *
 * ★ 페이지를 다시 불러오지 않는다.
 *   location.href / location.replace 를 쓰면 전체 재요청이 일어나고,
 *   그 사이 이미 읽어 둔 token 으로 하던 조회가 끊긴다.
 *
 * ★ history.state 를 그대로 넘긴다.
 *   Next.js App Router 가 자기 라우팅 상태를 여기에 보관한다.
 *   null 로 덮으면 이후 클라이언트 내비게이션이 깨진다.
 */
function stripFragment() {
  // 애초에 fragment 가 없으면 history 를 건드리지 않는다.
  if (!window.location.hash) return;

  try {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  } catch {
    // 일부 환경(file:// · 일부 샌드박스 iframe)에서는 replaceState 가 막힌다.
    // 그때는 주소창에 fragment 가 남지만 화면 동작은 그대로 유지한다.
    // 실패 사실도 로그로 남기지 않는다 — 남길 만한 안전한 정보가 없다.
  }
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-5">
      <h2 className="text-[13px] font-bold text-navy/60">{label}</h2>
      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-loose text-navy">
        {value}
      </p>
    </section>
  );
}

function ActivityRow({ activity }: { activity: ParentSharedActivity }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      {activity.observedOn ? (
        <p className="text-[12px] tabular-nums text-navy/45">
          {formatDate(activity.observedOn)}
        </p>
      ) : null}

      <p className="mt-0.5 break-words text-[14px] font-semibold leading-snug text-navy">
        {activity.lessonTitle ?? "활동"}
      </p>

      {activity.domainLabels.length > 0 ? (
        <p className="mt-1 break-words text-[12px] leading-relaxed text-navy/50">
          {activity.domainLabels.join(" · ")}
        </p>
      ) : null}
    </li>
  );
}

/** date 컬럼이라 "YYYY-MM-DD" 문자열을 그대로 쪼갠다(시간대 변환 없음). */
function formatDate(value: string): string {
  return value.split("-").join(".");
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}
