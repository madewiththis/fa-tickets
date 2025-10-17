import React from 'react'
import { Input } from '@/components/ui/input'

type Props = Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> & {
  value?: number | null
  onChange?: (v: number | null) => void
}

export function MoneyInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = React.useState(value?.toString() ?? '')
  React.useEffect(() => {
    setText(value == null ? '' : String(value))
  }, [value])
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    setText(t)
    const num = t.trim() === '' ? null : Number(t.replace(/,/g, ''))
    onChange?.(Number.isFinite(num!) ? (num as number) : null)
  }
  return <Input inputMode="decimal" placeholder="0.00" value={text} onChange={handle} {...rest} />
}

