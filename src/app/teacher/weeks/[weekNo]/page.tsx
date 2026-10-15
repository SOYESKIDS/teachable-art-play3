import type { Metadata } from "next";
import { StaffWeekPage } from "@/components/weeks/StaffWeekPage";

export const metadata: Metadata = {
  title: "주차 수업 | TeachAble Art Play",
  robots: { index: false, follow: false },
};

/** 기존 교사 주소도 동일한 서버 이용권·발행 검사를 거친다. */
export default function TeacherWeekPage({ params, searchParams }: {
  params: Promise<{ weekNo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StaffWeekPage params={params} searchParams={searchParams} />;
}
