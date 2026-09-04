"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { parseBirthYear, parseEntityName } from "@/lib/admin/class-child";
import {
  BULK_CHILD_CHUNK_SIZE,
  BULK_CHILD_MAX_ERRORS,
  BULK_CHILD_MAX_ROWS,
  type BulkChildRowError,
  type BulkChildState,
} from "./onboarding-state";

/**
 * SERVICE-17 — 원아 일괄 등록.
 *
 * ★ 기존 createChildAction 을 대체하지 않는다.
 *   한 명씩 등록하는 기존 경로는 기관 상세 화면에 그대로 있다.
 *   이 함수는 도입 첫날 수십 명을 한 번에 넣기 위한 **추가 경로**이고,
 *   검증 규칙은 기존과 같은 helper(parseEntityName / parseBirthYear)를 그대로 쓴다.
 *
 * ★ 보안 원칙은 기존 admin action 과 동일하다.
 *   1. requireAdmin() 으로 시작한다.
 *   2. Client 가 보낸 id 는 UUID 형식부터 확인한다.
 *   3. ★ 반이 정말 이 기관 소속이고 운영 중인지 **서버가 다시 조회**한다.
 *      RLS 는 SOYES 운영자에게 모든 기관을 열어 주므로 다른 기관 class id 를
 *      끼워 넣는 조작은 RLS 가 막아 주지 않는다. 이 검증이 유일한 방어선이다.
 *   4. organization_id 는 폼 값이 아니라 그 반에서 다시 읽은 값을 쓴다.
 *   5. Secret Key 를 쓰지 않는다. 관리자 세션 client + RLS 만 쓴다.
 *
 * ★ 사용자에게 내부 오류를 보여 주지 않는다.
 *   Supabase 오류 원문 · SQLSTATE · 내부 UUID 는 화면에 나가지 않는다.
 *   실패는 "몇 번째 줄이 왜"까지만 알려 준다.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES = {
  invalidOrganization: "기관 정보를 확인할 수 없습니다.",
  invalidClass: "반을 선택해주세요.",
  classNotFound: "반 정보를 찾을 수 없습니다.",
  classNotInOrganization: "이 기관에 속한 반이 아닙니다.",
  archivedClass: "보관된 반에는 새로 등록할 수 없습니다. 운영 중인 반을 선택해주세요.",
  empty: "등록할 원아 이름을 한 줄에 한 명씩 입력해주세요.",
  tooMany: `한 번에 최대 ${BULK_CHILD_MAX_ROWS}명까지 등록할 수 있습니다. 나눠서 등록해주세요.`,
  saveFailure: "원아를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
  invalidName: "이름을 1~50자로 입력해주세요.",
  invalidBirthYear: "출생연도는 2000~2100 사이 숫자이거나 비어 있어야 합니다.",
} as const;

function logFailure(scope: string, message: string) {
  // 원인 파악에 필요한 최소한만 남긴다. 원아 이름은 로그에 넣지 않는다.
  console.error(`[admin/onboarding] ${scope} failed: ${message}`);
}

function fail(message: string): BulkChildState {
  return {
    phase: "error",
    message,
    createdCount: 0,
    failedCount: 0,
    errors: [],
  };
}

interface ParsedRow {
  line: number;
  name: string;
  birthYear: number | null;
}

/**
 * 입력 텍스트를 줄 단위로 읽는다.
 *
 * 한 줄에 "이름" 또는 "이름, 출생연도".
 * 빈 줄은 조용히 건너뛴다 — 붙여넣기에는 빈 줄이 섞이기 마련이다.
 */
function parseRows(raw: string): {
  rows: ParsedRow[];
  errors: BulkChildRowError[];
} {
  const rows: ParsedRow[] = [];
  const errors: BulkChildRowError[] = [];

  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (line === "") continue;

    const lineNo = i + 1;
    // 쉼표 또는 탭으로 나눈다(엑셀에서 붙여넣으면 탭이 온다).
    const parts = line.split(/[,\t]/);

    const name = parseEntityName(parts[0] ?? "");

    if (!name) {
      errors.push({ line: lineNo, input: line.slice(0, 40), reason: MESSAGES.invalidName });
      continue;
    }

    const birthYear = parseBirthYear(parts[1] ?? "");

    if (!birthYear.ok) {
      errors.push({
        line: lineNo,
        input: line.slice(0, 40),
        reason: MESSAGES.invalidBirthYear,
      });
      continue;
    }

    rows.push({ line: lineNo, name, birthYear: birthYear.value });
  }

  return { rows, errors };
}

/**
 * 원아 일괄 등록.
 *
 * formData:
 *   organizationId : 기관 id (서버가 반으로 다시 검증한다)
 *   class_id       : 배정할 반
 *   roster         : 줄바꿈으로 구분된 "이름" 또는 "이름, 출생연도"
 */
export async function createChildrenBulkAction(
  _prevState: BulkChildState,
  formData: FormData,
): Promise<BulkChildState> {
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!UUID_PATTERN.test(organizationId)) {
    return fail(MESSAGES.invalidOrganization);
  }

  const classId = String(formData.get("class_id") ?? "");

  if (!UUID_PATTERN.test(classId)) {
    return fail(MESSAGES.invalidClass);
  }

  const roster = String(formData.get("roster") ?? "");

  const { rows, errors } = parseRows(roster);

  if (rows.length === 0 && errors.length === 0) {
    return fail(MESSAGES.empty);
  }

  if (rows.length + errors.length > BULK_CHILD_MAX_ROWS) {
    return fail(MESSAGES.tooMany);
  }

  const { supabase } = await requireAdmin();

  // ★ 반을 서버에서 다시 읽는다. 폼이 보낸 organizationId 를 그대로 쓰지 않고
  //   이 반이 실제로 속한 기관 값을 저장에 사용한다.
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, organization_id, status")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    logFailure("class lookup", classError.message);
    return fail(MESSAGES.saveFailure);
  }

  if (!classRow) {
    return fail(MESSAGES.classNotFound);
  }

  const target = classRow as unknown as {
    id: string;
    organization_id: string;
    status: string;
  };

  if (target.organization_id !== organizationId) {
    return fail(MESSAGES.classNotInOrganization);
  }

  if (target.status !== "active") {
    return fail(MESSAGES.archivedClass);
  }

  // ★ 한 번에 다 넣지 않는다. 실패해도 어디까지 들어갔는지 알 수 있고,
  //   한 요청이 지나치게 커지지 않는다.
  let createdCount = 0;
  const rowErrors: BulkChildRowError[] = [...errors];

  for (let i = 0; i < rows.length; i += BULK_CHILD_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + BULK_CHILD_CHUNK_SIZE);

    const { error: insertError } = await supabase.from("children").insert(
      chunk.map((row) => ({
        organization_id: target.organization_id,
        class_id: target.id,
        name: row.name,
        birth_year: row.birthYear,
        status: "active",
      })),
    );

    if (!insertError) {
      createdCount += chunk.length;
      continue;
    }

    logFailure("bulk insert", insertError.message);

    // 묶음이 실패하면 그 안에서 어느 줄이 문제인지 한 줄씩 다시 넣어 가려낸다.
    for (const row of chunk) {
      const { error: rowError } = await supabase.from("children").insert({
        organization_id: target.organization_id,
        class_id: target.id,
        name: row.name,
        birth_year: row.birthYear,
        status: "active",
      });

      if (rowError) {
        logFailure("row insert", rowError.message);
        rowErrors.push({
          line: row.line,
          input: row.name,
          reason: MESSAGES.saveFailure,
        });
        continue;
      }

      createdCount += 1;
    }
  }

  refresh();

  const failedCount = rowErrors.length;

  if (createdCount === 0) {
    return {
      phase: "error",
      message: `등록된 원아가 없습니다. ${failedCount}줄을 확인해주세요.`,
      createdCount: 0,
      failedCount,
      errors: rowErrors.slice(0, BULK_CHILD_MAX_ERRORS),
    };
  }

  return {
    phase: failedCount > 0 ? "error" : "success",
    message:
      failedCount > 0
        ? `${createdCount}명을 등록했고 ${failedCount}줄은 등록하지 못했습니다.`
        : `${createdCount}명을 등록했습니다.`,
    createdCount,
    failedCount,
    errors: rowErrors.slice(0, BULK_CHILD_MAX_ERRORS),
  };
}
