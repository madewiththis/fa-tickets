import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
}

export function Stat({ label, value, hint }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  )
}

