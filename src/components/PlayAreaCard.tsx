import type { ReactNode } from 'react'
import { Card } from './ui/Card'

type PlayAreaCardProps = {
  children: ReactNode
  className?: string
  centered?: boolean
}

export function PlayAreaCard({ children, className = '', centered = true }: PlayAreaCardProps) {
  return (
    <Card
      variant="hero"
      className={[
        'min-h-[18rem]',
        centered ? 'flex flex-col items-center justify-center text-center' : 'flex flex-col',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Card>
  )
}
