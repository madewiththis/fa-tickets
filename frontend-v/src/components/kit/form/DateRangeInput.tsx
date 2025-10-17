import React from 'react'
import { DateInput } from './DateInput'

type Props = {
  start?: string
  end?: string
  onChange?: (range: { start?: string; end?: string }) => void
}

export function DateRangeInput({ start, end, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <DateInput value={start} onChange={(v)=> onChange?.({ start: v, end })} />
      <span className="text-sm text-muted-foreground">to</span>
      <DateInput value={end} onChange={(v)=> onChange?.({ start, end: v })} />
    </div>
  )
}

