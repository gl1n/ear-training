import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'rounded-[var(--radius-btn)] border border-[#244bd8] bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#244bd8] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-secondary)]',
  ghost:
    'rounded-[var(--radius-btn)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[#aaa59a] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button type="button" className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
