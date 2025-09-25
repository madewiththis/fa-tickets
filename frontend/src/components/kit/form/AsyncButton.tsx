import React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

type Props = ButtonProps & {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
}

export function AsyncButton({ onClick, disabled, children, ...rest }: Props) {
  const [loading, setLoading] = React.useState(false)
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick) return
    try {
      const result = onClick(e)
      if (result instanceof Promise) {
        setLoading(true)
        await result
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button {...rest} disabled={disabled || loading} onClick={handleClick}>
      {loading ? 'Please wait…' : children}
    </Button>
  )
}

