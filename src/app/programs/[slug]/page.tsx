import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductDetail } from "@/components/programs/ProductDetail";
import {
  isProgramSlug,
  PROGRAM_PRODUCTS,
  PROGRAM_SLUGS,
} from "@/data/program-products";

/**
 * 상품 상세 페이지.
 *
 * ★ DB 를 읽지 않는다.
 *   상품 정보는 전부 src/data 의 정적 모듈에서 온다.
 *   Supabase client 도, 세션도, 비밀값도 필요 없다.
 *   공개 상품 소개에 데이터베이스를 끌어들일 이유가 없다.
 *
 * ★ slug 는 화이트리스트로만 받는다.
 *   목록에 없는 값은 notFound() 다. 사용자가 주소에 무엇을 적든
 *   우리가 아는 세 상품 말고는 아무것도 그리지 않는다.
 *
 * ★ 오버레이와 같은 것을 그린다.
 *   홈페이지 카드에서 열리는 오버레이도 ProductDetail 을 쓴다.
 *   이 페이지는 그것을 Header/Footer 로 감싼 독립 문서일 뿐이다 —
 *   영업 담당자가 이 주소를 그대로 보낼 수 있어야 하기 때문이다.
 */

interface ProgramPageProps {
  params: Promise<{ slug: string }>;
}

/** 세 상품뿐이므로 빌드 시점에 전부 만들어 둔다. */
export function generateStaticParams() {
  return PROGRAM_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProgramPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isProgramSlug(slug)) return {};

  const product = PROGRAM_PRODUCTS[slug];

  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: { canonical: `/programs/${slug}` },
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      url: `/programs/${slug}`,
    },
  };
}

export default async function ProgramDetailPage({ params }: ProgramPageProps) {
  const { slug } = await params;

  if (!isProgramSlug(slug)) notFound();

  const product = PROGRAM_PRODUCTS[slug];

  return (
    <>
      <Header />

      <main className="flex-1 bg-ivory">
        <div className="mx-auto w-full max-w-[960px] px-5 py-8 sm:px-8 sm:py-12">
          <nav aria-label="이동 경로">
            <Link
              href="/#pricing"
              className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-navy/55 transition-colors hover:text-navy"
            >
              <span aria-hidden="true">←</span>
              상품 비교로 돌아가기
            </Link>
          </nav>

          <div className="mt-4">
            <ProductDetail product={product} variant="page" />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
