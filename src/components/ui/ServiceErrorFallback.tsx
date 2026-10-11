import { contactInfo } from "@/data/site-copy";

/** 루트 레이아웃 오류에서도 표시되도록 전역 CSS나 Provider에 의존하지 않는다. */
export function ServiceErrorFallback({ retry }: { retry: () => void }) {
  const actionStyle = { minHeight: 44, padding: "12px 20px", borderRadius: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", font: "inherit" };
  return (
    <main style={{ minHeight: "70vh", padding: "64px 24px", background: "#faf7f1", color: "#172e45", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontWeight: 700 }}>TeachAble Art Play</p>
        <h1 style={{ fontSize: 28, marginTop: 32 }}>화면을 불러오지 못했습니다</h1>
        <p style={{ marginTop: 16, lineHeight: 1.7 }}>일시적인 문제일 수 있습니다. 다시 시도하거나 홈으로 이동해 주세요.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <button type="button" onClick={retry} style={{ ...actionStyle, border: 0, background: "#172e45", color: "white", cursor: "pointer" }}>다시 시도</button>
          {/* 루트 레이아웃 오류에서는 클라이언트 라우터 대신 문서 전체를 다시 요청한다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ ...actionStyle, border: "1px solid #172e45", color: "inherit" }}>홈으로 이동</a>
        </div>
        <p style={{ marginTop: 24, lineHeight: 1.7 }}>계속 문제가 생기면 <a href={`tel:${contactInfo.phone.replace(/[^\d+]/g, "")}`} style={{ color: "inherit" }}>{contactInfo.phone}</a> 또는 <a href={`mailto:${contactInfo.email}`} style={{ color: "inherit", overflowWrap: "anywhere" }}>{contactInfo.email}</a>로 문의해 주세요.</p>
      </div>
    </main>
  );
}
