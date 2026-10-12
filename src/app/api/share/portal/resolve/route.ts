import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { registerPortalAccess } from "@/lib/share/portal-throttle";
import {
  PORTAL_TOKEN_PATTERN,
  type ChildPortalResolveResponse,
  type PortalWeekly,
} from "@/types/child-portal";

/**
 * 학부모 "아이 기록" 조회 (DEC-092 · DEC-103).
 *
 * · anon 은 read_child_portal RPC 만 쓴다 (테이블 직접 SELECT 없음)
 * · 실패 원인(무효 · 중지 · 만료 · 숨김 · 계약 제한)을 구분하지 않는다 → 항상 { ok: false }
 * · token 을 로그에 남기지 않는다
 * · 공개 조회 rate limit 은 DB(portal_access_throttle)로 전역 제한한다 — 실행 묶음 C3.
 *   **제한 장치가 미적용·미설정이면 제공하지 않는다 (fail-closed).**
 *   사유는 서버 로그에만 남기고 응답은 다른 실패와 같다.
 * · 접근 정책(무기한 legacy 링크 허용 여부)은 read_child_portal_guarded 가 판정한다.
 *   그 함수가 없으면(migration 미적용) 역시 제공하지 않는다.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SECURE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "X-Content-Type-Options": "nosniff",
} as const;

function unavailable() {
  return NextResponse.json<ChildPortalResolveResponse>({ ok: false }, { status: 200, headers: SECURE_HEADERS });
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function toWeekly(raw: unknown): PortalWeekly | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const content = (typeof row.content === "object" && row.content !== null ? row.content : {}) as Record<string, unknown>;
  if (typeof row.week_no !== "number") return null;

  return {
    weekNo: row.week_no,
    dateFrom: str(row.date_from),
    dateTo: str(row.date_to),
    updatedOn: str(row.updated_on),
    content: {
      topic: str(content.topic),
      quoteChoice: str(content.quote_choice),
      teacherObservation: str(content.teacher_observation),
      familyConversation: str(content.family_conversation),
      nextWeekPreview: str(content.next_week_preview),
    },
    observedMoments: Array.isArray(row.observed_moments)
      ? row.observed_moments.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function toWeeklyList(raw: unknown): PortalWeekly[] {
  return Array.isArray(raw) ? raw.map(toWeekly).filter((item): item is PortalWeekly => item !== null) : [];
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unavailable();
  }

  const { portalId, token } = (typeof body === "object" && body !== null ? body : {}) as {
    portalId?: unknown;
    token?: unknown;
  };

  if (typeof portalId !== "string" || !UUID_PATTERN.test(portalId)) return unavailable();
  if (typeof token !== "string" || !PORTAL_TOKEN_PATTERN.test(token)) return unavailable();

  try {
    const supabase = createPublicClient();

    /**
     * ★ 실행 묶음 C3 — 조회 1회를 기록하고 허용 여부를 받는다.
     *   token·IP 원문을 넘기지 않는다 (서버 salt 로 해시한 키만 전달).
     *   제한 초과도 다른 실패와 같은 응답을 쓴다 — 어느 쪽인지 알려 주지 않는다.
     */
    const throttle = await registerPortalAccess(supabase, request, "portal_resolve");
    if (!throttle.allowed) {
      if (throttle.degraded) {
        // 보안 설정·migration 이 빠져 제한을 걸 수 없다. 사유는 로그에만 남긴다.
        console.error(`[share/portal] blocked, throttle unavailable: ${throttle.reason}`);
      }
      return unavailable();
    }

    /**
     * ★ 정책 게이트를 지난 wrapper 를 쓴다.
     *   무기한 legacy 링크를 제공할지는 portal_access_policy 가 정하고,
     *   토큰·중지·만료·계약 범위·숨김 판정은 기존 read_child_portal 이 한다.
     *   wrapper 가 없으면(migration 미적용) 아래 error 분기에서 제공하지 않는다.
     */
    const { data, error } = await supabase.rpc("read_child_portal_guarded", { p_public_id: portalId, p_token: token });

    if (error) {
      console.error(`[share/portal] resolve failed: code=${error.code ?? "unknown"}`);
      return unavailable();
    }

    if (typeof data !== "object" || data === null) return unavailable();
    const row = data as Record<string, unknown>;
    const organizationName = str(row.organization_name);
    const childName = str(row.child_name);
    if (!organizationName || !childName) return unavailable();

    return NextResponse.json<ChildPortalResolveResponse>(
      {
        ok: true,
        portal: {
          organizationName,
          className: str(row.class_name),
          childName,
          thisWeek: toWeeklyList(row.this_week),
          past: toWeeklyList(row.past),
        },
      },
      { status: 200, headers: SECURE_HEADERS },
    );
  } catch {
    console.error("[share/portal] resolve failed: threw");
    return unavailable();
  }
}
