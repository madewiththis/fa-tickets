import React from 'react'
import { cn } from '@/lib/cn'

export function Toolbar({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-2 mb-3', className)}>{children}</div>
}

