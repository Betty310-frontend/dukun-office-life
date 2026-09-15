'use server'

import { createClient } from '@/lib/supabase/server'
import { translateAuthError } from '@/lib/auth/error-messages'

export type SignupState = { ok: boolean; message?: string } | null

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { ok: false, message: translateAuthError(error.message) }
  }

  return { ok: true }
}
