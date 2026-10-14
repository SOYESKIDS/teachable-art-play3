import type { DeploymentGuardSummary } from "@/lib/env/deployment-guard";

/**
 * 배포 환경 가드 상태 카드 — 실행 묶음 E.
 *
 * ★ 값을 보여 주지 않는다.
 *   URL · 공개키 · 서버키 · 프로젝트 ref 를 화면에 띄우지 않는다.
 *   판정 결과(enum · boolean)와 "설정이 필요한 변수 이름"만 보여 준다.
 *
 * ★ 읽기 전용이다. `/admin/readiness` 가 읽기 전용 화면이라는 성격을 유지한다.
 */

const ENV_LABEL: Record<DeploymentGuardSummary["env"], string> = {
  production: "운영 (Production)",
  preview: "비운영 (Preview)",
  development: "비운영 (로컬)",
};

const ENV_SET_LABEL: Record<DeploymentGuardSummary["envSet"], string> = {
  consistent: "한 세트로 보입니다",
  secret_absent: "서버키가 설정되지 않았습니다",
  project_mismatch: "서버키가 다른 프로젝트를 가리킵니다",
  incomplete: "URL 또는 공개키가 없습니다",
};

const WRITE_VERDICT_LABEL: Record<DeploymentGuardSummary["writeVerdict"], string> = {
  allow: "허용",
  block_env_mismatch: "차단 — 서버키와 URL 이 다른 프로젝트를 가리킵니다",
  block_env_incomplete: "차단 — URL 또는 공개키가 없습니다",
  block_non_production_on_production: "차단 — 비운영 배포가 운영 데이터를 사용합니다",
  block_target_unverified:
    "차단 — 비운영 배포인데 어느 프로젝트에 쓰는지 확인할 수 없습니다 (운영 ref 설정 없음)",
};

const ENV_SET_TONE: Record<DeploymentGuardSummary["envSet"], string> = {
  consistent: "text-success-text",
  secret_absent: "text-ink-muted",
  project_mismatch: "text-danger",
  incomplete: "text-danger",
};

export function DeploymentGuardCard({ summary }: { summary: DeploymentGuardSummary }) {
  const onProd = summary.nonProductionOnProductionData;

  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-label font-bold text-ink">배포 환경 가드</h2>
      <p className="mt-1 text-caption text-ink-muted">
        환경변수 값은 표시하지 않습니다. 판정 결과와 설정이 필요한 변수 이름만 보여 줍니다.
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-caption text-ink-muted">현재 배포</dt>
          <dd className="mt-0.5 text-body-sm font-semibold text-ink">
            {ENV_LABEL[summary.env]}
          </dd>
        </div>

        <div>
          <dt className="text-caption text-ink-muted">URL · 공개키 · 서버키</dt>
          <dd className={`mt-0.5 text-body-sm font-semibold ${ENV_SET_TONE[summary.envSet]}`}>
            {ENV_SET_LABEL[summary.envSet]}
          </dd>
        </div>

        <div>
          <dt className="text-caption text-ink-muted">비운영 배포가 운영 데이터를 사용</dt>
          <dd className="mt-0.5 text-body-sm font-semibold text-ink">
            {onProd === null ? (
              <span className="text-ink-muted">
                판정하지 않았습니다 — 운영 프로젝트 ref 설정이 없습니다
              </span>
            ) : onProd ? (
              <span className="text-danger">예 — 쓰기 보호가 필요합니다</span>
            ) : (
              <span className="text-success-text">아니오</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-caption text-ink-muted">현재 쓰기 판정</dt>
          <dd
            className={`mt-0.5 text-body-sm font-semibold ${
              summary.writeVerdict === "allow" ? "text-success-text" : "text-danger"
            }`}
          >
            {WRITE_VERDICT_LABEL[summary.writeVerdict]}
          </dd>
        </div>

        <div>
          <dt className="text-caption text-ink-muted">비운영 쓰기 보호</dt>
          <dd className="mt-0.5 text-body-sm font-semibold text-ink">
            {summary.writeGuardEnabled ? (
              "켜짐"
            ) : (
              <span className="text-ink-muted">꺼짐 (기본값)</span>
            )}
          </dd>
        </div>
      </dl>

      {summary.missingSettings.length > 0 && (
        <div className="mt-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-3">
          <p className="text-caption font-semibold text-warning-text">
            설정이 필요한 환경변수
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {summary.missingSettings.map((name) => (
              <li key={name} className="text-caption text-warning-text">
                <code className="font-mono">{name}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-warning-text/80">
            이 값이 없으면 &ldquo;비운영 배포가 운영 데이터를 사용 중&rdquo;인지 판정하지
            않습니다. 추측으로 단정하지 않습니다.
          </p>
        </div>
      )}

      {summary.writeVerdict !== "allow" && (
        <div className="mt-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3">
          <p className="text-caption font-semibold text-danger">
            {WRITE_VERDICT_LABEL[summary.writeVerdict]}
          </p>
          <p className="mt-1.5 text-caption leading-relaxed text-danger/85">
            모든 서버 쓰기 경로가 막혀 있습니다. 공개 상담 접수도 저장되지 않습니다.
            {summary.writeVerdict === "block_env_mismatch" &&
              " 환경변수 세트 불일치는 운영 배포에서도 막습니다 — 잘못된 세트는 운영에서 더 위험합니다."}
          </p>
        </div>
      )}
    </section>
  );
}
