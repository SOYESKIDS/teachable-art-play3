"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  inviteDirectorAction,
  inviteTeacherAction,
} from "../organizations/actions";
import {
  DIRECTOR_INVITE_INITIAL_STATE,
  TEACHER_INVITE_INITIAL_STATE,
} from "../organizations/invite-state";
import { createClassAction } from "../organizations/[id]/class-child-actions";
import { saveTeacherAssignmentsAction } from "../organizations/[id]/teacher-assignment-actions";
import { createClassProgramAssignmentAction } from "../organizations/[id]/class-program-actions";
import { CLASS_CHILD_FORM_INITIAL_STATE } from "../organizations/[id]/class-child-state";
import { createChildrenBulkAction } from "./onboarding-actions";
import {
  BULK_CHILD_INITIAL_STATE,
  BULK_CHILD_MAX_ROWS,
} from "./onboarding-state";
import type { OnboardingState } from "@/lib/admin/onboarding-queries";
import { SectionCard, StatusPill } from "@/components/ui/surface";

/**
 * SERVICE-17 — 새 기관 도입 흐름 (2~7단계).
 *
 * ★ 새 Server Action 을 만들지 않는다.
 *   원장 초대 · 교사 초대 · 반 생성 · 교사 배정 · 프로그램 배정은
 *   기관 상세 화면이 이미 쓰는 **바로 그 action** 을 그대로 호출한다.
 *   따라서 검증 · 권한 · 오류 문구가 두 화면에서 갈라지지 않는다.
 *   원아 일괄 등록만 새 action 이며, 검증 helper 는 기존 것을 재사용한다.
 *
 * ★ 거대한 트랜잭션으로 묶지 않는다.
 *   각 단계는 저장되는 즉시 독립적으로 완료된다. 4단계가 실패해도
 *   1~3단계에서 만든 기관 · 반은 그대로 남고, 나중에 이어서 설정할 수 있다.
 *
 * ★ 진행 상태를 따로 저장하지 않는다.
 *   "어디까지 했는가"는 서버가 실제 데이터에서 계산해 내려보낸 값이다.
 *   온보딩 전용 DB 표를 만들지 않았다.
 */

/**
 * 화면에 보이는 단계는 7개다.
 *
 * 1단계(기관)는 이 화면에 들어오기 전에 이미 끝나 있다 — 기관이 없으면
 * 이 흐름 자체가 열리지 않는다. 그래도 목록에서 빼지 않는다.
 * "1단계가 없는 2~7단계"는 사용자가 뭔가를 건너뛴 것처럼 느끼게 하고,
 * 안내 문서에 적힌 "7단계"와도 어긋난다.
 */
const STEPS = [
  { no: 2, label: "원장" },
  { no: 3, label: "반" },
  { no: 4, label: "교사" },
  { no: 5, label: "원아" },
  { no: 6, label: "프로그램" },
  { no: 7, label: "확인" },
] as const;

const TOTAL_STEPS = STEPS.length + 1;

export function OnboardingFlow({ state }: { state: OnboardingState }) {
  const done = {
    2: state.directors.length > 0,
    3: state.classes.some((c) => c.status === "active"),
    4: state.teachers.length > 0,
    5: state.childCount > 0,
    6: state.assignmentCount > 0,
    7: false,
  } as const;

  // 아직 끝나지 않은 첫 단계에서 시작한다. 전부 끝났으면 확인 단계.
  const firstPending = STEPS.find((s) => s.no !== 7 && !done[s.no])?.no ?? 7;

  // 1단계(기관)는 이 화면에 온 시점에 이미 끝나 있으므로 항상 센다.
  const doneCount =
    1 + STEPS.filter((s) => s.no !== 7 && done[s.no]).length;
  const [step, setStep] = useState<number>(firstPending);

  const activeClasses = state.classes.filter((c) => c.status === "active");

  return (
    <>
      {/* ───────────────────────────────────────── stepper */}
      <nav aria-label="도입 단계" className="mt-6">
        <p className="text-[12px] font-semibold text-navy/50">
          {`${TOTAL_STEPS}단계 중 ${doneCount}단계 설정 완료`}
        </p>

        {/*
          ★ 좁은 화면에서 2열, 넓은 화면에서 한 줄.
            7개를 360px 한 줄에 넣으면 셀 폭이 44px 밖에 안 되어
            "프로그램"이 잘린다. 2열이면 네 줄이 되지만 전부 읽힌다.

          ★ 색으로만 구분하지 않는다.
            완료는 체크 표시(✓)와 "완료" 글자를 함께 갖고,
            현재 단계는 진한 남색 + aria-current 로 두 번 말한다.
            색각 이상이 있어도 상태를 읽을 수 있어야 한다.
        */}
        <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          <li>
            <div className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-soft-green/50 bg-soft-green/15 px-2.5 text-[13px] font-semibold text-navy">
              <span aria-hidden className="text-[13px] leading-none">
                ✓
              </span>
              <span className="min-w-0 break-keep">기관</span>
              <span className="sr-only">1단계 기관, 완료됨</span>
            </div>
          </li>

          {STEPS.map((entry) => {
            const isCurrent = entry.no === step;
            const isDone = entry.no !== 7 && done[entry.no];

            return (
              <li key={entry.no}>
                <button
                  type="button"
                  onClick={() => setStep(entry.no)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors ${
                    isCurrent
                      ? "border-navy bg-navy text-white"
                      : isDone
                        ? "border-soft-green/50 bg-soft-green/15 text-navy hover:bg-soft-green/25"
                        : "border-navy/15 bg-white text-navy/55 hover:border-navy/30 hover:text-navy"
                  }`}
                >
                  <span
                    aria-hidden
                    className="shrink-0 text-[13px] leading-none tabular-nums"
                  >
                    {isDone && !isCurrent ? "✓" : entry.no}
                  </span>
                  <span className="min-w-0 break-keep text-left">
                    {entry.label}
                  </span>
                  <span className="sr-only">
                    {`${entry.no}단계 ${entry.label}, ${
                      isCurrent
                        ? "현재 단계"
                        : isDone
                          ? "완료됨"
                          : "아직 설정하지 않음"
                    }`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-5 flex flex-col gap-5">
        {step === 2 ? <DirectorStep state={state} /> : null}
        {step === 3 ? <ClassStep state={state} /> : null}
        {step === 4 ? <TeacherStep state={state} activeClasses={activeClasses} /> : null}
        {step === 5 ? <ChildStep state={state} activeClasses={activeClasses} /> : null}
        {step === 6 ? <ProgramStep state={state} activeClasses={activeClasses} /> : null}
        {step === 7 ? <SummaryStep state={state} /> : null}

        {/* 단계 이동 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep((n) => Math.max(2, n - 1))}
            disabled={step <= 2}
            className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전 단계
          </button>

          <button
            type="button"
            onClick={() => setStep((n) => Math.min(7, n + 1))}
            disabled={step >= 7}
            className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음 단계
          </button>
        </div>
      </div>
    </>
  );
}

/** 저장 결과 안내. 성공/실패를 색과 문구 둘 다로 알린다. */
function Result({
  phase,
  message,
}: {
  phase: "idle" | "success" | "error";
  message: string | null;
}) {
  if (phase === "idle" || !message) return null;

  return (
    <p
      role="status"
      className={`mt-3 rounded-lg border px-3 py-2 text-[13px] leading-relaxed ${
        phase === "success"
          ? "border-soft-green/50 bg-soft-green/10 text-navy"
          : "border-navy/20 bg-surface-soft text-navy/75"
      }`}
    >
      {phase === "success" ? "완료 · " : "확인 필요 · "}
      {message}
    </p>
  );
}

const inputClass =
  "w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] text-navy outline-none transition-colors focus-visible:border-trust-blue focus-visible:ring-2 focus-visible:ring-trust-blue/20";

const submitClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-navy px-4 text-[13px] font-bold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50";

// ─────────────────────────────────────────────────────── Step 2 원장
function DirectorStep({ state }: { state: OnboardingState }) {
  const [result, action, pending] = useActionState(
    inviteDirectorAction,
    DIRECTOR_INVITE_INITIAL_STATE,
  );

  return (
    <SectionCard
      title="2단계 · 원장"
      description="원장 이메일로 초대를 보냅니다. 비밀번호는 원장이 직접 설정하므로 관리자가 만들지 않습니다."
    >
      {state.directors.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-1.5">
          {state.directors.map((director) => (
            <li
              key={director.membershipId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2"
            >
              <span className="text-[13px] font-semibold text-navy">
                {director.displayName}
              </span>
              <StatusPill tone="done">등록됨</StatusPill>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="organizationId" value={state.organization.id} />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="director-email"
            className="text-[12px] font-semibold text-navy/60"
          >
            원장 이메일
          </label>
          <input
            id="director-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="director@example.com"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="director-name"
            className="text-[12px] font-semibold text-navy/60"
          >
            원장 이름
          </label>
          <input
            id="director-name"
            name="display_name"
            type="text"
            required
            autoComplete="name"
            placeholder="홍길동"
            className={inputClass}
          />
        </div>

        <div>
          <button type="submit" disabled={pending} className={submitClass}>
            {pending ? "초대 중..." : "원장 초대"}
          </button>
        </div>
      </form>

      <Result phase={result.phase} message={result.message} />
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────── Step 3 반
function ClassStep({ state }: { state: OnboardingState }) {
  const [result, action, pending] = useActionState(
    createClassAction,
    CLASS_CHILD_FORM_INITIAL_STATE,
  );

  const defaultYear = new Date().getFullYear();

  return (
    <SectionCard
      title="3단계 · 반"
      description="반을 하나씩 등록합니다. 등록한 반은 아래 목록에 바로 나타나며, 계속 추가할 수 있습니다."
    >
      {state.classes.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-1.5">
          {state.classes.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy/10 bg-surface-soft px-3 py-2"
            >
              <span className="min-w-0 break-words text-[13px] font-semibold text-navy">
                {entry.name}
                <span className="ml-2 text-[12px] font-normal tabular-nums text-navy/45">
                  {entry.schoolYear}학년도
                </span>
              </span>
              <StatusPill tone={entry.status === "active" ? "done" : "neutral"}>
                {entry.status === "active" ? "운영 중" : "보관"}
              </StatusPill>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="organizationId" value={state.organization.id} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="class-name" className="text-[12px] font-semibold text-navy/60">
              반 이름
            </label>
            <input
              id="class-name"
              name="name"
              type="text"
              required
              maxLength={50}
              placeholder="햇살반"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="class-year" className="text-[12px] font-semibold text-navy/60">
              학년도
            </label>
            <input
              id="class-year"
              name="school_year"
              type="number"
              required
              defaultValue={defaultYear}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="class-age" className="text-[12px] font-semibold text-navy/60">
            연령
          </label>
          <select id="class-age" name="age_group" defaultValue="mixed" className={inputClass}>
            <option value="age3">만 3세</option>
            <option value="age4">만 4세</option>
            <option value="age5">만 5세</option>
            <option value="mixed">혼합</option>
          </select>
        </div>

        <div>
          <button type="submit" disabled={pending} className={submitClass}>
            {pending ? "저장 중..." : "반 추가"}
          </button>
        </div>
      </form>

      <Result phase={result.phase} message={result.message} />
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────── Step 4 교사
function TeacherStep({
  state,
  activeClasses,
}: {
  state: OnboardingState;
  activeClasses: OnboardingState["classes"];
}) {
  const [inviteResult, inviteAction, invitePending] = useActionState(
    inviteTeacherAction,
    TEACHER_INVITE_INITIAL_STATE,
  );
  const [assignResult, assignAction, assignPending] = useActionState(
    saveTeacherAssignmentsAction,
    CLASS_CHILD_FORM_INITIAL_STATE,
  );

  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    state.teachers[0]?.membershipId ?? "",
  );

  const current = state.teachers.find((t) => t.membershipId === selectedTeacher);

  return (
    <>
      <SectionCard
        title="4단계 · 교사 초대"
        description="교사 이메일로 초대를 보냅니다. 여러 명이면 한 명씩 반복해서 추가하세요."
      >
        <form action={inviteAction} className="flex flex-col gap-3">
          <input type="hidden" name="organizationId" value={state.organization.id} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="teacher-email" className="text-[12px] font-semibold text-navy/60">
                교사 이메일
              </label>
              <input
                id="teacher-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="teacher@example.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="teacher-name" className="text-[12px] font-semibold text-navy/60">
                교사 이름
              </label>
              <input
                id="teacher-name"
                name="display_name"
                type="text"
                required
                autoComplete="name"
                placeholder="김선생"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <button type="submit" disabled={invitePending} className={submitClass}>
              {invitePending ? "초대 중..." : "교사 초대"}
            </button>
          </div>
        </form>

        <Result phase={inviteResult.phase} message={inviteResult.message} />
      </SectionCard>

      <SectionCard
        title="담당 반 배정"
        description="초대한 교사에게 담당 반을 지정합니다. 반이 없으면 3단계에서 먼저 등록하세요."
      >
        {state.teachers.length === 0 ? (
          <p className="text-[13px] text-navy/55">
            아직 등록된 교사가 없습니다. 위에서 먼저 초대해주세요.
          </p>
        ) : activeClasses.length === 0 ? (
          <p className="text-[13px] text-navy/55">
            운영 중인 반이 없습니다. 3단계에서 반을 먼저 등록해주세요.
          </p>
        ) : (
          <form action={assignAction} className="flex flex-col gap-3">
            <input type="hidden" name="organizationId" value={state.organization.id} />
            <input type="hidden" name="organizationMemberId" value={selectedTeacher} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="teacher-select" className="text-[12px] font-semibold text-navy/60">
                교사
              </label>
              <select
                id="teacher-select"
                value={selectedTeacher}
                onChange={(event) => setSelectedTeacher(event.target.value)}
                className={inputClass}
              >
                {state.teachers.map((teacher) => (
                  <option key={teacher.membershipId} value={teacher.membershipId}>
                    {teacher.displayName}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-[12px] font-semibold text-navy/60">담당 반</legend>

              {activeClasses.map((entry) => (
                <label
                  key={entry.id}
                  className="flex min-h-11 items-center gap-2.5 rounded-lg border border-navy/10 bg-white px-3 text-[13px] text-navy"
                >
                  <input
                    type="checkbox"
                    name="class_id"
                    value={entry.id}
                    defaultChecked={current?.classIds.includes(entry.id) ?? false}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="break-words">{entry.name}</span>
                </label>
              ))}
            </fieldset>

            <div>
              <button type="submit" disabled={assignPending} className={submitClass}>
                {assignPending ? "저장 중..." : "담당 반 저장"}
              </button>
            </div>
          </form>
        )}

        <Result phase={assignResult.phase} message={assignResult.message} />
      </SectionCard>
    </>
  );
}

// ─────────────────────────────────────────────────────── Step 5 원아
function ChildStep({
  state,
  activeClasses,
}: {
  state: OnboardingState;
  activeClasses: OnboardingState["classes"];
}) {
  const [result, action, pending] = useActionState(
    createChildrenBulkAction,
    BULK_CHILD_INITIAL_STATE,
  );

  return (
    <SectionCard
      title="5단계 · 원아"
      description={`반을 고르고 이름을 한 줄에 한 명씩 붙여 넣으세요. 한 번에 최대 ${BULK_CHILD_MAX_ROWS}명까지 등록합니다.`}
    >
      {activeClasses.length === 0 ? (
        <p className="text-[13px] text-navy/55">
          운영 중인 반이 없습니다. 3단계에서 반을 먼저 등록해주세요.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="organizationId" value={state.organization.id} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="child-class" className="text-[12px] font-semibold text-navy/60">
              배정할 반
            </label>
            <select id="child-class" name="class_id" required className={inputClass}>
              {activeClasses.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} (현재 {entry.childCount}명)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="child-roster" className="text-[12px] font-semibold text-navy/60">
              원아 명단
            </label>
            <textarea
              id="child-roster"
              name="roster"
              required
              rows={8}
              placeholder={"김하늘\n박바다\n이나무, 2021"}
              aria-describedby="child-roster-help"
              className={`${inputClass} font-mono leading-relaxed`}
            />
            <p id="child-roster-help" className="text-[12px] leading-relaxed text-navy/50">
              한 줄에 한 명. 출생연도를 함께 넣으려면{" "}
              <span className="font-semibold">이름, 2021</span> 형식으로 적습니다.
              출생연도는 선택 입력이며 빈 줄은 무시합니다.
            </p>
          </div>

          <div>
            <button type="submit" disabled={pending} className={submitClass}>
              {pending ? "등록 중..." : "원아 등록"}
            </button>
          </div>
        </form>
      )}

      <Result phase={result.phase} message={result.message} />

      {result.errors.length > 0 ? (
        <div className="mt-3 rounded-lg border border-navy/15 bg-surface-soft p-3">
          <p className="text-[12px] font-semibold text-navy/70">
            등록하지 못한 줄 ({result.failedCount.toLocaleString("ko-KR")}줄)
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {result.errors.map((entry) => (
              <li
                key={`${entry.line}-${entry.input}`}
                className="text-[12px] leading-relaxed text-navy/60"
              >
                <span className="tabular-nums font-semibold">{entry.line}번째 줄</span>
                {entry.input ? ` · "${entry.input}"` : ""} · {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────── Step 6 프로그램
function ProgramStep({
  state,
  activeClasses,
}: {
  state: OnboardingState;
  activeClasses: OnboardingState["classes"];
}) {
  const [result, action, pending] = useActionState(
    createClassProgramAssignmentAction,
    CLASS_CHILD_FORM_INITIAL_STATE,
  );

  return (
    <SectionCard
      title="6단계 · 프로그램"
      description="반에 수업 프로그램을 배정합니다. 게시된 프로그램만 고를 수 있습니다."
    >
      {activeClasses.length === 0 ? (
        <p className="text-[13px] text-navy/55">
          운영 중인 반이 없습니다. 3단계에서 반을 먼저 등록해주세요.
        </p>
      ) : state.programs.length === 0 ? (
        <p className="text-[13px] text-navy/55">
          게시된 프로그램이 없습니다. 수업 프로그램 화면에서 먼저 게시해주세요.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="organizationId" value={state.organization.id} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="assign-class" className="text-[12px] font-semibold text-navy/60">
                반
              </label>
              <select id="assign-class" name="classId" required className={inputClass}>
                {activeClasses.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} (배정 {entry.programCount}건)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="assign-program" className="text-[12px] font-semibold text-navy/60">
                프로그램
              </label>
              <select id="assign-program" name="programId" required className={inputClass}>
                {state.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} · {program.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="assign-start" className="text-[12px] font-semibold text-navy/60">
              시작일 (선택)
            </label>
            <input id="assign-start" name="start_date" type="date" className={inputClass} />
          </div>

          <div>
            <button type="submit" disabled={pending} className={submitClass}>
              {pending ? "배정 중..." : "프로그램 배정"}
            </button>
          </div>
        </form>
      )}

      <Result phase={result.phase} message={result.message} />
    </SectionCard>
  );
}

// ───────────────────────────────────────────────────── Step 7 확인
function SummaryStep({ state }: { state: OnboardingState }) {
  const rows = [
    { label: "기관", value: state.organization.name, done: true },
    {
      label: "원장",
      value: `${state.directors.length.toLocaleString("ko-KR")}명`,
      done: state.directors.length > 0,
    },
    {
      label: "운영 중인 반",
      value: `${state.classes.filter((c) => c.status === "active").length.toLocaleString("ko-KR")}개`,
      done: state.classes.some((c) => c.status === "active"),
    },
    {
      label: "교사",
      value: `${state.teachers.length.toLocaleString("ko-KR")}명`,
      done: state.teachers.length > 0,
    },
    {
      label: "재원 원아",
      value: `${state.childCount.toLocaleString("ko-KR")}명`,
      done: state.childCount > 0,
    },
    {
      label: "프로그램 배정",
      value: `${state.assignmentCount.toLocaleString("ko-KR")}건`,
      done: state.assignmentCount > 0,
    },
  ];

  const allDone = rows.every((row) => row.done);

  return (
    <SectionCard
      title="7단계 · 확인"
      description="지금까지 저장된 실제 데이터입니다. 별도의 완료 표시를 만들지 않고 데이터에서 그대로 계산합니다."
    >
      <ul className="flex flex-col divide-y divide-navy/8">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5"
          >
            <span className="text-[13px] text-navy/70">{row.label}</span>
            <span className="flex items-center gap-2">
              <span className="break-words text-[13px] font-semibold tabular-nums text-navy">
                {row.value}
              </span>
              <StatusPill tone={row.done ? "done" : "pending"}>
                {row.done ? "설정됨" : "확인 필요"}
              </StatusPill>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-navy/50">
        {allDone
          ? "도입에 필요한 항목이 모두 설정되었습니다. 이제 원장이 수업 일정을 등록하면 운영이 시작됩니다."
          : "아직 설정하지 않은 항목이 있습니다. 지금 닫아도 저장된 내용은 남으며, 나중에 이어서 설정할 수 있습니다."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-4">
        <Link
          href={`/admin/organizations/${state.organization.id}`}
          className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-[13px] font-bold text-white transition-colors hover:bg-navy/90"
        >
          기관 상세 보기
        </Link>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5"
        >
          운영 대시보드
        </Link>
        <Link
          href="/admin/onboarding"
          className="inline-flex min-h-11 items-center rounded-lg border border-navy/20 bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-navy/5"
        >
          새 기관 추가
        </Link>
      </div>
    </SectionCard>
  );
}
