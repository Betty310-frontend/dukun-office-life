export function ComingSoonBadge({ label = '준비 중' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
      🚧 {label}
    </span>
  )
}
