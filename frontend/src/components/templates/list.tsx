import React from 'react'
import { PageHeader, Toolbar, EmptyState } from '@/components/kit'

type Props = {
  title: string
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  children?: React.ReactNode
  empty?: { show: boolean; title: string; description?: string; action?: React.ReactNode }
}

export function ListTemplate({ title, actions, toolbar, children, empty }: Props) {
  return (
    <section className="space-y-4">
      <PageHeader title={title} actions={actions} />
      {toolbar ? <Toolbar>{toolbar}</Toolbar> : null}
      {empty?.show ? <EmptyState title={empty.title} description={empty.description} action={empty.action} /> : children}
    </section>
  )
}

