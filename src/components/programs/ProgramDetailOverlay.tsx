"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import {
  consultLabel,
  programPath,
  PROGRAM_PRODUCTS,
  type ProgramSlug,
} from "@/data/program-products";
import { ProductDetail } from "./ProductDetail";

/**
 * 홈페이지 가격 카드에서 열리는 상품 상세 오버레이.
 *
 * ★ 주소는 페이지, 화면은 오버레이.
 *   열 때 history.pushState 로 /programs/<slug> 를 주소창에 세운다.
 *   그래서 그 상태에서 주소를 복사해 보내면 상대는 진짜 상세 페이지를 받는다
 *   (그 경로에 실제 page.tsx 가 있다).
 *
 * ★ intercepting route 를 쓰지 않은 이유
 *   Next 의 parallel/intercepting route 로 만들려면 root layout 에 @modal
 *   슬롯을 열어야 하는데, 이 프로젝트의 root layout 은 /admin · /director ·
 *   /teacher · /share 까지 30여 개 route 가 함께 쓴다. 마케팅 화면 하나를
 *   위해 로그인 · 권한 화면 전부가 지나는 층을 건드리는 것은 이득보다
 *   위험이 크다. 그래서 같은 ProductDetail 을 오버레이와 실제 페이지가
 *   함께 쓰는 쪽을 택했다 — 내용은 한 벌이고, route 구조는 그대로다.
 *
 * ★ 닫기는 언제나 history.back() 이다.
 *   pushState 로 만든 항목을 그대로 되돌려 놓아야 방문기록이 깨끗하다.
 *   사용자가 브라우저 뒤로가기를 직접 눌렀을 때도 같은 자리로 도착한다.
 *
 * ★ 포커스를 잃어버리지 않는다.
 *   열면 닫기 버튼으로, 닫으면 눌렀던 카드로 되돌린다.
 *   키보드만 쓰는 사람이 오버레이를 닫은 뒤 목록의 처음으로 튕겨 나가면
 *   상품 세 개를 다시 지나와야 한다.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ProgramDetailOverlay({
  slug,
  onClose,
  returnFocusTo,
}: {
  slug: ProgramSlug;
  onClose: () => void;
  /** 오버레이를 연 카드의 버튼. 닫을 때 여기로 포커스를 돌려준다. */
  returnFocusTo: HTMLElement | null;
}) {
  const product = PROGRAM_PRODUCTS[slug];
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /** 열면서 만든 history 항목을 우리가 직접 되돌려야 하는가 */
  const pushedRef = useRef(false);

  /* ── 주소창에 상세 경로를 세운다 ─────────────────────────────── */
  useEffect(() => {
    try {
      // history.state 를 그대로 넘긴다 — Next App Router 가 자기 라우팅 상태를
      // 여기에 보관한다. null 로 덮으면 이후 클라이언트 이동이 깨진다.
      window.history.pushState(window.history.state, "", programPath(slug));
      pushedRef.current = true;
    } catch {
      // pushState 가 막힌 환경에서는 주소만 그대로 남는다.
      // 오버레이 동작 자체는 영향을 받지 않는다.
    }

    const handlePopState = () => {
      // 사용자가 뒤로가기를 눌렀다. 우리가 되돌릴 항목은 이미 사라졌다.
      pushedRef.current = false;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [slug, onClose]);

  /* ── 닫기 ────────────────────────────────────────────────────── */
  const requestClose = useCallback(() => {
    // 화면을 먼저 닫는다. 뒤이어 도착하는 popstate 는 할 일이 없다.
    onClose();

    if (pushedRef.current) {
      pushedRef.current = false;
      try {
        window.history.back();
      } catch {
        /* 되돌리지 못해도 화면은 이미 닫혔다 */
      }
    }
  }, [onClose]);

  /* ── 뒤 화면이 따라 스크롤되지 않게 한다 ─────────────────────── */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* ── 포커스: 열면 닫기 버튼으로, 닫으면 눌렀던 카드로 ────────── */
  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => {
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  /* ── 상담으로 가기 ──────────────────────────────────────────── */
  /*
    오버레이를 띄운 채로 상담 단락까지 스크롤하면 그 단락이 오버레이에
    가려 보이지 않는다. 그래서 먼저 닫고, 주소가 되돌아온 뒤에 옮긴다.
    requestClose() 의 history.back() 은 비동기라 그 왕복이 끝날 시간을 준다.
    이 콜백은 DOM 만 만지므로 컴포넌트가 사라진 뒤에 실행돼도 안전하다.
  */
  const goToConsult = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    requestClose();

    window.setTimeout(() => {
      document
        .getElementById("contact")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  /* ── ESC 로 닫고, Tab 은 오버레이 안에서만 돈다 ──────────────── */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const items = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null);

    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    // 끝에서 한 번 더 누르면 처음으로 돌아온다 — 오버레이 밖으로 나가지 않는다.
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex sm:items-center sm:justify-center sm:p-6"
      onKeyDown={handleKeyDown}
    >
      {/* 뒤 화면을 눌러도 닫힌다. 화면 읽기 도구에는 잡히지 않는다. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={requestClose}
        className="absolute inset-0 cursor-default bg-navy/50 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-overlay-title"
        /*
          모바일에서는 화면을 가득 채운다. 작은 화면에서 가운데 뜬 상자는
          내용은 좁고 배경만 넓어 읽기가 더 어렵다.
        */
        className="relative flex h-dvh w-full flex-col bg-ivory sm:h-auto sm:max-h-[90dvh] sm:max-w-[1200px] sm:rounded-2xl sm:shadow-[var(--shadow-elevated)]"
      >
        {/* ── 상단 고정 줄 ───────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-navy/10 bg-ivory/95 px-4 py-3 backdrop-blur sm:rounded-t-2xl sm:px-6">
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            <span aria-hidden="true">←</span>
            상품 비교
          </button>

          <p
            id="program-overlay-title"
            className="min-w-0 truncate text-[14px] font-bold text-navy"
          >
            {product.pkg.name}
            <span className="ml-1.5 font-medium text-navy/50">
              {product.pkg.subtitle}
            </span>
          </p>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            <span className="sr-only">상품 상세 닫기</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        {/* ── 본문 (오버레이 안에서만 스크롤) ────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-[900px]">
            <ProductDetail product={product} variant="overlay" />
          </div>
        </div>

        {/* ── 하단 고정 CTA ─────────────────────────────────────── */}
        <div className="shrink-0 border-t border-navy/10 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:rounded-b-2xl sm:px-6 sm:pb-3">
          <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-[13px] text-navy/60">
              <span className="font-bold text-navy">
                {product.pkg.name} · {product.pkg.durationWeeks}주
              </span>
              <span className="ml-2 tabular-nums">
                {product.pkg.monthlyPriceKrw.toLocaleString("ko-KR")}원 / 월
              </span>
            </p>

            {/*
              상담으로만 이어진다. 결제도 mailto 도 없다 —
              공개 홈페이지의 기존 상담 단락(#contact)을 그대로 쓴다.
              href 를 그대로 두어 새 탭으로 열거나 주소를 복사하는 것도 된다.
            */}
            <Link
              href="/#contact"
              onClick={goToConsult}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-yellow px-6 text-[14px] font-bold text-navy transition-colors hover:bg-yellow/90 sm:flex-none"
            >
              {consultLabel(product)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
