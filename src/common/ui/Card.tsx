import type { ReactNode } from 'react'
import { cardClasses, type CardVariant } from './cardClasses'

type CardProps = {
  children: ReactNode
  className?: string
  variant?: CardVariant
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  return <section className={cardClasses(variant, className)}>{children}</section>
}
