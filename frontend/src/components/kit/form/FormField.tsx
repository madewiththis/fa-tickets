import React from 'react'
import { cn } from '@/lib/cn'

type Props = {
  label?: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({ label, description, error, required, className, children }: Props) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground/90">
          {label}
          {required ? <span className="text-danger ml-0.5">*</span> : null}
        </label>
      )}
      {children}
      {description && !error ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )}

