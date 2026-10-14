export function LearningAccessNotice({ label, detail }: { label: string; detail: string }) {
  return (
    <section role="status" className="mt-5 rounded-2xl border border-warning-border bg-warning-soft p-5">
      <h2 className="text-[17px] font-bold text-warning-text">{label}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-warning-text">{detail}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-warning-text">
        프로그램 구성을 먼저 확인할 수 있습니다. 이용권 확인과 콘텐츠 발행이 끝나면 수업 내용을 열 수 있습니다.
      </p>
    </section>
  );
}
