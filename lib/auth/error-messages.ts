// Supabase Auth(GoTrue)는 에러 메시지를 영어로만 준다. 알려진 메시지는 한국어로 바꾸고,
// 모르는 메시지는 원문을 노출하는 대신 안전한 한국어 문구로 대체한다.
const KNOWN_AUTH_ERRORS: [pattern: RegExp, message: string][] = [
  [/user already registered|user already exists/i, '이미 가입된 이메일이에요.'],
  [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않아요.'],
  [/email not confirmed/i, '이메일 인증이 필요해요. 받은 편지함을 확인해주세요.'],
  [/unable to validate email address/i, '이메일 형식이 올바르지 않아요.'],
  [/to signup, please provide.*email/i, '이메일을 입력해주세요.'],
  [/signup requires a valid password/i, '올바른 비밀번호를 입력해주세요.'],
  [/email rate limit exceeded|too many requests/i, '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'],
  [/new password should be different/i, '이전과 동일한 비밀번호는 사용할 수 없어요.'],
]

export function translateAuthError(message: string): string {
  const lengthMatch = message.match(/password should be at least (\d+) characters/i)
  if (lengthMatch) return `비밀번호는 최소 ${lengthMatch[1]}자 이상이어야 해요.`

  for (const [pattern, ko] of KNOWN_AUTH_ERRORS) {
    if (pattern.test(message)) return ko
  }
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
}
