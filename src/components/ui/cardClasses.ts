export type CardVariant = 'default' | 'compact' | 'hero'

const VARIANT_PADDING: Record<CardVariant, string> = {
  default: 'p-5',
  compact: 'p-4',
  hero: 'p-8',
}

export function cardClasses(variant: CardVariant = 'default', className = '') {
  return [
    'rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur',
    VARIANT_PADDING[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
