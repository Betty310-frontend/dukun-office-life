'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
}: {
  children: React.ReactNode
  pendingLabel: string
  className?: string
  variant?: React.ComponentProps<typeof Button>['variant']
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </Button>
  )
}
