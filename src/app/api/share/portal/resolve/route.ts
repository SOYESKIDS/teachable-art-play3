import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
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
 * · anon rate limit 은 AD-14 OPEN (IB-5)
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
    const { data, error } = await supabase.rpc("read_child_portal", { p_public_id: portalId, p_token: token });

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
