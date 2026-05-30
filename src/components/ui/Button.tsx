import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'rounded-[var(--radius-btn)] bg-sky-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/20',
  ghost:
    'rounded-[var(--radius-btn)] border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-white/20 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50',
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
