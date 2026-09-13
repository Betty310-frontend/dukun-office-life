// 원본 legacy-reference/원본_V31.html 1373-1374행, 2720행 그대로 포팅
export const fmt = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR')
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
