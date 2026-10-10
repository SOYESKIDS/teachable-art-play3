import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLeadSubmissionPayload, validateLeadForm } from "../src/lib/validation/leadForm.ts";

const valid = () => ({ institutionName: " TEST 기관 ", contactName: " 담당자 ", position: "", phone: " 010-1234-5678 ", email: "", childCount: "", classCount: "", packageCode: "", message: "", privacyAgreed: true, marketingAgreed: false, website: "" });

test("상품별 상담은 세 상품과 미정 선택을 보존한다", () => {
  for (const packageCode of ["starter", "standard", "premium", "undecided"]) {
    const values = { ...valid(), packageCode };
    assert.deepEqual(validateLeadForm(values), {});
    assert.equal(buildLeadSubmissionPayload("consult", values).package_code, packageCode);
    assert.equal(buildLeadSubmissionPayload("purchase_interest", values).package_code, packageCode);
  }
});

test("일반 상담에는 이전 상품이 없으며 파일럿·시연은 정규 상품과 구분된다", () => {
  assert.equal(buildLeadSubmissionPayload("consult", valid()).package_code, null);
  for (const type of ["pilot", "demo"]) {
    assert.equal(buildLeadSubmissionPayload(type, { ...valid(), packageCode: "premium" }).package_code, null);
  }
});

test("DB 열 권한에 맞는 12개 필드만 전송하고 운영 상태·식별자를 클라이언트가 덮지 않는다", () => {
  const payload = buildLeadSubmissionPayload("consult", { ...valid(), id: "override", status: "closed", source: "override", created_at: "override" });
  assert.deepEqual(Object.keys(payload).sort(), ["submission_type", "institution_name", "contact_name", "position", "phone", "email", "child_count", "class_count", "package_code", "message", "privacy_agreed", "marketing_agreed"].sort());
  assert.equal(payload.institution_name, "TEST 기관");
  assert.equal(payload.email, null);
  assert.equal(payload.marketing_agreed, false);
});

test("소수·음수·범위 초과·무한대 원아 수와 반 수는 저장 전에 거부한다", () => {
  for (const field of ["childCount", "classCount"]) {
    for (const value of ["1.5", "-1", "2147483648", "Infinity", "abc"]) {
      const values = { ...valid(), [field]: value };
      assert.ok(validateLeadForm(values)[field]);
      const payload = buildLeadSubmissionPayload("consult", values);
      assert.equal(payload[field === "childCount" ? "child_count" : "class_count"], null);
    }
  }
});

test("0과 정수 인원은 그대로 보존하고 빈 선택 항목은 null이다", () => {
  assert.deepEqual(validateLeadForm({ ...valid(), childCount: "0", classCount: "3" }), {});
  const payload = buildLeadSubmissionPayload("consult", { ...valid(), childCount: "0", classCount: "3" });
  assert.equal(payload.child_count, 0);
  assert.equal(payload.class_count, 3);
});

test("알 수 없는 상품은 거부하고 필수 동의와 선택 수신 동의를 구분한다", () => {
  assert.ok(validateLeadForm({ ...valid(), packageCode: "unknown" }).packageCode);
  assert.ok(validateLeadForm({ ...valid(), privacyAgreed: false }).privacyAgreed);
  assert.deepEqual(validateLeadForm({ ...valid(), marketingAgreed: false }), {});
});

test("이메일 형식과 문의 길이를 검사한다", () => {
  assert.ok(validateLeadForm({ ...valid(), email: "invalid" }).email);
  assert.ok(validateLeadForm({ ...valid(), message: "가".repeat(2001) }).message);
});
