import React from 'react'
import { Input } from '@/components/ui/input'

type Props = Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> & {
  value?: string // yyyy-MM-dd
  onChange?: (v: string) => void
}

// Date-only input using native calendar UI for accessibility.
export function DateInput({ value, onChange, ...rest }: Props) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)
  return <Input type="date" value={value ?? ''} onChange={handle} {...rest} />
}
