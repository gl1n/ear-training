import type { ReactNode } from 'react'

type AnswerSecondaryLabelProps = {
  active: boolean
  children: ReactNode
  activeClassName?: string
}

export function AnswerSecondaryLabel({
  active,
  children,
  activeClassName = 'text-sky-300/80 opacity-100',
}: AnswerSecondaryLabelProps) {
  return (
    <span
      className={`mt-1 text-[10px] leading-none transition-opacity sm:text-xs ${
        active
          ? activeClassName
          : 'text-[var(--text-secondary)] opacity-0 group-hover:opacity-60 sm:opacity-50'
      }`}
    >
      {children}
    </span>
  )
}
