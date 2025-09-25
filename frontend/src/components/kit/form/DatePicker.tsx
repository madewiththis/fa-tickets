import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  value?: string // yyyy-MM-dd
  onChange?: (v?: string) => void
  placeholder?: string
}

function formatLabel(v?: string) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function DatePicker({ value, onChange, placeholder = 'Select date' }: Props) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal">
          {value ? formatLabel(value) : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Input
          autoFocus
          type="date"
          value={value || ''}
          onKeyDown={(e)=> { e.preventDefault() }}
          onChange={(e)=> { onChange?.(e.target.value || undefined); setOpen(false) }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateRangePicker({ start, end, onChange }: { start?: string; end?: string; onChange?: (range: { start?: string; end?: string }) => void }) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker value={start} onChange={(v)=> onChange?.({ start: v, end })} />
      <span className="text-sm text-muted-foreground">to</span>
      <DatePicker value={end} onChange={(v)=> onChange?.({ start, end: v })} />
    </div>
  )
}
