import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Option = { label: string; value: string }

type Props = {
  value?: string
  onChange?: (v: string) => void
  options: Option[]
  placeholder?: string
}

export function Combobox({ value, onChange, options, placeholder = 'Select…' }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange?.(v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
