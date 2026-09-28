// J / K / L CONTROLLED WINDOW — START GATE (READ ONLY) · PHASE 08
// ---------------------------------------------------------------------
// 사용:  node supabase/cutover/JKL_start_gate.mjs [--root <배포할 앱 소스 루트>]
//
// Step J(교사 · 원장 기본 경로 전환)를 시작해도 되는지 앱 쪽 조건을 확인한다.
// J 이후 M5 전 상태(legacy 직접 쓰기 경로가 DB 에 남아 있는 상태)는 승인된 steady state 가 아니다.
// 그래서 J 는 "M5 를 곧바로 적용할 수 있는 빌드" 로만 시작한다:
//   · M5_app_preflight.mjs 가 PASS 여야 한다 (legacy UI 꺼짐 · legacy Action 의존 없음 · 회수 경로 소비자 없음)
// DB 쪽 조건은 JKL_window_preflight.sql 이 따로 확인한다 (G-2 적용 · G-1 blocking 0 · PHASE 08 기반 · M5 미적용).
// 둘 다 READY 일 때만 운영자가 controlled window 를 연다 (cutover-runbook §2-1).
// DB 는 배포 env 를 읽지 않는다 — 이 gate 는 사람이 실행하는 배포 절차의 일부다.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const passthrough = process.argv.slice(2);
const result = spawnSync(process.execPath, [join(here, "M5_app_preflight.mjs"), ...passthrough], { encoding: "utf8" });

process.stdout.write(result.stdout ?? "");
if (result.stderr) process.stderr.write(result.stderr);

if (result.status === 0) {
  console.log("\nJKL START GATE (app): READY — 이 빌드로 J 를 시작할 수 있다. DB 조건(JKL_window_preflight.sql)도 READY 인지 확인한다.");
  process.exit(0);
}
console.log("\nJKL START GATE (app): DO NOT START J — M5 앱 조건이 준비되지 않았다. J 를 시작하면 M5 까지 legacy 직접 쓰기가 남는 창이 열린다.");
process.exit(1);
