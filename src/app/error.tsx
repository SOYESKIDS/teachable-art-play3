"use client";

import { ServiceErrorFallback } from "@/components/ui/ServiceErrorFallback";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ServiceErrorFallback retry={retry} />;
}
