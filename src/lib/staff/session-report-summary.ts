import type { StaffAttendanceChild } from "@/types/staff-attendance";
import type { StaffObservationChild } from "@/types/staff-observation";

export function summarizeReportAttendance(children: readonly Pick<StaffAttendanceChild, "isCurrentClassMember" | "attendanceStatus">[]) {
  const roster = children.filter(child => child.isCurrentClassMember);
  const count = (status: StaffAttendanceChild["attendanceStatus"]) => roster.filter(child => child.attendanceStatus === status).length;
  const onTimeCount = count("present");
  const lateCount = count("late");
  const leftEarlyCount = count("left_early");
  const absentCount = count("absent");
  const unrecordedCount = count(null);
  return {
    recorded: roster.length > unrecordedCount,
    rosterCount: roster.length,
    presentCount: onTimeCount + lateCount + leftEarlyCount,
    lateCount,
    leftEarlyCount,
    absentCount,
    unrecordedCount,
    historicalRecordedCount: children.filter(child => !child.isCurrentClassMember && child.attendanceStatus !== null).length,
  };
}

export function summarizeReportObservations(children: readonly Pick<StaffObservationChild, "isCurrentClassMember" | "hasExistingObservation" | "recordStatus">[]) {
  const roster = children.filter(child => child.isCurrentClassMember);
  const recordedCount = roster.filter(child => child.hasExistingObservation).length;
  return {
    rosterCount: roster.length,
    recordedCount,
    completeCount: roster.filter(child => child.hasExistingObservation && child.recordStatus === "complete").length,
    draftCount: roster.filter(child => child.hasExistingObservation && child.recordStatus === "draft").length,
    unrecordedCount: roster.length - recordedCount,
    historicalRecordedCount: children.filter(child => !child.isCurrentClassMember && child.hasExistingObservation).length,
  };
}
