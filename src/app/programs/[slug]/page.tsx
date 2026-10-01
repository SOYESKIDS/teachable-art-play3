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
  type ProgramSlug,
  type StarterWeekDetail,
} from "@/data/program-products";
import {
  feedsFinalForest,
  STARTER_JOURNEY_GROUPS,
  STARTER_WEEKS,
} from "@/lib/content/starter-journey";

/**
 * 상품 상세 페이지.
 *
 * ★ DB 를 읽지 않는다.
 *   상품 정보는 전부 src/data 의 정적 모듈에서 오고, STARTER 주차 상세는
 *   content/starter/2026.1/manifest.json (src/lib/content/starter-journey.ts) 에서 온다.
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

      <main id="main" tabIndex={-1} className="flex-1 bg-ivory focus:outline-none">
        <div className="mx-auto w-full max-w-[960px] px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="이동 경로">
            <Link
              href="/#pricing"
              className="inline-flex min-h-11 items-center gap-1.5 text-caption font-semibold text-ink-muted transition-colors hover:text-navy"
            >
              <span aria-hidden="true">←</span>
              상품 비교로 돌아가기
            </Link>
          </nav>

          <div className="mt-4">
            <ProductDetail
              product={product}
              variant="page"
              weekDetails={weekDetailsFor(slug)}
            />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

/**
 * 주차 상세 — 원본(STARTER_WEEKS)에서 화면에 필요한 필드만 골라 넘긴다.
 * 이 페이지는 서버 컴포넌트라 manifest 를 읽어도 브라우저 번들에 들어가지 않는다.
 */
function weekDetailsFor(slug: ProgramSlug): StarterWeekDetail[] | undefined {
  if (slug !== "starter") return undefined;
  assertStarterCopyMatchesManifest();
  return STARTER_WEEKS.map((w) => ({
    week: w.week,
    storybook: w.storybook,
    coverMessage: w.coverMessage || null,
    duration: w.duration,
    objective: w.objective,
    physicalActivity: w.physicalActivity,
    artActivity: w.artActivity,
    kit: w.kit,
    workbook: w.workbook,
    materials: w.materials,
    nuriAreas: w.nuriAreas,
    observationFocus: w.observationFocus,
    familyConnection: w.familyConnection,
    crossWeek: w.crossWeek,
  }));
}

/**
 * program-products.ts 의 STARTER 목록 사본(클라이언트 화면용)이 원본과 같은지 확인한다.
 * 어긋난 채 배포되지 않도록 빌드(정적 생성) 시점에 멈춘다.
 */
function assertStarterCopyMatchesManifest() {
  const copy = PROGRAM_PRODUCTS.starter.curriculum;
  const problems: string[] = [];
  if (!copy) problems.push("curriculum 없음");
  for (const source of STARTER_WEEKS) {
    const tag = `W${source.week}`;
    const w = copy?.weeks.find((x) => x.week === source.week);
    if (!w) {
      problems.push(`${tag} 없음`);
      continue;
    }
    if (w.storyTitle !== source.title) problems.push(`${tag} title`);
    if (w.topic !== source.theme) problems.push(`${tag} theme`);
    if (
      w.growthKeyword !== source.growthKeyword ||
      w.growthPoint !== source.growthKeyword
    )
      problems.push(`${tag} growth_keyword`);
    if (w.coreMessage !== source.coreMessage) problems.push(`${tag} core_message`);
    if (Boolean(w.feedsForest) !== feedsFinalForest(source))
      problems.push(`${tag} cross_week(W8)`);
  }
  for (const group of STARTER_JOURNEY_GROUPS) {
    const g = copy?.groups?.find((x) => x.key === group.key);
    if (
      !g ||
      g.label !== group.label ||
      g.summary !== group.summary ||
      g.weeks.join() !== group.weeks.join()
    )
      problems.push(`group ${group.key}`);
  }
  if (problems.length > 0) {
    throw new Error(
      `program-products.ts STARTER 사본이 manifest 와 다릅니다: ${problems.join(", ")}`,
    );
  }
}
