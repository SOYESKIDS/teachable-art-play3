import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeReportAttendance, summarizeReportObservations } from "../src/lib/staff/session-report-summary.ts";

test("지각·조퇴는 참여에 포함하고 결석으로 집계하지 않는다", () => {
  const summary = summarizeReportAttendance(["present", "late", "left_early", "absent", null].map(attendanceStatus => ({ isCurrentClassMember: true, attendanceStatus })));
  assert.equal(summary.presentCount, 3);
  assert.equal(summary.absentCount, 1);
  assert.equal(summary.lateCount, 1);
  assert.equal(summary.leftEarlyCount, 1);
  assert.equal(summary.unrecordedCount, 1);
  assert.equal(summary.presentCount + summary.absentCount + summary.unrecordedCount, summary.rosterCount);
});
test("전원 결석과 출결 미입력, 현재 명단 없음은 서로 다르다", () => {
  const rows = status => [{ isCurrentClassMember: true, attendanceStatus: status }];
  assert.equal(summarizeReportAttendance(rows("absent")).recorded, true);
  assert.equal(summarizeReportAttendance(rows(null)).recorded, false);
  assert.equal(summarizeReportAttendance([]).recorded, false);
});
test("이동한 원아의 기존 출결은 현재 명단에 합치지 않고 별도 건수로 보존한다", () => {
  const summary = summarizeReportAttendance([{ isCurrentClassMember: true, attendanceStatus: "present" }, { isCurrentClassMember: false, attendanceStatus: "late" }]);
  assert.equal(summary.rosterCount, 1);
  assert.equal(summary.presentCount, 1);
  assert.equal(summary.historicalRecordedCount, 1);
});
test("관찰 초안을 작성 완료로 세지 않고 원아 이동 후 남은 기록도 구분한다", () => {
  const summary = summarizeReportObservations([
    { isCurrentClassMember: true, hasExistingObservation: true, recordStatus: "complete" },
    { isCurrentClassMember: true, hasExistingObservation: true, recordStatus: "draft" },
    { isCurrentClassMember: true, hasExistingObservation: false, recordStatus: null },
    { isCurrentClassMember: false, hasExistingObservation: true, recordStatus: "complete" },
  ]);
  assert.equal(summary.recordedCount, 2);
  assert.equal(summary.completeCount, 1);
  assert.equal(summary.draftCount, 1);
  assert.equal(summary.unrecordedCount, 1);
  assert.equal(summary.historicalRecordedCount, 1);
});
