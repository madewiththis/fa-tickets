import React from 'react'

type Props = {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="text-center py-12 border rounded">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

