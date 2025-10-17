import React from 'react'
import { PageHeader } from '@/components/kit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Step = { title: string; content: React.ReactNode }

type Props = {
  title: string
  steps: Step[]
}

export function WizardTemplate({ title, steps }: Props) {
  return (
    <section className="space-y-4">
      <PageHeader title={title} />
      <div className="space-y-3">
        {steps.map((s, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{i + 1}. {s.title}</CardTitle></CardHeader>
            <CardContent className="pt-2">{s.content}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

