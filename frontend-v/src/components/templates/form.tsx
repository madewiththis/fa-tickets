import React from 'react'
import { PageHeader } from '@/components/kit'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

export function FormTemplate({ title, subtitle, actions, footer, children }: Props) {
  return (
    <section className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="pt-2">{children}</CardContent>
        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
    </section>
  )
}

