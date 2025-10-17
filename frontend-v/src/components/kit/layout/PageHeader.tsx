import React from 'react'
import { cn } from '@/lib/cn'

type Props = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-xl font-semibold leading-none tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex-shrink-0">{actions}</div> : null}
    </div>
  )
}

