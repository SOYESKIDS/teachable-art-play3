import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 링크 공유용 대표 이미지(Open Graph / Twitter) 생성기.
 *
 * 공식 로고 이미지 자산이 아직 없으므로 그래픽 로고나 캐릭터를 새로 만들지 않고,
 * 브랜드 컬러 + 텍스트 + 단순 도형만으로 구성한다.
 *
 * 폰트는 홈페이지 본문과 동일한 Pretendard를 그대로 쓴다(이미 설치된 의존성).
 * ImageResponse는 ttf/otf/woff만 지원하고 woff2는 지원하지 않으므로,
 * 용량이 작은 subset woff(약 350KB, KS X 1001 한글 + 라틴 포함)를 사용한다.
 */

const FONT_DIR = join(
  process.cwd(),
  "node_modules",
  "pretendard",
  "dist",
  "web",
  "static",
  "woff-subset",
);

const [bold, regular] = await Promise.all([
  readFile(join(FONT_DIR, "Pretendard-Bold.subset.woff")),
  readFile(join(FONT_DIR, "Pretendard-Regular.subset.woff")),
]);

/** Open Graph 표준 권장 크기 */
export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export const alt =
  "TeachAble Art Play — 아이의 놀이를, 성장 이야기로 기록합니다. 누리과정 연계 수업 · AI 성장기록 · 학부모 리포트를 제공하는 SOYESKIDS 유치원 교육 운영 플랫폼";

const navy = "#152E4F";
const yellow = "#F3BA18";
const ivory = "#FBF8F1";
const trustBlue = "#2D70C7";

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: navy,
          padding: "72px 80px",
          fontFamily: "Pretendard",
          position: "relative",
        }}
      >
        {/* 장식용 도형 — 로고가 아니라 브랜드 컬러 면 처리 */}
        <div
          style={{
            position: "absolute",
            top: -170,
            right: -150,
            width: 620,
            height: 620,
            borderRadius: 620,
            backgroundColor: trustBlue,
            opacity: 0.16,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 1200,
            height: 8,
            backgroundColor: yellow,
            display: "flex",
          }}
        />

        {/* 상단: 회사명 */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 6,
            color: "rgba(251, 248, 241, 0.5)",
          }}
        >
          SOYESKIDS
        </div>

        {/* 중앙: 서비스명 + 핵심 메시지 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 700,
              color: yellow,
              letterSpacing: -0.5,
            }}
          >
            TeachAble Art Play
          </div>

          <div
            style={{
              display: "flex",
              width: 72,
              height: 5,
              borderRadius: 5,
              backgroundColor: yellow,
              marginTop: 26,
              marginBottom: 34,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 700,
              color: ivory,
              lineHeight: 1.3,
              letterSpacing: -2,
            }}
          >
            <div style={{ display: "flex" }}>아이의 놀이를,</div>
            <div style={{ display: "flex" }}>성장 이야기로 기록합니다.</div>
          </div>
        </div>

        {/* 하단: 핵심 구성 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 1,
              backgroundColor: "rgba(251, 248, 241, 0.16)",
              marginBottom: 26,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 27,
              fontWeight: 400,
              color: "rgba(251, 248, 241, 0.72)",
              letterSpacing: -0.5,
            }}
          >
            누리과정 연계 수업 · AI 성장기록 · 학부모 리포트
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: regular, style: "normal", weight: 400 },
      ],
    },
  );
}
