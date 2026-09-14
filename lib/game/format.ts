// 원본 legacy-reference/원본_V31.html 1373-1374행, 2720행 그대로 포팅
export const fmt = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR')
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 한글 음절의 받침 유무로 조사를 고른다(예: josa('김철수', '은', '는') → '은').
// 원본은 이 분기 없이 "은(는)" 같은 표기를 문구에 그대로 남겨뒀다 — 여기서는 실제로 골라서 붙인다.
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const lastChar = word.trim().slice(-1)
  const code = lastChar.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return withoutBatchim
  return code % 28 !== 0 ? withBatchim : withoutBatchim
}
