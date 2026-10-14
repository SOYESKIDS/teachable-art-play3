import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth/organization";
import { learningProgram } from "@/lib/learning/program-entry";
import { StaffWeekPage } from "@/components/weeks/StaffWeekPage";

export const metadata: Metadata = { title: "프로그램 주차 수업 | TeachAble Art Play", robots: { index: false, follow: false } };

export default async function ProgramWeekPage({ params, searchParams }: {
  params: Promise<{ program: string; weekNo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const path = await params;
  const program = learningProgram(path.program);
  const weekNo = Number(path.weekNo);
  if (!program || !Number.isInteger(weekNo) || weekNo < 1 || weekNo > program.durationWeeks) notFound();
  const session = await requireOrganizationRole(["director", "teacher"], "learning");
  return <StaffWeekPage params={Promise.resolve({ weekNo: path.weekNo })} searchParams={searchParams}
    context={{ session, program: program.id, maxWeek: program.durationWeeks }} />;
}
