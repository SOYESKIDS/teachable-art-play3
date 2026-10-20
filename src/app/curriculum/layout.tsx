import type { ReactNode } from "react";
import { SerifFontScope } from "@/fonts/serif";

/** 명조(font-serif)를 쓰는 화면이 있는 구역 — 명조 글꼴을 이 구역에서만 싣는다 (src/fonts/serif.tsx). */
export default function CurriculumFontLayout({ children }: { children: ReactNode }) {
  return <SerifFontScope>{children}</SerifFontScope>;
}
