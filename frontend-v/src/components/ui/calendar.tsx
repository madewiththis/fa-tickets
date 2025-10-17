import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={"rdp-root text-sm " + (className || "")}
      showOutsideDays
      weekStartsOn={1}
      {...props}
    />
  )
}

export type { DateRange } from 'react-day-picker'

