import React from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

type Props = {
  start?: string
  end?: string
  onChange?: (range: { start?: string; end?: string }) => void
}

function toDate(v?: string): Date | undefined {
  if (!v) return undefined
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return undefined
  // interpret as UTC date-only
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function toLocalDateStr(d?: Date): string | undefined {
  if (!d) return undefined
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function RangeCalendar({ start, end, onChange }: Props) {
  const [range, setRange] = React.useState<DateRange | undefined>(() => ({
    from: toDate(start),
    to: toDate(end),
  }))

  return (
    <div className="[--rdp-accent-color:theme(colors.primary.DEFAULT)] [--rdp-accent-background-color:theme(colors.primary.DEFAULT)] rdp-root text-sm">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={(r)=> {
          setRange(r)
          onChange?.({ start: toLocalDateStr(r?.from), end: toLocalDateStr(r?.to) })
        }}
        numberOfMonths={2}
        showOutsideDays
        weekStartsOn={1}
        captionLayout="dropdown"
        required
      />
    </div>
  )
}
