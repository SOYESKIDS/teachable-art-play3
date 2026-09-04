"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  /** 주소에 비밀값이 아예 없다 — 새로고침했거나 링크를 잘라서 열었다 */
  | { phase: "needsLink" }
  /** 그 밖의 모든 실패. 이유를 구분해 주지 않는다. */
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
 *   ※ 단 하나의 예외: **주소에 비밀값이 아예 없는 경우**.
 *     이것은 서버에 묻지 않고도 알 수 있고, 보안 상태가 아니라 "무엇을 해야
 *     하는가"의 문제다(새로고침 후 이 상태가 된다). 그래서 이때만 따로 안내한다.
 *     서버에 요청을 보내지 않으므로 링크의 존재 여부는 여전히 드러나지 않는다.
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

      // ② 주소에 비밀값이 아예 없다 = 새로고침했거나 링크를 잘라서 열었다.
      //    서버에 물어볼 것이 없으므로 요청하지 않고 안내만 한다.
      if (token === "") {
        await Promise.resolve();
        if (controller.signal.aborted) return;

        setState({ phase: "needsLink" });
        return;
      }

      // ③ 형식이 아예 다르면 서버에 요청조차 보내지 않는다.
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

      // ④ 여기까지 왔다는 것은 취소되지 않은 실행이 응답을 손에 쥐었다는 뜻이다.
      //    그때서야 주소창과 현재 history 항목에서 fragment 를 지운다.
      stripFragment();
      setState(next);
    })();

    return () => {
      controller.abort();
    };
  }, [shareId]);

  if (state.phase === "loading") {
    return <LoadingSkeleton />;
  }

  if (state.phase === "needsLink") {
    return (
      <NoticeCard title="처음 받으신 링크에서 열어주세요">
        보안을 위해 화면이 열리면 주소에서 비밀 부분이 지워집니다. 그래서
        새로고침한 화면에서는 기록을 다시 불러올 수 없습니다.
        <br />
        <br />
        전달받으신 링크를 다시 눌러주세요.
      </NoticeCard>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <NoticeCard title="이 성장 기록을 열 수 없습니다">
        링크가 만료되었거나 더 이상 공유되지 않는 기록일 수 있습니다.
        <br />
        유치원에 새 링크를 요청해주세요.
      </NoticeCard>
    );
  }

  const { report } = state;

  return (
    <>
      {/*
        ★ 문서 본체를 gr-report 하나로 감싼다.
          인쇄 규칙(report-print.css)이 이 클래스 안에서만 동작하므로,
          이 파일의 인쇄 스타일이 다른 화면으로 새어 나가지 않는다.
      */}
      <article className="gr-report flex flex-col gap-4 sm:gap-5">
        <ReportCover report={report} />

        {/*
          01 은 이 문서에서 가장 중요한 단락이다.
          왼쪽 굵은 선 · 큰 본문 · 넓은 여백으로 무게를 준다 —
          배경 인쇄를 끈 흑백 출력에서도 위계가 남아야 하므로
          색이 아니라 선과 크기로 만든다.
        */}
        <Narrative
          index="01"
          eyebrow="GROWTH HIGHLIGHT"
          heading="이번 기간의 성장 변화"
          body={report.growthChanges}
          emphasis="primary"
        />

        {/*
          gr-duo 는 인쇄 규칙이 잡는 손잡이다.
          화면에서는 lg 이상에서만 두 칸이 되지만, 인쇄 지면의 CSS 폭은
          lg 에 못 미쳐 그 규칙이 걸리지 않는다. report-print.css 가
          이 클래스를 보고 종이에서 다시 두 칸으로 세운다.
        */}
        <div className="gr-duo grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
          <Narrative
            index="02"
            eyebrow="OBSERVATION STORY"
            heading="이번 기간에 관찰된 모습"
            body={report.observationSummary}
            emphasis="neutral"
          />
          <Narrative
            index="03"
            eyebrow="NEXT STEP"
            heading="다음 활동에서 도와줄 부분"
            body={report.nextSupport}
            emphasis="soft"
          />
        </div>

        {report.activities.length > 0 ? (
          <ActivityHighlight activities={report.activities} />
        ) : null}

        <ReportFooter completedAt={report.completedAt} />
      </article>

      {/* 인쇄물에는 남지 않는다 — 문서가 아니라 화면의 도구다. */}
      <div className="mt-6 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-navy/20 bg-white px-5 text-[14px] font-semibold text-navy transition-colors hover:border-navy/35 hover:bg-navy/5"
        >
          <PrinterIcon />
          인쇄 / PDF 저장
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── 표지 */

/**
 * 표지.
 *
 * 가운데 정렬한 카드가 아니라 왼쪽 정렬 편집 지면처럼 짠다.
 * 시선이 처음 닿는 곳이 아이 이름이어야 하므로 브랜드 표기는 작게 위로
 * 올리고, 이름만 크게 남긴다.
 */
function ReportCover({ report }: { report: ParentSharedReport }) {
  const place = [report.organizationName, report.className]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="gr-block gr-cover rounded-2xl border border-navy/10 bg-white px-6 py-8 sm:px-9 sm:py-10">
      <span
        aria-hidden="true"
        className="gr-accent block h-[3px] w-12 rounded-full bg-yellow"
      />

      <p className="gr-eyebrow mt-5 text-[10px] font-bold tracking-[0.2em] text-navy/45">
        SOYESKIDS · TEACHABLE ART PLAY
      </p>
      <p className="gr-eyebrow mt-1.5 text-[10px] font-bold tracking-[0.28em] text-trust-blue">
        GROWTH REPORT
      </p>

      <h1 className="gr-title mt-5 break-words text-[30px] font-bold leading-[1.25] text-navy sm:text-[38px]">
        {report.childName ? (
          <>
            {report.childName}의
            <br />
            성장 기록
          </>
        ) : (
          "성장 기록"
        )}
      </h1>

      <p className="gr-subtitle mt-4 max-w-[46ch] break-words text-[14px] leading-relaxed text-navy/65 sm:text-[15px]">
        {report.title}
      </p>

      <dl className="gr-cover-meta mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-navy/10 pt-5">
        {place ? <MetaItem label="기관" value={place} /> : null}
        <MetaItem
          label="기간"
          value={formatPeriod(report.periodStart, report.periodEnd)}
        />
        {report.completedAt ? (
          <MetaItem
            label="작성 완료"
            value={formatDate(report.completedAt.slice(0, 10))}
          />
        ) : null}
      </dl>
    </header>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="gr-meta-label text-[10px] font-bold tracking-[0.14em] text-navy/40">
        {label}
      </dt>
      <dd className="gr-meta mt-1 break-words text-[13px] font-medium tabular-nums text-navy/75">
        {value}
      </dd>
    </div>
  );
}

/* ───────────────────────────────────────────────────── 본문 단락 */

/**
 * 번호 · 영문 표제 · 한글 제목 · 본문으로 이루어진 단락 하나.
 *
 * ★ 색으로만 위계를 만들지 않는다.
 *   emphasis 는 배경색뿐 아니라 왼쪽 선의 진하기와 본문 크기까지 함께
 *   바꾼다. 브라우저에서 "배경 그래픽"을 끄고 인쇄해도 01 이 가장 무겁게
 *   남아야 한다.
 *
 * ★ 장식이 본문을 이기지 않게 한다.
 *   번호와 영문 표제는 작고 흐리게 두고, 눈이 한글 제목과 본문으로
 *   곧장 가게 한다.
 */
type Emphasis = "primary" | "neutral" | "soft";

const EMPHASIS_SURFACE: Record<Emphasis, string> = {
  primary: "border-navy/15 bg-white border-l-[3px] border-l-navy",
  neutral: "border-navy/10 bg-white border-l-[3px] border-l-navy/25",
  soft: "border-navy/10 bg-surface-soft border-l-[3px] border-l-soft-green",
};

const EMPHASIS_BODY: Record<Emphasis, string> = {
  primary: "text-[17px] leading-[1.85]",
  neutral: "text-[15px] leading-[1.8]",
  soft: "text-[15px] leading-[1.8]",
};

function Narrative({
  index,
  eyebrow,
  heading,
  body,
  emphasis,
}: {
  index: string;
  eyebrow: string;
  heading: string;
  body: string;
  emphasis: Emphasis;
}) {
  return (
    <section
      data-emphasis={emphasis}
      className={`gr-block gr-narrative h-full rounded-2xl border px-6 py-6 sm:px-8 sm:py-7 ${EMPHASIS_SURFACE[emphasis]}`}
    >
      <p className="gr-index text-[11px] font-bold tabular-nums tracking-[0.1em] text-navy/35">
        {index}
      </p>
      <p className="gr-eyebrow mt-1 text-[10px] font-bold tracking-[0.18em] text-trust-blue">
        {eyebrow}
      </p>

      <h2 className="gr-heading mt-3 break-keep text-[18px] font-bold leading-snug text-navy sm:text-[20px]">
        {heading}
      </h2>

      <p
        className={`gr-body mt-4 whitespace-pre-wrap break-words text-navy ${EMPHASIS_BODY[emphasis]}`}
      >
        {body}
      </p>
    </section>
  );
}

/* ───────────────────────────────────────────────────── 함께한 활동 */

/**
 * 함께한 활동.
 *
 * 활동마다 카드를 만들면 열 개짜리 리포트가 세로로 한없이 늘어나고
 * 인쇄에서 두 장이 된다. 날짜 · 이름 · 영역을 한 줄로 묶어 표처럼 읽히게 한다.
 * 잘라내는 것이 아니라 접어 넣는 것이다 — 내용은 하나도 빠지지 않는다.
 */
function ActivityHighlight({
  activities,
}: {
  activities: ParentSharedActivity[];
}) {
  return (
    <section className="gr-block gr-activities rounded-2xl border border-navy/10 bg-white px-6 py-6 sm:px-8 sm:py-7">
      <h2 className="gr-heading text-[16px] font-bold text-navy sm:text-[17px]">
        함께한 활동
      </h2>
      <p className="gr-meta mt-1 text-[12px] leading-relaxed text-navy/45">
        이 기간에 함께한 수업입니다.
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-navy/8">
        {activities.map((activity, index) => (
          <ActivityRow
            key={`${activity.observedOn ?? "unknown"}-${index}`}
            activity={activity}
          />
        ))}
      </ul>
    </section>
  );
}

function ActivityRow({ activity }: { activity: ParentSharedActivity }) {
  return (
    <li className="gr-activity flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4">
      <p className="gr-meta shrink-0 text-[12px] tabular-nums text-navy/40 sm:w-[86px]">
        {activity.observedOn ? formatDate(activity.observedOn) : ""}
      </p>

      <div className="min-w-0 flex-1">
        <p className="gr-activity-title break-words text-[15px] font-bold leading-snug text-navy">
          {activity.lessonTitle ?? "활동"}
        </p>

        {activity.domainLabels.length > 0 ? (
          <p className="mt-1.5 flex flex-wrap gap-1">
            {activity.domainLabels.map((label) => (
              <span
                key={label}
                className="gr-tag break-keep rounded border border-navy/15 px-1.5 text-[11px] leading-[1.6] text-navy/60"
              >
                {label}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────── 맺음말 */

/** 문서의 끝. 여기까지 읽으면 정식 결과물로 마무리되게 한다. */
function ReportFooter({ completedAt }: { completedAt: string | null }) {
  return (
    <footer className="gr-block gr-footer rounded-2xl border border-navy/10 bg-white px-6 py-6 sm:px-8">
      <p className="gr-body text-[13px] leading-relaxed text-navy/65">
        이 기록은 TeachAble Art Play 수업 중 관찰과 교사의 검토를 바탕으로
        작성되었습니다.
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-navy/10 pt-4">
        {completedAt ? (
          <p className="gr-meta text-[12px] tabular-nums text-navy/45">
            {`작성 완료 ${formatDate(completedAt.slice(0, 10))}`}
          </p>
        ) : null}

        <p className="gr-brand text-right">
          <span className="block text-[10px] font-bold tracking-[0.18em] text-navy/45">
            SOYESKIDS
          </span>
          <span className="mt-0.5 block font-serif text-[15px] font-semibold italic text-navy">
            TeachAble Art Play
          </span>
        </p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────── 나머지 상태 */

/** 불러오는 동안. 갑자기 나타나지 않도록 실제 구조와 비슷한 자리를 잡아 둔다. */
function LoadingSkeleton() {
  return (
    <div aria-live="polite" className="flex flex-col gap-4 sm:gap-5">
      <span className="sr-only">성장 기록을 불러오는 중입니다.</span>

      <div className="rounded-2xl border border-navy/10 bg-white px-6 py-8 sm:px-9 sm:py-10">
        <div className="h-[3px] w-12 rounded-full bg-navy/10" />
        <div className="mt-5 h-2.5 w-40 rounded bg-navy/10" />
        <div className="mt-6 h-8 w-56 rounded bg-navy/10" />
        <div className="mt-3 h-8 w-40 rounded bg-navy/10" />
      </div>

      {[0, 1].map((n) => (
        <div
          key={n}
          className="rounded-2xl border border-navy/10 bg-white px-6 py-6 sm:px-8"
        >
          <div className="h-2.5 w-24 rounded bg-navy/10" />
          <div className="mt-4 h-4 w-48 rounded bg-navy/10" />
          <div className="mt-4 h-3 w-full rounded bg-navy/[0.07]" />
          <div className="mt-2 h-3 w-11/12 rounded bg-navy/[0.07]" />
          <div className="mt-2 h-3 w-9/12 rounded bg-navy/[0.07]" />
        </div>
      ))}
    </div>
  );
}

/** 열 수 없을 때. 기술 용어를 쓰지 않고, 오류처럼 보이지 않게 한다. */
function NoticeCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mx-auto block h-[3px] w-12 rounded-full bg-yellow"
      />
      <p className="mt-6 text-[17px] font-bold text-navy">{title}</p>
      <p className="mx-auto mt-3 max-w-[34ch] text-[14px] leading-relaxed text-navy/55">
        {children}
      </p>
    </div>
  );
}

function PrinterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9V3.5h12V9" />
      <path d="M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H18" />
      <rect x="6" y="14.5" width="12" height="6" rx="1" />
    </svg>
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

/** date 컬럼이라 "YYYY-MM-DD" 문자열을 그대로 쪼갠다(시간대 변환 없음). */
function formatDate(value: string): string {
  return value.split("-").join(".");
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}
