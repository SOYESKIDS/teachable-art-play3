"use client";

import { ServiceErrorFallback } from "@/components/ui/ServiceErrorFallback";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ko">
      <head><title>일시적인 오류 | TeachAble Art Play</title><meta name="robots" content="noindex, nofollow" /></head>
      <body style={{ margin: 0 }}><ServiceErrorFallback retry={retry} /></body>
    </html>
  );
}
