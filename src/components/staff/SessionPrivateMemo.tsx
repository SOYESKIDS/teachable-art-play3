import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchClassEntitlements } from "@/lib/entitlement/queries";
import { QuickMemoPanel } from "@/components/class-mode/QuickMemoPanel";

/** This is the author's existing private memo, never an institution report or parent content. */
export async function SessionPrivateMemo({ supabase, sessionId, classId, organizationId, userId, status }: {
  supabase: SupabaseClient;
  sessionId: string;
  classId: string;
  organizationId: string;
  userId: string;
  status: string;
}) {
  const [result, entitlement] = await Promise.all([
    supabase.from("quick_memos").select("body, updated_at")
      .eq("organization_id", organizationId).eq("class_session_id", sessionId)
      .eq("author_user_id", userId).maybeSingle(),
    fetchClassEntitlements(supabase, classId),
  ]);
  if (result.error) return <p className="mt-3 text-[15px] text-danger" role="status">내 메모를 불러오지 못했습니다. 새로 입력하기 전에 다시 확인해 주세요.</p>;
  const memo = result.data as { body: string; updated_at: string } | null;
  const canWrite = entitlement.classModeWrite && (status === "in_progress" || status === "completed");
  if (canWrite) return <div className="mt-3"><QuickMemoPanel key={sessionId} sessionId={sessionId}
    initialBody={memo?.body ?? ""} initialUpdatedAt={memo?.updated_at ?? null} /></div>;
  return <div className="mt-3 text-[15px] leading-relaxed text-forest">
    <p className="whitespace-pre-wrap">{memo?.body ?? "저장된 내 메모가 없습니다."}</p>
    <p className="mt-2 text-[14px] text-muted-ink">현재는 메모를 확인만 할 수 있습니다. 내 메모는 원장·학부모·AI에 자동으로 전달되지 않습니다.</p>
  </div>;
}
