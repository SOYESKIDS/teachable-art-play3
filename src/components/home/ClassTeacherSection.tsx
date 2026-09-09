import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  classMessage,
  classSteps,
  teacherSupportMessage,
  teacherSupportPhases,
} from "@/data/site-copy";

export function ClassTeacherSection() {
  return (
    <section
      id="program"
      className="scroll-mt-[calc(var(--header-height)_+_16px)] bg-ivory py-20 sm:py-24 lg:py-32"
    >
      <Container>
        <SectionHeader headline={classMessage.headline} subCopy={classMessage.sub} />

        {/*
          ★ 증거에서 장면으로.
            이 사진은 폭 768px 로 묶여 화면 가운데 작게 놓여 있었다.
            "실제로 운영되고 있다"는 사실은 이 페이지에서 가장 설득력 있는
            한 가지인데, 정작 가장 작게 보이고 있었다.
            폭 제한을 풀어 컨테이너를 다 쓰고, 넓은 화면에서는 21:9 로 넓혀
            띠처럼 지나가게 한다 — 실측 폭이 768px → 1200px 로 커진다.

          ★ 모바일에서는 다시 16:10 이다.
            좁은 화면에서 21:9 는 인물이 손톱만 해진다.
        */}
        <figure className="mt-14">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-navy/5 shadow-[var(--shadow-card)] sm:aspect-[2/1] lg:aspect-[21/9]">
            <Image
              src="/images/site/classroom/classroom-teacher-activity.webp"
              alt="담임교사 한 명이 교실 앞에서 동작을 시범 보이고 아이들이 뒤에서 따라 하는 실제 수업 장면"
              fill
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-[13px] font-medium text-navy/45">
            실제 수업 현장 — 담임교사 한 명이 운영합니다
          </figcaption>
        </figure>

        {/* A. 표준수업 흐름 (공개 기준: 주 1회 40~50분) */}
        <div className="mt-20">
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            <span className="text-4xl font-bold text-navy sm:text-5xl">
              50
              <span className="ml-1 text-lg font-bold text-navy/45 sm:text-xl">
                MIN
              </span>
            </span>
            <span className="text-sm font-medium text-navy/45 sm:text-base">
              주 1회 · 담임교사 1인
            </span>
          </div>

          <div
            role="img"
            aria-label="한 회차 수업 시간 구성(40~50분 기준): 마음 열기 5분, 주제 이해 10분, 창의 표현 활동 25분, 작품 나눔 5분, 촬영·업로드 5분"
            className="mt-6 flex h-4 w-full overflow-hidden rounded-full bg-navy/10 sm:h-5"
          >
            {classSteps.map((step) => (
              <div
                key={step.step}
                style={{ flexBasis: `${(step.minutes / 50) * 100}%` }}
                className={step.isCore ? "bg-yellow" : "bg-navy/25"}
              />
            ))}
          </div>

          <ol className="mt-8 flex flex-col gap-5 lg:flex-row lg:gap-0">
            {classSteps.map((step, index) => (
              <li
                key={step.step}
                style={{ flexBasis: `${(step.minutes / 50) * 100}%` }}
                className={`lg:px-3 ${index === 0 ? "lg:pl-0" : "lg:border-l lg:border-navy/10"}`}
              >
                <div
                  className={`h-full rounded-2xl border p-6 sm:p-7 ${
                    step.isCore
                      ? "border-yellow/40 bg-yellow/10"
                      : "border-navy/10 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-navy/40">
                    <span>{`STEP 0${step.step}`}</span>
                    <span className="rounded-full bg-navy/[0.06] px-2 py-0.5 text-navy/60">
                      {step.minutes}분
                    </span>
                  </div>
                  {/* 섹션 h2 바로 아래 단계이므로 h3 — h4로 두면 heading 단계가 h2 -> h4로 건너뛴다. (글자 크기는 className으로 지정하므로 표시는 동일) */}
                  <h3
                    className={`mt-2 font-bold text-navy ${
                      step.isCore ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy/60 sm:text-base">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* B. 교사 지원 (수업 전 · 중 · 후) */}
        <div className="mt-16">
          <h3 className="text-center text-xl font-bold text-navy sm:text-2xl">
            수업 전 · 중 · 후, 교사를 지원합니다
          </h3>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {teacherSupportPhases.map((phase) => (
              <Card key={phase.id} variant="basic" className="flex flex-col gap-5 p-8">
                <span className="inline-flex w-fit items-center rounded-full bg-navy/[0.06] px-3 py-1 text-[11px] font-bold tracking-wide text-navy/60">
                  {phase.label}
                </span>
                <h4 className="text-xl font-bold text-navy sm:text-2xl">{phase.title}</h4>
                <ul className="flex flex-col gap-2 text-base text-navy/70">
                  {phase.items.map((item) => (
                    <li
                      key={item.text}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                        item.highlight ? "bg-yellow/15 font-semibold text-navy" : ""
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          item.highlight ? "bg-yellow" : "bg-navy/25"
                        }`}
                      />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-center text-2xl font-bold leading-relaxed text-navy sm:text-3xl">
          {teacherSupportMessage}
        </p>
      </Container>
    </section>
  );
}
