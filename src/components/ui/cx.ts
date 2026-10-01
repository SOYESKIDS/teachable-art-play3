/**
 * 클래스 조합 도구 — 외부 의존성 없이 cva 와 같은 방식으로 쓴다.
 *
 *   cx("a", cond && "b", undefined)        → "a b"
 *   const button = variants({
 *     base: "inline-flex …",
 *     variants: { tone: { primary: "…", ghost: "…" }, size: { md: "…", lg: "…" } },
 *     defaults: { tone: "primary", size: "md" },
 *   });
 *   button({ tone: "ghost" })               → base + ghost + md
 *
 * ★ tailwind-merge 를 쓰지 않는다.
 *   같은 속성을 두 번 주지 않도록 variant 를 나누는 것이 원칙이다.
 *   사용처에서 덧붙이는 className 은 여백 · 폭 같은 배치 클래스만 둔다.
 */
export type ClassValue = string | false | null | undefined | 0;

export function cx(...values: ClassValue[]): string {
  let out = "";
  for (const value of values) {
    if (!value) continue;
    out = out ? `${out} ${value}` : value;
  }
  return out;
}

type VariantMap = Record<string, Record<string, string>>;

type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K];
};

export function variants<V extends VariantMap>(config: {
  base: string;
  variants: V;
  defaults: { [K in keyof V]: keyof V[K] };
}) {
  return (props: VariantProps<V> & { className?: ClassValue } = {}) => {
    const parts: ClassValue[] = [config.base];
    for (const key of Object.keys(config.variants) as (keyof V)[]) {
      const chosen = (props[key] ?? config.defaults[key]) as string;
      parts.push(config.variants[key][chosen]);
    }
    parts.push(props.className);
    return cx(...parts);
  };
}
