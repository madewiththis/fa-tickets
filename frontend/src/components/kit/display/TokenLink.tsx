import React from 'react'
import { Input } from '@/components/ui/input'
import { CopyButton } from './CopyButton'

type Props = {
  token: string
  baseHref?: string // e.g. window.location.origin
}

export function TokenLink({ token, baseHref }: Props) {
  const href = `${baseHref ?? ''}/pay?token=${encodeURIComponent(token)}`
  return (
    <div className="flex gap-2 items-center">
      <Input readOnly value={href} />
      <CopyButton value={href} />
    </div>
  )
}
