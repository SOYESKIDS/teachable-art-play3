"""
공개 체험 화면(홈 · /experience/*)용 글꼴 서브셋을 만든다.

  python scripts/subset-play-fonts.py <Jua-Regular.ttf 경로>

★ 왜 — 모바일 첫 화면이 글꼴 조각 32개(약 695KB)와 글꼴 선언 CSS 를 기다렸다.
  공개 체험 화면에 실제로 쓰인 글자만 담은 파일 두 개로 바꾼다.
★ 글자 목록 = 공개 체험 화면의 소스 · 데이터 파일에 든 모든 글자 + 인쇄 가능한 ASCII.
  목록에 없는 글자(상담 폼에 사용자가 입력한 글자 등)는 원래 Pretendard dynamic subset
  으로 자동 대체되어 같은 모양으로 보인다 (globals.css `.play` 글꼴 스택).
  tests/play-fonts.test.mjs 가 소스 글자가 모두 목록에 있는지 검사한다 — 문구를 바꾸면
  이 스크립트를 다시 실행한다.
★ 라이선스 (SIL OFL 1.1)
  - Pretendard: Reserved Font Name 'Pretendard'(및 'Source'). 서브셋은 수정본이므로
    글꼴 이름을 'TAP Play Sans' 로 바꾼다. 저작권 · 라이선스 문구는 글꼴 안에 그대로 둔다.
  - Jua: 예약 이름 없음. 같은 규칙으로 'TAP Play Display' 로 부른다.
  - 라이선스 전문: src/fonts/play/OFL-Pretendard.txt · OFL-Jua.txt
★ 둥근 제목 글꼴(TAP Play Display)은 더 좁게 — 실제로 그 글꼴로 그려진 글자만 담는다.
  목록: src/fonts/play/display-glyphs.txt
  (scripts/collect-play-display-glyphs.mjs 가 모든 공개 체험 화면 · 플레이어 단계를 돌며 모은 글자
   + 주차명 · 교실 문장 · 단계 이름 등 제목에 들어가는 데이터 글자 + ASCII).
  목록에 없는 글자는 TAP Play Sans 로 대체된다 → 깨지지 않지만 제목 글꼴이 한 글자만 달라진다.
★ 필요 패키지: fonttools, brotli (pip install fonttools brotli)
"""

import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# 공개 체험 화면이 쓰는 굵기(font-normal ~ font-extrabold). 축을 좁히면 파일이 약 ⅓ 줄어든다.
SANS_WEIGHT_RANGE = (400, 800)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "fonts", "play")

SOURCE_GLOBS = [
    "src/app/page.tsx",
    "src/app/experience/**/*.tsx",
    "src/components/play/**/*.tsx",
    "src/components/forms/**/*.tsx",
    "src/components/layout/BrandMark.tsx",
    "src/data/experience/**/*.ts",
    "src/data/*.ts",
    "src/lib/weeks/week-index.ts",
    "src/lib/weeks/week-types.ts",
    "src/lib/curriculum/taxonomies.ts",
]


def glyph_text() -> str:
    chars = set(chr(c) for c in range(0x20, 0x7F))
    for pattern in SOURCE_GLOBS:
        for path in glob.glob(os.path.join(ROOT, pattern), recursive=True):
            with open(path, encoding="utf-8") as f:
                chars |= set(f.read())
    chars -= {"\n", "\r", "\t", "﻿"}
    # 그림 문자(이모지)는 시스템 글꼴로 그린다
    chars = {c for c in chars if ord(c) < 0x1F000}
    return "".join(sorted(chars))


def rename(font: TTFont, family: str) -> None:
    ps = family.replace(" ", "")
    for rec in font["name"].names:
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 4:
            rec.string = family
        elif rec.nameID == 6:
            rec.string = ps
        elif rec.nameID == 3:
            rec.string = f"{ps}-subset"
        elif rec.nameID == 17:
            rec.string = "Regular"


def build(src: str, out_name: str, family: str, text: str, weight_range=None) -> None:
    font = TTFont(src)
    if weight_range:
        font = instancer.instantiateVariableFont(font, {"wght": weight_range})
    opts = subset.Options()
    opts.flavor = "woff2"
    # 기본 기능(kern · liga · mark 등) + 표 숫자(tnum, `tabular` 유틸리티)
    opts.layout_features = [*subset.Options().layout_features, "tnum"]
    opts.name_IDs = ["*"]
    opts.name_legacy = True
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    rename(font, family)
    font.flavor = "woff2"
    dest = os.path.join(OUT, out_name)
    font.save(dest)
    print(f"{out_name}: {os.path.getsize(dest) // 1024} KB, {len(text)} chars")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    jua = sys.argv[1]
    pretendard = os.path.join(ROOT, "node_modules", "pretendard", "dist", "web", "variable", "woff2", "PretendardVariable.woff2")
    text = glyph_text()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "play-glyphs.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    build(pretendard, "tap-play-sans.woff2", "TAP Play Sans", text, SANS_WEIGHT_RANGE)
    display_path = os.path.join(OUT, "display-glyphs.txt")
    display_text = text
    if os.path.exists(display_path):
        with open(display_path, encoding="utf-8") as f:
            display_text = "".join(sorted((set(f.read()) | set(chr(c) for c in range(0x20, 0x7F))) - {chr(10), chr(13)}))
    build(jua, "tap-play-display.woff2", "TAP Play Display", display_text)


if __name__ == "__main__":
    main()
