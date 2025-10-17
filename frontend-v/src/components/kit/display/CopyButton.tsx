import React from 'react'
import { Button } from '@/components/ui/button'

export function CopyButton({ value, children }: { value: string; children?: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <Button variant="outline" onClick={onCopy}>{children ?? (copied ? 'Copied' : 'Copy')}</Button>
  )
}

