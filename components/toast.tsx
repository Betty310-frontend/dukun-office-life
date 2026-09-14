'use client'

import { useEffect } from 'react'

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto max-w-[calc(100vw-2rem)] rounded-full border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold text-foreground shadow-lg shadow-black/10">
        {message}
      </div>
    </div>
  )
}
