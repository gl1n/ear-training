import type { ReactNode } from 'react'

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

type CardProps = {
  children: ReactNode
  className?: string
  variant?: CardVariant
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  return <section className={cardClasses(variant, className)}>{children}</section>
}
