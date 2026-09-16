import { OnboardingForm } from './onboarding-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RedirectIfUnauthenticated } from '@/components/redirect-if-unauthenticated'

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-10">
      <RedirectIfUnauthenticated />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🌷 내정보</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            회사생활의 주인공인 &lsquo;나&rsquo;를 설정합니다. 내정보 저장은 필수이며, 저장을 완료해야 시뮬레이션을 진행할 수 있어요.
          </p>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </div>
  )
}
