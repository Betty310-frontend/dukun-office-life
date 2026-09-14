import { login } from './actions'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-[#c46f91]">DDGEUN OFFICE LIFE</p>
        <h1 className="mt-1 text-2xl font-extrabold">🌸 두근두근 회사생활</h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>💌 로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-destructive">{decodeURIComponent(error)}</p>}
            <SubmitButton pendingLabel="로그인하는 중..." className="w-full">로그인</SubmitButton>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            계정이 없으신가요? <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">회원가입</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
