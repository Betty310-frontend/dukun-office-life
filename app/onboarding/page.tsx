import { saveProfile } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileFormFields } from '@/components/profile-form-fields'
import { DEFAULT_PROFILE } from '@/lib/validation/profile'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🌷 내정보</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            회사생활의 주인공인 &lsquo;나&rsquo;를 설정합니다. 내정보 저장은 필수이며, 저장을 완료해야 시뮬레이션을 진행할 수 있어요.
          </p>
        </CardHeader>
        <CardContent>
          <ProfileFormFields
            action={saveProfile}
            profile={DEFAULT_PROFILE}
            error={error}
            submitLabel="저장하고 시작하기"
          />
        </CardContent>
      </Card>
    </div>
  )
}
