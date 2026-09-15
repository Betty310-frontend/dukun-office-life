import { SignupForm } from './signup-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RedirectIfAuthenticated } from '@/components/redirect-if-authenticated'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <RedirectIfAuthenticated />
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-[#c46f91]">DDGEUN OFFICE LIFE</p>
        <h1 className="mt-1 text-2xl font-extrabold">🌸 두근두근 회사생활</h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>✨ 회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요? <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">로그인</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
