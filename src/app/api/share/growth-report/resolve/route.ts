import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import {
  SHARE_TOKEN_PATTERN,
  type ParentSharedActivity,
  type ParentShareResolveResponse,
} from "@/types/parent-share";

/**
 * SERVICE-13 — 학부모 공유 링크 확인 endpoint.
 *
 * ★ 로그인하지 않은 사람이 도달하는 유일한 데이터 경로다.
 *   그래서 여기서 할 수 있는 일이 하나뿐이다 —
 *   public.read_shared_growth_report(share_id, raw_token) 호출.
 *
 * ★ 이 파일은 token 을 해시하지 않는다 (pass-the-hash 방지)
 *   해시를 인증값으로 넘기면, DB 에 저장된 token_hash 자체가 그대로
 *   bearer credential 이 된다 — 읽기 전용 DB 유출만으로 링크가 열린다.
 *   그래서 원본 token 을 그대로 넘기고, SHA-256 은 DB 함수 안에서만 만든다.
 *   비교 대상은 DB 가 계산한 값이므로 저장된 hash 를 넣어도 통과하지 못한다.
 *
 * ★ 비밀값은 body로만 온다. URL에 절대 넣지 않는다.
 *   GET query에 넣으면 서버 access log · 프록시 · Referer에 그대로 남는다.
 *   부모 페이지는 #fragment에서 읽어 여기로 POST한다(fragment는 전송되지 않는다).
 *
 * ★ 비밀값을 로그에 남기지 않는다.
 *   body도, token도, hash도, share id도 console에 찍지 않는다.
 *   실패 시 남기는 것은 원인 구분용 짧은 문자열뿐이다.
 *
 * ★ service_role을 쓰지 않는다.
 *   createPublicClient()는 Publishable Key + 세션 없음 = 언제나 anon 역할이다.
 *   그 역할에는 공유 표에 대한 GRANT가 하나도 없다.
 *
 * ★ 실패를 구분해 주지 않는다.
 *   형식 오류 · 없는 공유 · 틀린 비밀값 · 만료 · 중지 · 작성 중 리포트가
 *   전부 같은 응답({ ok: false }, 200)으로 끝난다.
 *   상태 코드까지 같게 두는 이유는 404/401로 나뉘면 그 자체가
 *   "이 공유는 존재한다"는 신호가 되기 때문이다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 사용자 입력이므로 상한을 둔다. 정상 값은 43자다. */
const MAX_TOKEN_LENGTH = 200;

/** 캐시·색인·Referer 유출을 모두 막는다. 개인 문서다. */
const SECURE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "X-Content-Type-Options": "nosniff",
} as const;

interface SharedReportRow {
  organization_name: string | null;
  class_name: string | null;
  child_name: string | null;
  report_title: string | null;
  period_start: string | null;
  period_end: string | null;
  completed_at: string | null;
  growth_changes: string | null;
  observation_summary: string | null;
  next_support: string | null;
  activities: unknown;
}

function logFailure(reason: string) {
  // 어떤 링크였는지 알 수 없는 문자열만 남긴다.
  console.error(`[share/growth-report] resolve failed: ${reason}`);
}

/** 어떤 이유든 부모에게는 같은 응답이다. */
function unavailable() {
  return NextResponse.json<ParentShareResolveResponse>(
    { ok: false },
    { status: 200, headers: SECURE_HEADERS },
  );
}

/** DB가 준 jsonb 배열을 화이트리스트 필드로만 다시 만든다. */
function toActivities(raw: unknown): ParentSharedActivity[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): ParentSharedActivity[] => {
    if (typeof item !== "object" || item === null) return [];

    const row = item as Record<string, unknown>;

    const labels = Array.isArray(row.domain_labels)
      ? row.domain_labels.filter(
          (label): label is string => typeof label === "string",
        )
      : [];

    return [
      {
        observedOn:
          typeof row.observed_on === "string" ? row.observed_on : null,
        lessonTitle:
          typeof row.lesson_title === "string" ? row.lesson_title : null,
        domainLabels: labels,
      },
    ];
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return unavailable();
  }

  if (typeof body !== "object" || body === null) {
    return unavailable();
  }

  const { shareId, token } = body as { shareId?: unknown; token?: unknown };

  if (typeof shareId !== "string" || !UUID_PATTERN.test(shareId)) {
    return unavailable();
  }

  if (
    typeof token !== "string" ||
    token.length > MAX_TOKEN_LENGTH ||
    !SHARE_TOKEN_PATTERN.test(token)
  ) {
    return unavailable();
  }

  let rows: SharedReportRow[];

  try {
    const supabase = createPublicClient();

    // ★ 원본 token 을 그대로 넘긴다. 해시는 DB 함수 안에서만 만들어진다.
    //   token 은 여기서 어디에도 저장·기록되지 않고 이 호출과 함께 사라진다.
    const { data, error } = await supabase.rpc("read_shared_growth_report", {
      p_share_id: shareId,
      p_token: token,
    });

    if (error) {
      logFailure(`rpc:${error.code ?? "unknown"}`);
      return unavailable();
    }

    rows = (data ?? []) as unknown as SharedReportRow[];
  } catch {
    logFailure("rpc:threw");
    return unavailable();
  }

  const row = rows[0];

  // 0건이면 링크가 유효하지 않다는 뜻이다. 왜인지는 말하지 않는다.
  if (!row) return unavailable();

  // 완료 리포트는 세 칸이 모두 채워져 있다(11A의 CHECK 제약).
  // 그래도 방어적으로 확인한다 — 빈 문서를 부모에게 보내지 않는다.
  if (
    !row.organization_name ||
    !row.report_title ||
    !row.period_start ||
    !row.period_end ||
    !row.growth_changes ||
    !row.observation_summary ||
    !row.next_support
  ) {
    logFailure("incomplete payload");
    return unavailable();
  }

  return NextResponse.json<ParentShareResolveResponse>(
    {
      ok: true,
      report: {
        organizationName: row.organization_name,
        className: row.class_name,
        childName: row.child_name,
        title: row.report_title,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        completedAt: row.completed_at,
        growthChanges: row.growth_changes,
        observationSummary: row.observation_summary,
        nextSupport: row.next_support,
        activities: toActivities(row.activities),
      },
    },
    { status: 200, headers: SECURE_HEADERS },
  );
}
