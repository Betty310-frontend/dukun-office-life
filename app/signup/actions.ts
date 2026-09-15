'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { translateAuthError } from '@/lib/auth/error-messages'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(translateAuthError(error.message))}`)
  }

  redirect('/login')
}
