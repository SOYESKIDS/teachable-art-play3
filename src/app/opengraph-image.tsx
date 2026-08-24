import { alt, contentType, renderOgImage, size } from "@/lib/seo/og-image";

/**
 * 카카오톡 · 문자 · SNS 링크 공유 시 노출되는 대표 이미지.
 * 실제 구성은 @/lib/seo/og-image 한 곳에서만 관리하고,
 * twitter-image도 동일한 이미지를 재사용한다.
 */
export { alt, contentType, size };

export default function OpengraphImage() {
  return renderOgImage();
}
