import React from 'react'
import { cn } from '@/lib/cn'

type Props = React.HTMLAttributes<HTMLDivElement> & {
  cols?: 1 | 2 | 3 | 4
}

export function FormGrid({ className, cols = 2, ...props }: Props) {
  const grid = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 md:grid-cols-2' : cols === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-4'
  return <div className={cn('grid gap-4', grid, className)} {...props} />
}

