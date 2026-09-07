import type { CompanyField, LegalBlock, LegalDocument } from "@/data/legal";

/**
 * 법적 고지 문서를 그리는 공통 화면.
 *
 * ★ 새 디자인 시스템을 만들지 않는다.
 *   Design System V2 의 색·타입 스케일·선 토큰을 그대로 쓴다.
 *   다만 마케팅 화면의 장치(큰 사진 · CTA · 강조 카드)는 쓰지 않는다 —
 *   법적 문서는 팔러 온 화면이 아니라 읽으러 온 화면이다.
 *
 * ★ 본문 폭을 좁게 묶는다.
 *   마케팅 컨테이너(1280px)를 그대로 쓰면 한 줄이 100자를 넘어 읽기 어렵다.
 *   860px 이면 16px 본문 기준 한 줄이 45자 안팎이 된다.
 *
 * ★ 값이 없는 항목은 그리지 않는다.
 *   회사 정보나 보호책임자 표에서 아직 확인되지 않은 칸은 빈 문자열로 두고,
 *   여기서 걸러 낸다. 화면에 "미정" 같은 자리표시가 남지 않는다.
 */
export function LegalDocumentView({
  document,
  officer,
  company,
}: {
  document: LegalDocument;
  /** 개인정보 보호 담당부서 표. id "officer" 섹션 안에 그린다. */
  officer?: CompanyField[];
  /** 문서 끝에 붙는 사업자 정보 */
  company?: CompanyField[];
}) {
  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto w-full max-w-[860px] px-5 py-14 sm:px-8 sm:py-20">
        <header className="border-b border-line pb-8">
          <p className="eyebrow text-trust-blue">LEGAL</p>
          <h1 className="mt-3 text-h1 font-bold text-navy">{document.title}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-navy/60">
            {document.description}
          </p>
          <p className="mt-5 text-[13px] tabular-nums text-navy/45">
            시행일 {document.effectiveDate} · {document.revision}
          </p>
        </header>

        <p className="mt-10 text-[16px] leading-[1.9] text-navy/80">
          {document.intro}
        </p>

        <div className="mt-4">
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="mt-12 scroll-mt-[calc(var(--header-height)_+_16px)]"
            >
              <h2 className="text-[19px] font-bold leading-snug text-navy sm:text-[21px]">
                {section.title}
              </h2>

              <div className="mt-4 flex flex-col gap-4">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}

                {/* 보호책임자 표는 해당 섹션 안에서만 나온다 */}
                {officer && section.id === "officer" ? (
                  <FieldTable fields={officer} />
                ) : null}
              </div>
            </section>
          ))}
        </div>

        {company ? (
          <section className="mt-16 border-t border-line pt-10">
            <h2 className="text-[19px] font-bold text-navy">사업자 정보</h2>
            <div className="mt-4">
              <FieldTable fields={company} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.text) {
    return (
      <p className="text-[16px] leading-[1.9] text-navy/75">{block.text}</p>
    );
  }

  if (block.items) {
    return (
      <ul className="flex flex-col gap-2.5">
        {block.items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-[16px] leading-[1.85] text-navy/75"
          >
            <span
              aria-hidden="true"
              className="mt-[13px] h-1 w-1 shrink-0 rounded-full bg-navy/30"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.rows) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[15px]">
          <tbody>
            {block.rows.map(([label, value]) => (
              <tr key={label} className="border-b border-line-soft align-top">
                <th
                  scope="row"
                  className="w-[30%] min-w-[110px] py-3 pr-4 font-semibold text-navy"
                >
                  {label}
                </th>
                <td className="py-3 leading-[1.8] text-navy/75">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

/** 값이 채워진 항목만 그린다. 빈 칸은 아예 나오지 않는다. */
function FieldTable({ fields }: { fields: CompanyField[] }) {
  const filled = fields.filter((field) => field.value.trim().length > 0);
  if (filled.length === 0) return null;

  return (
    <table className="w-full border-collapse text-left text-[15px]">
      <tbody>
        {filled.map((field) => (
          <tr key={field.label} className="border-b border-line-soft align-top">
            <th
              scope="row"
              className="w-[30%] min-w-[110px] py-3 pr-4 font-semibold text-navy"
            >
              {field.label}
            </th>
            <td className="py-3 text-navy/75">{field.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
