// One-off asset prep: remove the flat near-white background from SOYE KIDS character
// renders by flood-filling from the image border only, then export trimmed WebP.
// Interior whites (bellies, faces) are kept because they are not border-connected.
// Usage: node scripts/cutout-characters.mjs <srcDir> <outDir>
import sharp from "sharp";
import { join } from "node:path";

const [srcDir, outDir] = process.argv.slice(2);
const JOBS = [
  ["KakaoTalk_20260120_162952259.png", "pupu"],
  ["KakaoTalk_20260120_162952259_01.png", "bukgeuki", { min: 246, spread: 6 }],
  ["KakaoTalk_20260120_162952259_02.png", "cat"],
  ["KakaoTalk_20260120_162952259_03.png", "maru"],
  ["KakaoTalk_20260120_162952259_04.png", "ubi"],
  ["KakaoTalk_20260120_162952259_05.png", "ella"],
  ["캐릭터 컨셉.png", "friends"],
];

const DEFAULT_BG = { min: 214, spread: 18 };
const isBgWith = ({ min, spread }) => (r, g, b) => Math.min(r, g, b) >= min && Math.max(r, g, b) - Math.min(r, g, b) <= spread;

for (const [file, name, bg = DEFAULT_BG] of JOBS) {
  const isBg = isBgWith(bg);
  const { data, info } = await sharp(join(srcDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    const o = p * 4;
    if (!isBg(data[o], data[o + 1], data[o + 2])) continue;
    seen[p] = 1;
    data[o + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  // soften the 1px fringe next to removed pixels
  for (let p = 0; p < w * h; p++) {
    if (seen[p]) continue;
    const x = p % w, y = (p / w) | 0;
    const n = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
    if (n) data[p * 4 + 3] = 150;
  }
  const out = join(outDir, `${name}.webp`);
  const img = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(out);
  console.log(name, `${img.width}x${img.height}`, `${Math.round(img.size / 1024)}KB`);
}
