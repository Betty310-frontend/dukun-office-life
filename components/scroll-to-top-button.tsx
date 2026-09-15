'use client'

import { useEffect, useState, type RefObject } from 'react'

const SIZE = 44
const STROKE = 3
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SHOW_AFTER_PX = 400

export function ScrollToTopButton({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function handleScroll() {
      if (!el) return
      const scrollTop = el.scrollTop
      const scrollable = el.scrollHeight - el.clientHeight
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0)
      setVisible(scrollTop > SHOW_AFTER_PX)
    }
    handleScroll()
    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [scrollRef])

  if (!visible) return null

  const offset = CIRCUMFERENCE * (1 - progress)

  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid size-11 place-items-center rounded-full border border-border bg-card shadow-lg shadow-black/10 transition-transform hover:scale-105 sm:right-5 sm:bottom-5"
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-150"
        />
      </svg>
      <svg
        className="relative"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l7-7 7 7" />
        <path d="M12 19V7" />
      </svg>
    </button>
  )
}
