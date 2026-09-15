'use client'

import { useActionState, useEffect } from 'react'
import { saveProfileOnboarding, type SaveProfileState } from './actions'
import { ProfileFormFields } from '@/components/profile-form-fields'
import { DEFAULT_PROFILE } from '@/lib/validation/profile'

export function OnboardingForm() {
  const [state, formAction] = useActionState<SaveProfileState, FormData>(saveProfileOnboarding, null)

  useEffect(() => {
    if (state?.ok) window.location.href = '/'
  }, [state])

  return (
    <ProfileFormFields
      action={formAction}
      profile={DEFAULT_PROFILE}
      error={state && !state.ok ? state.message : undefined}
      submitLabel="저장하고 시작하기"
    />
  )
}
